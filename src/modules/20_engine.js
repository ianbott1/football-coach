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

function homeField(u,t){
  const prog=(u&&u.program&&u.program[t])!==undefined?u.program[t]:1500;
  const base=39+Math.max(0,Math.min(1,(prog-1150)/900))*30;
  return Math.round(base+(LEAGUE.venues[t]||8));
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
const ELO_PT=21, GAME_SD=14, K=32;

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

/* ============ game sim ============ */
function simGame(rng,tH,tA,neutral,sdMult,edgeAdj){
  const edge=tH-tA+(neutral?0:LEAGUE.tuning.hfa)+(edgeAdj||0);
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
  const hfa=neutral?0:LEAGUE.tuning.hfa;
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

const PHILOSOPHY={
  win_now: {l:"Win now",  d:"Veterans get every rep. Better this year, thinner next.",
            elo:44, dev:-3.0},
  balanced:{l:"Balanced", d:"Play the best guy at every spot.", elo:0, dev:0},
  build:   {l:"Build",    d:"Young players play through mistakes. Costs you this year.",
            elo:-38, dev:3.2}
};

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
    u.roster[n]=LEAGUE.offseason.newRoster(rng,e);
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

