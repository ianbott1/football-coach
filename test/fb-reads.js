/* Football's reads (round 35): their defense, your answer. Each game on its own dice, the same for every
   strategy (as hk-reads, bb-reads). Reading the numbers beats leaving it; a guess doesn't pay; the report
   is worth following; Pearl's last-drive read is worse than the numbers.
     node test/fb-reads.js [college|pro] [games]     last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path');
const which=process.argv[2]||'pro', N=+(process.argv[3]||12000);
const G=load({file:path.join(__dirname,'..','dist',which==='college'?'football-coach.html':'football-coach-pro.html'),expose:['makeLiveGame','RNG','SCHEMES','SCHEME_KEYS']});
let bad=0; const ok=(c,m)=>{ if(!c){bad++; console.log('  FAIL '+m)} };
function run(choose){ let w=0;
  for(let i=0;i<N;i++){ const rng=new G.RNG((23+i*7919)>>>0), e=G.makeLiveGame(rng,1500,1500,'balanced','balanced',{home:true,away:false},false,{fav:{away:G.SCHEME_KEYS[i%3]},seed:i*104729});
    let r,g=0; while(g++<300){ r=e.next(); if(r.done)break; if(r.ask)e.reply(choose(r.ask,e)) }
    w+=r.h>r.a?1:r.h===r.a?0.5:0 }
  return 100*w/N }
const last=dp=>dp.k==='prep'||dp.k==='read'?'normal':dp.opts[dp.opts.length-1][0];
const ans=k=>G.SCHEMES[k].counter;
const base=run(last);
const prep=run(dp=>dp.k==='prep'?ans(dp.pearl):last(dp));
const nums=run(dp=>dp.k==='prep'?ans(dp.pearl):dp.k==='read'?ans(dp.best):last(dp));
const pearl=run(dp=>dp.k==='prep'?ans(dp.pearl):dp.k==='read'?ans(dp.pearl):last(dp));
let q=0; const guess=run(dp=>dp.k==='prep'||dp.k==='read'?['quick','run','deep'][(q++)%3]:last(dp));
const right=run((dp,e)=>dp.k==='prep'||dp.k==='read'?ans(e.D.home.sch):last(dp));
const show=(l,x)=>console.log('  '+l.padEnd(44)+`win ${x.toFixed(1)}%  (${x-base>=0?'+':''}${(x-base).toFixed(1)})`);
console.log(`${which} football, you at home, even sides (${N} games each):`);
show('leave every call to your assistant',base); show('follow the scouting report',prep); show('report, then the numbers',nums);
show("report, then Pearl's last-drive read",pearl); show('guess',guess); show('the right answer (cheating)',right);
ok(prep-base>=1,'following the report is worth less than 1 win point');
ok(nums-prep>=0.5,'reading the numbers adds less than half a win point to the report');
ok(guess-base<=0.5,'guessing pays');
ok(pearl<nums,"Pearl's last-drive read is as good as the numbers");
console.log(bad?`MISMATCH ${bad} failed`:'MATCH reading their defense is worth it, and guessing isn\'t');
process.exit(bad?1:0);
