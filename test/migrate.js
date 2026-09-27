/* Old saves: plays careers on a version-1 build (history entries without v),
   saves after every season, loads each save through the new build's load
   path, and compares every tab, every team's page and every season card with what the old
   build draws for the same save. Also checks a migrated entry equals the
   entry the new build writes natively for the same season.
     node test/migrate.js <v1 build.html> [new build.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const [oldF,newF=path.join(__dirname,'..','dist','football-coach.html')]=process.argv.slice(2);
const md5=x=>crypto.createHash('md5').update(x).digest('hex').slice(0,8);
const play=api=>{while(api.SEA.phase!=='done'){api.doAdvance();let g=0;while(api.live&&!api.live.done&&g++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}}
  api.openOffseason(); for(let c=0;c<4;c++){const S=api.S;if(!S.off)break;if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||S.myTeam;api.commitOffseason()}};
(async()=>{
  let bad=0,checks=0;
  for(const [team,seed,roster,strip] of [['Alabama',1],['Rice',2024],['Kent State',31337],
      ['Oregon',777,null,true],                                  // oldest saves: no post/pnote
      ['Alabama',99,[{team:'Alabama',name:'Coach A'},{team:'Rice',name:'Coach B'}]]]){
    const O=mk()(oldF), N=mk()(newF); const V=mk()(newF);
    O.newDynasty(team,seed,'T',roster); N.newDynasty(team,seed,'T',roster);
    for(let y=0;y<3;y++){
      play(O); play(N);
      const save=JSON.parse(JSON.stringify(O.S));
      if(strip)[save.history].concat((save.coaches||[]).map(c=>c.history)).forEach(H=>(H||[]).forEach(h=>{delete h.post;delete h.pnote}));
      const js=JSON.stringify(save);
      // the old build drawing its own save, vs the new build drawing it migrated
      const R=mk()(oldF); await R.loadSave(js); const want=R.allViews().concat(R.teamPages()), wantC=R.cards();
      const L=mk()(newF); await L.loadSave(js); const got=L.allViews().concat(L.teamPages()), gotC=L.cards();
      // the seat badge follows the firing rule, which changed on purpose: it
      // isn't expected to match the old build
      // ...nor the gameplan tip, rewritten on purpose when plans were rebalanced
      const noSeat=x=>x.replace(/<span class="seat [a-z]+">[^<]*<\/span>/g,'').replace(/<div class="mark" data-mark="plan">[\s\S]*?<\/div>/g,'').replace(/<button class="skip" id="simone">Sim it<\/button>/g,'').replace(/\s+/g,' ');   // the Sim it button is new on purpose   // whitespace: the owl gained a helmet slot
      want.forEach((w,i)=>{checks++;if(noSeat(w)!==noSeat(got[i])){bad++;console.log(`  ${team}#${seed} after ${2026+y}: tab ${i} differs`)}});
      // the game's name on the card changed on purpose ("College Football Coach"),
      // and the owl's markup gained a (college: empty) helmet slot
      const renamed=x=>JSON.stringify(x).replace(/COLLEGE FOOTBALL COACH/g,'FOOTBALL COACH').replace(/College Football Coach/g,'Football Coach').replace(/\\n\s*\\n(\s*)<!-- feet/g,'\\n$1<!-- feet').replace(/\s+/g,' ');
      wantC.forEach((w,i)=>{checks++;if(renamed(w)!==renamed(gotC[i])){bad++;console.log(`  ${team}#${seed}: card ${i} differs`)}});
      // migrated entries vs native v2 entries (strip changes content, so skip it there)
      // migrated entries have the same shape as the entries this build writes
      // (the careers themselves can differ once the game's rules change)
      // the entry's own structure: top-level fields and the named sub-records
      // (not the per-team tables, whose keys are team names)
      const SUB=['honours','group','coach','coaching','awards','league'];
      const shape=o=>Object.keys(o).sort().map(k=>SUB.includes(k)&&o[k]&&typeof o[k]==='object'?k+'{'+Object.keys(o[k]).sort().join(',')+'}':k).join(',');
      if(!strip)L.S.history.forEach((h,i)=>{const n=N.S.history[i]; if(!n||(n.teams===undefined)!==(h.teams===undefined))return;
        checks++; if(shape(h)!==shape(n)){bad++;console.log(`  ${team}#${seed} ${h.year}: migrated entry shape differs:\n    ${shape(h)}\n    ${shape(n)}`)}
        checks++; if(h.miss!==/Short of the mark|A bad year/.test(h.gradeLine||'')){bad++;console.log(`  ${team}#${seed} ${h.year}: miss flag disagrees with "${h.gradeLine}"`)}});
      if(L.S.history.some(h=>h.v!==2)){bad++;console.log('  unmigrated entry left')}
    }
  }
  console.log(bad?`MISMATCH ${bad} of ${checks} checks`:`MATCH ${checks} of ${checks} checks`);
  process.exit(bad?1:0);
})();
