# MemeDiff post-launch audit

Observed on **2026-11-11**, approximately 06:58–07:03 UTC (15:58–16:03 KST). Balances and rewards are snapshots, not live promises. Machine-readable public evidence: [launch-evidence.json](docs/launch-evidence.json). No wallet connection, signing, claim, buy, sell, transaction simulation, or submission was performed for this audit.

## Identity and issuance

| Field | Verified result |
| --- | --- |
| Network | Solana Mainnet |
| Mint / CA | `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork` |
| Name / symbol | MemeDiff / MEMEDIFF |
| Program | Token-2022, `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Decimals | 6 |
| Supply | 1,000,000,000 MEMEDIFF (raw 1000000000000000) |
| Mint / freeze / metadata update authorities | All null |
| Creation | 2026-11-11 **06:51:29 UTC / 15:51:29 KST**, slot 468029183 |
| Launch signer / payer | `EGQmE2VbE1h64zqG5EpUsuNrd6wrWFw2sx9WtyS5n27L` |
| Repository | `dnfl1999/memediff` |
| Forks live timestamp | 2026-11-11T06:51:32.369252Z |

Solana RPC `getAccountInfo` (jsonParsed, finalized) verifies the initialized mint and embedded metadata; `getTokenSupply` independently returns the supply. `getTransaction` verifies successful creation (`meta.err=null`) by the stated wallet. Forks' [repository token API](https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff) returns this exact mint and repository. DexScreener also resolves this mint to MemeDiff / MEMEDIFF, with pair `GJhnfPkf1mNw1jaoZBmQKi4jT41vhi6XQgSQxx7C9kh4` and matching creation time.

Evidence links: [Forks coin](https://forks.wiki/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork), [pump.fun coin](https://pump.fun/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork), [Solscan mint](https://solscan.io/token/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork), [DexScreener API](https://api.dexscreener.com/latest/dex/tokens/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork). Pump's frontend API and Solscan returned HTTP 403 in this environment; their rendered pages were **not** independently verified. No access controls were bypassed. The successful RPC, Forks, metadata and DexScreener results support issuance; explorer links are provided for manual review.

## Metadata and image

Mint URI: `https://ipfs.io/ipfs/bafkreid5jhzwufn7zhzjk23wbjuz6v6ypgtxnekng5luryrh4nr7hbdsdi`.

The original gateway and dweb.link returned 429. The [same metadata CID via Pinata's public gateway](https://gateway.pinata.cloud/ipfs/bafkreid5jhzwufn7zhzjk23wbjuz6v6ypgtxnekng5luryrh4nr7hbdsdi) returned JSON with the matching name/symbol and GitHub repository. Its image CID is `bafkreia3y7m54xgpiflkoku7xcfryijq2zufpheok5pedyxu3qg3sijgii`: JPEG, 512×512, 62,327 bytes, visually decoded as the green/black MemeDiff logo. Image SHA-256 is preserved in the evidence JSON.

Metadata `website` points to the exact Forks coin page; `telegram` contains the GitHub repository URL, despite that field's name. It has no X field and does not link directly to GitHub Pages. Forks' generated description includes generic wording that the coin is not made or endorsed by repository authors. This audit does not silently rewrite that record: metadata update authority is null. Project-maintained README and website now identify the project-associated token explicitly and link the correct public site: **https://dnfl1999.github.io/memediff/**. Adding an X link to a webpage would not prove Season account ownership.

## Launch transactions and initial purchase

All four launch transactions are successful, finalized, consecutively indexed 314–317 in slot 468029183. The listed wallet is the signer/payer in each.

| Transaction | Wallet debit (SOL) | Network fee included (SOL) |
| --- | ---: | ---: |
| [GitHub fee account creation](https://solscan.io/tx/kRBJxDXseLMMhM6XsdAhYBt2Eedi6WHDsLKL9gVVkSxdN3TnSsoTgchBU9v7veL2NQjbnR8tz5GNkUm8f6cSs4Z) | 0.001577560 | 0.000018 |
| [Mint and sharing-config creation](https://solscan.io/tx/2z6UEfAP2nmXnRFSZDMYpkdgXUTJEbZLmATDwti6kxHvDhjRH2Qc1io5xGKyVijR8PvhGEKBskztLPHucsf47VF9) | 0.011702880 | 0.000090 |
| [Set final fee shares](https://solscan.io/tx/5GWAM6wQpMp75xWNuXjP1PaQ7hrPx9iN7GHJ5Yip9dDcTcvEnYJvsoLXiH1EzeRPseRzdibGJSEk38umK4fVkUrq) | 0.000065000 | 0.000065 |
| [Initial buy](https://solscan.io/tx/5AGF3neiB7TMAmQraX7FWPkRLzfme53U9oKK5soqor6YaHbwcDsEBeENxcTwVkpcEQfVtuFoyzTLAWNLJ4uDJvZf) | 0.204065279 | 0.000055 |
| **Total** | **0.217410719** | **0.000228** |

The requested **0.2 SOL** purchase executed. The on-chain transfer breakdown reconciles to **0.199999999 SOL**, one lamport below the request due to integer rounding:

| Purchase component | SOL |
| --- | ---: |
| Net into bonding curve | 0.196543208 |
| Pump protocol fee destinations, combined | 0.001867161 |
| Creator fee | 0.000589630 |
| Forks 0.5% buy fee | 0.001000000 |
| **Purchase including trading fees** | **0.199999999** |

Separate launch overhead was **0.017410720 SOL**: 0.016682720 account rent (including buyer ATA, volume accumulator, creator vault and GitHub fee account), 0.000228 network/priority fees, and 0.000500 Jito tip. Rent funds accounts and is not a trading fee; do not assume every account's rent is reclaimable by the launcher. Adding purchase and overhead gives the exact four-transaction debit above. The earlier 0-buy estimate of 0.013845440 SOL excluded buy-specific accounts and the buy transaction fee; it is not the cost of this 0.2-SOL launch.

The buyer received **6,983,940.536880 MEMEDIFF**, raw `6983940536880`. `getTokenAccountsByOwner` subsequently returns that same balance in `TSekKLfRpP92ADsQLWedjTx7wa5AZtz7A5BXfVu3MEv` for this exact mint. This is about 0.698394% of total supply. No purchase was initiated by this audit.

## Creator-fee distribution and claims

On-chain sharing config: `Dyen5AzvjHRVG6pqKVyWGLVUXWnxFFUfTAE3KrTSeq36`, owned by Pump Fees `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ`.

Decoded with the official [Pump SDK 4.3.1 layout](https://unpkg.com/@pump-fun/pump-sdk@4.3.1/dist/index.js): version 2, active status 1, matching mint, **admin_revoked=true**. The SDK's `isSharingConfigEditable` returns false for revoked version-2 configs. [Pump's fee-sharing documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/CREATOR_FEE_SHARING.md) describes the one-time update and revocation.

| Recipient | Basis points | Share |
| --- | ---: | ---: |
| Launcher `EGQmE2VbE1h64zqG5EpUsuNrd6wrWFw2sx9WtyS5n27L` | 5000 | 50% |
| GitHub social fee account `FboBow7TKcrCNXTP2U52X1CCv6ysL5xjd1Jt2P1xQACk` | 3000 | 30% |
| Forks `Da71cES3NeUMLpW3MuNGkCVTht3jceik1RtNLrbqC6jV` | 2000 | 20% |

The GitHub account's on-chain data decodes to user ID `212464926`, platform 2 (GitHub), matching dnfl1999 in Forks' response. These are **creator-fee shares**, not allocations of token supply or sale proceeds.

At the recorded fee snapshot, creator vault `DWMUdtbrTxj3tuAVGuWm2ZGrAH6GTcJHbPDi6yXbbbEW` held **0.007202992 SOL**, including 0.000650240 rent. Above-rent funds were **0.006552752 SOL**. Indicative shares before distribution/rounding are 0.003276376 launcher, ~0.001965826 GitHub and ~0.001310550 Forks. These are pending vault-share estimates, **not confirmed claim quotes**. Additional unswept fees and minimum-distribution requirements were not simulated. No distribution or claim was attempted.

The GitHub social account held exactly its rent (0.001559560 SOL), with `total_claimed=0` and `last_claimed=0`: **0 SOL already credited above rent** at that snapshot. This does not mean no creator fees accrued; they remained in the shared vault.

Per the [official Forks claim guide](https://forks.wiki/guide), sign in to pump.fun with **dnfl1999 GitHub** to claim the GitHub portion. The launcher portion is sent to the configured Solana wallet when fees are distributed. Exact authenticated claim UI and eligibility were not inspected because Pump access was blocked and login/signing is outside this task. Review the official site, recipient, available amount and network fee personally before approving any claim. Do not use a single-creator claim path for this shared-fee coin.

## Season 0 rewards

The public [Season API](https://forks.wiki/api/season) showed Season 0 open, pool 200,000,000, coin cap 1,000,000, account minimum age 30 days, three launches/day per X account and five linked wallets maximum. A launch with a requested dev buy of at least **0.2 SOL** has a **1,500 $FORK** launch allocation instead of 1,000. Milestone rewards have separate conditions; no milestone reward is assumed here.

**Observed:** the public leaderboard row for `kanepkjinwoo` lists **1 coin, earned 1,500**. This is an actual account-level pending allocation shown by the service, not an on-chain $FORK balance or a guaranteed payout. It is consistent with this launch and the 0.2-SOL request.

**Not verified:** authenticated mint-by-mint `/api/history` or `me.coins` linking that row specifically to this CA. Unauthenticated `me` is null. Therefore account recognition is publicly visible, but the exact CA-level attribution requires the user's signed-in Season history. No sessions, authentication tokens or private account data were collected.

## Validation and publication

Existing analysis behavior is preserved. The added English token section is static and separate from GitHub reports, with accessible CA copying, fallback selection, official evidence links and no wallet/trading code.

Product commit `900edbf74e651b356c7254c9688d7964ae705a89`: [Actions 42977232545](https://github.com/dnfl1999/memediff/actions/runs/42977232545) passed verification, deployment and public QA. Core tests: 20/20 locally and in CI. Playwright: Windows local 28, Linux build 28, Linux public mock 28, Linux public **real GitHub API 1**; **85 passed, 0 failed, 0 skipped**. Downloaded CI artifacts confirm these counts, including actual JSON/PNG download checks. Mobile uses Chromium device emulation. Public HTML, stylesheet and token module returned HTTP 200 and matched local files. Details: [post-launch-qa.json](docs/post-launch-qa.json) and [PROGRESS.md](PROGRESS.md).

## Remaining limitations

- Pump and Solscan rendering/API verification blocked by HTTP 403; RPC verification succeeded.
- Primary IPFS gateways returned 429; the identical content CIDs were available through Pinata.
- Immutable launch metadata does not contain the direct Pages site or X handle. No on-chain edit was attempted.
- Public Season leaderboard confirms the account aggregate, not authenticated mint-specific history.
- Pending fee estimates are timestamped and not a wallet-ready claim quote.
- Names/tickers alone are not identifiers; every link and check uses the full CA.
