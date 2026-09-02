(() => {
  const endpoint = window.AMCC6090_ATTENDANCE_API || '';
  if (!endpoint) return;
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
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
        details.innerHTML='<summary>Presentation details</summary><p>'+esc(speaker.materialsNote || 'Details will be shared by the speaker.')+'</p>'+(speaker.materialsUrl?'<a href="'+esc(speaker.materialsUrl)+'" target="_blank" rel="noopener">Open presentation materials →</a>':'');
        main.appendChild(details);
      });
    }).catch(()=>{});
})();
