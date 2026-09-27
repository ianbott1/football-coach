/* The team page's goal line and seat badge tell the truth mid-season, in all
   three games: a target is never "out of reach" while enough games remain;
   a team winning at least 80% and on pace for its target is never "Under
   pressure" (found in basketball at 19-2: the badge graded an unfinished
   season as a missed tournament; the goal line counted 12 games left minus
   games played, a college football season).
     node test/goals.js     last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const D=f=>path.join(process.env.DIST||path.join(__dirname,'..','dist'),f);   // DIST=dir to test other builds
const CASES=[[D('football-coach.html'),['Alabama','Ohio State','Rice','Kent State']],
             [D('football-coach-pro.html'),['Buffalo','Kansas City','Carolina','NY Jets']],
             [D('basketball-coach.html'),['Houston','Duke','Gonzaga','Coppin State']]];
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=8)console.log('  FAIL '+m)}};
for(const [file,teams] of CASES) for(const [k,team] of teams.entries()){
  const api=mk()(file); api.newDynasty(team,40+k,'T'); const W=api.LEAGUE_WEEKS?api.LEAGUE_WEEKS():null;
  let g=0;
  while(api.SEA.phase==='week'&&g++<60){
    api.doAdvance(); let n=0; while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
    const E=api.SEA, my=api.S.myTeam, [w,l]=E.rec[my]; if(w+l<3)continue;
    const h=api.view('team').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    const left=E.sched.filter(x=>x.week>=E.step&&(x.home===my||x.away===my)).length;
    const m=h.match(/(\d+) wins is out of reach now/);
    if(m)ok(+m[1]-w>left, `${path.basename(file)} ${my} ${w}-${l}: "${m[1]} wins is out of reach" with ${left} games left`);
    const tgt=(h.match(/(\d+) more wins? from the (\d+) expected/)||[])[2]||(h.match(/Target of (\d+) wins/)||[])[1];
    const pace=w/(w+l)*(w+l+left);
    if(w/(w+l)>=0.8&&tgt&&pace>=+tgt&&w+l>=6)ok(!/Under pressure/.test(h)||/HOT SEAT/.test(h), `${path.basename(file)} ${my} ${w}-${l} (on pace for ${pace.toFixed(0)}, target ${tgt}): "Under pressure"`);
  }
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: goal lines and seat badges tell the truth`);
process.exit(bad?1:0);
