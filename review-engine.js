(() => {
  'use strict';
  const clone=s=>JSON.parse(JSON.stringify(s));
  const groups=Array.from({length:6},(_,i)=>({number:i+1,ids:window.MARCO_MATH_SOURCES.slice(i*20,i===5?123:(i+1)*20).map(s=>s.id)}));
  const key=(session,part)=>`${session}-${part}`;
  const fresh=()=>({version:1,groupingVersion:2,sessions:{},learning:{version:1,runs:{},reviewed:{}}});
  function migrate(old){const out=clone(old||fresh());out.learning??={version:1,runs:{},reviewed:{}};return out;}
  function start(session,part,now=Date.now(),id=crypto.randomUUID()){
    return {id,session,part,startedAt:now,deadlineAt:part===5?now+groups[session-1].ids.length*60000:null,completedAt:null,answers:{},pending:{},work:{}};
  }
  const questions=(session,part)=>groups[session-1].ids.map(id=>window.MarcoQuestionBank.make(id,part<=2?0:part-2));
  // Older records were already revealed; preserve them as completed answers.
  const resolved=a=>!!a&&(!a.tries||a.correct||a.tries.length>=2);
  const firstCorrect=a=>a.tries?a.tries[0].correct:a.correct;
  function answer(run,id,choice,now=Date.now()){
    if(!run||run.completedAt||run.part===5||resolved(run.answers[id])||!groups[run.session-1].ids.includes(id))return false;
    if(!Number.isInteger(choice)||choice<0||choice>3)return false;
    const q=window.MarcoQuestionBank.make(id,run.part-2);
    const attempt={choice,correct:choice===q.correct,at:now};
    run.answers[id]={...attempt,tries:[...(run.answers[id]?.tries||[]),attempt]};delete run.pending[id];
    if(groups[run.session-1].ids.every(id=>resolved(run.answers[id])))run.completedAt=now;
    return true;
  }
  function finish(run,now=Date.now()){
    if(run.completedAt||run.part!==5)return false;
    const end=run.deadlineAt&&now>=run.deadlineAt?run.deadlineAt:now;
    for(const q of questions(run.session,5)){
      const choice=run.pending[q.id]?.choice??null;
      run.answers[q.id]={choice,correct:choice===q.correct,at:end};
    }
    run.completedAt=end;run.timedOut=!!run.deadlineAt&&now>=run.deadlineAt;
    return true;
  }
  function expire(state,now=Date.now()){let changed=false;for(const runs of Object.values(state.learning.runs))for(const r of runs)if(r.part===5&&!r.completedAt&&r.deadlineAt<=now)changed=finish(r,now)||changed;return changed;}
  const stats=run=>({answered:Object.values(run?.answers||{}).filter(a=>a.choice!==null&&resolved(a)).length,correct:Object.values(run?.answers||{}).filter(firstCorrect).length,total:run?groups[run.session-1].ids.length:0});
  function merge(a,b){
    const out=migrate(b||a),aa=migrate(a),bb=migrate(b);
    // Legacy records keep their original schema and remain separately visible.
    out.sessions={};
    for(const id of new Set([...Object.keys(aa.sessions||{}),...Object.keys(bb.sessions||{})])){
      const candidates=[aa.sessions?.[id],bb.sessions?.[id]].filter(Boolean);
      const weight=s=>(Date.parse(s.updatedAt)||0)+Object.keys(s.answers||{}).length+(s.history||[]).reduce((n,h)=>n+h.total,0);
      candidates.sort((x,y)=>weight(x)-weight(y));out.sessions[id]=clone(candidates.at(-1));
    }
    const reviewed={};for(const id of new Set([...Object.keys(aa.learning.reviewed),...Object.keys(bb.learning.reviewed)]))reviewed[id]=Math.max(aa.learning.reviewed[id]||0,bb.learning.reviewed[id]||0);
    out.learning={version:1,runs:{},reviewed};
    const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16);};
    for(const k of new Set([...Object.keys(aa.learning.runs),...Object.keys(bb.learning.runs)])){
      const groupsByRun=new Map(),output=[];
      for(const raw of [...(aa.learning.runs[k]||[]),...(bb.learning.runs[k]||[])]){
        const r=clone(raw),base=r.id.split('~')[0];if(!groupsByRun.has(base))groupsByRun.set(base,[]);groupsByRun.get(base).push(r);
      }
      const attempts=a=>a.tries||[{choice:a.choice,correct:a.correct,at:a.at}];
      const compatible=(a,b)=>a.tries&&b.tries
        ? attempts(a).slice(0,Math.min(attempts(a).length,attempts(b).length)).every((t,i)=>t.choice===attempts(b)[i].choice&&t.at===attempts(b)[i].at)
        : a.choice===b.choice&&a.at===b.at;
      const signature=r=>JSON.stringify(Object.keys(r.answers).sort((a,b)=>+a-+b).map(id=>[id,attempts(r.answers[id]),r.answers[id].choice]));
      for(const [base,candidates]of groupsByRun){
        const versions=[];candidates.sort((x,y)=>signature(x).localeCompare(signature(y)));
        for(const r of candidates){
          const prior=versions.find(p=>Object.keys(p.answers).every(id=>!r.answers[id]||compatible(p.answers[id],r.answers[id])));
          if(!prior){versions.push(r);continue;}
          for(const [id,a]of Object.entries(r.answers))if(!prior.answers[id]||attempts(a).length>attempts(prior.answers[id]).length)prior.answers[id]=a;
          for(const field of ['pending','work'])for(const [id,value]of Object.entries(r[field]||{}))if(!prior[field]?.[id]||value.at>prior[field][id].at)(prior[field]??={})[id]=value;
          if(r.completedAt){prior.completedAt=Math.min(prior.completedAt||Infinity,r.completedAt);prior.timedOut ||= r.timedOut;}
          if(r.deadlineAt)prior.deadlineAt=Math.min(prior.deadlineAt||Infinity,r.deadlineAt);
        }
        versions.sort((x,y)=>signature(x).localeCompare(signature(y)));
        versions.forEach((r,i)=>{r.id=i?base+'~'+hash(signature(r)):base;if(versions.length>1)r.deviceConflict=true;output.push(r);});
      }
      out.learning.runs[k]=output.sort((x,y)=>x.startedAt-y.startedAt||x.id.localeCompare(y.id));
      for(const r of out.learning.runs[k])if(r.part<5&&!r.completedAt&&groups[r.session-1].ids.every(id=>resolved(r.answers[id])))r.completedAt=Math.max(...Object.values(r.answers).map(a=>a.at));
    }
    return out;
  }
  window.MarcoReviewEngine={groups,key,fresh,migrate,start,questions,answer,finish,expire,stats,merge,resolved,firstCorrect};
})();
