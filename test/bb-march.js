/* College basketball over the long run: pooled tournaments from seasons 4+
   of long careers, against real NCAA history (1985 onward, approximate).
   Tolerances about three standard errors wide for the default sample.
     node test/bb-march.js [careers=2] [seasons=100]   last line: MATCH or MISMATCH
   (each career about a minute; runs test/bb-longrun.js) */
const {execFileSync}=require('child_process'), fs=require('fs'), path=require('path');
const args=process.argv.slice(2).filter(a=>/^\d+$/.test(a)), C=+(args[0]||2), Y=+(args[1]||100);
const R=[];
for(let i=0;i<C;i++){const out='/tmp/bbmarch'+i+'.json';
  execFileSync('node',[path.join(__dirname,'bb-longrun.js'),String(101+i*11),String(Y),out],{stdio:'ignore'});
  R.push(...JSON.parse(fs.readFileSync(out)))}
const c={},f={},p={};R.forEach(r=>{c[r.champ]=(c[r.champ]||0)+1;r.ff.forEach(s=>f[s]=(f[s]||0)+1);
  r.r64.forEach(([a,b,w])=>{const k=a+'v'+b;p[k]=p[k]||[0,0];p[k][0]+=w;p[k][1]++})});
const n=R.length, fn=Object.values(f).reduce((a,b)=>a+b,0), pct=k=>100*p[k][0]/p[k][1];
const real={'1v16':98.8,'2v15':92.9,'3v14':85.2,'4v13':79.0,'5v12':64.4,'6v11':61.5,'7v10':60.6,'8v9':48.8};
let bad=0; const chk=(ok,msg)=>{console.log((ok?'  ok   ':'  FAIL ')+msg); if(!ok)bad++};
const se=(q,m)=>100*Math.sqrt(q/100*(1-q/100)/m);
Object.keys(real).forEach(k=>{const m=p[k][1], tol=Math.max(3,3*se(real[k],m));
  chk(Math.abs(pct(k)-real[k])<=tol, `${k}: ${pct(k).toFixed(1)}% (real ${real[k]}, within ${tol.toFixed(1)})`)});
const t1=100*(c[1]||0)/n; chk(Math.abs(t1-64)<=Math.max(8,3*se(64,n)), `1 seeds win ${t1.toFixed(0)}% of titles (real ~64)`);
const f1=100*(f[1]||0)/fn; chk(Math.abs(f1-40)<=9, `1 seeds are ${f1.toFixed(0)}% of Final Four teams (real ~40)`);
console.log(bad?`MISMATCH ${bad} check(s) failed (${n} tournaments)`:`MATCH March matches history (${n} tournaments)`);
process.exit(bad?1:0);
