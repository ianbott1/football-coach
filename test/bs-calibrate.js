/* Baseball against MLB (round 52): the engine between average sides, and whole seasons.
   Targets (MLB 2023-25): runs a side 4.2-4.8; one-run games 24-31%; extra innings 6-11%; home sides 52-56% (seasons);
   the spread of wins 10-15 a season; the best record under 112 wins on average.
     node test/bs-calibrate.js   last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path'); let bad=0; const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++ };
const F=path.join(__dirname,'..','dist','baseball-coach-pro.html');
{ const A=load({file:F,expose:['playGame','RNG']}); let n=6000,rs=0,one=0,ex=0;
  for(let i=0;i<n;i++){ const r=A.playGame(new A.RNG(i*7+3),1500,1500,'balanced','balanced',{}); rs+=r.h+r.a; if(Math.abs(r.h-r.a)===1)one++; if(r.drives.length>9)ex++ }
  ok(rs/n/2>=4.2&&rs/n/2<=4.8,`runs a side ${(rs/n/2).toFixed(2)}`); ok(one/n>=0.24&&one/n<=0.31,`one-run games ${(100*one/n).toFixed(1)}%`); ok(ex/n>=0.06&&ex/n<=0.11,`extra innings ${(100*ex/n).toFixed(1)}%`) }
{ let hw=0,gs=0,sds=[],best=[];
  for(const seed of [1,2,3,4,5]){ const A=load({file:F,expose:['SEA','NAMES','newDynasty']}); A.newDynasty('Seattle',seed,'T'); let g=0; while(A.SEA.phase==='week'&&g++<3000){A.SEA.userTeam=null;A.SEA.advance()}
    A.SEA.weeks.forEach(w=>w.games.forEach(x=>{ gs++; if(x.winner===x.home)hw++ }));
    const W=A.NAMES.map(t=>A.SEA.rec[t][0]), mu=W.reduce((a,b)=>a+b)/W.length; sds.push(Math.sqrt(W.reduce((a,b)=>a+(b-mu)**2,0)/W.length)); best.push(Math.max(...W)) }
  const sd=sds.reduce((a,b)=>a+b)/sds.length, bst=best.reduce((a,b)=>a+b)/best.length;
  ok(hw/gs>=0.52&&hw/gs<=0.56,`home sides won ${(100*hw/gs).toFixed(1)}% over five seasons`); ok(sd>=10&&sd<=15,`the spread of wins ${sd.toFixed(1)} (seasons: ${sds.map(x=>x.toFixed(1)).join(", ")})`);
  ok(bst<112,`the best record ${bst.toFixed(0)} wins on average (${best.join(", ")})`) }
console.log(bad?`MISMATCH ${bad}`:'MATCH baseball plays like MLB'); process.exit(bad?1:0);
