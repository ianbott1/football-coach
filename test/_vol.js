const {load}=require('./harness.js');
for(const f of ['basketball-coach-pro.html','hockey-coach-pro.html','football-coach-pro.html']){ let moves=[], big=0;
  for(const seed of [1,2,3]){ const A=load({file:process.argv[2]+'/'+f,expose:['S','SEA','NAMES','newDynasty']}); A.newDynasty(A.NAMES[3],seed,'T');
    const per=f.startsWith('football')?1:7; let prev=null, g=0;
    while(A.SEA.phase==='week'&&g++<400){ for(let k=0;k<per&&A.SEA.phase==='week';k++)A.SEA.advance(); const r=A.SEA.poll.rankMap();
      if(prev&&A.SEA.step>per*3)A.NAMES.forEach(t=>{ const d=Math.abs(r[t]-prev[t]); moves.push(d); if(d>=8)big++ }); prev=r } }
  moves.sort((a,b)=>a-b); const avg=moves.reduce((a,b)=>a+b,0)/moves.length;
  console.log(f.padEnd(26),`each ${f.startsWith('football')?'week':'7 days'}: average move ${avg.toFixed(2)} places, 90% within ${moves[Math.floor(moves.length*0.9)]}, moves of 8+ places: ${(100*big/moves.length).toFixed(1)}%`) }
