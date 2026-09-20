import subprocess,json,pathlib,sys,os
root=pathlib.Path(__file__).resolve().parent.parent
out=pathlib.Path(os.environ.get('KE1_TEST_OUTPUT','output/playwright/ke1-fixes'));out.mkdir(parents=True,exist_ok=True)
cli=([os.environ['PWCLI']] if os.environ.get('PWCLI') else ['npx','--yes','--package','@playwright/cli','playwright-cli'])+['-s=ke1-regression']
url=os.environ.get('KE1_TEST_URL','http://127.0.0.1:8769/ke1/')
fixture=(root/'tests/firebase-fixture.js').read_text()
results={}
def call(cmd,code):
 p=subprocess.run(cli+[cmd,code],capture_output=True,text=True)
 if '### Error' in p.stdout: raise RuntimeError(p.stdout)
 if '### Result\n' in p.stdout:
  s=p.stdout.split('### Result\n',1)[1].split('\n### ',1)[0]
  try:return json.loads(s)
  except:return s
 return p.stdout

def run(name,body):
 wrapper='''async(page)=>{const checks=[];const check=(name,ok,details)=>{checks.push({name,pass:!!ok,details});if(!ok)throw Error(name+': '+JSON.stringify(details));};'''+body+''';await page.evaluate(checks=>window.__checks=checks,checks);}'''
 try:
  call('run-code',wrapper)
  results[name]=call('eval','window.__checks')
  print(name,json.dumps(results[name],ensure_ascii=False),flush=True)
 except Exception as e:
  results[name]={'error':str(e)};print(name,str(e),flush=True)
 finally:(out/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))

def setup(config=None,block_sdk=False,delay=0,block_images=False):
 code='async(page)=>{await page.unrouteAll({behavior:"wait"});await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>sessionStorage.setItem("ke1-test-clear","1"));await page.goto("about:blank");await page.addInitScript(()=>{if(sessionStorage.getItem("ke1-test-clear")){localStorage.clear();sessionStorage.removeItem("ke1-test-clear");}});'
 if block_sdk:code+='await page.route("**/firebase*-compat.js",route=>route.abort());'
 else:
  body='window.__fixtureConfig='+json.dumps(config or {})+';\n'+fixture
  code+='await page.route("**/firebase*-compat.js",route=>route.fulfill({contentType:"application/javascript",body:'+json.dumps(body)+'}));'
 if delay:code+='await page.route("**/data/questions.json*",async route=>{await page.waitForTimeout('+str(delay)+');await route.continue();});'
 if block_images:code+='await page.route("**/images/**",route=>route.abort());'
 code+='await page.goto('+json.dumps(url)+');await page.locator(".option").first().waitFor();await page.waitForTimeout(100);}'
 call('run-code',code)

call('open',url)
setup(block_sdk=True)
run('guest_and_sdk_failure', '''
check('guest starts with SDK blocked',await page.locator('.option').count()===2);
await page.locator('[data-label="B"]').click();
await page.reload();await page.locator('.option').first().waitFor();
check('guest answer survives refresh',await page.locator('#done').innerText()==='1');
check('answer remains visible after refresh',(await page.locator('#feedback-label').innerText()).includes('回答正确'));
await page.locator('#next').click();
check('no stale image on text-only question',await page.locator('#question-image').isHidden());
for(const value of ['1.5','0','-1','999999']){await page.locator('#jump-input').fill(value);await page.locator('#jump').click();check('reject '+value,await page.locator('#number').innerText()==='0002 / 2847');}
await page.locator('#jump-input').fill('2847');await page.locator('#jump').click();await page.locator('.option').first().click();await page.locator('#next').click();
check('last question is not all complete',(await page.locator('#practice-message').innerText()).includes('题未答'));
''')
setup()
run('review_and_layout', '''
const choices=['A','A','A','B','B','B','A'];
for(let i=0;i<choices.length;i++){await page.locator('[data-label="'+choices[i]+'"]').click();if(i<choices.length-1)await page.locator('#next').click();}
check('seven wrong counted',await page.locator('#wrong-count').innerText()==='7 题');
await page.locator('#wrong-next').click();check('remaining wrong answers accessible',await page.locator('.wrong-item').count()===2);
await page.locator('#review-wrong').click();
check('review hides answer',!(await page.locator('#feedback').getAttribute('class')).includes('show'));
await page.locator('[data-label="B"]').click();
check('corrected question removed from wrong book',await page.locator('#wrong-count').innerText()==='6 题');
check('first attempt score preserved',await page.locator('#score').innerText()==='首次正确率 0%');
await page.locator('#next').click();check('next wrong question can be answered',await page.locator('.option:not(:disabled)').count()===2);
await page.locator('#exit-review').click();
for(const width of [320,375,390,430,768,780,781,1024,1440]){await page.setViewportSize({width,height:844});const d=await page.evaluate(()=>({width:document.querySelector('.practice').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(document.querySelector('.layout')).gridTemplateColumns}));check('layout '+width,!d.overflow&&d.width>240,d);}
await page.setViewportSize({width:667,height:375});await page.locator('#account-button').click();await page.locator('#auth-email').fill('audit@example.invalid');await page.locator('#auth-password').fill('Audit123');
await page.locator('#auth-submit').scrollIntoViewIfNeeded();const rect=await page.locator('#auth-submit').boundingBox();check('short dialog can reach submit',rect.y>=0&&rect.y+rect.height<=375,rect);
await page.keyboard.press('Escape');check('Escape closes dialog',!(await page.locator('#auth-screen').evaluate(el=>el.open)));
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'readFail':True})
run('read_failure_write_gate', '''
check('read failure shown',(await page.locator('#status').innerText()).includes('读取失败'));
await page.locator('[data-label="B"]').click();await page.locator('#next').click();await page.waitForTimeout(1400);
check('no cloud write after read failure',await page.evaluate(()=>__mock.writes.length)===0);
check('pending answers durable',await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ke1:v2:user:audit-user')).pending).length)===1);
await page.evaluate(()=>__mock.readFail=false);await page.locator('#retry-sync').click();await page.waitForTimeout(1000);
check('pending work uploads after successful retry',await page.evaluate(()=>__mock.writes.length)>0);
check('no empty answer maps',await page.evaluate(()=>__mock.writes.every(w=>!('answers' in w.data.ke1Progress)||Object.keys(w.data.ke1Progress.answers).length>0)));
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'documents':{'audit-user':{'ke1Progress':{'index':123,'answers':{}}}}},delay=700)
run('restore_and_logout', '''
check('restore waits for bank',await page.locator('#number').innerText()==='0124 / 2847');
await page.locator('.option').first().click();await page.evaluate(()=>__mock.writePending=true);await page.waitForTimeout(1500);
await page.locator('#logout').click();
check('logout not blocked by pending write',await page.locator('#account-button').innerText()==='登录同步');
check('logout resets displayed question',await page.locator('#number').innerText()==='0001 / 2847');
check('logout clears displayed account stats',await page.locator('#done').innerText()==='0');
await page.locator('.option:not(:disabled)').first().waitFor();check('guest can answer after logout',await page.locator('.option:not(:disabled)').count()===2);
''')
setup()
run('guest_import_and_delta_sync', '''
await page.locator('[data-label="B"]').click();await page.locator('#account-button').click();await page.locator('#auth-email').fill('audit@example.invalid');await page.locator('#auth-password').fill('Audit123');await page.locator('#auth-submit').click();await page.waitForTimeout(1200);
check('guest answer imported',await page.locator('#done').innerText()==='1');
check('guest original cleared after durable account copy',await page.evaluate(()=>localStorage.getItem('ke1:v2:guest')===null));
check('one restore read before transaction',await page.evaluate(()=>__mock.reads)===2);
await page.locator('#next').click();await page.locator('[data-label="B"]').click();await page.waitForTimeout(4300);
const sizes=await page.evaluate(()=>__mock.writes.map(w=>Object.keys(w.data.ke1Progress.answers||{}).length));check('writes only changed answers',sizes.length===2&&sizes.every(n=>n===1),sizes);
const ids=await page.evaluate(()=>Object.keys(__mock.documents['audit-user'].ke1Progress.answers));check('different answers both retained',ids.length===2,ids);
''')
setup({'verifyFail':True})
run('verification_recovery', '''
await page.locator('#account-button').click();await page.locator('#register-tab').click();check('registration password autocomplete',await page.locator('#auth-password').getAttribute('autocomplete')==='new-password');
await page.locator('#auth-email').fill('audit@example.invalid');await page.locator('#auth-password').fill('Audit123');await page.locator('#auth-submit').click();
check('created account mail failure explained',(await page.locator('#auth-message').innerText()).includes('账号已创建'));
check('resend remains available',await page.locator('#resend-verification').isVisible());await page.evaluate(()=>__mock.verifyFail=false);await page.locator('#resend-verification').click();
check('verification can be resent',(await page.locator('#auth-message').innerText()).includes('已发送'));
await page.evaluate(()=>__mock.verifyNow=true);await page.locator('#check-verification').click();check('verified account continues',await page.locator('#account-button').innerText()==='audit@example.invalid');
''')
setup(block_images=True)
run('image_failure', '''
check('image failure explained',(await page.locator('#image-message').innerText()).includes('加载失败'));
check('cannot blindly answer',await page.locator('.option:not(:disabled)').count()===0);
await page.locator('#skip').click();check('can skip failed image',await page.locator('#number').innerText()==='0002 / 2847');
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True}})
run('remote_updates_and_transaction_merge','''
await page.locator('[data-label="B"]').click();
await page.evaluate(()=>{__mock.documents['audit-user']={ke1Progress:{schemaVersion:2,answers:{'20190410102519yrnimy89cdwhwp5ta1zq6e':{choice:'B',firstChoice:'B',updatedAt:Date.now(),firstAt:Date.now(),operationId:'other-device'}}}};__mock.emit();});
check('live remote answer joins local pending',await page.locator('#done').innerText()==='2');
await page.waitForTimeout(1500);
check('transaction preserves both devices',await page.evaluate(()=>Object.keys(__mock.documents['audit-user'].ke1Progress.answers).length)===2);
check('combined statistics calculated',await page.locator('#score').innerText()==='首次正确率 100%');
check('acknowledged queue emptied',await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ke1:v2:user:audit-user')).pending).length)===0);
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'writeFail':True})
run('write_failure_reload_retry','''
await page.locator('[data-label="B"]').click();await page.waitForTimeout(1500);
check('write failure visible',(await page.locator('#status').innerText()).includes('同步失败'));
await page.reload();await page.locator('.option').first().waitFor();await page.waitForTimeout(900);
check('failed upload survives reload',await page.locator('#done').innerText()==='1');
await page.evaluate(()=>__mock.writeFail=false);await page.locator('#retry-sync').click();await page.waitForTimeout(100);
check('explicit retry succeeds',(await page.locator('#status').innerText()).includes('云端已同步'));
''')
setup({'user':{'uid':'user-A','email':'a@example.invalid','emailVerified':True},'readDelayMs':500,'documents':{'user-A':{'ke1Progress':{'index':123,'answers':{}}},'user-B':{'ke1Progress':{'index':7,'answers':{}}}}})
run('account_switch_cancels_old_restore','''
await page.evaluate(()=>{__mock.readDelayMs=0;__mock.user={uid:'user-B',email:'b@example.invalid',emailVerified:true};__mock.authCallback(__mock.user);});await page.waitForTimeout(650);
check('new account identity stays active',await page.locator('#account-button').innerText()==='b@example.invalid');
check('old delayed read cannot replace new position',await page.locator('#number').innerText()==='0008 / 2847');
await page.evaluate(()=>{__mock.user=null;__mock.authCallback(null);});await page.waitForTimeout(50);
check('external signout updates UI',await page.locator('#account-button').innerText()==='登录同步');
check('external signout removes user data',await page.locator('#done').innerText()==='0');
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'documents':{'audit-user':{'ke1Progress':{'index':-5,'answers':{'junk':{'choice':'Z'}},'correct':999999}}}})
run('corrupt_progress','''
check('negative saved index recovers',await page.locator('#number').innerText()==='0001 / 2847');
check('invalid answer IDs filtered',await page.locator('#done').innerText()==='0');
check('stored total not trusted',await page.locator('#score').innerText()==='首次正确率 —');
''')
setup()
run('storage_unavailable','''
await page.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});
await page.locator('[data-label="B"]').click();
check('storage failure is explicit',(await page.locator('#status').innerText()).includes('本机保存不可用'));
check('does not falsely claim local save',!(await page.locator('#status').innerText()).includes('已保存在本机'));
check('backup offered',await page.locator('#export-progress').isVisible());
await page.evaluate(()=>Storage.prototype.setItem=window.__originalSetItem);
''')
setup()
run('modal_focus_and_repeat_round','''
await page.locator('#account-button').click();
for(let i=0;i<16;i++){await page.keyboard.press('Tab');check('focus trapped '+i,await page.evaluate(()=>document.querySelector('#auth-screen').contains(document.activeElement)));}
await page.keyboard.press('Escape');check('focus returns to opener',await page.evaluate(()=>document.activeElement.id)==='account-button');
await page.locator('[data-label="B"]').click();await page.locator('#restart-practice').click();
check('new round starts with choices unlocked',await page.locator('.option:not(:disabled)').count()===2);
check('new round hides previous explanation',!(await page.locator('#feedback').getAttribute('class')).includes('show'));
await page.locator('#exit-review').click();await page.locator('#practice-new').click();check('supplement preserved',(await page.locator('#type').innerText()).includes('补充练习'));check('latest 73-question shortcut preserved',(await page.locator('#practice-new').innerText()).includes('73')&&(await page.locator('#number').innerText())==='2775 / 2847');
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'documents':{'audit-user':{'ke1Progress':{'index':123,'answers':{}}}}})
run('legacy_position_after_first_save','''
await page.locator('.option').first().click();await page.waitForTimeout(1500);
const data=await page.evaluate(()=>({remote:__mock.documents['audit-user'].ke1Progress,local:JSON.parse(localStorage.getItem('ke1:v2:user:audit-user'))}));
check('first write upgrades position to stable ID',data.remote.schemaVersion===2&&data.remote.currentId===data.local.currentId,data.remote.currentId);
check('restored question stays stable after sync',await page.locator('#number').innerText()==='0124 / 2847');
''')
setup({'user':{'uid':'audit-user','email':'audit@example.invalid','emailVerified':True},'writePending':True})
run('new_answer_during_inflight_sync','''
await page.locator('[data-label="B"]').click();await page.waitForTimeout(1500);
await page.locator('#next').click();await page.locator('[data-label="B"]').click();
await page.evaluate(()=>{__mock.writePending=false;__mock.resolveWrite();});await page.waitForTimeout(1600);
check('later answer scheduled after inflight write',await page.evaluate(()=>Object.keys(__mock.documents['audit-user'].ke1Progress.answers).length)===2);
check('later pending queue acknowledged',await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ke1:v2:user:audit-user')).pending).length)===0);
''')
if any(isinstance(r,dict) and 'error' in r for r in results.values()):sys.exit(1)