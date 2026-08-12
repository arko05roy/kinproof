import { createHash } from 'node:crypto';
import type { RecoveryChecklist } from '../src/witnesses.js';

export interface PublicSeal {
  readonly active: boolean;
  readonly revision: bigint;
}

const REQUIRED_CHECKS: ReadonlyArray<keyof RecoveryChecklist> = [
  'offlineBackup',
  'testedRecovery',
  'trustedContact',
  'deviceAccessPlan',
  'currentInstructions',
];

/** A deterministic model of the contract state machine used for fast tests. */
export class KinproofSimulator {
  private readonly seals = new Map<string, PublicSeal>();
  private totalSeals = 0n;
  private totalRefreshes = 0n;
  private totalRevokes = 0n;

  commitment(secret: Uint8Array): string {
    return createHash('sha256')
      .update('kinproof:readiness:v1:')
      .update(secret)
      .digest('hex');
  }

  sealPlan(secret: Uint8Array, checklist: RecoveryChecklist): string {
    this.requireReady(checklist);
    const id = this.commitment(secret);
    if (this.seals.has(id)) throw new Error('this plan already has a seal');
    this.seals.set(id, { active: true, revision: 1n });
    this.totalSeals += 1n;
    return id;
  }

  refreshPlan(secret: Uint8Array, checklist: RecoveryChecklist): void {
    this.requireReady(checklist);
    const id = this.commitment(secret);
    const seal = this.seals.get(id);
    if (!seal) throw new Error('seal not found');
    if (!seal.active) throw new Error('seal is revoked');
    this.seals.set(id, { active: true, revision: seal.revision + 1n });
    this.totalRefreshes += 1n;
  }

  revokePlan(secret: Uint8Array): void {
    const id = this.commitment(secret);
    const seal = this.seals.get(id);
    if (!seal) throw new Error('seal not found');
    if (!seal.active) throw new Error('seal is already revoked');
    this.seals.set(id, { ...seal, active: false });
    this.totalRevokes += 1n;
  }

  publicState() {
    return {
      seals: new Map(this.seals),
      sealCount: this.totalSeals,
      refreshCount: this.totalRefreshes,
      revokeCount: this.totalRevokes,
    };
  }

  private requireReady(checklist: RecoveryChecklist): void {
    const missing = REQUIRED_CHECKS.find((check) => !checklist[check]);
    if (missing) throw new Error(`${missing} is not confirmed`);
  }
}

