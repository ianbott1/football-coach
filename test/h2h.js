/* Hot seat, head to head: when two coaches' teams meet, the game is played
   once, both coaches make their own side's calls, and the result that counts
   is the one that was played.
     node test/h2h.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
let bad=0; const ok=(c,msg)=>{console.log((c?'  ok   ':'  FAIL ')+msg); if(!c)bad++};
const users=r=>r.map(x=>x.team);
function season(seed,roster){
  const api=mk()(file); api.newDynasty(roster[0].team,seed,'T',roster);
  const U=users(roster), log=[], hand=[]; let guard=0;
  while(api.SEA.phase!=='done'&&guard++<400){
    const step=api.SEA.step, who=api.S.myTeam, wasHand=api.S&&false;
    api.doAdvance();
    if(global.__nodes.app&&/handwrap/.test(global.__nodes.app.innerHTML))
    { hand.push({step,to:api.S.myTeam,html:global.__nodes.app.innerHTML});
      const b=global.__nodes.hgo; if(b&&b.onclick)b.onclick(); }       // "I'm ready"
    if(api.live&&!api.live.done){
      const g=api.live.g, rec={step,who,pair:[g.home,g.away].sort().join(' v '),h2h:!!api.live.h2h,asks:{},labels:[]};
      let n=0;
      while(api.live&&!api.live.done&&n++<800){
        if(api.live.ask){const t=api.live.ask.team; rec.asks[t]=(rec.asks[t]||0)+1;
          api.render(); rec.labels.push([t,(global.__nodes.app.innerHTML.match(/class="callbox">\s*<div class="wlabel">([^<]*)</)||[])[1]]);
          api.answerLive(api.live.ask.dp.opts[(n+step)%api.live.ask.dp.opts.length][0]);}
        else api.liveTick();
      }
      const e=api.live&&api.live.eng; if(e)rec.final=[e.h,e.a];
      log.push(rec);
    }
  }
  return {api,log,hand,U};
}
// 1-4: two coaches who meet (Iron Bowl), over several seeds
const R2=[{team:'Alabama',name:'Coach A'},{team:'Auburn',name:'Coach B'}];
let games=0, twice=0, bothAsked=0, overCap=0, wrongLabel=0, notCounted=0;
for(const seed of [99,1,2,3,4,5,6,7]){
  const {api,log}=season(seed,R2);
  const key=x=>x.step+'|'+x.pair; const seen={};
  log.forEach(x=>{seen[key(x)]=(seen[key(x)]||0)+1});
  const meet=log.filter(x=>x.pair==='Alabama v Auburn');
  games+=meet.length; twice+=Object.keys(seen).filter(k=>/Alabama v Auburn/.test(k)&&seen[k]>1).length;
  meet.forEach(x=>{
    if(x.asks.Alabama&&x.asks.Auburn)bothAsked++;
    if(Object.values(x.asks).some(n=>n>3))overCap++;
    x.labels.forEach(([t,l])=>{
      const name=t==='Alabama'?'Coach A':'Coach B'; if(!(l||'').startsWith(name+"'s call")){wrongLabel++;}});
    // the result that counts is the one that was played
    const W=x.step<api.SEA.weeks.length?api.SEA.weeks[x.step]:null;
    const all=[].concat(...api.SEA.weeks.map(w=>w.games),...api.SEA.postPools());
    const g=all.find(g=>[g.home,g.away].sort().join(' v ')===x.pair&&x.final&&g.hp===x.final[0]&&g.ap===x.final[1]);
    if(!g)notCounted++;
  });
}
ok(games>=8, `the coaches met ${games} times in 8 seasons`);
ok(twice===0, `no meeting was played live twice (${twice})`);
ok(bothAsked>0, `both coaches were asked for calls in the same game (${bothAsked} of ${games} games)`);
ok(overCap===0, 'neither side was asked more than 3 times in a game');
ok(wrongLabel===0, `every call screen names the coach whose call it is (${wrongLabel} wrong)`);
ok(notCounted===0, `the score that counts is the score that was played (${notCounted} not)`);
// the waiting coach's plan is the one their side plays with
{ const api=mk()(file); api.newDynasty('Alabama',99,'T',R2); let seen=null, g=0;
  while(api.SEA.phase==='week'&&g++<60&&!seen){
    const ug=api.SEA.nextGame(api.S.myTeam);
    const meets=ug&&[ug.home,ug.away].sort().join(' v ')==='Alabama v Auburn';
    api.setPlan(meets&&api.S.myTeam==='Alabama'?'aggressive':meets?'safe':'balanced');
    api.doAdvance(); const b=global.__nodes.hgo; if(/handwrap/.test(global.__nodes.app.innerHTML)&&b&&b.onclick)b.onclick();
    if(api.live&&api.live.h2h){const e=api.live.eng, g2=api.live.g;
      seen={Alabama:g2.home==='Alabama'?e.baseH:e.baseA, Auburn:g2.home==='Auburn'?e.baseH:e.baseA};}
    let n=0; while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
  }
  ok(seen&&seen.Alabama==='aggressive'&&seen.Auburn==='safe', `each coach's own game plan is used (${JSON.stringify(seen)})`);
}
// 5: three coaches, first plays third: the note goes to the right coach
{ const {hand}=season(99,[{team:'Alabama',name:'Coach A'},{team:'Rice',name:'Coach R'},{team:'Auburn',name:'Coach B'}]);
  const iron=hand.filter(x=>/You play Alabama this week/.test(x.html));
  ok(iron.length>0 && iron.every(x=>x.to==='Auburn'), `the head-to-head note is shown to Auburn's coach only (${iron.map(x=>x.to).join(',')||'never shown'})`);
  ok(!hand.some(x=>x.to==='Rice'&&/You play/.test(x.html)), 'the coach in between gets the ordinary hand-over');
}
console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH all checks');
process.exit(bad?1:0);
