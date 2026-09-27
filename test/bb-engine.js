/* Basketball engine on its own: calibration against real college numbers. node test/bb-engine.js  (env: HFA, SD, BB) */
// calibrate the engine on its own: needs only the RNG
const fs=require('fs');
const core=fs.readFileSync('src/core/20_engine.js','utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const eng=fs.readFileSync('src/basketball/50_game.js','utf8');
const G=new Function(rngSrc+eng+'\nreturn {RNG,playGame,BB,AGGR};')();
if(process.env.BB)Object.assign(G.BB,JSON.parse(process.env.BB));
const HFA=+(process.env.HFA||45), SD=+(process.env.SD||140);
const rng=new G.RNG(99); let n=0,pts=0,margin=0,poss=0,homeW=0,fav=0,favN=0,three=0,threeA=0,ot=0,ft=0,to=0;
for(let i=0;i<20000;i++){
  const eh=1500+rng.gauss(0,SD), ea=1500+rng.gauss(0,SD);
  const r=G.playGame(rng,eh+HFA,ea,'balanced','balanced',{});
  n++; pts+=r.h+r.a; margin+=Math.abs(r.h-r.a); poss+=r.poss; if(r.h>r.a)homeW++; if(r.ot)ot++;
  const d=eh+HFA-ea; if(d!==0){favN++; if((d>0)===(r.h>r.a))fav++}
  [r.lines.h,r.lines.a].forEach(L=>{three+=L.tpm;threeA+=L.tpa;to+=L.to});
}
// equal teams: home edge alone
let hw=0,hm=0,ms=[]; for(let i=0;i<20000;i++){const r=G.playGame(rng,1500+HFA,1500,'balanced','balanced',{});if(r.h>r.a)hw++;hm+=r.h-r.a;ms.push(r.h-r.a)}
const mu=hm/20000, noise=Math.sqrt(ms.reduce((s,x)=>s+(x-mu)**2,0)/ms.length);
console.log(`points/team ${(pts/n/2).toFixed(1)} (71-73) | possessions ${(poss/n).toFixed(1)} (68-70) | mean margin ${(margin/n).toFixed(1)} (11-12) | fav win ${(fav/favN).toFixed(3)} (0.70-0.75, league spread sd ${SD}) | home win, equal teams ${(100*hw/20000).toFixed(1)}% edge ${(hm/20000).toFixed(1)} pts (60-65%, ~3) | game noise sd ${noise.toFixed(1)} (~11) | 3P% ${(100*three/threeA).toFixed(1)} (~34) | TO/poss ${(to/(poss)/2).toFixed(3)} | OT ${(100*ot/n).toFixed(1)}% (~6%)`);
