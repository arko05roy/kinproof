# Kinproof product proposal

Kinproof is a private recovery-readiness seal for people who hold digital assets. A user completes five concrete checks—an offline backup exists, recovery instructions were tested, a trusted person is prepared, device access is covered, and instructions are current—then Midnight proves that every check passed without publishing any answer, person, device, or recovery secret. The public contract stores only an unlinkable Kinproof commitment, an active/revoked status, and a revision number, giving families, teams, and counterparties a useful signal without turning an emergency plan into an attack map.

## Why Midnight

A normal checklist app can either keep the result private or make it independently verifiable. Kinproof needs both. Compact witnesses keep the checklist and local secret off-chain; a zero-knowledge circuit enforces that all five answers are true; and the Midnight ledger makes the resulting seal verifiable and revocable.

## MVP user story

1. Connect a Lace wallet on Midnight Preprod.
2. Review and privately confirm five readiness checks.
3. Generate a zero-knowledge proof and publish a Kinproof seal.
4. Refresh the seal after rechecking the plan.
5. Revoke the seal if the plan is no longer safe.

## Privacy claim

An observer can learn that a pseudonymous Kinproof seal is active, how many times it has been refreshed, and aggregate contract activity. An observer cannot learn the wallet address behind a seal, which checks were completed, backup locations, trusted contacts, devices, instructions, or the local secret used to control the seal.

