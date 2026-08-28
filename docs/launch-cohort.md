# Launch cohort — 50 Midnight Preprod addresses

## Purpose

This document records the 50-address Preprod launch cohort supplied in [`user-wallet.md`](../user-wallet.md). The addresses let a reviewer verify that the cohort uses the Midnight Preprod address format and gives the launch team a stable, pseudonymous participant identifier.

Kinproof intentionally does not write wallet addresses into its public state. A participant's readiness answers and control secret are also private. Therefore, an address list alone is not evidence that an address created, refreshed, or revoked a seal. The launch log below describes how to retain the missing evidence without weakening that privacy boundary.

## Participant flow

1. Confirm consent to be included in the cohort and to have their public Preprod address listed.
2. Send the participant the [user guide](usage.md) and live demo link.
3. Ask them to connect Lace on Preprod and complete the seal flow.
4. Record only the cohort number, completion state, time-to-first-result, and an optional participant-approved transaction hash or recording link in the private launch log.
5. Invite them to refresh after reviewing their plan; allow them to revoke when testing lifecycle controls.
6. Collect one structured feedback response using [`feedback-loop.md`](feedback-loop.md).

## Verification procedure

For every participant that opts into evidence collection, the launch operator checks that the supplied address begins with `mn_addr_preprod`, verifies the transaction reference in a Preprod explorer, and records the result against the cohort number. Do not add recovery details, checklist answers, trusted-contact data, seed phrases, or browser-local control secrets to the log.

## Public cohort record

The complete public address registry is maintained at [`user-wallet.md`](../user-wallet.md). It contains exactly 50 numbered Midnight Preprod addresses.

## Launch-log schema (keep private)

| Field | Example | Why it is collected |
| --- | --- | --- |
| Cohort ID | `KP-014` | Links evidence without a real-world identity |
| Address reference | `#14` in `user-wallet.md` | Confirms Preprod eligibility |
| Consent | `yes / date` | Documents permission to include the participant |
| Seal completed | `yes / no / declined` | Measures activation |
| Time to first result | `3m 20s` | Identifies onboarding friction |
| Optional transaction reference | explorer URL | Enables independent settlement review |
| Feedback category | blocker / friction / trust / delight | Drives prioritization |

Do not publish the private launch log without explicit participant consent.
