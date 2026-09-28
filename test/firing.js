/* Firing follows the rule the game states: miss expectations two years
   running at the same job and you're fired; never for one bad season. A
   season misses when its grade says so ("Short of the mark" or "A bad
   year"). In a hot seat the computer never fires or poaches a human coach.
     node test/firing.js [file.html] [careers=10]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const args=process.argv.slice(2);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const CAREERS=+(args.find(a=>/^\d+$/.test(a))||10);
const missed=gr=>/Short of the mark|A bad year/.test(gr.l);
let bad=0, offseasons=0, firings=0, oneBad=0; const fail=m=>{bad++; if(bad<=8)console.log('  FAIL '+m)};
(async()=>{
  const LG=mk()(file).leagueId();
  const teams=LG==='cfb'?['Alabama','Ohio State','Georgia','Texas','LSU','Oregon','Michigan','USC','Florida','Penn State']
                        :['Philadelphia','Baltimore','Buffalo','Detroit','Kansas City','LA Rams','Green Bay','Seattle','San Francisco','Denver'];
  for(let c=0;c<CAREERS;c++){
    const hot=c%3===2, T=teams[c%teams.length], T2=teams[(c+5)%teams.length];
    const api=mk()(file); api.newDynasty(T,700+c,'T',hot?[{team:T,name:'Coach A'},{team:T2,name:'Coach B'}]:null);
    for(let y=0;y<8;y++){
      let g=0;while(api.SEA.phase!=='done'&&g++<600){
        api.setPlan('safe');                                   // play it badly on purpose
        api.doAdvance(); const b=global.__nodes.hgo; if(/handwrap/.test(global.__nodes.app.innerHTML)&&b&&b.onclick)b.onclick();
        let n=0;while(api.live&&!api.live.done&&n++<800){if(api.live.ask){const o=api.live.ask.dp.opts;api.answerLive(o[o.length-1][0])}else api.liveTick()}
        await new Promise(r=>setImmediate(r))}
      const humans=hot?api.S.coaches.map((x,i)=>i===(api.S.turn||0)?api.S.myTeam:x.myTeam):[api.S.myTeam];
      for(let k=0;k<(hot?2:1);k++){
        const my=api.S.myTeam, E=api.SEA;
        const before=api.U.coach&&api.U.coach[my]?api.U.coach[my].n:null;
        api.openOffseason(); const S=api.S; offseasons++;
        const now=api.seasonGradeFor(E.rec[my][0],E.rec[my][1],E.seasonResult(my),S.expNow);
        const prev=(S.history||[]).find(h=>h.year===E.year-1&&h.team===my);
        const shouldGo=missed(now)&&!!prev&&/Short of the mark|A bad year/.test(prev.gradeLine||'');
        const went=!!S.off.act.userOpen;
        if(went){firings++; if(!missed(now)||!prev||!/Short of the mark|A bad year/.test(prev.gradeLine||''))oneBad++}
        if(went!==shouldGo)fail(`${E.year} ${my}: ${went?'fired':'kept'} after ${prev?prev.grade+' ('+prev.gradeLine+')':'no earlier season here'} then ${now.g} (${now.l})`);
        // the other human coaches are not the computer's to fire or poach
        if(process.env.TRAP){const C=api.U.coach; humans.forEach(t=>{let v=C[t]; Object.defineProperty(C,t,{configurable:true,enumerable:true,get(){return v},set(x){if(v&&v.you&&!x.you)console.log('   TRAP',t,'replaced by',x.n,'during',my+"'s offseason",new Error().stack.split('\n').slice(2,6).map(s=>s.trim().split(' ')[1]).join(' < ')); v=x}})})}
        // the other people's teams as they stand now (a coach who left a job isn't there any more)
        const others=hot?api.S.coaches.map((x,i)=>i===(api.S.turn||0)?null:x.myTeam).filter(Boolean):[];
        others.forEach(t=>{const c2=api.U.coach[t];
          if(!c2||!c2.you)fail(`${E.year}: ${my}'s offseason replaced the human coach at ${t} with ${c2&&c2.n} [turn ${api.S.turn}; saved teams ${api.S.coaches.map(x=>x.myTeam).join('/')}; active ${api.S.myTeam}]`)});
        if(went)S.off.move=S.off.jobs.length?S.off.jobs[0]:'retire';
        api.commitOffseason(); await new Promise(r=>setImmediate(r));
        if(api.S.retired||!api.S.off&&!hot)break;
      }
      if(api.S.retired)break;
    }
  }
  console.log(`${offseasons} offseasons, ${firings} firings, ${oneBad} of them not after two missed seasons`);
  console.log(bad?`MISMATCH ${bad} offseason(s) broke the rule`:'MATCH every firing followed the rule');
  process.exit(bad?1:0);
})();
