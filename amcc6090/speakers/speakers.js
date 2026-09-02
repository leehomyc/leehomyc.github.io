(() => {
  'use strict';
  const API_URL = window.AMCC6090_ATTENDANCE_API || '';
  const sessions = [['02','Sep 11'],['03','Sep 18'],['04','Sep 25'],['05','Oct 02'],['06','Oct 09'],['07','Oct 16'],['08','Oct 23'],['09','Oct 30'],['10','Nov 06'],['11','Nov 13'],['12','Nov 20'],['13','Nov 27']];
  const form = document.getElementById('speaker-form'), card = document.getElementById('speaker-card'), status = document.getElementById('status'), select = document.getElementById('speaker-session');
  let reserved = [], timer;
  function show(message, kind=''){clearTimeout(timer);status.textContent=message;status.className='status show '+kind;timer=setTimeout(()=>status.className='status',5000)}
  async function request(payload){if(!API_URL)throw new Error('The speaker sign-up service is ready for deployment but is not connected yet.');const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'The request could not be completed.');return result}
  function render(){select.innerHTML='<option value="">Choose an available date…</option>'+sessions.map(([id,date])=>{const held=reserved.find(item=>item.sessionId===id);return '<option value="'+id+'" '+(held?'disabled':'')+'>Session '+id+' · '+date+(held?' · Reserved by '+held.name:'')+'</option>'}).join('');const open=sessions.length-reserved.length;document.getElementById('availability-note').textContent=open+' open seminar '+(open===1?'date remains.':'dates remain.')+' Reserved dates are disabled.'}
  async function refresh(){const code=form.elements.code.value;if(!code){render();return}const result=await request({action:'speaker-list',code});reserved=result.speakers||[];render()}
  document.getElementById('open-form').addEventListener('click',()=>{card.hidden=false;render();card.scrollIntoView({behavior:'smooth',block:'start'})});
  document.getElementById('refresh-list').addEventListener('click',async()=>{card.hidden=false;try{await refresh()}catch(error){show(error.message,'error')}card.scrollIntoView({behavior:'smooth',block:'start'})});
  form.elements.code.addEventListener('change',async()=>{try{await refresh()}catch(error){show(error.message,'error')}});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;button.textContent='Reserving…';try{const data=new FormData(form);const result=await request({action:'speaker-signup',code:data.get('code'),name:data.get('name'),sessionId:data.get('sessionId'),materialsUrl:data.get('materialsUrl'),materialsNote:data.get('materialsNote')});card.hidden=true;document.getElementById('success').hidden=false;document.getElementById('success-time').textContent='Session '+result.sessionId+' · reserved '+new Date(result.updatedAt).toLocaleString();form.reset();reserved.push({sessionId:result.sessionId,name:data.get('name')});render()}catch(error){show(error.message,'error')}finally{button.disabled=false;button.textContent='Reserve seminar →'}});
  document.getElementById('another-session').addEventListener('click',()=>{document.getElementById('success').hidden=true;card.hidden=false;card.scrollIntoView({behavior:'smooth',block:'start'})});
  render();
})();
