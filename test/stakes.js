/* Round 45: what's at stake, in all six. Sims a season in chunks, as sim ahead does, and checks:
   - the sim digest, the next game's stakes and the board's objectives draw without an error every time;
   - the board judges three: re-aimed objectives never take the count past the originals;
   - a re-aimed objective appears only with a third of the season to play;
   - soccer: a title clinched before the last day is caught on the week it happened (the points can't be caught).
     node test/stakes.js     last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path');
const GAMES=[['football-coach.html',4],['football-coach-pro.html',5],['basketball-coach.html',5],['basketball-coach-pro.html',3],['hockey-coach-pro.html',5],['soccer-coach.html','Manchester City'],['baseball-coach-pro.html',5]];
let bad=0; const ok=(c,m)=>{ if(!c){ bad++; console.log('  FAIL '+m) } };
for(const [f,team] of GAMES){
  const A=load({file:path.join(__dirname,'..','dist',f),expose:['S','SEA','NAMES','newDynasty','simRun','digestBlock','stakesFor','objectivesHTML','objectivesMet','objectivesAll','seasonObjectives','objStatus','LEAGUE']});
  const T=typeof team==='string'?team:A.NAMES[team]; A.newDynasty(T,11,'T'); const SEA=A.SEA, S=A.S, my=S.myTeam;
  const W=SEA.sched.reduce((m,g)=>Math.max(m,g.week+1),0); let k=0, stakes=0, means=0, digests=0, inc=0;
  while(SEA.phase==='week'&&k++<20){
    A.simRun(Math.min(W,SEA.step+Math.ceil(W/10)));
    try{ const d=A.digestBlock(); digests++; if(/What happened/.test(d))inc++ }catch(e){ ok(false,f+' digest: '+e.message) }
    const ng=SEA.phase==='week'&&SEA.nextGame?SEA.nextGame(my):null;
    if(ng){ try{ const st=A.stakesFor(ng); stakes++; if(st.some(x=>x.tag==='THE BOARD'||x.tag==='THE TABLE'))means++ }catch(e){ ok(false,f+' stakes: '+e.message) } }
    try{ A.objectivesHTML(my) }catch(e){ ok(false,f+' objectives: '+e.message) }
    ok(A.objectivesMet(my)<=A.seasonObjectives(my).length,f+' more objectives counted than the board set');
  }
  const ex=(S.obj&&S.obj.extra)||[];
  ex.forEach(o=>{ const all=SEA.sched.filter(g=>!g.cup&&(g.home===my||g.away===my)), left=all.filter(g=>g.week>=o.re0).length;
    ok(left>=Math.max(3,Math.ceil(all.length/3)),`${f} re-aimed with ${left} of ${all.length} to play`) });
  let cl='';
  if(A.LEAGUE.draws){ const C=S.clinch&&S.clinch.k&&S.clinch.k.title; ok(!!C,'soccer: '+T+' clinched no title (seed 11 wins it)');
    if(C){ ok(C.left>0,'soccer: the title caught only on the last day'); cl=` | title clinched at step ${C.step}, ${C.left} to spare` } }
  console.log(`${f.padEnd(26)} ${digests} digests (${inc} with incidents), ${stakes} next games (${means} with what the game means), ${ex.length} re-aimed${cl}`);
}
console.log(bad?`MISMATCH ${bad}`:'MATCH stakes, digests and objectives in all six');
