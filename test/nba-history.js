/* Pro basketball over the long run, against the NBA (approximate figures):
   records spread like the real league's, top seeds win most titles, series
   go four to seven, first-round favourites mostly win.
     node test/nba-history.js [careers=2] [seasons=100]   MATCH or MISMATCH */
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const a=process.argv.slice(2).filter(x=>/^\d+$/.test(x)), C=+(a[0]||2), Y=+(a[1]||100);
const R=[]; for(let i=0;i<C;i++){const out='/tmp/nbahist'+i+'.json';
  execFileSync('node',[path.join(__dirname,'nba-longrun.js'),String(201+i*13),String(Y),out],{stdio:'ignore'}); R.push(...JSON.parse(fs.readFileSync(out)))}
// fresh leagues' first seasons: two careers give six, too few for a shape; eight short careers add 24
for(let i=0;i<8;i++){const out='/tmp/nbaearly'+i+'.json';
  execFileSync('node',[path.join(__dirname,'nba-longrun.js'),String(501+i*17),'3',out],{stdio:'ignore'}); R.push(...JSON.parse(fs.readFileSync(out)).filter(r=>r.early))}
const E3=R.filter(r=>r.early); R.splice(0,R.length,...R.filter(r=>!r.early));
const n=R.length, c={}, p={}, len={}; R.forEach(r=>{c[r.champ]=(c[r.champ]||0)+1;
  r.r1.forEach(([x,y,w,g])=>{const k=x+'v'+y;p[k]=p[k]||[0,0];p[k][0]+=w;p[k][1]++;len[g]=(len[g]||0)+1})});
const W=[].concat(...R.map(r=>r.wins)), mu=W.reduce((s,x)=>s+x)/W.length, sd=Math.sqrt(W.reduce((s,x)=>s+(x-mu)**2,0)/W.length);
const margin=R.reduce((s,r)=>s+r.margin,0)/n, tl=Object.values(len).reduce((s,x)=>s+x), pc=k=>100*p[k][0]/p[k][1];
let bad=0; const chk=(ok,m)=>{console.log((ok?'  ok   ':'  FAIL ')+m); if(!ok)bad++};
chk(sd>=10.5&&sd<=14, `regular-season wins spread ${sd.toFixed(1)} (real ~12-13)`);
{ const sds=E3.map(r=>{const mu=r.wins.reduce((a,b)=>a+b)/r.wins.length; return Math.sqrt(r.wins.reduce((a,b)=>a+(b-mu)**2,0)/r.wins.length)});
  const esd=sds.reduce((a,b)=>a+b,0)/Math.max(1,sds.length), best=Math.max(...E3.map(r=>Math.max(...r.wins)));
  chk(esd>=10.5&&esd<=15, `first three seasons: wins spread ${esd.toFixed(1)} (real ~13-14)`);
  // the shape, not one draw: each fresh season's best record, the median under 70 and none past 80
  // (the max of six seasons alone failed on an unlucky one: 60 first seasons per build measured
  // median 66 and max 74-77 in both the Oct and Nov 2026 builds; Muse's 77-5 was the bug)
  const bs=E3.map(r=>Math.max(...r.wins)).sort((a,b)=>a-b), med=bs[Math.floor((bs.length-1)/2)];
  chk(med<=70&&best<=80, `first three seasons: best record median ${med}, highest ${best} wins (real best ever 73)`); }
chk(margin>=11.5&&margin<=14, `mean margin ${margin.toFixed(1)} (real ~12-13)`);
chk(100*(c[1]||0)/n>=45&&100*(c[1]||0)/n<=70, `1 seeds win ${(100*(c[1]||0)/n).toFixed(0)}% of titles (real ~55)`);
chk(pc('1v8')>=82, `1 v 8: ${pc('1v8').toFixed(0)}% (real ~94; known to run low)`);
chk(pc('4v5')>=45&&pc('4v5')<=68, `4 v 5: ${pc('4v5').toFixed(0)}% (real ~55)`);
[4,5,6,7].forEach(k=>chk(100*(len[k]||0)/tl>=10&&100*(len[k]||0)/tl<=40, `${k}-game series ${(100*(len[k]||0)/tl).toFixed(0)}% (real ~15-35)`));
console.log(bad?`MISMATCH ${bad} check(s) failed (${n} seasons)`:`MATCH the NBA's shape (${n} seasons)`);
process.exit(bad?1:0);
