# Finding a repository

- **Try Live Demo** submits `dnfl1999/memediff` to the existing real GitHub analyzer, clearing the optional token input. It does not load mock statistics or save a baseline automatically.
- **Search GitHub** submits a project name to `GET https://api.github.com/search/repositories` with `in:name is:public`, requesting at most 10 results. Choose an explicit owner/repository, review the inputs, then Analyze. Names and descriptions are not verified token relationships. Selection clears any previous optional token to avoid attaching an unrelated CA.
- **Find linked repository** checks the exact Base58 CA in a dated index from official Forks API responses. Choosing a match fills the repository and CA; it does not analyze or save automatically. The recorded association is not repository-author endorsement, on-chain ownership verification or a safety score.

## Sources and static-hosting limitation

On November 11, 2026, the official [coin page](https://forks.wiki/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork) loaded `/src/coin.js`, which calls `GET /api/coin?mint=...`. That API returned the exact MemeDiff mint and `coin.repo=dnfl1999/memediff`, `coin.kind=forks`. Official `/src/launch.js` uses `/api/tokens/recent` and `/api/tokens?repos=...` for repository coin listings.

These endpoints returned HTTP 200 but no `Access-Control-Allow-Origin` header for `Origin: https://dnfl1999.github.io`. The site does not evade browser CORS, use a third-party proxy, collect credentials or create a backend. The build instead reads:

- https://forks.wiki/api/tokens/recent
- https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff

`node scripts/update-forks-index.mjs` records `checkedAt`, source URLs and minimal exact mint/repository pairs in `data/forks-index.json`. It discards invalid entries and ambiguous CA mappings. This is a limited historical index, not an exhaustive registry or a live verification. A token missing from the index may still have an association on Forks. Symbols, names, descriptions, market metadata and guessed URLs are never used for matching. There is no claim of ongoing monitoring.

Actions refreshes the index before each build; API failure fails that deployment rather than silently presenting a fresh timestamp on old data. The previously deployed website remains available. Run the existing manual Pages workflow to refresh without a product code change. Local builds use the checked-in dated index unless the refresh command is run first.

## Requests, privacy and errors

Repository-name queries go directly to GitHub, which sees the query and visitor IP. The optional CA lookup reads a same-origin static index and does not transmit the entered CA to Forks; following a Forks link does. There is no analytics or search-history storage. Selecting an item does not overwrite saved baselines.

GitHub [search documentation](https://docs.github.com/en/rest/search/search#search-repositories) describes a separate unauthenticated search limit (typically 10 requests/minute). Search is submission-only, has a 15-second timeout, labels incomplete results, and handles 403/429 with retry/reset guidance without automatic retries. Invalid inputs, empty results, unreadable responses and absent CA matches have distinct English messages. Analysis retains its existing cancellation, 45-second timeout and API-limit handling.

## Verification

Unit tests cover query constraints, request options, error handling, exact mint identity, missing relationships and ambiguity. Browser tests cover demo submission and PNG/JSON export, keyboard result selection, XSS-safe descriptions, empty/rate-limited search, CA selection and unavailable data on desktop/mobile. The separate live project checks the demo with real GitHub data and name search with the deployed official index; API limits are reported as skipped, never a simulated success.
