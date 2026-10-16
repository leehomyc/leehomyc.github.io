# AMCC 5160 · Course Q&A service

Powers the "Questions and comments" section at the bottom of `/amcc5160/assignment-3/`. The same widget can be added to any other course page.

Posts are stored in a Google Sheet you own. Students need the **course access code** (the same one used for presentation sign-up) to read or post. The teaching team uses a separate **staff code** to reply with a "Teaching team" badge, pin, hide, or mark questions as answered.

## Setup

The live service is already deployed from the Apps Script project "AMCC 5160 Q&A" in harryyang.hk@gmail.com, writing to the Google Sheet "AMCC 5160 Q&A". Its web-app URL is in `amcc5160/discussion/config.js`.

**Codes live in the Sheet's Settings tab:**

| Row | Setting | |
| --- | --- | --- |
| 2 | Course access code | The same code students use for presentation sign-up. Students cannot open the Q&A until this is filled in. |
| 3 | Staff code | Generated automatically. For "Teaching team sign-in" on the page. Change it any time. |
| 4 | Notify email (optional) | If filled in, every new student post is emailed here (approve Gmail sending the first time). |

Changes take effect within about a minute. Script properties with the same names (`AMCC5160_ACCESS_CODE`, `AMCC5160_DISCUSSION_ADMIN_CODE`, `AMCC5160_DISCUSSION_NOTIFY_EMAIL`, `AMCC5160_DISCUSSION_SPREADSHEET_ID`) override the Sheet if you prefer to keep codes out of it.

**To redeploy from scratch:** create an Apps Script project, paste `Code.gs` and `appsscript.json`, run `setup` once to approve permissions, then Deploy → New deployment → Web app (Execute as: Me; Who has access: Anyone), and put the `/exec` URL in `amcc5160/discussion/config.js`.

## Using it

- **Staff mode:** on the page, click "Teaching team sign-in" under the Q&A and enter the staff code. You can then reply with a badge, pin, hide, and mark answered. A staff reply to a question marks it answered automatically. The code is kept in memory only and is gone when the tab closes.
- **Moderation:** hidden posts stay in the Sheet (column `hidden`); you can also edit the Sheet directly.
- **Students removing their own posts:** the browser that posted keeps a private removal token, so students can remove their own post from that browser.
- **Updating the code:** after editing `Code.gs`, use Deploy → Manage deployments → Edit → New version, so the URL stays the same.

## Adding Q&A to another page

```html
<link rel="stylesheet" href="../discussion/discussion.css">
<div class="qa" data-qa-page="assignment-4"></div>
<script src="../discussion/config.js" defer></script>
<script src="../discussion/discussion.js" defer></script>
```

Optionally add the page's URL to `PAGE_URLS` in `Code.gs` so notification emails link straight to it.
