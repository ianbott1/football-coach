/* Pro offseason, your draft board: the screen shows the class and your board;
   the class is the same when reopened or reloaded; with a full board, every
   one of your picks comes off it, and in board order (each pick is the
   highest player still there, so later picks sit lower on the board).
     node test/draftboard.js [pro build]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach-pro.html');
let bad=0; const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++};
(async()=>{
  for(const [team,seed] of [['Detroit',3],['Tennessee',8],['Seattle',21]]){
    const api=mk()(file); api.newDynasty(team,seed,'T');
    let g=0; while(api.SEA.phase!=='done'&&g++<80){api.doAdvance();let n=0;while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}await new Promise(r=>setImmediate(r))}
    api.openOffseason(); const S=api.S;
    const screen=global.__nodes.app.innerHTML;
    ok(/Your draft board/.test(screen)&&(screen.match(/data-bdadd=/g)||[]).length===30, `${team}: the screen shows your board and 30 prospects`);
    const C=api.draftClass(); const names=C.list.map(p=>p.n).join('|');
    // the same class after a reload in the middle of the offseason
    const js=JSON.stringify(api.S); const R=mk()(file); await R.loadSave(js); R.openOffseason();
    ok(R.draftClass().list.map(p=>p.n).join('|')===names, `${team}: the same class after a reload`);
    // a full board: 60 prospects in a scrambled order, so it differs from any style
    const ids=C.list.map(p=>p.pid).sort((a,b)=>((a*7919)%61)-((b*7919)%61)).slice(0,60);
    S.off.picks.board=ids.slice();
    if(S.off.act.userOpen)S.off.move=S.myTeam;
    api.commitOffseason(); await new Promise(r=>setImmediate(r));
    const h=api.S.history.slice(-1)[0], mine=(h.league.draft||[]).filter(d=>d.team===team).sort((a,b)=>a.d.overall-b.d.overall);
    const pos=mine.map(d=>ids.indexOf(d.pid));
    ok(mine.length===7, `${team}: made ${mine.length} picks`);
    // the last pick of the draft (#224) takes the one player left, board or not
    const onBoard=mine.map((d,i)=>({i:pos[i],last:d.d.overall===224})).filter(x=>!(x.last&&x.i<0)).map(x=>x.i);
    ok(onBoard.every(i=>i>=0), `${team}: every pick came off the board (board positions ${pos.join(', ')})`);
    ok(onBoard.every((v,i)=>i===0||v>onBoard[i-1]), `${team}: picks in board order`);
    if(process.env.DBG)mine.forEach((d,i)=>console.log('     ',d.d.round+'.'+d.d.pick,'#'+d.d.overall,d.n,d.p,'pid',d.pid,'board index',pos[i]));
  }
  console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH all checks');
  process.exit(bad?1:0);
})();
