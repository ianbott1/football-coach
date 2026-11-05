/* How much each kind of call matters: for every call in a run of live games, the rest of the game
   replayed many times under each option; the spread between the best and the worst option's win rate.
   Ian's rule (Nov 2026): better decisions, not more; a call worth under about a point gets rebalanced
   or cut.   node test/call-weight.js [file.html] [games=30] [runs=40]      env BY_H=late,pull: those kinds by situation; BY_F=ga,soft: by those fields of the call instead; DUMP=file: each call's options and win rates, one JSON line each
   Nov 2026, before -> after round 21: soccer late 1.6 -> 5.5 (70', within a goal, sharper modes), soccer half 3.1 -> 5.1,
   hockey pull 1.7 -> 2.1 (down one only; the real choice is small), football protect gated at a 10-point lead.
   Strongest: game plan and reads, 10-16 points a call in every game but football. */
const {load}=require('./harness.js'), path=require('path');
const args=process.argv.slice(2), file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const nums=args.filter(a=>/^\d+$/.test(a)).map(Number), G=nums[0]||30, RUNS=nums[1]||40;
const A=load({file,expose:['S','SEA','NAMES','newDynasty','doAdvance','live','liveTick','answerLive','makeLiveGame','RNG','mulberry32','impactDefault','liveSeed']});
A.newDynasty(A.NAMES[+(process.env.TEAM||4)],+(process.env.SEED||7),'T');
const by={}; let games=0;
while(games<G&&A.SEA.phase!=='done'){ A.doAdvance(); let n=0;
  while(A.live&&!A.live.done&&n++<900){ const L=A.live; if(L.ask){ const o=L.ask.dp.opts; A.answerLive(o[(n+games)%o.length][0]) } else A.liveTick() }
  const L=A.live; if(!L||!L.done||!L.args)continue; games++;
  const seed=A.liveSeed(L.step), ans=L.replay.slice(), meHome=L.g.home===A.S.myTeam;
  const play=(j,v,m)=>{ const rng=new A.RNG(seed), e=A.makeLiveGame(rng,...L.args); let i=0,g=0,r;
    while(g++<3000){ r=e.next(); if(r.done)break; if(r.ask){ let a; if(i<j)a=ans[i]; else if(i===j){ a=v; rng.f=A.mulberry32((seed^Math.imul(m+1,0x9E3779B1))>>>0); rng.sp=null } else a=A.impactDefault(r.ask); e.reply(a); i++ } }
    const mine=meHome?r.h:r.a, th=meHome?r.a:r.h; return mine>th?1:mine===th?0.5:0 };
  const asks=[]; { const e=A.makeLiveGame(new A.RNG(seed),...L.args); let i=0,g=0; while(g++<3000){ const r=e.next(); if(r.done)break; if(r.ask){ r.ask.__s={mine:r.mine,theirs:r.theirs,q:r.q,edge:meHome?L.args[0]-L.args[1]:L.args[1]-L.args[0]}; asks.push(r.ask); e.reply(ans[i]!==undefined?ans[i]:A.impactDefault(r.ask)); i++ } } }
  asks.forEach((dp,j)=>{ const rates=dp.opts.map(o=>{ let s=0; for(let m=0;m<RUNS;m++)s+=play(j,o[0],m); return 100*s/RUNS });
    if(process.env.DUMP)require('fs').appendFileSync(process.env.DUMP,JSON.stringify({k:dp.k,h:dp.h,b:dp.b,s:dp.__s,o:dp.opts.map((o,i)=>[o[0],o[1],rates[i]])})+'\n');
    const spread=Math.max(...rates)-Math.min(...rates), k=dp.k; const B=by[k]=by[k]||{n:0,sp:[],h:{}}; B.n++; B.sp.push(spread); { const hk=process.env.BY_F?process.env.BY_F.split(',').map(f=>f+'='+(typeof dp[f]==='number'?Math.round(dp[f]):dp[f])).join(' '):dp.h; (B.h[hk]=B.h[hk]||[]).push(spread) } }) }
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length, q=(a,p)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(p*(b.length-1))]};
console.log(`${path.basename(file)}: ${games} live games, ${RUNS} replays per option`);
Object.entries(by).sort((a,b)=>avg(b[1].sp)-avg(a[1].sp)).forEach(([k,B])=>{ console.log(`  ${k.padEnd(10)} ${String(B.n).padStart(3)} calls (${(B.n/games).toFixed(1)} a game) | best vs worst option: average ${avg(B.sp).toFixed(1)} pts, median ${q(B.sp,.5).toFixed(0)}, 90th ${q(B.sp,.9).toFixed(0)} | under 3 pts: ${(100*B.sp.filter(x=>x<3).length/B.n).toFixed(0)}%`);
  if(process.env.BY_H&&process.env.BY_H.split(',').includes(k))Object.entries(B.h).sort((a,b)=>avg(b[1])-avg(a[1])).forEach(([h,v])=>console.log(`      ${h.slice(0,44).padEnd(44)} ${String(v.length).padStart(3)}  average ${avg(v).toFixed(1)}`)) });
