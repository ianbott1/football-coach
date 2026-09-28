/* Every game at both widths: the phone layout (the bottom bar) and the
   laptop layout (1024px and up: the side panel). A season each, every
   screen drawn at several points; nothing crashes, and the laptop layout's
   side panel has its main button (and Sim game when you have a game).
     node test/layouts.js     last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0,drawn=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
for(const [file,team] of [['football-coach.html','Alabama'],['football-coach-pro.html','Kansas City'],['basketball-coach.html','Duke'],['basketball-coach-pro.html','Boston'],['hockey-coach-pro.html','Boston']]){
  for(const w of [390,1280]){
    const api=mk()(D(file)); global.window.scrollTo=()=>{}; global.window.innerWidth=w; api.newDynasty(team,4,'T');
    const where=`${file.replace('.html','')} at ${w}px`;
    const draw=(when)=>{
      for(const v of ['team','scores','poll','stand']){ try{const h=api.view(v); drawn++;
          if(w>=1024&&v==='team'){ ok(/id="adv2"/.test(h), `${where} ${when}: no main button in the side panel`);
            const ug=api.SEA.phase==='week'?api.SEA.nextGame(api.S.myTeam):api.SEA.postMatchup(api.S.myTeam);
            if(ug&&api.SEA.phase!=='done')ok(/id="simone2"/.test(h), `${where} ${when}: no Sim game in the side panel`) } }
        catch(e){ok(false, `${where} ${when}, ${v} tab crashed: ${e.message}`)} }
      for(const d of ['program','teams','coaches','shared','history']){ try{api.view('dyn',d);drawn++}catch(e){ok(false, `${where} ${when}, Dynasty/${d} crashed: ${e.message}`)} }
    };
    draw('at the start');
    let g=0; while(api.SEA.phase!=='done'&&g++<600){ api.doAdvance(); let n=0;
      while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
      if(g%9===0)draw('at '+api.SEA.phase+' '+api.SEA.step) }
    draw('at the end');
    try{ api.openOffseason(); drawn++; api.view('team'); drawn++ }catch(e){ok(false, `${where}: the offseason screen crashed: ${e.message}`)}
  }
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${drawn} screens drawn)`:`MATCH ${checks} checks, ${drawn} screens drawn at both widths in every game`);
process.exit(bad?1:0);
