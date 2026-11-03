/* Hockey lines and ice time (hockey 12_lines), link by link (a season's luck
   is bigger than any one choice: ~10 standings points; measured in Nov 2026,
   so seasons are reported, not asserted):
   - balanced changes nothing, for any roster;
   - each choice moves strength the right way for the roster: a top-heavy
     group gains by leaning on its best, a deep one by spreading it;
   - that strength becomes win probability in the engine (20,000 games);
   - riding raises the injury risk, rolling lowers it;
   - the top line's points follow its ice time;
   - the screen draws.
     node test/lines.js      last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
const D=path.join(__dirname,'..','dist','hockey-coach-pro.html');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=12)console.log('  FAIL '+m)}};
const EXP=['S','SEA','U','POS','BK','NAMES','newDynasty','deployEdge','deployHazard','linesHTML','rosterView','DEPLOY','playGame','RNG'];
const A=load({file:D,expose:EXP}); A.newDynasty('Boston',5,'T'); const E=A.SEA, BK=A.BK;
const gap=(t,idx)=>idx.reduce((s,i)=>s+(A.U.roster[t][i].r-A.U.roster[t][BK(i)].r),0)/idx.length;
// 1-2. balanced is nothing; the sign follows the roster
const sizes=[];
for(const t of A.NAMES){ E.userTeam=t;
  for(const g of ['f','d','g']){ const G=A.DEPLOY[g], gp=gap(t,G.idx);
    E.deploy={[g]:'bal'}; ok(A.deployEdge(E,t)===0,`balanced ${g} moves ${t}`);
    E.deploy={[g]:'ride'}; const ride=A.deployEdge(E,t); E.deploy={[g]:'roll'}; const roll=A.deployEdge(E,t);
    sizes.push(Math.abs(ride),Math.abs(roll));
    if(gp>G.fresh+1)ok(ride>0&&roll<0,`${t} ${g}: top ${gp.toFixed(1)} above depth, but ride ${ride.toFixed(1)}, roll ${roll.toFixed(1)}`);
    if(gp<G.fresh-1)ok(roll>0&&ride<0,`${t} ${g}: top only ${gp.toFixed(1)} above depth, but ride ${ride.toFixed(1)}, roll ${roll.toFixed(1)}`) } }
E.deploy=null; E.userTeam=A.S.myTeam;
sizes.sort((a,b)=>a-b);
console.log(`  a choice moves strength by up to ${sizes[sizes.length-1].toFixed(0)} points (median ${sizes[sizes.length>>1].toFixed(0)}) across the league's rosters`);
// 3. strength becomes win probability (common random numbers)
{ const r1=new A.RNG(9), r2=new A.RNG(9); let w0=0,w1=0,N=20000;
  for(let i=0;i<N;i++){ const g0=A.playGame(r1,1500,1500,'balanced','balanced',{}); const g1=A.playGame(r2,1525,1500,'balanced','balanced',{});
    if(g0.h>g0.a)w0++; if(g1.h>g1.a)w1++ }
  const pp=100*(w1-w0)/N; console.log(`  25 strength points: win probability ${pp>=0?'+':''}${pp.toFixed(1)} points (about ${(pp/100*84*2).toFixed(1)} standings points over 84 games)`);
  ok(pp>0.8,`25 strength points barely move a game (${pp.toFixed(1)} points)`) }
// 4. injuries
{ E.userTeam=A.S.myTeam; const t=A.S.myTeam;
  E.deploy={f:'ride',d:'ride'}; const hr=A.deployHazard(t); E.deploy={f:'roll',d:'roll'}; const hl=A.deployHazard(t); E.deploy=null; const hb=A.deployHazard(t);
  ok(hr>hb&&hb>hl&&hb===1,`injury risk: ride ${hr}, balanced ${hb}, roll ${hl}`);
  console.log(`  injury risk with both skater groups: ride x${hr.toFixed(2)}, roll x${hl.toFixed(2)}`) }
// 5. points follow ice time: the top centre's share of his team's scoring, over four seasons
function season(team,seed,dep){
  const B=load({file:D,expose:EXP}); B.newDynasty(team,seed,'T'); const S2=B.SEA; let g=0;
  while(S2.phase==='week'&&g++<400){ S2.userTeam=B.S.myTeam; S2.deploy=dep; S2.advance() }
  const R=S2.roster[team], all=S2.weeks.reduce((s,W)=>s+W.games.reduce((q,x)=>q+(x.home===team?x.hp:x.away===team?x.ap:0),0),0);   // team goals
  return {pts:2*S2.rec[team][0]+((S2.otl||{})[team]||0), c:(R[0].st2||{}).pts||0, all:all};
}
{ const t=A.NAMES.slice().sort((a,b)=>A.U.roster[a][0].r-A.U.roster[b][0].r)[Math.floor(A.NAMES.length/2)];   // a mid-rated centre
  const r={}; for(const k of ['bal','ride','roll']){ r[k]={c:0,all:0,pts:0}; for(const sd of [7,19,31,43]){ const x=season(t,sd,k==='bal'?null:{f:k}); r[k].c+=x.c; r[k].all+=x.all; r[k].pts+=x.pts/4 } }
  const sh=k=>100*r[k].c/Math.max(1,r[k].all);
  console.log(`  ${t}'s top centre, points per 100 team goals: ${sh('ride').toFixed(1)} riding, ${sh('bal').toFixed(1)} balanced, ${sh('roll').toFixed(1)} rolling | team points ${r.ride.pts.toFixed(0)} / ${r.bal.pts.toFixed(0)} / ${r.roll.pts.toFixed(0)} (four seasons each, luck included)`);
  ok(sh('ride')>sh('bal')&&sh('bal')>sh('roll'),`${t}: the top centre's points per team goal don't follow his ice time`) }
// 6. the screen
{ const h=A.rosterView(); ok(/Lines and ice time/.test(h)&&/data-deploy="f:ride"/.test(h)&&!/undefined|NaN/.test(h),'the lines section does not draw') }
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: lines and ice time work`);
process.exit(bad?1:0);
