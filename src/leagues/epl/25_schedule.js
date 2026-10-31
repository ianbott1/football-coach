/* ============ schedule: English football ============ */
/* A double round robin in each division: everyone plays everyone home and
   away (the circle method; the second half mirrors the first with home and
   away swapped; a new order each season; never more than two in a row at
   home or away). The 24-club divisions play all 46
   Saturdays from mid-August; the Premier League's 38 rounds start the second
   week (22 August) and skip seven weeks through the season (international
   breaks, cup weekends). */
function roundRobin(rng,teams){
  const T=rng.shuffle(teams.slice()); if(T.length%2)T.push(null);
  const n=T.length, rounds=[];
  for(let r=0;r<n-1;r++){ const rd=[];
    // Berger venues: the fixed club alternates; for the rest the top row is at
    // home on even rounds. Clubs move rows as the circle turns, so no club
    // plays more than two in a row at home or away. ((r+i)%2 kept a club's
    // venue fixed while it stayed in one row: 23 straight home games.)
    for(let i=0;i<n/2;i++){ const a=T[i], b=T[n-1-i];
      if(a&&b)rd.push(i===0 ? (r%2?[a,b]:[b,a]) : (r%2?[b,a]:[a,b])) }
    rounds.push(rd); T.splice(1,0,T.pop());
  }
  return rounds.concat(rounds.map(rd=>rd.map(([h,a])=>[a,h])));
}
const PL_OFF=[0,6,12,17,24,30,36,42];          // the Premier League's weeks off (8: 46 - 38)
function eplSchedule(rng,R,year){
  const out=[];
  const div=d=>NAMES.filter(t=>CONF[t]===d);
  // the 24-club divisions: all 46 Saturdays
  ["CH","L1","L2","NL","NN","NS"].forEach(d=>roundRobin(rng,div(d)).forEach((rd,w)=>rd.forEach(([h,a])=>out.push({week:w,home:h,away:a,conf:true,neutral:false}))));
  const plWeeks=[...Array(LEAGUE.weeks).keys()].filter(w=>PL_OFF.indexOf(w)<0);
  roundRobin(rng,div("PL")).forEach((rd,i)=>rd.forEach(([h,a])=>out.push({week:plWeeks[i],home:h,away:a,conf:true,neutral:false})));
  return out;
}
LEAGUE.buildSchedule=eplSchedule;
