# Dated operations snapshot and product review

**2026-11-11 07:19:06–07:19:08 UTC / 16:19:06–16:19:08 KST.** Per-request timestamps, URLs, HTTP statuses and raw responses: [operations-snapshot.json](operations-snapshot.json). This is not a live price widget. The [launch audit](../POST_LAUNCH_AUDIT.md) remains a historical record.

## Identity, market and holdings

Official CA: `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork`, Solana Mainnet, MemeDiff / MEMEDIFF.

GitHub: https://github.com/dnfl1999/memediff — website: https://dnfl1999.github.io/memediff/ — X: `@kanepkjinwoo`.

Sources: [Solana Mainnet RPC](https://api.mainnet-beta.solana.com), [DexScreener API](https://api.dexscreener.com/latest/dex/tokens/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork), [Forks repository API](https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff). Forks quotes DexScreener, so agreement is not two independent price measurements.

| Observation | Result at the timestamp above |
| --- | --- |
| Mint | Initialized Token-2022; decimals 6; supply 1,000,000,000 |
| Authorities | Mint, freeze and metadata update authorities null |
| Repository association | Forks returns the exact CA for dnfl1999/memediff |
| Price | **$0.000002330 / 0.00000002832 SOL** per token |
| Reported market cap / FDV | **$2,330.71 / $2,330.71** |
| Reported 24-hour volume | **$344.18**; token younger than 24 hours |
| Reported 24-hour trades | 3 buys / 8 sells; not proof of organic activity |
| USD liquidity | **Unavailable**: no liquidity field in returned pair. Not zero; not inferred from market cap. |
| Positive token accounts / distinct owners | **2 / 2**, including the bonding curve |
| Positive owners excluding known bonding curve | **1 address**, the launcher; not a count of people |
| Launch wallet | **6,983,940.536880 MEMEDIFF** (0.698394053688% of supply) |
| Bonding curve | **993,016,059.463120 MEMEDIFF** |

Pair/curve: `GJhnfPkf1mNw1jaoZBmQKi4jT41vhi6XQgSQxx7C9kh4`. Launch wallet: `EGQmE2VbE1h64zqG5EpUsuNrd6wrWFw2sx9WtyS5n27L`.

`getProgramAccounts` on Token-2022 with exact mint memcmp offset 0 returned five accounts: two positive and three zero. Owners were deduplicated after excluding zero balances. Positive balances reconcile to total supply. This is an RPC snapshot, not a count of beneficial owners or people; no top-20 extrapolation was used.

README and the website identify the same CA and official destinations. Immutable launch metadata still links its website field to the Forks coin page, not Pages, as documented in the launch audit. No metadata edit was attempted.

## Creator fees: pending versus claimable

At **07:19:06.602 UTC**, the shared creator vault held **0.013128918 SOL**, including **0.000650240 SOL** rent, leaving **0.012478678 SOL above rent**. This is a current balance, not verified lifetime revenue.

The on-chain sharing config remains identical to the original locked 50/30/20 configuration. Indicative shares of above-rent funds:

| Recipient | Pending share estimate |
| --- | ---: |
| Launcher 50% | 0.006239339 SOL |
| GitHub dnfl1999 30% | ~0.003743603 SOL |
| Forks 20% | ~0.002495736 SOL |

Estimates precede integer rounding and are **not immediately claimable quotes**. Distribution requirements, unswept amounts, transaction costs and authenticated claim UI were not simulated or accessed. GitHub's social fee account held only its rent, **0 SOL credited above rent**, and recorded total claimed remained zero. No fees were distributed or claimed. See [TOKEN_OPERATIONS.md](TOKEN_OPERATIONS.md) for human-only claim instructions and exact account addresses in the launch audit.

## Season 0

The [official API](https://forks.wiki/api/season) at **07:19:07.669 UTC** shows `kanepkjinwoo`: **1 coin, 1,500 earned**. This is an observed **pending account allocation**, not transferable tokens or proof of payout. Authenticated mint-specific history remains unverified. Season 0 is open, pool 200,000,000, allocation counter 103,000 and `endsAt=null`; the counter is not treated as tokens paid on-chain.

Additional conditions from the API and [official guide](https://forks.wiki/guide):

| Condition | Additional stated allocation |
| --- | ---: |
| $10K market cap | 20,000 $FORK |
| $30K market cap | 40,000 $FORK |
| Migration from pump.fun curve | 100,000 $FORK |
| $250K market cap | 300,000 $FORK |
| $500K market cap | Up to 560,000 $FORK, capped by the per-coin total |

Total cap: 1,000,000 per coin including launch rewards. Milestones need two observations at least 10 minutes apart. X accounts must be at least 30 days old; three launches/day per X account and five linked wallets maximum. All rewards depend on the active season and pool. No extra reward for this coin was confirmed; the queried market cap was below the first milestone. These rules are not a reason to generate trades or manipulate price.

## Actual product evaluation

Reviewed the source and tests: MemeDiff already provides URL validation, 7/30-day commit/release/contributor observations, local SHA comparisons, source links, PNG and JSON. A separate Development Receipt service would duplicate the existing PNG path.

| Official comparison source, reviewed 2026-11-11 | Capabilities | Practical decision |
| --- | --- | --- |
| [GitHub Pulse](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/using-pulse-to-view-a-summary-of-repository-activity) | Native PR, issue and commit overview with time periods | Keep MemeDiff narrow; its default-branch observation is not all Pulse activity. |
| [OSSInsight](https://ossinsight.io/) / [sharing widgets](https://next.ossinsight.io/) | Broader repository/developer analytics and shareable visuals | Sharing itself is not unique. Focus on source scope, time window and local baselines. Widget search listing was accessible; direct fetch timed out, so this is not exhaustive hands-on comparison. |
| Prior MemeDiff PNG | Already had timestamp, period, caveats and repository URL | Improve this existing export; do not add a second implementation or backend. |

The useful gap was global readability and evidence precision. The prior PNG was mostly Korean, had no explicit window endpoints and only a repository source URL. The improved existing export is an English **Development Receipt** with exact UTC endpoints, selected-period metrics, partial-data labels, a recent in-window source link and an explicitly 30-day baseline comparison. Full source URLs and errors remain in JSON. Long source URLs wrap; exceptionally long release URLs use the repository release listing on the image, retaining the full URL in JSON.

English quick-start help and bilingual primary controls were added. Analysis logic, storage, API limits, token identity and static hosting are preserved. No runtime dependency, wallet integration, score, tracking, hosted report or automatic posting was added. PNG URLs are text, not clickable; local receipts are editable, not signed attestations. This is a usability improvement, not evidence of user growth or product-market fit.

## Operations and adoption next steps

- Owner may review and post the [English X draft](COMMUNITY_ANNOUNCEMENT.md); it has not been published.
- Invite real users to analyze their own public repositories and send reproducible issues. No fabricated engagement or trading incentives.
- Prioritize collection-warning clarity, sharing readability and English accessibility using actual feedback.
- Keep code progress separate from token observations, retain CI, and avoid repeated rate-limited requests or paid tools.

Validation and deployment outcomes: [PROGRESS.md](../PROGRESS.md). Snapshot times remain unchanged even when deployment finishes later. No wallet connection, signatures, claim, trade or SOL spending occurred.
