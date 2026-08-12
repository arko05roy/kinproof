export interface RecoveryChecklist {
  readonly offlineBackup: boolean;
  readonly testedRecovery: boolean;
  readonly trustedContact: boolean;
  readonly deviceAccessPlan: boolean;
  readonly currentInstructions: boolean;
}

export interface KinproofPrivateState {
  readonly controlSecret: Uint8Array;
  readonly checklist: RecoveryChecklist;
}

export const emptyChecklist = (): RecoveryChecklist => ({
  offlineBackup: false,
  testedRecovery: false,
  trustedContact: false,
  deviceAccessPlan: false,
  currentInstructions: false,
});

export const createKinproofPrivateState = (
  controlSecret: Uint8Array,
  checklist: RecoveryChecklist = emptyChecklist(),
): KinproofPrivateState => ({ controlSecret, checklist });

export const withChecklist = (
  state: KinproofPrivateState,
  checklist: RecoveryChecklist,
): KinproofPrivateState => ({ ...state, checklist });

type WitnessContext = { readonly privateState: KinproofPrivateState };
type WitnessResult<T> = readonly [KinproofPrivateState, T];

export const createWitnesses = () => ({
  localControlSecret: ({ privateState }: WitnessContext): WitnessResult<Uint8Array> =>
    [privateState, privateState.controlSecret],
  hasOfflineBackup: ({ privateState }: WitnessContext): WitnessResult<boolean> =>
    [privateState, privateState.checklist.offlineBackup],
  hasTestedRecovery: ({ privateState }: WitnessContext): WitnessResult<boolean> =>
    [privateState, privateState.checklist.testedRecovery],
  hasTrustedContact: ({ privateState }: WitnessContext): WitnessResult<boolean> =>
    [privateState, privateState.checklist.trustedContact],
  hasDeviceAccessPlan: ({ privateState }: WitnessContext): WitnessResult<boolean> =>
    [privateState, privateState.checklist.deviceAccessPlan],
  hasCurrentInstructions: ({ privateState }: WitnessContext): WitnessResult<boolean> =>
    [privateState, privateState.checklist.currentInstructions],
});

