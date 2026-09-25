/* ============ RNG ============ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
class RNG{
  constructor(seed){this.f=mulberry32(seed);this.sp=null}
  r(){return this.f()}
  int(n){return Math.floor(this.f()*n)}
  range(a,b){return a+this.f()*(b-a)}
  pick(a){return a[this.int(a.length)]}
  gauss(m,s){
    if(this.sp!==null){const v=this.sp;this.sp=null;return m+s*v}
    let u=0,v=0;while(u===0)u=this.f();while(v===0)v=this.f();
    const R=Math.sqrt(-2*Math.log(u));this.sp=R*Math.sin(2*Math.PI*v);
    return m+s*R*Math.cos(2*Math.PI*v)}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
}

/* ============ home fields ============ */
/* Not every stadium is the same place. A handful are genuinely miserable to
   visit; most are ordinary; some are half empty in November. */
const CATHEDRAL={
"LSU":26,"Penn State":24,"Ohio State":21,"Alabama":20,"Texas A&M":22,"Oregon":19,
"Clemson":18,"Wisconsin":17,"Tennessee":20,"Florida":16,"Georgia":18,"Michigan":19,
"Oklahoma":15,"Notre Dame":16,"Auburn":16,"Iowa":15,"Washington":15,"Utah":14,
"Virginia Tech":15,"West Virginia":13,"Mississippi St":12,"Ole Miss":12,"Texas":15,
"USC":11,"Nebraska":13,"BYU":12,"Boise State":14,"Air Force":10,"Hawaii":12,
"Kansas State":12,"Arkansas":12,"South Carolina":13,"Missouri":10,"Louisville":10,
"Miami":8,"Duke":4,"Northwestern":3,"Rutgers":5,"Purdue":5,"Vanderbilt":4,
"Wake Forest":5,"Boston College":6,"Stanford":4,"California":5,"Kent State":2,
"Akron":2,"Charlotte":3,"UTEP":3,"Temple":3,"FIU":2,"Ga State":2
};

function homeField(u,t){
  const prog=(u&&u.program&&u.program[t])!==undefined?u.program[t]:1500;
  const base=39+Math.max(0,Math.min(1,(prog-1150)/900))*30;
  return Math.round(base+(CATHEDRAL[t]||8));
}

function venueLabel(v){
  if(v>=88)return "one of the hardest places to play in the country";
  if(v>=76)return "a genuinely hostile road trip";
  if(v>=64)return "a real home-field edge";
  if(v>=52)return "a normal road game";
  return "not a difficult place to visit";
}

/* ============ team identity ============ */
function _hx(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function _lum(c){const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*r+.7152*g+.0722*b}
function _mix(c,t,p){return c.map((v,i)=>Math.round(v+(t[i]-v)*p))}
const _READ={};
function teamColor(t){                    // raw brand color
  return LEAGUE.colors[t]||"#F4A63A";
}
function teamInk(t){                      // brand color, lightened until legible on dark
  if(_READ[t])return _READ[t];
  let c=_hx(LEAGUE.colors[t]||"#F4A63A"), p=0;
  while(_lum(c)<0.30&&p<0.85){p+=0.08;c=_mix(_hx(LEAGUE.colors[t]||"#F4A63A"),[255,255,255],p)}
  const out="#"+c.map(v=>v.toString(16).padStart(2,"0")).join("");
  _READ[t]=out; return out;
}

/* ============ constants ============ */
const ELO_PT=21, HFA=62, GAME_SD=14, K=32;

function divisionOf(u,t){
  const c=(u&&u.conf&&u.conf[t])||CONF[t];
  const D=LEAGUE.conf.divisions[c]; if(!D)return null;
  for(const k in D)if(D[k].indexOf(t)>=0)return k;
  // a newcomer joins whichever side is thinner
  const sizes=Object.keys(D).map(k=>[k,D[k].length]).sort((a,b)=>a[1]-b[1]);
  D[sizes[0][0]].push(t);
  return sizes[0][0];
}
function hasDivisions(c){return !!LEAGUE.conf.divisions[c]}
function divisionNames(c){return LEAGUE.conf.divisions[c]?Object.keys(LEAGUE.conf.divisions[c]).sort():[]}
const NAMES=LEAGUE.teams.map(t=>t[0]);
let CONF=Object.fromEntries(LEAGUE.teams.map(t=>[t[0],t[2]]));
function syncConf(u){
  if(u&&u.conf)NAMES.forEach(t=>{if(u.conf[t])CONF[t]=u.conf[t]});
  else if(u){u.conf={};NAMES.forEach(t=>u.conf[t]=CONF[t])}
}

/* ---- realignment ---- */
/* Money moves programs. Every few years the strongest independents-in-waiting
   get poached upward and the weakest P4 members get left behind. */
function realign(u,rng,year){
  if(!u.conf)syncConf(u);
  const size=c=>NAMES.filter(t=>u.conf[t]===c).length;
  const moves=[];
  const P4L=["SEC","B1G","B12","ACC"];
  const G6L=["AAC","MW","P12","SBC","MAC","CUSA"];
  const n=1+rng.int(3);
  for(let k=0;k<n;k++){
    // a strong Group of 6 program gets the call up
    const cands=NAMES.filter(t=>G6L.indexOf(u.conf[t])>=0 && u.program[t]>=1600)
      .sort((a,b)=>u.program[b]-u.program[a]).slice(0,8);
    if(!cands.length)break;
    const mover=rng.pick(cands);
    const dest=P4L.filter(c=>size(c)<20).sort((a,b)=>{
      const pa=NAMES.filter(t=>u.conf[t]===a).reduce((s,t)=>s+u.program[t],0)/Math.max(1,size(a));
      const pb=NAMES.filter(t=>u.conf[t]===b).reduce((s,t)=>s+u.program[t],0)/Math.max(1,size(b));
      return pa-pb;
    })[0];
    if(!dest||size(u.conf[mover])<=8)continue;
    moves.push({team:mover,from:u.conf[mover],to:dest});
    u.conf[mover]=dest;
  }
  syncConf(u);
  if(moves.length){u.realignLog=u.realignLog||[];u.realignLog.push({year:year,moves:moves})}
  return moves;
}

/* ============ schedule ============ */
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
  const games=[], nGames={SEC:9,B1G:9,B12:9,P12:7};   // Pac-12 plays a round robin
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
      if(isC&&(confCount[g.a]>=(nGames[CONF[g.a]]||8)||confCount[g.h]>=(nGames[CONF[g.h]]||8)))return;
      fixedKey.add(k);
      if(isC){confCount[g.a]++;confCount[g.h]++}
      games.push([g.a,g.h,isC,!!g.neutral,true,g.w,g.site||null]);
    });
  }

  for(const c in byConf){
    if(c==="IND")continue;
    const need=nGames[c]||8;
    completeConf(byConf[c],need,rng,games,fixedKey,confCount);
  }
  const played={}; NAMES.forEach(t=>played[t]=0);
  games.forEach(g=>{played[g[0]]++;played[g[1]]++});
  const RR=Object.assign({},R);
  NAMES.forEach(t=>{if(CONF[t]==="IND")RR[t]=RR[t]+130});
  const seen=new Set(games.map(g=>[g[0],g[1]].sort().join("|")));
  let pool=[];
  NAMES.forEach(t=>{for(let i=0;i<Math.max(0,12-played[t]);i++)pool.push(t)});
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

/* ============ game sim ============ */
function simGame(rng,tH,tA,neutral,sdMult,edgeAdj){
  const edge=tH-tA+(neutral?0:HFA)+(edgeAdj||0);
  let m=Math.round(rng.gauss(edge/ELO_PT,GAME_SD*(sdMult||1)));
  if(m===0)m=rng.r()<0.5?-3:3;
  let total=rng.gauss(52,9.5)+Math.abs(m)*0.18;
  total=Math.max(20,Math.min(95,total));
  let lo=Math.max(0,Math.round((total-Math.abs(m))/2));
  let hi=lo+Math.abs(m);
  // 1 is not a reachable football score
  if(lo===1)lo=(rng.r()<0.5?0:2);
  if(hi===1)hi=2;
  if(hi<=lo)hi=lo+1;
  if(hi===1)hi=2;
  m=(m>0?1:-1)*(hi-lo);
  return m>0?[hi,lo,m]:[lo,hi,m];
}
function eloUpdate(eW,eL,mAbs,winHome,neutral){
  const hfa=neutral?0:HFA;
  const diff=winHome?(eW+hfa-eL):(eW-eL-hfa);
  const exp=1/(1+Math.pow(10,-diff/400));
  const mov=Math.log(mAbs+1)*(2.2/(0.001*diff+2.2));
  return K*mov*(1-exp);
}

/* ============ talent ============ */
const INJ_HAZARD=0.085,QB_SHARE=0.18,DEV_SD=4.2,AR_SD=5,AR_DECAY=0.8,
      COLLAPSE_P=0.018,BREAKOUT_P=0.018;
const BODY=["OL","WR1","RB1","EDGE","CB1","LB","TE","S"];
function iscale(r){return 0.70+0.45*Math.max(0,Math.min(1,(r-1150)/900))}

class Talent{
  constructor(rng,base,roster){
    this.rng=rng;this.base=Object.assign({},base);
    this.roster=roster||null;
    this.slope={};this.ar={};this.inj={};this.log={};
    NAMES.forEach(t=>{this.slope[t]=rng.gauss(0,DEV_SD);this.ar[t]=0;
      this.inj[t]=[];this.log[t]=[]});
  }
  eff(t,w){
    let s=0; this.inj[t].forEach(e=>{if(e.w>0)s+=e.m});
    return this.base[t]+this.slope[t]*w+this.ar[t]+s;
  }
  active(t){return this.inj[t].filter(e=>e.w>0)}
  advance(w){
    const r=this.rng;
    NAMES.forEach(t=>{
      this.inj[t].forEach(e=>e.w--);
      this.inj[t].filter(e=>e.w<=0).forEach(e=>
        this.log[t].push({wk:w,kind:"back",what:e.k,mag:0}));
      this.inj[t]=this.inj[t].filter(e=>e.w>0);
      const sc=iscale(this.base[t]);
      if(r.r()<INJ_HAZARD){
        if(this.roster){
          // pick a starter, weighted toward the positions that take hits
          const idx=pickInjuredPos(r);
          const pl=this.roster[t][idx];
          if(!this.inj[t].some(e=>e.idx===idx)){
            const sev=r.r();
            const wk=sev<0.12?14:r.pick([1,2,2,3,4,5,6]);
            const m=injuryCost(this.roster[t],idx)*r.range(1.05,2.1);
            this.inj[t].push({m:m,w:wk,k:pl.p,idx:idx,who:pl.n,rating:pl.r});
            this.log[t].push({wk:w,kind:"injury",what:pl.p,who:pl.n,
                              mag:Math.round(m),weeks:wk});
          }
        }else{
          let m,wk,k;
          if(r.r()<QB_SHARE){m=-r.range(85,190)*sc;wk=r.pick([2,3,4,5,6,14]);k="QB1"}
          else{m=-r.range(20,75)*sc;wk=r.pick([1,2,2,3,4,6]);k=r.pick(BODY)}
          this.inj[t].push({m:m,w:wk,k:k});
          this.log[t].push({wk:w,kind:"injury",what:k,mag:Math.round(m),weeks:wk});
        }
      }
      if(r.r()<COLLAPSE_P){const d=-r.range(40,110)*sc;this.base[t]+=d;
        this.log[t].push({wk:w,kind:"collapse",what:"locker room",mag:Math.round(d)})}
      else if(r.r()<BREAKOUT_P){const d=r.range(35,95)*sc;this.base[t]+=d;
        this.log[t].push({wk:w,kind:"breakout",what:"scheme unlock",mag:Math.round(d)})}
      this.ar[t]=this.ar[t]*AR_DECAY+r.gauss(0,AR_SD);
    });
  }
}

/* ============ poll ============ */
const INERTIA=0.82,ELO_PULL=0.18,L_UNR=-52,L_RNK=-22,L_T10=-9,
      W_T10=48,W_RNK=26,W_UNR=4,BLOWOUT=10,IDLE=-3;
/* Losses are the first thing voters sort on. A two-loss team has to be a great
   deal better regarded to stay ahead of an unbeaten one. */
const LOSS_TIER=100;
class Poll{
  constructor(pre){this.s=Object.assign({},pre);this.L={};NAMES.forEach(t=>this.L[t]=0)}
  eff(t){return this.s[t]-(this.L[t]||0)*LOSS_TIER}
  order(){return NAMES.slice().sort((a,b)=>this.eff(b)-this.eff(a))}
  rankMap(){const o=this.order(),m={};o.forEach((t,i)=>m[t]=i+1);return m}
  update(res,elo){
    const prev=this.rankMap(), played=new Set(), d={};
    NAMES.forEach(t=>d[t]=0);
    res.forEach(r=>{
      const w=r.winner,l=r.loser,m=r.margin;
      this.L[l]=(this.L[l]||0)+1;
      played.add(w);played.add(l);
      const lr=prev[l]||999, wr=prev[w]||999;
      if(wr<=25||lr<=25){
        d[w]+= lr<=10?W_T10 : lr<=25?W_RNK : W_UNR;
        if(m>=21&&lr<=25)d[w]+=BLOWOUT;
      } else d[w]+=W_UNR;
      d[l]+= wr<=10?L_T10 : wr<=25?L_RNK : L_UNR;
      if(m>=21)d[l]-=8;
    });
    NAMES.forEach(t=>{
      this.s[t]=this.s[t]*INERTIA+(1-INERTIA)*this.s[t]
                +ELO_PULL*(elo[t]-this.s[t])+d[t]+(played.has(t)?0:IDLE);
    });
    const winners=new Set(res.map(r=>r.winner));
    const nr=this.rankMap();
    winners.forEach(t=>{
      if((prev[t]||999)<=25 && (nr[t]||999)>prev[t]){
        const o=this.order(), ref=o[prev[t]-1];
        if(ref&&ref!==t)this.s[t]=this.eff(ref)+(this.L[t]||0)*LOSS_TIER+0.5;
      }
    });
    return this.rankMap();
  }
}

/* ============ coaches ============ */
const FIRST=["Mike","Dave","Chris","Brian","Kevin","Jim","Tom","Matt","Scott","Ryan",
"Marcus","Jalen","Andre","Terrance","Luis","Miguel","Sean","Pat","Dan","Greg","Curt",
"Lance","Wes","Hakeem","Devon","Rashad","Trent","Cole","Brady","Nate","Emmanuel","Kirk",
"Josh","Barry","Hugh","Lincoln","Deion","Willie","Herman","Vance","Bronco","Kalani"];
const LAST=["Whitaker","Bowden","Delgado","Okafor","Hargrove","Castellano","Boone","Mueller",
"Sandoval","Petrino","Kiffin","Vasquez","Ferrell","Njoku","Sutherland","Barclay","Rossi",
"Hollins","Amaya","Kowalski","Reeves","Chatman","Okoye","Vandiver","Prescott","Blackmon",
"Mahoney","Salazar","Tuiasosopo","Ferentz","Lindgren","Abara","Doucet","Yarborough",
"Ellsworth","Cormier","Nkemdiche","Stallings","Renfro","Pelini","Cristobal","Satterfield"];

let COACH_ID=1;
function newCoach(rng,prestige){
  // better programs attract better coaches
  const tier=Math.max(0,Math.min(1,(prestige-1150)/900));
  const q=rng.gauss(-24+tier*52, 26);
  return {id:COACH_ID++, n:rng.pick(FIRST)+" "+rng.pick(LAST),
          q:Math.round(Math.max(-58,Math.min(68,q))), t:0, hired:true,
          w:0,l:0,titles:0,confs:0,fired:0,stops:[]};
}

/* Roll a season's results into every coach's career. */
function recordCoaches(u,rec,champion,confChamps,year){
  u.coachLog=u.coachLog||{};
  NAMES.forEach(t=>{
    const c=u.coach[t]; if(!c)return;
    if(c.w===undefined){c.w=0;c.l=0;c.titles=0;c.confs=0;c.fired=0;c.stops=[]}
    if(!c.stops.length||c.stops[c.stops.length-1].team!==t)
      c.stops.push({team:t,from:year,to:year,w:0,l:0,titles:0});
    const st=c.stops[c.stops.length-1];
    c.w+=rec[t][0]; c.l+=rec[t][1];
    st.w+=rec[t][0]; st.l+=rec[t][1]; st.to=year;
    if(champion===t){c.titles++; st.titles++}
    if(confChamps&&Object.values(confChamps).indexOf(t)>=0)c.confs++;
  });
}

/* Snapshot of everyone currently employed, for browsing. */
function coachTable(u){
  const out=[];
  NAMES.forEach(t=>{
    const c=u.coach[t]; if(!c)return;
    out.push({team:t,n:c.n,q:c.q,t:c.t,you:!!c.you,
      w:c.w||0,l:c.l||0,titles:c.titles||0,confs:c.confs||0,
      stops:(c.stops||[]).slice()});
  });
  return out;
}

function coachGrade(q){
  if(q>=38)return "elite";
  if(q>=18)return "strong";
  if(q>=-5)return "solid";
  if(q>=-25)return "shaky";
  return "overmatched";
}

/* ============ coordinators ============ */
/* Two assistants per program. They shift the team on the field and shape how
   their side of the ball develops — and the good ones get poached. */
const OFF_SHARE=0.61, DEF_SHARE=0.39;      // matches the positional weights
const STAFF_ELO=0.62;                      // Elo per point of coordinator quality

const OC_STYLE=["Air raid","Pro-style","Spread option","Run-heavy","RPO"];
const DC_STYLE=["3-4 attacking","4-2-5 nickel","Bend-don't-break","Blitz-heavy","Cover 3"];

function newCoordinator(rng,prestige,side,repBonus){
  const tier=Math.max(0,Math.min(1,(prestige-1150)/900));
  const q=rng.gauss(-20+tier*44+(repBonus||0), 24);
  return {n:rng.pick(FIRST)+" "+rng.pick(LAST),
          q:Math.round(Math.max(-52,Math.min(62,q))), t:0,
          s:rng.pick(side==="oc"?OC_STYLE:DC_STYLE)};
}

function staffElo(u,t){
  if(!u.oc||!u.dc||!u.oc[t]||!u.dc[t])return 0;
  return (u.oc[t].q*OFF_SHARE + u.dc[t].q*DEF_SHARE)*STAFF_ELO;
}

function coordGrade(q){
  if(q>=40)return "one of the best in the country";
  if(q>=20)return "highly regarded";
  if(q>=2)return "solid";
  if(q>=-20)return "unproven";
  return "in over his head";
}

function coordCandidates(rng,prestige,side,rep){
  return [0,1,2].map(()=>{
    const c=newCoordinator(rng,prestige,side,(rep||0)*0.22);
    c.grade=coordGrade(c.q+rng.gauss(0,11));    // scouting is imperfect here too
    return c;
  });
}

/* ============ decisions ============ */
const ARCHETYPES=[
 {k:"proven", l:"Proven winner",  bump:16, sd:16,
  d:"Has won at this level before. Expensive, and the expectations arrive with him."},
 {k:"riser",  l:"Rising coordinator", bump:2, sd:36,
  d:"Hottest name on the market. Could be the next great one, could be a coordinator forever."},
 {k:"builder",l:"Program builder", bump:-4, sd:19, rec:9,
  d:"Wins on the recruiting trail before he wins on Saturdays. Slow burn, high floor."},
 {k:"retread",l:"Veteran retread", bump:-7, sd:11,
  d:"Been fired twice. Knows exactly what he is, and so does everyone else."}
];

function coachCandidates(rng,prestige){
  const tier=Math.max(0,Math.min(1,(prestige-1150)/900));
  const pool=rng.shuffle(ARCHETYPES.slice()).slice(0,3);
  return pool.map(A=>{
    const q=Math.round(Math.max(-58,Math.min(68,
      rng.gauss(-24+tier*52+A.bump, A.sd))));
    // scouting is imperfect: you see a noisy read, not the number
    const seen=q+rng.gauss(0,13);
    return {n:rng.pick(FIRST)+" "+rng.pick(LAST), q:q, arch:A.k, al:A.l, d:A.d,
            rec:A.rec||0, grade:coachGrade(seen)};
  });
}

const RECRUIT_FOCUS={
  balanced:{l:"Best available", d:"Take the best player on the board at every spot.",
            pos:null, r:0, pot:0},
  trenches:{l:"Win the trenches", d:"Load up on the lines. Slower payoff, sturdier teams.",
            pos:["OT","EDGE","DT"], r:8, pot:0},
  skill:   {l:"Skill players",   d:"Quarterbacks and playmakers. Explosive, and streakier.",
            pos:["QB","RB","WR","WR2"], r:5, pot:0},
  upside:  {l:"Chase upside",    d:"Raw prospects with ceilings. Rough now, dangerous in two years.",
            pos:null, r:-5, pot:14, dev:3.4}
};

const PHILOSOPHY={
  win_now: {l:"Win now",  d:"Veterans get every rep. Better this year, thinner next.",
            elo:44, dev:-3.0},
  balanced:{l:"Balanced", d:"Play the best guy at every spot.", elo:0, dev:0},
  build:   {l:"Build",    d:"Young players play through mistakes. Costs you this year.",
            elo:-38, dev:3.2}
};

/* ============ program budget ============ */
/* A fixed pool each offseason. Everything you fund is something you didn't. */
const BUCKETS=[
 {k:"recruit",  l:"Recruiting",   d:"Better players sign. Pays off in two or three years."},
 {k:"develop",  l:"Development",  d:"Strength staff and position coaches. Your current roster grows faster."},
 {k:"facility", l:"Facilities",   d:"Permanent. Compounds quietly for as long as you're here."},
 {k:"retention",l:"Retention/NIL",d:"Keep your stars from leaving early for the draft."}
];

function budgetPool(u,t,wins){
  const base=6+Math.round((u.program[t]-1150)/150);
  const success=wins>=11?3:wins>=9?2:wins>=7?1:0;
  const fac=Math.floor((u.facility&&u.facility[t]?u.facility[t]:0)/22);
  return Math.max(6,Math.min(20,base+success+fac));
}

function applyBudgetRead(alloc){
  return {recruitBonus:(alloc.recruit||0)*0.30,
          devBonus:(alloc.develop||0)*0.46,
          retention:Math.min(0.62,(alloc.retention||0)*0.055)};
}

function applyBudget(u,t,alloc){
  u.facility=u.facility||{};
  u.facility[t]=(u.facility[t]||0)+(alloc.facility||0)*2.4;
  return {
    recruitBonus:(alloc.recruit||0)*0.30,
    devBonus:(alloc.develop||0)*0.46,
    retention:Math.min(0.62,(alloc.retention||0)*0.055),
    facility:Math.min(520,u.facility[t])
  };
}

/* ============ your coaching career ============ */
/* You are the head coach, not the athletic director. You get hired, you get
   fired, and your record follows you to the next job. */
function repGrade(r){
  if(r>=46)return "a national name";
  if(r>=26)return "a hot commodity";
  if(r>=8)return "well regarded";
  if(r>=-10)return "unproven";
  if(r>=-28)return "a hard sell";
  return "radioactive";
}

/* Which jobs would take you, given what you've done. */
function jobMarket(u,rng,rep,openings,current){
  const ceiling=1300+Math.max(0,rep+40)*10;      // reputation opens bigger doors
  const floor=Math.max(1120,ceiling-620);
  const opts=openings.filter(t=>t!==current)
    .filter(t=>u.program[t]<=ceiling&&u.program[t]>=floor)
    .sort((a,b)=>u.program[b]-u.program[a]);
  const picked=[];
  if(opts.length)picked.push(opts[0]);
  if(opts.length>2)picked.push(opts[Math.floor(opts.length/2)]);
  if(opts.length>1)picked.push(opts[opts.length-1]);
  return [...new Set(picked)].slice(0,3);
}

/* Bigger programs come calling when you overperform at a small one. */
function poachOffers(u,rng,rep,openings,current){
  if(rep<18)return [];
  const mine=u.program[current];
  return openings.filter(t=>t!==current&&u.program[t]>mine+150
    &&u.program[t]<=1240+Math.max(0,rep+30)*12)
    .sort((a,b)=>u.program[b]-u.program[a]).slice(0,2);
}

function repDelta(wins,losses,expWins,program,titles){
  const wp=wins/Math.max(1,wins+losses);
  let d=(wins-expWins)*1.7;
  if(titles.natl)d+=22;
  else if(titles.playoff)d+=8;
  else if(titles.conf)d+=6;
  if(wp<0.34&&wins<expWins)d-=6;   // only if you also missed the mark
  // winning at a small program counts for more
  d*= program<1500?1.25 : program>1850?0.82 : 1.0;
  return d;
}

/* ============ program continuity ============ */
const COACH_ONFIELD=0.55,  // how much coach quality shows up on the field
      COACH_BUILD=0.34,    // how much it compounds into the program each year
      ROOKIE_DIP=-22;
const ROSTER_NOISE=48;
const CARRY=0.45,CHURN_SD=95,RECRUIT=0.16,PROG_NOISE=22,
      P_FLOOR=1120,P_CEIL=2010,HOT_SEAT=0.42,COACH_SD=62,COACH_DIP=-18,PERCEPT_N=34;

function newUniverse(seed){
  const rng=new RNG(seed);
  const u={seed:seed,year:2026,program:{},perceived:{},trueBase:{},
           tenure:{},bad:{},history:[],rng:seed};
  u.coach={}; u.roster={}; u.oc={}; u.dc={}; u.conf={};
  u.nextRealign=2026+4+rng.int(4);
  LEAGUE.teams.forEach(t=>u.conf[t[0]]=t[2]);
  LEAGUE.teams.forEach(([n,e])=>{
    u.program[n]=e; u.perceived[n]=e;
    u.roster[n]=makeRoster(rng,e);
    u.oc[n]=newCoordinator(rng,e,"oc"); u.dc[n]=newCoordinator(rng,e,"dc");
    u.trueBase[n]=rosterElo(u.roster[n])+rng.gauss(0,26);
    u.tenure[n]=1+rng.int(6); u.bad[n]=0;
    const c=newCoach(rng,e); c.t=u.tenure[n]; c.hired=false;
    u.coach[n]=c;
  });
  u._rngState=seed*7919+13;
  return u;
}

function seatHeat(u,rec,elo,t){
  // expectation is the program's own baseline; heat is falling short of it repeatedly
  const w=rec[t][0], l=rec[t][1], wp=w/Math.max(1,w+l);
    const shortfall=(u.program[t]-elo[t])/45;
  let heat=u.bad[t]*1.4 + Math.max(0,shortfall) + (wp<HOT_SEAT?1.2:0);
  if(u.coach[t]&&u.coach[t].t<=1)heat-=1.6;         // rookies get a grace year
  if(u.coach[t]&&u.coach[t].q>=30)heat-=0.6;
  return heat;
}

/* Offseason runs in two acts so the player can decide in between.
   Act 1: the coaching carousel. Act 2: rosters, recruiting, development. */
function offseasonCoaching(u,rng,rec,elo,userTeam){
  const fired=[],hires=[],poached=[];
  if(!u.coach){u.coach={};NAMES.forEach(t=>{u.coach[t]=newCoach(rng,u.program[t]);u.coach[t].hired=false})}

  NAMES.forEach(t=>{
    const wp=rec[t][0]/Math.max(1,rec[t][0]+rec[t][1]);
    u.bad[t]= wp<HOT_SEAT ? u.bad[t]+1 : 0;
    const heat=seatHeat(u,rec,elo,t);
    const change=(heat>=4.6)||(wp<0.25&&u.coach[t].t>=2);
    if(change&&rng.r()<0.82){fired.push(t);u.bad[t]=0}
  });

  const openings=fired.slice().sort((a,b)=>u.program[b]-u.program[a]);
  openings.forEach(job=>{
    if(rng.r()>0.42)return;
    const cands=NAMES.filter(t=>fired.indexOf(t)<0 && u.coach[t].q>=22
      && u.program[t] < u.program[job]-140 && u.coach[t].t>=2
      && rec[t][0]>=rec[t][1]);
    if(!cands.length)return;
    cands.sort((a,b)=>u.coach[b].q-u.coach[a].q);
    const from=cands[0], c=u.coach[from];
    poached.push({to:job,from:from,name:c.n,q:c.q});
    u.coach[job]=Object.assign({},c,{t:0,hired:true});   // his record travels with him
    u.coach[from]=newCoach(rng,u.program[from]);
    hires.push({team:from,name:u.coach[from].n,q:u.coach[from].q,reason:"replacing "+c.n});
    fired.splice(fired.indexOf(job),1);
    if(fired.indexOf(from)<0)fired.push(from);
  });

  // a hot coordinator can be the man a program hires
  const coordMoves=[];
  fired.slice().forEach(job=>{
    if(job===userTeam)return;
    if(rng.r()>0.30)return;
    const pool=NAMES.filter(t=>fired.indexOf(t)<0 && u.oc[t] && u.oc[t].q>=26
      && u.program[t] < u.program[job]+90);
    if(!pool.length)return;
    const from=rng.pick(pool);
    const side=(u.dc[from]&&u.dc[from].q>u.oc[from].q)?"dc":"oc";
    const co=side==="oc"?u.oc[from]:u.dc[from];
    if(!co||co.q<26)return;
    coordMoves.push({name:co.n,from:from,to:job,side:side});
    u.coach[job]={id:COACH_ID++,n:co.n,q:Math.round(co.q*0.85),t:0,hired:true,
                  w:0,l:0,titles:0,confs:0,fired:0,stops:[]};
    const fresh=newCoordinator(rng,u.program[from],side);
    if(side==="oc")u.oc[from]=fresh; else u.dc[from]=fresh;
    fired.splice(fired.indexOf(job),1);
  });

  const userOpen=fired.indexOf(userTeam)>=0;
  const openJobs=fired.slice();
  const candidates=userOpen?coachCandidates(rng,u.program[userTeam]):null;

  fired.forEach(t=>{
    if(t===userTeam)return;                       // that's your job, not an AI hire
    if(u.coach[t].hired&&u.coach[t].t===0)return;
    const old=u.coach[t].n;
    u.coach[t]=newCoach(rng,u.program[t]);
    hires.push({team:t,name:u.coach[t].n,q:u.coach[t].q,reason:"replacing "+old});
  });

  // ordinary staff churn everywhere else
  const staffOpen={oc:false,dc:false};
  NAMES.forEach(t=>{
    ["oc","dc"].forEach(side=>{
      const st=side==="oc"?u.oc:u.dc;
      if(!st[t]){st[t]=newCoordinator(rng,u.program[t],side);return}
      st[t].t=(st[t].t||0)+1;
      const leaves = st[t].q>=34 ? rng.r()<0.20 : (st[t].q<=-26 ? rng.r()<0.30 : rng.r()<0.09);
      if(leaves){
        if(t===userTeam){staffOpen[side]=true;}
        else st[t]=newCoordinator(rng,u.program[t],side);
      }
    });
  });

  return {fired:fired,hires:hires,poached:poached,userOpen:userOpen,
          candidates:candidates,openJobs:openJobs,
          coordMoves:coordMoves,staffOpen:staffOpen};
}

function offseasonRosters(u,rng,healthy,elo,rec,choices){
  /* One human or several: each coached program gets its own choices. */
  const U_CH = choices.users || (choices.userTeam?{[choices.userTeam]:choices}:{});
  const chFor = t=>U_CH[t]||null;
  const leavers={};
  choices=choices||{};
  const risers=[],fallers=[],churn={};
  const ut=choices.userTeam;

  if(ut&&choices.coach){
    const c=choices.coach;
    u.coach[ut]={n:c.n,q:c.q,t:0,hired:true,arch:c.arch,rec:c.rec||0};
  }

  NAMES.forEach(t=>{
    const before=u.program[t];
    const c=u.coach[t];
    u.program[t]+=RECRUIT*(elo[t]-u.program[t])
                 +c.q*COACH_BUILD
                 +rng.gauss(0,PROG_NOISE*iscale(u.program[t]));
    u.program[t]=Math.max(P_FLOOR,Math.min(P_CEIL,u.program[t]));
    c.t++;
    const ch=chFor(t);
    const focus=(ch&&ch.recruit)?ch.recruit:"balanced";
    let devMod=(ch&&ch.phil&&PHILOSOPHY[ch.phil])?PHILOSOPHY[ch.phil].dev:0;
    let bud=null;
    if(ch&&ch.budget){
      bud=applyBudget(u,t,ch.budget);
      devMod+=bud.devBonus;
      u.program[t]+=bud.facility*0.20;      // facilities lift the program itself
    }
    const ocq=(u.oc&&u.oc[t])?u.oc[t].q:0, dcq=(u.dc&&u.dc[t])?u.dc[t].q:0;
    churn[t]=developRoster(u,t,rng,RECRUIT_FOCUS[focus],devMod,bud,
                           ch?ch.featured:null,
                           {oc:ocq*0.030, dc:dcq*0.030});
    leavers[t]=churn[t].leaving;
    u.trueBase[t]=rosterElo(u.roster[t])
                 +(c.t<=1?ROOKIE_DIP:0)
                 +rng.gauss(0,ROSTER_NOISE);
    u.perceived[t]=0.58*elo[t]+0.42*u.program[t]+rng.gauss(0,PERCEPT_N);
    const d=u.program[t]-before;
    if(d>35)risers.push([t,Math.round(d)]);
    if(d<-35)fallers.push([t,Math.round(d)]);
  });

  /* Draft night: everyone who left the college game gets sorted out. */
  const draftResult=runDraft(u,rng,u.year,leavers);
  recordAlumni(u,u.year,draftResult.pool);

  /* Every program signs a class each year, whether or not a freshman starts.
     Quality tracks program pull, the coach's recruiting, and your stated focus. */
  u.classAvg=u.classAvg||{};
  const incoming=[];
  NAMES.forEach(t=>{
    const c=u.coach[t];
    const ch2=chFor(t);
    const focus=(ch2&&ch2.recruit)?RECRUIT_FOCUS[ch2.recruit]:RECRUIT_FOCUS.balanced;
    const q=eloToRating(u.program[t])
           +c.q*0.055 +(c.rec||0)*0.55
           +(focus.r||0)*0.45 +(focus.pot||0)*0.12
           +((ch2&&ch2.budget)?applyBudgetRead(ch2.budget).recruitBonus*0.6:0)
           +((ch2&&u.pipeline)?Math.min(4.5,u.pipeline*1.5):0)
           +rng.gauss(0,2.6);
    const signed=6+Math.round(rng.range(0,3));
    incoming.push([t,q,signed]);
    // classes compound: what you sign now shapes who is available later
    const prev=u.classAvg[t]!==undefined?u.classAvg[t]:q;
    u.classAvg[t]=prev*0.62+q*0.38;
  });
  incoming.sort((a,b)=>b[1]-a[1]);
  const classes={};
  incoming.forEach(([t,av,n],i)=>{
    classes[t]={avg:Math.round(av),n:n,rank:i+1,of:incoming.length,
                l:classLabel(i+1,incoming.length)};
  });
  const early={};
  NAMES.forEach(t=>{const x=churn[t].leaving.filter(y=>y.early); if(x.length)early[t]=x});

  if(ut&&choices.phil)u.phil=choices.phil;
  u.year++;
  let realigned=[];
  if(u.nextRealign&&u.year>=u.nextRealign){
    realigned=realign(u,rng,u.year);
    u.nextRealign=u.year+4+rng.int(4);
  }
  risers.sort((a,b)=>b[1]-a[1]); fallers.sort((a,b)=>a[1]-b[1]);
  return {risers:risers.slice(0,5),fallers:fallers.slice(0,5),
          churn:churn,classes:classes,early:early,realigned:realigned,
          draft:draftResult};
}

