/* Pro basketball: what the offseason does to strong and weak teams, split into development and roster turnover (a report). */
const fs=require('fs');const src=fs.readFileSync('test/golden.js','utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const api=m.exports.load('dist/basketball-coach-pro.html'); api.newDynasty('Boston',21,'T');
const W=[0.22,0.2,0.2,0.19,0.19];
const val=R=>{let s=0;for(let i=0;i<5;i++)s+=W[i]*(0.8*R[i].r+0.2*(R[i+5]||R[i]).r);return s};
const corr=(a,b)=>{const ma=a.reduce((x,y)=>x+y)/a.length,mb=b.reduce((x,y)=>x+y)/b.length;let n=0,da=0,db=0;a.forEach((x,i)=>{n+=(x-ma)*(b[i]-mb);da+=(x-ma)**2;db+=(b[i]-mb)**2});return n/Math.sqrt(da*db)};
for(let y=0;y<3;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<600)E.advance();
  const T=api.NAMES, pre={}, ids={};
  T.forEach(t=>{pre[t]=val(api.U.roster[t]); ids[t]=new Map(api.U.roster[t].map(p=>[p.n+'|'+p.p,p.r]))});
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
  // development: the same players' ratings now; turnover: everything else
  const dev=[], turn=[], p0=[];
  T.forEach(t=>{const R=api.U.roster[t], kept=R.filter(p=>ids[t].has(p.n+'|'+p.p));
    const d=kept.reduce((s,p)=>s+(p.r-ids[t].get(p.n+'|'+p.p)),0)/Math.max(1,kept.length);
    const total=val(R)-pre[t]; dev.push(d); turn.push(total-d*0.9); p0.push(pre[t])});
  console.log(`offseason ${y+1}: vs pre-offseason strength, correlation of development ${corr(p0,dev).toFixed(2)} (mean ${ (dev.reduce((a,b)=>a+b)/30).toFixed(1)}), of roster turnover ${corr(p0,turn).toFixed(2)} (mean ${(turn.reduce((a,b)=>a+b)/30).toFixed(1)})`);
}
