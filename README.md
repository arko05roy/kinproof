# Kinproof

[![CI](https://github.com/arko05roy/kinproof/actions/workflows/ci.yml/badge.svg)](https://github.com/arko05roy/kinproof/actions/workflows/ci.yml)

**Prove the plan is ready. Keep the plan private.** Kinproof is a private recovery-readiness seal for people who hold digital assets. A user confirms five concrete safeguards, then Midnight proves that every safeguard passed without publishing any answer, trusted person, device, backup location, or recovery instruction. The ledger keeps only an app-specific one-way commitment, its active/revoked status, and its revision.

## Product

Loss and incapacity are predictable risks, but publishing a recovery plan creates a new security risk. Kinproof turns preparedness into a verifiable signal without turning the plan into an attack map. A seal can be created, privately rechecked and refreshed, or revoked by proving knowledge of its browser-local control secret.

## Status

- Network: Midnight Preprod
- Compact compiler: `0.31.1`
- Contract circuits: `sealPlan`, `refreshPlan`, `revokePlan`
- Tests: 8 passing
- Official live demo: https://kinproof-web.vercel.app/
- GitHub Pages mirror: https://arko05roy.github.io/kinproof/
- Preprod contract address (full): [`1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e`](https://explorer.preprod.midnight.network/contract/1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e)
- Deployment: indexer-verified `SUCCESS` at block `2074208`

## Public state vs private witness

| Public Midnight state | Private witness / local state |
| --- | --- |
| One-way Kinproof commitment | Five checklist answers |
| Active or revoked status | 32-byte control secret |
| Revision number | Trusted people and their details |
| Aggregate seal, refresh, and revoke counters | Devices, credentials, locations, and instructions |

The Compact circuit calls each readiness witness and asserts that it returns `true`. Only after all five assertions pass does it deliberately disclose `persistentHash("kinproof:readiness:v1:", localControlSecret)` for use as the ledger key. Neither the inputs nor the preimage of that commitment are published.

## Privacy model

An observer **can learn** that a pseudonymous Kinproof seal exists, whether it is active, its revision, and aggregate contract activity. An observer **cannot learn** which wallet controls the seal, any checklist answer, the identity of a trusted contact, backup or device locations, recovery instructions, or the local control secret. Repeated actions on one seal are linkable to that seal commitment; the commitment is deliberately app-specific so it cannot be correlated across unrelated DApps.

## Repository layout

```text
contract/   Compact source, generated contract bindings, keys, and ZKIR
api/        Platform-neutral deploy/join/seal/refresh/revoke API
web/        React + Lace browser DApp and public Preprod state reader
deployer/   Headless wallet, faucet wait, and Preprod deployment tooling
docs/       Product proposal, architecture, and submission evidence
```

## Run locally

Requirements: Node.js 22+, Docker Desktop, Compact, and Lace with Midnight enabled.

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
npm install
npm run compile
npm test
npm run dev
```

Open `http://localhost:3000`. Lace must target `preprod`; proof generation uses the proof-server URI supplied by the connected wallet.

## Verify the full build

```bash
npm run compile      # emits 3 circuits and refreshes contract/managed/kinproof
npm test             # 8 privacy and lifecycle tests
npm run typecheck    # API + browser types
npm run build        # contract, API, and production web bundle
```

## Deploy to Preprod

Kinproof is deployed at the full Preprod contract address `1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e`. The indexer recorded transaction `8d9131d26341a6d11202e7e7c0becf48a25a19c141edb440bf1b2adad462db8f` as `SUCCESS` in block `2074208`.

The standard deployer creates a BIP-39 wallet locally, waits for faucet funding, registers NIGHT for DUST, and deploys the compiled contract. For a funded CLI seed, the supplied Preprod recovery runbook is also implemented as `status:skill`, `dust:parallel`, and `deploy:skill`; pass the seed only through the ephemeral `SEED` environment variable and never commit it.

```bash
npm run deploy:preprod
```

Never commit `.midnight-state.json`, `.midnight-wallet-state/`, or private-state databases.

## Contract behavior

- `sealPlan`: proves all five private checks and creates revision 1.
- `refreshPlan`: proves all checks again and increments the public revision.
- `revokePlan`: proves knowledge of the local secret and marks the seal revoked.

## Documentation

- [Product proposal](docs/product-proposal.md)
- [Architecture and privacy boundary](docs/architecture.md)
- [Local setup](docs/setup.md)
- [User guide](docs/usage.md)
- [Launch cohort and verification record](docs/launch-cohort.md)
- [Feedback loop](docs/feedback-loop.md)
- [Judge-facing submission checklist](docs/submission-checklist.md)
- [Midnight documentation](https://docs.midnight.network/)

## Demo

- [Open the official live Kinproof DApp](https://kinproof-web.vercel.app/)
- [Open the GitHub Pages mirror](https://arko05roy.github.io/kinproof/)
- [Watch the Kinproof demo video](https://youtu.be/7b9DmwkY1E8)

## Launch evidence

Kinproof has a live Preprod contract, a browser DApp, and a 50-address launch cohort recorded in [`user-wallet.md`](user-wallet.md). Each cohort address is a Midnight Preprod address supplied for the launch. The contract does not publish wallet addresses or recovery answers, so an address alone does not prove a person created a seal; the cohort workflow records consent, completion, and optional transaction evidence separately. See [the cohort record](docs/launch-cohort.md) and [feedback loop](docs/feedback-loop.md).

Apache-2.0
