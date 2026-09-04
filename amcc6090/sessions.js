(() => {
  const endpoint = window.AMCC6090_ATTENDANCE_API || '';
  if (!endpoint) return;

  const cards = [...document.querySelectorAll('.session')];
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = value => { try { const url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (_) { return ''; } };
  const post = action => fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({action})
  }).then(response => response.json());
  const bioMarkup = value => {
    const bio = String(value || '').trim();
    if (!bio) return '';
    const url = safeUrl(bio);
    return '<h4>About the speaker</h4>' + (url ? '<p><a href="'+esc(url)+'" target="_blank" rel="noopener">Speaker webpage →</a></p>' : '<p>'+esc(bio)+'</p>');
  };
  const responseMarkup = item => {
    const reflection = String(item.reflection || '').trim();
    const feedback = String(item.feedback || '').trim();
    return '<article class="anonymous-response">'
      +(reflection?'<div><b>Reflection</b><p>'+esc(reflection)+'</p></div>':'')
      +(feedback?'<div><b>Feedback</b><p>'+esc(feedback)+'</p></div>':'')
      +'</article>';
  };

  cards.forEach(card => {
    const details = document.createElement('details');
    details.className = 'session-responses';
    details.innerHTML = '<summary><span>Anonymous reflections &amp; feedback</span><small>Loading…</small></summary><div class="response-list"><p class="response-empty">Checking for shared responses…</p></div>';
    card.appendChild(details);
  });

  post('speaker-public-list').then(result => {
    if (!result.ok) return;
    result.speakers.forEach(speaker => {
      const card = cards.find(item => item.querySelector('.session-date b')?.textContent.trim() === speaker.sessionId);
      if (!card) return;
      const main = card.querySelector('.session-main');
      main.querySelector('p').textContent = 'Confirmed speaker';
      main.querySelector('h3').textContent = speaker.name;
      main.querySelector('span').textContent = speaker.materialsNote || 'Presentation details available.';
      const details = document.createElement('details');
      details.className = 'speaker-details';
      const materialsUrl = safeUrl(speaker.materialsUrl);
      details.innerHTML = '<summary>Speaker bio &amp; presentation details</summary>'+bioMarkup(speaker.bio)+'<h4>Presentation</h4><p>'+esc(speaker.materialsNote || 'Details will be shared by the speaker.')+'</p>'+(materialsUrl?'<a href="'+esc(materialsUrl)+'" target="_blank" rel="noopener">Open presentation materials →</a>':'');
      main.appendChild(details);
    });
  }).catch(() => {});

  post('attendance-public-reflections').then(result => {
    if (!result.ok) throw new Error('Unable to load responses.');
    cards.forEach(card => {
      const sessionId = card.querySelector('.session-date b')?.textContent.trim();
      const items = result.responses.filter(item => item.sessionId === sessionId && (item.reflection || item.feedback));
      const details = card.querySelector('.session-responses');
      details.querySelector('small').textContent = items.length ? items.length+' shared' : 'None yet';
      details.querySelector('.response-list').innerHTML = items.length ? items.map(responseMarkup).join('') : '<p class="response-empty">No reflections or feedback have been shared for this session yet.</p>';
    });
  }).catch(() => {
    cards.forEach(card => {
      const details = card.querySelector('.session-responses');
      details.querySelector('small').textContent = 'Unavailable';
      details.querySelector('.response-list').innerHTML = '<p class="response-empty">Responses could not be loaded right now.</p>';
    });
  });
})();
