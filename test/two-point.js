/* The two-point call, scripted rather than waited for (it's rare in play):
   when the question comes, the touchdown is already on the scoreboard, the
   prompt's "Touchdown: X-Y" matches it, both outcomes are given as real
   scores, and the game's final score still adds up drive by drive.
     node test/two-point.js     last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=8)console.log('  FAIL '+m)}};
for(const f of ['football-coach.html','football-coach-pro.html']){
  const A=load({file:path.join(__dirname,'..','dist',f),expose:['makeLiveGame','RNG']});
  let asks=0;
  for(let s=1;s<2500;s++){
    const e=A.makeLiveGame(new A.RNG(s),1700,1700,'balanced','balanced',true); let g=0,r;
    while(g++<2000){ r=e.next(); if(r.done)break;
      if(r.ask){ if(r.ask.k==='two'){ asks++;
          const m=r.ask.h.match(/After the touchdown, (\d+)-(\d+)/), b=r.ask.b;
          ok(m&&+m[1]===e.h&&+m[2]===e.a,`${f} seed ${s}: prompt "${r.ask.h}" but the board reads ${e.h}-${e.a}`);
          ok(r.mine===e.h,`${f} seed ${s}: the call line says ${r.mine}, the board ${e.h}`);
          ok(b.indexOf(`makes it ${e.h+2}-${e.a}`)>=0&&b.indexOf(`makes it ${e.h+1}-${e.a}`)>=0,`${f} seed ${s}: "${b}" doesn't give both outcomes as scores`) }
        e.reply(r.ask.opts[s%r.ask.opts.length][0]) } }
    const sumH=e.drives.reduce((a,d)=>a+(d.home?d.pts:0),0), sumA=e.drives.reduce((a,d)=>a+(d.home?0:d.pts),0);
    ok(sumH===e.h&&sumA===e.a,`${f} seed ${s}: drives add to ${sumH}-${sumA}, final ${e.h}-${e.a}`);
  }
  console.log(`  ${f.padEnd(26)} ${asks} two-point calls checked`);
  ok(asks>=50,`${f}: too few two-point calls to say (${asks})`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the two-point call shows the real score`);
process.exit(bad?1:0);
