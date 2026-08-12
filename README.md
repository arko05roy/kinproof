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
- Live demo: deployment in progress
- Preprod contract: funded deployer ready; public RPC sync currently blocking deployment

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

The deployer creates a BIP-39 wallet locally, stores the recovery material with owner-only permissions in a gitignored file, waits for faucet funding, registers NIGHT for DUST, and deploys the compiled contract.

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
- [Midnight documentation](https://docs.midnight.network/)

Apache-2.0
