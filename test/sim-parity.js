/* Ian's rule (round 43): simming, or leaving every call to your assistant, should do about what the computer coaches
   do; only good calls should beat it. Even sides, the same dice: the home side coached by the computer, then by you
   with every call left to your assistant. Football was +9 points a game for doing nothing (a fourth down re-rolled
   after a miss; reads the assistant made with no downside). Within 2.5 points in every game (sampling noise at 6000 games is about 1).
     node test/sim-parity.js [games=6000]   last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path'); const N=+(process.argv[2]||6000); let bad=0;
for(const f of ['football-coach.html','football-coach-pro.html','basketball-coach.html','basketball-coach-pro.html','hockey-coach-pro.html','soccer-coach.html','baseball-coach-pro.html']){
  const G=load({file:path.join(__dirname,'..','dist',f),expose:['makeLiveGame','RNG']}); let cpu=0, asst=0;
  for(let i=0;i<N;i++){ for(const hum of [false,true]){ const e=G.makeLiveGame(new G.RNG((11+i*7919)>>>0),1500,1500,'balanced','balanced',{home:hum,away:false},false,{seed:i});
      let r,g=0; while(g++<3000){ r=e.next(); if(r.done)break; if(r.ask){ const o=r.ask.opts; const a=o.find(x=>/assistant/i.test(x[1]))||o[o.length-1]; e.reply(a[0]) } }
      const s=r.h>r.a?1:r.h===r.a?0.5:0; if(hum)asst+=s; else cpu+=s } }
  const d=100*(asst-cpu)/N, ok=Math.abs(d)<=2.5; if(!ok)bad++;   // ~2.5 standard errors at 6000 games (hockey read -2.3 at 4000, -0.4 at 12000); round 53: the count was inside the comment, so a FAIL still read MATCH
  console.log(`${f.padEnd(26)} computer ${(100*cpu/N).toFixed(1)}%  your assistant ${(100*asst/N).toFixed(1)}%  (${d>=0?'+':''}${d.toFixed(1)})${ok?'':'  FAIL'}`) }
console.log(bad?`MISMATCH ${bad} games where leaving it to your assistant isn't the computer's level`:'MATCH leaving every call to your assistant plays like the computer coaches'); process.exit(bad?1:0);
