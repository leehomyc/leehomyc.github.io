(() => {
  const endpoint = window.AMCC5160_SIGNUP_API;
  const ENROLLED_STUDENT_TOTAL = 80;
  const questions = [
    'What does it mean for a machine-learning model to learn? Use prediction, target, and loss.',
    'What does one artificial neuron do? Explain weights, bias, and the activation function.',
    'In self-attention, what do queries, keys, and values do?',
    'Describe the basic latent-diffusion process from noise through denoising to decoding.',
    'Choose one Lecture 01 reading and critique one central claim in a short paragraph.'
  ];
  let adminCode = '';
  let records = { signups: [], quizzes: [] };
  let students = [];
  let studentFilter = '';
  let refreshTimer;
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const studentName = item => item.name || item.fullName || item.familyName || 'Name unavailable';
  const studentId = item => item.studentId || (item.idLastFour ? `•••• ${item.idLastFour}` : 'ID unavailable');
  const person = item => `${studentName(item)} · ${studentId(item)}`;
  const SLIDES_MARKER = '\n[[SLIDES]]';

  function presentationDetails(value) {
    const stored = String(value || '');
    const markerIndex = stored.indexOf(SLIDES_MARKER);
    return markerIndex === -1
      ? { topic: stored, slidesUrl: '' }
      : { topic: stored.slice(0, markerIndex), slidesUrl: stored.slice(markerIndex + SLIDES_MARKER.length) };
  }

  function safeSlidesUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch (_) { return ''; }
  }

  async function request(payload) {
    if (!endpoint) throw new Error('The course service is not configured.');
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  async function load(showLoading = false) {
    if (showLoading) $('#dashboard-status').textContent = 'Refreshing…';
    try {
      const result = await request({ action: 'admin-list', adminCode });
      records = result;
      render();
      $('#last-updated').textContent = `Last refreshed ${new Date(result.refreshedAt).toLocaleString()}`;
      $('#dashboard-status').textContent = '';
      $('#dashboard-status').classList.remove('error');
    } catch (error) {
      $('#dashboard-status').textContent = error.message;
      $('#dashboard-status').classList.add('error');
    }
  }

  function render() {
    const weekly = records.signups.filter(item => item.type === 'weekly');
    const finals = records.signups.filter(item => item.type === 'final');
    const quizzes = records.quizzes;
    const graded = [...records.signups, ...quizzes].filter(item => item.score !== null && item.score !== '').length;
    const roster = Array.isArray(records.roster) ? records.roster : [];
    students = buildStudents(roster, [...records.signups, ...quizzes]);
    const enrollmentTotal = roster.length || ENROLLED_STUDENT_TOTAL;
    const activeStudentTotal = students.filter(item => item.weekly.length || item.quizzes.length || item.finals.length).length;
    [['weekly', weekly.length], ['quiz', quizzes.length], ['final', finals.length]].forEach(([key, value]) => { $(`#metric-${key}`).textContent = value; $(`#count-${key}`).textContent = value; });
    $('#metric-students').textContent = enrollmentTotal;
    $('#count-students').textContent = enrollmentTotal;
    $('#activity-student-count').textContent = activeStudentTotal;
    $('#metric-graded').textContent = graded;
    renderStudents();
    renderPresentation('#weekly-list', weekly, 10);
    renderQuiz('#quiz-list', quizzes);
    renderPresentation('#final-list', finals, 25);
  }

  function studentKey(item) {
    const rawId = item.studentId || '';
    return rawId ? `id:${rawId.replace(/\s+/g, '').toLowerCase()}` : `legacy:${String(item.familyName || '').toLowerCase()}:${item.idLastFour || ''}`;
  }

  function buildStudents(roster, items) {
    const directory = new Map();
    roster.forEach(item => {
      directory.set(studentKey(item), { name: studentName(item), studentId: studentId(item), weekly: [], finals: [], quizzes: [], lastActivity: '' });
    });
    items.forEach(item => {
      const rawId = item.studentId || '';
      const key = studentKey(item);
      if (roster.length && !directory.has(key)) return;
      const entry = directory.get(key) || { name: studentName(item), studentId: studentId(item), weekly: [], finals: [], quizzes: [], lastActivity: '' };
      if (item.name || item.fullName) entry.name = studentName(item);
      if (rawId) entry.studentId = rawId;
      if (item.type === 'weekly') entry.weekly.push(item.slotId);
      else if (item.type === 'final') entry.finals.push(item.slotId);
      else if (item.quizId) entry.quizzes.push(item.week || item.quizId);
      const activityAt = item.updatedAt || item.submittedAt || '';
      if (activityAt > entry.lastActivity) entry.lastActivity = activityAt;
      directory.set(key, entry);
    });
    return [...directory.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  function studentActivity(item) {
    const labels = [];
    if (item.weekly.length) labels.push(`${item.weekly.length} weekly`);
    if (item.quizzes.length) labels.push(`${item.quizzes.length} quiz${item.quizzes.length === 1 ? '' : 'zes'}`);
    if (item.finals.length) labels.push(`${item.finals.length} final`);
    return labels.length ? labels : ['No activity'];
  }

  function renderStudents() {
    const query = studentFilter.trim().toLowerCase();
    const visible = students.filter(item => !query || `${item.name} ${item.studentId}`.toLowerCase().includes(query));
    $('#student-list').innerHTML = visible.map(item => `<tr><td data-label="Student"><strong>${escapeHtml(item.name)}</strong></td><td data-label="Student ID"><code>${escapeHtml(item.studentId)}</code></td><td data-label="Course activity"><div class="activity-tags">${studentActivity(item).map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div></td><td data-label="Last activity">${item.lastActivity ? escapeHtml(new Date(item.lastActivity).toLocaleString()) : '—'}</td></tr>`).join('');
    $('#student-empty').hidden = visible.length > 0;
    $('.student-table-wrap').hidden = visible.length === 0;
  }

  function renderPresentation(selector, items, maxScore) {
    $(selector).innerHTML = items.length ? items.map(item => {
      const details = presentationDetails(item.topic);
      const slidesUrl = safeSlidesUrl(details.slidesUrl);
      const slides = slidesUrl ? `<p><a href="${escapeHtml(slidesUrl)}" target="_blank" rel="noreferrer">Open slides ↗</a></p>` : '<p>Slides not added yet</p>';
      return `<article class="record" data-id="${escapeHtml(item.recordId)}"><div class="record-identity"><h3>${escapeHtml(item.slotId.replaceAll('-', ' · '))}</h3><p>${escapeHtml(person(item))}</p></div><div class="record-content"><strong>${escapeHtml(details.topic)}</strong>${slides}<p>Updated ${new Date(item.updatedAt).toLocaleString()}</p></div>${gradeForm(item, maxScore)}</article>`;
    }).join('') : '<div class="empty">No reservations yet. New sign-ups will appear here automatically.</div>';
  }

  function renderQuiz(selector, items) {
    $(selector).innerHTML = items.length ? items.map(item => `<article class="record" data-id="${escapeHtml(item.recordId)}"><div class="record-identity"><h3>${escapeHtml(person(item))}</h3><p>${escapeHtml(item.title)} · Updated ${new Date(item.submittedAt).toLocaleString()}</p></div><div class="record-content"><strong>Five current responses</strong><div class="answers">${item.answers.map((answer, index) => `<details><summary>Question ${index + 1}</summary><p><b>${escapeHtml(questions[index])}</b><br>${escapeHtml(answer)}</p></details>`).join('')}</div></div>${gradeForm(item, 20)}</article>`).join('') : '<div class="empty">No quiz submissions yet. New responses will appear here automatically.</div>';
  }

  function gradeForm(item, maxScore) {
    return `<form class="record-grade"><label>Score / ${maxScore}<input name="score" type="number" min="0" max="${maxScore}" step="0.5" value="${item.score == null ? '' : escapeHtml(item.score)}"></label><label>Feedback<textarea name="feedback" maxlength="600" placeholder="Private grading notes">${escapeHtml(item.feedback || '')}</textarea></label><button type="submit">Save</button><div class="saved" aria-live="polite"></div></form>`;
  }

  async function saveGrade(form) {
    const record = form.closest('.record');
    const button = form.querySelector('button');
    const saved = form.querySelector('.saved');
    button.disabled = true; saved.textContent = 'Saving…';
    try {
      await request({ action: 'admin-grade', adminCode, recordId: record.dataset.id, score: form.score.value, feedback: form.feedback.value });
      saved.textContent = 'Saved ✓';
      await load();
    } catch (error) { saved.textContent = error.message; } finally { button.disabled = false; }
  }

  function csvValue(value) { return `"${String(value == null ? '' : value).replaceAll('"', '""')}"`; }
  function exportCsv(type) {
    const items = type === 'quiz' ? records.quizzes : records.signups.filter(item => item.type === type);
    const rows = type === 'students'
      ? [['Student name','Student ID','Weekly slots','Quiz weeks','Final slots','Last activity'], ...students.map(i => [i.name,i.studentId,i.weekly.join('; '),i.quizzes.join('; '),i.finals.join('; '),i.lastActivity])]
      : type === 'quiz'
        ? [['Week','Updated at','Student name','Student ID',...questions.map((_, i) => `Answer ${i + 1}`),'Score / 20','Feedback'], ...items.map(i => [i.week,i.submittedAt,studentName(i),studentId(i),...i.answers,i.score,i.feedback])]
        : [['Slot','Student name','Student ID','Topic','Slides link',`Score / ${type === 'final' ? 25 : 10}`,'Feedback'], ...items.map(i => { const details = presentationDetails(i.topic); return [i.slotId,studentName(i),studentId(i),details.topic,details.slidesUrl,i.score,i.feedback]; })];
    const blob = new Blob([rows.map(row => row.map(csvValue).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `amcc5160-${type}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); adminCode = $('#admin-code').value.trim(); $('#login-status').textContent = 'Checking…';
    try { const result = await request({ action: 'admin-list', adminCode }); records = result; $('#login-status').classList.remove('error'); $('#login').hidden = true; $('#dashboard').hidden = false; $('#refresh').hidden = false; render(); $('#last-updated').textContent = `Last refreshed ${new Date(result.refreshedAt).toLocaleString()}`; refreshTimer = setInterval(() => load(), 30000); }
    catch (error) { $('#login-status').textContent = error.message; $('#login-status').classList.add('error'); adminCode = ''; }
  });
  document.addEventListener('submit', event => { if (event.target.matches('.record-grade')) { event.preventDefault(); saveGrade(event.target); } });
  $('.tabs').addEventListener('click', event => { const button = event.target.closest('button[data-panel]'); if (!button) return; document.querySelectorAll('.tabs button').forEach(item => item.classList.toggle('active', item === button)); document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== `panel-${button.dataset.panel}`; }); });
  document.addEventListener('click', event => { const button = event.target.closest('[data-export]'); if (button) exportCsv(button.dataset.export); });
  $('#student-search').addEventListener('input', event => { studentFilter = event.target.value; renderStudents(); });
  $('#refresh').addEventListener('click', () => load(true));
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
})();
