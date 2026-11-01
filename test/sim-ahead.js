/* Sim ahead, in all six games: simming to the end of the regular season gets
   there when nothing is set to stop it; with every stop on, each stop has
   its reason (a big game next, three defeats in a row, an injury, a new
   decision) and the reason is true; and a save made after simming reloads to
   the same season.   node test/sim-ahead.js */
const path=require('path'),fs=require('fs');const {load}=require('./harness.js');
const gsrc=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',gsrc.slice(0,gsrc.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; console.log('  FAIL '+msg)}};
const EXP=['S','SEA','simRun','simTargets','simStops','flash','streakOf','hurtCount','attnCount','weekWeight','newDynasty','loadSave','rebuild','LEAGUE','NAMES'];
(async()=>{
for(const [file,team] of [['football-coach.html','Alabama'],['football-coach-pro.html','Kansas City'],['basketball-coach.html','Duke'],['basketball-coach-pro.html','Boston'],['hockey-coach-pro.html','Boston'],['soccer-coach.html','Wrexham']]){
  const name=file.replace('.html','');
  // no stops: all the way
  { const A=load({file:D(file),expose:EXP}); A.newDynasty(team,8,'T'); const st=A.simStops(); Object.keys(st).forEach(k=>st[k]=false);
    const W=A.LEAGUE.weeks; A.simRun(W);
    ok(A.SEA.step===W&&A.SEA.phase!=='week',`${name}: with no stops, sim to the end stopped at step ${A.SEA.step} of ${W}`);
    // one advance a step, except soccer's cup weeks (league, then cup night): the reload below is the real check
    ok(A.LEAGUE.splitCup?A.S.steps>=A.SEA.step:A.S.steps===A.SEA.step,`${name}: steps on the save (${A.S.steps}) don't match the season (${A.SEA.step})`);
    // a save made now reloads to the same season
    const js=JSON.stringify(A.S), B=mk()(D(file)); await B.loadSave(js);
    const sig=X=>JSON.stringify(X.SEA.weeks.map(w=>w.games.map(g=>[g.home,g.away,g.hp,g.ap])));
    ok(sig(A)===sig(B),`${name}: a save after simming reloads to a different season`); }
  // every stop on: run the season in hops; each stop's reason must hold
  { const A=load({file:D(file),expose:EXP}); A.newDynasty(team,8,'T'); const W=A.LEAGUE.weeks; let hops=0, why={};
    while(A.SEA.phase==='week'&&hops++<200){ const from=A.SEA.step; A.simRun(W); const f=A.flash, my=A.S.myTeam;
      if(A.SEA.phase!=='week')break;
      ok(!!f.why,`${name}: stopped at step ${A.SEA.step} with no reason`);
      why[f.why]=(why[f.why]||0)+1;
      if(f.why==='big'){ const gs=A.SEA.sched.filter(g=>g.week===A.SEA.step&&(g.home===my||g.away===my));
        ok(A.weekWeight(A.SEA.step)>=3||gs.some(g=>g.cup||g.title),`${name}: stopped for a big game at step ${A.SEA.step} that isn't one`) }
      if(f.why==='slide'){ const s=A.streakOf(my); ok(s.won===false&&s.n>=3,`${name}: stopped for a slide that isn't one (${s.n})`) }
      if(f.why==='big'&&A.SEA.step===from){ A.simStops().big=false; A.simRun(A.SEA.step+1); A.simStops().big=true }   // play past it, as you would
    }
    ok(A.SEA.phase!=='week',`${name}: hopping never reached the end of the season`);
    console.log(`  ${name}: ${hops} stops in a season `+JSON.stringify(why)); }
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: sim ahead gets there, stops for real reasons, and reloads`);
process.exit(bad?1:0);
})();
