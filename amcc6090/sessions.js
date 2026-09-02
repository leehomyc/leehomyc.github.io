(() => {
  const endpoint = window.AMCC6090_ATTENDANCE_API || '';
  if (!endpoint) return;
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = value => { try { const url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (_) { return ''; } };
  const bioMarkup = value => {
    const bio = String(value || '').trim();
    if (!bio) return '';
    const url = safeUrl(bio);
    return '<h4>About the speaker</h4>' + (url ? '<p><a href="'+esc(url)+'" target="_blank" rel="noopener">Speaker webpage →</a></p>' : '<p>'+esc(bio)+'</p>');
  };
  fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'speaker-public-list'})})
    .then(response=>response.json()).then(result=>{
      if(!result.ok) return;
      result.speakers.forEach(speaker=>{
        const card=[...document.querySelectorAll('.session')].find(item=>item.querySelector('.session-date b')?.textContent.trim()===speaker.sessionId);
        if(!card) return;
        const main=card.querySelector('.session-main');
        main.querySelector('p').textContent='Confirmed speaker';
        main.querySelector('h3').textContent=speaker.name;
        main.querySelector('span').textContent=speaker.materialsNote || 'Presentation details available.';
        const details=document.createElement('details'); details.className='speaker-details';
        const materialsUrl=safeUrl(speaker.materialsUrl);
        details.innerHTML='<summary>Speaker bio & presentation details</summary>'+bioMarkup(speaker.bio)+'<h4>Presentation</h4><p>'+esc(speaker.materialsNote || 'Details will be shared by the speaker.')+'</p>'+(materialsUrl?'<a href="'+esc(materialsUrl)+'" target="_blank" rel="noopener">Open presentation materials →</a>':'');
        main.appendChild(details);
      });
    }).catch(()=>{});
})();
