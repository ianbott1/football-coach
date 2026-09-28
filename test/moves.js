/* Changing jobs in the offseason (fired, or taking an offer) must file the
   season just coached under the team you coached: its record, its result,
   its grade. The next season is the new team's.
     node test/moves.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; console.log('  FAIL '+m)}};
const play=async (api,badly)=>{let g=0;while(api.SEA.phase!=='done'&&g++<600){if(badly)api.setPlan('safe');api.doAdvance();
  const b=global.__nodes.hgo; if(/handwrap/.test(global.__nodes.app.innerHTML)&&b&&b.onclick)b.onclick();
  let n=0;while(api.live&&!api.live.done&&n++<800){if(api.live.ask){const o=api.live.ask.dp.opts;api.answerLive(o[badly?o.length-1:0][0])}else api.liveTick()}
  await new Promise(r=>setImmediate(r))}};
(async()=>{
  const LG=mk()(file).leagueId();
  const cases=LG==='cfb'
    ? [{team:'Iowa',seed:3,move:'Nebraska'},{team:'Rice',seed:4,move:'Tulane'},{team:'Iowa',seed:5,move:'Nebraska',hot:'Kansas'}]
    : [{team:'Chicago',seed:31,natural:true},{team:'Detroit',seed:4,move:'Miami'},{team:'Detroit',seed:5,move:'Miami',hot:'Seattle'}];
  for(const c of cases){
    let api;
    if(c.natural){
      // a real firing: play badly on purpose, and find a seed where it comes within 6 seasons
      for(let seed=c.seed;seed<c.seed+30;seed++){
        const t=mk()(file); t.newDynasty(c.team,seed,'T'); let fired=false;
        // a firing that comes with job offers (with none, the only choice is to retire)
        for(let y=0;y<6&&!fired;y++){await play(t,true); t.openOffseason();
          fired=t.S.off.act.userOpen&&t.S.off.jobs.length>0;
          if(!fired){ if(t.S.off.act.userOpen)break; t.commitOffseason() }}
        if(fired){c.seed=seed; c.firedYear=t.SEA.year; break}
      }
    }
    api=mk()(file);
    api.newDynasty(c.team,c.seed,'T',c.hot?[{team:c.team,name:'Coach A'},{team:c.hot,name:'Coach B'}]:null);
    let moved=false;
    for(let y=0;y<6&&!moved;y++){
      await play(api,c.natural);
      const E=api.SEA, coached=api.S.myTeam, rec=E.rec[coached].join('-'), result=E.seasonResult(coached);
      api.openOffseason(); const S=api.S;
      if(c.natural){ if(S.off.act.userOpen){S.off.move=S.off.jobs[0]; moved=true} }
      else if(y===1){ S.off.move=c.move; moved=true }
      else if(S.off.act.userOpen)S.off.move=S.off.jobs[0]||coached;
      const exp=S.expNow;
      const grade=moved?api.seasonGradeFor(E.rec[coached][0],E.rec[coached][1],result,exp).g:null;
      const dest=S.off.move;
      api.commitOffseason();
      if(c.hot&&api.S.off){                                          // coach B's offseason
        const O=api.S.off; if(O.act.userOpen&&O.move===null)O.move=O.jobs[0]||'retire';
        api.commitOffseason() }
      await new Promise(r=>setImmediate(r));
      if(!moved)continue;
      // the mover is coach A: in a hot seat their book is in S.coaches[0]
      if(c.hot){api.stashCoach(); api.loadCoach(0)}
      const H=api.S.history, h=H.find(x=>x.year===E.year);
      const label=`${c.team}${c.hot?' (hot seat)':''} ${E.year}, ${c.natural?'fired':'moved'} to ${dest}`;
      ok(h&&h.team===coached, `${label}: entry team ${h&&h.team}, should be ${coached}`);
      ok(h&&h.rec===rec, `${label}: entry record ${h&&h.rec}, should be ${rec}`);
      ok(h&&h.result===result, `${label}: entry result "${h&&h.result}", should be "${result}"`);
      ok(h&&h.grade===grade, `${label}: entry grade ${h&&h.grade}, should be ${grade}`);
      ok(api.S.myTeam===dest, `${label}: now coaching ${api.S.myTeam}`);
      // and the next season is the new team's (a season always starts with coach 1,
      // who is already loaded after reading their book above)
      await play(api); api.openOffseason();
      const pick=()=>{const O=api.S.off; if(O&&O.act.userOpen&&O.move===null)O.move=O.jobs[0]||'retire'};
      pick(); api.commitOffseason(); if(c.hot&&api.S.off){pick(); api.commitOffseason()}
      if(c.hot){api.stashCoach(); api.loadCoach(0)}
      const h2=api.S.history.find(x=>x.year===E.year+1);
      ok(h2&&h2.team===dest, `${label}: next season filed under ${h2&&h2.team}, should be ${dest}`);
    }
    ok(moved, `${c.team}: the move never happened (test setup)`);
  }
  console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} of ${checks} checks`);
  process.exit(bad?1:0);
})();
