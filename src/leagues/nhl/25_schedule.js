/* ============ schedule: pro hockey ============ */
/* The real formula, 82 games: division rivals 26 (four games against five of
   them, three against the other two, rotating by season), the conference's
   other division 24 (three each), the other conference 32 (two each).
   Fitted into 90 game dates, no team twice on a date. */
function nbaSchedule(rng,R,year){
  const bySide={}, byDiv={};
  NAMES.forEach(t=>{const d=CONF[t]; (byDiv[d]=byDiv[d]||[]).push(t)});
  Object.keys(LEAGUE.conf.sides).forEach(sd=>bySide[sd]=[].concat(...LEAGUE.conf.sides[sd].map(d=>byDiv[d])));
  const sideOf=t=>Object.keys(bySide).find(sd=>bySide[sd].indexOf(t)>=0);
  const series={}, key=(a,b)=>a<b?a+"|"+b:b+"|"+a;
  // three-game division rivals: two each, around a shuffled ring of the division
  const three=new Set();
  Object.keys(byDiv).forEach(d=>{const ring=rng.shuffle(byDiv[d].slice());
    ring.forEach((t,i)=>three.add(key(t,ring[(i+1)%ring.length])))});
  NAMES.forEach(a=>NAMES.forEach(b=>{ if(a>=b)return;
    series[key(a,b)]= CONF[a]===CONF[b]?(three.has(key(a,b))?3:4) : sideOf(a)===sideOf(b)?3 : 2 }));
  // the games, home and away split evenly (the odd game of three goes either way)
  const games=[];
  Object.keys(series).forEach(k=>{const [a,b]=k.split("|"), n=series[k], ha=rng.r()<0.5;
    for(let i=0;i<n;i++){const h=(i%2===0)===ha?a:b; games.push({home:h,away:h===a?b:a})}});
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
