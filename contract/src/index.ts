import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as Kinproof from '../managed/kinproof/contract/index.js';
export {
  createKinproofPrivateState,
  createWitnesses,
  emptyChecklist,
  withChecklist,
} from './witnesses.js';
export type { KinproofPrivateState, RecoveryChecklist } from './witnesses.js';

import * as KinproofContract from '../managed/kinproof/contract/index.js';
import { createWitnesses } from './witnesses.js';

export const CompiledKinproofContract = CompiledContract.make(
  'kinproof',
  KinproofContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/kinproof'),
);

