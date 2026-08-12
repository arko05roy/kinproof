import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localControlSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  hasOfflineBackup(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  hasTestedRecovery(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  hasTrustedContact(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  hasDeviceAccessPlan(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  hasCurrentInstructions(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
}

export type ImpureCircuits<PS> = {
  sealPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  refreshPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokePlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  sealPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  refreshPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokePlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  sealCommitment(secret_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  sealCommitment(context: __compactRuntime.CircuitContext<PS>,
                 secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  sealPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  refreshPlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokePlan(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  seals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { active: boolean, revision: bigint };
    [Symbol.iterator](): Iterator<[Uint8Array, { active: boolean, revision: bigint }]>
  };
  readonly sealCount: bigint;
  readonly refreshCount: bigint;
  readonly revokeCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
