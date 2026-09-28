/* Reloading a save must give back the season you played. Plays careers
   (one coach, and a hot seat whose teams meet), saves at several points —
   mid-season, mid-postseason, in the offseason, into a second season —
   reloads each save through the real load path, and compares every game,
   the standings, the ranking and the history book.
     node test/reload.js [file.html]    last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const h=o=>crypto.createHash('md5').update(JSON.stringify(o)??'undefined').digest('hex').slice(0,8);   // empty fields (hockey's OT losses before the first OT) too
const step=api=>{api.doAdvance();let n=0;while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[(n+api.SEA.step)%api.live.ask.dp.opts.length][0]):api.liveTick()}};
const offseason=api=>{api.openOffseason();for(let c=0;c<4;c++){const S=api.S;if(!S.off)break;if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||S.myTeam;api.commitOffseason()}};
const state=api=>{const E=api.SEA;return {
  games:E.weeks.map(w=>w.games.map(g=>[g.home,g.away,g.hp,g.ap])), rec:E.rec, rank:E.ranking?0:E.poll.order(),
  post:E.postPools().map(p=>p.map(g=>[g.home,g.away,g.hp,g.ap])), step:E.step, year:E.year,
  history:api.S.history, coaches:(api.S.coaches||[]).map(c=>c.history)}};
(async()=>{
  let bad=0,n=0;
  const LG=mk()(file).leagueId();
  // each league's own teams (college basketball had been passing on pro football's names by
  // coincidence: Kansas City, Tennessee and Denver are Division I schools too)
  const [T1,T2,R1,R2]=LG==='cfb'?['Alabama','Rice','Alabama','Auburn']
    :LG==='ncaab'?['Duke','Rice','Duke','North Carolina']
    :LG==='nba'?['Boston','Denver','Boston','New York']
    :LG==='nhl'?['Boston','Toronto','Boston','Montreal']
    :['Kansas City','Tennessee','Kansas City','Denver'];
  for(const [team,seed,roster] of [[T1,1],[T2,2024],
        [R1,99,[{team:R1,name:'Coach A'},{team:R2,name:'Coach B'}]]]){
    const A=mk()(file); A.newDynasty(team,seed,'T',roster);
    const label=team+'#'+seed+(roster?' (hot seat)':'');
    const check=async(when)=>{
      const B=mk()(file); await B.loadSave(JSON.stringify(A.S));
      const a=state(A), b=state(B); n++;
      const diffs=Object.keys(a).filter(k=>h(a[k])!==h(b[k]));
      if(diffs.length){bad++;
        const wk=a.games.findIndex((w,i)=>h(w)!==h(b.games[i]));
        console.log(`  ${label} ${when}: ${diffs.join(', ')} differ`+(wk>=0?` (first in week ${wk+1})`:''));}
    };
    let g=0; while(A.SEA.step<7&&g++<50)step(A); await check('week 7');
    while(A.SEA.phase==='week'&&g++<80)step(A); await check('end of regular season');
    while(A.SEA.phase!=='done'&&g++<120)step(A); await check('end of postseason');
    offseason(A); await check('start of season 2');
    while(A.SEA.step<5&&g++<160)step(A); await check('season 2 week 5');
  }
  console.log(bad?`MISMATCH ${bad} of ${n} reloads`:`MATCH ${n} of ${n} reloads`);
  process.exit(bad?1:0);
})();
