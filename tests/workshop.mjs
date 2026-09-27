import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const box={window:null,crypto:webcrypto,console};box.window=box;vm.createContext(box);
for(const f of ['sources.js','question-bank.js','review-engine.js','review-visuals.js'])vm.runInContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),box);
const B=box.MarcoQuestionBank,E=box.MarcoReviewEngine;
assert.equal(E.groups.map(g=>g.ids.length).join(','),'20,20,20,20,20,23');
assert.equal(new Set(E.groups.flatMap(g=>g.ids)).size,123);
const all=[];
for(let id=1;id<=123;id++)for(let v=0;v<4;v++){
  const q=B.make(id,v);all.push(q);
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.equal(q.choices[q.correct],q.answer);
  assert.ok(q.explanation.length>20);assert.ok(q.tip.length>12);
  assert.doesNotMatch(JSON.stringify(q),/Choice \d|undefined|NaN|Infinity|<img/i);
  assert.ok(box.MarcoVisuals.visual(q)!==undefined);
}
const originals={1:'3',2:'Column A is greater',3:'The quantities are equal',4:'-5',5:'Column A is greater',6:'Column A is greater',7:'Column B is greater',9:'6',11:'105',12:'$4.00',13:'Column A is greater',14:'The quantities are equal',15:'Column B is greater',16:'The quantities are equal',17:'Cannot be determined',18:'Column B is greater',19:'Column A is greater',20:'7',23:'46',27:'Column B is greater',28:'plus',29:'Column A is greater',30:'Column B is greater',31:'Cannot be determined',33:'Column B is greater',34:'The quantities are equal',35:'1:9',36:'The quantities are equal',37:'Column A is greater',38:'100°',39:'The quantities are equal',40:'Column B is greater',41:'7.5',42:'-15',43:'$7.50',44:'$187.50',45:'2',46:'Column A is greater',47:'Cannot be determined',48:'34',49:'Cannot be determined',50:'35',51:'Cannot be determined',52:'Column B is greater',53:'Column B is greater',54:'4/25',55:'Column B is greater',56:'Column A is greater',57:'Column A is greater',58:'16665',59:'48/25',60:'12',61:'63/2',63:'0.1205',64:'80',65:'2.89 × 10^5',66:'5/12',67:'150%',68:'16',69:'3/10',70:'$14000.00',71:'32%',72:'3.75 mph',73:'12',74:'3/40',76:'4/7',77:'5',80:'5/3',81:'-5/2',84:'-6',85:'6',86:'9',92:'2',94:'upper-right',96:'36 − 9π cm²',97:'216',98:'96',99:'9',100:'30',101:'(1, −3)',102:'12.5',103:'20',105:'Rhombus',106:'$80000.00',109:'84%',110:'4',111:'18',112:'3.6',113:'4.5',115:'1/48',118:'2/3',119:'48',120:'4',122:'1 − P(A)',123:'5/16'};
for(const [id,answer]of Object.entries(originals))assert.equal(B.make(+id,0).answer,answer,`Original ${id}`);
// Independent numeric checks on all fresh counterparts for the arithmetic/algebra core.
for(let v=0;v<4;v++){
  const checks={9:6+2*v,20:7+v,23:1+(10+v)*(9+v)/2,42:(8+v)*(6+v)-(7+v)*(9+v),48:(9+v)*(2+2*v)-(8+v)*(-2+v),50:5*(55+2*v)-4*(60+3*v),58:16665+333*v,60:12+4*v,68:16+2*v,73:12+6*v,77:5+v,84:-3*(2+v),85:6+v,86:(3*(4+2*v)+6+2*v)/2,92:2+v,97:(6+v)**3,98:(6+3*v)**2*(8+v)/3,99:(24+8*v)*(3+v)/8,100:90/(3+v),102:(6.25+v)*(4+2*v)/2,103:20+v,110:4+v,111:18+2*v,113:4.5+v,119:(4+v)*(4+v)*(3+v),120:4+v};
  for(const [id,a]of Object.entries(checks))assert.ok(Math.abs(+B.make(+id,v).answer-a)<1e-6,`${id}/${v}`);
}
// Original references are unchanged and all four previously blank questions are labeled.
assert.equal(all.filter(q=>q.variant===0&&q.sourceStatus==='Previously blank').length,4);
assert.equal(all.filter(q=>q.variant===0&&q.note).length,8);
for(let s=1;s<=6;s++)for(let p=2;p<=5;p++){
  const r=E.start(s,p,1000,`test-${s}-${p}`),qs=E.questions(s,p);
  assert.equal(qs.length,s===6?23:20);
  if(p<5){for(const q of qs)assert.equal(E.answer(r,q.id,q.correct,2000),true);assert.equal(E.stats(r).correct,qs.length);assert.equal(E.answer(r,qs[0].id,0),false);assert.ok(r.completedAt);}
  else{assert.equal(r.deadlineAt,1000+qs.length*60000);r.pending[qs[0].id]={choice:qs[0].correct,at:2000};const state=E.fresh();state.learning.runs[E.key(s,p)]=[r];assert.equal(E.expire(state,r.deadlineAt-1),false);assert.equal(E.expire(state,r.deadlineAt),true);assert.equal(E.stats(r).correct,1);assert.equal(E.stats(r).answered,1);assert.equal(Object.keys(r.answers).length,qs.length);assert.equal(E.finish(r),false);}
}
const old={version:1,groupingVersion:2,sessions:{1:{status:'active',round:2,answers:{1:{choice:'B',correct:true}},history:[{round:1,total:20,correct:18,wrongIds:[1,2]}]}}};
// Two-try practice: no early completion/reveal, first-try scoring, and prefix-safe sync.
for(let part=2;part<=4;part++){
  const state=E.fresh(),run=E.start(1,part,1000,'retry-test');state.learning.runs[E.key(1,part)]=[run];
  const qs=E.questions(1,part),q=qs[0],wrong=(q.correct+1)%4;
  assert.equal(E.answer(run,q.id,wrong,1100),true);
  assert.equal(E.resolved(run.answers[q.id]),false);assert.equal(E.stats(run).answered,0);
  const first=E.migrate(state);
  for(const other of qs.slice(1))E.answer(run,other.id,other.correct,1200);
  assert.equal(run.completedAt,null);
  assert.equal(E.merge(state,first).learning.runs[E.key(1,part)][0].completedAt,null);
  assert.equal(E.answer(run,q.id,q.correct,1300),true);
  assert.equal(E.resolved(run.answers[q.id]),true);assert.equal(E.stats(run).correct,19);
  assert.equal(run.answers[q.id].tries.length,2);assert.ok(run.completedAt);
  assert.equal(E.answer(run,q.id,wrong,1400),false);
  for(const merged of [E.merge(first,state),E.merge(state,first)]){
    const runs=merged.learning.runs[E.key(1,part)];assert.equal(runs.length,1);
    assert.equal(runs[0].answers[q.id].tries.length,2);assert.equal(E.stats(runs[0]).correct,19);
  }
  const other=E.migrate(first),r=other.learning.runs[E.key(1,part)][0];E.answer(r,q.id,wrong,1400);
  assert.equal(E.resolved(r.answers[q.id]),true);assert.equal(E.stats(r).correct,0);
  assert.equal(E.merge(state,other).learning.runs[E.key(1,part)].length,2);
}
assert.equal(E.resolved({choice:0,correct:false,at:100}),true);
const migrated=E.migrate(old);assert.equal(JSON.stringify(migrated.sessions),JSON.stringify(old.sessions));
const a=E.migrate(old),r=E.start(1,2,1000,'same-run');a.learning.runs['1-2']=[r];E.answer(r,1,B.make(1).correct,1100);
const b=E.migrate(old);b.learning.runs['1-2']=[E.start(1,2,1000,'same-run')];E.answer(b.learning.runs['1-2'][0],2,B.make(2).correct,1200);
const merged=E.merge(a,b);assert.equal(Object.keys(merged.learning.runs['1-2'][0].answers).length,2);assert.equal(JSON.stringify(merged.sessions),JSON.stringify(old.sessions));
const conflict=E.migrate(a);conflict.learning.runs['1-2'][0].answers[1].choice=(B.make(1).correct+1)%4;conflict.learning.runs['1-2'][0].answers[1].tries[0].choice=(B.make(1).correct+1)%4;assert.equal(E.merge(a,conflict).learning.runs['1-2'].length,2);
// First-visit sync must read and preserve the learner's earlier record.
Object.assign(box,{setTimeout,clearTimeout,AbortController,setInterval:()=>0,clearInterval:()=>{},localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:()=>{}});
vm.runInContext(fs.readFileSync(new URL('../workshop-sync.js',import.meta.url),'utf8'),box);
let local=E.fresh(),server={state:old,version:7},posted=null;
const sync=box.WorkshopSync.create({getState:()=>local,onRemote:s=>{local=E.merge(local,s)},onStatus:()=>{},fetcher:async(url,options)=>{
  if(options.method==='POST'){posted=JSON.parse(options.body);assert.equal(posted.baseVersion,7);server={state:posted.state,version:8};return {ok:true,json:async()=>({accepted:true,progress:server})};}
  return {ok:true,json:async()=>({progress:server})};
}});
await sync.refresh();assert.ok(posted);assert.equal(JSON.stringify(posted.state.sessions),JSON.stringify(old.sessions));
assert.equal(JSON.stringify(local.sessions),JSON.stringify(old.sessions));
for(let id=1;id<=123;id++){
  const fingerprint=q=>JSON.stringify([q.prompt,q.columns,q.table,q.visual,q.options]);
  assert.equal(new Set([0,1,2,3].map(v=>fingerprint(B.make(id,v)))).size,4,`Repeated counterpart ${id}`);
}
console.log('PASS: 492 source-linked questions; six groups; source answers; numeric variants; scoring; timers; legacy preservation; merge; read-before-write sync.');
