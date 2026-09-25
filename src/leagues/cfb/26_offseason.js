/* ============ offseason: college football ============ */
/* Players arrive as freshmen, develop for up to four years, and leave by
   graduating or declaring early. Programs sign a class every year, spend a
   budget, drift in prestige, and now and then change conferences. The core
   asks the league for a starting roster and for one offseason at a time. */

function makePlayer(rng,target,cls,posIdx){
  // upperclassmen are closer to their ceiling; freshmen start lower with room to grow
  const clsAdj=[-7,-2,2,4][cls];   // centred so a normal class mix averages the target
  const r=Math.round(Math.max(30,Math.min(99,rng.gauss(target+clsAdj,5.5))));
  const pot=Math.round(Math.max(r,Math.min(99,r+rng.gauss(10-cls*2.5,5))));
  return {n:playerName(rng),p:POS[posIdx].p,i:posIdx,c:cls,r:r,pot:pot,
          hz:0,prod:0,st:0};
}

function makeRoster(rng,programElo){
  const target=eloToRating(programElo);
  const bag=[]; [3,3,2,2].forEach((n,k)=>{for(let i=0;i<n;i++)bag.push(3-k)});
  rng.shuffle(bag);
  const r=POS.map((_,i)=>makePlayer(rng,target,bag[i],i));
  // backups are younger and a clear step down, but the gap varies a lot
  const bbag=[]; [1,2,3,4].forEach((n,k)=>{for(let i=0;i<n;i++)bbag.push(3-k)});
  rng.shuffle(bbag);
  POS.forEach((_,i)=>{
    const b=makePlayer(rng,target-rng.range(6,17),bbag[i],i);
    b.r=Math.min(b.r,r[i].r);            // never better than the starter on day one
    r.push(b);
  });
  return r;
}

/* ---- offseason roster churn ---- */
function developRoster(u,t,rng,focus,devMod,bud,featured,staff){
  focus=focus||{pos:null,r:0,pot:0}; devMod=devMod||0; bud=bud||null;
  const cls=(u.classAvg&&u.classAvg[t]!==undefined)?u.classAvg[t]:null;
  const coach=u.coach[t];
  const base=eloToRating(u.program[t]);
  const target=(u.classAvg&&u.classAvg[t]!==undefined)
    ? base*0.68+u.classAvg[t]*0.32     // recent classes feed the pipeline
    : base;
  const leaving=[], arriving=[];
  const roster=u.roster[t];
  if(roster.length<POS.length*2){          // older save: give it a two-deep
    POS.forEach((_,i)=>{
      if(!roster[BK(i)]){
        const b=makePlayer(rng,target-rng.range(6,17),rng.int(3),i);
        b.r=Math.min(b.r,roster[i].r); roster[BK(i)]=b;
      }
    });
  }
  const newcomer=(i)=>{
    const cls=rng.r()<0.62?0:1;
    const bonus=(!focus.pos||focus.pos.indexOf(POS[i%POS.length].p)>=0)?focus.r:0;
    const np=makePlayer(rng,target-rng.range(4,14)+(coach.q*0.045)+bonus
      +(coach.rec||0)*0.5+(bud?bud.recruitBonus:0),cls,i%POS.length);
    if(focus.pot)np.pot=Math.min(99,np.pot+focus.pot);
    if(focus.dev)np.up=focus.dev;
    if(cls===0)np.rec=true;
    return np;
  };
  for(let i=0;i<roster.length;i++){
    const pl=roster[i];
    if(!pl)continue;
    if(pl.c>=3){                                   // senior graduates
      leaving.push({n:pl.n,p:pl.p,r:pl.r,starter:i<POS.length,
                    car:pl.car||null, from:pl.from||null, peak:pl.peak||pl.r,
                    idx:i%POS.length});
      if(i<POS.length){
        // the backup steps up, and a new man arrives behind him
        roster[i]=roster[BK(i)];
        roster[BK(i)]=newcomer(i);
        arriving.push(roster[BK(i)]);
      }else{
        roster[i]=newcomer(i); arriving.push(roster[i]);
      }
    }else{
      // development: biggest jumps early, capped by potential, nudged by coaching
      const base=[6.2,4.0,2.2][pl.c];
      const feat=(featured!==undefined&&featured!==null&&featured===i)?3.8:0;
      const side=(i%POS.length)<5 ? (staff?staff.oc:0) : (staff?staff.dc:0);
      let g=rng.gauss(base+coach.q*0.035+devMod+(pl.up||0)+feat+(side||0),3.0);
      pl.r=Math.round(Math.max(30,Math.min(pl.pot,pl.r+g)));
      pl.peak=Math.max(pl.peak||0,pl.r);
      pl.c++;
      // stars leave early for the draft
      let keepOdds=bud?Math.max(0,1-bud.retention):1;
      if(featured!==undefined&&featured!==null&&featured===i)keepOdds*=0.34;
      if(pl.c>=2 && pl.r>=76 && rng.r() < ((pl.r-74)/34)*keepOdds){
        const wasFeatured=(featured!==undefined&&featured!==null&&featured===i);
        leaving.push({n:pl.n,p:pl.p,r:pl.r,early:true,featured:wasFeatured,
                      starter:i<POS.length, car:pl.car||null, from:pl.from||null,
                      peak:pl.peak||pl.r, idx:i%POS.length});
        if(wasFeatured)u.pipeline=(u.pipeline||0)+1;
        if(i<POS.length){
          roster[i]=roster[BK(i)];
          roster[BK(i)]=newcomer(i);
          arriving.push(roster[BK(i)]);
        }else{ roster[i]=newcomer(i); arriving.push(roster[i]) }
      }
    }
  }
  POS.forEach((_,i)=>{
    const s=roster[i], b=roster[BK(i)];
    if(s&&b&&b.r>s.r+2){roster[i]=b;roster[BK(i)]=s}   // clear upgrade wins the job
  });
  return {leaving:leaving,arriving:arriving};
}

function classLabel(rank,total){
  const pct=rank/total;
  if(rank<=10)return "Top-10 class";
  if(pct<=0.20)return "Top-25 class";
  if(pct<=0.45)return "Above average";
  if(pct<=0.75)return "Middling";
  return "Thin class";
}

/* ---- realignment ---- */
/* Money moves programs. Every few years the strongest independents-in-waiting
   get poached upward and the weakest P4 members get left behind. */
function realign(u,rng,year){
  if(!u.conf)syncConf(u);
  const size=c=>NAMES.filter(t=>u.conf[t]===c).length;
  const moves=[];
  const P4L=LEAGUE.playoff.autoBids;
  const G6L=LEAGUE.conf.autoBidPool;
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

LEAGUE.offseason={
  newRoster:makeRoster,         // (rng, programElo) -> roster
  run:offseasonRosters,         // (u, rng, healthy, elo, rec, choices) -> report
  recruitFocus:RECRUIT_FOCUS,   // the choices offered on the offseason screen
  budget:{buckets:BUCKETS, pool:budgetPool}
};
