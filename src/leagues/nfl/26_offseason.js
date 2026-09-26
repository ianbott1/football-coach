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
const NFL_CAP=110;
/* How well run a franchise is, from its slow-moving strength: good
   organisations develop players better, scout better, and free agents take
   a little less to join them. Without it the draft and free agency flatten
   the league within a few years. */
const orgEdge=(u,t)=>Math.max(-1.5,Math.min(1.5,(u.program[t]-1690)/100));
const AGE_SHIFT={QB:3,RB:-2};
const POS_PAY={QB:1.75,EDGE:1.15,OT:1.0,WR:1.05,WR2:0.8,CB:0.95,DT:0.9,LB:0.7,S:0.7,RB:0.6};

function nflAsk(r,pos,age){
  const x=Math.max(0,(r-55)/35);
  let s=(0.8+34*Math.pow(x,2.4))*(POS_PAY[pos]||1);
  const a=age-(AGE_SHIFT[pos]||0);
  if(a>=31)s*=0.78; else if(a>=29)s*=0.9;
  return Math.round(Math.max(0.8,s)*10)/10;
}
function nflYears(age,pos){const a=age-(AGE_SHIFT[pos]||0); return a<=26?4:a<=29?3:a<=31?2:1}
function payroll(roster){return roster.reduce((s,p)=>s+(p&&p.k?p.k.sal:0),0)}
const ROOKIE_ROOM=8;                        // what re-signing leaves free for the draft class
/* Which expiring players a team keeps: the best first, while they fit. Worth
   keeping means a starter rated 66+, or a cheap useful backup, not past 32. */
function nflResignPlan(R){
  const exp=[], keep={}; let pay=0;
  R.forEach((p,i)=>{if(!p)return;
    if(p.k.yrs<=1)exp.push(i); else pay+=p.k.sal});
  exp.sort((a,b)=>R[b].r-R[a].r).forEach(i=>{
    const p=R[i], ask=nflAsk(p.r,p.p,p.age+1);
    const worth=(i<POS.length?p.r>=66:p.r>=64&&ask<=3)&&p.age<=32;
    keep[i]=worth&&pay+ask<=NFL_CAP-ROOKIE_ROOM;
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
function nflDraftOrder(rec,elo){
  const S2=(typeof SEA!=="undefined"&&SEA&&SEA.rounds&&SEA.rounds.wc)?SEA:null;
  const pct=t=>rec[t][0]/Math.max(1,rec[t][0]+rec[t][1]);
  const out=(t)=>{
    if(!S2||!S2.seeds||!S2.seeds[t])return 0;
    if(S2.champion===t)return 5;
    if(S2.rounds.sb.some(g=>g.loser===t))return 4;
    if(S2.rounds.conf.some(g=>g.loser===t))return 3;
    if(S2.rounds.div.some(g=>g.loser===t))return 2;
    return 1;
  };
  return NAMES.slice().sort((a,b)=>out(a)-out(b)||pct(a)-pct(b)||elo[a]-elo[b]);
}

function nflProspects(rng,n){
  const out=[];
  for(let i=0;i<n;i++){
    const q=i/n;
    const posIdx=rng.int(POS.length);
    const age=21+rng.int(3);
    const r=Math.round(Math.max(45,Math.min(80,rng.gauss(64-13*Math.pow(q,0.7),3.5))));
    const pot=Math.round(Math.min(99,r+Math.max(2,rng.gauss(11-5*q,4))));
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
    const list=nflProspects(rng,7*32); list.forEach((p,i)=>p.pid=i);
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
const rookieSal=o=>o<=32?Math.round((10-7*(o-1)/31)*10)/10:o<=64?1.6:1.0;

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
      line:LEAGUE.records.alumniLine({p:p.p,car:p.car,yrs:p.yrsHere||1}),why:why});
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
      else{R[i]=null;rep.released[t].push({n:p.n,p:p.p,r:p.r});
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
      const side=(i%POS.length)<5?ocq*0.02:dcq*0.02;
      const org=a<=29?orgEdge(u,t)*0.75:0;
      const g=rng.gauss(base+c.q*0.02+devMod+side+org,2.0);
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

  // 4. the draft
  const order=nflDraftOrder(rec,elo);
  // the class shown on the offseason screen (a copy: the class itself isn't consumed)
  const prospects=nflDraftClass(u).list.map(p=>Object.assign({},p));
  delete u.draftClass;
  const picks=[];
  for(let rd=1;rd<=7;rd++)order.forEach((t,k)=>{
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
    if(made){const out=nflPlace(R,p); if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r});
      if(out.r>=58){out.from=t;pool.push(out)} else leave(t,out,"released")}}
    rep.drafted[t].push({n:p.n,p:p.p,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made});
    picks.push({n:p.n,p:p.p,team:t,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made,pid:p.pid});
  });

  // a draft class can tip a team over: release the worst-value backups until it fits
  NAMES.forEach(t=>{
    const R=u.roster[t];
    while(payroll(R)>NFL_CAP){
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
    const shoppers=NAMES.slice().sort((a,b)=>payroll(u.roster[a])-payroll(u.roster[b]));
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
      if(out){rep.released[t].push({n:out.n,p:out.p,r:out.r}); if(out.r>=58&&!out.signed){out.from=t;out.ask=nflAsk(out.r,out.p,out.age);pool.push(out)} else leave(t,out,"released")}
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
  return {risers:risers.slice(0,5),fallers:fallers.slice(0,5),
    draft:{picks:picks}, contracts:rep,
    cap:Object.fromEntries(NAMES.map(t=>[t,Math.round(payroll(u.roster[t])*10)/10]))};
}

LEAGUE.cap=NFL_CAP;
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
    return {pool:NFL_CAP, picks:{resign:resign, asks:asks, fa:"balanced", draft:"bpa", board:[], targets:[]}};
  },
  choices(P){return {resign:P.resign, fa:P.fa, draft:P.draft, board:P.board||[], targets:P.targets||[]}},
  faStyles:{contend:{l:"Spend to contend",d:"Chase the best players available, whatever their age. Uses nearly every dollar."},
            balanced:{l:"Balanced",d:"Fill real holes with players in their prime. Leaves a little room."},
            young:{l:"Stay young",d:"Only players 27 and under, and keep cap space for later."}},
  draftStyles:{bpa:{l:"Best available",d:"Take the best player on the board, whatever the position."},
               need:{l:"Draft for need",d:"Fill the weakest spots on the roster, even if it means reaching."},
               upside:{l:"Swing for upside",d:"Raw prospects with the highest ceilings. Slower to pay off."}}
};

/* what a season is judged against, and how it is graded */
LEAGUE.goals={
  expectations(p){
    if(p>=1790)return {w:12,l:"A deep playoff run. Anything less is a disappointment.",t:"SUPER BOWL OR BUST"};
    if(p>=1720)return {w:10,l:"Win the division and a playoff game.",t:"CONTEND"};
    if(p>=1650)return {w:9,l:"Get into the playoffs. Nine wins should do it.",t:"PLAYOFFS"};
    if(p>=1580)return {w:7,l:"Be competitive in December and show the rebuild is working.",t:"PUSH FORWARD"};
    return {w:5,l:"Show progress. Five wins would be real movement here.",t:"BUILD SOMETHING"};
  },
  isTitle(result){return /SUPER BOWL CHAMPIONS/i.test(result)},
  firstTitle:"First Super Bowl of your tenure.",
  /* A 17-game season is noisy and 14 teams make the playoffs, so each win
     against expectation and each playoff round count for less than in
     college; tuned so grades spread like college's (about 6% A+, 40% of
     seasons missing) and swing less from year to year. */
  grade(wins,losses,result,exp){
    let s=(wins-exp.w)*0.6;
    if(/SUPER BOWL CHAMPIONS/i.test(result))s+=2.5;
    else if(/Lost the Super Bowl/.test(result))s+=1.5;
    else if(/conference championship/.test(result))s+=1.2;
    else if(/divisional round/.test(result))s+=0.9;
    else if(/wild card round|Made the playoffs/.test(result))s+=0.6;
    else if(/Missed the playoffs/.test(result))s-=(exp.w>=10?0.5:0);
    else if(/Losing season/.test(result))s-=(exp.w>=9?1.25:0.25);
    const g=s>=4?"A+":s>=2.6?"A":s>=1.6?"A-":s>=0.9?"B+":s>=0.2?"B":s>=-0.6?"B-":
            s>=-1.4?"C+":s>=-2.2?"C":s>=-3.2?"C-":s>=-4.4?"D":"F";
    const l=s>=2.6?"Far beyond what anyone expected.":s>=0.9?"Ahead of schedule.":
            s>=-0.6?"About what was expected.":s>=-2.2?"Short of the mark.":"A bad year, and everyone knows it.";
    return {g:g,l:l,miss:s<-0.6};                 // "Short of the mark" or worse
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
    targets:(C.targets&&C.targets[my])||[],
    payroll:off.cap?off.cap[my]:null};
};
LEAGUE.migrateHistory=function(h){return {id:"nfl"}};
LEAGUE.seasonLine=function(h,t,r,seed){
  if(h.pnote&&h.pnote[t])return h.pnote[t]+(seed?" \u00b7 No. "+seed+" seed":"");
  if(h.champion===t)return "Super Bowl champions";
  if(seed)return "Playoffs, No. "+seed+" seed";
  return r[0]>r[1]?"Missed the playoffs":"Losing season";
};
/* home field: the base edge plus the stadium, nothing to do with prestige */
LEAGUE.homeField=(u,t)=>LEAGUE.tuning.hfa+(LEAGUE.venues[t]||0)*0.5;
