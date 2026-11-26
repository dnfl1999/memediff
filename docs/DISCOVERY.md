# CA-first discovery and source boundaries

## Reproduced original limitation

The original workflow required a public repository URL or `owner/repo`. The Solana Token Analyzer adds a separate exact-CA workflow using a dated index of recent official listings and retained observations. Since v2.6, direct GitHub analysis is on the first screen and **Advanced GitHub tools** contains name search and the optional address field. Development reports use schema 1.

## One-click data flow

1. Validate the CA as a Base58-encoded 32-byte public key before network requests.
2. In parallel, request `https://api.dexscreener.com/tokens/v1/solana/{CA}` and load the local schema-2 association index.
3. Market responses must match `chainId=solana` and `baseToken.address=CA`. Quote-only matches are not priced as the queried token. Select a single highest-liquidity pool, then volume/address tie-breaks. Do not sum pools. Display source, observed time and nullable fields separately.
4. Read the verification state for an exact CA from the published index. A unique record requires a valid explicit `coin.repo` and evidence derived from `/api/coin?mint={CA}` with the exact `coin.mint` and `coin.kind=forks`. The final six hours of a 48-hour verification are **Expiring soon**. Time beyond that window is **Expired**. Future and malformed timestamps are invalid, and duplicates are ambiguous. None of those states can start automatic analysis.
5. Call the GitHub evidence collector automatically. The repository is fetched first, then 7/30-day commits/releases/contributors. Association time and market time are shown separately from the schema 1 development report.
6. Show the association state, source, UTC time and age in **Index health**. Market lookup operates independently, and **Open GitHub analysis** focuses the homepage repository form. GitHub failures preserve the token panel and verification history with an explicit development error.

## Official API research — 2026-11-11

The official coin response for MEMEDIFF returned exact mint, `kind=forks` and `repo=dnfl1999/memediff`. An isolated Chromium document on `https://dnfl1999.github.io`, without the app CSP, could not read the Forks response; the endpoint returned no `Access-Control-Allow-Origin`. The same browser origin successfully read DexScreener. This distinguishes the observed Forks CORS restriction from our own CSP. [Recorded probe](ca-api-research.json).

Official recent listing calls with no query, `?page=2`, and `?limit=100&offset=20` returned identical 20 mint addresses and no cursor/total metadata. Full enumeration or pagination support is **unconfirmed**, not assumed. We did not scrape other projects or infer endpoints from token names.

## Refresh and coverage

On each deployment and the Pages workflow schedule (`23 */6 * * *` UTC), `scripts/update-forks-index.mjs` gathers the recent official listings and prior deployed and checked-in CA history. It checks up to 200 exact CAs with up to three concurrent requests, an eight-second request timeout and a two-minute overall deadline. A transient error can trigger one retry per request. A 403 or 429 stops the Forks refresh, and a response with `Retry-After` is not retried. CI logs record UTC, endpoint, error category, known network codes and HTTP status. Records retained after individual lookup failures keep their original verification times. The index reports fresh and retained coverage separately.

The workflow runs unit tests and mocked browser checks before preparing the production index. It first validates the published index. An unavailable or invalid published snapshot blocks replacement, including from checked-in history. Known published candidates take priority when the request cap is reached. An incomplete coin response can retain a published record at its original time. Verified data is then written atomically.

A failed scheduled refresh leaves the existing site published. A code push or manual deployment can reuse the published records and their original timestamps. Its index includes a dated Actions record when reuse follows a confirmed failure. The website labels the published attempt and links the run, while newer failed schedules remain visible in Actions. The Actions summary reports newly verified and retained counts, last successful verification, upcoming expiry and the official MEMEDIFF expiry. It warns about records in the last six hours or expired. Local builds use the checked-in index for preview unless a validated published index is installed.

## Read-only live service design

The [optional Worker](../serverless/README.md) supports only a validated CA and a fixed official read endpoint with HTTPS, restrictive CORS, rate limiting, five-minute caching, timeout and no redirects. It is implemented and unit-tested with mock bindings, **not deployed**. Arbitrary live Forks lookup still requires an approved external service account/connection and deployment. No token, wallet, transaction or trading endpoint is permitted. The current frontend does not depend on it.

## Privacy and errors

DexScreener sees the entered CA and visitor IP. GitHub sees a repository path and visitor IP, never the optional token address. The browser reads the Forks index from Pages; external evidence links disclose their paths when followed. There is no search-history storage, wallet connection or telemetry.

403/access denied, 429/rate limit, timeout, canceled requests, invalid JSON and absent data are distinct. Browser network and CORS exceptions cannot reliably be separated and are labeled together. Every missing numeric field stays null/Unknown; a failed source is Unavailable. A genuine source-provided zero stays zero. Source links do not guarantee endorsement or safety.

Official references: [DexScreener API](https://docs.dexscreener.com/api/reference), [GitHub search](https://docs.github.com/en/rest/search/search#search-repositories), [Forks coin source](https://forks.wiki/src/coin.js), [Forks recent listings](https://forks.wiki/api/tokens/recent).
