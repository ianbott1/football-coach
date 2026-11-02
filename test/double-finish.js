/* A finished live game is recorded once, however hard you click: extra
   ticks after the final whistle, a second click on a call already answered,
   and Back pressed twice must not record the game again (they did: verdicts
   printed three times and the season tally counted each copy). Plays live
   games in three games with every click doubled or tripled.
     node test/double-finish.js */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+m)}};
for(const [f,team] of [['football-coach.html','Michigan State'],['football-coach-pro.html','Kansas City'],['soccer-coach.html','Notts County']]){
  const A=load({file:D(f),expose:['S','SEA','newDynasty','doAdvance','live','liveTick','answerLive','endLive','callKey']});
  A.newDynasty(team,7,'T'); let games=0;
  for(let w=0;w<8&&A.SEA.phase==='week';w++){
    A.doAdvance(); if(!A.live)continue; const step=A.live.step; let n=0;
    while(A.live&&!A.live.done&&n++<3000){
      if(A.live.ask){ const v=A.live.ask.dp.opts[0][0]; A.answerLive(v); A.answerLive(v); A.answerLive(v) }   // a triple click
      else { A.liveTick(); A.liveTick() } }
    for(let k=0;k<3;k++)A.liveTick();                          // more clicks after the whistle
    A.endLive(); A.endLive();                                  // Back, twice
    const P=(A.S.played&&A.S.played[A.callKey(step)])||[], mine=P.filter(p=>p.team===A.S.myTeam);
    const keys=mine.map(p=>p.other+'|'+!!p.cup); games++;
    ok(new Set(keys).size===keys.length,`${f} step ${step}: the same game recorded ${keys.length} times`);
  }
  // the tally counts each read or call once: equal to the reads stored
  const T=A.S.readTally||{n:0}, stored=Object.values(A.S.played||{}).reduce((a,L)=>a+L.filter(p=>p.team===A.S.myTeam).reduce((b,p)=>b+((p.reads||[]).length),0),0);
  ok(T.n===stored,`${f}: the tally counts ${T.n} calls, the games hold ${stored}`);
  console.log(`  ${f.padEnd(26)} ${games} live games, tally ${T.right||0} of ${T.n}`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: every game recorded once`);
process.exit(bad?1:0);
