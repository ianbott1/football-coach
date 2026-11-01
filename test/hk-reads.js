/* Hockey reads, measured. The league first (computer v computer: goals,
   home wins, overtime, favourites), against the previous engine if given;
   then each call's worth to you, at home against an even side, every other
   call left to your assistant:
     the read (first intermission): the right answer, the numbers', a guess
     your goalie: pull him when he's really off, when the numbers say so,
       whenever he's let in two, never
   Verdict: reading beats leaving it, guessing doesn't, the goalie call rewards
   telling a bad night from bad luck, and the league stays calibrated.
     node test/hk-reads.js [games=20000] [old engine .js] */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||20000);
function engine(file){ const eng=fs.readFileSync(file,'utf8');
  return new Function(rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{}};const HK_TRY='+(process.env.HK_TRY||'{}')+';\n'+eng+';return {RNG,playGame,makeLiveGame,SYSTEM:typeof SYSTEM!=="undefined"?SYSTEM:null,HK,KEYS:typeof SYSTEM_KEYS!=="undefined"?SYSTEM_KEYS:null};')(); }
const G=engine(process.env.HK_FILE||path.join(__dirname,'..','src','hockey','50_game.js'));
const oldFile=process.argv.slice(2).find(a=>/\.js$/.test(a));
let bad=0; const ok=(c,m)=>{ if(!c){bad++; console.log('  FAIL '+m)} };
function league(E,label){ const rng=new E.RNG(5); let goals=0,hw=0,ot=0,fav=0,sog=0;
  for(let i=0;i<N;i++){ const gap=35+rng.gauss(0,110), K=E.KEYS, r=E.playGame(rng,1500+gap,1500,'balanced','balanced',{ctx:K?{fav:{home:K[i%3],away:K[(i>>2)%3]}}:undefined});
    goals+=r.h+r.a; if(r.h>r.a)hw++; if(r.ot)ot++; if((gap>0)===(r.h>r.a))fav++; sog+=r.lines.h.sog+r.lines.a.sog }
  const o={g:goals/N,h:100*hw/N,ot:100*ot/N,f:100*fav/N,s:sog/N/2};
  console.log(`  ${label.padEnd(4)} goals/game ${o.g.toFixed(2)}  shots/team ${o.s.toFixed(1)}  home wins ${o.h.toFixed(1)}%  to overtime ${o.ot.toFixed(1)}%  favourites ${o.f.toFixed(1)}%`); return o }
console.log('the league, computer v computer (home +35 Elo on average, spread 110):');
let O=null; if(oldFile)O=league(engine(oldFile),'old');
const L=league(G,'new');
if(O){ ok(Math.abs(L.g-O.g)<0.15,'goals per game moved'); ok(Math.abs(L.h-O.h)<1.5,'home wins moved'); ok(Math.abs(L.ot-O.ot)<2,'overtime share moved'); ok(Math.abs(L.f-O.f)<1.5,'favourites moved') }
else { ok(L.g>5.6&&L.g<6.4,'goals per game off ~6'); ok(L.ot>19&&L.ot<27,'overtime off ~23%') }
function run(choose,scouted){ const rng=new G.RNG(17); let w=0,p=0;
  for(let i=0;i<N;i++){ const e=G.makeLiveGame(rng,1500,1500,'balanced','balanced',{home:true,away:false},false,
      scouted?{fav:{away:G.KEYS[i%3]},seed:i*7919}:undefined);
    let r,g=0; while(g++<200){ r=e.next(); if(r.done)break; if(r.ask)e.reply(choose(r.ask,e)) }
    // a point a loss in overtime, two for a win
    if(r.h>r.a){w++;p+=2} else if(e.ot)p+=1 }
  return {w:100*w/N,p:p/N} }
const last=dp=>dp.opts[dp.opts.length-1][0];
const show=(l,x,b)=>console.log('  '+l.padEnd(46)+`win ${x.w.toFixed(1)}%  pts ${x.p.toFixed(3)}`+(b?`  (${x.w-b.w>=0?'+':''}${(x.w-b.w).toFixed(1)} win, ${x.p-b.p>=0?'+':''}${(x.p-b.p).toFixed(3)} pts)`:''));
console.log(`\nyou at home, even sides (${N} games each):`);
const base=run(dp=>last(dp)); show('leave every call to your assistant',base);
const right=run((dp,e)=>dp.k==='read'?G.SYSTEM[e.S.away.sys].counter:last(dp)); show('read: the right answer',right,base);
const nums=run(dp=>dp.k==='read'?G.SYSTEM[dp.best].counter:last(dp)); show('read: what the numbers say',nums,base);
const pearl=run(dp=>dp.k==='read'?G.SYSTEM[dp.pearl].counter:last(dp)); show("read: Pearl's (the latest clue)",pearl,base);
let k=0; const guess=run(dp=>dp.k==='read'?['stretch','dump','collapse'][(k++)%3]:last(dp)); show('read: a guess',guess,base);
const gOracle=run((dp,e)=>dp.k==='goalie'?(e.S.home.form>G.HK.offBy/2?'swap':'keep'):last(dp)); show('goalie: pull him only on a real bad night',gOracle,base);
const gSoft=run(dp=>dp.k==='goalie'?(dp.soft>=2||(dp.ga-dp.xga>=1.6)?'swap':'keep'):last(dp)); show('goalie: pull him on soft goals / far over xGA',gSoft,base);
const gAlways=run(dp=>dp.k==='goalie'?'swap':last(dp)); show('goalie: pull him whenever he lets in two',gAlways,base);
const gNever=run(dp=>dp.k==='goalie'?'keep':last(dp)); show('goalie: never',gNever,base);
const all=run(dp=>dp.k==='read'?G.SYSTEM[dp.best].counter:dp.k==='goalie'?(dp.soft>=2||(dp.ga-dp.xga>=1.6)?'swap':'keep'):last(dp)); show('every call from the evidence',all,base);
console.log(`\nwith a scouting report before the game (they have a usual system):`);
const sbase=run(dp=>last(dp),true); show('leave every call to your assistant',sbase);
const sTop=run(dp=>dp.k==='prep'?G.SYSTEM[dp.pearl].counter:last(dp),true); show('prep: set up for what the report says most',sTop,sbase);
const gr=new G.RNG(99); const sGuess=run(dp=>dp.k==='prep'?['stretch','dump','collapse'][gr.int(3)]:last(dp),true); show('prep: a guess',sGuess,sbase);
const sTrue=run((dp,e)=>dp.k==='prep'?G.SYSTEM[e.S.away.sys].counter:last(dp),true); show('prep: the right answer (cheating)',sTrue,sbase);
const sAll=run(dp=>dp.k==='prep'?G.SYSTEM[dp.pearl].counter:dp.k==='read'?G.SYSTEM[dp.best].counter:last(dp),true); show('report, then the read from the numbers',sAll,sbase);
const sNo=run(dp=>dp.k==='prep'?'normal':dp.k==='read'?G.SYSTEM[dp.best].counter:last(dp),true); show('no prep, the read from the numbers',sNo,sbase);
ok(sTop.w-sbase.w>=1,'following the scouting report is worth less than 1 win point');
ok(sGuess.w-sbase.w<=0.5,'a guess before the game pays');
ok(sAll.w>sNo.w,'the report adds nothing to reading the numbers');
ok(nums.w-base.w>=1.5,'reading the numbers is worth less than 1.5 win points');
ok(guess.w-base.w<=0.5,'guessing pays');
ok(pearl.w<nums.w-0.3,"Pearl's latest-clue read is as good as the numbers");
ok(gSoft.w>gAlways.w+0.5,'telling a bad night from bad luck is worth nothing');
ok(gSoft.w>base.w,'the goalie read is worth less than leaving it');
console.log(bad?`MISMATCH ${bad} failed`:'MATCH every read is worth making, and the league is calibrated');
process.exit(bad?1:0);
