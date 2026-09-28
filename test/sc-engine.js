/* The hockey engine alone, against approximate recent NHL figures.
   env: HK='{"sh":0.09,...}' overrides, SD=league spread (Elo), HFA=home edge.
     node test/hk-engine.js [games=20000] */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const eng=fs.readFileSync(path.join(__dirname,'..','src','soccer','50_game.js'),'utf8');
const over=process.env.SC?JSON.parse(process.env.SC):{};
const G=new Function('OVER',rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{sc:OVER}};\n'+eng+';return {RNG,playGame};')(over);
const N=+(process.argv[2]||20000), SD=+(process.env.SD||60), HFA=+(process.env.HFA||30);
const rng=new G.RNG(7); let goals=0,hw=0,dr=0,aw=0,nil=0,favW=0,favN=0,eqH=0,eqD=0,eqN=0,marg=0;
for(let i=0;i<N;i++){
  const d=rng.gauss(0,SD), eh=1500+d/2+HFA, ea=1500-d/2;
  const r=G.playGame(rng,eh,ea,'balanced','balanced',{});
  goals+=r.h+r.a; if(r.h>r.a)hw++; else if(r.h<r.a)aw++; else dr++; if(r.h+r.a===0)nil++; marg+=Math.abs(r.h-r.a);
  if(Math.abs(d)>40){favN++; if((d>0&&r.h>r.a)||(d<0&&r.a>r.h))favW++}
}
for(let i=0;i<10000;i++){const r=G.playGame(rng,1500+HFA,1500,'balanced','balanced',{}); eqN++; if(r.h>r.a)eqH++; else if(r.h===r.a)eqD++}
const f=(x,d=1)=>x.toFixed(d);
console.log(`goals/game ${f(goals/N,2)} (PL ~2.8-2.9) | home ${f(100*hw/N)}% draw ${f(100*dr/N)}% away ${f(100*aw/N)}% (PL ~45/24/31) | 0-0 ${f(100*nil/N)}% (~7) | mean margin ${f(marg/N,2)} | equal teams: home ${f(100*eqH/eqN)}% draw ${f(100*eqD/eqN)}% | favourite wins ${f(100*favW/favN)}% (spread sd ${SD})`);
