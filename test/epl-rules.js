/* English football: the leagues follow their rules every season.
   20 and 24 clubs, 38 and 46 games; points 3 a win, 1 a draw; tables by
   points, goal difference, goals scored; the play-offs third to eighth
   (5 v 8, 6 v 7; 3 v the lower-seeded winner, 4 v the higher; the final);
   three down, the top two and the play-off winner up; each club's recorded
   result matches where it finished.   node test/epl-rules.js [seasons=4] */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||4);
const api=m.exports.load(path.join(__dirname,'..','dist','football-manager.html'));
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
let draws=0,games=0,home=0,goals=0; api.newDynasty('Arsenal',41,'T');
for(let y=0;y<N;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<100)E.advance();
  const yr=E.year, C=t=>api.CONF[t], pl=api.NAMES.filter(t=>C(t)==='PL'), ch=api.NAMES.filter(t=>C(t)==='CH');
  ok(pl.length===20&&ch.length===24, `${yr}: ${pl.length} and ${ch.length} clubs`);
  const per={}; E.weeks.slice(0,46).forEach(w=>w.games.forEach(x=>{[x.home,x.away].forEach(t=>per[t]=(per[t]||0)+1);
    games++; goals+=x.hp+x.ap; if(x.draw)draws++; else if(x.winner===x.home)home++;
    ok(!!x.draw===(x.hp===x.ap), `${yr}: a league game ${x.hp}-${x.ap} marked draw=${!!x.draw}`)}));
  ok(pl.every(t=>per[t]===38)&&ch.every(t=>per[t]===46), `${yr}: not 38 and 46 games each`);
  ok(api.NAMES.every(t=>E.pts(t)===3*(E.regRec||E.rec)[t][0]+((E.drw||{})[t]||0)), `${yr}: points aren't 3 a win and 1 a draw`);
  ['PL','CH'].forEach(d=>{ const T=E.table(d);
    for(let i=1;i<T.length;i++){ const a=T[i-1], b=T[i], A=E.gfga(a), B=E.gfga(b);
      ok(E.pts(a)>E.pts(b)||(E.pts(a)===E.pts(b)&&((A[0]-A[1])>(B[0]-B[1])||((A[0]-A[1])===(B[0]-B[1])&&A[0]>=B[0]))), `${yr} ${d}: ${a} above ${b} out of order`)}});
  const T=E.table('CH'), S=E.po.seeds, R=E.rounds;
  ok(JSON.stringify(S)===JSON.stringify(T.slice(2,8)), `${yr}: the play-off seeds aren't third to eighth`);
  ok(R.po1.length===2&&[R.po1[0].home,R.po1[0].away].join()===[S[2],S[5]].join()&&[R.po1[1].home,R.po1[1].away].join()===[S[3],S[4]].join(), `${yr}: eliminators aren't 5 v 8 and 6 v 7`);
  const w=R.po1.map(x=>x.winner), lo=E.seeds[w[0]]>E.seeds[w[1]]?w[0]:w[1];
  ok(R.po2.length===2&&R.po2[0].home===S[0]&&R.po2[0].away===lo, `${yr}: third doesn't meet the lower-seeded eliminator winner`);
  ok(R.po3.length===1&&E.po.winner===R.po3[0].winner, `${yr}: the play-off final's winner isn't promoted`);
  [...R.po1,...R.po2,...R.po3].forEach(x=>ok(!!x.winner&&!x.draw, `${yr}: a play-off game without a winner`));
  const down=E.table('PL').slice(-3), up=[T[0],T[1],E.po.winner];
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
  ok(down.every(t=>api.CONF[t]==='CH')&&up.every(t=>api.CONF[t]==='PL'), `${yr}: promotion and relegation didn't move the right clubs`);
  const H=api.S.history[api.S.history.length-1], res=H.league&&H.league.res;
  ok(!!res&&/Relegated/.test(res[down[0]])&&/Promoted|WINNERS/.test(res[up[0]]), `${yr}: recorded results don't match (${res&&res[down[0]]}; ${res&&res[up[0]]})`);
}
console.log(`  (league games: draws ${(100*draws/games).toFixed(1)}%, home wins ${(100*home/games).toFixed(1)}%, goals ${(goals/games).toFixed(2)} a game; PL ~24 / ~45 / ~2.8)`);
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH all ${checks} checks (${N} seasons)`);
process.exit(bad?1:0);
