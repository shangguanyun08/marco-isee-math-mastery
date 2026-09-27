(() => {
  'use strict';
  const E=window.MarcoReviewEngine,V=window.MarcoVisuals,{esc,math}=V,KEY='marco-isee-math-mastery-v1';
  // Preserve stored part IDs and archived part 4 records.
  const parts=[2,3,5];
  const names=['','','Redo the questions','Similar practice','Similar practice B (archived)','Timed challenge'];
  const $=s=>document.querySelector(s),session=Number(document.body.dataset.session)||0;
  const requestedPart=Number(new URLSearchParams(location.search).get('part'));
  const part=requestedPart===4?3:parts.includes(requestedPart)?requestedPart:2;
  const step=parts.indexOf(part)+1,nextPart=parts[step];
  let state=E.fresh(),sync=null,storageOK=true;
  let saveStatus='Saved on this device.';
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1)state=E.migrate(saved);}catch{storageOK=false;}
  const root=session?'../':'./';
  const list=(s=session,p=part)=>state.learning.runs[E.key(s,p)]||[];
  const current=()=>list().at(-1);
  const persist=(upload=true)=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}$('#save-note').textContent=storageOK?saveStatus:'This browser cannot save. Keep this page open and download your records.';if(upload)sync?.push();};
  const source=q=>`${q.subject} · Mock ${q.mock} · Q${q.question}`;
  const date=n=>new Date(n).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  function newRun(){const r=E.start(session,part);(state.learning.runs[E.key(session,part)]??=[]).push(r);persist();render();return r;}
  function statText(s,p){const r=list(s,p).at(-1);if(!r)return 'Not started';const st=E.stats(r);return r.completedAt?`${st.correct}/${st.total} correct`:(p===5?'Timer in progress':`${st.answered}/${st.total} answered`);}
  function legacy(){
    const old=state.sessions||{};const meaningful=Object.entries(old).filter(([,s])=>s.round>0||s.history?.length);
    if(!meaningful.length)return '';
    return `<details class="records legacy"><summary>Previous three-round site · saved records</summary><p>These scores belong to the earlier practice templates. They are kept separately and do not count toward the rebuilt exercises.</p>${meaningful.map(([n,s])=>`<p><strong>Old Session ${esc(n)}</strong> · ${esc(s.status)} · Round ${s.round} · ${Object.keys(s.answers||{}).length} answers saved</p>${(s.history||[]).map(h=>`<p>Round ${h.round}: ${h.correct}/${h.total} correct</p>`).join('')}`).join('')}</details>`;
  }
  function archivedSimilar(){
    const groups=session?[E.groups[session-1]]:E.groups;
    const entries=groups.flatMap(g=>list(g.number,4).map(r=>({g,r})));
    if(!entries.length)return '';
    return `<details class="records archived-similar"><summary>Archived Similar B · saved records (${entries.length})</summary><p>This extra practice set is no longer part of the three-part path. Its answers, scores, and notes are preserved, including in downloaded records.</p>${entries.map(({g,r})=>{
      const st=E.stats(r);
      return `<details><summary>Session ${g.number} · ${date(r.startedAt)} · ${st.correct}/${st.total} first-try points · ${r.completedAt?'Complete':'Previously in progress'}</summary><ol>${E.questions(g.number,4).map(q=>{
        const a=r.answers[q.id],work=r.work?.[q.id]?.text;
        return `<li>${esc(source(q))}: ${a?(a.tries||[a]).map((t,i)=>`Try ${i+1}: ${t.choice===null?'Unanswered':esc('ABCD'[t.choice]+'. '+q.choices[t.choice])} · ${t.correct?'correct':'incorrect'}`).join('; '):'Not checked'}${work?`<p>Notes: ${esc(work)}</p>`:''}</li>`;
      }).join('')}</ol></details>`;
    }).join('')}</details>`;
  }
  function library(){
    $('#breadcrumb').innerHTML='<a href="https://shangguanyun08.github.io/marco-learning-hub/">← Learning hub</a>';
    $('#hero').innerHTML='<p class="eyebrow">MARCO’S MATH WORKSHOP</p><h1>A little practice.<br>A stronger next try.</h1><p class="lead">Six focused sessions. Redo the questions, try a fresh set, and finish with an independent, timed check.</p><div class="hero-facts"><span><b>123</b> source-linked questions</span><span><b>6</b> session subsites</span><span><b>3</b> parts in each</span></div>';
    $('#content').innerHTML=`<section class="section-intro"><h2>Choose your session</h2><p>Start by redoing the questions. Return for a fresh practice set when you’re ready.</p></section><div class="session-grid">${E.groups.map(s=>{const metas=s.ids.map(id=>window.MARCO_MATH_SOURCES[id-1]),subjects=[...new Set(metas.map(m=>m.subject))].join(' + '),cats=[...new Set(metas.map(m=>m.category.split(' & ')[0]))];const done=parts.filter(p=>list(s.number,p).at(-1)?.completedAt).length;return `<a class="session-card" href="session-${s.number}/"><div class="card-top"><span class="session-number">0${s.number}</span><span class="tag">${subjects}</span></div><h2>Session ${s.number}</h2><p>${cats.map(esc).join(' · ')}</p><div class="card-footer"><span>${s.ids.length} questions · ${s.ids.length}-minute final</span><b>Open →</b></div><div class="mini-progress" aria-label="${done} of 3 practice sets complete"><i style="width:${done/3*100}%"></i></div><small>${done}/3 practice sets complete</small></a>`;}).join('')}</div><section class="path-guide"><p class="eyebrow">THE THREE-PART PATH</p><h2>Understand it. Then make it stick.</h2><ol>${parts.map((p,i)=>`<li><span>${i+1}</span><b>${names[p]}</b><p>${['Redo the source questions in clean text.','New numbers, same underlying skills.','One minute per question; answers after submission.'][i]}</p></li>`).join('')}</ol></section><p class="source-note">57 QR + 66 MA source references: 119 incorrect answers and 4 blanks. Wording is rebuilt for readability; some diagrams and visual choices use equivalent text descriptions. Eight items include explicit corrections or clarifications. The similar sets are new practice, not additional original mistakes.</p>${archivedSimilar()}${legacy()}`;
  }
  function stageNav(){return `<nav class="part-nav" aria-label="Session parts">${parts.map((p,i)=>{return `<a href="?part=${p}" class="${part===p?'selected':''}" ${part===p?'aria-current="page"':''}><span>0${i+1}</span><b>${names[p]}</b><small>${statText(session,p)}</small></a>`;}).join('')}</nav>`;}
  function question(q,i,run){
    const answer=run?.answers[q.id],closed=E.resolved(answer)||!!run?.completedAt;
    const pending=run?.pending[q.id],selected=closed?answer?.choice:(!answer||pending?.at>answer.at?pending?.choice:undefined);
    const retry=!!answer&&!closed;
    const solved=closed;const correct=answer?.correct;
    const sourceNote=q.note?(solved?q.note:'This source item needs a correction or clarification. Solve the rebuilt exercise below; the full source note appears with the solution.'):'';
    q={...q,note:sourceNote};
    return `<article class="question ${closed?(correct?'correct':'incorrect'):''}" id="q-${q.id}"><header><div><span class="question-index">${String(i+1).padStart(2,'0')}</span><span class="skill">${esc(q.category)}</span></div><small>${esc(source(q))}${part<=2?' · '+esc(q.sourceStatus):' · New practice'}</small></header>${q.note?`<div class="source-warning"><b>Source note</b><p>${esc(q.note)}</p></div>`:''}<p class="prompt">${math(q.prompt)}</p>${V.visual(q)}${q.columns?`<div class="columns"><div><b>Column A</b><p>${math(q.columns[0])}</p></div><div><b>Column B</b><p>${math(q.columns[1])}</p></div></div>`:''}<form data-id="${q.id}"><fieldset ${closed?'disabled':''}><legend class="sr-only">Choose an answer for question ${i+1}</legend>${q.choices.map((c,j)=>`<label class="choice ${solved&&j===q.correct?'right':''} ${closed&&answer&&j===selected&&!correct?'wrong':''}"><input type="radio" name="q${q.id}" value="${j}" ${selected===j?'checked':''}><span class="letter">${'ABCD'[j]}</span><span>${math(c)}</span></label>`).join('')}</fieldset>${!closed&&part!==5?'<button class="primary check" type="submit">Check answer</button>':''}<p class="feedback" role="status">${closed?(answer?.choice===null?'Unanswered · 0 points':correct?(E.firstCorrect(answer)?'Correct · 1 point':'Correct on try 2 · 0 first-try points'):'Not quite · read the explanation below'):part===5?'Selection saves automatically. Feedback appears when the test ends.':retry?'Not quite. Try again — try 2 of 2. The answer and trick are still hidden.':'Choose an answer, then check.'}</p></form>${solved?`<div class="solution"><p class="solution-label">ANSWER & EXPLANATION</p><p class="solution-label trick-label">TRICK / QUICK METHOD</p><h3 class="quick-method">${math(q.tip)}</h3><p class="correct-answer"><b>${'ABCD'[q.correct]}.</b> ${math(q.answer)}</p><p>${math(q.explanation)}</p></div>`:''}<details class="scratch"><summary>My working / notes</summary><label class="sr-only" for="work-${q.id}">Working for question ${i+1}</label><textarea id="work-${q.id}" data-work="${q.id}" maxlength="3000" placeholder="Write your steps here…">${esc(run?.work[q.id]?.text||'')}</textarea></details></article>`;
  }
  function subsite(){
    const group=E.groups[session-1],count=group.ids.length,run=current(),st=E.stats(run);
    $('#breadcrumb').innerHTML=`<a href="../">← All six sessions</a><span>/</span><span>Session ${session}</span>`;
    $('#hero').innerHTML=`<p class="eyebrow">SESSION ${String(session).padStart(2,'0')} · ${count} QUESTIONS</p><h1>Your three-part<br>practice path.</h1><p class="lead">Redo the problem. Try a similar question. Finish with a ${count}-minute challenge.</p>`;
    let body=stageNav()+`<section class="stage-head" id="stage"><div><p class="eyebrow">SUB-SESSION ${step} OF 3</p><h2>${names[part]}</h2><p>${part===2?'Redo all the source-linked questions. A first wrong answer gets one more try. The answer, trick, and explanation appear when you solve it or after your second try.':part===5?`${count} new questions. One ${count}-minute timer covers the whole test. No solutions until you finish or time runs out.`:'A complete set of new questions matched one-to-one to this session’s source questions.'}</p></div>${run?`<div class="score"><b>${part===5&&!run.completedAt?'—':st.correct+'/'+count}</b><span>${part===5&&!run.completedAt?'Score after finish':'First-try score'}</span></div>`:''}</section>`;
    if(!run){body+=`<div class="start-panel"><p>${part===5?'Start only when you have enough uninterrupted time. The timer continues if you reload, switch parts, or leave the page.':'A correct first answer earns the point. If you miss it, try once more: no answer, trick, or explanation is shown until your second try. A correct answer ends the question. All questions in this set are included.'}</p><button class="primary" data-action="start">${part===5?'Start '+count+'-minute test':'Start this practice'}</button></div>`;}
    else {
      const qs=E.questions(session,part);
      body+=`<nav class="jump" aria-label="Question navigation">${qs.map((q,i)=>`<a href="#q-${q.id}" class="${run?.answers[q.id]?(run.answers[q.id].correct?'right':'wrong'):''}">${i+1}</a>`).join('')}</nav>`;
      if(run?.completedAt)body+=`<section class="completion" role="status"><h2>${run.timedOut?'Time is up.':'Practice complete.'}</h2><p><strong>${st.correct} / ${count}</strong> correct on the first try (${Math.round(st.correct/count*100)}%). ${count-st.correct} to review. Your results are saved.</p></section>`;
      body+=`<div id="questions">${qs.map((q,i)=>question(q,i,run)).join('')}</div>`;
      if(part===5&&!run.completedAt)body+='<div class="next-panel"><button class="primary" data-action="finish">Finish & score timed test</button></div>';
      if(run?.completedAt)body+=`<div class="next-panel">${nextPart?`<a class="primary" href="?part=${nextPart}">Next: ${names[nextPart]} →</a>`:'<a class="primary" href="../">Return to sessions →</a>'}<button class="secondary" data-action="repeat">Start another attempt</button></div>`;
    }
    if(list().length)body+=`<details class="records"><summary>Saved attempts (${list().length})</summary>${list().map((r,i)=>{const s=E.stats(r);return `<details><summary>Attempt ${i+1} · ${date(r.startedAt)} · ${r.completedAt?s.correct+'/'+count+' correct':'In progress'}${r.deviceConflict?' · separate device attempt':''}</summary><ol>${E.questions(session,part).map(q=>{const a=r.answers[q.id];return `<li>${esc(source(q))}: ${a?(a.choice===null?'Unanswered':`${'ABCD'[a.choice]} · ${a.correct?'correct':'incorrect'}${a.tries?' · try '+a.tries.length+(E.resolved(a)?'':' · retry available'):''}`):'Not checked'}</li>`;}).join('')}</ol></details>`;}).join('')}</details>`;
    $('#content').innerHTML=body+archivedSimilar();
    document.title=`Session ${session} · ${names[part]} · Marco’s Math Workshop`;
  }
  function timers(){
    const active=Object.values(state.learning.runs).flat().filter(r=>r.part===5&&!r.completedAt);
    $('#timers').hidden=!active.length;
    $('#timers').innerHTML=active.map(r=>{const sec=Math.max(0,Math.ceil((r.deadlineAt-Date.now())/1000));return `<a href="${root}session-${r.session}/?part=5" class="${sec<=60?'urgent':''}"><span>Session ${r.session} · Timed challenge</span><strong>${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</strong><span>remaining →</span></a>`;}).join('');
  }
  function render(){if(session)subsite();else library();timers();}
  function tick(){if(E.expire(state)){persist();render();}else timers();}
  function finishDialog(){const r=current(),count=E.groups[session-1].ids.length,selected=Object.keys(r.pending).length;const d=$('#finish-dialog');$('#finish-message').textContent=`${selected} of ${count} questions have an answer selected. Finishing locks your answers; ${count-selected} blank question(s) earn zero.`;d.showModal();}
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='start'||action==='repeat'){if(action==='start'&&current())return;newRun();$('#stage').scrollIntoView();}
    if(action==='finish')finishDialog();
    if(action==='confirm-finish'){E.finish(current());$('#finish-dialog').close();persist();render();$('#stage').scrollIntoView();}
    if(action==='cancel-finish')$('#finish-dialog').close();
    if(action==='download'){const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='marco-math-workshop-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if(action==='large'){document.body.classList.toggle('large');event.target.setAttribute('aria-pressed',String(document.body.classList.contains('large')));}
  });
  document.addEventListener('change',event=>{
    const input=event.target;if(input.matches('input[type=radio]')){const r=current();if(!r||r.completedAt)return;tick();if(r.completedAt)return;r.pending[Number(input.closest('form').dataset.id)]={choice:Number(input.value),at:Date.now()};persist();}
  });
  document.addEventListener('input',event=>{const id=event.target.dataset.work;if(id&&current()){current().work[id]={text:event.target.value,at:Date.now()};persist();}});
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('form[data-id]'))return;event.preventDefault();const r=current(),id=Number(form.dataset.id),selected=form.querySelector('input:checked');
    if(!selected){form.querySelector('.feedback').textContent='Choose an answer first. No attempt used.';return;}
    if(E.answer(r,id,Number(selected.value))){const y=window.scrollY;persist();render();window.scrollTo(0,y);}
  });
  function applyRemote(remote){state=E.merge(state,remote);persist(false);const focused=document.activeElement?.dataset.work;if(!focused)render();tick();}
  window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue)try{const remote=JSON.parse(event.newValue);if(remote?.version===1)applyRemote(remote);}catch{}});
  const local=['localhost','127.0.0.1'].includes(location.hostname)||location.protocol==='file:';
  if(!local&&window.WorkshopSync)sync=window.WorkshopSync.create({getState:()=>state,onRemote:applyRemote,onStatus:message=>{saveStatus=message;persist(false);}});
  render();tick();persist(false);sync?.start();setInterval(tick,500);
  window.__MARCO_REVIEW_TEST__={getState:()=>state,session,part,engine:E};
})();
