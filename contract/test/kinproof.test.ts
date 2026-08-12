import { beforeEach, describe, expect, it } from 'vitest';
import type { RecoveryChecklist } from '../src/witnesses.js';
import { KinproofSimulator } from './kinproof-simulator.js';

const ready: RecoveryChecklist = {
  offlineBackup: true,
  testedRecovery: true,
  trustedContact: true,
  deviceAccessPlan: true,
  currentInstructions: true,
};

describe('Kinproof contract model', () => {
  let contract: KinproofSimulator;
  let secret: Uint8Array;

  beforeEach(() => {
    contract = new KinproofSimulator();
    secret = new Uint8Array(32).fill(7);
  });

  it('creates an active seal only when all private checks pass', () => {
    const id = contract.sealPlan(secret, ready);
    expect(contract.publicState().seals.get(id)).toEqual({ active: true, revision: 1n });
    expect(contract.publicState().sealCount).toBe(1n);
  });

  it('rejects a plan with any missing readiness check', () => {
    expect(() => contract.sealPlan(secret, { ...ready, testedRecovery: false }))
      .toThrow('testedRecovery is not confirmed');
    expect(contract.publicState().seals.size).toBe(0);
  });

  it('does not expose checklist answers in public state', () => {
    const id = contract.sealPlan(secret, ready);
    const publicKeys = Object.keys(contract.publicState().seals.get(id) ?? {});
    expect(publicKeys).toEqual(['active', 'revision']);
    expect(publicKeys).not.toContain('offlineBackup');
    expect(publicKeys).not.toContain('trustedContact');
  });

  it('derives different app identities from different secrets', () => {
    const otherSecret = new Uint8Array(32).fill(8);
    expect(contract.commitment(secret)).not.toBe(contract.commitment(otherSecret));
  });

  it('refreshes an active seal after rechecking every requirement', () => {
    const id = contract.sealPlan(secret, ready);
    contract.refreshPlan(secret, ready);
    expect(contract.publicState().seals.get(id)?.revision).toBe(2n);
    expect(contract.publicState().refreshCount).toBe(1n);
  });

  it('rejects refresh from a different control secret', () => {
    contract.sealPlan(secret, ready);
    expect(() => contract.refreshPlan(new Uint8Array(32).fill(9), ready)).toThrow('seal not found');
  });

  it('revokes a seal without deleting its public audit record', () => {
    const id = contract.sealPlan(secret, ready);
    contract.revokePlan(secret);
    expect(contract.publicState().seals.get(id)).toEqual({ active: false, revision: 1n });
    expect(contract.publicState().revokeCount).toBe(1n);
  });

  it('prevents refresh after revocation', () => {
    contract.sealPlan(secret, ready);
    contract.revokePlan(secret);
    expect(() => contract.refreshPlan(secret, ready)).toThrow('seal is revoked');
  });
});
