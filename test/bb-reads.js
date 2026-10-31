/* Basketball reads, measured, college and pro. The league first (computer v
   computer: points, margin, home wins, favourites, overtime) against the
   previous engine if given; then each call's worth to you, at home against
   an even side, every other call left to your assistant:
     the read (end of the first quarter, and the half): the right defence,
       the shot chart's answer, Pearl's latest clue, a guess
   Verdict: reading beats leaving it, guessing doesn't, Pearl's latest clue
   is worse than the shot chart, and the league stays calibrated.
   (Foul trouble was measured as a call too, sit him or ride it out by how
   tight the referees are: worth nothing either way, so it isn't one.)
     node test/bb-reads.js [college|pro] [games=16000] [old engine .js] */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const PRO=process.argv.includes('pro');
const N=+(process.argv.find(a=>/^\d+$/.test(a))||16000);
// the pro game's settings, read from the league file
const nbaSrc=fs.readFileSync(path.join(__dirname,'..','src','leagues','nba','05_league.js'),'utf8');
const bbLit=nbaSrc.slice(nbaSrc.indexOf('bb:{')+3); let depth=0,k=0; for(;k<bbLit.length;k++){ if(bbLit[k]==='{')depth++; if(bbLit[k]==='}'){depth--; if(!depth)break} }
const proBB=new Function('process','return '+bbLit.slice(0,k+1))({env:{}});
const TRY=JSON.parse(process.env.BB_TRY||'{}');
const tunOld=PRO?{bb:Object.assign({},proBB)}:{bb:{}}, tunNew=PRO?{bb:Object.assign({},proBB,TRY)}:{bb:Object.assign({},TRY)};
function engine(file,tun){ const eng=fs.readFileSync(file,'utf8');
  return new Function('TUN',rngSrc+'const LEAGUE={tuning:TUN};\n'+eng+';return {RNG,playGame,makeLiveGame,STYLE:typeof STYLE!=="undefined"?STYLE:null,BB};')(tun); }
const G=engine(process.env.BB_FILE||path.join(__dirname,'..','src','basketball','50_game.js'),tunNew);
const oldFile=process.argv.slice(2).find(a=>/\.js$/.test(a));
let bad=0; const ok=(c,m)=>{ if(!c){bad++; console.log('  FAIL '+m)} };
const HFA=PRO?60:105, SD=PRO?120:160;
function league(E,label){ const rng=new E.RNG(5); let pts=0,mg=0,hw=0,ot=0,fav=0,fn=0,to=0,poss=0;
  for(let i=0;i<N;i++){ const d=rng.gauss(0,SD), r=E.playGame(rng,1500+d+HFA,1500,'balanced','balanced',{});
    pts+=r.h+r.a; mg+=Math.abs(r.h-r.a); if(r.h>r.a)hw++; if(r.ot)ot++; if(d+HFA!==0){fn++; if((d+HFA>0)===(r.h>r.a))fav++}
    to+=r.lines.h.to+r.lines.a.to; poss+=r.poss }
  const o={p:pts/N/2,m:mg/N,h:100*hw/N,ot:100*ot/N,f:100*fav/fn,to:to/poss/2};
  console.log(`  ${label.padEnd(4)} points/team ${o.p.toFixed(1)}  margin ${o.m.toFixed(1)}  home wins ${o.h.toFixed(1)}%  overtime ${o.ot.toFixed(1)}%  favourites ${o.f.toFixed(1)}%  TO/poss ${o.to.toFixed(3)}`); return o }
console.log(`${PRO?'pro':'college'}: the league, computer v computer (home ${HFA} Elo, spread ${SD}):`);
let O=null; if(oldFile)O=league(engine(oldFile,tunOld),'old');
const L=league(G,'new');
// targets: the previous engine's own numbers (college 72.6 points, 12.2 margin, 62% home, 68% favourites;
// pro 114.6, 13.2, 61%, 71%), within tolerance
const TG=PRO?{p:114.6,m:13.2,h:61.4,f:71.1}:{p:72.6,m:12.2,h:62.4,f:68.2};
ok(Math.abs(L.p-TG.p)<1.0,'points off '+TG.p); ok(Math.abs(L.h-TG.h)<1.8,'home wins off '+TG.h); ok(Math.abs(L.f-TG.f)<1.8,'favourites off '+TG.f); ok(Math.abs(L.m-TG.m)<0.7,'margins off '+TG.m);
function run(choose){ const rng=new G.RNG(17); let w=0;
  for(let i=0;i<N;i++){ const e=G.makeLiveGame(rng,1500,1500,'balanced','balanced',{home:true,away:false});
    let r,g=0; while(g++<300){ r=e.next(); if(r.done)break; if(r.ask)e.reply(choose(r.ask,e)) }
    if(r.h>r.a)w++ }
  return {w:100*w/N} }
const last=dp=>dp.opts[dp.opts.length-1][0];
const show=(l,x,b)=>console.log('  '+l.padEnd(48)+`win ${x.w.toFixed(1)}%`+(b?`  (${x.w-b.w>=0?'+':''}${(x.w-b.w).toFixed(1)})`:''));
console.log(`\nyou at home, even sides (${N} games each):`);
const base=run(dp=>last(dp)); show('leave every call to your assistant',base);
const right=run((dp,e)=>dp.k==='read'?G.STYLE[e.S.away.off].answer:last(dp)); show('read: the right defence',right,base);
const nums=run(dp=>dp.k==='read'?G.STYLE[dp.best].answer:last(dp)); show('read: what the shot chart says',nums,base);
const pearl=run(dp=>dp.k==='read'?G.STYLE[dp.pearl].answer:last(dp)); show("read: Pearl's (the latest clue)",pearl,base);
let q=0; const guess=run(dp=>dp.k==='read'?['chase','pack','trap'][(q++)%3]:last(dp)); show('read: a guess',guess,base);

ok(nums.w-base.w>=1.5,'reading the shot chart is worth less than 1.5 win points');
ok(guess.w-base.w<=0.5,'guessing pays');
ok(pearl.w<nums.w-0.3,"Pearl's latest clue is as good as the shot chart");

console.log(bad?`MISMATCH ${bad} failed`:'MATCH every read is worth making, and the league is calibrated');
process.exit(bad?1:0);
