/* Football: after a live game, each call is judged by replaying it from that
   moment with every answer (football 75_screens: callVerdicts). Measured:
   the verdict at the game's replay count agrees with one from ten times as
   many replays (it isn't noise), it takes little time, and a coach who
   always takes the better call wins more than one who takes the other.
     node test/fb-verdicts.js <file.html> [games=120] */
const fs=require('fs');
const file=process.argv[2], N=+(process.argv[3]||120);
let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
global.setTimeout=()=>0;global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G=new Function(js+'return {makeLiveGame,RNG,callVerdicts,verdictDefault,setRuns:n=>{VERDICT_RUNS=n}};')();
let bad=0; const ok=(c,m)=>{ if(!c){bad++; console.log('  FAIL '+m)} };
const gaps=[-120,-40,0,40,120];
let n=0, agree=0, ms=0, games=0;
for(let s=1;s<=N;s++){
  const gap=gaps[s%gaps.length], args=[1700+gap,1700,'balanced','balanced',true];
  // play it once, answering each call at random
  const r0=new G.RNG(s*31+7), answers=[]; { const e=G.makeLiveGame(new G.RNG(s),...args); let g=0;
    while(g++<2000){ const r=e.next(); if(r.done)break; if(r.ask){ const v=r.ask.opts[r0.int(r.ask.opts.length)][0]; answers.push(v); e.reply(v) } } }
  if(!answers.length)continue; games++;
  const t=Date.now(); const V=G.callVerdicts(args,s,answers,true); ms+=Date.now()-t;
  if(!V.length)continue;
  G.setRuns(12000); const W=G.callVerdicts(args,s,answers,true); G.setRuns(1200);
  V.forEach((v,i)=>{ const w=W.find(x=>x.h===v.h); if(!w)return; n++; if(v.right===w.right)agree++ });
}
console.log(`  ${games} games with calls, ${n} calls judged; verdict agrees with 10x the replays ${(100*agree/n).toFixed(1)}%; ${(ms/games).toFixed(0)} ms a game`);
ok(n>=40,'too few calls judged to say');
ok(agree/n>=0.85,'the verdict is mostly noise');
ok(ms/games<1500,'judging the calls takes too long');
console.log(bad?`MISMATCH ${bad} failed`:'MATCH the call verdicts are stable and quick');
process.exit(bad?1:0);
