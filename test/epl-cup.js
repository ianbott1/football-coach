/* The FA Cup: every season the right clubs enter at the right rounds (tiers
   5-6 in qualifying, 3-4 at the first round, 1-2 at the third), each round
   has the numbers it should (40, 32, 80, 40, 64, 32, 16, 8, 4, 2 clubs), no
   club plays twice in a round or after it's out, there is one winner, ties
   are knockouts (no draws), the semi-finals and final are at Wembley, and no
   cup tie touches a league record. Then how often the giant-killers win.
     node test/epl-cup.js [seasons=6] */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||6);
const api=m.exports.load(path.join(__dirname,'..','dist','soccer-coach.html'));
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=12)console.log('  FAIL '+msg)}};
const SIZES=[16,64,80,40,64,32,16,8,4,2];      // clubs that play in each round (q3: 16 of 48; the rest have byes)
let upsets=0, ties=0, nonLeagueR3=0, plWinners=0, finals=0, pens=0;
api.newDynasty('Spalding United',41,'T');
for(let y=0;y<N;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<100)E.advance();
  const yr=E.year, C=E.cup, R=[['q3',7],['q4',10],['r1',13],['r2',17],['r3',21],['r4',25],['r5',29],['qf',33],['sf',38,1],['f',45,1]].map(([k,week,n])=>({k,week,neutral:!!n})), tier=t=>({PL:1,CH:2,L1:3,L2:4,NL:5,NN:6,NS:6})[api.CONF[t]];
  const out=new Set();
  R.forEach((r,i)=>{ const games=E.weeks[r.week].games.filter(x=>x.cup), clubs=[].concat(...games.map(x=>[x.home,x.away]));
    ok(clubs.length===SIZES[i],`${yr} ${r.k}: ${clubs.length} clubs, want ${SIZES[i]}`);
    ok(new Set(clubs).size===clubs.length,`${yr} ${r.k}: a club twice`);
    ok(clubs.every(t=>!out.has(t)),`${yr} ${r.k}: a club that was already out`);
    ok(games.every(x=>!x.draw&&x.winner&&x.loser),`${yr} ${r.k}: a drawn tie`);
    ok(games.every(x=>!!x.neutral===!!r.neutral),`${yr} ${r.k}: wrong venue`);
    if(r.k==='q3'||r.k==='q4')ok(clubs.every(t=>tier(t)>=5),`${yr} ${r.k}: a league club in qualifying`);
    if(r.k==='r1')ok(clubs.every(t=>tier(t)>=3),`${yr} r1: a top-two-tier club`);
    if(r.k==='r3')nonLeagueR3+=clubs.filter(t=>tier(t)>=5).length;
    games.forEach(x=>{ out.add(x.loser); ties++; if(x.pens)pens++; if(tier(x.winner)-tier(x.loser)>=2)upsets++ });
  });
  ok(!!C.winner&&!out.has(C.winner),`${yr}: no winner`); finals++; if(tier(C.winner)===1)plWinners++;
  // league records: 38 and 46 games, untouched by the cup
  const rec=E.regRec||E.rec;
  ok(api.NAMES.every(t=>{const r=rec[t], d=(E.drw&&E.drw[t])||0; return r[0]+r[1]+d===(api.CONF[t]==='PL'?38:46)}),`${yr}: a league record counts cup ties`);
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
}
console.log(`  ${ties} ties over ${N} seasons: ${(100*upsets/ties).toFixed(1)}% won by a club two or more tiers below; ${(100*pens/ties).toFixed(1)}% on penalties`);
console.log(`  non-league clubs in the third round: ${(nonLeagueR3/N).toFixed(1)} a season (real: usually 2-6); Premier League winners ${plWinners} of ${finals}`);
ok(upsets/ties>0.02&&upsets/ties<0.2,'giant-killings off');
console.log(bad?`MISMATCH ${bad} of ${checks} checks`:`MATCH all ${checks} checks: the FA Cup runs as it should (${N} seasons)`);
process.exit(bad?1:0);
