/* Pro basketball: how much team strength carries from season to season (a report). */
const fs=require('fs');const src=fs.readFileSync('test/golden.js','utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const api=m.exports.load(process.env.F||'dist/basketball-coach-pro.html'); api.newDynasty('Boston',21,'T');
const pct=[], talent=[]; let stars={kept:0,lost:0,retired:0,n:0}, pays=[];
for(let y=0;y<+(process.env.Y||8);y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<600)E.advance();
  const p={}; api.NAMES.forEach(t=>{const [w,l]=E.rec[t]; p[t]=w/(w+l)}); pct.push(p);
  const before={}; api.NAMES.forEach(t=>before[t]=api.U.roster[t].filter(Boolean).map(x=>({n:x.n,p:x.p,r:x.r,age:x.age,yrs:x.k&&x.k.yrs})));
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
  const after={}; api.NAMES.forEach(t=>after[t]=new Set(api.U.roster[t].filter(Boolean).map(x=>x.n+'|'+x.p)));
  api.NAMES.forEach(t=>before[t].filter(x=>x.r>=78).forEach(x=>{stars.n++; if(after[t].has(x.n+'|'+x.p))stars.kept++; else if(api.NAMES.some(o=>o!==t&&after[o].has(x.n+'|'+x.p)))stars.lost++; else stars.retired++}));
  const pay=api.NAMES.map(t=>api.U.roster[t].reduce((s,x)=>s+(x&&x.k?x.k.sal:0),0)); pays.push([Math.min(...pay),Math.max(...pay),pay.reduce((a,b)=>a+b,0)/30]);
}
const corr=(a,b)=>{const ks=Object.keys(a),ma=ks.reduce((s,k)=>s+a[k],0)/ks.length,mb=ks.reduce((s,k)=>s+b[k],0)/ks.length;let n=0,da=0,db=0;ks.forEach(k=>{n+=(a[k]-ma)*(b[k]-mb);da+=(a[k]-ma)**2;db+=(b[k]-mb)**2});return n/Math.sqrt(da*db)};
const cs=[];for(let i=1;i<pct.length;i++)cs.push(corr(pct[i-1],pct[i]));
console.log('year-to-year correlation of win %:',cs.map(c=>c.toFixed(2)).join(' '),'| mean',(cs.reduce((a,b)=>a+b,0)/cs.length).toFixed(2),'(real NBA roughly 0.6-0.7)');
const sd=pct.map(p=>{const v=Object.values(p),m=v.reduce((a,b)=>a+b,0)/30;return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/30)});
console.log('spread of win % (sd):',sd.map(x=>x.toFixed(3)).join(' '),'(real NBA ~0.14-0.16)');
console.log('stars (78+) each offseason: kept',stars.kept,'| left in free agency or a trade',stars.lost,'| gone (retired/unsigned)',stars.retired,'of',stars.n);
console.log('payroll $M after offseasons (min/max/mean):',pays.map(p=>p.map(x=>Math.round(x)).join('/')).join('  '));
