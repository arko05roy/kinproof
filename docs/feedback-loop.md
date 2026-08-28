# Feedback loop

Kinproof treats privacy understanding and successful lifecycle completion as the primary launch signals. This is the structured process used with the 50-address Preprod cohort in [`launch-cohort.md`](launch-cohort.md).

## Collection questions

After the participant finishes or exits the flow, record:

1. Did you understand that the five answers remain private? (`yes`, `partly`, `no`)
2. Did you connect Lace on Midnight Preprod successfully? (`yes`, `no`, `blocked`)
3. Did you create a seal, refresh it, or revoke it? (`seal`, `refresh`, `revoke`, `none`)
4. What was the first confusing or slow step?
5. What would make you more confident using Kinproof?
6. May we retain an optional transaction reference or screen recording as private verification evidence? (`yes`, `no`)

Never request recovery phrases, backups, trusted-person identities, device information, locations, instructions, or the browser-local control secret.

## Triage

| Category | Definition | Expected response |
| --- | --- | --- |
| Blocker | Prevents connect, proof generation, signing, or confirmation | Fix before expanding the cohort |
| Trust | Creates doubt about what is private or public | Clarify in the UI and docs; re-test with the next participants |
| Friction | Flow succeeds but takes unnecessary time or explanation | Prioritize by frequency and impact on activation |
| Delight | A useful or reassuring detail after core completion | Track but defer behind blockers and trust issues |

## Decision cadence

1. Review new responses after every five participants.
2. Group repeating reports into one issue with cohort IDs only.
3. Address blockers and privacy misunderstandings first.
4. Update `README.md`, `usage.md`, and the DApp if behavior or expectations change.
5. Re-test the changed flow with the next five participants and record the result.

## Reporting safely

Publish only aggregated findings and consented, redacted quotations. The public evidence can name a cohort ID and completion count, but it must not correlate a recovery plan with a real identity or disclose private witness data.
