/* The hockey engine alone, against approximate recent NHL figures.
   env: HK='{"sh":0.09,...}' overrides, SD=league spread (Elo), HFA=home edge.
     node test/hk-engine.js [games=20000] */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const eng=fs.readFileSync(path.join(__dirname,'..','src','hockey','50_game.js'),'utf8');
const over=process.env.HK?JSON.parse(process.env.HK):{};
const G=new Function('OVER',rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{hk:OVER}};\n'+eng+';return {RNG,playGame};')(over);
const N=+(process.argv[2]||20000), SD=+(process.env.SD||60), HFA=+(process.env.HFA||30);
const rng=new G.RNG(7); let goals=0,shots=0,pp=0,ppg=0,ot=0,so=0,homeW=0,favW=0,favN=0,marg=0,one=0,eqHome=0,eqN=0;
for(let i=0;i<N;i++){
  const d=rng.gauss(0,SD), eh=1500+d/2+HFA, ea=1500-d/2;
  const r=G.playGame(rng,eh,ea,'balanced','balanced',{});
  goals+=r.h+r.a; shots+=r.lines.h.sog+r.lines.a.sog; pp+=r.lines.h.pp+r.lines.a.pp; ppg+=r.lines.h.ppg+r.lines.a.ppg;
  if(r.ot)ot++; if(r.so)so++; const hw=r.h>r.a; if(hw)homeW++;
  if(Math.abs(d)>20){favN++; if((d>0)===hw)favW++}
  marg+=Math.abs(r.h-r.a); if(Math.abs(r.h-r.a)===1)one++;
}
// equal teams: the home edge alone
for(let i=0;i<8000;i++){const r=G.playGame(rng,1500+HFA,1500,'balanced','balanced',{}); eqN++; if(r.h>r.a)eqHome++}
const f=(x,d=2)=>x.toFixed(d);
console.log(`goals/team ${f(goals/N/2)} (~3.0-3.1) | shots/team ${f(shots/N/2,1)} (~28-29) | save% ${f(1-goals/shots,3)} (~.900) | PP% ${f(100*ppg/pp,1)} (~21) | PP/team ${f(pp/N/2)} (~3)`);
console.log(`OT ${f(100*ot/N,1)}% (~23) | shootouts ${f(100*so/N,1)}% of games (~7) | one-goal games ${f(100*one/N,1)}% | mean margin ${f(marg/N)} (~2) | home, equal teams ${f(100*eqHome/eqN,1)}% (~54) | favourite ${f(favW/favN,3)} (spread sd ${SD})`);
