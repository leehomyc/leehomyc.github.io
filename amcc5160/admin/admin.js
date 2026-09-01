(() => {
  const endpoint = window.AMCC5160_SIGNUP_API;
  const questions = [
    'What makes a world different from a still image or animation?',
    'What are the four stages in the durable generative-media map?',
    'Why is video not simply an image with more frames?',
    'What is controlled variation, and why is it useful?',
    'What process evidence makes generative media inspectable?'
  ];
  let adminCode = '';
  let records = { signups: [], quizzes: [] };
  let refreshTimer;
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const person = item => `${item.familyName} · •••• ${item.idLastFour}`;

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
    [['weekly', weekly.length], ['quiz', quizzes.length], ['final', finals.length]].forEach(([key, value]) => { $(`#metric-${key}`).textContent = value; $(`#count-${key}`).textContent = value; });
    $('#metric-graded').textContent = graded;
    renderPresentation('#weekly-list', weekly, 10);
    renderQuiz('#quiz-list', quizzes);
    renderPresentation('#final-list', finals, 25);
  }

  function renderPresentation(selector, items, maxScore) {
    $(selector).innerHTML = items.length ? items.map(item => `<article class="record" data-id="${escapeHtml(item.recordId)}"><div class="record-identity"><h3>${escapeHtml(item.slotId.replaceAll('-', ' · '))}</h3><p>${escapeHtml(person(item))}</p></div><div class="record-content"><strong>${escapeHtml(item.topic)}</strong><p>Updated ${new Date(item.updatedAt).toLocaleString()}</p></div>${gradeForm(item, maxScore)}</article>`).join('') : '<div class="empty">No reservations yet. New sign-ups will appear here automatically.</div>';
  }

  function renderQuiz(selector, items) {
    $(selector).innerHTML = items.length ? items.map(item => `<article class="record" data-id="${escapeHtml(item.recordId)}"><div class="record-identity"><h3>${escapeHtml(person(item))}</h3><p>${escapeHtml(item.title)} · ${new Date(item.submittedAt).toLocaleString()}</p></div><div class="record-content"><strong>Five responses</strong><div class="answers">${item.answers.map((answer, index) => `<details><summary>Question ${index + 1}</summary><p><b>${escapeHtml(questions[index])}</b><br>${escapeHtml(answer)}</p></details>`).join('')}</div></div>${gradeForm(item, 20)}</article>`).join('') : '<div class="empty">No quiz submissions yet. New responses will appear here automatically.</div>';
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
    const rows = type === 'quiz'
      ? [['Week','Family name','ID last four',...questions.map((_, i) => `Answer ${i + 1}`),'Score / 20','Feedback'], ...items.map(i => [i.week,i.familyName,i.idLastFour,...i.answers,i.score,i.feedback])]
      : [['Slot','Family name','ID last four','Topic',`Score / ${type === 'final' ? 25 : 10}`,'Feedback'], ...items.map(i => [i.slotId,i.familyName,i.idLastFour,i.topic,i.score,i.feedback])];
    const blob = new Blob([rows.map(row => row.map(csvValue).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `amcc5160-${type}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); adminCode = $('#admin-code').value.trim(); $('#login-status').textContent = 'Checking…';
    try { const result = await request({ action: 'admin-list', adminCode }); records = result; $('#login').hidden = true; $('#dashboard').hidden = false; $('#refresh').hidden = false; render(); $('#last-updated').textContent = `Last refreshed ${new Date(result.refreshedAt).toLocaleString()}`; refreshTimer = setInterval(() => load(), 30000); }
    catch (error) { $('#login-status').textContent = error.message; $('#login-status').classList.add('error'); adminCode = ''; }
  });
  document.addEventListener('submit', event => { if (event.target.matches('.record-grade')) { event.preventDefault(); saveGrade(event.target); } });
  $('.tabs').addEventListener('click', event => { const button = event.target.closest('button[data-panel]'); if (!button) return; document.querySelectorAll('.tabs button').forEach(item => item.classList.toggle('active', item === button)); document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== `panel-${button.dataset.panel}`; }); });
  document.addEventListener('click', event => { const button = event.target.closest('[data-export]'); if (button) exportCsv(button.dataset.export); });
  $('#refresh').addEventListener('click', () => load(true));
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
})();
