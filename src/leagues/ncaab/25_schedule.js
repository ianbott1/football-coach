/* ============ schedule: college basketball ============ */
/* Eleven non-conference dates, then nineteen of conference play. Conference
   play is a double round robin (the circle method, the second half mirrored
   so home and away even out); the big conferences play only the first 19
   rounds of it, so they meet some opponents twice and others once, as the
   real ones do. Non-conference: everyone paired with a school from another
   conference each date, no repeats; the stronger side usually hosts (the
   buy game), and some games are at early-season tournaments. */
const EARLY_EVENTS=["Maui Invitational","Battle 4 Atlantis","Players Era Festival","Empire Classic",
  "Jimmy V Classic","Champions Classic","CBS Sports Classic","Legends Classic","Charleston Classic",
  "Arizona Tip-Off","Emerald Coast Classic","Diamond Head Classic"];
function rrRoundsBB(teams){
  const t=teams.slice(); if(t.length%2)t.push(null);
  const n=t.length, rounds=[];
  for(let k=0;k<n-1;k++){
    const r=[];
    for(let i=0;i<n/2;i++){const a=t[i],b=t[n-1-i]; if(a&&b)r.push(k%2===0?[a,b]:[b,a])}
    rounds.push(r); t.splice(1,0,t.pop());
  }
  return rounds.concat(rounds.map(r=>r.map(([a,b])=>[b,a])));   // the second time round, home and away swap
}
function buildScheduleBB(rng,R,year){
  const sched=[], met={}, key=(a,b)=>a<b?a+"|"+b:b+"|"+a;
  const NC=LEAGUE.schedule.nonConf, CW=LEAGUE.schedule.confWeeks;
  // conference play
  const byConf={}; NAMES.forEach(t=>{(byConf[CONF[t]]=byConf[CONF[t]]||[]).push(t)});
  Object.keys(byConf).forEach(c=>{
    const rounds=rrRoundsBB(rng.shuffle(byConf[c].slice())).slice(0,CW);
    // fewer rounds than dates: spread the byes out
    const slots=Array.from({length:CW},(_,i)=>i);
    const pick=rounds.length>=CW?slots:slots.filter((_,i)=>Math.floor(i*rounds.length/CW)!==Math.floor((i+1)*rounds.length/CW)||i===CW-1).slice(0,rounds.length);
    rounds.forEach((r,i)=>r.forEach(([h,a])=>{sched.push({week:NC+pick[i],home:h,away:a,conf:true,neutral:false}); met[key(h,a)]=(met[key(h,a)]||0)+1}));
  });
  // non-conference: pair everyone each date with someone from another conference
  // non-conference rivalries are pinned: same date every year, home alternating by year
  const pinned={};
  (typeof RIVALS!=="undefined"?RIVALS:[]).forEach(([a,b,n,w])=>{
    if(w===undefined||CONF[a]===CONF[b])return;
    (pinned[w]=pinned[w]||[]).push(year%2?[a,b]:[b,a]);
  });
  for(let w=0;w<NC;w++){
    const fixed=(pinned[w]||[]).filter(([a,b])=>!met[key(a,b)]);
    fixed.forEach(([h,a])=>{met[key(h,a)]=1; sched.push({week:w,home:h,away:a,conf:false,neutral:false,rivalry:true})});
    const busy=new Set([].concat(...fixed));
    let best=null;
    for(let attempt=0;attempt<40&&!best;attempt++){
      const pool=rng.shuffle(NAMES.filter(t=>!busy.has(t))), pairs=[]; let ok=true;
      while(pool.length>=2){
        const a=pool.shift();
        const j=pool.findIndex(b=>CONF[b]!==CONF[a]&&!met[key(a,b)]);
        if(j<0){ if(pool.length>1){ok=false;break} pool.shift(); continue }   // an odd one out sits
        pairs.push([a,pool.splice(j,1)[0]]);
      }
      if(ok)best=pairs;
    }
    (best||[]).forEach(([a,b])=>{
      met[key(a,b)]=1;
      const strong=(R[a]||0)>=(R[b]||0)?a:b, weak=strong===a?b:a;
      const x=rng.r();
      if(x<0.12){ sched.push({week:w,home:strong,away:weak,conf:false,neutral:true,site:rng.pick(EARLY_EVENTS)}) }
      else if(x<0.84){ sched.push({week:w,home:strong,away:weak,conf:false,neutral:false}) }   // the buy game
      else sched.push({week:w,home:weak,away:strong,conf:false,neutral:false});             // a return trip
    });
  }
  return sched;
}
LEAGUE.buildSchedule=buildScheduleBB;
