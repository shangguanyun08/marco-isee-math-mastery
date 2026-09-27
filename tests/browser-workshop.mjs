import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=path.join(root,'tmp','workshop-qa');fs.mkdirSync(qa,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'marco-workshop-test-'));
const base=process.env.MARCO_TEST_URL||'http://127.0.0.1:8766/';
const server=process.env.MARCO_TEST_URL?null:spawn('python',['-m','http.server','8766','--bind','127.0.0.1'],{cwd:root,windowsHide:true,stdio:'ignore'});
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=9225',`--user-data-dir=${profile}`,'--window-size=1440,1200','about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await delay(100);}throw Error('Browser timeout');}
let socket,id=0;const pending=new Map(),errors=[];
async function send(method,params={}){const next=++id;return new Promise((resolve,reject)=>{pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function go(url){await send('Page.navigate',{url});for(let i=0;i<150;i++){await delay(100);if(await evaluate(`location.href===${JSON.stringify(url)} && !!window.__MARCO_REVIEW_TEST__`))return;}throw Error('App timeout '+url);}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(qa,name+'.png'),Buffer.from(r.data,'base64'));}
try{
  const pages=await json('http://127.0.0.1:9225/json/list');socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  socket.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.method==='Runtime.exceptionThrown')errors.push(r.params.exceptionDetails.text);if(pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}});
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  // Never read or mutate the learner's real shared record during automated QA.
  await send('Network.setBlockedURLs',{urls:['*api/shared/progress*','*shared-online-sync.js*']});
  await go(base);
  assert.equal(await evaluate(`document.querySelectorAll('.session-card').length`),6);await shot('library-desktop');
  await go(base+'session-6/');
  assert.equal(await evaluate(`document.querySelectorAll('.part-nav a').length`),4);
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.part`),2);
  assert.match(await evaluate(`document.querySelector('.stage-head .eyebrow').textContent`),/SUB-SESSION 1 OF 4/);
  assert.equal(await evaluate(`document.querySelectorAll('.question').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('.solution').length`),0);
  await shot('practice-welcome-desktop');
  await go(base+'session-6/?part=1');
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.part`),2);
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=reviewed]').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('.solution').length`),0);
  await go(base+'session-6/?part=2');
  await evaluate(`document.querySelector('[data-action=start]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.question').length`),23);
  assert.equal(await evaluate(`document.querySelectorAll('.solution').length`),0);
  await evaluate(`(()=>{const q=MarcoQuestionBank.make(101,0),f=document.querySelector('form[data-id="101"]');f.querySelector('input[value="'+((q.correct+1)%4)+'"]').click();f.requestSubmit();})()`);
  assert.match(await evaluate(`document.querySelector('#q-101 .feedback').textContent`),/Try again/);
  assert.equal(await evaluate(`document.querySelectorAll('#q-101 .solution, #q-101 .choice.right, #q-101 .quick-method').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('#q-101 input:not(:disabled)').length`),4);
  assert.doesNotMatch(await evaluate(`document.querySelector('#q-101 .source-warning').textContent`),/reflection|1, −3/);
  await evaluate(`document.querySelector('#q-101').scrollIntoView()`);await shot('first-try-hidden');
  await go(base+'session-6/?part=1');
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-2'][0].answers[101].tries.length`),1);
  assert.equal(await evaluate(`document.querySelectorAll('#q-101 .solution').length`),0);
  await evaluate(`document.querySelector('form[data-id="101"]').requestSubmit()`);
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-2'][0].answers[101].tries.length`),1);
  const wrong=await evaluate(`(()=>{const q=MarcoQuestionBank.make(101,0),f=document.querySelector('form[data-id="101"]');f.querySelector('input[value="'+((q.correct+2)%4)+'"]').click();f.requestSubmit();return {feedback:document.querySelector('#q-101 .feedback').textContent,solution:document.querySelector('#q-101 .solution').textContent};})()`);
  assert.match(wrong.feedback,/Not quite/);assert.match(wrong.solution,/1, −3/);
  assert.match(wrong.solution,/TRICK \/ QUICK METHOD/);
  assert.equal(await evaluate(`document.querySelector('#q-101 .quick-method').textContent`),await evaluate(`MarcoQuestionBank.make(101,0).tip`));
  await evaluate(`(()=>{const q=MarcoQuestionBank.make(102,0),f=document.querySelector('form[data-id="102"]');f.querySelector('input[value="'+q.correct+'"]').click();f.requestSubmit();})()`);
  assert.match(await evaluate(`document.querySelector('#q-102 .feedback').textContent`),/Correct/);
  assert.equal(await evaluate(`document.querySelector('#q-102 .quick-method').innerHTML`),await evaluate(`MarcoVisuals.math(MarcoQuestionBank.make(102,0).tip)`));
  await evaluate(`(()=>{const q=MarcoQuestionBank.make(103,0);let f=document.querySelector('form[data-id="103"]');f.querySelector('input[value="'+((q.correct+1)%4)+'"]').click();f.requestSubmit();f=document.querySelector('form[data-id="103"]');f.querySelector('input[value="'+q.correct+'"]').click();f.requestSubmit();})()`);
  assert.match(await evaluate(`document.querySelector('#q-103 .feedback').textContent`),/Correct on try 2/);
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.engine.stats(__MARCO_REVIEW_TEST__.getState().learning.runs['6-2'][0]).correct`),1);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#q-101 .choice.wrong')).backgroundColor`),'rgb(255, 240, 234)');
  await evaluate(`document.querySelector('#q-101').scrollIntoView()`);await shot('wrong-explanation');
  await send('Page.reload',{ignoreCache:true});
  for(let i=0;i<150;i++){await delay(100);if(await evaluate(`!!window.__MARCO_REVIEW_TEST__`))break;}
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-2'][0].answers[101].correct`),false);
  await go(base+'session-6/?part=3');await evaluate(`document.querySelector('[data-action=start]').click()`);
  const promptA=await evaluate(`document.querySelector('.prompt').textContent`);
  await go(base+'session-6/?part=4');await evaluate(`document.querySelector('[data-action=start]').click()`);
  const promptB=await evaluate(`document.querySelector('.prompt').textContent`);
  // The graph-based first question differs by coordinate values in its visual.
  assert.notEqual(await evaluate(`JSON.stringify(MarcoQuestionBank.make(101,1).visual)`),await evaluate(`JSON.stringify(MarcoQuestionBank.make(101,2).visual)`));
  await go(base+'session-6/?part=5');assert.equal(await evaluate(`document.querySelectorAll('.question').length`),0);
  await evaluate(`document.querySelector('[data-action=start]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.question').length`),23);
  const deadline=await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-5'][0].deadlineAt`);
  assert.ok(deadline-Date.now()>22*60000);assert.equal(await evaluate(`document.querySelectorAll('.solution').length`),0);
  await evaluate(`document.querySelector('form[data-id="101"] input').click()`);
  await evaluate(`document.querySelector('textarea[data-work="101"]').value='My saved steps';document.querySelector('textarea[data-work="101"]').dispatchEvent(new Event('input',{bubbles:true}))`);
  await shot('timer-desktop');
  await go(base);assert.equal(await evaluate(`document.querySelector('#timers').hidden`),false);
  await go(base+'session-6/?part=5');assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-5'][0].deadlineAt`),deadline);
  assert.equal(await evaluate(`document.querySelector('textarea[data-work="101"]').value`),'My saved steps');
  await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-5'][0].deadlineAt=Date.now()-1`);await delay(700);
  assert.equal(await evaluate(`document.querySelectorAll('.solution').length`),23);
  assert.equal(await evaluate(`document.querySelectorAll('.quick-method').length`),23);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.quick-method')).every(el=>el.textContent.trim().length>12)`),true);
  assert.equal(await evaluate(`document.querySelectorAll('form input:not(:disabled)').length`),0);
  assert.match(await evaluate(`document.querySelector('.completion').textContent`),/Time is up/);
  await evaluate(`document.querySelector('[data-action=repeat]').click()`);
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-5'].length`),2);
  await evaluate(`document.querySelector('[data-action=finish]').click()`);
  assert.equal(await evaluate(`document.querySelector('#finish-dialog').open`),true);
  await evaluate(`document.querySelector('[data-action=confirm-finish]').click()`);
  assert.equal(await evaluate(`__MARCO_REVIEW_TEST__.getState().learning.runs['6-5'][1].completedAt>0`),true);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await go(base);assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);await shot('library-mobile');
  await go(base+'session-1/?part=2');await evaluate(`document.querySelector('[data-action=start]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.question').length`),20);
  await evaluate(`document.querySelector('.question').scrollIntoView()`);await shot('practice-mobile');
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: six subsites, four parts, 20/23 counts, hidden answers, wrong feedback, fresh variants, timer reload/navigation/expiry, repeat history, notes, mobile overflow. Online access blocked.');
}finally{socket?.close();chrome.kill();server?.kill();}
