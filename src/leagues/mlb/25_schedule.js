/* ============ schedule: pro baseball ============ */
/* The balanced schedule MLB has played since 2023, 162 games, 81 at home: thirteen against each division rival (seven at
   home one year, six the next, by pairing), six or seven against each of the other ten in the league (three each way;
   the seventh rotates), three against each of the fifteen in the other league (two at home, by pairing and year) and
   four against the natural rival across the leagues (two each way). Fitted into the season's days, most teams playing
   most days, no team twice on a day. */
function mlbSchedule(rng,R,year){
  const byDiv={}, bySide={};
  NAMES.forEach(t=>{(byDiv[CONF[t]]=byDiv[CONF[t]]||[]).push(t)});
  Object.keys(LEAGUE.conf.sides).forEach(sd=>bySide[sd]=[].concat(...LEAGUE.conf.sides[sd].map(d=>byDiv[d])));
  const sideOf=t=>Object.keys(bySide).find(sd=>bySide[sd].indexOf(t)>=0);
  const games=[], add=(h,a,n)=>{for(let i=0;i<n;i++)games.push({home:h,away:a})};
  const flip=(a,b)=>(strHash(a<b?a+"|"+b:b+"|"+a)+year)%2===0;     // which side hosts the odd game this year
  // the division: thirteen, seven and six
  Object.values(byDiv).forEach(D=>D.forEach((a,i)=>D.forEach((b,j)=>{ if(i<j){ const x=flip(a,b); add(a,b,x?7:6); add(b,a,x?6:7) } })));
  // the rest of the league: six each, and a seventh against four of the ten (rotating), its host by pairing
  Object.keys(bySide).forEach(sd=>{ const L=bySide[sd];
    L.forEach((a,i)=>L.forEach((b,j)=>{ if(i>=j||CONF[a]===CONF[b])return; add(a,b,3); add(b,a,3) }));
    // the seventh games: each team gets four, by a rotation through the other two divisions
    const divs=LEAGUE.conf.sides[sd];
    divs.forEach((d1,x)=>divs.forEach((d2,y)=>{ if(x>=y)return; const A=byDiv[d1], B=byDiv[d2], k=(year+x+y)%5;
      A.forEach((a,i)=>[0,1].forEach(m=>{ const b=B[(i+k+m)%5]; if(flip(a,b))add(a,b,1); else add(b,a,1) })) }));
  });
  // the other league: three each (two at home by pairing and year), four against the natural rival
  const [S1,S2]=Object.keys(bySide);
  bySide[S1].forEach((a,i)=>bySide[S2].forEach((b,j)=>{ if(i===j){ add(a,b,2); add(b,a,2); return } const x=flip(a,b); add(a,b,x?2:1); add(b,a,x?1:2) }));
  // fit into days: each day a matching, the teams with the most games left first, paced to the last day
  const DAYS=LEAGUE.weeks;
  for(let attempt=0;attempt<80;attempt++){
    const left={}; NAMES.forEach(t=>left[t]=0); games.forEach(g=>{left[g.home]++;left[g.away]++});
    const pool=rng.shuffle(games.slice()), out=[]; let ok=true;
    for(let d=0;d<DAYS;d++){
      const busy=new Set(), daysLeft=DAYS-d;
      schedOrder(pool,left,rng); const cap=paceCap(pool.length,daysLeft,rng);
      for(let i=0;i<pool.length;i++){ const g=pool[i];
        if(busy.has(g.home)||busy.has(g.away))continue;
        // paced, except for a team running out of days (it plays whenever it can)
        if(busy.size>=2*cap&&!(left[g.home]>=daysLeft-3||left[g.away]>=daysLeft-3))continue;
        busy.add(g.home); busy.add(g.away); left[g.home]--; left[g.away]--;
        out.push({week:d,home:g.home,away:g.away,conf:CONF[g.home]===CONF[g.away],neutral:false});
        pool.splice(i,1); i--; }
      if(NAMES.some(t=>left[t]>daysLeft-1)){ok=false;break}
    }
    if(ok&&!pool.length)return out;
  }
  throw new Error("could not fit the baseball schedule");
}
/* a day's share of the games left: about the average, give or take, so the season runs to its last day */
function paceCap(left,daysLeft,rng){ return Math.max(1,Math.round(left/Math.max(1,daysLeft)*(0.9+0.25*rng.r()))) }
LEAGUE.buildSchedule=mlbSchedule;
