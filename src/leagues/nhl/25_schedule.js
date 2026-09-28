/* ============ schedule: pro hockey ============ */
/* The NHL's 2026-27 matrix, 84 games, 42 at home and 42 away: each of the
   seven division rivals four times (two home, two away), each of the eight
   teams in the conference's other division three times (four of them twice
   at home, four of them once, rotating by season), each of the sixteen in the
   other conference twice (one each way). Fitted into game dates, no team
   twice on a date. */
function nbaSchedule(rng,R,year){
  const byDiv={}, bySide={};
  NAMES.forEach(t=>{(byDiv[CONF[t]]=byDiv[CONF[t]]||[]).push(t)});
  Object.keys(LEAGUE.conf.sides).forEach(sd=>bySide[sd]=[].concat(...LEAGUE.conf.sides[sd].map(d=>byDiv[d])));
  const sideOf=t=>Object.keys(bySide).find(sd=>bySide[sd].indexOf(t)>=0);
  const games=[], add=(h,a,n)=>{for(let i=0;i<n;i++)games.push({home:h,away:a})};
  // division: two each way
  Object.values(byDiv).forEach(D=>D.forEach((a,i)=>D.forEach((b,j)=>{if(i<j){add(a,b,2);add(b,a,2)}})));
  // the conference's other division: a balanced rotation of who hosts twice
  Object.keys(LEAGUE.conf.sides).forEach(sd=>{
    const [d1,d2]=LEAGUE.conf.sides[sd], A=rng.shuffle(byDiv[d1].slice()), B=rng.shuffle(byDiv[d2].slice()), k=rng.int(8);
    A.forEach((a,i)=>B.forEach((b,j)=>{ if((i+j+k)%8<4){add(a,b,2);add(b,a,1)} else {add(a,b,1);add(b,a,2)} }));
  });
  // the other conference: one each way
  NAMES.forEach(a=>NAMES.forEach(b=>{ if(a<b&&sideOf(a)!==sideOf(b)){add(a,b,1);add(b,a,1)} }));
  // fit into dates: each date a matching, teams with the most games left first
  const DAYS=LEAGUE.weeks;
  for(let attempt=0;attempt<30;attempt++){
    const left={}; NAMES.forEach(t=>left[t]=0); games.forEach(g=>{left[g.home]++;left[g.away]++});
    const pool=rng.shuffle(games.slice()), out=[];
    let ok=true;
    for(let d=0;d<DAYS;d++){
      const busy=new Set(); const daysLeft=DAYS-d;
      pool.sort((x,y)=>(left[y.home]+left[y.away])-(left[x.home]+left[x.away])+rng.gauss(0,0.8));
      for(let i=0;i<pool.length;i++){const g=pool[i];
        if(busy.has(g.home)||busy.has(g.away))continue;
        busy.add(g.home); busy.add(g.away); left[g.home]--; left[g.away]--;
        out.push({week:d,home:g.home,away:g.away,conf:CONF[g.home]===CONF[g.away],neutral:false});
        pool.splice(i,1); i--;
      }
      if(NAMES.some(t=>left[t]>daysLeft-1)){ok=false;break}
    }
    if(ok&&!pool.length)return out;
  }
  throw new Error("could not fit the NHL schedule");
}
LEAGUE.buildSchedule=nbaSchedule;
