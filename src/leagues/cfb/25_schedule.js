/* ============ schedule: college football ============ */
/* Conference slates, non-conference pairing by strength, protected
   rivalries, and the real 2026 games laid down first. The core asks
   LEAGUE.buildSchedule(rng, ratings, year) for [{week, home, away, conf,
   neutral, real, site}]. */
/* d-regular circulant: every team gets EXACTLY d conference games.
   Valid whenever d <= n-1 and (n*d) is even. */
function confGraph(members,d,rng){
  const idx=rng.shuffle(members.slice()), n=idx.length, out=[];
  d=Math.min(d,n-1);
  if((n*d)%2!==0)d-=1;
  const half=Math.floor(d/2);
  for(let o=1;o<=half;o++)
    for(let i=0;i<n;i++)out.push([idx[i],idx[(i+o)%n]]);
  if(d%2===1)for(let i=0;i<n/2;i++)out.push([idx[i],idx[i+n/2]]);
  return out;
}

function rrRounds(list){
  const t=list.slice(); if(t.length%2)t.push(null);
  const n=t.length, out=[];
  for(let k=0;k<n-1;k++){
    const p=[];
    for(let i=0;i<n/2;i++){const a=t[i],b=t[n-1-i];if(a&&b)p.push([a,b])}
    out.push(p); t.splice(1,0,t.pop());
  }
  return out;
}

/* Finish a conference to `need` games each, keeping any edges already placed. */
function completeConf(teams,need,rng,games,fixedKey,confCount){
  const K=(a,b)=>[a,b].sort().join("|");
  for(let pass=0;pass<400;pass++){
    const short=teams.filter(t=>confCount[t]<need);
    if(!short.length)return;
    short.sort((a,b)=>(need-confCount[b])-(need-confCount[a]));
    const a=short[0];
    const opts=rng.shuffle(teams.filter(t=>t!==a&&confCount[t]<need&&!fixedKey.has(K(a,t))));
    if(!opts.length){
      // nobody left who needs a game: swap into an existing pair
      const cand=games.filter(g=>g[2]&&!g[4]&&teams.indexOf(g[0])>=0&&teams.indexOf(g[1])>=0
        &&g[0]!==a&&g[1]!==a&&!fixedKey.has(K(a,g[0])));
      if(!cand.length)return;
      const g=cand[rng.int(cand.length)];
      const drop=g[1];
      fixedKey.delete(K(g[0],g[1]));
      confCount[drop]--;
      g[1]=a; confCount[a]++;
      fixedKey.add(K(g[0],g[1]));
      continue;
    }
    const b=opts[0];
    fixedKey.add(K(a,b));
    confCount[a]++; confCount[b]++;
    if(rng.r()<0.5)games.push([b,a,true,false]); else games.push([a,b,true,false]);
  }
}

function buildSchedule(rng,R,year){
  const byConf={};
  NAMES.forEach(t=>{(byConf[CONF[t]]=byConf[CONF[t]]||[]).push(t)});
  const games=[], nGames=LEAGUE.schedule.confGames;
  // The ACC has 17 teams in 2026: most play nine, a few play eight. The real
  // games push those teams to nine; the filler tops everyone up to eight.

  /* Real games are laid down first and never moved; the generator fills in
     around them so a released schedule survives intact. */
  const fixedKey=new Set();
  const confCount={}; NAMES.forEach(t=>confCount[t]=0);
  if(year===2026&&typeof REAL2026!=="undefined"){
    REAL2026.forEach(g=>{
      if(NAMES.indexOf(g.h)<0||NAMES.indexOf(g.a)<0)return;
      const k=[g.a,g.h].sort().join("|");
      if(fixedKey.has(k))return;
      const isC=CONF[g.a]===CONF[g.h];
      if(isC&&(confCount[g.a]>=(nGames[CONF[g.a]]||LEAGUE.schedule.confGamesDefault)||confCount[g.h]>=(nGames[CONF[g.h]]||LEAGUE.schedule.confGamesDefault)))return;
      fixedKey.add(k);
      if(isC){confCount[g.a]++;confCount[g.h]++}
      games.push([g.a,g.h,isC,!!g.neutral,true,g.w,g.site||null]);
    });
  }

  for(const c in byConf){
    if(c==="IND")continue;
    const need=nGames[c]||LEAGUE.schedule.confGamesDefault;
    completeConf(byConf[c],need,rng,games,fixedKey,confCount);
  }
  const played={}; NAMES.forEach(t=>played[t]=0);
  games.forEach(g=>{played[g[0]]++;played[g[1]]++});
  const RR=Object.assign({},R);
  NAMES.forEach(t=>{if(CONF[t]==="IND")RR[t]=RR[t]+130});
  const seen=new Set(games.map(g=>[g[0],g[1]].sort().join("|")));
  let pool=[];
  NAMES.forEach(t=>{for(let i=0;i<Math.max(0,LEAGUE.schedule.games-played[t]);i++)pool.push(t)});
  rng.shuffle(pool);
  let tries=0;
  while(pool.length>=2 && tries<80000){
    tries++;
    const i=rng.int(pool.length), a=pool[i];
    const target=RR[a]+(rng.r()<0.24?rng.gauss(0,120):-rng.range(300,750));
    let bj=null,best=null;
    for(let s=0;s<8;s++){
      const k=rng.int(pool.length); if(k===i)continue;
      const d=Math.abs(RR[pool[k]]-target);
      if(best===null||d<best){best=d;bj=k}
    }
    if(bj===null)continue;
    const b=pool[bj];
    if(a===b||CONF[a]===CONF[b])continue;
    const key=[a,b].sort().join("|"); if(seen.has(key))continue;
    seen.add(key);
    let home;
    if(Math.abs(RR[a]-RR[b])>200) home=RR[a]>RR[b]?a:b;
    else home=rng.r()<0.5?a:b;
    games.push([home===a?b:a, home, false, false]);
    const idx=[i,bj].sort((x,y)=>y-x);
    idx.forEach(x=>pool.splice(x,1));
  }
  // pairing repair: pair leftovers directly, or steal an opponent from an
  // existing non-conference game and push the displaced team back into the pool.
  const kOf=(x,y)=>[x,y].sort().join("|");
  let guard=0;
  while(pool.length>0 && guard++<20000){
    const a=pool[0];
    let partner=-1;
    for(let k=1;k<pool.length;k++){
      const b=pool[k];
      if(a===b||CONF[a]===CONF[b])continue;
      if(seen.has(kOf(a,b)))continue;
      partner=k;break;
    }
    if(partner>=0){
      const b=pool[partner];
      seen.add(kOf(a,b));
      const home=rng.r()<0.5?a:b;
      games.push([home===a?b:a,home,false,false]);
      pool.splice(partner,1);pool.splice(0,1);
      continue;
    }
    // steal: replace non-conf game (p,q) with (a,p); q re-enters the pool
    let stole=false;
    const order=rng.shuffle(games.map((g,i)=>i).filter(i=>!games[i][2]));
    for(const gi of order){
      const g=games[gi], x=g[0], y=g[1];
      for(const [p,q] of [[x,y],[y,x]]){
        if(p===a||CONF[a]===CONF[p])continue;
        if(seen.has(kOf(a,p)))continue;
        seen.delete(kOf(x,y));
        seen.add(kOf(a,p));
        games.splice(gi,1);
        const home=rng.r()<0.5?a:p;
        games.push([home===a?p:a,home,false,false]);
        pool.splice(0,1);
        pool.push(q);
        stole=true;break;
      }
      if(stole)break;
    }
    if(!stole){pool.splice(0,1)}
  }

  enforceRivalries(games,rng,year===2026);

  /* Balance home and away. A coin flip per game leaves teams with ten road
     trips; real slates are close to six and six. */
  (function balanceHome(){
    const homeCt={}; NAMES.forEach(t=>homeCt[t]=0);
    games.forEach(g=>homeCt[g[1]]++);
    const tgt={}; NAMES.forEach(t=>tgt[t]=0);
    games.forEach(g=>{tgt[g[0]]+=0.5;tgt[g[1]]+=0.5});
    const dev=t=>homeCt[t]-tgt[t];
    const idx=games.map((g,i)=>i);
    for(let pass=0;pass<400;pass++){
      let moved=false;
      rng.shuffle(idx);
      for(const i of idx){
        const g=games[i]; if(g[3]||g[4])continue; // neutral sites and real games stay put
        const away=g[0], home=g[1];
        if(dev(home)-dev(away)>=1){              // strictly reduces the spread
          g[0]=home; g[1]=away;
          homeCt[home]--; homeCt[away]++;
          moved=true;
        }
      }
      if(!moved)break;
    }
  })();

  // week assignment — retried until every team has a full slate
  let bestSched=null, bestShort=1e9;
  for(let attempt=0; attempt<6; attempt++){
  rng.shuffle(games);
  games.sort((x,y)=>{
    const ra=x[4]?0:1, rb=y[4]?0:1;              // real games get first claim
    if(ra!==rb)return ra-rb;
    return (x[2]?1:0)-(y[2]?1:0);
  });
  const busy={}; NAMES.forEach(t=>busy[t]=new Set());
  const sched=[], unplaced=[];
  games.forEach(([a,h,isC,neu,rl,pw,site])=>{
    let order=isC?[...Array(LEAGUE.weeks).keys()].slice(3).concat([0,1,2])
                 :[...Array(LEAGUE.weeks).keys()];
    if(rl&&pw!==undefined)order=[pw].concat(order.filter(w=>w!==pw));
    let ok=false;
    for(const w of order){
      if(!busy[a].has(w)&&!busy[h].has(w)){
        busy[a].add(w);busy[h].add(w);
        sched.push({week:w,away:a,home:h,conf:isC,neutral:neu,real:!!rl,site:site||null});
        ok=true;break}
    }
    if(!ok)unplaced.push([a,h,isC,neu]);
  });
  const place=(a,h,isC,neu)=>{
    for(let w=0;w<LEAGUE.weeks;w++){
      if(!busy[a].has(w)&&!busy[h].has(w)){
        busy[a].add(w);busy[h].add(w);
        sched.push({week:w,away:a,home:h,conf:isC,neutral:neu});return true}
    }
    return false;
  };
  const move=(g,depth)=>{               // try to relocate game g to a free week
    const A=g.home,B=g.away,cur=g.week;
    for(let w=0;w<LEAGUE.weeks;w++){
      if(w===cur)continue;
      if(!busy[A].has(w)&&!busy[B].has(w)){
        busy[A].delete(cur);busy[B].delete(cur);
        busy[A].add(w);busy[B].add(w);g.week=w;return true}
    }
    if(depth<=0)return false;
    for(let w=0;w<LEAGUE.weeks;w++){
      if(w===cur)continue;
      const block=sched.filter(x=>x!==g&&x.week===w&&
        (x.home===A||x.away===A||x.home===B||x.away===B));
      if(block.length!==1)continue;
      if(move(block[0],depth-1)){
        if(!busy[A].has(w)&&!busy[B].has(w)){
          busy[A].delete(cur);busy[B].delete(cur);
          busy[A].add(w);busy[B].add(w);g.week=w;return true}
      }
    }
    return false;
  };
  const stillOut=[];
  unplaced.forEach(([a,h,isC,neu])=>{
    if(place(a,h,isC,neu))return;
    let ok=false;
    for(let w=0;w<LEAGUE.weeks&&!ok;w++){
      const block=sched.filter(x=>x.week===w&&
        (x.home===a||x.away===a||x.home===h||x.away===h));
      if(block.length!==1)continue;
      if(move(block[0],2)&&!busy[a].has(w)&&!busy[h].has(w)){
        busy[a].add(w);busy[h].add(w);
        sched.push({week:w,away:a,home:h,conf:isC,neutral:neu});ok=true}
    }
    if(!ok)stillOut.push([a,h,isC,neu]);
  });
  stillOut.forEach(([a,h,isC,neu])=>{ place(a,h,isC,neu) });
  lateenRivalries(sched,busy);
  if(year===2026)pinRealWeeks(sched,busy,LEAGUE.weeks);
  fillEarlyByes(sched,busy);
  const tally={}; NAMES.forEach(t=>tally[t]=0);
  sched.forEach(g=>{tally[g.home]++;tally[g.away]++});
  const shortfall=games.length-sched.length;
  if(shortfall<bestShort){bestShort=shortfall;bestSched=sched}
  if(shortfall===0)return sched;
  }
  return bestSched;
}

LEAGUE.buildSchedule=buildSchedule;
