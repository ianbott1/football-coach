/* ============ schedule: English football ============ */
/* A double round robin in each division: everyone plays everyone home and
   away (the circle method; the second half mirrors the first with home and
   away swapped; a new order each season). The Championship plays all 46
   Saturdays from mid-August; the Premier League's 38 rounds start the second
   week (22 August) and skip seven weeks through the season (international
   breaks, cup weekends). */
function roundRobin(rng,teams){
  const T=rng.shuffle(teams.slice()); if(T.length%2)T.push(null);
  const n=T.length, rounds=[];
  for(let r=0;r<n-1;r++){ const rd=[];
    for(let i=0;i<n/2;i++){ const a=T[i], b=T[n-1-i]; if(a&&b)rd.push((r+i)%2?[a,b]:[b,a]) }
    rounds.push(rd); T.splice(1,0,T.pop());
  }
  return rounds.concat(rounds.map(rd=>rd.map(([h,a])=>[a,h])));
}
const PL_OFF=[0,6,12,17,24,30,36,42];          // the Premier League's weeks off (8: 46 - 38)
function eplSchedule(rng,R,year){
  const out=[];
  const div=d=>NAMES.filter(t=>CONF[t]===d);
  roundRobin(rng,div("CH")).forEach((rd,w)=>rd.forEach(([h,a])=>out.push({week:w,home:h,away:a,conf:true,neutral:false})));
  const plWeeks=[...Array(LEAGUE.weeks).keys()].filter(w=>PL_OFF.indexOf(w)<0);
  roundRobin(rng,div("PL")).forEach((rd,i)=>rd.forEach(([h,a])=>out.push({week:plWeeks[i],home:h,away:a,conf:true,neutral:false})));
  return out;
}
LEAGUE.buildSchedule=eplSchedule;
