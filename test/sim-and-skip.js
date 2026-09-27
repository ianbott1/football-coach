/* Simming and skipping, in all four games:
   - "Sim game" is there beside the main button in both layouts (the bottom
     bar, and the desktop side panel a laptop shows) and resolves your game
     without opening it;
   - Skip in a live game continues from the current score (each side ends
     with at least what it had), it doesn't start again;
   - reloading in the middle of a game never asks a call you already made.
     node test/sim-and-skip.js     last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; console.log('  FAIL '+msg)}};
(async()=>{
for(const [file,team] of [['football-coach.html','Alabama'],['football-coach-pro.html','Kansas City'],['basketball-coach.html','Duke'],['basketball-coach-pro.html','Boston']]){
  const name=file.replace('.html','');
  for(const [w,id] of [[390,'simone'],[1280,'simone2']]){
    const api=mk()(D(file)); global.window.scrollTo=()=>{}; global.window.innerWidth=w; api.newDynasty(team,6,'T');
    const h=api.view('team'); ok(new RegExp('id="'+id+'">Sim game<').test(h), `${name}: no Sim game button at ${w}px`);
    const b=global.__nodes[id], rec0=api.SEA.rec[team].join('-'); if(b&&b.onclick)b.onclick();
    ok(api.SEA.step===1&&!api.live&&api.SEA.rec[team].join('-')!==rec0, `${name} at ${w}px: Sim game didn't resolve the game without opening it`);
  }
  // skip continues from the current score
  { const api=mk()(D(file)); global.window.scrollTo=()=>{}; global.window.innerWidth=390; api.newDynasty(team,9,'T');
    api.doAdvance(); let n=0; while(api.live&&!api.live.done&&n++<6){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
    if(api.live&&!api.live.done){ const h0=api.live.eng.h, a0=api.live.eng.a, g=api.live.g;
      api.view('team'); const sk=global.__nodes.wskip; if(sk&&sk.onclick)sk.onclick();
      const x=api.SEA.weeks[0].games.find(x=>x.home===g.home&&x.away===g.away);
      ok(!!x&&x.hp>=h0&&x.ap>=a0, `${name}: skipped at ${a0}-${h0}, finished ${x?x.ap+'-'+x.hp:'?'}: not from the current score`) } }
  // reload mid-game: a call already made isn't asked again
  { const A=mk()(D(file)); global.window.scrollTo=()=>{}; A.newDynasty(team,5,'T');
    let js=null, asked=[], steps=0;
    while(!js&&steps++<30){ A.doAdvance(); let n=0;
      while(A.live&&!A.live.done&&n++<400){ if(A.live.ask){ asked.push(A.live.ask.dp.k); A.answerLive(A.live.ask.dp.opts[0][0]); if(!js)js=JSON.stringify(A.S) } else A.liveTick() } }
    if(js){ const B=mk()(D(file)); global.window.scrollTo=()=>{}; await B.loadSave(js); B.doAdvance();
      const again=[]; let n=0; while(B.live&&!B.live.done&&n++<400){ if(B.live.ask){again.push(B.live.ask.dp.k); B.answerLive(B.live.ask.dp.opts[0][0])} else B.liveTick() }
      ok(again.length===asked.slice(1).length, `${name}: after a reload ${again.length} calls asked, ${asked.length-1} expected (the first was already made)`);
    } }
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: Sim game in both layouts, Skip continues, made calls stay made`);
process.exit(bad?1:0);
})();
