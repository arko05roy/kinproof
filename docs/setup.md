# Setup

## Prerequisites

- Node.js 22 or later
- Docker Desktop (needed only for a local Midnight proof-server workflow)
- Compact compiler 0.31.1
- Lace browser extension with Midnight Preprod enabled for the live DApp

## Install and verify

From the repository root:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
npm install
npm run compile
npm test
npm run typecheck
```

The compile step writes the generated circuit bindings, proving keys, verifier keys, and ZKIR to `contract/managed/kinproof/`. The browser build copies the public proving artifacts into its bundle.

## Run the browser DApp

```bash
npm run dev
```

Open `http://localhost:3000`. The default configuration targets Midnight Preprod and the deployed Kinproof contract. Copy `web/.env.preprod` to a local environment file only when you need to override those defaults:

```bash
VITE_NETWORK_ID=preprod
VITE_DEFAULT_CONTRACT=1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e
```

Never put a seed phrase, private key, recovery plan, control secret, or a participant's private feedback in a Vite environment file. Browser variables are public at build time.

## Production build

```bash
npm run build
```

The root build compiles the Compact contract and builds the API and Vite app. The GitHub Actions CI workflow performs the same verification on pull requests and pushes to `main`.

## Preprod contract

The live contract is `1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e`. Its deployment completed successfully in block `2074208`. For a fresh deploy, use the scripts in `deployer/`, keep all wallet material local, and follow the deployment section of the root README.
