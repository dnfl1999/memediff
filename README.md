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

Forks currently blocks cross-origin browser reads. GitHub Actions refreshes a limited index from recent listings and previously observed CA history, checking `coin.mint`, `coin.kind=forks` and the explicit `coin.repo`. Full-list pagination remains unconfirmed. See [data flow, evidence and limitations](docs/DISCOVERY.md).

The public app uses no wallet, paid API or login. An optional restrictive [read-only Worker design](serverless/README.md) is supplied for future arbitrary live Forks lookups, but is **not deployed or called by this site**. External account connection and deployment require owner approval.

The interface is English, dates use UTC, and numbers use English (US) formatting. GitHub source text retains its language. Existing storage keys and JSON **schema 1** are unchanged; market and association observations stay in their own panel and are not silently mixed into legacy development exports. PNG links are printed text, not clickable. Receipts remain editable observations, not signed certificates. v1.1 supports local JSON snapshot import; no automatic social posting exists.

## v1.9 — QA evidence in Pages diagnostics

Each Pages attempt records the test counts from Node and Playwright for unit, pre-deployment desktop/mobile, public desktop/mobile and public real-API QA. Statuses distinguish tests that passed, failed or were skipped, checks that did not run and unavailable reports. Browser HTTP evidence separates successful responses, expected API errors, unexpected errors and confirmed HTTP 422 → 200 recovery within a request sequence. Index Health Monitor shows these counts in its Actions summary. GitHub Actions handles ordinary QA failure notifications. [Operations guide](docs/INDEX_MONITOR.md#pages-operation-diagnostics)

## v1.8 — Pages operation diagnostics

Each Pages run on `main` saves a small attempt-specific diagnostic artifact when GitHub finishes the recording job. It records Forks refresh, verification, deployment and public QA independently. The Monitor checks the run and attempt before using the artifact. Its fallback is the recorded job log, with unavailable evidence shown explicitly. [Diagnostic schema and operations](docs/INDEX_MONITOR.md#pages-operation-diagnostics)

## v1.7 — Index Health Monitor

An independent GitHub Actions monitor checks scheduled Forks refresh failures and the published verification clock every hour. It uses one operations issue for consecutive failures, the final six hours, expiry and confirmed recovery. Manual runs are read-only by default. See the operating guide for evidence rules and notification settings. [Index Health Monitor](docs/INDEX_MONITOR.md)

## v1.6 — Index health

After a CA lookup, **Index health** shows the last verification in UTC, its age, the 48-hour validity period, remaining time and the published source. **Fresh** associations can start automatic GitHub analysis. **Expiring soon** covers the final six hours of validity and routes users to Advanced Search for direct repository analysis. **Expired** applies after 48 hours. **Not indexed**, **Unavailable**, and **Invalid / Ambiguous** cover absent, unreadable, malformed and duplicate records. Timing is based on the browser clock. Market lookup is independent of the index, and a direct GitHub report does not establish a CA association.

A dated refresh warning appears when the published snapshot includes an Actions record for a failed refresh and reuse of that snapshot. The warning links to the run. CI tracks fresh verifications, retained records and upcoming expiry. It validates the existing public index before preparing a replacement. JSON schema 1 and browser baseline storage retain their existing formats. [Operations and coverage](docs/DISCOVERY.md#refresh-and-coverage)

## v1.5 — SHA Explorer

Save a browser baseline or compare an imported schema 1 report to open **SHA Explorer** beneath the UTC timeline. Choose **All observations in overlap**, **Newly observed in overlap**, or **No longer observed in overlap**. Rows include full SHA links, commit messages, linked authors when available, and the timestamps recorded by the previous and current observations. When one SHA has conflicting dates, its records are displayed with their source labels. A record shown for reference outside the shared interval is labeled as such.

The explorer classifies SHA values across the full 30-day snapshots, then shows rows with a commit timestamp in the shared interval. Matching at a single boundary instant is possible. Separated windows show **N/A**. Partial collection and imported JSON warnings remain visible for every filter. The 7/30-day switch controls the activity report and receipts. Paging and filtering use local data, and the PNG and schema 1 JSON still export the full comparison.

## v1.4 — Native Share

Select **Share** beside **Copy Analysis Link** to open your device's sharing menu when Web Share is supported. The payload contains only the URL produced by the existing `analysisLink()`: the unchanged GitHub Pages address and one exact Solana CA. No title, extra text, files, report, imported JSON or browser baseline is sent.

If sharing is unsupported (including a negative `canShare()` result), the same click falls back to the existing copy/manual-selection flow. Canceling never triggers a copy. A native error leaves an explicit Copy Analysis Link/manual-copy choice; it does not retry or post automatically. Both buttons are disabled while an operation is pending, and results from an earlier input cannot overwrite the message for an edited CA. Current analysis, schema 1 and local storage are unchanged.

A resolved Web Share request does **not** prove delivery to a recipient: platform behavior differs. See [Web Share behavior](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share). Browser support and available targets depend on the device. Desktop/mobile Chromium tests simulate native success, cancellation and failure; a real Android/iOS share sheet has **not been exercised in this environment**. Clipboard and manual copying remain available. This release retains the existing website, canonical, sitemap and external registration requests.

## v1.3 — Share a token analysis link

Enter a Solana CA in the token analyzer and select **Copy Analysis Link**. The link always uses the official site and one parameter: `https://dnfl1999.github.io/memediff/?ca=YOUR_CA`. It shares the **CA currently in the input**, not a saved analysis. If clipboard access is unavailable, the full link is selected in a read-only field: use Ctrl/Cmd+C or long-press and Copy on mobile.

[Open the MEMEDIFF shared-link example](https://dnfl1999.github.io/memediff/?ca=DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork). The recipient reviews the prefilled address and selects **Analyze Token** to request current source data. Opening the link alone does not query GitHub, DexScreener or the association index, and does not load a report or browser baseline. Other valid Solana addresses work too; their identity is explicitly distinguished from the official MEMEDIFF CA. Valid address syntax does not establish mint existence, recommendation, safety or a repository relationship.

The link contains no repository override, personal contact, baseline, imported JSON, report, API key or fragment. Duplicate, empty, malformed, whitespace-padded and invalid CA values in shared URLs are rejected while the ordinary analyzer stays usable. Unknown parameters are not acted on or copied. No URL-based redirect or automatic analysis occurs. Existing exact-CA Forks association checks, API errors and indexing limitations are unchanged.

GitHub Pages serves **one static MemeDiff social preview** for these URLs. A link preview is not a token-specific image, current price or analysis result. The query CA is visible to recipients and the website host as part of the URL; choosing Analyze Token then makes the existing public API requests described below. No new API or sharing service was added.

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
- Unauthenticated GitHub access typically permits 60 requests per hour per IP. An analysis can use up to 16 requests, plus one retry for a confirmed GitHub commit processing timeout. Errors, limits and empty repositories are distinguished. Queries support cancellation and a 45-second timeout.
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

GitHub Pages uses GitHub Actions. The workflow runs unit tests and Linux Chromium desktop/mobile tests before preparing the Forks index and deploying `dist/` from main. A failed scheduled refresh preserves the published site. Code and manual deploys can reuse the validated published index with its prior timestamps. The workflow then runs mocked and live API tests against the public URL. Live QA tests automatic analysis when the observed CA is Fresh, checks the blocked path when the record is no longer Fresh, and exercises the 48-hour expiry guard with the browser clock controlled and the actual published index. Reports, downloads and screenshots are retained as Actions artifacts for 14 days. [Pages workflow](.github/workflows/pages.yml) · [Index operation](docs/DISCOVERY.md)

The repository administration helper checks the authenticated account is `dnfl1999`. Its default `inspect` action is read-only. It uses existing Git credentials in memory and does not create login sessions or tokens.

## Privacy and security

GitHub receives repository paths and the visitor IP; Solana addresses are not sent to GitHub. CA queries are sent directly to DexScreener, which also sees the visitor IP. Forks association lookups read this site’s static index; following an evidence link visits the external source. The app has no analysis backend, trackers, external fonts, API-key input or wallet connection. The Pages host may keep normal access logs. Reports retain public GitHub logins, not original author names or email addresses. Baselines are saved only after an explicit click; exports include the entered token address.

User and repository text is rendered as text, not HTML. Source links are restricted to allowed HTTPS hosts and CSP restricts scripts and network connections. Local storage and exports are editable observations, not trusted attestations.

## Feedback and contributions

[Report a bug or suggest an improvement](https://github.com/dnfl1999/memediff/issues/new/choose). English and Korean feedback are welcome. Please include reproduction steps and remove secrets or unnecessary personal data. See [contribution guidance](CONTRIBUTING.md) and the [roadmap](ROADMAP.md).

## Independence and license

MemeDiff was independently implemented in its own workspace. It does not reuse other project source or work queues. Runtime dependencies: none. Development dependencies are pinned: Playwright (Apache-2.0) and pngjs (MIT); neither is shipped to the website. Licensed under [MIT](LICENSE).

[Related-tool research](docs/RESEARCH.md) · [Dated operations comparison](docs/OPERATIONS_UPDATE.md) · [Archived Korean README](README.ko.md)
