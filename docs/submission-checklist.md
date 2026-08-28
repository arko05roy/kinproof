# Submission checklist

## Level 1

- [x] Compact toolchain installed (`compact 0.5.0`, compiler `0.31.1`)
- [x] Three circuits compile
- [x] Eight tests pass
- [x] `contract/managed/kinproof/` contains bindings, keys, and ZKIR
- [x] Public GitHub repository and setup instructions
- [x] Public/private state explanation
- [x] 5+ meaningful commits
- [x] Preprod contract indexer-verified at block `2074208`

## Level 2

- [x] Lace connect and disconnect
- [x] Browser circuit provider path
- [x] Observable private behavior: five facts proven without disclosure
- [x] Public live-demo workflow
- [x] 8+ meaningful commits
- [x] Preprod address wired into the live DApp
- [ ] Recorded circuit call
- [ ] One-minute demo recording

## Level 3

- [x] Functional private seal/refresh/revoke DApp
- [x] 8 tests passing
- [x] Passing CI workflow
- [x] Product proposal documented
- [x] 10+ meaningful commits

## Level 4

- [x] Full setup, usage, architecture, and privacy documentation
- [x] CI/CD on the product repository
- [x] 15-commit delivery plan
- [~] Product X profile — intentionally out of scope for this delivery
- [x] Final Preprod deployment evidence
- [x] Demo video: https://youtu.be/7b9DmwkY1E8

## Level 5 / user-feedback delivery

- [x] Same Kinproof MVP extended from Level 4
- [x] 50 supplied Midnight Preprod cohort wallet addresses: [`../user-wallet.md`](../user-wallet.md)
- [x] Cohort onboarding, consent, and verification procedure: [`launch-cohort.md`](launch-cohort.md)
- [x] Structured feedback template and prioritization workflow: [`feedback-loop.md`](feedback-loop.md)
- [x] Updated setup and usage documentation: [`setup.md`](setup.md), [`usage.md`](usage.md)
- [x] Live demo and contract address are linked below

> The list is a cohort registry, not a disclosure of recovery plans or an assertion that every address completed a seal. Because Kinproof deliberately does not put wallet identities in its contract state, completion is evidenced through a participant-approved transaction reference or screen recording held in the private launch log.

## Preprod funding evidence

- Wallet: `mn_addr_preprod1eud42n7gpkd5e95v6pr83tmfsl0pz84ttrkgw5a8g6yujw8gl5wsxlvsmx`
- Faucet amount: `1000 tNIGHT`
- Faucet transaction: `001ce9eb7bffdb632038ece69217460ea080abd1122158117e144028937b333aaa`
- Proof server: local `8.0.3`, healthy on port `6300`
- DUST registration identifier: `00a608ba33816d6dd2dc51dfcbce82f0637fa184a3904fc99f411b1e36501664c6`
- Contract address: `1af8d7ad340f054a2e5266a2dd214163b7e85614f94725db5638d91a9cc0287e`
- Deployment identifiers: `00d82e43d3001b89febfbd88c019a987b7aca65fb96a13163e016438f9ed4ffb24`, `00d1412e2a29c89b1cdf02ccad2a47a32564e3045ff9c4e1e4967133307589ddbb`
- Transaction hash: `8d9131d26341a6d11202e7e7c0becf48a25a19c141edb440bf1b2adad462db8f`
- Block: `2074208` (`SUCCESS` via Preprod indexer v4)

## Public links

- Repository: https://github.com/arko05roy/kinproof
- Official demo: https://kinproof-web.vercel.app/
- GitHub Pages mirror: https://arko05roy.github.io/kinproof/
- Passing CI: https://github.com/arko05roy/kinproof/actions/workflows/ci.yml
- Demo video: https://youtu.be/7b9DmwkY1E8
