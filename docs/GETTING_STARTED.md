# Analyze a Solana token

Open [MemeDiff](https://dnfl1999.github.io/memediff/). Paste a full Solana CA into **Solana Token CA** and select **Analyze Token** once. No GitHub address, wallet, SOL, login or API key is needed. **Try Live Demo** uses the official MEMEDIFF CA.

## Read the two kinds of evidence separately

**Token information** shows public market observations matched to Solana and the exact base-token CA. FDV and market cap are separate; liquidity and volume refer to one selected pool, not a sum. Missing fields say Unknown. Failed APIs say Unavailable with the cause. Each observation has a time and original source.

**GitHub development** starts automatically if a fresh official Forks association is available. The app verifies an exact mint, `coin.kind=forks` and explicit repository in its dated API index. A repository association does not prove endorsement, safety or returns. If no fresh verified mapping is available, token information remains visible and the app says **No verified GitHub repository found.** It does not invent a repository from the token name.

## Compare and share development observations

Choose **7 days** or **30 days**. Review warnings before interpreting counts; **+** marks incomplete collection. Follow original evidence links. Select **Save baseline**, then analyze the same CA/repository/branch combination later to compare observed SHA values. Comparisons remain 30-day even on a 7-day card. **Clear this project baseline** removes only that local baseline.

Select **PNG Receipt** and **JSON** after GitHub analysis succeeds. JSON retains schema 1 and all collected development evidence; it does not include the separate market panel. PNG links are printed text, not clickable. No repository match means no development receipt, not zero development. [Historical real example](examples/README.md) remains unchanged and is not current market data.

## Analyze a repository directly

Expand **Advanced Search — GitHub repository**, enter a public URL or `owner/repo`, optionally record a token address, and select **Analyze**. This preserves the original flow and existing saved baselines. Name search can help locate a repository but does not verify a token connection. Clearing browser storage or changing devices loses access to local baselines; JSON import is not implemented.

## Limits and help

The Forks index is limited and dated. Scheduled refresh is attempted every six hours; GitHub may delay or disable scheduled runs. Associations older than 48 hours are not automatically used. A missing entry does not prove no relationship exists. Source errors, throttling and timeout are shown without automatic retries. Browser JavaScript cannot reliably distinguish a CORS denial from a general network failure; that ambiguity is stated.

Read [FAQ](FAQ.md) and [data sources](DISCOVERY.md). Report reproducible bugs through [GitHub Issues](https://github.com/dnfl1999/memediff/issues/new/choose); remove secrets and unnecessary personal data. The app does not trade, connect wallets, claim fees or publish to X.

## Compare a downloaded JSON report

After the current live analysis completes, select **Import Previous Report**. Choose a schema 1 JSON export up to 2 MiB from the same repository, branch and exact CA. Review both observation times, then select **Compare without saving**. The existing browser baseline stays untouched. **Save imported baseline** is the explicit replacement action. **Use saved browser baseline** returns to the stored baseline without writing anything. Imported files are editable, unverified observations, not signed certificates; comparison always uses the 30-day dataset. Files never leave your browser.
