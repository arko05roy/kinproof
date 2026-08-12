/** Browser providers that bridge Lace to the Kinproof contract API. */

import {
  KinproofAPI,
  type KinproofCircuitKeys,
  type KinproofProviders,
} from '../../../api/src/index.js';
import type { KinproofPrivateState } from '../../../contract/src/index.js';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Binding,
  type FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { BehaviorSubject, type Observable } from 'rxjs';
import type { Logger } from 'pino';
import semver from 'semver';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider.js';

export type KinproofDeployment =
  | { readonly status: 'in-progress' }
  | { readonly status: 'deployed'; readonly api: KinproofAPI }
  | { readonly status: 'failed'; readonly error: Error };

export class BrowserKinproofManager {
  readonly #deployments = new Map<string, BehaviorSubject<KinproofDeployment>>();
  #providers: Promise<KinproofProviders> | undefined;

  constructor(private readonly logger: Logger) {}

  resolve(contractAddress?: ContractAddress): Observable<KinproofDeployment> {
    const key = contractAddress ?? 'new';
    const existing = this.#deployments.get(key);
    if (existing) return existing;

    const subject = new BehaviorSubject<KinproofDeployment>({ status: 'in-progress' });
    this.#deployments.set(key, subject);
    const secret = this.getControlSecret();
    void this.run(subject, (providers) => contractAddress
      ? KinproofAPI.join(providers, contractAddress, secret, this.logger)
      : KinproofAPI.deploy(providers, secret, this.logger));
    return subject;
  }

  private getControlSecret(): Uint8Array {
    const storageKey = 'kinproof-control-secret-v1';
    const stored = localStorage.getItem(storageKey);
    if (stored) return Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
    const secret = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(storageKey, btoa(String.fromCharCode(...secret)));
    return secret;
  }

  private getProviders(): Promise<KinproofProviders> {
    return this.#providers ?? (this.#providers = initializeProviders());
  }

  private async run(
    subject: BehaviorSubject<KinproofDeployment>,
    factory: (providers: KinproofProviders) => Promise<KinproofAPI>,
  ): Promise<void> {
    try {
      subject.next({ status: 'deployed', api: await factory(await this.getProviders()) });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.logger.error(error, 'Kinproof contract operation failed');
      subject.next({ status: 'failed', error });
    }
  }
}

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

const findWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI => Boolean(
      wallet && typeof wallet === 'object' && 'apiVersion' in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
    ),
  );
};

export const connectToWallet = async (networkId: string): Promise<ConnectedAPI> => {
  const wallet = findWallet();
  if (!wallet) throw new Error('No compatible Midnight wallet found. Install Lace and refresh.');
  return wallet.connect(networkId);
};

const initializeProviders = async (): Promise<KinproofProviders> => {
  const networkId = (import.meta.env.VITE_NETWORK_ID ?? 'preprod') as NetworkId;
  setNetworkId(networkId);
  const connectedAPI = await connectToWallet(networkId);
  const config = await connectedAPI.getConfiguration();
  const shielded = await connectedAPI.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider<KinproofCircuitKeys>(
    window.location.origin,
    fetch.bind(window),
  );

  return {
    privateStateProvider: inMemoryPrivateStateProvider<string, KinproofPrivateState>(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri!, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (transaction: UnboundTransaction): Promise<FinalizedTransaction> => {
        const balanced = await connectedAPI.balanceUnsealedTransaction(toHex(transaction.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(balanced.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (transaction: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(transaction.serialize()));
        return transaction.identifiers()[0];
      },
    },
  };
};

