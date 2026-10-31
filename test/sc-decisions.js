/* Soccer decisions, measured. The league first (computer v computer: goals,
   draws, home wins, favourites), then each call's worth to you, at home
   against an even side, every other call left to your assistant:
     the read (25' and 55'): the right counter, the numbers' answer, a guess
     the flank (half-time): the weak one, the numbers' answer, the wrong one
   Verdict: reading the numbers beats leaving it by 2+ win points, guessing
   doesn't, the wrong flank costs, and the league stays calibrated.
     node test/sc-decisions.js [games=20000] [old engine .js to compare] */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||20000);
function engine(file){ const eng=fs.readFileSync(file,'utf8');
  return new Function(rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{}};const SC_TRY='+(process.env.SC_TRY||'{}')+';\n'+eng+';return {RNG,playGame,makeLiveGame,APPROACH};')(); }
const G=engine(process.env.SC_FILE||path.join(__dirname,'..','src','soccer','50_game.js'));
const oldFile=process.argv.slice(2).find(a=>/\.js$/.test(a));
const pts=(r)=>{const m=r.h-r.a; return m>0?3:m===0?1:0};
let bad=0; const ok=(c,m)=>{ if(!c){bad++; console.log('  FAIL '+m)} };
function league(E,label){ const rng=new E.RNG(5); let goals=0,draws=0,hw=0,fav=0,favn=0;
  for(let i=0;i<N;i++){ const gap=65+rng.gauss(0,150), r=E.playGame(rng,1500+gap,1500,'balanced','balanced',{});
    goals+=r.h+r.a; if(r.h===r.a)draws++; if(r.h>r.a)hw++; if(r.h!==r.a){favn++; if((gap>0)===(r.h>r.a))fav++} }
  const o={g:goals/N,d:100*draws/N,h:100*hw/N,f:100*fav/favn};
  console.log(`  ${label.padEnd(4)} goals/game ${o.g.toFixed(2)}  draws ${o.d.toFixed(1)}%  home wins ${o.h.toFixed(1)}%  favourites (decided) ${o.f.toFixed(1)}%`); return o }
console.log('the league, computer v computer (home +65 Elo on average, spread 150):');
if(oldFile)league(engine(oldFile),'old');
const L=league(G,'new');
ok(L.g>2.55&&L.g<2.95,'goals per game off ~2.75'); ok(L.d>24&&L.d<30,'draws off ~27%'); ok(L.h>38&&L.h<44,'home wins off ~41%');
function run(choose){ const rng=new G.RNG(17); let w=0,p=0;
  for(let i=0;i<N;i++){ const e=G.makeLiveGame(rng,1500,1500,'balanced','balanced',{home:true,away:false},false);
    let r,g=0; while(g++<200){ r=e.next(); if(r.done)break; if(r.ask)e.reply(choose(r.ask,e)) }
    if(r.h>r.a)w++; p+=pts(r) }
  return {w:100*w/N,p:p/N} }
const last=dp=>dp.opts[dp.opts.length-1][0];
const show=(l,x,b)=>console.log('  '+l.padEnd(44)+`win ${x.w.toFixed(1)}%  pts ${x.p.toFixed(3)}`+(b?`  (${x.w-b.w>=0?'+':''}${(x.w-b.w).toFixed(1)} win, ${x.p-b.p>=0?'+':''}${(x.p-b.p).toFixed(3)} pts)`:''));
const numbersFlank=dp=>dp.flank[0]>dp.flank[1]?'left':dp.flank[1]>dp.flank[0]?'right':'normal';
console.log(`\nyou at home, even sides (${N} games each):`);
const base=run(dp=>last(dp)); show('leave every call to your assistant',base);
const right=run((dp,e)=>dp.k==='read'?G.APPROACH[e.S.away.app].counter:last(dp)); show('read: the right counter',right,base);
const nums=run(dp=>dp.k==='read'?G.APPROACH[dp.best].counter:last(dp)); show('read: what the numbers say',nums,base);
const pearl=run(dp=>dp.k==='read'?(G.APPROACH[dp.pearl]?G.APPROACH[dp.pearl].counter:'normal'):last(dp)); show("read: Pearl's (the latest clue)",pearl,base);
let k=0; const guess=run(dp=>dp.k==='read'?['long','wide','double','second'][(k++)%4]:last(dp)); show('read: a guess',guess,base);
const weak=run((dp,e)=>dp.k==='flank'?e.S.away.weak:last(dp)); show('flank: the weak one',weak,base);
const fnum=run(dp=>dp.k==='flank'?numbersFlank(dp):last(dp)); show('flank: what the numbers say',fnum,base);
const wrong=run((dp,e)=>dp.k==='flank'?(e.S.away.weak==='left'?'right':'left'):last(dp)); show('flank: the wrong one',wrong,base);
const all=run(dp=>dp.k==='flank'?numbersFlank(dp):dp.k==='read'?G.APPROACH[dp.best].counter:last(dp)); show('every read from the numbers',all,base);
ok(nums.w-base.w>=2,'reading the numbers is worth less than 2 win points');
ok(guess.w-base.w<=0.5,'guessing pays');
ok(pearl.w<nums.w-0.5,"Pearl's latest-clue read is as good as reading everything");
ok(wrong.w<base.w,'the wrong flank costs nothing');
ok(all.w-base.w>=3,'reading everything is worth less than 3 win points');
console.log(bad?`MISMATCH ${bad} failed`:'MATCH every call is worth reading, and the league is calibrated');
process.exit(bad?1:0);
