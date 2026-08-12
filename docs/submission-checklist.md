# Submission checklist

## Level 1

- [x] Compact toolchain installed (`compact 0.5.0`, compiler `0.31.1`)
- [x] Three circuits compile
- [x] Eight tests pass
- [x] `contract/managed/kinproof/` contains bindings, keys, and ZKIR
- [x] Public GitHub repository and setup instructions
- [x] Public/private state explanation
- [x] 5+ meaningful commits
- [ ] Preprod address (wallet funded; public RPC sync did not reach `isSynced`)

## Level 2

- [x] Lace connect and disconnect
- [x] Browser circuit provider path
- [x] Observable private behavior: five facts proven without disclosure
- [x] Public live-demo workflow
- [x] 8+ meaningful commits
- [ ] Preprod address and recorded circuit call (blocked on public RPC wallet sync)
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
- [ ] Product X profile
- [ ] Final Preprod evidence and video

## Preprod funding evidence

- Wallet: `mn_addr_preprod1eud42n7gpkd5e95v6pr83tmfsl0pz84ttrkgw5a8g6yujw8gl5wsxlvsmx`
- Faucet amount: `1000 tNIGHT`
- Faucet transaction: `001ce9eb7bffdb632038ece69217460ea080abd1122158117e144028937b333aaa`
- Proof server: local `8.1.0`, healthy on port `6300`
- Deployment blocker: the public Preprod RPC repeatedly closed the runtime-version subscription with WebSocket code `1000` before the three-wallet facade reached `isSynced`; two bounded attempts were made without changing the funded wallet identity.

## Public links

- Repository: https://github.com/arko05roy/kinproof
- Demo: https://arko05roy.github.io/kinproof/
- Passing CI: https://github.com/arko05roy/kinproof/actions/workflows/ci.yml
