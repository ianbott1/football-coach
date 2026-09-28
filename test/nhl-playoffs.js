/* Pro hockey: the season and the playoffs follow the league's rules every
   season. 84 games each; points = 2 a win + 1 an overtime loss; 16
   qualifiers: the top three in each division and two wild cards in each
   conference; the better division winner plays the second wild card, the
   other the first, 2 v 3 in each division; best of seven, first to four,
   2-2-1-1-1 with home ice to more points; each round pairs the last one's
   winners; the champion won the Final.   node test/nhl-playoffs.js [seasons=5] */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||5);
const api=m.exports.load(path.join(__dirname,'..','dist','hockey-coach-pro.html'));
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
const HOME=[1,1,0,0,1,0,1]; let otl=0,ptsAll=0,teams=0;
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*5)%32],400+s,'T'); const E=api.SEA; let g=0;
  while(E.phase!=='done'&&g++<200)E.advance();
  const y=E.year, per={}, myOtl={};
  E.weeks.slice(0,97).forEach(w=>w.games.forEach(x=>{[x.home,x.away].forEach(t=>per[t]=(per[t]||0)+1); if(x.ot)myOtl[x.loser]=(myOtl[x.loser]||0)+1}));
  ok(api.NAMES.every(t=>per[t]===84), `${y}: not everyone played 84`);
  ok(api.NAMES.every(t=>E.pts(t)===2*(E.regRec||E.rec)[t][0]+((E.otl||{})[t]||0)&&((E.otl||{})[t]||0)===(myOtl[t]||0)), `${y}: points or overtime losses don't add up`);
  api.NAMES.forEach(t=>{otl+=(myOtl[t]||0); ptsAll+=E.pts(t); teams++});
  ok(E.field.length===16, `${y}: ${E.field.length} qualifiers`);
  const sides={East:['ATL','MET'],West:['CEN','PAC']};
  Object.keys(sides).forEach(sd=>{
    const inSide=api.NAMES.filter(t=>E.sideOf(t)===sd), top=new Set(), dw={};
    sides[sd].forEach(d=>{const div=inSide.filter(t=>api.CONF[t]===d).sort((a,b)=>E._tb(a,b)); div.slice(0,3).forEach(t=>top.add(t)); dw[d]=div});
    const wc=inSide.filter(t=>!top.has(t)).sort((a,b)=>E._tb(a,b)).slice(0,2);
    const want=new Set([...top,...wc]);
    ok([...want].every(t=>E.field.indexOf(t)>=0)&&E.field.filter(t=>E.sideOf(t)===sd).length===8, `${y} ${sd}: the wrong eight qualified`);
    const [d1,d2]=sides[sd].slice().sort((a,b)=>E._tb(dw[a][0],dw[b][0]));
    const pairs=E.series.r1.filter(x=>x.side===sd).map(x=>[x.hi,x.lo].sort().join('|'));
    const exp=[[dw[d1][0],wc[1]],[dw[d1][1],dw[d1][2]],[dw[d2][0],wc[0]],[dw[d2][1],dw[d2][2]]].map(p=>p.sort().join('|'));
    ok(JSON.stringify(pairs)===JSON.stringify(exp), `${y} ${sd}: first-round pairings ${pairs.join(', ')} (expected ${exp.join(', ')})`);
  });
  ['r1','r2','r3','r4'].forEach((r,ri)=>{
    const S=E.series[r]||[]; ok(S.length===[8,4,2,1][ri], `${y} ${r}: ${S.length} series`);
    S.forEach(x=>{ const n=x.games.length, ww=x.w[x.winner], lw=x.w[x.loser];
      ok(ww===4&&lw<4&&n>=4&&n<=7, `${y} ${r}: ${x.hi}-${x.lo} ended ${ww}-${lw} in ${n}`);
      ok(E._tb(x.hi,x.lo)<=0, `${y} ${r}: ${x.hi} has home ice with fewer points`);
      x.games.forEach((gm,i)=>ok((gm.home===x.hi)===!!HOME[i], `${y} ${r} game ${i+1}: wrong home ice`)); });
    if(ri>0){const prevW=new Set((E.series[['r1','r2','r3'][ri-1]]||[]).map(x=>x.winner));
      ok([].concat(...S.map(x=>[x.hi,x.lo])).every(t=>prevW.has(t)), `${y} ${r}: a team that didn't win the last round`)}
  });
  ok(!!E.champion&&E.champion===E.series.r4[0].winner, `${y}: the champion didn't win the Final`);
}
console.log(`  (overtime losses a team a season ${(otl/teams).toFixed(1)}, NHL ~9-10; points a team ${(ptsAll/teams).toFixed(1)}, 84 games: ~94)`);
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH all ${checks} checks (${N} seasons)`);
process.exit(bad?1:0);
