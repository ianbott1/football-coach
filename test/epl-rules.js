/* English football, the whole pyramid: the leagues follow their 2026-27 rules
   every season. Seven divisions (20 and six of 24), 38 and 46 games; points 3 a
   win, 1 a draw; every table by points, goal difference, goals scored; each
   division's play-off seeds; every promotion and relegation applied, the
   National League's relegated to North or South; every division at its size
   after the summer.   node test/epl-rules.js [seasons=4] */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||4);
const api=m.exports.load(path.join(__dirname,'..','dist','football-coach-england.html'));
const DIVS={PL:{up:0,po:null,down:3},CH:{up:2,po:[3,8],down:3},L1:{up:2,po:[3,6],down:4},L2:{up:3,po:[4,7],down:2},
            NL:{up:1,po:[2,7],down:4},NN:{up:1,po:[2,7],down:0},NS:{up:1,po:[2,7],down:0}};
const SIZE={PL:20,CH:24,L1:24,L2:24,NL:24,NN:24,NS:24}, ABOVE={CH:"PL",L1:"CH",L2:"L1",NL:"L2",NN:"NL",NS:"NL"};
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
let draws=0,games=0; api.newDynasty('Spalding United',41,'T');
for(let y=0;y<N;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<100)E.advance();
  const yr=E.year, C=t=>api.CONF[t], per={};
  Object.keys(SIZE).forEach(d=>ok(api.NAMES.filter(t=>C(t)===d).length===SIZE[d], `${yr} ${d}: wrong size`));
  E.weeks.slice(0,46).forEach(w=>w.games.forEach(x=>{[x.home,x.away].forEach(t=>per[t]=(per[t]||0)+1); games++; if(x.draw)draws++;
    ok(C(x.home)===C(x.away), `${yr}: a cross-division league game`)}));
  ok(api.NAMES.every(t=>per[t]===(C(t)==='PL'?38:46)), `${yr}: not 38 and 46 games each`);
  ok(api.NAMES.every(t=>E.pts(t)===3*(E.regRec||E.rec)[t][0]+((E.drw||{})[t]||0)), `${yr}: points aren't 3 a win and 1 a draw`);
  const expectMove={};
  Object.keys(DIVS).forEach(d=>{ const R=DIVS[d], T=E.table(d), P=E.po[d];
    for(let i=1;i<T.length;i++){const a=T[i-1],b=T[i],A=E.gfga(a),B=E.gfga(b);
      ok(E.pts(a)>E.pts(b)||(E.pts(a)===E.pts(b)&&((A[0]-A[1])>(B[0]-B[1])||((A[0]-A[1])===(B[0]-B[1])&&A[0]>=B[0]))), `${yr} ${d}: table out of order`)}
    if(R.po){ ok(JSON.stringify(P.seeds)===JSON.stringify(T.slice(R.po[0]-1,R.po[1])), `${yr} ${d}: play-off seeds wrong`);
      ok(!!P.winner&&P.rounds.po3.length===1&&P.rounds.po3[0].winner===P.winner, `${yr} ${d}: no play-off winner`) }
    T.slice(0,R.up).concat(P.winner?[P.winner]:[]).forEach(t=>expectMove[t]=ABOVE[d]||d);
    if(R.down)T.slice(-R.down).forEach(t=>expectMove[t]=d==='NL'?'NN|NS':({PL:'CH',CH:'L1',L1:'L2',L2:'NL'})[d]);
  });
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
  Object.keys(expectMove).forEach(t=>ok(expectMove[t].split('|').indexOf(C(t))>=0, `${yr}: ${t} should be in ${expectMove[t]}, is in ${C(t)}`));
  Object.keys(SIZE).forEach(d=>ok(api.NAMES.filter(t=>C(t)===d).length===SIZE[d], `${yr} ${d}: wrong size after the summer`));
}
console.log(`  (draws ${(100*draws/games).toFixed(1)}% of ${games} league games)`);
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH all ${checks} checks (${N} seasons, the whole pyramid)`);
process.exit(bad?1:0);
