# CA-first discovery and source boundaries

## Reproduced original limitation

The previous homepage required `#repo` and `parseRepo` before any report. Its CA search required a separate result selection and another Analyze click. Its schema-1 index covered recent official listings plus MemeDiff, not a full registry. The new main form uses a required-format Solana CA only; Advanced Search retains the original repository path and schema-1 development reports.

## One-click data flow

1. Validate the CA as a Base58-encoded 32-byte public key before network requests.
2. In parallel, request `https://api.dexscreener.com/tokens/v1/solana/{CA}` and load the local schema-2 association index.
3. Market responses must match `chainId=solana` and `baseToken.address=CA`. Quote-only matches are not priced as the queried token. Select a single highest-liquidity pool, then volume/address tie-breaks. Do not sum pools. Display source, observed time and nullable fields separately.
4. Accept only one fresh index association derived from `/api/coin?mint={CA}` with `ok=true`, exact `coin.mint`, `coin.kind=forks` and a valid explicit `coin.repo`. Reject entries older than 48 hours or future timestamps. No name, ticker, description, market social link or fuzzy search establishes a mapping.
5. Call the GitHub evidence collector automatically. The repository is fetched first, then 7/30-day commits/releases/contributors. Association time and market time are shown separately from the schema 1 development report.
6. Without a usable association, preserve token results and show **No verified GitHub repository found.** No fabricated zero-development report or export is created. GitHub failures preserve the token panel and verified mapping with an explicit development error.

## Official API research — 2026-11-11

The official coin response for MEMEDIFF returned exact mint, `kind=forks` and `repo=dnfl1999/memediff`. An isolated Chromium document on `https://dnfl1999.github.io`, without the app CSP, could not read the Forks response; the endpoint returned no `Access-Control-Allow-Origin`. The same browser origin successfully read DexScreener. This distinguishes the observed Forks CORS restriction from our own CSP. [Recorded probe](ca-api-research.json).

Official recent listing calls with no query, `?page=2`, and `?limit=100&offset=20` returned identical 20 mint addresses and no cursor/total metadata. Full enumeration or pagination support is **unconfirmed**, not assumed. We did not scrape other projects or infer endpoints from token names.

## Refresh and coverage

On each deployment and the Pages workflow schedule (`23 */6 * * *` UTC), `scripts/update-forks-index.mjs` gathers the recent official listings and prior deployed and checked-in CA history. It checks up to 200 exact CAs with up to three concurrent requests, an eight-second request timeout and a two-minute overall deadline. A transient error can trigger one retry per request. A 403 or 429 stops the Forks refresh, and a response with `Retry-After` is not retried. CI logs record UTC, endpoint, error category, known network codes and HTTP status. Records retained after individual lookup failures keep their original verification times. The index reports fresh and retained coverage separately.

The workflow runs unit tests and mocked browser checks before preparing the production index. It validates the refresh and replaces the artifact index atomically. A failed scheduled refresh leaves the existing site published. A code push or manual deployment can instead reuse the validated published index with its original timestamps. If neither source supplies a valid index, Pages keeps the existing deployment. Actions reports index refresh, deployment and public QA separately. The client rejects associations older than 48 hours while market lookup remains available. Local builds use the checked-in index unless the refresh script is run.

## Read-only live service design

The [optional Worker](../serverless/README.md) supports only a validated CA and a fixed official read endpoint with HTTPS, restrictive CORS, rate limiting, five-minute caching, timeout and no redirects. It is implemented and unit-tested with mock bindings, **not deployed**. Arbitrary live Forks lookup still requires an approved external service account/connection and deployment. No token, wallet, transaction or trading endpoint is permitted. The current frontend does not depend on it.

## Privacy and errors

DexScreener sees the entered CA and visitor IP. GitHub sees a repository path and visitor IP, never the optional token address. The browser reads the Forks index from Pages; external evidence links disclose their paths when followed. There is no search-history storage, wallet connection or telemetry.

403/access denied, 429/rate limit, timeout, canceled requests, invalid JSON and absent data are distinct. Browser network and CORS exceptions cannot reliably be separated and are labeled together. Every missing numeric field stays null/Unknown; a failed source is Unavailable. A genuine source-provided zero stays zero. Source links do not guarantee endorsement or safety.

Official references: [DexScreener API](https://docs.dexscreener.com/api/reference), [GitHub search](https://docs.github.com/en/rest/search/search#search-repositories), [Forks coin source](https://forks.wiki/src/coin.js), [Forks recent listings](https://forks.wiki/api/tokens/recent).
