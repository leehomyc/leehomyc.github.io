(() => {
  'use strict';

  const endpoint = window.AMCC6090_ATTENDANCE_API || '';
  let adminCode = '';
  let roster = [];
  let records = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  async function request(payload) {
    if (!endpoint) throw new Error('The attendance service is not connected yet.');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The request failed.');
    return result;
  }

  function students() {
    const map = new Map();
    roster.forEach(student => {
      const key = String(student.studentId || '').toLowerCase();
      if (!key) return;
      map.set(key, { name: student.name, studentId: student.studentId, sessions: new Set(), fromRoster: true });
    });
    records.forEach(record => {
      const key = String(record.studentId || '').toLowerCase();
      if (!key) return;
      const item = map.get(key) || { name: record.name, studentId: record.studentId, sessions: new Set(), fromRoster: false };
      if (!item.fromRoster) item.name = record.name;
      item.sessions.add(record.sessionId);
      map.set(key, item);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function render() {
    const people = students();
    document.getElementById('metric-students').textContent = people.length;
    document.getElementById('metric-records').textContent = records.length;
    document.getElementById('metric-sessions').textContent = new Set(records.map(record => record.sessionId)).size;
    document.getElementById('matrix-head').innerHTML = '<tr><th>Student</th><th>ID</th>' + Array.from({ length: 13 }, (_, index) => `<th>${String(index + 1).padStart(2, '0')}</th>`).join('') + '</tr>';
    document.getElementById('matrix-body').innerHTML = people.map(person => '<tr><td>' + esc(person.name) + '</td><td>' + esc(person.studentId) + '</td>' + Array.from({ length: 13 }, (_, index) => {
      const sessionId = String(index + 1).padStart(2, '0');
      return `<td class="${person.sessions.has(sessionId) ? 'present' : 'absent'}">${person.sessions.has(sessionId) ? '✓' : '—'}</td>`;
    }).join('') + '</tr>').join('');
    document.getElementById('record-list').innerHTML = records.length ? records.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(record => `<article class="record"><div><h3>${esc(record.name)}</h3><p>${esc(record.studentId)} · Session ${esc(record.sessionId)}</p><small>${new Date(record.updatedAt).toLocaleString()}</small></div><div><small>Reflection</small><p>${esc(record.reflection) || '—'}</p></div><div><small>Feedback</small><p>${esc(record.feedback) || '—'}</p></div></article>`).join('') : '<p>No attendance records yet.</p>';
  }

  async function load() {
    const result = await request({ action: 'attendance-admin-list', adminCode });
    roster = result.roster || [];
    records = result.records || [];
    render();
  }

  document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    adminCode = document.getElementById('admin-code').value.trim();
    document.getElementById('login-status').textContent = 'Checking…';
    try {
      await load();
      document.getElementById('login').hidden = true;
      document.getElementById('dashboard').hidden = false;
    } catch (error) {
      document.getElementById('login-status').textContent = error.message;
      adminCode = '';
    }
  });

  document.getElementById('refresh').addEventListener('click', () => load().catch(error => {
    document.getElementById('dashboard-status').textContent = error.message;
  }));

  document.getElementById('export').addEventListener('click', () => {
    const rows = [['Session', 'Updated at', 'Student name', 'Student ID', 'Reflection', 'Feedback'], ...records.map(record => [record.sessionId, record.updatedAt, record.name, record.studentId, record.reflection, record.feedback])];
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'amcc6090-attendance.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });
})();
