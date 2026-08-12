import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
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
} from '@midnightntwrk/wallet-sdk';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// @ts-expect-error The Node ws implementation supplies the runtime WebSocket API.
globalThis.WebSocket = WebSocket;

const seed = process.env.SEED;
if (!seed || !/^[0-9a-fA-F]{64,128}$/.test(seed) || seed.length % 2 !== 0) {
  throw new Error('SEED must be a 64-128 character even-length hex string');
}

const CONFIG = {
  networkId: 'preprod' as const,
  indexerHttpUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
};

setNetworkId(CONFIG.networkId);

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

const shieldedConfig = {
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: CONFIG.indexerHttpUrl,
    indexerWsUrl: CONFIG.indexerWsUrl,
    bufferSize: 20_000,
    resumeThreshold: 500,
  },
  provingServerUrl: new URL(CONFIG.proofServer),
  relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
};
const unshieldedConfig = {
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: CONFIG.indexerHttpUrl,
    indexerWsUrl: CONFIG.indexerWsUrl,
  },
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
};
const dustConfig = {
  ...shieldedConfig,
  batchUpdates: {
    size: 1_000,
    timeout: 10,
    spacing: 1,
  },
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
};

console.log(`Unshielded address: ${unshieldedKeystore.getBech32Address()}`);
console.log('Starting current Wallet SDK and syncing Preprod...');

const snapshotPath = process.env.DUST_SNAPSHOT ?? './dust-snapshot.json';
const dustSnapshot = await readFile(snapshotPath, 'utf8').catch(() => undefined);
const wallet = await WalletFacade.init({
  configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) =>
    UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
  dust: (cfg) =>
    dustSnapshot
      ? DustWallet(cfg).restore(dustSnapshot)
      : DustWallet(cfg).startWithSecretKey(
          dustSecretKey,
          ledger.LedgerParameters.initialParameters().dust,
        ),
});

let checkpointTimer: NodeJS.Timeout | undefined;
try {
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  checkpointTimer = setInterval(() => {
    void wallet.dust.serializeState().then(async (snapshot) => {
      const parsed = JSON.parse(snapshot) as { offset?: string };
      await writeFile(snapshotPath, snapshot, { mode: 0o600 });
      console.log(`DUST replay checkpoint: ${parsed.offset ?? '0'}`);
    }).catch((error: unknown) => {
      console.error('Could not save DUST checkpoint:', error);
    });
  }, 30_000);
  const synced = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((state) => state.isSynced)),
  );
  const nightBalance = synced.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dustBalance = synced.dust.balance(new Date());
  const registered = synced.unshielded.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration === true,
  );
  const unregistered = synced.unshielded.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration !== true,
  );

  console.log(`tNIGHT raw balance: ${nightBalance}`);
  console.log(`Registered NIGHT UTXOs: ${registered.length}`);
  console.log(`Unregistered NIGHT UTXOs: ${unregistered.length}`);
  console.log(`tDUST raw balance: ${dustBalance}`);
  console.log(`DUST address: ${await wallet.dust.getAddress()}`);
  await writeFile(snapshotPath, synced.dust.serialize(), { mode: 0o600 });
  console.log(`Saved current DUST state: ${snapshotPath}`);
} finally {
  if (checkpointTimer) clearInterval(checkpointTimer);
  await wallet.stop();
}
