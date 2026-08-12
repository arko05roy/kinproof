import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { KinproofPrivateState } from '../../contract/src/index.js';

export const kinproofPrivateStateKey = 'kinproofPrivateState';
export type PrivateStateId = typeof kinproofPrivateStateKey;

export type KinproofCircuitKeys = 'sealPlan' | 'refreshPlan' | 'revokePlan';
export type KinproofProviders = MidnightProviders<
  KinproofCircuitKeys,
  PrivateStateId,
  KinproofPrivateState
>;
export type DeployedKinproofContract = FoundContract<any>;

export interface PublicReadinessSeal {
  readonly commitment: string;
  readonly active: boolean;
  readonly revision: number;
}

export interface KinproofDerivedState {
  readonly sealCount: number;
  readonly refreshCount: number;
  readonly revokeCount: number;
  readonly seals: readonly PublicReadinessSeal[];
}

