/**
 * AMCC 5160 · Questions & comments board
 * Google Apps Script web app (Execute as: me · Who has access: Anyone).
 * Posts are stored in Script Properties, one property per post (no student data, no spreadsheet).
 * Set the instructor code once: Project Settings → Script properties → QA_CFG_ADMIN_CODE.
 */
const POST_PREFIX = 'QA_POST_';
const ADMIN_CODE_PROPERTY = 'QA_CFG_ADMIN_CODE';
const MAX_NAME = 40;
const MAX_TEXT = 2000;
const KINDS = ['question', 'comment', 'reply'];

function doGet() {
  return jsonResponse({ ok: true, posts: listPosts(false) });
}

function doPost(event) {
  try {
    const request = JSON.parse((event.postData && event.postData.contents) || '{}');
    const admin = isAdmin(request.adminCode);
    switch (request.action) {
      case 'list': return jsonResponse({ ok: true, posts: listPosts(admin), admin: admin });
      case 'post': return handlePost(request, admin);
      case 'admin-check': return jsonResponse({ ok: admin, error: admin ? '' : 'Incorrect instructor code.' });
      case 'admin-update': return admin ? handleAdminUpdate(request) : jsonResponse({ ok: false, error: 'Incorrect instructor code.' });
      case 'admin-delete': return admin ? handleAdminDelete(request) : jsonResponse({ ok: false, error: 'Incorrect instructor code.' });
      default: return jsonResponse({ ok: false, error: 'Unknown request.' });
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'The Q&A service could not complete this request.' });
  }
}

function handlePost(request, admin) {
  if (request.website) return jsonResponse({ ok: true, posts: listPosts(false) }); // honeypot
  const kind = KINDS.indexOf(request.kind) >= 0 ? request.kind : 'comment';
  const parentId = cleanString(request.parentId, 40);
  const name = admin ? 'Harry Yang' : cleanString(request.name, MAX_NAME);
  const text = cleanMultiline(request.text, MAX_TEXT);
  if (!admin && name.length < 1) return jsonResponse({ ok: false, error: 'Please add a name or nickname.' });
  if (text.length < 2) return jsonResponse({ ok: false, error: 'Please write a little more.' });
  if (kind === 'reply' && !parentId) return jsonResponse({ ok: false, error: 'Missing the post you are replying to.' });
  if (!admin && rateLimited(request.clientId)) return jsonResponse({ ok: false, error: 'You are posting very quickly. Please wait a minute and try again.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (kind === 'reply') {
      const parent = props.getProperty(POST_PREFIX + parentId);
      if (!parent) return jsonResponse({ ok: false, error: 'That post no longer exists.' });
      if (admin) {
        const parentPost = JSON.parse(parent);
        if (parentPost.kind === 'question') { parentPost.answered = true; props.setProperty(POST_PREFIX + parentId, JSON.stringify(parentPost)); }
      }
    }
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    const post = {
      id: id,
      parentId: kind === 'reply' ? parentId : '',
      kind: kind,
      name: name,
      text: text,
      createdAt: new Date().toISOString(),
      instructor: admin,
      answered: false,
      hidden: false
    };
    props.setProperty(POST_PREFIX + id, JSON.stringify(post));
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ ok: true, posts: listPosts(admin), admin: admin });
}

function handleAdminUpdate(request) {
  const id = cleanString(request.id, 40);
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(POST_PREFIX + id);
  if (!raw) return jsonResponse({ ok: false, error: 'That post no longer exists.' });
  const post = JSON.parse(raw);
  if (typeof request.hidden === 'boolean') post.hidden = request.hidden;
  if (typeof request.answered === 'boolean') post.answered = request.answered;
  if (typeof request.pinned === 'boolean') post.pinned = request.pinned;
  props.setProperty(POST_PREFIX + id, JSON.stringify(post));
  return jsonResponse({ ok: true, posts: listPosts(true), admin: true });
}

function handleAdminDelete(request) {
  const id = cleanString(request.id, 40);
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf(POST_PREFIX) !== 0) return;
    try {
      const post = JSON.parse(all[key]);
      if (post.id === id || post.parentId === id) props.deleteProperty(key);
    } catch (_) {}
  });
  return jsonResponse({ ok: true, posts: listPosts(true), admin: true });
}

function listPosts(admin) {
  const all = PropertiesService.getScriptProperties().getProperties();
  const posts = [];
  Object.keys(all).forEach(function (key) {
    if (key.indexOf(POST_PREFIX) !== 0) return;
    try {
      const post = JSON.parse(all[key]);
      if (post.hidden && !admin) return;
      posts.push(post);
    } catch (_) {}
  });
  posts.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return posts;
}

function rateLimited(clientId) {
  const cache = CacheService.getScriptCache();
  const keys = ['qa_rate_all', 'qa_rate_' + cleanString(clientId, 40)];
  const limits = [30, 4]; // posts per 5 minutes: whole board · one browser
  for (let i = 0; i < keys.length; i += 1) {
    const count = Number(cache.get(keys[i]) || 0);
    if (count >= limits[i]) return true;
  }
  keys.forEach(function (key) { cache.put(key, String(Number(cache.get(key) || 0) + 1), 300); });
  return false;
}

function isAdmin(code) {
  const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_CODE_PROPERTY);
  return Boolean(expected) && String(code || '') === expected;
}

function cleanString(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanMultiline(value, maxLength) {
  return String(value || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxLength);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
