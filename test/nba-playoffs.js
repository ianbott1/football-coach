/* Pro basketball: the season and the playoffs follow the league's rules,
   every season. 82 games each; the play-in (three games a conference, one
   7 and one 8 seed); best-of-seven series (first to four, four to seven
   games, home court 2-2-1-1-1 to the better seed); first-round pairings
   1-8, 4-5, 3-6, 2-7; each round pairs the last one's winners; the champion
   won the Finals.   node test/nba-playoffs.js [seasons=6]   MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||6);
const api=m.exports.load(path.join(__dirname,'..','dist','basketball-coach-pro.html'));
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
const HOME=[1,1,0,0,1,0,1];
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*7)%30],300+s,'T'); const E=api.SEA; let g=0;
  while(E.phase!=='done'&&g++<600)E.advance();
  const y=E.year, per={};
  E.weeks.slice(0,90).forEach(w=>w.games.forEach(x=>[x.home,x.away].forEach(t=>per[t]=(per[t]||0)+1)));
  ok(api.NAMES.every(t=>per[t]===82), `${y}: not everyone played 82 (${Math.min(...Object.values(per))}-${Math.max(...Object.values(per))})`);
  ['East','West'].forEach(sd=>{
    const pi=E.rounds.pi.filter(x=>x.title.indexOf(sd)===0);
    ok(pi.length===3, `${y} ${sd}: ${pi.length} play-in games`);
    const s7=Object.keys(E.seeds).filter(t=>E.seeds[t]===7&&E.sideOf(t)===sd), s8=Object.keys(E.seeds).filter(t=>E.seeds[t]===8&&E.sideOf(t)===sd);
    ok(s7.length===1&&s8.length===1, `${y} ${sd}: seeds 7 and 8 not settled`);
    const r1=E.series.r1.filter(x=>x.side===sd);
    ok(r1.length===4&&r1.map(x=>[E.seeds[x.hi],E.seeds[x.lo]].join('-')).join()==='1-8,4-5,3-6,2-7', `${y} ${sd}: first round ${r1.map(x=>E.seeds[x.hi]+'-'+E.seeds[x.lo]).join()}`);
  });
  ['r1','r2','r3','r4'].forEach((r,ri)=>{
    const S=E.series[r]||[];
    ok(S.length===[8,4,2,1][ri], `${y} ${r}: ${S.length} series`);
    S.forEach(x=>{
      const n=x.games.length, ww=x.w[x.winner], lw=x.w[x.loser];
      ok(ww===4&&lw<4&&n>=4&&n<=7&&n===ww+lw, `${y} ${r}: ${x.hi}-${x.lo} ended ${ww}-${lw} in ${n}`);
      x.games.forEach((gm,i)=>ok((gm.home===x.hi)===!!HOME[i], `${y} ${r} ${x.hi}-${x.lo} game ${i+1}: wrong home court`));
      if(r!=='r4')ok(E.seeds[x.hi]<E.seeds[x.lo], `${y} ${r}: ${x.hi} has home court but a worse seed`);
    });
    if(ri>0){const prevW=new Set((E.series[['r1','r2','r3'][ri-1]]||[]).map(x=>x.winner)), teams=[].concat(...S.map(x=>[x.hi,x.lo]));
      ok(teams.every(t=>prevW.has(t))&&teams.length===2*S.length, `${y} ${r}: a team that didn't win the last round`)}
  });
  ok(!!E.champion&&E.champion===E.series.r4[0].winner, `${y}: the champion didn't win the Finals`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH all ${checks} checks (${N} seasons)`);
process.exit(bad?1:0);
