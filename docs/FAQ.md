# MemeDiff FAQ

### Do I need MEMEDIFF tokens, SOL, a wallet or an account?

No. The analysis tool is free and has no wallet connection or trading function. GitHub sign-in is only needed if you choose to submit an issue on GitHub.

### What does the tool actually count?

Public default-branch commits using their committer timestamps, public releases using publication timestamps (including prereleases, excluding drafts), and linked GitHub author accounts observed in those commits. Bots may be included; unlinked authors are excluded from contributor counts. These are not all contributors, all branches, issues or pull requests.

### Why are my counts different from GitHub Pulse or another dashboard?

Compare the branch, date field, exact rolling 7/30-day UTC window, pagination limits and account attribution rules. Separate API requests are not one atomic snapshot. A later query can return different data. See [methodology](../README.md#methodology-and-limitations).

### What does `+` or “PARTIAL OBSERVATION” mean?

Collection stopped at an error or cap (up to 1,000 commits / 500 releases). Counts are lower bounds within the observed data. `0+` does not mean no development occurred. Review warnings and JSON evidence; do not share it as a complete total.

### What should I do about 403, 429 or 404?

403/429 can mean an API limit or access refusal. Follow the displayed wait/reset guidance and avoid repeated requests. Shared networks may share a rate limit. A 404 can mean the URL is wrong, the repository is unavailable or it is not public; check the repository directly. Do not paste API tokens or credentials into the tool or an issue.

### Why does the baseline comparison say 30 days on a 7-day card?

The selected period controls metric counts and receipt evidence. Baseline comparison uses the collected 30-day SHA sets, with a rolling overlap for missing observations. It is explicitly labeled. New observations do not prove new work; missing observations do not prove deletion or manipulation.

### Where is my baseline? Can I import JSON?

The baseline is stored in this browser/profile under the repository, branch and optional token combination. It is not synced or hosted. Storage restrictions, clearing browser data or using another device can make it unavailable. JSON import is not implemented.

### Does an optional Solana address verify the token or its relationship to a repository?

No. It is format-checked and recorded as user input. The separately maintained official MemeDiff token section links the project's dated audit; that does not turn arbitrary report inputs into verified token relationships. [Official identity and audit](../POST_LAUNCH_AUDIT.md).

### Is a Development Receipt proof of work, safety or returns?

No. It is an editable, unsigned image of an observation. Inspect timestamps, collection warnings and original links, and rerun a query if needed. Commit counts can include documentation, automation and other changes. No quality or safety score is generated.

### Can the app publish my card or provide a shareable hosted report URL?

No. PNG and JSON download locally. You decide whether to share them. URLs printed on the PNG are not clickable; full API links are in JSON. No automatic X posting, hosted report upload or engagement tracking exists.

### What if PNG export or clipboard copying fails?

Use JSON if the browser cannot generate PNG. If CA copying is denied, the app selects the address for manual copying. Check the browser's download/clipboard settings. If the problem persists, report browser/device and reproduction steps without sharing credentials.

### How do I report a bug or suggest an improvement?

Use the [issue chooser](https://github.com/dnfl1999/memediff/issues/new/choose). Describe the actual task, what happened and what would help; a wording fix may be enough. Issues and attachments are public. Remove secrets, unnecessary token addresses and personal details first. See [contribution guidance](../CONTRIBUTING.md).

### Where do token balances, fees and $FORK rewards belong?

They are separate from software activity. Use the [read-only operations guide](TOKEN_OPERATIONS.md) and its exact CA and sources. Dated snapshots are not live balances. Pending fees are not guaranteed claim quotes, and a pending $FORK allocation is not a token payout. This task does not perform claims, signatures, trades or wallet linking.

### Why might source text be in another language?

The interface is English, with UTC dates and English (US) numbers. Repository descriptions, commit messages and release names are original GitHub evidence and are not translated. Older saved baselines remain usable without migration; their historical text is preserved in storage.
