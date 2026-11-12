# MemeDiff development roadmap

The software remains a free static, open-source GitHub activity research tool. Token price, volume, holder count and rewards do not measure development progress.

2026-11-11 maintenance update: improved the existing PNG export as an English Development Receipt and added English quick-start help. No duplicate export service was built. Next priority is real-user feedback and stable operation, not adding token-related features. See the [product comparison and operations snapshot](docs/OPERATIONS_UPDATE.md).

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

- Gather feedback on the observation timeline and consider a separate, clearly scoped shared-interval SHA view without presenting it as a work or safety score.
- Gather feedback on v1.1 local JSON import, identity mismatch messages, and comparison provenance.
- Add focused accessibility and internationalization improvements without changing report meaning or inventing quality scores.

## Release discipline

Use small reviewable commits; run `npm test`, `npm run build`, and Playwright desktop/mobile tests. Push only to `dnfl1999/memediff`, check Actions and the deployed site, and document real-API rate-limit skips honestly. Update PROGRESS.md with evidence and unresolved issues. No dates or features here are contractual promises.

## Token operations are separate

Follow [TOKEN_OPERATIONS.md](docs/TOKEN_OPERATIONS.md) for read-only market and chain observations. Claims, wallet links, signatures, transfers and trades require separate user decisions. No automatic trading, treasury movement, artificial engagement, or token-price targets are part of the development roadmap.
