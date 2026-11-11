/* ============ schedule: pro baseball ============ */
/* The balanced schedule MLB has played since 2023, 162 games, played as series (round 57: it was a different opponent
   every day with no days off, and home games ran 77 to 85 a club: Instinct, Muse):
   - thirteen against each division rival: seven at home one year, six the next (a 4 and a 3, or two 3s);
   - six or seven against each of the other ten in the league (two 3-game series; the seventh makes one a 4);
   - one 3-game series against each of fourteen in the other league, home or away, and four against the natural
     rival (a 2-game series each way).
   Where the odd games go is chosen so that every club has exactly 81 at home: each league's odd pairings, and the
   interleague series, are oriented along Euler circuits (every club has an even number of each, so a circuit gives
   it as many home as away). Then the series are laid into the season's days (no games over the All-Star break or two league-wide days
   off): both clubs free on the first day, the
   clubs with least room first, and a day off for a club that has played two to three weeks straight. */
function mlbSchedule(rng,R,year){
  const byDiv={}, bySide={};
  NAMES.forEach(t=>{(byDiv[CONF[t]]=byDiv[CONF[t]]||[]).push(t)});
  Object.keys(LEAGUE.conf.sides).forEach(sd=>bySide[sd]=[].concat(...LEAGUE.conf.sides[sd].map(d=>byDiv[d])));
  const n={}, key=(a,b)=>a<b?a+"|"+b:b+"|"+a, addN=(a,b,k)=>{n[key(a,b)]=(n[key(a,b)]||0)+k};
  Object.values(byDiv).forEach(D=>D.forEach((a,i)=>D.forEach((b,j)=>{ if(i<j)addN(a,b,13) })));
  Object.keys(bySide).forEach(sd=>{ const L=bySide[sd];
    L.forEach((a,i)=>L.forEach((b,j)=>{ if(i<j&&CONF[a]!==CONF[b])addN(a,b,6) }));
    const divs=LEAGUE.conf.sides[sd];
    divs.forEach((d1,x)=>divs.forEach((d2,y)=>{ if(x>=y)return; const A=byDiv[d1], B=byDiv[d2], k=(year+x+y)%5;
      A.forEach((a,i)=>[0,1].forEach(m=>addN(a,B[(i+k+m)%5],1))) })) });
  const [S1,S2]=Object.keys(bySide), rival={};
  bySide[S1].forEach((a,i)=>{ const b=bySide[S2][i]; rival[a]=b; rival[b]=a });
  // orient the edges of a graph whose every vertex has even degree: walk Euler circuits (Hierholzer), each edge
  // pointing the way it is walked; returns [from,to] pairs
  const orient=(edges)=>{ const adj={}; edges.forEach((e,i)=>{ (adj[e[0]]=adj[e[0]]||[]).push(i); (adj[e[1]]=adj[e[1]]||[]).push(i) });
    Object.values(adj).forEach(l=>rng.shuffle(l)); const used=new Array(edges.length).fill(false), out=[];
    Object.keys(adj).forEach(v0=>{ const stack=[v0];
      while(stack.length){ const v=stack[stack.length-1], l=adj[v]; while(l.length&&used[l[l.length-1]])l.pop();
        if(!l.length){ stack.pop(); continue } const i=l.pop(); used[i]=true; const e=edges[i], w=e[0]===v?e[1]:e[0]; out.push([v,w]); stack.push(w) } });
    return out };
  // the odd games within each league: the one extra goes to the host the circuit points to
  const odd=Object.keys(n).filter(k=>n[k]%2).map(k=>k.split("|")), extra={};
  orient(odd).forEach(([h,a])=>extra[h+"|"+a]=true);
  const series=[], ser=(h,a,len)=>series.push({home:h,away:a,len:len});
  const split=g=>g===7?[4,3]:g===6?[3,3]:g===5?[3,2]:g===4?[4]:g===3?[3]:g===2?[2]:g===1?[1]:[3,3,3].slice(0,Math.floor(g/3)).concat(g%3?[g%3]:[]);
  Object.keys(n).forEach(k=>{ const [a,b]=k.split("|"), t=n[k], half=Math.floor(t/2), ha=half+(extra[a+"|"+b]?1:0), hb=t-ha;
    split(ha).forEach(L=>ser(a,b,L)); split(hb).forEach(L=>ser(b,a,L)) });
  // the other league: a 3-game series against each but the rival, its site along an Euler circuit (14 each: 7 home)
  const inter=[]; bySide[S1].forEach(a=>bySide[S2].forEach(b=>{ if(rival[a]!==b)inter.push([a,b]) }));
  orient(inter).forEach(([h,a])=>ser(h,a,3));
  NAMES.forEach(a=>{ if(bySide[S1].indexOf(a)>=0){ ser(a,rival[a],2); ser(rival[a],a,2) } });
  return packSeries(rng,series);
}
/* lay the series into the season's days (also used by the tests): returns the games, one entry a game, with the
   series it belongs to (ser, its game sg of sn) */
function packSeries(rng,series){
  const DAYS=LEAGUE.weeks;
  // days nobody plays (a series never spans one): the All-Star break, four days past the middle, and two league-wide
  // days off (measured: the season ends on day 184-185 of 186; with none it ended on 176-178), so the season runs to its last day instead of ending a week early
  const dead=new Set(), mid=Math.round(DAYS*0.56), DD=[4,[0.3,0.8]]; for(let k=0;k<DD[0];k++)dead.add(mid+k);
  DD[1].forEach(f=>dead.add(Math.round(DAYS*f)));
  const clear=(d,L)=>{ for(let k=0;k<L;k++)if(dead.has(d+k))return false; return true };
  for(let attempt=0;attempt<200;attempt++){
    const rem={}, free={}, run={}, pool=rng.shuffle(series.map((x,i)=>Object.assign({id:i},x))), out=[];
    NAMES.forEach(t=>{rem[t]=0;free[t]=0;run[t]=0}); pool.forEach(x=>{rem[x.home]+=x.len;rem[x.away]+=x.len});
    let ok=true;
    for(let d=0;d<DAYS&&ok;d++){
      let left=0; for(let k=d;k<DAYS;k++)if(!dead.has(k))left++;
      const slack=t=>left-rem[t];
      if(dead.has(d)){ NAMES.forEach(t=>{ if(free[t]<=d)run[t]=0 }); continue }
      const avail=NAMES.filter(t=>free[t]<=d&&rem[t]>0).sort((x,y)=>slack(x)-slack(y)||rng.r()-0.5);
      const taken=new Set(), rest=new Set();
      // a day off after a long stretch, while there's room for it
      // a day off after a long stretch, while there's room for it
      avail.forEach(t=>{ if(slack(t)>0&&run[t]>=12+rng.int(6))rest.add(t) });   // MLB caps a stretch at 20 days
      for(const t of avail){ if(taken.has(t)||rest.has(t))continue;
        let best=-1, bs=1e9;
        for(let i=0;i<pool.length;i++){ const x=pool[i]; if(x.home!==t&&x.away!==t)continue; const o=x.home===t?x.away:x.home;
          if(taken.has(o)||rest.has(o)||free[o]>d||x.len>left||!clear(d,x.len))continue; const sc=slack(o)+rng.r()*2; if(sc<bs){bs=sc;best=i} }
        if(best<0)continue;
        const x=pool.splice(best,1)[0]; taken.add(x.home); taken.add(x.away);
        for(let k=0;k<x.len;k++)out.push({week:d+k,home:x.home,away:x.away,conf:CONF[x.home]===CONF[x.away],neutral:false,ser:x.id,sg:k+1,sn:x.len});
        [x.home,x.away].forEach(t=>{ free[t]=d+x.len; rem[t]-=x.len; run[t]+=x.len }) }
      NAMES.forEach(t=>{ if(free[t]<=d&&!taken.has(t))run[t]=0 });   // idle today: the stretch ends
      if(NAMES.some(t=>rem[t]>left-1+(free[t]>d?1:0)))ok=false;
    }
    if(ok&&!pool.length)return out.sort((a,b)=>a.week-b.week);
  }
  throw new Error("could not fit the baseball schedule");
}
LEAGUE.buildSchedule=mlbSchedule;
