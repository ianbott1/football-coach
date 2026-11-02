/* The postseason is yours only where you play in it. A team that isn't in a
   round is never offered "Play the Super Bowl": the button says it sims on,
   and one click takes it to its next game or the end. A team still in it is
   offered its own games, and a series that's over never asks for game 5.
     node test/postseason-gate.js */
const path=require('path');const {load}=require('./harness.js');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+m)}};
const CASES=[['football-coach-pro.html',['NY Jets','Kansas City']],['basketball-coach-pro.html',['Washington','Boston']],
  ['hockey-coach-pro.html',['San Jose','Colorado']],['soccer-coach.html',['Hull City','Arsenal']],
  ['football-coach.html',['Kent State','Ohio State']],['basketball-coach.html',['Coppin State','Duke']]];
for(const [f,teams] of CASES) for(const team of teams){
  const A=load({file:path.join(__dirname,'..','dist',f),expose:['S','SEA','newDynasty','doAdvance','live','liveTick','answerLive','endLive','advLabel']});
  A.newDynasty(team,3,'T'); A.S.watchMode='never'; let g=0;
  while(A.SEA.phase==='week'&&g++<400)A.doAdvance();
  let clicks=0, mine=0;
  while(A.SEA.phase!=='done'&&clicks<200){
    const m=A.SEA.postMatchup(A.S.myTeam), lab=A.advLabel(); clicks++;
    if(m){ mine++; ok(!/^Sim to your next/.test(lab),`${f} ${team}: "${lab}" with a game to play`) }
    else ok(/^Sim to your next game/.test(lab),`${f} ${team}: "${lab}" with no game of yours this round`);
    A.doAdvance(); let n=0; while(A.live&&!A.live.done&&n++<3000){A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick()} if(A.live)A.endLive();
  }
  ok(A.SEA.phase==='done',`${f} ${team}: the postseason never finished`);
  ok(clicks<=mine+mine+2,`${f} ${team}: ${clicks} clicks for ${mine} games of yours`);
  console.log(`  ${f.padEnd(26)} ${team.padEnd(14)} ${mine} games of yours, ${clicks} clicks to the end`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the postseason only asks you to play your own games`);
process.exit(bad?1:0);
