/* Pro basketball: offseason roster turnover split by source (draft, free agency, expired contracts, retirements), each against team strength. A report. */
const fs=require('fs');const src=fs.readFileSync('test/golden.js','utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const api=m.exports.load('dist/basketball-coach-pro.html'); api.newDynasty('Boston',21,'T');
const W=[0.22,0.2,0.2,0.19,0.19];
const val=R=>{let s=0;for(let i=0;i<5;i++)s+=W[i]*(0.8*R[i].r+0.2*(R[i+5]||R[i]).r);return s};
const corr=(a,b)=>{const ma=a.reduce((x,y)=>x+y)/a.length,mb=b.reduce((x,y)=>x+y)/b.length;let n=0,da=0,db=0;a.forEach((x,i)=>{n+=(x-ma)*(b[i]-mb);da+=(x-ma)**2;db+=(b[i]-mb)**2});return n/Math.sqrt(da*db)};
const cat={}; const add=(k,i,v)=>{(cat[k]=cat[k]||Array(30).fill(0))[i]+=v};
const pre=[];
for(let y=0;y<4;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<200)E.advance();
  const T=api.NAMES; const p0=T.map(t=>val(api.U.roster[t]));
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
  const {rep,picks}=api.S.lastNbaRep; const pts=x=>Math.max(0,x.r-50);
  T.forEach((t,i)=>{
    (rep.retired[t]||[]).forEach(x=>add('lost: retired',i,-pts(x)));
    (rep.released[t]||[]).forEach(x=>add('lost: '+(x.cap?'cap cut':x.why||'other'),i,-pts(x)));
    (rep.signed[t]||[]).forEach(x=>add('gained: free agency',i,pts(x)));
    picks.filter(d=>d.team===t&&d.made!==false).forEach(d=>add('gained: draft',i,pts(d)));
    pre.push(null);
  });
  if(!cat._pre)cat._pre=[]; p0.forEach((v,i)=>cat._pre[i]=(cat._pre[i]||0)+v);
}
const P=cat._pre;
console.log('over 4 offseasons, rating points (above 50) per team by source; correlation with team strength:');
Object.keys(cat).filter(k=>k!=='_pre').sort().forEach(k=>{const v=cat[k];const mean=v.reduce((a,b)=>a+b)/30;
  console.log('  '+k.padEnd(22)+' mean '+(mean/4).toFixed(1).padStart(6)+' a year | r with strength '+corr(P,v).toFixed(2))});
