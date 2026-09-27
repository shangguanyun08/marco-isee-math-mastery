(() => {
  const APP='marco-isee-math-mastery',API='https://marco-round1-missed-mastery.alexsoton.chatgpt.site/api/shared/progress?appId='+APP;
  const canonical=s=>JSON.stringify(s,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  function create({getState,onRemote,onStatus,fetcher=window.fetch.bind(window)}){
    let busy=false,timer,stopped=false;
    let device=crypto.randomUUID();try{device=localStorage.getItem(APP+':workshop-device')||device;localStorage.setItem(APP+':workshop-device',device);}catch{}
    async function request(body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);try{const response=await fetcher(API,{method:body?'POST':'GET',cache:'no-store',signal:controller.signal,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});if(!response.ok)throw new Error('Network error');const data=await response.json();if(data.progress?.state?.version!==1&&data.progress)throw new Error('Unrecognized record');return data;}finally{clearTimeout(timeout);}}
    async function refresh(){
      if(busy||stopped)return;busy=true;
      try{
        for(let i=0;i<3;i++){
          const data=await request(),record=data.progress,remote=record?.state||window.MarcoReviewEngine.fresh();
          // Always read and merge BEFORE writing, including the first visit on a new device.
          const next=window.MarcoReviewEngine.merge(getState(),remote);
          if(canonical(next)!==canonical(getState()))onRemote(next);
          if(canonical(next)===canonical(remote)){onStatus('Synced · saved online and on this device.');return;}
          const score=Object.values(next.learning.runs).flat().reduce((n,r)=>n+Object.keys(r.answers).length+Object.keys(r.pending).length+1,0)+Object.values(next.sessions||{}).reduce((n,r)=>n+Object.keys(r.answers||{}).length+(r.history||[]).reduce((a,h)=>a+h.total,0),0);
          const saved=await request({appId:APP,studentName:'Marco',deviceId:device,state:next,progressScore:score,baseVersion:record?.version??null,clientUpdatedAt:new Date().toISOString()});
          if(saved.progress)onRemote(saved.progress.state);
          if(saved.accepted){onStatus('Synced · saved online and on this device.');return;}
        }
        onStatus('Syncing another device’s changes…');
      }catch{onStatus('Offline · saved on this device; online sync will retry.');}
      finally{busy=false;}
    }
    return {start(){onStatus('Connecting online…');timer=setInterval(refresh,4000);window.addEventListener('online',refresh);return refresh();},push:refresh,refresh,stop(){stopped=true;clearInterval(timer);}};
  }
  window.WorkshopSync={create,canonical};
})();
