# KINPROOF Feedback Loop — Simulated Cohort Review

This document is a simulated public feedback record for a 50-address Midnight Preprod cohort. It is written in first person to model how I would report the research, but it does not claim that these interviews happened. I use wallet addresses only to identify eligibility. Any future real participant notes will use cohort IDs and will not publish personal identity, recovery plans, trusted contacts, devices, locations, instructions, checklist answers, or control secrets.

## Loop

1. I invite a cohort address to the live Kinproof MVP.
2. I ask the participant to connect Lace on Midnight Preprod, review the privacy model, complete the five readiness checks, and create one private readiness seal.
3. If a seal exists, I ask the participant to refresh it after rechecking the plan, then revoke it when testing lifecycle controls.
4. I capture the same fields every time: task completed, time to first result, confusing step, privacy/proof/UX issue, and one requested improvement.
5. I triage each item as blocker, friction, trust, or delight, then link the product change or documentation update.
6. I re-test the changed flow with the next cohort slice and append the outcome.

I have not completed or recorded 50 named interviews. The feedback below is synthetic and intended for planning, demo, or draft-submission use only; I must replace it with consented participant evidence before presenting it as research.

## Product acceptance checks

| ID | Checkpoint | Signal captured | Priority | Response / evidence |
|---|---|---|---|---|
| K-01 | Lace connection | Can a first-time user connect to Midnight Preprod and understand wallet/network state? | Blocker first | I use the Lace connector path in the browser DApp; I document setup and Preprod requirements in `README.md` and `docs/submission-checklist.md`. |
| K-02 | Private readiness checklist | Can users understand and complete all five checks without exposing sensitive details? | Trust-critical | I define the checks as `offlineBackup`, `testedRecovery`, `trustedContact`, `deviceAccessPlan`, and `currentInstructions`; I keep their witnesses browser-private in `contract/src/witnesses.ts`. |
| K-03 | Seal creation | Does a user know that all five checks are proven privately before signing? | Blocker before polish | I use `sealPlan` to assert every readiness witness, create revision 1, and publish only an app-specific commitment plus public status/revision. |
| K-04 | Public proof boundary | Can users distinguish public seal state from private recovery-plan data? | Trust | I document the public/private boundary in `README.md` and `docs/architecture.md`; public state contains no checklist answers or wallet address. |
| K-05 | Refresh | Can users recheck the plan and understand that refresh increments revision without publishing changes? | Friction | I use `refreshPlan` to update private checklist state, require every check again, and increment the public revision. |
| K-06 | Revoke | Can users revoke an unsafe or outdated seal and understand the final state? | Blocker | I use `revokePlan` to require the local control secret and mark the seal inactive; lifecycle tests cover this behavior in `contract/test/kinproof.test.ts`. |
| K-07 | Result and ledger state | Are active/revoked status, revision, and aggregate activity clear without implying identity? | Trust | I expose only public seal status, revision, and aggregate counters through the web/API state reader; repeated actions remain linkable to the app-specific commitment. |

I use these as my cohort's public acceptance checks and triage decisions. I treat anything that stops seal creation or lifecycle completion as a blocker, prioritize friction by activation impact, require visible privacy evidence for trust issues, and defer delight until the core flow is reliable.

## Change log from the loop

| Signal | Change made | Re-test / owner |
|---|---|---|
| Wallet and network context can block first use | Published the official live Preprod DApp and documented Lace, Preprod, proof-server, and deployment requirements. | Re-test connection and network recognition during every launch slice; `web/`, `README.md`. |
| Users need a concrete explanation of what is being proven | Defined five named readiness checks and centralized their witness implementation. | Re-test checklist comprehension before seal creation; `contract/src/witnesses.ts`, `docs/product-proposal.md`. |
| Recovery details must not become an attack map | Kept checklist answers, trusted-person details, device data, locations, instructions, and the control secret in private state. | Re-test privacy explanation and inspect public state for leakage; `docs/architecture.md`, `README.md`. |
| Users need confidence that a seal is more than a local checkbox | Implemented `sealPlan` as a Compact circuit that requires every check and emits only a commitment, active status, and revision. | Re-test successful seal and missing-check rejection; `contract/kinproof.compact`, `contract/test/kinproof.test.ts`. |
| Lifecycle must cover changed or unsafe plans | Implemented refresh and revoke behavior with revision and active-state transitions. | Re-test refresh, revoked-state rejection, and control-secret ownership; `api/src/index.ts`, `contract/test/kinproof.test.ts`. |
| Preprod proof and deployment need independently checkable evidence | Recorded the indexer-verified contract address, successful deployment transaction, block, build status, and test count. | Re-test live contract state and attach a recorded circuit call; `docs/submission-checklist.md`. |

I use this log to separate implemented responses from validation still owed. My current evidence proves the build, privacy boundary, contract lifecycle, and Preprod deployment; it does not prove that 50 participants completed the flow or that I validated willingness to use Kinproof through 50 interviews.

## Representative friction feedback

I wrote the notes below as realistic synthetic feedback based on my product proposal, documented privacy model, implementation, and acceptance checks. They are not verbatim interviews, and they are not evidence that any cohort address completed the full flow.

| User moment | Representative feedback | Friction | Priority | Product response |
|---|---|---|---|---|
| Opening the DApp | “I do not know whether Lace is missing, connecting, or pointed at the wrong network.” | Wallet and Preprod state are easy to miss before the first action. | Blocker | I will keep install/connect/connected states distinct, show Preprod context, and link to setup. |
| Reading the checklist | “I understand ‘offline backup,’ but I need examples without entering where my backup or trusted person is.” | Safety concepts and privacy boundary may be unclear together. | Trust | I will explain each check as a yes/no readiness claim and explicitly say not to enter recovery details. |
| Creating a seal | “Does this publish my answers, or only prove that all five passed?” | Proof generation and disclosure boundary may be conflated. | Trust-critical | I will put the public/private state summary beside the seal action and link to `docs/architecture.md`. |
| Signing on Preprod | “I need to know whether this is a testnet transaction and what I am signing.” | Network and transaction consequence are unclear at commitment. | Blocker | I will add a final Preprod confirmation summary and wallet-signing explanation. |
| Waiting for proof | “Is the seal generating, waiting for Lace, submitted, or confirmed?” | Proof and transaction lifecycle states may not be distinct enough. | Blocker | I will separate preparing, wallet approval, submitted, confirmed, and failed states in the result surface. |
| Reviewing public state | “I want to verify the seal without learning whose recovery plan it is.” | Public status, revision, and commitment semantics need a simple explanation. | Trust | I will label the public fields and explain that Kinproof does not write the wallet address or checklist answers. |
| Refreshing a plan | “What changes when I refresh, and do I need to disclose what changed?” | Revision semantics and privacy-preserving recheck may be unclear. | Friction | I will explain that every check is privately re-proven and only the public revision changes. |
| Revoking a seal | “Can I undo this if my plan is outdated or my control secret is unavailable?” | Revoke is high-stakes; recovery from lost local state needs expectation-setting. | Blocker | I will explain the control-secret requirement, show inactive status after confirmation, and document the limitation clearly. |

## Prioritized next actions

1. Clarify Lace, Preprod, proof-generation, wallet-signing, and confirmation states. These can stop a user before a meaningful result.
2. Add concise, privacy-safe examples for each readiness check without collecting recovery-plan details.
3. Make the public/private boundary visible at checklist, seal, refresh, and public-state surfaces.
4. Add one recorded circuit call and one-minute demo evidence to close the remaining submission gaps.
5. Run five consented builder conversations before generalizing cohort feedback; ask: “Would a private, independently verifiable recovery-readiness seal change how you prepare or maintain a wallet recovery plan?”
6. Record whether each participant completes seal, refresh, and revoke, plus time to first result and one requested improvement.

I use these as draft feedback artifacts for a future cohort review. I will replace them with attributable, consented participant notes before using them as evidence of real user research.

## Discovery feedback

My strongest value hypothesis is that Kinproof lets digital-asset holders prove recovery readiness without publishing an attack map. I frame the benefit as a private, independently verifiable seal for families, teams, and counterparties.

My main concern is urgency: users may treat recovery planning as a private checklist they can postpone, and may not immediately understand why a public verifiable signal is useful. My second concern is trust: users need to believe that the five checks are meaningful, that the proof is not revealing answers, and that refresh/revoke behavior matches the real state of their plan.

My current evidence is implementation, desk research, and synthetic feedback—not direct customer validation. In the next real round I will test:

- what users currently do to prepare for wallet loss or incapacity;
- whether they would share an active/revoked readiness signal with a family member, team, or counterparty;
- whether private ZK proof changes willingness to use the product;
- how often plans are refreshed or revoked;
- whether users understand that Kinproof never receives the trusted person's identity, backup location, device details, instructions, or control secret;
- whether they would pay, recommend, or return to maintain a verifiable readiness seal.

I will append future responses using the schema above. I will not publish wallet addresses, recovery answers, trusted-person information, private locations, instructions, control secrets, or unconsented identity.
