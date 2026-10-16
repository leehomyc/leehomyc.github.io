// AMCC 5160 · Course Q&A service (Google Apps Script web app)
// Stores questions and comments for course pages (e.g. Assignment 3) in a Google Sheet.
// Setup steps: see README.md in this folder.

const POSTS_SHEET_NAME = 'Posts';
const HEADERS = ['id', 'createdAt', 'page', 'parentId', 'name', 'kind', 'message', 'staff', 'hidden', 'pinned', 'answered', 'tokenHash', 'updatedAt'];
const COLUMN_COUNT = HEADERS.length;
const ACCESS_CODE_PROPERTY = 'AMCC5160_ACCESS_CODE';
const ADMIN_CODE_PROPERTY = 'AMCC5160_DISCUSSION_ADMIN_CODE';
const SPREADSHEET_PROPERTY = 'AMCC5160_DISCUSSION_SPREADSHEET_ID';
const NOTIFY_EMAIL_PROPERTY = 'AMCC5160_DISCUSSION_NOTIFY_EMAIL';
const PAGE_URLS = { 'assignment-3': 'https://hyang.org/amcc5160/assignment-3/#discussion' };
const MAX_NAME = 60;
const MAX_MESSAGE = 2000;
const KINDS = ['question', 'comment'];

function doPost(event) {
  try {
    const request = JSON.parse((event.postData && event.postData.contents) || '{}');
    const isStaff = validAdminCode(request.adminCode);
    if (!isStaff && !validAccessCode(request.code)) return jsonResponse({ ok: false, error: 'Incorrect course access code.' });
    const page = clean(request.page, 40);
    if (!/^[a-z0-9-]{1,40}$/.test(page)) return jsonResponse({ ok: false, error: 'Unknown course page.' });

    if (request.action === 'discussion-list') return handleList(page, isStaff);
    if (request.action === 'discussion-post') return handlePost(request, page, isStaff);
    if (request.action === 'discussion-delete') return handleDelete(request, page, isStaff);
    if (request.action === 'discussion-moderate') {
      if (!isStaff) return jsonResponse({ ok: false, error: 'Only the teaching team can do this.' });
      return handleModerate(request, page);
    }
    if (request.action === 'discussion-staff-check') return jsonResponse({ ok: true, staff: isStaff });
    return jsonResponse({ ok: false, error: 'Unknown request.' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'The Q&A service could not complete this request.' });
  }
}

function handleList(page, isStaff) {
  const rows = dataRows(postsSheet()).filter(row => String(row[2]) === page);
  const posts = rows
    .filter(row => isStaff || !truthy(row[8]))
    .map(row => publicPost(row, isStaff));
  return jsonResponse({ ok: true, posts: posts, staff: isStaff, serverTime: new Date().toISOString() });
}

function handlePost(request, page, isStaff) {
  const name = clean(request.name, MAX_NAME);
  const message = cleanMultiline(request.message, MAX_MESSAGE);
  const parentId = clean(request.parentId, 40);
  const kind = parentId ? 'reply' : (KINDS.indexOf(request.kind) >= 0 ? request.kind : 'question');
  if (name.length < 2) return jsonResponse({ ok: false, error: 'Please enter your name (at least 2 characters).' });
  if (message.length < 2) return jsonResponse({ ok: false, error: 'Please write a message.' });

  if (!isStaff) {
    const cache = CacheService.getScriptCache();
    const key = 'rate-' + hashText(name.toLowerCase());
    if (cache.get(key)) return jsonResponse({ ok: false, error: 'Please wait a few seconds before posting again.' });
    cache.put(key, '1', 15);
  }

  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = postsSheet();
    const rows = dataRows(sheet);
    if (parentId) {
      const parentIndex = rows.findIndex(row => String(row[0]) === parentId && String(row[2]) === page);
      if (parentIndex < 0) return jsonResponse({ ok: false, error: 'That thread no longer exists.' });
      const parent = rows[parentIndex];
      if (String(parent[3])) return jsonResponse({ ok: false, error: 'Please reply to the original post.' });
      if (truthy(parent[8]) && !isStaff) return jsonResponse({ ok: false, error: 'That thread has been removed.' });
      if (isStaff && String(parent[5]) === 'question' && !truthy(parent[10])) {
        sheet.getRange(parentIndex + 2, 11).setValue(true);
      }
    }
    const now = new Date().toISOString();
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    const token = Utilities.getUuid().replace(/-/g, '');
    const row = [id, now, page, parentId, name, kind, message, isStaff, false, false, false, hashText(token), now];
    sheet.appendRow(row);
    if (!isStaff) notifyStaff(page, name, kind, message);
    return jsonResponse({ ok: true, post: publicPost(row, isStaff), token: token });
  } finally { lock.releaseLock(); }
}

function handleDelete(request, page, isStaff) {
  const id = clean(request.id, 40);
  const token = clean(request.token, 64);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = postsSheet();
    const rows = dataRows(sheet);
    const index = rows.findIndex(row => String(row[0]) === id && String(row[2]) === page);
    if (index < 0) return jsonResponse({ ok: false, error: 'Post not found.' });
    const ownsPost = token && safeEqual(hashText(token), String(rows[index][11]));
    if (!ownsPost && !isStaff) return jsonResponse({ ok: false, error: 'You can only remove your own posts from the browser you posted with.' });
    sheet.getRange(index + 2, 9).setValue(true);
    sheet.getRange(index + 2, 13).setValue(new Date().toISOString());
    return jsonResponse({ ok: true });
  } finally { lock.releaseLock(); }
}

function handleModerate(request, page) {
  const id = clean(request.id, 40);
  const fieldColumns = { hidden: 9, pinned: 10, answered: 11 };
  const column = fieldColumns[request.field];
  if (!column) return jsonResponse({ ok: false, error: 'Unknown setting.' });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = postsSheet();
    const rows = dataRows(sheet);
    const index = rows.findIndex(row => String(row[0]) === id && String(row[2]) === page);
    if (index < 0) return jsonResponse({ ok: false, error: 'Post not found.' });
    sheet.getRange(index + 2, column).setValue(request.value === true);
    sheet.getRange(index + 2, 13).setValue(new Date().toISOString());
    return jsonResponse({ ok: true });
  } finally { lock.releaseLock(); }
}

function notifyStaff(page, name, kind, message) {
  const email = PropertiesService.getScriptProperties().getProperty(NOTIFY_EMAIL_PROPERTY);
  if (!email) return;
  try {
    const link = PAGE_URLS[page] || 'https://hyang.org/amcc5160/';
    const label = kind === 'reply' ? 'New reply' : (kind === 'question' ? 'New question' : 'New comment');
    MailApp.sendEmail({
      to: email,
      subject: '[AMCC 5160] ' + label + ' on ' + page + ' from ' + name,
      body: name + ' wrote:\n\n' + message + '\n\nReply on the page: ' + link
    });
  } catch (error) { console.error('Notification failed', error); }
}

function postsSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_PROPERTY);
  if (!spreadsheetId) throw new Error('Missing spreadsheet ID property.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(POSTS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(POSTS_SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMN_COUNT).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function dataRows(sheet) { const last = sheet.getLastRow(); return last < 2 ? [] : sheet.getRange(2, 1, last - 1, COLUMN_COUNT).getValues(); }
function publicPost(row, isStaff) {
  const post = {
    id: String(row[0]), createdAt: String(row[1]), parentId: String(row[3] || ''), name: String(row[4]),
    kind: String(row[5]), message: String(row[6]), staff: truthy(row[7]), pinned: truthy(row[9]), answered: truthy(row[10])
  };
  if (isStaff) post.hidden = truthy(row[8]);
  return post;
}
function truthy(value) { return value === true || String(value).toUpperCase() === 'TRUE'; }
function validAccessCode(value) { const expected = PropertiesService.getScriptProperties().getProperty(ACCESS_CODE_PROPERTY); return Boolean(expected) && Boolean(value) && safeEqual(clean(value, 100).toUpperCase(), expected.toUpperCase()); }
function validAdminCode(value) { const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_CODE_PROPERTY); return Boolean(expected) && Boolean(value) && safeEqual(clean(value, 100), expected); }
function clean(value, max) { return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function cleanMultiline(value, max) { return String(value || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max); }
function hashText(value) { const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8); return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join(''); }
function safeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
function jsonResponse(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
