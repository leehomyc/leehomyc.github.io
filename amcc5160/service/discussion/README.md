# AMCC 5160 · Course Q&A service

Powers the "Questions and comments" section at the bottom of `/amcc5160/assignment-3/`. The same widget can be added to any other course page.

Posts are stored in a Google Sheet you own. Students need the **course access code** (the same one used for presentation sign-up) to read or post. The teaching team uses a separate **staff code** to reply with a "Teaching team" badge, pin, hide, or mark questions as answered.

## One-time setup (about 10 minutes)

1. **Create a Google Sheet**, e.g. "AMCC 5160 Q&A". Copy its ID from the URL: `docs.google.com/spreadsheets/d/<THIS PART>/edit`. The `Posts` tab is created automatically on first use.
2. **Create an Apps Script project** at <https://script.google.com> → New project. Name it "AMCC 5160 Q&A".
3. Paste `Code.gs` into the editor. In Project Settings, tick "Show appsscript.json", then paste `appsscript.json`.
4. **Project Settings → Script properties**, add:

   | Property | Value |
   | --- | --- |
   | `AMCC5160_ACCESS_CODE` | The course code students already use for sign-up |
   | `AMCC5160_DISCUSSION_ADMIN_CODE` | A separate staff code for you and the TA (do not share with students) |
   | `AMCC5160_DISCUSSION_SPREADSHEET_ID` | The Sheet ID from step 1 |
   | `AMCC5160_DISCUSSION_NOTIFY_EMAIL` | *Optional.* An email address to notify on every new student post |

5. **Deploy → New deployment → Web app.** Execute as: *Me*. Who has access: *Anyone*. Authorize when asked (Sheets, plus Gmail send if you set the notify email).
6. Copy the web-app URL (ends in `/exec`) into `amcc5160/discussion/config.js`:

   ```js
   window.AMCC5160_DISCUSSION_API = "https://script.google.com/macros/s/…/exec";
   ```

7. Commit and push. Until step 6 is done, the section shows "Q&A opens soon" and nothing breaks.

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
