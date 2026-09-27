/* The grade shown on the offseason screen must be the grade the history book
   records. Plays 8 careers x 3 seasons and compares the two.
     node test/grades.js [file.html]   last line: AGREE or DISAGREE */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}}; new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const file=process.argv[2]||path.join(__dirname,'..','dist','football-coach.html');
let bad=0,n=0;
for(const [team,seed] of [['Alabama',1],['Rice',2024],['Oregon',777],['Kent State',31337],['Georgia',5],['Toledo',6],['USC',7],['Iowa',8]]){
  const api=m.exports.load(file); api.newDynasty(team,seed,'T');
  for(let y=0;y<3;y++){
    while(api.SEA.phase!=='done'){api.doAdvance();let g=0;while(api.live&&!api.live.done&&g++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}}
    api.openOffseason();
    const shown=(global.__nodes.app.innerHTML.match(/class="grade">([^<]+)</)||[])[1];
    const S=api.S, my=S.myTeam, yr=api.SEA.year, rec=api.SEA.rec[my].join('-');
    if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||my;
    api.commitOffseason();
    const h=S.history[S.history.length-1]; n++;
    if(shown!==h.grade){bad++;console.log(`  ${my} ${yr} ${rec}: screen ${shown}, history ${h.grade} ("${h.result}")`)}
  }
}
console.log(bad?`DISAGREE ${bad} of ${n} seasons`:`AGREE ${n} of ${n} seasons`);
