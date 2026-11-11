# ± MemeDiff

**Less Hype. More Evidence.**

Track real GitHub activity behind crypto projects. MemeDiff is a free, open-source web tool for inspecting public repository activity, comparing observed SHA values, and sharing evidence with a Development Receipt.

[Open MemeDiff](https://dnfl1999.github.io/memediff/) · [GitHub](https://github.com/dnfl1999/memediff) · [Quick start](docs/GETTING_STARTED.md) · [FAQ](docs/FAQ.md) · [Real historical example](docs/examples/README.md)

## How to use

1. Enter a public GitHub repository URL or `owner/repo` and select **Analyze**. A Solana mint address is optional; only its format is checked, not its existence or repository association.
2. Select **7 days** or **30 days** to view commits, public releases and observed contributors. Read collection warnings and follow original evidence links.
3. Select **Save baseline** to save this observation in your browser. Analyze the same repository, branch and optional token combination later to compare SHA observations. Use **Clear this project baseline** to remove it.
4. Select **PNG Receipt** for a shareable summary with the observation time, exact UTC window, collection status and source evidence. Export **JSON** alongside it for all collected data, evidence URLs, warnings and comparison results. URLs printed in PNG are not clickable.

The interface and generated guidance are English. Dates use UTC and numbers use English (US) formatting; original repository descriptions, commit messages and release names retain their source language. Existing local baselines remain compatible. JSON retains schema version 1, ISO timestamps and numeric values; human-readable messages are now English.

No wallet, token ownership, login or API key is required. Receipts are locally generated and editable, not signed certificates. There is no JSON import, hosted report upload or automatic social posting.

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

GitHub receives repository paths and the visitor IP; optional Solana addresses are not sent to GitHub. The app has no analysis backend, trackers, external fonts, API-key input or wallet connection. The Pages host may keep normal access logs. Reports retain public GitHub logins, not original author names or email addresses. Baselines are saved only after an explicit click; exports include the entered token address.

User and repository text is rendered as text, not HTML. Source links are restricted to allowed HTTPS hosts and CSP restricts scripts and network connections. Local storage and exports are editable observations, not trusted attestations.

## Feedback and contributions

[Report a bug or suggest an improvement](https://github.com/dnfl1999/memediff/issues/new/choose). English and Korean feedback are welcome. Please include reproduction steps and remove secrets or unnecessary personal data. See [contribution guidance](CONTRIBUTING.md) and the [roadmap](ROADMAP.md).

## Independence and license

MemeDiff was independently implemented in its own workspace. It does not reuse other project source or work queues. Runtime dependencies: none. Development dependencies are pinned: Playwright (Apache-2.0) and pngjs (MIT); neither is shipped to the website. Licensed under [MIT](LICENSE).

[Related-tool research](docs/RESEARCH.md) · [Dated operations comparison](docs/OPERATIONS_UPDATE.md) · [Archived Korean README](README.ko.md)
