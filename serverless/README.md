# Optional read-only live association API — not deployed

The working Pages app requires no new account. This reviewed candidate Worker is for arbitrary live Forks CA resolution if the owner later approves an external account connection and deployment. It is **not active**, and the frontend does not claim or call a live Worker endpoint.

Contract: HTTPS `GET /v1/association?mint=<32-byte Base58 public key>`, from exactly `https://dnfl1999.github.io`. The only upstream is `https://forks.wiki/api/coin?mint=...`; redirects are rejected. No arbitrary URL/host, POST, wallet, trade, signature or transaction endpoint is accepted. It returns only an exact-mint `coin.kind=forks` repository association with its checked time, or null. It does not certify endorsement or token safety.

Controls: native Workers rate limiting (30 requests per 60 seconds per IP; fails closed without binding), 5-minute cache, 8-second timeout, no automatic retries, explicit upstream errors, restrictive CORS, no client secrets. Cache hits retain the original observation timestamp. The rate limiter is local to Cloudflare locations, not a global quota, and IP limits are not identity authentication. Do not log IPs or queries. Review quotas before enabling; there is no paid-plan enrollment or billing approval here.

Official references: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [rate limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

After explicit owner approval: connect the intended Cloudflare account normally, review the free plan and Wrangler settings, allocate a rate-limiter namespace, test the Worker in that account, then deploy. Do not create an account, copy session cookies or expose an API token. Frontend integration would use the exact approved HTTPS Worker origin in CSP and fetch only `/v1/association`; preserve the dated index as an explicitly labeled fallback and add live integration tests before claiming coverage. Node unit tests here exercise the handler with mocks, **not** the Cloudflare runtime or a deployed service.
