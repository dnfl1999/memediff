# MemeDiff development roadmap

The software remains a free static, open-source GitHub activity research tool. Token price, volume, holder count and rewards do not measure development progress.

2026-11-11 maintenance update: improved the existing PNG export as an English Development Receipt and added English quick-start help. No duplicate export service was built. Next priority is real-user feedback and stable operation, not adding token-related features. See the [product comparison and operations snapshot](docs/OPERATIONS_UPDATE.md).

## v2.4 — Saved Files Comparison Export

- Download the complete applied comparison as version 1 JSON, including shared UTC intervals, gaps, source coverage and all SHA and release evidence.
- Download a branded PNG summary with separate intervals, observation times, and explicit Unknown and N/A counts.
- Consider a read-only viewer for version 1 comparison summaries in v2.5 so recipients can inspect evidence directly from a shared JSON file.

## v2.3 — Compare Two Saved Files

- Read and validate two version 1 period exports independently in the browser. Keep the original selections, exact observation times and evidence links for each source.
- Compare recorded SHA and release ID evidence inside the intersection of the files' retained UTC intervals. Keep separate intervals, collection gaps and conflicting metadata visible.
- Support local filtering and 20-record pages on desktop and mobile. Clear in-memory evidence when a file is removed or the comparison closes.

## v2.2 — Saved Period Comparison

- Open a version 1 period export from the homepage in a read-only preview.
- Recompute observed totals, UTC boundaries, overlap and differences locally, and restrict evidence links to the recorded GitHub sources.

## v2.1 — Period Comparison Export

- Download the applied comparison as a separately versioned JSON with UTC boundaries, coverage and GitHub evidence.
- Download an independent branded comparison PNG and keep the existing report exports available.

## v2.0 — Compare Two Periods

- Compare two UTC date ranges using the current report’s default-branch commits, linked GitHub authors and public releases.
- Show observed counts, UTC boundaries, unequal durations, overlapping evidence and unknown counts from incomplete collection.
- Offer source links for observed SHAs, release IDs and linked GitHub accounts.

## v1.9 — QA evidence in Pages diagnostics

- Attach validated Node and Playwright counts and observed HTTP status totals to the attempt-specific Pages diagnostic.
- Preserve earlier diagnostic artifacts and show available QA evidence in the Monitor summary. Use Actions notifications for QA failures and Issue #1 for Forks index incidents.
- Consider a SHA-backed comparison of commit and release activity across two periods for v2.0, with visible gaps when collection is partial.

## v1.8 — Pages operation diagnostics

- Record an attempt-specific JSON artifact for Forks refresh, verification, deployment and public QA outcomes.
- Validate the archive and its run metadata in Index Health Monitor, with the confirmed job log as a fallback.
- Preserve prior verification timestamps in fallback deployments and require new published validation for recovery. [Operations guide](docs/INDEX_MONITOR.md#pages-operation-diagnostics)

## v1.7 — Index Health Monitor

- Check published verification status and scheduled Pages refresh steps independently.
- Record actionable changes in a single repository issue and close it after a newer official verification is published.
- Rehearse changes with a read-only workflow dispatch. Review operations and account notification settings in the [monitor guide](docs/INDEX_MONITOR.md).

## v1.6 — Index health

- Show exact-CA verification state and age in the token result, with a path to Advanced Search when automatic analysis is unavailable.
- Report fresh verifications, retained records, expiry and diagnosed failures in Actions. Protect the published index during incomplete or unavailable upstream responses.
- Verify the current public state and the 48-hour guard separately. Capture actual API and fallback evidence in [PROGRESS](PROGRESS.md).

## v1.5 — SHA Explorer

The explorer displays overlap observations from the active comparison. Release results are tracked in [PROGRESS](PROGRESS.md).

### Scope and exact meaning

The client-side SHA Explorer sits beneath the observation timeline. It uses the active previous snapshot, current live report and existing 30-day `compareSnapshots()` result. The shared interval includes both UTC endpoints and stays fixed when changing the activity report between 7 and 30 days.

The three filters are **All observations in overlap**, **Newly observed in overlap**, and **No longer observed in overlap**. The explorer uses the full snapshots to classify SHA membership before applying the interval. Common SHA rows can show both source records if at least one falls inside the interval. The existing overall newly-observed count may exceed the filtered count.

Keep source provenance for each row: previous/current observation time, source record's committer timestamp, SHA, bounded message and linked author if available. Retained SHA rows can carry both provenances. If an editable import contains conflicting timestamps for the same SHA, show the recorded provenance without inventing a reconciliation or treating the file as authenticated. Legacy records without sufficient detail should show that detail as unavailable, not fabricate it or change the comparison summary.

No overlap: disable the overlap explorer and show N/A, not a zero-activity claim. Exact boundary contact: label zero shared duration and include only records at that instant. Partial collection and imported/unverified warnings remain visible for every filter. Newly observed is not proof of new work; missing is not proof of deleted code. Separate-window count differences are not an activity rate or quality/safety score.

### UI, state and compatibility

- Retain the active previous snapshot in memory for the explorer; refresh/reset it with live analysis, imported comparison, baseline restore/save/delete and cancellation. Do not create a second persistent baseline or alter existing keys.
- Use explicit English filter buttons with `aria-pressed`, a polite result-count announcement, keyboard navigation and a narrow-screen list. Show 20 rows per page, with a deterministic date/SHA order and source labels. Pagination/filtering makes no API requests and does not write localStorage.
- Build commit links only from the matched canonical repository and a validated 40-character hexadecimal SHA. Use text content for messages/authors and `noopener noreferrer` for new tabs. A source commit may no longer be accessible; do not infer deletion from a failed destination.
- Preserve JSON schema 1 and the existing full comparison/export data. Filters are presentation state only: PNG/JSON retain their full existing scopes and do not silently become filtered exports. Preserve v1.3/v1.4 CA sharing with no report data in URLs or native payloads.
- No domain, hosting, external registration, token, wallet or paid-service work is included.

### Verification and release gate

1. Unit fixtures: complete/partial collection; identical, overlapping, disjoint and touching periods; millisecond boundaries, leap days and invalid timestamps; aged-out records; retained/new/missing SHA; same-SHA conflicting imported dates; malformed SHA and missing legacy details. Assert global comparison arrays/counts remain unchanged by filtering.
2. Compatibility: use both committed real historical schema 1 samples plus a freshly downloaded report. Verify imported provenance, repo/branch/CA rejection, no localStorage mutation and unchanged roundtrip JSON/PNG semantics.
3. Desktop/mobile Chromium: all filters and pagination, original commit destinations, long/injected source text, keyboard and screen-reader semantics, empty/N/A/partial states, 7/30-day switching, new query and baseline/import state transitions, native/copy sharing and zero requests during filtering.
4. Run all current unit/E2E tests, real MEMEDIFF API regression and decoded PNG/JSON downloads. Record API-limited skips separately. Validate public Pages after an independent v1.5 feature commit and successful verify/deploy/public-qa. Physical mobile share-sheet validation remains a separate manual QA item; do not count it as automated coverage.

## v1.4 — implemented

Native Share uses the existing CA-only analysis link, with copy fallback for unsupported browsers, cancellation/error handling, serialized operations and accessible status messages. Automated native API tests are distinct from physical Android/iOS share-sheet validation. Existing hosting and external registrations stay unchanged. See PROGRESS for actual QA and deployment results.

## v1.3 — implemented

CA-only analysis links, strict URL validation, review-before-query prefilling, accessible clipboard/manual-copy handling, explicit token identity and static-preview limitations. Sharing does not read or serialize baselines or imported reports. Existing analysis and exports are preserved; PROGRESS records test and deployment evidence.

## v1.2 — implemented

UTC observation period timeline shared by the responsive UI and PNG, exact overlap/boundary/gap semantics, explicit non-comparable totals, schema 1 comparison metadata, and a second real historical export compatibility fixture. Existing imports, local baselines and privacy behavior are preserved. PROGRESS records the actual validation and deployment results.

## v1.1 — implemented

Local schema 1 JSON import with strict validation, preview, in-memory 30-day comparison, explicit baseline persistence and unverified-origin labels. Existing CA analysis, market information, exports and storage keys are preserved. See README for limits and PROGRESS for actual test/deployment results.

## Next maintenance cycle

- Keep core tests and desktop/mobile Playwright checks passing before each deployment.
- Triage GitHub API rate-limit, pagination and accessibility bugs using reproducible issue reports.
- Review dependency updates individually; preserve the zero-runtime-dependency static site.
- Keep the official CA, source links and dated audit limitations consistent across project documents.

## Next useful improvements

- Gather feedback on the SHA Explorer, especially navigation between pages, the source labels and the interpretation of a zero-duration boundary.
- Gather feedback on v1.1 local JSON import, identity mismatch messages, and comparison provenance.
- Add focused accessibility and internationalization improvements without changing report meaning or inventing quality scores.

## Release discipline

Use small reviewable commits; run `npm test`, `npm run build`, and Playwright desktop/mobile tests. Push only to `dnfl1999/memediff`, check Actions and the deployed site, and document real-API rate-limit skips honestly. Update PROGRESS.md with evidence and unresolved issues. No dates or features here are contractual promises.

## Token operations are separate

Follow [TOKEN_OPERATIONS.md](docs/TOKEN_OPERATIONS.md) for read-only market and chain observations. Claims, wallet links, signatures, transfers and trades require separate user decisions. No automatic trading, treasury movement, artificial engagement, or token-price targets are part of the development roadmap.
