# Website links and immutable token metadata

Checked November 12, 2026 (Asia/Seoul). Raw read-only responses and UTC observation time: [website-link-evidence.json](website-link-evidence.json).

## Confirmed cause

The original metadata URI is https://ipfs.io/ipfs/bafkreid5jhzwufn7zhzjk23wbjuz6v6ypgtxnekng5luryrh4nr7hbdsdi . The same CID was retrieved through gateway.pinata.cloud with HTTP 200. Its `website` is the Forks coin page, not the official GitHub Pages website. Its `telegram` contains https://github.com/dnfl1999/memediff (a repository, not a Telegram account). The official website does not occur in that JSON.

This matches the launcher's deliberate field mapping in [Forks launch source](https://github.com/forkwiki/fork/blob/f807abf1248ceadf47542cf7e223b223819e84f0/netlify/functions/launch.mjs#L164) and [design decision](https://github.com/forkwiki/fork/blob/f807abf1248ceadf47542cf7e223b223819e84f0/docs/DECISIONS.md#L70). It is not evidence that the user forgot a website field, and waiting for indexing cannot change that stored URL.

The fresh finalized Solana RPC response (slot 468371886) identifies Token-2022, metadata `updateAuthority: null`, pointer `authority: null`, mint authority null and freeze authority null. Supply is 1000000000000000 raw units / 6 decimals = 1,000,000,000. Under [Solana's metadata extension rules](https://solana.com/docs/tokens/extensions/metadata), clearing the update authority makes metadata immutable. The existing URI cannot be replaced, and different IPFS content would have a different CID. No remint, signature, transaction, payment or wallet connection was performed.

## Separate platform states

| Platform | Observation | Update path / limitation |
| --- | --- | --- |
| GitHub repository | Homepage was empty; updated through the authenticated owner account and read back as the official Pages URL | Completed for free; no implication that third-party profiles automatically update. |
| Official website | HTTP 200; existing application and branding preserved | Repository-controlled links and SEO can be updated for free. |
| Forks Wiki | HTTP 200 API confirms exact CA and dnfl1999/memediff association; coin record has no website field | No public self-service website update route was found in the inspected official guide/source. A separate displayed website link needs maintainer review; it cannot rewrite immutable metadata. |
| pump.fun | Token page returned HTTP 403 in this environment | Actual rendered link not verified. Original metadata points to Forks. No verified official post-launch website-edit endpoint was found; do not assert a platform override is available. |
| DexScreener | HTTP 200 exact Solana base-token pair; response has no `info.websites` (or `info`) | Market indexing already exists. Missing profile enrichment is separate; internal ingestion reason and future timing are not exposed. |
| Solscan | Token page returned HTTP 403 | Actual website/reputation status unverified. Platform display update is separate from on-chain metadata. |

The official [pump.fun creation guide](https://pump.fun/docs/create-coin) describes immutable name/symbol/image; its official preview was search-accessible but the main page was blocked here. This does not establish a universal rule about off-chain profile overrides. The mint-specific RPC evidence above is the basis for the immutability conclusion.

## Manual requests, only where needed

**Solscan (free standard review):** Use https://solscan.io/token-update, linked by the [official submission guideline](https://info.solscan.io/solscan-token-update-guideline/). Choose Social Links & Logo Update for link corrections, or Reputation Update if the token's actual reputation requires it. The form requires request type, CA, requester name, requester email, official website, image URL and short description. Socials and listing IDs are optional: leave unavailable fields blank. The requester must supply their own name/email and submit. No request was sent. Paid priority support is unnecessary and was not used. [Visibility policy](https://info.solscan.io/solscan-token-reputation/) can hide project-owned links for Unknown reputation; MEMEDIFF's actual reputation could not be inspected, so this is a possible cause, not an established diagnosis.

**DexScreener:** The [official listing documentation](https://docs.dexscreener.com/token-listing) says profiles may be enriched from external lists such as CoinGecko. That is not a guaranteed free direct update or guaranteed acceptance on CoinGecko. The direct [Enhanced Token Info application](https://marketplace.dexscreener.com/product/token-info) currently advertises **from $299**, alongside a struck-through $499 price. Steps: enter token/profile details, pay, await processing. It is a paid service, so no order or checkout was opened or submitted. Do not confuse automatic market listing with website-profile registration.

**Forks:** The [official guide](https://forks.wiki/guide) links its [public source repository](https://github.com/forkwiki/fork). Its [issue form](https://github.com/forkwiki/fork/issues/new) is a maintainer inquiry route, not an advertised token-registration API. Ask whether the existing coin record can display the official website separately. Include CA, repository, website, and the original-field evidence. GitHub login and maintainer action are required; no issue was posted. Do not relaunch the coin.

**pump.fun:** Recheck the exact coin page in a normal browser. No verified dedicated website-update application URL was found, so none is invented here. Any displayed-profile change must be confirmed with the platform through its own interface. The immutable mint metadata cannot be edited by the launcher.

## Ready-to-use project information

- Name / symbol: MemeDiff / MEMEDIFF
- Network: Solana Mainnet (Token-2022)
- CA: DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork
- Website: https://dnfl1999.github.io/memediff/
- Repository: https://github.com/dnfl1999/memediff
- Logo: https://dnfl1999.github.io/memediff/assets/memediff-logo.jpg
- Launch date: 2026-11-11; supply: 1,000,000,000; decimals: 6
- Description: MemeDiff is a free, open-source tool for inspecting public GitHub activity behind Solana tokens. It provides exact-address market lookups, verified Forks repository associations, development reports, local snapshot comparisons, and PNG/JSON exports. MEMEDIFF is the project-associated meme token. No wallet or token ownership is required to use the tool.

## Search and deployment notes

Canonical, Open Graph and Twitter image paths target the project Pages URL. The existing 1200 x 630 social image and favicon are retained. The build substitutes the official CA from `src/token-data.js` into the HTML template, keeping one application constant and crawlable static token links. Run `npm run build` before previewing `dist/`; the source HTML is a build template.

The deployed project includes sitemap.xml and robots.txt. A crawler's authoritative robots.txt is at the origin root (https://dnfl1999.github.io/robots.txt), not /memediff/robots.txt; this project-scoped file cannot control other repositories. No Search Console verification or indexing request was made, and indexing is not guaranteed.
