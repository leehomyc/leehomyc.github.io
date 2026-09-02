(() => {
  'use strict';
  const API_URL = window.AMCC6090_ATTENDANCE_API || '';
  const sessions = [
    ['01','Sep 04','Dengyang Jiang — Research and internship experience'],['02','Sep 11','Speaker to be announced'],['03','Sep 18','Speaker to be announced'],['04','Sep 25','Speaker to be announced'],['05','Oct 02','Speaker to be announced'],['06','Oct 09','Speaker to be announced'],['07','Oct 16','Speaker to be announced'],['08','Oct 23','Speaker to be announced'],['09','Oct 30','Speaker to be announced'],['10','Nov 06','Speaker to be announced'],['11','Nov 13','Speaker to be announced'],['12','Nov 20','Speaker to be announced'],['13','Nov 27','Speaker to be announced']
  ].map(([id,date,title]) => ({ id, date, title }));
  const form = document.getElementById('attendance-form');
  const lookupForm = document.getElementById('lookup-form');
  const card = document.getElementById('attendance-card');
  const lookupCard = document.getElementById('lookup-card');
  const status = document.getElementById('status');
  const success = document.getElementById('success');
  let editing = false;
  let statusTimer;

  function optionMarkup(){return '<option value="">Choose a seminar…</option>'+sessions.map(s=>`<option value="${s.id}">Session ${s.id} · ${s.date} · ${s.title}</option>`).join('')}
  document.getElementById('session-select').innerHTML=optionMarkup();document.getElementById('lookup-session').innerHTML=optionMarkup();
  const initialSession = new URLSearchParams(location.search).get('session');
  if (sessions.some(s=>s.id===initialSession)) {
    document.getElementById('session-select').value=initialSession;
    const selected = sessions.find(s=>s.id===initialSession);
    document.getElementById('session-summary').textContent=`Session ${selected.id} · ${selected.date} · ${selected.title}`;
  }

  function showStatus(message,kind=''){clearTimeout(statusTimer);status.textContent=message;status.className=`status show ${kind}`;statusTimer=setTimeout(()=>status.className='status',5000)}
  async function request(payload){if(!API_URL)throw new Error('The attendance service is ready for deployment but is not connected yet.');const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});if(!response.ok)throw new Error('The attendance service could not be reached. Please try again.');const result=await response.json();if(!result.ok)throw new Error(result.error||'The request could not be completed.');return result}
  function chooseJourney(journey){success.hidden=true;if(journey==='new'){editing=false;form.reset();if(initialSession)document.getElementById('session-select').value=initialSession;card.hidden=false;lookupCard.hidden=true;document.getElementById('form-title').textContent='Confirm your attendance.';form.querySelector('.submit-button').textContent='Save attendance →';card.scrollIntoView({behavior:'smooth',block:'start'})}else{card.hidden=true;lookupCard.hidden=false;lookupCard.scrollIntoView({behavior:'smooth',block:'start'})}}
  document.querySelectorAll('[data-journey]').forEach(button=>button.addEventListener('click',()=>chooseJourney(button.dataset.journey)));
  document.getElementById('session-select').addEventListener('change',event=>{const s=sessions.find(item=>item.id===event.target.value);document.getElementById('session-summary').textContent=s?`Session ${s.id} · ${s.date} · ${s.title}`:'Choose the seminar you attended.'});
  lookupForm.addEventListener('submit',async event=>{event.preventDefault();const button=lookupForm.querySelector('button');button.disabled=true;button.textContent='Retrieving…';try{const data=new FormData(lookupForm);const result=await request({action:'attendance-lookup',code:data.get('code'),sessionId:data.get('sessionId'),studentId:data.get('studentId')});if(!result.record){document.getElementById('lookup-result').hidden=false;document.getElementById('lookup-result').textContent='No attendance record was found for this student and session.';return}const record=result.record;form.reset();form.elements.sessionId.value=record.sessionId;form.elements.name.value=record.name;form.elements.studentId.value=data.get('studentId');form.elements.code.value=data.get('code');form.elements.attended.checked=true;form.elements.reflection.value=record.reflection||'';form.elements.feedback.value=record.feedback||'';editing=true;lookupCard.hidden=true;card.hidden=false;document.getElementById('form-title').textContent='Update your attendance record.';document.getElementById('session-summary').textContent=`Session ${record.sessionId} · current record retrieved`;form.querySelector('.submit-button').textContent='Save changes →';card.scrollIntoView({behavior:'smooth',block:'start'})}catch(error){showStatus(error.message,'error')}finally{button.disabled=false;button.textContent='Retrieve record →'}});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('.submit-button');button.disabled=true;button.textContent='Saving…';try{const data=new FormData(form);const result=await request({action:'attendance-save',code:data.get('code'),sessionId:data.get('sessionId'),name:data.get('name'),studentId:data.get('studentId'),attended:data.get('attended')==='on',reflection:data.get('reflection'),feedback:data.get('feedback')});card.hidden=true;success.hidden=false;document.getElementById('success-title').textContent=result.updated?'Your attendance was updated.':'You’re marked present.';document.getElementById('success-time').textContent=`Session ${data.get('sessionId')} · saved ${new Date(result.updatedAt).toLocaleString()}`;success.scrollIntoView({behavior:'smooth',block:'center'});form.reset();editing=false}catch(error){showStatus(error.message,'error')}finally{button.disabled=false;button.textContent=editing?'Save changes →':'Save attendance →'}});
  document.getElementById('another-session').addEventListener('click',()=>chooseJourney('new'));
  if(initialSession)chooseJourney('new');
})();
