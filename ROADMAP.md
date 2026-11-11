# MemeDiff development roadmap

The software remains a free static, open-source GitHub activity research tool. Token price, volume, holder count and rewards do not measure development progress.

## Next maintenance cycle

- Keep core tests and desktop/mobile Playwright checks passing before each deployment.
- Triage GitHub API rate-limit, pagination and accessibility bugs using reproducible issue reports.
- Review dependency updates individually; preserve the zero-runtime-dependency static site.
- Keep the official CA, source links and dated audit limitations consistent across project documents.

## Next useful improvements

- Improve explanations of incomplete GitHub observations and moving-window comparisons, driven by reported confusion.
- Evaluate an optional local JSON snapshot import with strict schema validation and privacy review. Implement only if users need cross-device comparisons.
- Add focused accessibility and internationalization improvements without changing report meaning or inventing quality scores.

## Release discipline

Use small reviewable commits; run `npm test`, `npm run build`, and Playwright desktop/mobile tests. Push only to `dnfl1999/memediff`, check Actions and the deployed site, and document real-API rate-limit skips honestly. Update PROGRESS.md with evidence and unresolved issues. No dates or features here are contractual promises.

## Token operations are separate

Follow [TOKEN_OPERATIONS.md](docs/TOKEN_OPERATIONS.md) for read-only market and chain observations. Claims, wallet links, signatures, transfers and trades require separate user decisions. No automatic trading, treasury movement, artificial engagement, or token-price targets are part of the development roadmap.
