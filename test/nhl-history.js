/* Pro hockey over the long run, against the NHL (approximate figures):
   points spread like the real league's, the best and worst teams in range,
   home ice wins most first-round series but far from all.
     node test/nhl-history.js [careers=2] [seasons=80]   MATCH or MISMATCH */
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const a=process.argv.slice(2).filter(x=>/^\d+$/.test(x)), C=+(a[0]||2), Y=+(a[1]||80);
const R=[]; for(let i=0;i<C;i++){const out='/tmp/nhlhist'+i+'.json';
  execFileSync('node',[path.join(__dirname,'nhl-longrun.js'),String(301+i*17),String(Y),out],{stdio:'ignore'}); R.push(...JSON.parse(fs.readFileSync(out)))}
const n=R.length, P=[].concat(...R.map(r=>r.pts)), mu=P.reduce((s,x)=>s+x)/P.length, sd=Math.sqrt(P.reduce((s,x)=>s+(x-mu)**2,0)/P.length);
const best=R.reduce((s,r)=>s+Math.max(...r.pts),0)/n, worst=R.reduce((s,r)=>s+Math.min(...r.pts),0)/n;
let hw=0,hn=0; R.forEach(r=>r.r1.forEach(([x,y,w])=>{hw+=w;hn++}));
let bad=0; const chk=(ok,m)=>{console.log((ok?'  ok   ':'  FAIL ')+m); if(!ok)bad++};
chk(mu>=90&&mu<=98, `mean points ${mu.toFixed(1)} (84 games: ~94)`);
chk(sd>=11.5&&sd<=18, `points spread ${sd.toFixed(1)} (NHL ~14)`);
chk(best>=110&&best<=132, `the best team averages ${best.toFixed(0)} points (NHL ~115-125)`);
chk(worst>=45&&worst<=70, `the worst team averages ${worst.toFixed(0)} points (NHL ~50-60)`);
chk(100*hw/hn>=55&&100*hw/hn<=72, `home ice wins ${(100*hw/hn).toFixed(0)}% of first-round series (NHL ~60-65)`);
console.log(bad?`MISMATCH ${bad} check(s) failed (${n} seasons)`:`MATCH the NHL's shape (${n} seasons)`);
process.exit(bad?1:0);
