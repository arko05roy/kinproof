# Security policy

Kinproof is a testnet MVP. Do not place real recovery phrases, private keys, contact details, backup locations, or recovery instructions into the app. The five controls are boolean confirmations only.

## Private-state assumptions

- The browser-local control secret is generated with `crypto.getRandomValues` and never sent as an application payload.
- The Compact circuit publishes only an app-domain-separated persistent hash of that secret.
- Clearing site data removes the browser copy of the secret and therefore removes control of that seal unless the browser profile was backed up.
- The headless deployer wallet files are gitignored and written with owner-only permissions; they must be backed up outside the repository.
- Lace remains responsible for wallet authorization, transaction balancing, and transaction submission.

## Reporting

Please report vulnerabilities privately through GitHub Security Advisories rather than a public issue. Include the affected commit, reproduction steps, impact, and whether private witness data can cross the intended boundary.

## Known MVP limits

- A seal commitment is linkable across its own refresh and revoke operations.
- Browser `localStorage` is not hardware-backed. Production custody should move the control secret to encrypted wallet-managed private state.
- This project has not received a third-party audit and must not be used as inheritance or legal advice.

