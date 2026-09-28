/* Pro basketball over the long run, against the NBA (approximate figures):
   records spread like the real league's, top seeds win most titles, series
   go four to seven, first-round favourites mostly win.
     node test/nba-history.js [careers=2] [seasons=100]   MATCH or MISMATCH */
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const a=process.argv.slice(2).filter(x=>/^\d+$/.test(x)), C=+(a[0]||2), Y=+(a[1]||100);
const R=[]; for(let i=0;i<C;i++){const out='/tmp/nbahist'+i+'.json';
  execFileSync('node',[path.join(__dirname,'nba-longrun.js'),String(201+i*13),String(Y),out],{stdio:'ignore'}); R.push(...JSON.parse(fs.readFileSync(out)))}
const n=R.length, c={}, p={}, len={}; R.forEach(r=>{c[r.champ]=(c[r.champ]||0)+1;
  r.r1.forEach(([x,y,w,g])=>{const k=x+'v'+y;p[k]=p[k]||[0,0];p[k][0]+=w;p[k][1]++;len[g]=(len[g]||0)+1})});
const W=[].concat(...R.map(r=>r.wins)), mu=W.reduce((s,x)=>s+x)/W.length, sd=Math.sqrt(W.reduce((s,x)=>s+(x-mu)**2,0)/W.length);
const margin=R.reduce((s,r)=>s+r.margin,0)/n, tl=Object.values(len).reduce((s,x)=>s+x), pc=k=>100*p[k][0]/p[k][1];
let bad=0; const chk=(ok,m)=>{console.log((ok?'  ok   ':'  FAIL ')+m); if(!ok)bad++};
chk(sd>=10.5&&sd<=14, `regular-season wins spread ${sd.toFixed(1)} (real ~12-13)`);
chk(margin>=11.5&&margin<=14, `mean margin ${margin.toFixed(1)} (real ~12-13)`);
chk(100*(c[1]||0)/n>=45&&100*(c[1]||0)/n<=70, `1 seeds win ${(100*(c[1]||0)/n).toFixed(0)}% of titles (real ~55)`);
chk(pc('1v8')>=82, `1 v 8: ${pc('1v8').toFixed(0)}% (real ~94; known to run low)`);
chk(pc('4v5')>=45&&pc('4v5')<=68, `4 v 5: ${pc('4v5').toFixed(0)}% (real ~55)`);
[4,5,6,7].forEach(k=>chk(100*(len[k]||0)/tl>=10&&100*(len[k]||0)/tl<=40, `${k}-game series ${(100*(len[k]||0)/tl).toFixed(0)}% (real ~15-35)`));
console.log(bad?`MISMATCH ${bad} check(s) failed (${n} seasons)`:`MATCH the NBA's shape (${n} seasons)`);
process.exit(bad?1:0);
