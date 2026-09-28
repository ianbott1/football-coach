/* ============ offseason: pro football ============ */
/* Players have ages and contracts. Each offseason, in order:
     1. expiring contracts are re-signed or let go (you choose for your team)
     2. everyone ages: better until about 27, flat, then decline after 30
        (quarterbacks three years later, running backs two years sooner)
     3. some retire
     4. the draft, worst record first, playoff teams by how far they went
     5. free agency, under a hard salary cap
     6. empty spots are filled with replacement-level players
   Salaries are in millions and cover the twenty players the sim tracks. */
const NFL_CAP=104;                          // the NHL's 2026-27 cap, $104M: a true hard cap
/* no exceptions in hockey: re-signing your own players fits under the cap too */
const TAX_LINE=NFL_CAP;
/* How well run a franchise is, from its slow-moving strength: good
   organisations develop players better, scout better, and free agents take
   a little less to join them. Without it the draft and free agency flatten
   the league within a few years. */
// centred on this league's own average franchise (pro football's was 1690)
const orgEdge=(u,t)=>Math.max(-1.5,Math.min(1.5,(u.program[t]-1500)/(+((typeof process!=="undefined"&&process.env&&process.env.NBA_OE)||100))));
const AGE_SHIFT={};                           // every position ages alike
const POS_PAY={};                             // and is paid alike
const MAX_DEAL=Math.round(NFL_CAP*0.20*10)/10; // a max contract: 20% of the cap ($20.8M)

function nflAsk(r,pos,age){
  const x=Math.max(0,(r-55)/35);
  // scaled to this league's ratings: a typical starter (~64) about $15M, a
  // star (77+) the max, so payrolls sit near the cap and it binds
  let s=Math.min(MAX_DEAL,(0.85+40*Math.pow(x,1.5))*(POS_PAY[pos]||1));   // $850K up to the max; payrolls between the floor and the cap
  const a=age-(AGE_SHIFT[pos]||0);
  if(a>=31)s*=0.78; else if(a>=29)s*=0.9;
  return Math.round(Math.max(0.85,s)*100)/100;
}
function nflYears(age,pos){const a=age-(AGE_SHIFT[pos]||0); return a<=26?4:a<=29?3:a<=31?2:1}
function payroll(roster){return roster.reduce((s,p)=>s+(p&&p.k?p.k.sal:0),0)}
const ROOKIE_ROOM=2;                        // what re-signing leaves free for the draft class
/* Which expiring players a team keeps: the best first, while they fit. Worth
   keeping means a starter rated 66+, or a cheap useful backup, not past 32. */
function nflResignPlan(R){
  const exp=[], keep={}; let pay=0;
  R.forEach((p,i)=>{if(!p)return;
    if(p.k.yrs<=1)exp.push(i); else pay+=p.k.sal});
  exp.sort((a,b)=>R[b].r-R[a].r).forEach(i=>{
    const p=R[i], ask=nflAsk(p.r,p.p,p.age+1);
    // teams keep their useful players (the pros' bar was 66 for a starter)
    const worth=(i<POS.length?p.r>=62:p.r>=60&&ask<=12)&&p.age<=33;
    keep[i]=worth&&pay+ask<=TAX_LINE-ROOKIE_ROOM;      // your own players: up to the tax line
    if(keep[i])pay+=ask;
  });
  return keep;
}

function nflPlayer(rng,target,age,posIdx){
  const P=POS[posIdx].p, a=age-(AGE_SHIFT[P]||0);
  // young players sit below the level they'll reach; veterans at or past it
  const ageAdj=a<=23?-5:a<=25?-2:a<=29?1:a<=31?0:-3;
  const r=Math.round(Math.max(40,Math.min(97,rng.gauss(target+ageAdj,5))));
  const room=a<=23?rng.gauss(9,4):a<=25?rng.gauss(5,3):a<=27?rng.gauss(2,1.5):0;
  const pot=Math.round(Math.max(r,Math.min(99,r+room)));
  return {n:playerName(rng),p:P,i:posIdx,c:age,age:age,r:r,pot:pot,hz:0,prod:0,st:0,
          k:{sal:nflAsk(r,P,age),yrs:1+rng.int(nflYears(age,P))}};
}

function nflRoster(rng,programElo){
  const target=eloToRating(programElo);
  const ageBag=[23,24,25,26,26,27,27,28,29,30,31,32];
  const r=POS.map((_,i)=>nflPlayer(rng,target,rng.pick(ageBag),i));
  POS.forEach((_,i)=>{
    const b=nflPlayer(rng,target-rng.range(5,13),rng.pick([22,23,24,25,28,31,33]),i);
    b.r=Math.min(b.r,r[i].r); b.k.sal=nflAsk(b.r,b.p,b.age);
    r.push(b);
  });
  // nobody starts over the cap
  const pay=payroll(r);
  if(pay>NFL_CAP*0.94){const f=NFL_CAP*0.94/pay; r.forEach(p=>p.k.sal=Math.round(p.k.sal*f*10)/10)}
  return r;
}

/* the draft: worst regular season first; playoff teams after, by the round
   they went out in; the champion picks last */
/* The draft order: the sixteen teams that missed the playoffs draw for the
   top two picks (weighted to the worst records; no team moves up more than
   ten places), the rest of them follow worst first, then the playoff teams,
   worst record first. */
const LOTTERY_ODDS=[185,135,115,95,85,75,65,60,50,35,30,25,20,15,5,5];      // per thousand
function nflDraftOrder(rec,elo,rng){
  const S2=(typeof SEA!=="undefined"&&SEA&&SEA.field)?SEA:null;
  const pts=t=>S2&&S2.pts?S2.pts(t):rec[t][0]*2;
  const worstFirst=(a,b)=>pts(a)-pts(b)||elo[a]-elo[b];
  const inPO=t=>S2&&S2.field.indexOf(t)>=0;
  const lot=NAMES.filter(t=>!inPO(t)).sort(worstFirst), po=NAMES.filter(inPO).sort(worstFirst);
  if(!rng||lot.length!==16)return lot.concat(po);
  const order=lot.slice();
  for(let k=0;k<2;k++){
    const w=LOTTERY_ODDS.slice(0,order.length).map((x,i)=>i>=k?x:0);
    let x=rng.r()*w.reduce((a,b)=>a+b,0), i=0; while(x>w[i]){x-=w[i];i++}
    const to=Math.max(k,i-10);                         // at most ten places up
    const t=order.splice(i,1)[0]; order.splice(to,0,t);
  }
  return order.concat(po);
}

function nflProspects(rng,n){
  const out=[];
  for(let i=0;i<n;i++){
    const q=i/n;
    const posIdx=rng.int(POS.length);
    const age=18+rng.int(2);                    // drafted at 18 or 19
    // draftees: well below NHL level at 18, with ceilings
    const r=Math.round(Math.max(42,Math.min(78,rng.gauss(52-11*Math.pow(q,0.7),3.5))));
    const pot=Math.round(Math.min(99,r+Math.max(3,rng.gauss(15-6*q,5))));
    out.push({n:playerName(rng),p:POS[posIdx].p,i:posIdx,c:age,age:age,r:r,pot:pot,
              hz:0,prod:0,st:0,from:rng.pick(LEAGUE.draftTeams)});
  }
  return out;
}
/* The coming draft class, made when the offseason opens so a coach can see
   it and build a board. Seeded by the year, so reopening the screen or
   reloading a save shows the same class. sr/spot are a scout's estimates:
   how far off depends on how well run the franchise is (as for the
   computer's own picks). */
function nflDraftClass(u,team){
  if(!u.draftClass||u.draftClass.year!==u.year){
    const rng=new RNG((((u.seed||0)*2654435761)^(u.year*7919)^0x5bd1e995)>>>0);
    const list=nflProspects(rng,2*32); list.forEach((p,i)=>p.pid=i);
    u.draftClass={year:u.year,list:list};
  }
  const C=u.draftClass;
  if(team&&C.scoutedFor!==team){
    const noise=Math.max(0.8,2.6-orgEdge(u,team)*1.2);
    let th=0; for(let i=0;i<team.length;i++)th=(th*31+team.charCodeAt(i))|0;
    const r2=new RNG((((u.seed||0)*40503)^(u.year*104729)^th)>>>0);
    C.list.forEach(p=>{p.sr=Math.round(p.r+r2.gauss(0,noise)); p.spot=Math.round(Math.max(p.sr,p.pot+r2.gauss(0,noise*1.6)))});
    C.scoutedFor=team;
  }
  return C;
}
/* Who will be a free agent: the players other teams' re-signing rules won't
   keep (their own choice, for a person coaching one). Ratings are this
   season's; players age before free agency opens. key identifies a player
   across the offseason. */
const faKey=(team,p)=>team+"|"+p.n+"|"+p.p;
function nflFreeAgentPreview(u,myTeam,users){
  const out=[];
  NAMES.forEach(t=>{
    if(t===myTeam)return;
    const R=u.roster[t], plan=(users&&users[t]&&users[t].resign)||nflResignPlan(R);
    R.forEach((p,i)=>{ if(!p||p.k.yrs>1||plan[i])return;
      if(p.r<58||p.age>=33)return;                  // likely to retire or go unsigned
      out.push({key:faKey(t,p),n:p.n,p:p.p,team:t,age:p.age+1,r:p.r,pot:p.pot,
                ask:Math.round(nflAsk(p.r,p.p,p.age+1)*1.1*10)/10});
    });
  });
  return out.sort((a,b)=>(b.r+(b.pot-b.r)*0.3-b.age*0.2)-(a.r+(a.pot-a.r)*0.3-a.age*0.2));
}
/* ---- trades ----
   A player's worth to a front office: rating, some of his ceiling while he
   is young, less once he is past 29, and less the more he is paid. */
function tradeValue(p){
  const young=Math.max(0,27-p.age)/5;
  return p.r+(p.pot-p.r)*0.4*young-Math.max(0,p.age-29)*1.5-p.k.sal*0.25;
}
const tradeKey=(t,p)=>t+"|"+p.n+"|"+p.p;
/* Offers for one of your players under contract past this season: up to
   three teams each offer a player (also under contract) at one of your
   weakest spots, worth about the same, who helps them at the position they
   get, and leaves both of you under the cap. Deterministic, so the screen
   shows the same offers until something changes. */
function nflTradeOffers(u,myTeam,idx,humans){
  const R=u.roster[myTeam], give=R[idx]; if(!give||give.k.yrs<2)return [];
  const gv=tradeValue(give), myPay=payroll(R);
  // my weakest starting spots, by how far below the league's typical starter they are
  const need=POS.map((P,i)=>({i:i,gap:R[i]?R[i].r:0})).sort((a,b)=>a.gap-b.gap).slice(0,4).map(x=>x.i);
  const offers=[];
  NAMES.forEach(t=>{
    if(t===myTeam||(humans&&humans.indexOf(t)>=0))return;
    const T=u.roster[t], theirPay=payroll(T);
    // do they want him? he has to beat their starter or their backup at his spot
    const gi=POS.findIndex(P=>P.p===give.p);
    if(!(T[gi]&&give.r>T[BK(gi)].r+1))return;
    let best=null;
    T.forEach((q,j)=>{
      if(!q||q.k.yrs<2||need.indexOf(j%POS.length)<0)return;
      if(j<POS.length&&(!T[BK(j)]||T[BK(j)].r<q.r-8))return;   // they won't gut a spot
      const qv=tradeValue(q); if(qv<gv*0.88||qv>gv*1.08)return;
      if(myPay-give.k.sal+q.k.sal>TAX_LINE||theirPay-q.k.sal+give.k.sal>TAX_LINE)return;
      const fit=Math.abs(qv-gv)-(R[j%POS.length]?(q.r-R[j%POS.length].r)*0.5:0);
      if(!best||fit<best.fit)best={fit:fit,q:q,j:j};
    });
    if(best)offers.push({team:t,give:tradeKey(myTeam,give),get:tradeKey(t,best.q),
      n:best.q.n,p:best.q.p,r:best.q.r,pot:best.q.pot,age:best.q.age,sal:best.q.k.sal,yrs:best.q.k.yrs,fit:best.fit});
  });
  return offers.sort((a,b)=>a.fit-b.fit).slice(0,3);
}
/* carry out an agreed trade: find both players now (after aging), swap them */
function nflApplyTrade(u,myTeam,T,rep,leave,pool){
  const [tt]=T.get.split("|"), mine=u.roster[myTeam], theirs=u.roster[tt];
  const gi=mine.findIndex(p=>p&&tradeKey(myTeam,p)===T.give), qi=theirs?theirs.findIndex(p=>p&&tradeKey(tt,p)===T.get):-1;
  const [,gn,gp]=T.give.split("|"), [,qn,qp]=T.get.split("|");
  if(gi<0||qi<0){rep.trade[myTeam]={done:false,gave:gn,gp:gp,got:qn,qp:qp,with:tt,
      why:gi<0?gn+" retired before it could go through":qn+" retired before it could go through"};return}
  const give=mine[gi], get=theirs[qi];
  mine[gi]=null; theirs[qi]=null;
  // each lands where he fits; whoever drops off the end is released
  [[mine,get,myTeam],[theirs,give,tt]].forEach(([R,p,t])=>{
    p.yrsHere=0; p.joined=u.year+1; p.keep=true;
    const i=POS.findIndex(P=>P.p===p.p);
    if(!R[i]){R[i]=p} else if(!R[BK(i)]){ if(p.r>R[i].r){R[BK(i)]=R[i];R[i]=p}else R[BK(i)]=p }
    else { const out=nflPlace(R,p); if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r}); if(out.r>=58){out.from=t;pool.push(out)} else leave(t,out,"released")} }
  });
  rep.trade[myTeam]={done:true,gave:give.n,gp:give.p,got:get.n,qp:get.p,r:get.r,with:tt};
}
const rookieSal=o=>0.95;                     // entry-level deals, ~$950K

/* what a player adds at his spot: over the backup, or over the starter */
function nflGain(roster,p){
  const s=roster[p.i], b=roster[BK(p.i)], w=POS[p.i].w;
  const val=x=>x?x.r+(x.pot-x.r)*0.25:0;
  if(!s)return val(p)*w*3;
  if(val(p)>val(s))return (val(p)-val(s))*w*2+ (val(s)-val(b))*w;
  return Math.max(0,val(p)-val(b))*w;
}
/* put a player in: he starts or backs up by rating; whoever drops off is returned */
function nflPlace(roster,p){
  p.i=POS.findIndex(P=>P.p===p.p);
  const s=roster[p.i], b=roster[BK(p.i)];
  let out=null;
  if(!s){roster[p.i]=p}
  else if(p.r>s.r){out=b;roster[BK(p.i)]=s;roster[p.i]=p}
  else {out=b;roster[BK(p.i)]=p}
  return out;
}

function nflRun(u,rng,healthy,elo,rec,choices){
  const U_CH=choices.users||(choices.userTeam?{[choices.userTeam]:choices}:{});
  const chFor=t=>U_CH[t]||null, ut=choices.userTeam;
  if(ut&&choices.coach){const c=choices.coach;
    u.coach[ut]={n:c.n,q:c.q,t:0,hired:true,arch:c.arch,rec:c.rec||0}}
  const rep={resigned:{},released:{},retired:{},drafted:{},signed:{},filled:{}};
  NAMES.forEach(t=>{rep.resigned[t]=[];rep.released[t]=[];rep.retired[t]=[];
    rep.drafted[t]=[];rep.signed[t]=[];rep.filled[t]=[]});
  const pool=[];                                        // free agents
  const risers=[],fallers=[];
  u.alumni=u.alumni||{};
  const leave=(t,p,why)=>{
    u.alumni[t]=u.alumni[t]||[];
    u.alumni[t].push({n:p.n,p:p.p,from:p.joined||u.year-(p.yrsHere||1),to:u.year,
      peak:p.peak||p.r,yrs:p.yrsHere||1,draft:p.draft||null,
      line:LEAGUE.records.alumniLine({p:p.p,car:p.car,yrs:p.yrsHere||1}),why:why,
      // career totals with the franchise, for its leaders (six numbers)
      car:p.car?{goals:p.car.goals||0,ast:p.car.ast||0,pts:p.car.pts||0,sog:p.car.sog||0,sv:p.car.sv||0,so:p.car.so||0}:null});
    if(u.alumni[t].length>40){u.alumni[t].sort((a,b)=>b.peak-a.peak);u.alumni[t].length=40}
  };

  NAMES.forEach(t=>{
    const before=u.program[t], c=u.coach[t], R=u.roster[t], ch=chFor(t);
    const plan=(ch&&ch.resign)?ch.resign:nflResignPlan(R);
    // the organisation moves slowly: results nudge it, they don't define it
    u.program[t]+=0.05*(elo[t]-u.program[t])+c.q*COACH_BUILD*0.4+rng.gauss(0,9);
    u.program[t]=Math.max(1480,Math.min(1920,u.program[t]));
    c.t++;
    // 1. contracts that end now
    for(let i=0;i<R.length;i++){
      const p=R[i]; if(!p)continue;
      p.yrsHere=(p.yrsHere||0)+1;
      if(p.k.yrs>1){p.k.yrs--;continue}
      const ask={sal:nflAsk(p.r,p.p,p.age+1),yrs:nflYears(p.age+1,p.p)};
      const keep=!!plan[i];
      if(keep){p.k=ask;rep.resigned[t].push({n:p.n,p:p.p,r:p.r,sal:ask.sal,yrs:ask.yrs})}
      else{R[i]=null;rep.released[t].push({n:p.n,p:p.p,r:p.r,why:"expired"});
        if(p.r>=58&&p.age<=33){p.from=t;pool.push(p)} else leave(t,p,"released")}
    }
    // 2. aging
    let devMod=(ch&&ch.phil&&PHILOSOPHY[ch.phil])?PHILOSOPHY[ch.phil].dev*0.5:0;
    const ocq=(u.oc&&u.oc[t])?u.oc[t].q:0, dcq=(u.dc&&u.dc[t])?u.dc[t].q:0;
    R.forEach((p,i)=>{
      if(!p)return;
      p.age++; p.c=p.age;
      const a=p.age-(AGE_SHIFT[p.p]||0);
      const base=a<=22?3.4:a<=23?2.7:a<=24?1.9:a<=25?1.1:a<=26?0.4:a<=27?-0.2:a<=28?-0.8:a<=29?-1.5:a<=30?-2.3:a<=31?-3.3:a<=32?-4.3:-5.5;
      const side=(ocq+dcq)*0.01;                      // both ends: both assistants
      const org=a<=29?orgEdge(u,t)*0.75:0;
      let g=rng.gauss(base+c.q*0.02+devMod+side+org,2.0);
      // a breakout season: now and then a young player jumps a level, and
      // sometimes carries a franchise with him (the spread needs a source)
      if(a<=25&&rng.r()<+((typeof process!=="undefined"&&process.env&&process.env.NBA_LEAP)||0.07)){
        const leap=rng.range(4,9); p.pot=Math.max(p.pot,Math.round(p.r+g+leap+2)); g+=leap; p.leap=u.year;
      }
      p.r=Math.round(Math.max(35,Math.min(g>0?p.pot:99,p.r+g)));
      if(a>=27)p.pot=Math.max(p.r,Math.min(p.pot,p.r+1));
      p.peak=Math.max(p.peak||0,p.r);
    });
    // 3. retirement
    R.forEach((p,i)=>{
      if(!p)return;
      const a=p.age-(AGE_SHIFT[p.p]||0);
      const odds=a>=36?0.9:a>=35?0.6:a>=34?0.35:a>=33?0.18:a>=32?0.08:0;
      if(rng.r()<odds+(p.r<55&&a>=29?0.3:0)){R[i]=null;rep.retired[t].push({n:p.n,p:p.p,age:p.age,r:p.r});leave(t,p,"retired")}
    });
    // a starter's empty spot goes to his backup first
    POS.forEach((_,i)=>{if(!R[i]&&R[BK(i)]){R[i]=R[BK(i)];R[BK(i)]=null}});
    const d=u.program[t]-before;
    if(d>30)risers.push([t,Math.round(d)]); if(d<-30)fallers.push([t,Math.round(d)]);
  });

  // agreed trades go through now: after contracts and aging, before the draft
  rep.trade={};
  Object.keys(U_CH).forEach(t=>{const ch=U_CH[t]; if(ch&&ch.trade)nflApplyTrade(u,t,ch.trade,rep,leave,pool)});
  NAMES.forEach(t=>POS.forEach((_,i)=>{const R=u.roster[t]; if(!R[i]&&R[BK(i)]){R[i]=R[BK(i)];R[BK(i)]=null}}));

  // 4. the draft
  const order=nflDraftOrder(rec,elo,rng);
  // the class shown on the offseason screen (a copy: the class itself isn't consumed)
  const prospects=nflDraftClass(u).list.map(p=>Object.assign({},p));
  delete u.draftClass;
  const picks=[];
  for(let rd=1;rd<=2;rd++)order.forEach((t,k)=>{
    const R=u.roster[t], ch=chFor(t), overall=(rd-1)*32+k+1;
    const style=(ch&&ch.draft)||"bpa";
    const score=p=>style==="need"?nflGain(R,p)*1.6+p.r*0.3
                  :style==="upside"?p.pot*1.2+p.r*0.2+nflGain(R,p)*0.3
                  :p.r+(p.pot-p.r)*0.45+nflGain(R,p)*0.5;
    const scout=2.5-orgEdge(u,t)*1.4;                  // how often a team misjudges a prospect
    let bi=0,bs=-1e9; prospects.forEach((p,i)=>{if(p.taken)return; const s=score(p)+rng.gauss(0,scout); if(s>bs){bs=s;bi=i}});
    // a coach's own board comes first: the highest player on it still there
    const board=(ch&&ch.board)||[];
    const mine=board.map(id=>prospects.findIndex(p=>p.pid===id&&!p.taken)).find(i=>i>=0);
    if(mine!==undefined)bi=mine;
    const p=prospects[bi]; p.taken=true;
    p.draft={round:rd,pick:k+1,overall:overall,team:t,year:u.year};
    p.k={sal:rookieSal(overall),yrs:4}; p.joined=u.year+1; p.drafted=true;
    const g=nflGain(R,p);
    const made=g>0.6||!R[p.i]||!R[BK(p.i)];
    if(made){const out=nflPlace(R,p); if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r,why:"draft"});
      if(out.r>=58){out.from=t;pool.push(out)} else leave(t,out,"released")}}
    rep.drafted[t].push({n:p.n,p:p.p,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made});
    picks.push({n:p.n,p:p.p,team:t,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made,pid:p.pid});
  });

  // a draft class can tip a team over: release the worst-value backups until it fits
  NAMES.forEach(t=>{
    const R=u.roster[t];
    while(payroll(R)>TAX_LINE){
      let wi=-1,wv=-1;
      R.forEach((p,i)=>{if(!p||i<POS.length)return; const v=p.k.sal/Math.max(1,p.r-45); if(v>wv){wv=v;wi=i}});
      if(wi<0){ // only starters left over: the most overpaid starter goes
        R.forEach((p,i)=>{if(!p)return; const v=p.k.sal/Math.max(1,p.r-45); if(v>wv){wv=v;wi=i}})}
      const out=R[wi]; R[wi]=null; rep.released[t].push({n:out.n,p:out.p,r:out.r,cap:true});
      if(out.r>=58){out.from=t;pool.push(out)} else leave(t,out,"released");
    }
  });

  // 5. free agency: teams with the most room shop first, a few rounds of it
  pool.forEach(p=>{p.ask=nflAsk(p.r,p.p,p.age); p.i=POS.findIndex(P=>P.p===p.p)});
  // a coach's own targets get the first look, in their order, at the asking
  // price plus a premium for the competing offers, if it fits under the cap
  rep.targets={};
  Object.keys(U_CH).forEach(t=>{
    const ch=U_CH[t]; if(!ch||!ch.targets||!ch.targets.length||!u.roster[t])return;
    const R=u.roster[t]; rep.targets[t]=[];
    ch.targets.forEach(key=>{
      const p=pool.find(x=>!x.signed&&faKey(x.from,x)===key);
      const [team,n,pos]=key.split("|");
      if(!p){rep.targets[t].push({n:n,p:pos,from:team,got:false,why:"wasn't on the market (retired or re-signed)"});return}
      const cost=Math.round(p.ask*1.1*10)/10;
      const bk=R[BK(p.i)];
      if(bk&&bk.keep){rep.targets[t].push({n:n,p:pos,from:team,got:false,why:`no room at ${pos}: it would cut ${bk.n}, whom you just signed`});return}
      if(payroll(R)+cost>NFL_CAP){rep.targets[t].push({n:n,p:pos,from:team,got:false,why:`wanted $${cost.toFixed(1)}M; you didn't have the room`});return}
      p.signed=true; p.k={sal:cost,yrs:nflYears(p.age,p.p)}; p.yrsHere=0; p.joined=u.year+1;
      p.keep=true;                                  // not to be cut again this offseason
      const out=nflPlace(R,p);
      rep.signed[t].push({n:p.n,p:p.p,r:p.r,age:p.age,sal:cost,yrs:p.k.yrs,from:p.from,target:true});
      rep.targets[t].push({n:n,p:pos,from:team,got:true,sal:cost});
      if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r}); if(out.r>=58){out.from=t;out.ask=nflAsk(out.r,out.p,out.age);pool.push(out)} else leave(t,out,"released")}
    });
  });
  const styleOf=t=>{const ch=chFor(t); if(ch&&ch.fa)return ch.fa;
    const rk=NAMES.slice().sort((a,b)=>elo[b]-elo[a]).indexOf(t);
    // bad teams with room are the big spenders, as in the real league; only a
    // few rebuild through youth
    return rk<8?"contend":rk>=28?"young":"balanced"};
  const limit={contend:0.99,balanced:0.93,young:0.85}, maxAge={contend:34,balanced:31,young:27};
  for(let round=0;round<4;round++){
    // free agents choose contenders: the better teams shop first (a little
    // luck in it); they still need the room. (By cap room, weak teams bought
    // every good free agent and the league flattened in a few years.)
    const pull={}; NAMES.forEach(t=>pull[t]=elo[t]+rng.gauss(0,+((typeof process!=="undefined"&&process.env&&process.env.NBA_FAN)||45)));
    const shoppers=NAMES.slice().sort((a,b)=>pull[b]-pull[a]);
    shoppers.forEach(t=>{
      const R=u.roster[t], st=styleOf(t), room=NFL_CAP*limit[st]-payroll(R);
      let best=null,bv=0;
      pool.forEach(p=>{if(p.signed||p.age>maxAge[st]||p.from===t)return;
        const bk=R[BK(p.i)]; if(bk&&bk.keep)return;    // would cut a target you just signed
        const cost=Math.round(p.ask*(1+Math.max(0,rng.gauss(0.05,0.08)))*(1-orgEdge(u,t)*0.06)*10)/10;
        if(cost>room)return;
        const v=nflGain(R,p)-cost*0.08;
        if(v>bv){bv=v;best=[p,cost]}});
      if(!best||bv<0.8)return;
      const [p,cost]=best; p.signed=true;
      p.k={sal:cost,yrs:nflYears(p.age,p.p)}; p.yrsHere=0; p.joined=u.year+1;
      const out=nflPlace(R,p);
      rep.signed[t].push({n:p.n,p:p.p,r:p.r,age:p.age,sal:cost,yrs:p.k.yrs,from:p.from});
      if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r,why:"fa"}); if(out.r>=58&&!out.signed){out.from=t;out.ask=nflAsk(out.r,out.p,out.age);pool.push(out)} else leave(t,out,"released")}
    });
  }
  pool.filter(p=>!p.signed).forEach(p=>leave(p.from,p,"unsigned"));
  NAMES.forEach(t=>u.roster[t].forEach(p=>{if(p)delete p.keep}));

  // 6. fill the gaps, and put the best man at each spot
  NAMES.forEach(t=>{
    const R=u.roster[t];
    for(let i=0;i<R.length;i++)if(!R[i]){
      const p=nflPlayer(rng,53+rng.range(0,5),24+rng.int(8),i%POS.length);
      p.k={sal:0.9,yrs:1}; p.joined=u.year+1; R[i]=p;
      rep.filled[t].push({n:p.n,p:p.p,r:p.r});
    }
    POS.forEach((_,i)=>{const s=R[i],b=R[BK(i)]; if(b.r>s.r+1){R[i]=b;R[BK(i)]=s}});
    R.forEach((p,i)=>{p.i=i%POS.length});
    const c=u.coach[t];
    u.trueBase[t]=rosterElo(R)+(c.t<=1?ROOKIE_DIP:0)+rng.gauss(0,ROSTER_NOISE*0.6);
    u.perceived[t]=0.55*elo[t]+0.45*rosterElo(R)+rng.gauss(0,PERCEPT_N*0.6);
  });
  if(ut&&choices.phil)u.phil=choices.phil;
  u.year++;
  risers.sort((a,b)=>b[1]-a[1]); fallers.sort((a,b)=>a[1]-b[1]);
  if(typeof S!=="undefined"&&S)S.lastNbaRep={rep:rep,picks:picks};     // for tests (test/nba-turnover.js)
  return {risers:risers.slice(0,5),fallers:fallers.slice(0,5),
    draft:{picks:picks}, contracts:rep,
    cap:Object.fromEntries(NAMES.map(t=>[t,Math.round(payroll(u.roster[t])*10)/10]))};
}

LEAGUE.cap=NFL_CAP; LEAGUE.taxLine=TAX_LINE;
LEAGUE.offseason={
  newRoster:nflRoster,
  run:nflRun,
  /* the user's choices, as the offseason screen starts them: re-sign the
     starters worth keeping, spend in free agency like a middling team, draft
     the best player available */
  open(u,t,wins){
    const R=u.roster[t], resign=nflResignPlan(R), asks={};
    R.forEach((p,i)=>{if(p&&p.k.yrs<=1)asks[i]={sal:nflAsk(p.r,p.p,p.age+1),yrs:nflYears(p.age+1,p.p)}});
    nflDraftClass(u,t);                              // made now, so the screen can show it
    return {pool:NFL_CAP, picks:{resign:resign, asks:asks, fa:"balanced", draft:"bpa", board:[], targets:[], block:null, trade:null}};
  },
  choices(P){return {resign:P.resign, fa:P.fa, draft:P.draft, board:P.board||[], targets:P.targets||[], trade:P.trade||null}},
  faStyles:{contend:{l:"Spend to contend",d:"Chase the best players available, whatever their age. Uses nearly every dollar."},
            balanced:{l:"Balanced",d:"Fill real holes with players in their prime. Leaves a little room."},
            young:{l:"Stay young",d:"Only players 27 and under, and keep cap space for later."}},
  draftStyles:{bpa:{l:"Best available",d:"Take the best player on the board, whatever the position."},
               need:{l:"Draft for need",d:"Fill the weakest spots on the roster, even if it means reaching."},
               upside:{l:"Swing for upside",d:"Raw prospects with the highest ceilings. Slower to pay off."}}
};

/* what a season is judged against, and how it is graded */
LEAGUE.goals={
  /* what the job demands, by franchise strength: wins over 84 games, and a
     par for the playoffs (how far the job expects you to go) */
  expectations(p){
    if(p>=1600)return {w:50,par:2.2,l:"Built to win now. A conference final is the floor.",t:"CONTEND"};
    if(p>=1540)return {w:45,par:1.3,l:"Make the playoffs and win a round.",t:"WIN A ROUND"};
    if(p>=1480)return {w:41,par:0.4,l:"Get into the playoffs, a wild card if that's what it takes.",t:"MAKE THE PLAYOFFS"};
    if(p>=1420)return {w:34,par:0,l:"Draft well and show progress. Thirty-five wins would be a statement.",t:"REBUILD"};
    return {w:27,par:0,l:"The bottom of the league. Twenty-five wins would be real movement.",t:"START OVER"};
  },
  isTitle(result){ return /STANLEY CUP CHAMPIONS/i.test(result) },
  firstTitle:"First championship of your tenure.",
  grade(wins,losses,result,exp){
    // no result yet (a season in progress, as the seat badge asks): the playoffs at par
    const po=!result?(exp.par||0):/STANLEY CUP CHAMPIONS/i.test(result)?5:/Stanley Cup Final/.test(result)?3.6:/conference final/.test(result)?2.6:
      /second round/.test(result)?1.7:/first round/.test(result)?0.9:/Made the playoffs/.test(result)?0.9:-(exp.par>=0.4?0.8:0);
    let s=(wins-exp.w)*0.13+po-(exp.par||0);
    if(wins<losses)s-=(exp.w>=41?0.8:0.2);
    const g=s>=4?"A+":s>=2.6?"A":s>=1.6?"A-":s>=0.9?"B+":s>=0.2?"B":s>=-0.6?"B-":
            s>=-1.4?"C+":s>=-2.2?"C":s>=-3.2?"C-":s>=-4.4?"D":"F";
    const l=s>=2.6?"Far beyond what anyone expected.":s>=0.9?"Ahead of schedule.":
            s>=-0.6?"About what was expected.":s>=-2.2?"Short of the mark.":"A bad year, and everyone knows it.";
    return {g:g,l:l,miss:s<-0.6};
  }
};

/* the history book: what only the pros record */
LEAGUE.historyExtras=function(sea,off,my){
  const C=off.contracts||{};
  return {id:"nfl",
    draft:((off.draft&&off.draft.picks)||[]).filter(d=>d.team===my||d.d.round===1&&d.d.pick<=10)
      .map(d=>({n:d.n,p:d.p,team:d.team,r:d.r,pot:d.pot,from:d.from,d:d.d,made:d.made,pid:d.pid})),
    signed:(C.signed&&C.signed[my])||[], resigned:(C.resigned&&C.resigned[my])||[],
    released:(C.released&&C.released[my])||[], retired:(C.retired&&C.retired[my])||[],
    targets:(C.targets&&C.targets[my])||[], trade:(C.trade&&C.trade[my])||null,
    payroll:off.cap?off.cap[my]:null};
};
LEAGUE.migrateHistory=function(h){return {id:"nfl"}};
LEAGUE.seasonLine=function(h,t,r,seed){
  if(h.pnote&&h.pnote[t])return h.pnote[t]+(seed?" \u00b7 No. "+seed+" seed":"");
  if(h.champion===t)return "Stanley Cup champions";
  if(seed)return "Playoffs, No. "+seed+" seed";
  return r[0]>r[1]?"Missed the playoffs":"Losing season";
};
/* home field: the base edge plus the stadium, nothing to do with prestige */
LEAGUE.homeField=(u,t)=>LEAGUE.tuning.hfa+(LEAGUE.venues[t]||0)*0.5;
