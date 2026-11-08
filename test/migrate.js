/* Old saves: plays careers on a version-1 build (history entries without v),
   saves after every season, loads each save through the new build's load
   path, and compares every tab, every team's page and every season card with what the old
   build draws for the same save. Also checks a migrated entry equals the
   entry the new build writes natively for the same season.
     node test/migrate.js [v1 build.html] [new build.html]   last line: MATCH or MISMATCH
   The v1 build is kept in test/fixtures/football-coach-v1.html (the default). */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const [oldF=path.join(__dirname,'fixtures','football-coach-v1.html'),newF=path.join(__dirname,'..','dist','football-coach.html')]=process.argv.slice(2);
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
      const noSeat=x=>x.replace(/(<h2>Dynasty<\/h2>\s*<span>\d+ seasons?) done(?: &middot; \d+ under way)?/g,'$1').replace(/<span class="olab">(win probability|to win, before the game|before the game)<\/span>/g,'').replace(/<span class="rk"[^>]*>[^<]*<\/span>/g,'').replace(/ tb-long( tb-xl)?"/g,'"').replace(/<span class="seat [a-z]+"[^>]*>[^<]*<\/span>/g,'').replace(/<div class="mark" data-mark="plan">[\s\S]*?<\/div>/g,'').replace(/<button class="skip" id="simone">Sim (it|game)<\/button>/g,'').replace(/<!-- college: a football[\s\S]*?E45B4E[^>]*>/g,'').replace(/unranked \((\d+)(st|nd|rd|th)\)/g,'unranked ($1)').replace(/<button class="reset[^"]*" id="snd"[^>]*>[^<]*<\/button>/g,'').replace(/<button class="reset[^"]*" id="mus"[^>]*>[^<]*<\/button>/g,'').replace(/<button class="skip" id="skip2?">[\s\S]*?<\/button>/g,'').replace(/<div class="grouphead">The board's objectives<\/div><div class="objs">[\s\S]*?<div class="objnote">[\s\S]*?<\/div><\/div>/g,'').replace(/<div class="grouphead">Your seasons<\/div>[\s\S]*?(?=<div class="grouphead">Trophy cabinet|<div class="idcard)/g,'').replace(/<div class="grouphead">Trophy cabinet[\s\S]*?(?=<div class="idcard)/g,'').replace(/<div class="achtoast">(?:<div>[\s\S]*?<\/div>)+<\/div>/g,'').replace(/<div class="grouphead">Your players<\/div>[\s\S]*?(?=<div class="grouphead">)/g,'').replace(/<div class="wknav">[\s\S]*?<h2>([^<]*)<\/h2><span>([^<&]*)(?: &middot; (?:played|to come))?<\/span><\/div>\s*<button[^>]*>[^<]*<\/button><\/div>/g,'<div class="dateline"><h2>$1</h2><span>$2</span></div>').replace(/<button class="rewatch seedraw" data-wk="0">See the fixtures<\/button>/g,'').replace(/<span class="sline">(Home|On the road) against [^<]*<\/span>/g,'<span class="sline">$1</span>').replace(/<div class="venue">[\s\S]*?<\/div>/g,'').replace(/(<span class="stn">)[^ <]+ /g,'$1').replace(/ title="[^"]*"/g,'').replace(/<span class="rk">#?(\d+)<\/span>/g,'<span class="rk">$1</span>').replace(/<div class="stkey">[^<]*<\/div>/g,'').replace(/(<div class="pname( sm)?">)[A-Z][a-z'A-Z]+ /g,'$1').replace(/ <span class="stkeyin">\(rating points\)<\/span>/g,'').replace(/ <span class="planwhy">\(\+[\d.]+ points of win probability a game, \+[\d.]+ development\)<\/span>/g,'').replace(/: the team plays a little better while he's healthy(?: \(more so the better he is\))?, and he develops faster over the offseason\./g,' and speeds his development.').replace(/<span class="imag[^"]*">[^<]*<\/span>/g,'').replace(/(<div class="progline">)[A-Z][a-z]+ (?:strength )?since (\d+):\s*<b class="[a-z]*">[^<]*<\/b>/g,'$1since $2').replace(/<span class="obar"><i style="width:\d+%"><\/i><\/span>\s*<span class="opct">\d+%<\/span>/g,'<span class="odds-n"></span>').replace(/(<div class="pland">[^<]*?)\s*(?:&mdash;[^<]*|<span class="planwhy">[^<]*<\/span>)<\/div>/g,'$1</div>').replace(/<div class="confpick">[\s\S]*?<\/select><\/div>/g,'').replace(/(Starters &middot; average rating )\d+/g,'$1N').replace(/<div class="grouphead">Depth<\/div>/g,'').replace(/<div class="grouphead">[^<]*, season by season<\/div>/g,'<div class="grouphead">Season by season</div>').replace(/<div class="progline">Payroll [\s\S]*?<\/div>/g,'').replace(/ <span class="outtag">OUT \d+w<\/span><\/div>/g,'</div>').replace(/(<div class="cmeta">Head coach &middot; [^<]*?&middot; )coaching /g,'$1').replace(/<div class="series"><b>[^<]*<\/b> against them in your games[^<]*<\/div>/g,'').replace(/<span class="sx sxo?">[^<]*<\/span>/g,'').replace(/(The season hasn't started\. Hit the button below to play [^<]*<\/div>)[\s\S]*?(?=<\/main>)/g,'$1').replace(/\s+/g,' ');   // round 38: points for and against in the standings, new on purpose; round 31: "coaching solid" (beside Secure it read as one verdict), and a head-to-head line before any game against a team you've played   // Nov 2026, round 6: a conference picker on college standings, a club's starters averaged apart from its depth, payroll on team cards, OUT on a hurt backup; round 7: franchise strength in words, the club season list named; Nov 2026: the win chance is the engine's own curve, not the textbook one   // the Sim it button is new on purpose; ordinals fixed on purpose (31st, not 31th); the sound button is new on purpose; Sim ahead replaced the one-target skip on purpose; objectives, the trophy cabinet and its toasts are new on purpose; so is Your players (and Your seasons, above the cabinet since round 34), the Scores week stepper, and the quiet stakes line and venue line, rewritten to say how hard the game is; assistants renamed so no staff shares a first name; explanations added to the staff, injury and strength numbers, ranks shown as #N, and players renamed so no roster has two of one name (Nov 2026); featuring's effects described in words and injuries as Big/Real/Minor (Nov 2026)   // whitespace: the owl gained a helmet slot
      // a person's Coaches row is now their career (it double-counted in a hot seat: 20-6 for a 10-3
      // coach, Nov 2026), which reorders the list: compare the rows as a set, without records
      const coachList=x=>x.replace(/<span class="trec">[^<]*<\/span>/g,'').replace(/((?:<div class="frow cpick[^"]*"[\s\S]*?<\/div><\/div>\s*)+)/g,m=>m.split(/(?=<div class="frow cpick)/).map(r=>r.replace(/class="frow cpick[^"]*"/,'class="frow cpick"').trim()).sort().join(''));
      // in a hot seat the people's rows were double-counted, so who makes the shortlist changes too: that list isn't compared there
      // the under-fire card says why now (Nov 2026: "under fire" with no reason, Grokbot)
      const noWhy=x=>x.replace(/ (One of the weakest at the job in the league\.|You're \d+-\d+, and he isn't good enough to be spared it\.)\n?\s*/g,' ');
      want.forEach((w,i)=>{checks++;if(roster&&/youtag/.test(w)&&/class="trec"/.test(w))return; if(coachList(noSeat(noWhy(w)))!==coachList(noSeat(noWhy(got[i])))){bad++;console.log(`  ${team}#${seed} after ${2026+y}: tab ${i} differs`); if(process.env.DEBUG){ const A=coachList(noSeat(noWhy(w))),B=coachList(noSeat(noWhy(got[i]))); let k=0; while(k<A.length&&A[k]===B[k])k++; console.log('    old: '+A.slice(k-100,k+150)+'\n    new: '+B.slice(k-100,k+150)) }}});
      // the game's name on the card changed on purpose ("College Football Coach"),
      // and the owl's markup gained a (college: empty) helmet slot
      const renamed=x=>JSON.stringify(x).replace(/<!-- college: a football[\s\S]*?E45B4E[^>]*>/g,'')   // the college owl's football, new on purpose
        .replace(/COLLEGE FOOTBALL COACH/g,'FOOTBALL COACH').replace(/College Football Coach/g,'Football Coach').replace(/(\\n\s*)+<!-- feet/g,'\\n <!-- feet')   /* any number of blank lines before the feet */.replace(/\s+/g,' ');
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
