# Read-only token operations

Canonical CA: `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork` (Solana Mainnet).

Project: https://github.com/dnfl1999/memediff — website: https://dnfl1999.github.io/memediff/

## Public queries

| Need | Source / method | Interpretation |
| --- | --- | --- |
| Repository association | `GET https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff` | Match full mint, not symbol. |
| Price, volume, liquidity | `GET https://api.dexscreener.com/latest/dex/tokens/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork` | Check chainId, baseToken.address, pair, timestamp and liquidity fields. Missing liquidity is unknown, not zero. Volume is reported trading volume, not proven organic activity. |
| Mint and authorities | Solana RPC `getAccountInfo`, params `[CA,{"encoding":"jsonParsed","commitment":"finalized"}]` | Verify owner program and embedded token metadata. |
| Supply | `getTokenSupply`, params `[CA]` | Keep raw integer and decimals to avoid rounding. |
| Wallet holdings | `getTokenAccountsByOwner`, params `[WALLET,{"mint":CA},{"encoding":"jsonParsed"}]` | Sum every returned token account for that mint; timestamp the result. |
| Transactions | `getSignaturesForAddress`, then `getTransaction` with `maxSupportedTransactionVersion:0` | Distinguish failed/finalized transactions, fees, rent and transfers. Paginate with `before`. |
| Top holders | `getTokenLargestAccounts`, params `[CA]` | Top 20 token accounts, **not total unique holders**. Pool/vault accounts are not people. |
| Full holder count | Token-2022 `getProgramAccounts`, mint memcmp at offset 0, parsed account data | May be blocked/expensive on public RPC. Filter positive balances, deduplicate owners, distinguish pools and programs. Token-2022 variable sizes mean no fixed 165-byte filter. Never infer a total from the top 20. Solscan may offer a public UI; API access/keys can be required. |
| Fees | `getMultipleAccounts` for audit sharing config, creator vault and GitHub social account | Subtract actual rent from balances; do not label all vault funds instantly claimable. SDK distribution helpers may build/simulate transactions; do not call them in a read-only audit. |
| Season rules/account aggregate | `GET https://forks.wiki/api/season` | Public leaderboard is aggregate. Exact mint history requires the user's normal login; never copy session cookies. |

RPC endpoint: `https://api.mainnet-beta.solana.com`. JSON-RPC calls use HTTP POST but the methods above are reads. Example (Node 22+, no wallet library):

```js
const response = await fetch('https://api.mainnet-beta.solana.com', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply',
    params: ['DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork'] })
});
console.log(await response.json());
```

Check HTTP status and RPC `error`; honor 429/retry-after and avoid repeated requests. A 403, absent pair, missing field or stale response is not proof of zero liquidity or no holders. Market APIs may lag. Use [DexScreener reference](https://docs.dexscreener.com/api/reference) and [Solana RPC reference](https://solana.com/docs/rpc/http) when updating queries. Do not add paid APIs or keys without approval.

## Human-only financial operations

For GitHub fees, the [Forks guide](https://forks.wiki/guide) instructs GitHub login on pump.fun and a claim. Review pending distribution versus credited social-account balance, recipient and network cost. No claim was made by the audit.

For Season attribution, sign in as `@kanepkjinwoo` and inspect the coin's reward history. If the intended launch wallet is missing, the official Link a wallet flow asks for a message signature proving ownership; do not confuse that with transaction authorization. Wallet linking, signatures, fee distribution/claim and any asset movement need separate explicit user approval.

## Monitoring discipline

Keep software status in GitHub issues, Actions and ROADMAP.md. Keep token observations in dated audit entries with source, UTC time, CA and limitations. Do not publish fluctuating balances as permanent homepage facts. No recurring job or automatic trading has been configured. Never repost an announcement automatically.
