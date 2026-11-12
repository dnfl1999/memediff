# ± MemeDiff

**Less Hype. More Evidence.**

Track real GitHub activity behind crypto projects. MemeDiff is a free, open-source web tool for inspecting public repository activity, comparing observed SHA values, and sharing evidence with a Development Receipt.

The interface uses the official MemeDiff hooded mascot with a near-black, neon lime, cyan and coral palette. The same logo anchors the header, hero and official-token card; a dedicated social preview and favicon keep shared links consistent. See [brand assets and provenance](assets/README.md). The redesign changes presentation, not evidence collection, report schemas or saved baselines.

[Open MemeDiff](https://dnfl1999.github.io/memediff/) · [GitHub](https://github.com/dnfl1999/memediff) · [Quick start](docs/GETTING_STARTED.md) · [FAQ](docs/FAQ.md) · [Real historical example](docs/examples/README.md)

See the [website-link audit and platform update guide](docs/WEBSITE_LINKS.md) for immutable metadata findings, official registration paths, and fees. The GitHub repository homepage now points to this official site.

## How to use

1. Paste a **Solana Token CA** and select **Analyze Token**. You do not need a GitHub URL. **Try Live Demo** runs this flow for the official MEMEDIFF CA.
2. Read the separate token-information panel: name/ticker, exact CA, USD price, FDV, market cap, one pool's liquidity and 24-hour volume, source links and observation time. Missing data is **Unknown**; failed sources are **Unavailable**, never fabricated zeros.
3. A fresh, exact CA association verified from the official Forks `/api/coin` response automatically starts GitHub analysis. No repository selection or second Analyze click is required. Read the association's separate verification time and source.
4. Select **7 days** or **30 days**, inspect original commit/release evidence, then export **PNG Receipt** and **JSON**. **Save baseline** and **Clear this project baseline** retain their existing behavior. Exports are development observations, available only after GitHub analysis succeeds.
5. If no fresh verified mapping is available, token information remains visible with **No verified GitHub repository found.** This is a coverage limitation, not a token safety assessment or proof that no repository exists.

**Advanced Search — GitHub repository** keeps direct GitHub URL / `owner/repo` analysis, the optional recorded token address, and repository-name search. A manually entered address does not verify a token relationship.

Forks currently blocks cross-origin browser reads. A limited index is refreshed on deployment and scheduled every six hours by GitHub Actions. Recent listings and previously observed CA history are individually rechecked against `coin.mint`, `coin.kind=forks` and explicit `coin.repo`; associations older than 48 hours are not auto-used. Neither full-list pagination nor exhaustive coverage is confirmed. No name/ticker matching is used. See [data flow, evidence and limitations](docs/DISCOVERY.md).

The public app uses no wallet, paid API or login. An optional restrictive [read-only Worker design](serverless/README.md) is supplied for future arbitrary live Forks lookups, but is **not deployed or called by this site**. External account connection and deployment require owner approval.

The interface is English, dates use UTC, and numbers use English (US) formatting. GitHub source text retains its language. Existing storage keys and JSON **schema 1** are unchanged; market and association observations stay in their own panel and are not silently mixed into legacy development exports. PNG links are printed text, not clickable. Receipts remain editable observations, not signed certificates. v1.1 supports local JSON snapshot import; no automatic social posting exists.

## v1.1 — Import a previous report

After loading a current live report, select **Import Previous Report** and choose an existing MemeDiff schema 1 JSON export (maximum **2 MiB**). Review the repository, exact token CA (including an empty CA), branch and both observation times, then select **Compare without saving**. File bytes are read only in your browser; importing makes no network requests and never fetches URLs embedded in the file.

The current live report and existing stored baseline remain unchanged. **Save imported baseline** explicitly replaces only the baseline for that repository, branch and CA. **Use saved browser baseline** returns to the stored baseline without changing it. Canceling the preview or selecting an invalid file preserves the current comparison. Starting a new live analysis clears the pending import. Existing Save baseline and Clear baseline retain their behavior.

Validation checks schema/source, identity, UTC dates and the exact 30-day collection range, SHA format/uniqueness, bounded arrays, coverage flags, evidence URLs and recomputed 7/30-day metrics. A previous observation newer than the current report is rejected. An empty CA is not treated as matching a token-specific report. Corrupt or unsupported files are refused; no contents are executed as HTML. The file's exported comparison is discarded and recalculated with the existing SHA comparison engine.

Comparison always uses **30-day snapshots**, even when the displayed report/PNG is set to 7 days. Aged-out commits are excluded from missing observations. Non-overlapping windows and incomplete collection are labeled. Imported baselines are editable, unauthenticated observations; UI, exported comparison and PNG label their origin. Saving an imported baseline keeps that label on subsequent visits. No signature, safety assessment or verification of the file's truth is implied. JSON schema 1 and existing storage keys remain unchanged; baseline-origin labels are additive metadata.

## v1.2 — Observation period timeline

After applying an imported report or loading a saved baseline, the comparison shows **previous and current 30-day periods on one UTC time scale**. Exact ISO timestamps include milliseconds. The hatched region identifies their shared interval; a vertical line marks an exact boundary with zero shared duration. Separated periods explicitly show **No overlap** and **N/A** for missing SHA comparison. Text labels carry the same information without relying on color.

The 7/30-day selector still controls current metrics and receipt statistics, not the 30-day comparison. Newly observed SHA values are not necessarily newly performed work. Missing SHA values are limited to the shared interval (inclusive endpoints) and do not prove deleted code. The count difference compares each full rolling window, not just their overlap; with no shared duration it is not a directly comparable development trend. Collection limits and imported-file uncertainty remain visible.

PNG receipts with a comparison include both periods and their shared interval (1400×1260); receipts without a comparison retain 1400×1020. Source links and all uncertainty labels remain. JSON stays **schema 1**, with additive `comparison.windows` metadata: previous/current start/end, overlap start/end/durationMs or null, relation (overlap/touching/disjoint), and gapMs. Imports discard exported comparisons and recalculate them locally; v1.1 files and existing browser baseline keys remain compatible. Invalid dates/ranges and baselines newer than the current query are not compared. See [historical examples](docs/examples/README.md).

## What the comparison means

MemeDiff compares SHA sets across observations instead of assigning a development or investment score. It shows newly observed SHA values, values no longer observed in the overlapping window, the change in 30-day commit counts, and incomplete collection. Baseline comparisons always use the 30-day dataset, even on a 7-day receipt. Commits that naturally fall outside the rolling window are excluded from missing observations.

New SHA values do not prove new work. Missing observations do not prove deletion or manipulation. Activity does not establish quality, originality, token safety or returns.

## Methodology and limitations

- The product uses real public GitHub REST API responses. Synthetic fixtures exist only in automated tests. Dated examples are clearly identified as historical observations.
- Rolling 7×24-hour and 30×24-hour windows end at query time and use default-branch `committer.date`. Git timestamps can be modified and do not prove when work happened.
- Collection uses 100 items per page, up to 10 commit pages and 5 release pages. Further pages or errors produce an incomplete observation marked **+**, not an exact total.
- Contributors are distinct linked `author.login` accounts in observed commits, including bots and excluding unlinked authors. Co-author metadata is not analyzed. This is not the complete project contributor count.
- Public releases use `published_at`, include prereleases and exclude drafts. API ordering and collection caps may limit coverage.
- Fork status comes from GitHub metadata; it does not establish originality, work performed or token ownership.
- Unauthenticated GitHub access typically permits 60 requests per hour per IP. An analysis can use 3–16 requests. Errors, limits and empty repositories are distinguished; queries support cancellation and a 45-second timeout.
- Separate API calls are not an atomic snapshot. Repositories, releases and account attribution may change during or after observation.

## Official project token — Solana Mainnet

**MemeDiff / MEMEDIFF**

CA: `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork`

MemeDiff is a free, open-source tool that makes public GitHub development activity easier to inspect. It compares 7-day and 30-day activity, preserves local evidence baselines, links to original sources, and exports PNG and JSON reports. Its purpose is to make development claims easier to check, without inventing trust scores.

MEMEDIFF is the project-associated meme token launched through Forks Wiki for this repository. Token ownership is not required to use the software. Development activity and token market activity are separate; neither guarantees safety, price, returns, liquidity, or rewards.

[Website](https://dnfl1999.github.io/memediff/) · [Forks Wiki](https://forks.wiki/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork) · [pump.fun](https://pump.fun/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork) · [Solscan](https://solscan.io/token/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork)

[Post-launch audit](POST_LAUNCH_AUDIT.md) · [Development roadmap](ROADMAP.md) · [Operations and public APIs](docs/TOKEN_OPERATIONS.md) · [Unpublished community announcement](docs/COMMUNITY_ANNOUNCEMENT.md)

Creator-fee shares: launcher 50%, GitHub owner dnfl1999 30%, Forks 20%. These are fee shares, not token allocations. The on-chain sharing config has its admin revoked. The immutable IPFS metadata contains Forks' generic non-endorsement wording and links its website field to the Forks coin page; this README identifies the project-maintained website separately. See the audit for evidence and limitations.

## Run locally and test

Node.js 22 or later. The website has no runtime package dependencies. Playwright and pngjs are development-only QA tools.

```sh
npm ci
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173. On Windows, use `npm.cmd` if PowerShell execution policy blocks `npm`.

```sh
npx playwright install chromium
npm run build
npm run test:e2e
npm run test:e2e:live
```

The desktop/mobile suite uses explicitly mocked GitHub responses to test behavior, downloads, English wording, accessibility labels and layout. The live project separately queries the real GitHub API. PNG downloads are decoded with CRC validation; JSON structure and values are checked. Browsers are independent Chromium instances without personal login profiles.

To test the public site, set `E2E_BASE_URL=https://dnfl1999.github.io/memediff/`. A real API 403/429 is recorded as skipped, with no automatic retry. A mocked API test passing is not evidence that the live API passed. See [QA background](docs/BROWSER_QA.md) and [work log](PROGRESS.md).

## Deployment

GitHub Pages uses GitHub Actions. [pages.yml](.github/workflows/pages.yml) runs unit tests and Linux Chromium desktop/mobile tests before deploying `dist/` from main. After deployment it separately runs mocked and live API tests against the public URL. Reports, downloads and screenshots are retained as Actions artifacts for 14 days. Pull requests cannot deploy. Relative asset paths also support other static hosts.

The repository administration helper checks the authenticated account is `dnfl1999`. Its default `inspect` action is read-only. It uses existing Git credentials in memory and does not create login sessions or tokens.

## Privacy and security

GitHub receives repository paths and the visitor IP; Solana addresses are not sent to GitHub. CA queries are sent directly to DexScreener, which also sees the visitor IP. Forks association lookups read this site’s static index; following an evidence link visits the external source. The app has no analysis backend, trackers, external fonts, API-key input or wallet connection. The Pages host may keep normal access logs. Reports retain public GitHub logins, not original author names or email addresses. Baselines are saved only after an explicit click; exports include the entered token address.

User and repository text is rendered as text, not HTML. Source links are restricted to allowed HTTPS hosts and CSP restricts scripts and network connections. Local storage and exports are editable observations, not trusted attestations.

## Feedback and contributions

[Report a bug or suggest an improvement](https://github.com/dnfl1999/memediff/issues/new/choose). English and Korean feedback are welcome. Please include reproduction steps and remove secrets or unnecessary personal data. See [contribution guidance](CONTRIBUTING.md) and the [roadmap](ROADMAP.md).

## Independence and license

MemeDiff was independently implemented in its own workspace. It does not reuse other project source or work queues. Runtime dependencies: none. Development dependencies are pinned: Playwright (Apache-2.0) and pngjs (MIT); neither is shipped to the website. Licensed under [MIT](LICENSE).

[Related-tool research](docs/RESEARCH.md) · [Dated operations comparison](docs/OPERATIONS_UPDATE.md) · [Archived Korean README](README.ko.md)
