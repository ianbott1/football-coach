/* Baseball against MLB (round 52): the engine between average sides, and whole seasons.
   Targets (MLB 2023-25): runs a side 4.2-4.8; one-run games 24-31%; extra innings 6-11%; home sides 52-56% (seasons);
   the spread of wins 10-15 a season; the best record under 112 wins on average.
     node test/bs-calibrate.js   last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path'); let bad=0; const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++ };
const F=path.join(__dirname,'..','dist','baseball-coach-pro.html');
{ const A=load({file:F,expose:['playGame','RNG']}); let n=6000,rs=0,one=0,ex=0;
  for(let i=0;i<n;i++){ const r=A.playGame(new A.RNG(i*7+3),1500,1500,'balanced','balanced',{}); rs+=r.h+r.a; if(Math.abs(r.h-r.a)===1)one++; if(r.drives.length>9)ex++ }
  ok(rs/n/2>=4.2&&rs/n/2<=4.8,`runs a side ${(rs/n/2).toFixed(2)}`); ok(one/n>=0.24&&one/n<=0.31,`one-run games ${(100*one/n).toFixed(1)}%`); ok(ex/n>=0.06&&ex/n<=0.11,`extra innings ${(100*ex/n).toFixed(1)}%`) }
{ let hw=0,gs=0,sds=[],best=[];
  for(const seed of [1,2,3,4,5]){ const A=load({file:F,expose:['SEA','NAMES','newDynasty']}); A.newDynasty('Seattle',seed,'T'); let g=0; while(A.SEA.phase==='week'&&g++<3000){A.SEA.userTeam=null;A.SEA.advance()}
    A.SEA.weeks.forEach(w=>w.games.forEach(x=>{ gs++; if(x.winner===x.home)hw++ }));
    const W=A.NAMES.map(t=>A.SEA.rec[t][0]), mu=W.reduce((a,b)=>a+b)/W.length; sds.push(Math.sqrt(W.reduce((a,b)=>a+(b-mu)**2,0)/W.length)); best.push(Math.max(...W)) }
  const sd=sds.reduce((a,b)=>a+b)/sds.length, bst=best.reduce((a,b)=>a+b)/best.length;
  ok(hw/gs>=0.52&&hw/gs<=0.56,`home sides won ${(100*hw/gs).toFixed(1)}% over five seasons`); ok(sd>=10&&sd<=15,`the spread of wins ${sd.toFixed(1)} (seasons: ${sds.map(x=>x.toFixed(1)).join(", ")})`);
  ok(bst<112,`the best record ${bst.toFixed(0)} wins on average (${best.join(", ")})`) }
// the schedule (round 57): series, 81 at home, no club twice in a day, no stretch past 20 days, the season to its end
for(const seed of [3,8,21]){ const A=load({file:F,expose:['SEA','NAMES','newDynasty','LEAGUE']}); A.newDynasty('Cleveland',seed,'T');
  const S=A.SEA.sched, home={}, days={}; A.NAMES.forEach(t=>{home[t]=0;days[t]=new Set()}); let dup=0, seq=0;
  S.forEach(g=>{ home[g.home]++; [g.home,g.away].forEach(t=>{ if(days[t].has(g.week))dup++; days[t].add(g.week) }) });
  const byS={}; S.forEach(g=>(byS[g.ser]=byS[g.ser]||[]).push(g)); Object.values(byS).forEach(G=>{ G.sort((a,b)=>a.week-b.week); G.forEach((g,i)=>{ if(i&&g.week!==G[i-1].week+1)seq++ }) });
  const stretch=Math.max(...A.NAMES.map(t=>{ let m=0,c=0; for(let d=0;d<A.LEAGUE.weeks;d++){ if(days[t].has(d)){c++;m=Math.max(m,c)}else c=0 } return m }));
  const H=Object.values(home), last=Math.max(...S.map(g=>g.week)), lens=new Set(Object.values(byS).map(G=>G.length));
  // back-to-back series against the same club (a team's consecutive series with the same opponent)
  let b2b=0; A.NAMES.forEach(t=>{ const mine=Object.values(byS).filter(G=>G[0].home===t||G[0].away===t).sort((a,b)=>a[0].week-b[0].week);
    mine.forEach((G,i)=>{ if(i){ const o=G[0].home===t?G[0].away:G[0].home, P=mine[i-1][0], po=P.home===t?P.away:P.home; if(o===po)b2b++ } }) });
  ok(S.length===2430&&H.every(h=>h===81)&&A.NAMES.every(t=>days[t].size===162),`schedule ${seed}: 162 games each, 81 at home (${Math.min(...H)}-${Math.max(...H)})`);
  ok(!dup&&!seq,`schedule ${seed}: no club twice in a day (${dup}), every series on consecutive days (${seq} gaps); series of ${[...lens].sort().join("/")} games`);
  ok(b2b<=60,`schedule ${seed}: back-to-back series against the same club ${b2b/2} (was ~70 a season before round 59)`);
  ok(stretch<=20&&last>=A.LEAGUE.weeks-3,`schedule ${seed}: longest stretch without a day off ${stretch} (MLB's cap is 20); the season ends on day ${last+1} of ${A.LEAGUE.weeks}`) }
console.log(bad?`MISMATCH ${bad}`:'MATCH baseball plays like MLB'); process.exit(bad?1:0);
