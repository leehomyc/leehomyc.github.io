(() => {
  'use strict';

  const API_URL = window.AMCC6090_ATTENDANCE_API || '';
  const sessions = [
    ['01', 'Sep 04', '2026-09-04T18:30:00+08:00', '2026-09-04T19:20:00+08:00', '2026-09-04T23:59:59+08:00', 'Dengyang Jiang — Self-distillation in generative AI, towards native self-evolving in all training stages'],
    ['02', 'Sep 11', '2026-09-11T18:30:00+08:00', '2026-09-11T19:20:00+08:00', '2026-09-11T23:59:59+08:00', 'Speaker to be announced'],
    ['03', 'Sep 18', '2026-09-18T18:30:00+08:00', '2026-09-18T19:20:00+08:00', '2026-09-18T23:59:59+08:00', 'Speaker to be announced'],
    ['04', 'Sep 25', '2026-09-25T18:30:00+08:00', '2026-09-25T19:20:00+08:00', '2026-09-25T23:59:59+08:00', 'Speaker to be announced'],
    ['05', 'Oct 02', '2026-10-02T18:30:00+08:00', '2026-10-02T19:20:00+08:00', '2026-10-02T23:59:59+08:00', 'Speaker to be announced'],
    ['06', 'Oct 09', '2026-10-09T18:30:00+08:00', '2026-10-09T19:20:00+08:00', '2026-10-09T23:59:59+08:00', 'Speaker to be announced'],
    ['07', 'Oct 16', '2026-10-16T18:30:00+08:00', '2026-10-16T19:20:00+08:00', '2026-10-16T23:59:59+08:00', 'Speaker to be announced'],
    ['08', 'Oct 23', '2026-10-23T18:30:00+08:00', '2026-10-23T19:20:00+08:00', '2026-10-23T23:59:59+08:00', 'Speaker to be announced'],
    ['09', 'Oct 30', '2026-10-30T18:30:00+08:00', '2026-10-30T19:20:00+08:00', '2026-10-30T23:59:59+08:00', 'Speaker to be announced'],
    ['10', 'Nov 06', '2026-11-06T18:30:00+08:00', '2026-11-06T19:20:00+08:00', '2026-11-06T23:59:59+08:00', 'Speaker to be announced'],
    ['11', 'Nov 13', '2026-11-13T18:30:00+08:00', '2026-11-13T19:20:00+08:00', '2026-11-13T23:59:59+08:00', 'Speaker to be announced'],
    ['12', 'Nov 20', '2026-11-20T18:30:00+08:00', '2026-11-20T19:20:00+08:00', '2026-11-20T23:59:59+08:00', 'Speaker to be announced'],
    ['13', 'Nov 27', '2026-11-27T18:30:00+08:00', '2026-11-27T19:20:00+08:00', '2026-11-27T23:59:59+08:00', 'Speaker to be announced']
  ].map(([id, date, opensAt, endsAt, closesAt, title]) => ({ id, date, opensAt, endsAt, closesAt, title }));

  const form = document.getElementById('attendance-form');
  const lookupForm = document.getElementById('lookup-form');
  const card = document.getElementById('attendance-card');
  const lookupCard = document.getElementById('lookup-card');
  const sessionSelect = document.getElementById('session-select');
  const lookupSession = document.getElementById('lookup-session');
  const windowStatus = document.getElementById('window-status');
  const status = document.getElementById('status');
  const confirmationDialog = document.getElementById('attendance-confirmation');
  const submitButton = form.querySelector('.submit-button');
  const lookupSubmitButton = lookupForm.querySelector('.submit-button');
  const initialSession = new URLSearchParams(location.search).get('session');
  let editing = false;
  let editContext = null;
  let pendingDuplicate = null;
  let statusTimer;

  function attendanceState(session, now = Date.now()) {
    if (!session || now < Date.parse(session.opensAt)) return 'upcoming';
    if (now > Date.parse(session.closesAt)) return 'closed';
    return 'open';
  }

  function sessionLabel(session, includeWindow = false) {
    let label = `Session ${session.id} · ${session.date} · ${session.title}`;
    if (!includeWindow) return label;
    const state = attendanceState(session);
    if (state === 'open') label += ' · OPEN NOW';
    else if (state === 'closed') label += ' · Closed';
    else label += ' · Opens at 6:30 PM';
    return label;
  }

  function optionMarkup(items, emptyLabel = 'Choose a seminar…', includeWindow = false) {
    return `<option value="">${emptyLabel}</option>` + items.map(session => {
      const disabled = includeWindow && attendanceState(session) !== 'open' ? ' disabled' : '';
      return `<option value="${session.id}"${disabled}>${sessionLabel(session, includeWindow)}</option>`;
    }).join('');
  }

  function nextSession() {
    return sessions.find(session => Date.now() < Date.parse(session.opensAt));
  }

  function currentSession() {
    return sessions.find(session => attendanceState(session) === 'open');
  }

  function setNewAttendanceAvailability(session) {
    const state = attendanceState(session);
    const canSubmit = Boolean(session) && state === 'open';
    form.querySelectorAll('input, textarea').forEach(control => { control.disabled = !canSubmit; });
    submitButton.disabled = !canSubmit;
    windowStatus.className = `window-status ${state === 'open' ? 'open' : state === 'closed' ? 'closed' : ''}`;

    if (session && state === 'open') {
      windowStatus.textContent = `Open now — submit Session ${session.id} attendance before 11:59 PM today (Hong Kong time).`;
    } else if (session && state === 'closed') {
      windowStatus.textContent = `Attendance closed — the Session ${session.id} window ended at 11:59 PM on ${session.date}.`;
    } else if (session) {
      windowStatus.textContent = `Not open yet — Session ${session.id} opens at 6:30 PM and closes at 11:59 PM on ${session.date} (Hong Kong time).`;
    } else {
      const current = currentSession();
      const upcoming = nextSession();
      windowStatus.textContent = current
        ? `Attendance is open for Session ${current.id}. Choose it above to continue.`
        : upcoming
        ? `No attendance window is open. Session ${upcoming.id} opens at 6:30 PM on ${upcoming.date} (Hong Kong time).`
        : 'All attendance windows for this course have closed.';
    }
  }

  function setRetrievedRecordMode(locked) {
    sessionSelect.disabled = locked;
    ['name', 'studentId', 'code', 'attended'].forEach(name => {
      form.elements[name].disabled = locked;
    });
    form.elements.reflection.disabled = false;
    form.elements.feedback.disabled = false;
  }

  function displayValue(value) {
    return String(value || '').trim() || 'Not provided';
  }

  function openConfirmation(record, studentId, options = {}) {
    const session = sessions.find(item => item.id === record.sessionId);
    const duplicate = Boolean(options.duplicate);
    document.getElementById('confirmation-icon').textContent = duplicate ? '!' : '✓';
    document.getElementById('confirmation-kicker').textContent = duplicate ? 'Existing record found' : options.updated ? 'Changes saved' : 'Attendance saved';
    document.getElementById('confirmation-title').textContent = duplicate ? 'Already submitted.' : options.updated ? 'Record updated.' : 'Attendance confirmed.';
    document.getElementById('confirmation-message').textContent = duplicate
      ? 'This student ID already has attendance for this session. No second record was created. You can edit the reflection and feedback.'
      : options.updated
        ? 'Your attendance remains locked. Your reflection and feedback changes have been saved.'
        : 'Please review your submitted attendance details below.';
    document.getElementById('confirmation-session').textContent = session ? sessionLabel(session) : `Session ${record.sessionId}`;
    document.getElementById('confirmation-name').textContent = record.name;
    document.getElementById('confirmation-student-id').textContent = studentId;
    document.getElementById('confirmation-attended').textContent = 'Confirmed · attended in person';
    document.getElementById('confirmation-reflection').textContent = displayValue(record.reflection);
    document.getElementById('confirmation-feedback').textContent = displayValue(record.feedback);
    const savedAt = options.updatedAt || record.updatedAt;
    document.getElementById('confirmation-time').textContent = savedAt
      ? new Date(savedAt).toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'medium' }) + ' · Hong Kong time'
      : 'Previously submitted';
    document.getElementById('confirmation-edit').hidden = !duplicate;
    if (typeof confirmationDialog.showModal === 'function') confirmationDialog.showModal();
    else confirmationDialog.setAttribute('open', '');
  }

  function closeConfirmation() {
    if (typeof confirmationDialog.close === 'function') confirmationDialog.close();
    else confirmationDialog.removeAttribute('open');
  }

  function loadRecordForEditing(record, credentials) {
    form.reset();
    const retrievedOption = sessionSelect.querySelector(`option[value="${record.sessionId}"]`);
    if (retrievedOption) retrievedOption.disabled = false;
    form.elements.sessionId.value = record.sessionId;
    form.elements.name.value = record.name;
    form.elements.studentId.value = credentials.studentId;
    form.elements.code.value = credentials.code;
    form.elements.attended.checked = true;
    form.elements.reflection.value = record.reflection || '';
    form.elements.feedback.value = record.feedback || '';
    editing = true;
    editContext = {
      sessionId: record.sessionId,
      name: record.name,
      studentId: String(credentials.studentId),
      code: String(credentials.code)
    };
    setRetrievedRecordMode(true);
    lookupCard.hidden = true;
    card.hidden = false;
    document.getElementById('form-title').textContent = 'Update your attendance record.';
    document.getElementById('session-summary').textContent = `Session ${record.sessionId} · current record retrieved`;
    windowStatus.className = 'window-status open';
    windowStatus.textContent = 'Existing attendance is locked. You may update only your optional reflection and feedback.';
    submitButton.disabled = false;
    submitButton.textContent = 'Save changes →';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function refreshSessionOptions() {
    if (editing) return;
    const selected = sessionSelect.value || (sessions.some(session => session.id === initialSession) ? initialSession : '');
    const lookupSelected = lookupSession.value;
    const pastSessions = sessions.filter(session => Date.parse(session.endsAt) <= Date.now());
    sessionSelect.innerHTML = optionMarkup(sessions, 'Choose the open seminar…', true);
    lookupSession.innerHTML = optionMarkup(pastSessions, pastSessions.length ? 'Choose a past seminar…' : 'No past seminars yet');
    if (selected) sessionSelect.value = selected;
    if (pastSessions.some(session => session.id === lookupSelected)) lookupSession.value = lookupSelected;
    lookupSession.disabled = pastSessions.length === 0;
    lookupSubmitButton.disabled = pastSessions.length === 0;
    if (!editing) setNewAttendanceAvailability(sessions.find(session => session.id === selected));
  }

  function showStatus(message, kind = '') {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.className = `status show ${kind}`;
    statusTimer = setTimeout(() => { status.className = 'status'; }, 5000);
  }

  async function request(payload) {
    if (!API_URL) throw new Error('The attendance service is ready for deployment but is not connected yet.');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('The attendance service could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  async function refreshSpeakerTitles() {
    try {
      const result = await request({ action: 'speaker-public-list' });
      (result.speakers || []).forEach(speaker => {
        const session = sessions.find(item => item.id === speaker.sessionId);
        if (!session) return;
        const title = String(speaker.materialsNote || '').trim();
        session.title = `${speaker.name}${title ? ` — ${title}` : ''}`;
      });
      refreshSessionOptions();
    } catch (_) {
      // Keep the bundled session labels when live speaker details are unavailable.
    }
  }

  function chooseJourney(journey) {
    if (journey === 'new') {
      editing = false;
      editContext = null;
      form.reset();
      setRetrievedRecordMode(false);
      refreshSessionOptions();
      if (sessions.some(session => session.id === initialSession)) sessionSelect.value = initialSession;
      const selected = sessions.find(session => session.id === sessionSelect.value);
      document.getElementById('form-title').textContent = 'Confirm your attendance.';
      document.getElementById('session-summary').textContent = selected ? sessionLabel(selected) : 'Choose the seminar you attended.';
      submitButton.textContent = 'Save attendance →';
      setNewAttendanceAvailability(selected);
      card.hidden = false;
      lookupCard.hidden = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      card.hidden = true;
      lookupCard.hidden = false;
      lookupCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.querySelectorAll('[data-journey]').forEach(button => {
    button.addEventListener('click', () => chooseJourney(button.dataset.journey));
  });

  sessionSelect.addEventListener('change', event => {
    const selected = sessions.find(session => session.id === event.target.value);
    document.getElementById('session-summary').textContent = selected ? sessionLabel(selected) : 'Choose the seminar you attended.';
    if (!editing) setNewAttendanceAvailability(selected);
  });

  lookupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = lookupForm.querySelector('button');
    button.disabled = true;
    button.textContent = 'Retrieving…';
    try {
      const data = new FormData(lookupForm);
      const result = await request({ action: 'attendance-lookup', code: data.get('code'), sessionId: data.get('sessionId'), studentId: data.get('studentId') });
      if (!result.record) {
        document.getElementById('lookup-result').hidden = false;
        document.getElementById('lookup-result').textContent = 'No attendance record was found for this student and session.';
        return;
      }
      loadRecordForEditing(result.record, { studentId: data.get('studentId'), code: data.get('code') });
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Retrieve record →';
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = sessions.find(session => session.id === form.elements.sessionId.value);
    if (!editing && attendanceState(selected) !== 'open') {
      setNewAttendanceAvailability(selected);
      showStatus('Attendance can only be submitted from 6:30 PM until 11:59 PM on the seminar date.', 'error');
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      const data = new FormData(form);
      if (editing) {
        const updatedRecord = {
          sessionId: editContext.sessionId,
          name: editContext.name,
          reflection: form.elements.reflection.value,
          feedback: form.elements.feedback.value
        };
        const result = await request({
          action: 'attendance-update',
          code: editContext.code,
          sessionId: editContext.sessionId,
          name: editContext.name,
          studentId: editContext.studentId,
          attended: true,
          reflection: updatedRecord.reflection,
          feedback: updatedRecord.feedback
        });
        openConfirmation(updatedRecord, editContext.studentId, { updated: true, updatedAt: result.updatedAt });
        card.hidden = true;
        form.reset();
        editing = false;
        editContext = null;
      } else {
        const submission = {
          sessionId: String(data.get('sessionId')),
          name: String(data.get('name')),
          studentId: String(data.get('studentId')),
          code: String(data.get('code')),
          reflection: String(data.get('reflection') || ''),
          feedback: String(data.get('feedback') || '')
        };
        const existing = await request({ action: 'attendance-lookup', code: submission.code, sessionId: submission.sessionId, studentId: submission.studentId });
        if (existing.record) {
          pendingDuplicate = { record: existing.record, credentials: { studentId: submission.studentId, code: submission.code } };
          openConfirmation(existing.record, submission.studentId, { duplicate: true });
          return;
        }
        const result = await request({
          action: 'attendance-save',
          code: submission.code,
          sessionId: submission.sessionId,
          name: submission.name,
          studentId: submission.studentId,
          attended: true,
          reflection: submission.reflection,
          feedback: submission.feedback
        });
        if (result.updated) {
          const duplicate = await request({ action: 'attendance-lookup', code: submission.code, sessionId: submission.sessionId, studentId: submission.studentId });
          pendingDuplicate = { record: duplicate.record || submission, credentials: { studentId: submission.studentId, code: submission.code } };
          openConfirmation(duplicate.record || submission, submission.studentId, { duplicate: true, updatedAt: result.updatedAt });
          return;
        }
        openConfirmation(submission, submission.studentId, { updatedAt: result.updatedAt });
        card.hidden = true;
        form.reset();
      }
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      submitButton.textContent = editing ? 'Save changes →' : 'Save attendance →';
      if (editing) submitButton.disabled = false;
      else setNewAttendanceAvailability(sessions.find(session => session.id === form.elements.sessionId.value));
    }
  });

  document.getElementById('confirmation-close').addEventListener('click', () => {
    closeConfirmation();
    pendingDuplicate = null;
  });
  document.getElementById('confirmation-done').addEventListener('click', () => {
    closeConfirmation();
    pendingDuplicate = null;
  });
  document.getElementById('confirmation-edit').addEventListener('click', () => {
    if (!pendingDuplicate) return;
    const duplicate = pendingDuplicate;
    pendingDuplicate = null;
    closeConfirmation();
    loadRecordForEditing(duplicate.record, duplicate.credentials);
  });
  refreshSessionOptions();
  refreshSpeakerTitles();
  setInterval(refreshSessionOptions, 60000);
  if (initialSession) chooseJourney('new');
})();
