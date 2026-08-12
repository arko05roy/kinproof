/** Platform-neutral Kinproof contract API. */

import * as ContractBindings from '../../contract/managed/kinproof/contract/index.js';
import {
  CompiledKinproofContract,
  createKinproofPrivateState,
  withChecklist,
  type KinproofPrivateState,
  type RecoveryChecklist,
} from '../../contract/src/index.js';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';
import type { Logger } from 'pino';
import {
  kinproofPrivateStateKey,
  type DeployedKinproofContract,
  type KinproofDerivedState,
  type KinproofProviders,
} from './common-types.js';

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export class KinproofAPI {
  private constructor(
    public readonly deployedContract: DeployedKinproofContract,
    private readonly providers: KinproofProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => ContractBindings.ledger(contractState.data)),
        map((ledger): KinproofDerivedState => ({
          sealCount: Number(ledger.sealCount),
          refreshCount: Number(ledger.refreshCount),
          revokeCount: Number(ledger.revokeCount),
          seals: Array.from(ledger.seals, ([commitment, seal]) => ({
            commitment: toHex(commitment),
            active: seal.active,
            revision: Number(seal.revision),
          })),
        })),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<KinproofDerivedState>;

  async sealPlan(checklist: RecoveryChecklist): Promise<void> {
    await this.updateChecklist(checklist);
    this.logger?.info('Generating private Kinproof readiness seal');
    await (this.deployedContract as any).callTx.sealPlan();
  }

  async refreshPlan(checklist: RecoveryChecklist): Promise<void> {
    await this.updateChecklist(checklist);
    this.logger?.info('Refreshing Kinproof readiness seal');
    await (this.deployedContract as any).callTx.refreshPlan();
  }

  async revokePlan(): Promise<void> {
    this.logger?.info('Revoking Kinproof readiness seal');
    await (this.deployedContract as any).callTx.revokePlan();
  }

  private async updateChecklist(checklist: RecoveryChecklist): Promise<void> {
    const current = await this.providers.privateStateProvider.get(kinproofPrivateStateKey);
    if (!current) throw new Error('Kinproof private state is unavailable');
    await this.providers.privateStateProvider.set(
      kinproofPrivateStateKey,
      withChecklist(current, checklist),
    );
  }

  static async deploy(
    providers: KinproofProviders,
    controlSecret: Uint8Array,
    logger?: Logger,
  ): Promise<KinproofAPI> {
    const deployed = await deployContract(providers as any, {
      compiledContract: CompiledKinproofContract,
      privateStateId: kinproofPrivateStateKey,
      initialPrivateState: createKinproofPrivateState(controlSecret),
    });
    return new KinproofAPI(deployed, providers, logger);
  }

  static async join(
    providers: KinproofProviders,
    contractAddress: ContractAddress,
    controlSecret: Uint8Array,
    logger?: Logger,
  ): Promise<KinproofAPI> {
    const deployed = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: CompiledKinproofContract,
      privateStateId: kinproofPrivateStateKey,
      initialPrivateState: createKinproofPrivateState(controlSecret),
    });
    return new KinproofAPI(deployed, providers, logger);
  }
}

export * from './common-types.js';

