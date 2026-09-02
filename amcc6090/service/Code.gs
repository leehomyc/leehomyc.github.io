const SHEET_NAME = 'Attendance';
const SPEAKER_SHEET_NAME = 'Speakers';
const ACCESS_CODE_PROPERTY = 'AMCC6090_ACCESS_CODE';
const ADMIN_CODE_PROPERTY = 'AMCC6090_ADMIN_CODE';
const SPEAKER_MANAGE_CODE_PROPERTY = 'AMCC6090_SPEAKER_MANAGE_CODE';

function doPost(event) {
  try {
    const request = JSON.parse((event.postData && event.postData.contents) || '{}');
    if (request.action === 'attendance-admin-list') return handleAdminList(request);
    if (request.action === 'speaker-public-list') return handlePublicSpeakerList();
    if (request.action === 'speaker-lookup' || request.action === 'speaker-signup') {
      if (!validSpeakerManageCode(request.code)) return jsonResponse({ ok: false, error: 'Incorrect speaker management code.' });
      if (request.action === 'speaker-lookup') return handleSpeakerLookup(request);
      return handleSpeakerSignup(request);
    }
    if (!validAccessCode(request.code)) return jsonResponse({ ok: false, error: 'Incorrect course access code.' });
    if (request.action === 'attendance-save') return handleAttendanceCreate(request);
    if (request.action === 'attendance-update') return handleAttendanceUpdate(request);
    if (request.action === 'attendance-lookup') return handleAttendanceLookup(request);
    if (request.action === 'speaker-list') return handleSpeakerList();
    return jsonResponse({ ok: false, error: 'Unknown request.' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'The attendance service could not complete this request.' });
  }
}

function attendanceInput(request) {
  const sessionId = clean(request.sessionId, 2);
  const name = clean(request.name, 80);
  const studentId = clean(request.studentId, 30);
  const reflection = cleanMultiline(request.reflection, 1200);
  const feedback = cleanMultiline(request.feedback, 800);
  if (!validSession(sessionId)) return { response: jsonResponse({ ok: false, error: 'Please choose a valid seminar session.' }) };
  if (name.length < 2) return { response: jsonResponse({ ok: false, error: 'Please enter your full name.' }) };
  if (studentId.length < 4) return { response: jsonResponse({ ok: false, error: 'Please enter a valid student ID.' }) };
  if (request.attended !== true) return { response: jsonResponse({ ok: false, error: 'Please confirm that you attended this seminar.' }) };
  return { sessionId: sessionId, name: name, studentId: studentId, reflection: reflection, feedback: feedback };
}

function handleAttendanceCreate(request) {
  const input = attendanceInput(request);
  if (input.response) return input.response;
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = attendanceSheet();
    const rows = dataRows(sheet);
    const hash = hashStudentId(input.studentId);
    const index = rows.findIndex(row => String(row[1]) === input.sessionId && String(row[4]) === hash);
    if (index >= 0) return jsonResponse({ ok: false, error: 'Attendance is already submitted for this student and session. Retrieve the existing record to edit reflection or feedback.' });
    const now = new Date().toISOString();
    sheet.appendRow([now, input.sessionId, input.name, input.studentId, hash, input.reflection, input.feedback, now]);
    return jsonResponse({ ok: true, updated: false, updatedAt: now });
  } finally { lock.releaseLock(); }
}

function handleAttendanceUpdate(request) {
  const sessionId = clean(request.sessionId, 2);
  const studentId = clean(request.studentId, 30);
  const reflection = cleanMultiline(request.reflection, 1200);
  const feedback = cleanMultiline(request.feedback, 800);
  if (!validSession(sessionId)) return jsonResponse({ ok: false, error: 'Please choose a valid seminar session.' });
  if (studentId.length < 4) return jsonResponse({ ok: false, error: 'Please enter a valid student ID.' });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = attendanceSheet();
    const rows = dataRows(sheet);
    const hash = hashStudentId(studentId);
    const index = rows.findIndex(row => String(row[1]) === sessionId && String(row[4]) === hash);
    if (index < 0) return jsonResponse({ ok: false, error: 'No existing attendance record was found. Only previously submitted attendance can be edited.' });
    const now = new Date().toISOString();
    sheet.getRange(index + 2, 6, 1, 3).setValues([[reflection, feedback, now]]);
    return jsonResponse({ ok: true, updated: true, updatedAt: now });
  } finally { lock.releaseLock(); }
}

function handleAttendanceLookup(request) {
  const sessionId = clean(request.sessionId, 2);
  const studentId = clean(request.studentId, 30);
  if (!validSession(sessionId) || studentId.length < 4) return jsonResponse({ ok: true, record: null });
  const hash = hashStudentId(studentId);
  const row = dataRows(attendanceSheet()).find(item => String(item[1]) === sessionId && String(item[4]) === hash);
  return jsonResponse({ ok: true, record: row ? publicRecord(row) : null });
}

function handleAdminList(request) {
  const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_CODE_PROPERTY);
  if (!expected || !safeEqual(clean(request.adminCode, 100), expected)) return jsonResponse({ ok: false, error: 'Incorrect instructor code.' });
  return jsonResponse({ ok: true, records: dataRows(attendanceSheet()).map(adminRecord), refreshedAt: new Date().toISOString() });
}

function handleSpeakerList() {
  return jsonResponse({ ok: true, speakers: speakerRows(speakerSheet()).map(speakerRecord) });
}

function handlePublicSpeakerList() {
  return jsonResponse({ ok: true, speakers: speakerRows(speakerSheet()).map(publicSpeaker) });
}

function handleSpeakerLookup(request) {
  const sessionId = clean(request.sessionId, 2);
  if (!validSpeakerSession(sessionId)) return jsonResponse({ ok: true, record: null });
  const row = speakerRows(speakerSheet()).find(item => sessionValue(item[1]) === sessionId);
  if (row) return jsonResponse({ ok: true, record: speakerRecord(row) });
  if (sessionId === '01') return jsonResponse({ ok: true, record: { sessionId: '01', name: 'Dengyang Jiang', materialsUrl: '', materialsNote: '', updatedAt: '', bio: '' } });
  return jsonResponse({ ok: true, record: null });
}

function handleSpeakerSignup(request) {
  const sessionId = clean(request.sessionId, 2);
  const name = clean(request.name, 80);
  const materialsUrl = clean(request.materialsUrl, 500);
  const materialsNote = cleanMultiline(request.materialsNote, 300);
  const bio = cleanMultiline(request.bio, 1000);
  const originalName = clean(request.originalName, 80);
  if (!validSpeakerSession(sessionId)) return jsonResponse({ ok: false, error: 'Please choose an open seminar date.' });
  if (name.length < 2) return jsonResponse({ ok: false, error: 'Please enter your name.' });
  if (bio.length < 10) return jsonResponse({ ok: false, error: 'Please add a short speaker bio.' });
  if (materialsUrl && !validUrl(materialsUrl)) return jsonResponse({ ok: false, error: 'Please use a valid http(s) link for presentation materials.' });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = speakerSheet();
    const rows = speakerRows(sheet);
    const index = rows.findIndex(row => sessionValue(row[1]) === sessionId);
    if (index >= 0 && (!originalName || clean(rows[index][2], 80).toLowerCase() !== originalName.toLowerCase())) return jsonResponse({ ok: false, error: 'That seminar date has already been reserved.' });
    const now = new Date().toISOString();
    const createdAt = index >= 0 ? rows[index][0] : now;
    const values = [createdAt, sessionId, name, materialsUrl, materialsNote, now, bio];
    if (index >= 0) sheet.getRange(index + 2, 1, 1, values.length).setValues([values]);
    else sheet.appendRow(values);
    return jsonResponse({ ok: true, updated: index >= 0, sessionId: sessionId, updatedAt: now });
  } finally { lock.releaseLock(); }
}

function attendanceSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('AMCC6090_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet is not configured.');
  const book = SpreadsheetApp.openById(spreadsheetId);
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Created at','Session','Student name','Student ID','Student hash','Reflection','Feedback','Updated at']);
  return sheet;
}

function speakerSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('AMCC6090_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet is not configured.');
  const book = SpreadsheetApp.openById(spreadsheetId);
  let sheet = book.getSheetByName(SPEAKER_SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SPEAKER_SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Created at','Session','Speaker name','Materials URL','Materials note','Updated at','Speaker bio']);
  else if (!sheet.getRange(1, 7).getValue()) sheet.getRange(1, 7).setValue('Speaker bio');
  return sheet;
}

function dataRows(sheet) { const last = sheet.getLastRow(); return last < 2 ? [] : sheet.getRange(2, 1, last - 1, 8).getValues(); }
function speakerRows(sheet) { const last = sheet.getLastRow(); return last < 2 ? [] : sheet.getRange(2, 1, last - 1, 7).getValues(); }
function publicRecord(row) { return { sessionId: String(row[1]), name: String(row[2]), reflection: String(row[5] || ''), feedback: String(row[6] || ''), updatedAt: String(row[7]) }; }
function publicSpeaker(row) { return { sessionId: sessionValue(row[1]), name: String(row[2]), materialsUrl: String(row[3] || ''), materialsNote: String(row[4] || ''), bio: String(row[6] || '') }; }
function speakerRecord(row) { return { sessionId: sessionValue(row[1]), name: String(row[2]), materialsUrl: String(row[3] || ''), materialsNote: String(row[4] || ''), updatedAt: String(row[5]), bio: String(row[6] || '') }; }
function adminRecord(row) { return { createdAt: String(row[0]), sessionId: String(row[1]), name: String(row[2]), studentId: String(row[3]), reflection: String(row[5] || ''), feedback: String(row[6] || ''), updatedAt: String(row[7]) }; }
function validAccessCode(value) { const expected = PropertiesService.getScriptProperties().getProperty(ACCESS_CODE_PROPERTY); return Boolean(expected) && safeEqual(clean(value, 100).toUpperCase(), expected.toUpperCase()); }
function validSpeakerManageCode(value) { const expected = PropertiesService.getScriptProperties().getProperty(SPEAKER_MANAGE_CODE_PROPERTY); return Boolean(expected) && safeEqual(clean(value, 100), expected); }
function validSession(value) { return /^(0[1-9]|1[0-3])$/.test(value); }
function validSpeakerSession(value) { return /^(0[1-9]|1[0-3])$/.test(value); }
function sessionValue(value) { return String(value || '').padStart(2, '0'); }
function validUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch (error) { return false; } }
function clean(value, max) { return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function cleanMultiline(value, max) { return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max); }
function hashStudentId(value) { const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean(value, 30).toLowerCase(), Utilities.Charset.UTF_8); return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join(''); }
function safeEqual(a, b) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
function jsonResponse(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
