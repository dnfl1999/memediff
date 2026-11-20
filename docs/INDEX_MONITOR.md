# Index Health Monitor

The monitor runs hourly at minute 47 UTC on `main`. GitHub can delay or drop scheduled runs during peak loads. For an immediate check, run **Index Health Monitor** from Actions with the **publish** input unchecked. An unchecked manual run reads the current index, Pages jobs and operations issue. A scheduled run or a manually checked publish run applies only an actionable issue transition.

The monitor uses the official MemeDiff Pages index and GitHub REST. It leaves Pages deployment, the index and verification timestamps untouched. The observe job uses read-only Actions, contents and issues permissions. The publish job uses contents read and issues write. Both jobs are restricted to `dnfl1999/memediff` on `main`, with one workflow run active at a time. The workflow uses GitHub's job token.

| Signal | Evidence and behavior |
| --- | --- |
| Consecutive refresh failures | Two or more completed scheduled **index preparation** steps failed since the last successful refresh attempt. Skipped steps make no attempt. A failure elsewhere in Pages does not count. |
| Expiring soon | The official record is in the final six hours of its 48-hour verification window. The 48-hour instant is still in this interval. |
| Expired | The official record is beyond the 48-hour instant. |
| Recovery | A newer official verification is published with a matching Pages run, successful index preparation and successful deploy. Old published timestamps and deployment success alone cannot satisfy recovery. |

Time-based eligibility and scheduled run results are reported separately. The job summary links confirmed source runs and distinguishes the published fallback's diagnosis from a scheduled failure's own evidence. Unreadable evidence is shown as unavailable. A failure to read the issue prevents creation or updates. The workflow does not retry an ambiguous Issue write. The next run reads the issue and its comments before deciding whether any change is still needed.

The first actionable event creates one repository issue named **Operations: Forks index verification**. Evidence-bearing changes get a comment in that issue. Regular polls, countdown ticks and additional failures with the same diagnosis produce no new notice. Proven recovery adds a comment and closes the issue. A later incident can reopen the same issue. The monitor writes only to its own bot-authored issue. A conflicting or locked issue is reported for maintainer review.

Issue creation and event comments mention `@dnfl1999`. To receive repository issue notifications, verify **Watch** or **Custom → Issues** on the repository and the desired GitHub notification channels. Inbox, email and push delivery follow account settings. [GitHub notification settings](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications) · [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
