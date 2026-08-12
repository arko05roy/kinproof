import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import {
  HDWallet,
  Roles,
  WalletFacade,
  ShieldedWallet,
  DustWallet,
  UnshieldedWallet,
  createKeystore,
  PublicKey,
  NoOpTransactionHistoryStorage,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnightntwrk/wallet-sdk';
import { PublicKeys } from '@midnightntwrk/wallet-sdk/shielded/v1';
import { makeDefaultSubmissionService } from '@midnightntwrk/wallet-sdk-capabilities/submission';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import * as Kinproof from '../../contract/managed/kinproof/contract/index.js';
import {
  createKinproofPrivateState,
  createWitnesses,
} from '../../contract/src/witnesses.ts';

// @ts-expect-error The Node ws implementation supplies the runtime WebSocket API.
globalThis.WebSocket = WebSocket;

const seed = process.env.SEED;
if (!seed || !/^[0-9a-fA-F]{64,128}$/.test(seed) || seed.length % 2 !== 0) {
  throw new Error('SEED must be a 64-128 character even-length hex string');
}

const indexer = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const indexerWs = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const nodeUrl = 'https://rpc.preprod.midnight.network';
const proofServer = 'http://127.0.0.1:6300';
const zkConfigPath = fileURLToPath(new URL('../../contract/managed/kinproof', import.meta.url));
const snapshotPath = process.env.DUST_SNAPSHOT ?? './dust-snapshot.json';
const snapshot = await readFile(snapshotPath, 'utf8');

setNetworkId('preprod');

const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdWallet.type !== 'seedOk') throw new Error('Failed to restore HD wallet');
const derivation = hdWallet.hdWallet
  .selectAccount(0)
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0);
if (derivation.type !== 'keysDerived') throw new Error('Failed to derive wallet keys');
hdWallet.hdWallet.clear();

const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derivation.keys[Roles.Zswap]);
const dustSecretKey = ledger.DustSecretKey.fromSeed(derivation.keys[Roles.Dust]);
const unshieldedKeystore = createKeystore(derivation.keys[Roles.NightExternal], getNetworkId());

const sharedConnection = {
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: indexer,
    indexerWsUrl: indexerWs,
    bufferSize: 20_000,
    resumeThreshold: 500,
  },
};
const shieldedConfig = {
  ...sharedConnection,
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(nodeUrl.replace(/^http/, 'ws')),
};
const unshieldedConfig = {
  ...sharedConnection,
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
};
const dustConfig = {
  ...shieldedConfig,
  batchUpdates: { size: 1_000, timeout: 10, spacing: 1 },
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
};
const rpcSubmission = makeDefaultSubmissionService({ relayURL: shieldedConfig.relayURL });

const wallet = await WalletFacade.init({
  configuration: {
    ...shieldedConfig,
    ...unshieldedConfig,
    ...dustConfig,
  },
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) =>
    UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
  dust: (cfg) => DustWallet(cfg).restore(snapshot),
  // Preprod's RPC currently closes long-lived watch subscriptions normally
  // before the SDK's "Finalized" waiter resolves. Submission to the node is
  // sufficient here; deploy visibility is verified through the indexer.
  submissionService: () => ({
    submitTransaction: ((transaction: ledger.FinalizedTransaction) =>
      rpcSubmission.submitTransaction(transaction, 'Submitted')) as any,
    close: () => rpcSubmission.close(),
  }),
});

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );
    const signature = unshieldedKeystore.signData(cloned.signatureData(segment));
    if (cloned.fallibleUnshieldedOffer) {
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(
        cloned.fallibleUnshieldedOffer.inputs.map(
          (_input: unknown, index: number) =>
            cloned.fallibleUnshieldedOffer!.signatures.at(index) ?? signature,
        ),
      );
    }
    if (cloned.guaranteedUnshieldedOffer) {
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(
        cloned.guaranteedUnshieldedOffer.inputs.map(
          (_input: unknown, index: number) =>
            cloned.guaranteedUnshieldedOffer!.signatures.at(index) ?? signature,
        ),
      );
    }
    tx.intents.set(segment, cloned);
  }
};

try {
  console.log('Starting funded CLI wallet from synchronized DUST checkpoint...');
  await wallet.unshielded.start();
  await (wallet as unknown as {
    pendingTransactionsService: { start: () => Promise<void> };
  }).pendingTransactionsService.start();
  let unshieldedState = await wallet.unshielded.waitForSyncedState(0n);
  await wallet.dust.start(dustSecretKey);
  let dustState = await wallet.dust.waitForSyncedState(0n);
  await writeFile(snapshotPath, await wallet.dust.serializeState());
  let dustBalance = dustState.balance(new Date());
  console.log(`Spendable tDUST raw balance: ${dustBalance}`);

  const unregistered = unshieldedState.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (dustBalance <= 0n && unregistered.length > 0) {
    console.log(`Registering ${unregistered.length} funded NIGHT UTXO(s) for DUST generation...`);
    const estimate = await wallet.estimateRegistration(unregistered);
    console.log(`DUST registration fee estimate: ${estimate.fee}`);
    await wallet.waitForGeneratedDust(unregistered, estimate.fee, { timeoutMs: 900_000 });
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      unregistered,
      unshieldedKeystore.getPublicKey(),
      (payload) => unshieldedKeystore.signData(payload),
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    const registrationIdentifiers = finalized.identifiers().map(String);
    await wallet.submitTransaction(finalized);
    console.log(`DUST registration submitted: ${registrationIdentifiers.join(', ')}`);
    [unshieldedState, dustState] = await Rx.firstValueFrom(
      Rx.combineLatest([wallet.unshielded.state, wallet.dust.state]).pipe(
        Rx.filter(([nextUnshielded, nextDust]) =>
          nextUnshielded.availableCoins.some(
            (coin) => coin.meta?.registeredForDustGeneration === true,
          ) && nextDust.balance(new Date()) > 0n,
        ),
        Rx.timeout({ first: 900_000 }),
      ),
    );
    dustBalance = dustState.balance(new Date());
    await writeFile(snapshotPath, await wallet.dust.serializeState());
    console.log(`DUST registration indexed; spendable tDUST raw balance: ${dustBalance}`);
  }

  if (dustBalance <= 0n) {
    throw new Error('The synchronized wallet has no spendable tDUST');
  }

  const publicKeys = PublicKeys.fromSecretKeys(shieldedSecretKeys);
  const coinKey = new ShieldedCoinPublicKey(
    Buffer.from(publicKeys.coinPublicKey as unknown as string, 'hex'),
  );
  const encryptionKey = new ShieldedEncryptionPublicKey(
    Buffer.from(publicKeys.encryptionPublicKey as unknown as string, 'hex'),
  );
  const walletProvider = {
    getCoinPublicKey: () => coinKey.toHexString(),
    getEncryptionPublicKey: () => encryptionKey.toHexString(),
    balanceTx: async (transaction: any, ttl?: Date) => {
      const recipe = await wallet.balanceUnboundTransaction(
        transaction,
        { shieldedSecretKeys, dustSecretKey },
        {
          ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000),
          tokenKindsToBalance: ['unshielded', 'dust'],
        },
      );
      signTransactionIntents(recipe.baseTransaction, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, 'pre-proof');
      }
      return wallet.finalizeRecipe(recipe);
    },
    submitTx: async (transaction: any) => {
      const identifiers = transaction.identifiers().map(String);
      const deployAddresses = [...(transaction.intents?.values() ?? [])]
        .flatMap((intent: any) => intent.actions ?? [])
        .filter((action: unknown) => action instanceof ledger.ContractDeploy)
        .map((action: ledger.ContractDeploy) => String(action.address));
      console.log(`Finalized transaction identifier(s): ${identifiers.join(', ')}`);
      console.log(`Deployment address in transaction: ${deployAddresses.join(', ')}`);
      return wallet.submitTransaction(transaction);
    },
  };

  const compiledContract = CompiledContract.make('kinproof', Kinproof.Contract).pipe(
    CompiledContract.withWitnesses(createWitnesses()),
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: './kinproof-preprod-private-state',
      privateStateStoreName: 'kinproof-private-state',
      signingKeyStoreName: 'kinproof-signing-keys',
      accountId: unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => `K1nproof-Preprod!${seed}`,
    }),
    publicDataProvider: indexerPublicDataProvider(indexer, indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const initialPrivateState = createKinproofPrivateState(randomBytes(32));

  console.log('Proving and submitting Kinproof deployment...');
  const contract = await deployContract(providers as any, {
    compiledContract: compiledContract as any,
    privateStateId: 'kinproofPrivateState',
    initialPrivateState,
    args: [],
  });
  const contractAddress = contract.deployTxData.public.contractAddress;
  const result = {
    network: 'preprod',
    contractAddress,
    deployedAt: new Date().toISOString(),
    explorer: `https://explorer.preprod.midnight.network/contract/${contractAddress}`,
  };
  await writeFile('./kinproof-preprod-deploy.json', JSON.stringify(result, null, 2));
  console.log(`PREPROD CONTRACT ADDRESS: ${contractAddress}`);
  console.log(`Explorer: ${result.explorer}`);
} finally {
  await wallet.stop();
}
