(() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const math=s=>esc(s).replace(/\^(\d+)/g,'<sup>$1</sup>').replace(/(?<![\w.])(\d+)\/(\d+)(?![\w.])/g,'<span class="fraction"><span>$1</span><span>$2</span></span>');
  const text=(x,y,s,size=14)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${esc(s)}</text>`;
  const path=(points,extra='')=>`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="2.5" ${extra}/>`;
  const rect=(x,y,w,h,fill='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="currentColor" stroke-width="2"/>`;
  function svg(content,label,h=280){return `<svg role="img" aria-label="${esc(label)}" viewBox="0 0 520 ${h}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;}
  function visual(q){
    let out='';
    if(q.table)out+=`<div class="table-wrap"><table><thead><tr>${q.table.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${q.table.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const d=q.visual;if(!d)return out;
    let s='';
    if(d.type==='bar'){
      const max=Math.ceil(Math.max(...d.values)),step=430/d.values.length;
      for(let i=0;i<=5;i++){let y=220-i*36;s+=path([[60,y],[500,y]],'opacity=".15"')+text(35,y+5,Math.round(max*i/5*10)/10);}
      d.values.forEach((val,i)=>{const h=val/max*180,x=60+i*step;s+=rect(x+step*.15,220-h,step*.7,h,'#b6d2c9')+text(x+step/2,245,d.labels[i],12);});
      s+=text(280,18,d.ylabel);out+=svg(s,`${d.ylabel}; ${d.labels.map((l,i)=>`${l}: ${d.values[i]}`).join('; ')}`);
    } else if(d.type==='plot'||d.type==='multiLine'){
      const multi=d.type==='multiLine',xmin=d.xmin??0,ymin=d.ymin??0,xmax=multi?8:d.xmax,ymax=multi?16:d.ymax;
      const X=x=>70+(x-xmin)/(xmax-xmin)*400,Y=y=>225-(y-ymin)/(ymax-ymin)*180;
      const nice=range=>{const raw=range/8,p=10**Math.floor(Math.log10(raw));return [1,2,5,10].find(n=>n*p>=raw)*p;};
      const xs=d.grid?1:nice(xmax-xmin),ys=d.grid?1:nice(ymax-ymin);
      for(let x=Math.ceil(xmin/xs)*xs;x<=xmax;x+=xs)s+=path([[X(x),45],[X(x),225]],'opacity=".12"')+text(X(x),245,Math.round(x*100)/100,11);
      for(let y=Math.ceil(ymin/ys)*ys;y<=ymax;y+=ys)s+=path([[70,Y(y)],[470,Y(y)]],'opacity=".12"')+text(36,Y(y)+4,Math.round(y*100)/100,11);
      if(xmin<0)s+=path([[X(0),40],[X(0),225]],'opacity=".65"');
      if(ymin<0)s+=path([[70,Y(0)],[470,Y(0)]],'opacity=".65"');
      s+=path([[70,40],[70,225],[480,225]])+text(285,275,multi?'Hours':d.xlabel)+text(280,18,multi?'Water height (ft)':d.ylabel);
      if(multi){const colors=['#154e46','#c27823','#6661a6','#bd4d56'];d.rates.forEach((m,i)=>{const start=m<0?14:m===0?6:m>1?3:8;s+=`<g style="color:${colors[i]}">`+path([[X(0),Y(start)],[X(8),Y(start+8*m)]])+text(285,300+i*20,`Tank ${i+1}`,13)+'</g>';});out+=svg(s,'Four labeled water-level lines',385);}
      else {const pts=d.points.map(([x,y])=>[X(x),Y(y)]);if(!d.onlyDots)s+=path(pts);pts.forEach(([x,y],i)=>{s+=`<circle cx="${x}" cy="${y}" r="4" fill="currentColor"/>`;if(d.labels?.[i])s+=text(x+12,y-8,d.labels[i]);});if(d.scatter){for(let i=1;i<16;i++){const x=xmax*i/16,a=d.points[0],b=d.points.at(-1);const y=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])+((i*7)%9-4)*(ymax-ymin)/50;if(y>=ymin&&y<=ymax)s+=`<circle cx="${X(x)}" cy="${Y(y)}" r="3" fill="#8fa69d"/>`;}}out+=svg(s,'Coordinate chart. '+(d.onlyDots?'Scatter points.':d.points.map(p=>p.join(', ')).join('; ')),300);}
    } else if(d.type==='routes'){
      const a=[[50,220],[50,60],[210,60],[210,220],[50,220]],b=[[300,220],[300,60],[365,60],[365,105],[460,105],[460,198],[365,198],[365,220],[300,220]];
      s=path(a)+path(b)+text(130,28,'Path A')+text(380,28,'Path B');
      if(d.grid){s+=text(130,258,`${d.width} wide × ${d.height} high (grid units)`)+text(385,258,'Same overall width and height');}
      else{s+=text(125,245,`${d.width} ft`)+text(125,48,`${d.width} ft`)+text(253,145,`${d.height} ft`)+text(380,48,`${d.width} ft`)+text(320,145,`${d.height/2} ft`)+text(410,245,`${d.width/2} ft`);}
      s+=`<circle cx="50" cy="220" r="5" fill="currentColor"/><circle cx="300" cy="220" r="5" fill="currentColor"/>`;out+=svg(s,'Closed right-angle routes; not to scale. Both have the same overall width and height.');
    } else if(d.type==='squareTriangle'){s=rect(120,50,130,130,'#dcebe3')+path([[250,50],[380,180],[250,180]])+text(185,208,`${d.label} mm`);out+=svg(s,'Square with an isosceles right triangle attached.');}
    else if(d.type==='border'||d.type==='nested'){
      s=rect(150,30,220,220,d.type==='border'?'#b6d2c9':'none');
      if(d.type==='border')s+=rect(200,80,120,120,'white')+text(260,20,`${d.outer} m`);
      else s+=rect(175,55,170,170,'#b6d2c9')+rect(210,90,100,100,'white');
      out+=svg(s,'Concentric squares; shaded ring. Diagram not to scale.');
    }else if(d.type==='circleSquare'){s=rect(160,30,200,200,'#b6d2c9')+`<circle cx="260" cy="130" r="100" fill="white" stroke="currentColor" stroke-width="2"/>`+text(260,260,`${d.label} cm`);out+=svg(s,'Circle inscribed in a square; corners outside the circle are shaded.');}
    else if(d.type==='sectors'){for(let i=0;i<d.n;i++){const a=i*2*Math.PI/d.n-Math.PI/2,b=(i+1)*2*Math.PI/d.n-Math.PI/2;s+=`<path d="M260,135 L${260+105*Math.cos(a)},${135+105*Math.sin(a)} A105,105 0 0,1 ${260+105*Math.cos(b)},${135+105*Math.sin(b)} Z" fill="${i<d.shaded?'#b6d2c9':'white'}" stroke="currentColor"/>`;}out+=svg(s,`${d.shaded} shaded out of ${d.n} equal sectors`);}
    else if(d.type==='trapezoid'){s=path([[165,60],[350,60],[410,220],[100,220],[165,60]])+text(150,50,d.names[0])+text(365,50,d.names[1])+text(425,235,d.names[2])+text(85,235,d.names[3]);out+=svg(s,'Trapezoid; top and bottom are parallel.');}
    else if(d.type==='rectangle'){s=rect(120,60,280,145)+text(260,240,`${d.w} cm`)+text(440,140,`${d.h} cm`);out+=svg(s,'Rectangle with four right angles.');}
    else if(d.type==='dots'){const step=480/d.corners.length;d.corners.forEach((c,i)=>{const x=20+i*step;s+=rect(x,80,step-10,step-10)+`<circle cx="${x+(c.includes('right')?step-22:12)}" cy="${80+(c.includes('lower')?step-22:12)}" r="5" fill="currentColor"/>`+text(x+(step-10)/2,80+step+15,i+1);});out+=svg(s,'Dot frames: '+d.corners.join(', '),220);}
    else if(d.type==='box'){const [min,q1,med,q3,max]=d.values,X=n=>50+n*7;s=path([[X(min),120],[X(max),120]])+rect(X(q1),80,X(q3)-X(q1),80,'white')+path([[X(med),80],[X(med),160]]);d.values.forEach(n=>{s+=path([[X(n),105],[X(n),135]])+text(X(n),195,n);});out+=svg(s,'Box plot: '+d.values.join(', '),240);}
    return `<div class="visual">${out}</div>`;
  }
  window.MarcoVisuals={esc,math,visual};
})();
