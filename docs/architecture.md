# Architecture

Kinproof is split into three independently testable layers.

- `contract/`: the Compact contract, generated bindings, proving keys, verifier keys, and ZKIR.
- `api/`: a platform-neutral TypeScript wrapper for deploy, join, seal, refresh, and revoke operations.
- `web/`: the browser client, Lace DApp Connector bridge, public-state reader, and Kinproof interface.

## State boundary

| Data | Location | Public? |
| --- | --- | --- |
| Five readiness answers | Browser private state / witness | No |
| 32-byte control secret | Browser private state / witness | No |
| Wallet addresses | Lace wallet | Not written by Kinproof |
| App-specific seal commitment | Midnight ledger | Yes, pseudonymous |
| Seal status and revision | Midnight ledger | Yes |
| Aggregate seal counters | Midnight ledger | Yes |

The app-specific commitment is derived inside the circuit as `persistentHash(domain, localSecret)`. The control secret is never disclosed. A refresh or revoke succeeds only when the caller can reproduce the stored commitment and satisfy the relevant circuit rules.

