/* Hockey's economy over many seasons: payroll against the cap, max deals, pay by rating, how many of
   their best six players teams keep, the points spread. The curve's constants come from the
   environment (HK_A, HK_B, HK_0), so shapes can be tried without a rebuild.
     node test/hk-economy.js [file] [seasons=12] [seed=11] */
const {load}=require('./harness.js');
const Y=+process.argv[3]||12;
const A=load({file:process.argv[2]||'dist/hockey-coach-pro.html',expose:['S','SEA','U','NAMES','newDynasty','openOffseason','commitOffseason','nflAsk','LEAGUE']});
A.newDynasty('Toronto',+process.argv[4]||11,'T'); const CAP=A.LEAGUE.cap||104;
const pay=[],maxed=[],tiers={},keep=[],pts=[];
for(let y=0;y<Y;y++){ let g=0; while(A.SEA.phase!=='done'&&g++<900)A.SEA.advance();
  A.NAMES.forEach(t=>pts.push(A.SEA.rec[t][0]*2+(A.SEA.otl?A.SEA.otl[t]||0:0)));
  const before={}; A.NAMES.forEach(t=>before[t]=(A.U.roster[t]||[]).filter(p=>p).sort((a,b)=>b.r-a.r).slice(0,6).map(p=>p.n));
  A.openOffseason(); for(let c=0;c<4;c++){ if(!A.S.off)break; if(A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  if(y<2)continue;   // the first seasons still run on the starting league's contracts
  A.NAMES.forEach(t=>{ const R=(A.U.roster[t]||[]).filter(p=>p&&p.k); const tot=R.reduce((s,p)=>s+p.k.sal,0); pay.push(tot/CAP);
    maxed.push(R.filter(p=>p.k.sal>=0.2*CAP-0.05).length);
    R.forEach(p=>{ const b=p.r>=70?'70+':p.r>=65?'65-69':p.r>=60?'60-64':p.r>=55?'55-59':p.r>=50?'50-54':'<50'; (tiers[b]=tiers[b]||[]).push(p.k.sal) });
    const now=new Set(R.map(p=>p.n)); keep.push(before[t].filter(n=>now.has(n)).length/Math.max(1,before[t].length)) }) }
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length, q=(a,p)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(p*(b.length-1))]};
const mu=avg(pts), sd=Math.sqrt(avg(pts.map(x=>(x-mu)**2)));
console.log(`payroll: median ${(100*q(pay,.5)).toFixed(0)}% of cap (10th ${(100*q(pay,.1)).toFixed(0)}%, 90th ${(100*q(pay,.9)).toFixed(0)}%) | max deals per team ${avg(maxed).toFixed(2)} | top-6 players kept ${(100*avg(keep)).toFixed(0)}% | points sd ${sd.toFixed(1)}`);
console.log('pay by rating: '+['<50','50-54','55-59','60-64','65-69','70+'].map(b=>tiers[b]?`${b}: $${avg(tiers[b]).toFixed(1)}M (${tiers[b].length})`:'').join(' | '));
console.log('ask curve: '+[50,55,58,60,62,64,66,68,70,72].map(r=>r+':'+A.nflAsk(r,'C',27)).join(' '));
