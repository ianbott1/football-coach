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
  if(year===2026&&typeof REAL_NHL2026!=="undefined")return nhlWithReal(rng,byDiv,sideOf);
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
/* 2026: the real games so far (30_schedule2026.js) on their game days, then
   the rest of the matrix. Each pairing's remaining games are the matrix's count
   less what's been played; in a three-game pairing whose host-twice side the
   real games haven't settled yet, it's chosen so every team ends on 42 home. */
function nhlWithReal(rng,byDiv,sideOf){
  const K=(h,a)=>h+"|"+a, need={}, played={};
  const set=(h,a,n)=>need[K(h,a)]=n;
  Object.values(byDiv).forEach(D=>D.forEach(a=>D.forEach(b=>{if(a!==b)set(a,b,2)})));
  NAMES.forEach(a=>NAMES.forEach(b=>{if(a!==b&&sideOf(a)!==sideOf(b))set(a,b,1)}));
  REAL_NHL2026.forEach(([d,a,h])=>played[K(h,a)]=(played[K(h,a)]||0)+1);
  // the three-game pairings: who hosts twice
  const tri=[]; Object.keys(LEAGUE.conf.sides).forEach(sd=>{const [d1,d2]=LEAGUE.conf.sides[sd];
    byDiv[d1].forEach(x=>byDiv[d2].forEach(y=>tri.push([x,y])))});
  const P=(h,a)=>played[K(h,a)]||0;
  const home={}; NAMES.forEach(t=>home[t]=0);
  Object.keys(need).forEach(k=>home[k.split("|")[0]]+=need[k]);       // division + other conference
  const open=[]; tri.forEach(([x,y])=>{
    if(P(x,y)>=2||P(y,x)>=2){const tw=P(x,y)>=2?x:y, on=tw===x?y:x; set(tw,on,2); set(on,tw,1); home[tw]+=2; home[on]+=1}
    else open.push([x,y]); });
  // settle the open ones: each team 42 home (retries with a swap search)
  let pick=null;
  for(let tries=0;tries<400&&!pick;tries++){
    // decide in a shuffled order, but keep each decision with its own pairing
    const h=Object.assign({},home), c=new Array(open.length);
    rng.shuffle(open.map((_,i)=>i)).forEach(i=>{ const [x,y]=open[i];
      const want=t=>42-h[t]; const tw=(want(x)>=want(y))?x:y;              // the side further from 42 hosts twice
      c[i]=tw; h[tw]+=2; h[tw===x?y:x]+=1 });
    let bad=NAMES.filter(t=>h[t]!==42).length;
    for(let it=0;it<2000&&bad>0;it++){ const i=rng.int(open.length), [x,y]=open[i], tw=c[i], on=tw===x?y:x;
      if(P(on,tw)>1)continue;                                   // can't: the other side already hosted once more
      h[tw]-=1; h[on]+=1; const nb=NAMES.filter(t=>h[t]!==42).length;
      if(nb<=bad){c[i]=on; bad=nb} else {h[tw]+=1; h[on]-=1} }
    if(bad===0)pick=c;
  }
  if(!pick)throw new Error("NHL 2026: couldn't balance home games around the real schedule");
  open.forEach(([x,y],i)=>{const tw=pick[i], on=tw===x?y:x; set(tw,on,2); set(on,tw,1)});
  // the real games on their game days: day d is step floor(d/2), a team at most once a step
  const out=[], busy={};
  REAL_NHL2026.slice().sort((p,q)=>p[0]-q[0]).forEach(([d,a,h,n])=>{
    let w=Math.floor(d/2); while(busy[w+"|"+a]||busy[w+"|"+h])w++;
    busy[w+"|"+a]=busy[w+"|"+h]=true; out.push({week:w,home:h,away:a,conf:CONF[a]===CONF[h],neutral:!!n,real:true});
  });
  const first=1+Math.max(...out.map(g=>g.week));
  // the rest of the matrix
  const games=[]; Object.keys(need).forEach(k=>{const [h,a]=k.split("|"), left=need[k]-P(h,a);
    if(left<0)throw new Error("NHL 2026: "+a+" at "+h+" played more than the matrix allows");
    for(let i=0;i<left;i++)games.push({home:h,away:a})});
  const DAYS=LEAGUE.weeks;
  for(let attempt=0;attempt<40;attempt++){
    const left={}; NAMES.forEach(t=>left[t]=0); games.forEach(g=>{left[g.home]++;left[g.away]++});
    const pool=rng.shuffle(games.slice()), rest=[]; let ok=true;
    for(let d=first;d<DAYS;d++){ const b=new Set(), daysLeft=DAYS-d;
      pool.sort((x,y)=>(left[y.home]+left[y.away])-(left[x.home]+left[x.away])+rng.gauss(0,0.8));
      for(let i=0;i<pool.length;i++){const g=pool[i]; if(b.has(g.home)||b.has(g.away))continue;
        b.add(g.home); b.add(g.away); left[g.home]--; left[g.away]--;
        rest.push({week:d,home:g.home,away:g.away,conf:CONF[g.home]===CONF[g.away],neutral:false}); pool.splice(i,1); i--}
      if(NAMES.some(t=>left[t]>daysLeft-1)){ok=false;break} }
    if(ok&&!pool.length)return out.concat(rest);
  }
  throw new Error("NHL 2026: couldn't fit the rest of the season");
}
LEAGUE.buildSchedule=nbaSchedule;
