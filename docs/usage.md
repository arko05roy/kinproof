# User guide

Kinproof lets you produce a public readiness seal without publishing your recovery plan. It is not a wallet, custody service, backup service, or substitute for testing your recovery plan.

## Before you start

1. Install Lace and switch it to **Midnight Preprod**.
2. Fund the wallet with Preprod test funds if Lace indicates that a transaction cannot pay fees.
3. Open the [live Kinproof DApp](https://kinproof-web.vercel.app/).
4. Keep your recovery details offline. Kinproof asks only for five yes/no confirmations; do not type seed phrases, backup locations, names, or instructions into the app.

## Create a private seal

1. Select **Connect Lace** and approve the connection in Lace.
2. Review each of the five private checks: offline backup, tested recovery, trusted-person preparation, device-access plan, and current instructions.
3. Mark a check only when it is true. All five are required before the action becomes available.
4. Select **Seal my recovery plan**, inspect the Preprod request in Lace, and approve it only if it is expected.
5. Wait for the proof and transaction confirmation. The app shows a success message and the public record updates after the indexer catches up.

## Refresh or revoke

- **Refresh**: re-check all five conditions and select **Refresh private proof**. The public revision increments; the new answers remain private.
- **Revoke**: select **Revoke seal** if the plan becomes unsafe, incomplete, or outdated. The contract marks the commitment inactive.

The browser stores a local control secret for the seal. Clearing browser data or losing that secret can prevent refresh or revoke of that particular seal. Treat this as a product limitation during Preprod; do not rely on Kinproof as your only recovery process.

## What is public

Anyone can observe an app-specific commitment, its active/revoked status, revision, and aggregate contract counters. Nobody can derive the checklist answers, wallet identity, trusted contact, backup location, device details, instructions, or local control secret from those values.

## Troubleshooting

- **Lace is not found**: install Lace, unlock it, and reload the page.
- **Wrong network**: switch Lace to Midnight Preprod and reconnect.
- **Insufficient DUST/tNIGHT**: obtain Preprod test funds, then retry.
- **Proof service error**: check Lace's Midnight proof-server configuration and retry.
- **No existing seal on refresh/revoke**: use the same browser profile that created the seal; its local secret is required.
