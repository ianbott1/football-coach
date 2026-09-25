/* ============ state ============ */
const KEYBASE="fbcoach-v2";
const NSLOTS=3;
let slot=1;
const KEYFOR=n=>KEYBASE+"-slot"+n;
let S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,plans:{}};
let plan="balanced", reveal=null, revealTimer=null;
/* ---- hot seat ----
   Several people can share one save, each coaching their own program in the
   same world. Only one is "active" at a time: their state is swapped onto S so
   the rest of the game needs no changes at all. */
const COACH_FIELDS=["myTeam","career","plans","calls","promos","fires","featured",
                    "history","expNow"];

function coachCount(){ return (S.coaches&&S.coaches.length)||1 }
function isHotSeat(){ return coachCount()>1 }
function activeCoach(){ return (S.coaches&&S.coaches[S.turn||0])||null }

function stashCoach(){
  if(!S.coaches)return;
  const c=S.coaches[S.turn||0]; if(!c)return;
  COACH_FIELDS.forEach(k=>{c[k]=S[k]});
}
function loadCoach(i){
  if(!S.coaches||!S.coaches[i])return;
  S.turn=i;
  COACH_FIELDS.forEach(k=>{S[k]=S.coaches[i][k]});
  if(!S.history)S.history=[];
}
/* Old single-coach saves become a one-man hot seat. */
function ensureCoaches(){
  if(S.coaches&&S.coaches.length)return;
  S.coaches=[{}]; S.turn=0;
  COACH_FIELDS.forEach(k=>{S.coaches[0][k]=S[k]});
}

let live=null;          // a game being played out right now
let handoff=false;      // showing the "pass the device" screen
let owlTaps=0;

/* Answers belong to a season as well as a week. Keyed by step alone, season
   three replays season one's decisions and silently answers everything. */
function callKey(step,year){ return (year||SEA.year)+":"+step; }

function liveSeed(step){
  return ((S.seasonSeed^0x9E37)+step*7919)>>>0;
}

function startLive(g,step){
  const e=SEA.matchupElo(g,plan);
  const rng=new RNG(liveSeed(step));
  const userIsHome=(g.home===S.myTeam);
  live={g:g, step:step,
        eng:makeLiveGame(rng,e.h,e.a,
              userIsHome?plan:"balanced", userIsHome?"balanced":plan, userIsHome),
        drives:[], ask:null, done:false,
        paused:(S.watchStep===true), userIsHome:userIsHome};
  // replay any answers already recorded for this week
  live.replay=((S.calls&&S.calls[callKey(step)])||[]).slice();
  live.ri=0;
  reveal=null; watch=null;
  liveTick();
}

function liveTick(){
  if(!live)return;
  if(live.timer){clearTimeout(live.timer);live.timer=null}
  if(!live.kicked){                       // a beat on the empty field first
    live.kicked=true;
    render();
    if(!live.paused){live.timer=setTimeout(liveTick,650);return}
    return;
  }
  let guard=0;
  while(guard++<200){
    const r=live.eng.next();
    if(r.done){ live.done=true; finishLive(); return }
    if(r.ask){
      if(live.ri<live.replay.length){          // answered before, keep going
        live.eng.reply(live.replay[live.ri++]);
        continue;
      }
      live.ask={dp:r.ask, mine:r.mine, theirs:r.theirs};
      render();
      return;
    }
    live.drives.push(r.drive);
    break;
  }
  render();
  if(!live.paused&&!live.done&&!live.ask){
    live.timer=setTimeout(liveTick, liveGap());
  }
}
function liveGap(){
  const n=DRIVES_PER_TEAM*2;
  return Math.max(120,Math.min(2600,Math.round(7200/n/speedMult())));
}
function answerLive(v){
  S.calls=S.calls||{};
  const k=callKey(live.step);
  S.calls[k]=(S.calls[k]||[]).concat([v]);
  live.replay.push(v); live.ri=live.replay.length;
  live.eng.reply(v);
  live.ask=null;
  save(); liveTick();
}
function finishLive(){
  const g=live.g;
  const meHome=(g.home===S.myTeam);
  SEA.forcedList=SEA.forcedList||[];
  SEA.forcedList.push({team:S.myTeam, other:(meHome?g.away:g.home),
              mine:(meHome?live.eng.h:live.eng.a),
              theirs:(meHome?live.eng.a:live.eng.h),
              drives:live.drives});
  const step=live.step;
  live.result={hp:live.eng.h,ap:live.eng.a,
               mine:(g.home===S.myTeam?live.eng.h:live.eng.a)};
  // in a hot seat, hand over before the week is resolved
  if(isHotSeat() && (S.turn||0) < coachCount()-1){
    stashCoach();
    live=null; plan="balanced";
    loadCoach((S.turn||0)+1);
    handoff=true; save(); render(); return;
  }
  resolveWeek(step);
}

/* Everyone has had their turn: play out the rest of the league. */
function resolveWeek(step){
  SEA.userTeam=S.myTeam;
  SEA.advance();
  SEA.forcedList=[]; SEA.forced=null;
  S.steps++;
  plan="balanced";
  flash={type:"week",step:step};
  if(isHotSeat()){ stashCoach(); loadCoach(0) }
  save(); render();
}

function endLive(){
  if(live&&live.timer)clearTimeout(live.timer);
  if(live&&!live.done){                        // skip: run the rest instantly
    let guard=0;
    while(guard++<400){
      const r=live.eng.next();
      if(r.done)break;
      if(r.ask){ live.eng.reply(r.ask.opts[0][0]);
        S.calls=S.calls||{};const k=callKey(live.step);
        S.calls[k]=(S.calls[k]||[]).concat([r.ask.opts[0][0]]); continue }
      live.drives.push(r.drive);
    }
    finishLive();
  }
  live=null; render();
}
let wide=false;
function isWide(){try{return window.innerWidth>=1024}catch(e){return false}}
let U=null, SEA=null, view="team", flash=null;

const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const el=id=>document.getElementById(id);

function snap(u){return JSON.parse(JSON.stringify(u))}

function swapDepth(sea,i){
  const R=sea.roster&&sea.roster[S.myTeam];
  if(!R||!R[i]||!R[BK(i)])return;
  const t=R[i]; R[i]=R[BK(i)]; R[BK(i)]=t;
  sea.talent.base[S.myTeam]=rosterElo(R);
}

function fireCoord(side){
  if(!SEA.fireCoordinator(S.myTeam,side))return;
  S.fires=S.fires||{};
  const k=SEA.step;
  S.fires[k]=S.fires[k]||[];
  S.fires[k].push(side);
  save(); render();
}

function promote(i){
  S.promos=S.promos||{};
  const k=SEA.step;
  S.promos[k]=S.promos[k]||[];
  S.promos[k].push(i);
  swapDepth(SEA,i);
  save(); render();
}

function rebuild(){
  U=snap(S.uStart);
  syncConf(U);
  U.userTeam=S.myTeam;
  SEA=new Season(U,S.seasonSeed);
  SEA.userTeam=S.myTeam;
  SEA.featured=(S.featured===undefined?null:S.featured);
  for(let i=0;i<S.steps;i++){
    if(S.promos&&S.promos[i])S.promos[i].forEach(k=>swapDepth(SEA,k));
    if(S.fires&&S.fires[i])S.fires[i].forEach(sd=>SEA.fireCoordinator(S.myTeam,sd));
    const ans=(S.calls&&S.calls[callKey(i,SEA.year)])||[]; let ai=0;
    SEA.decideHook=ans.length?(()=>ans[ai++]||"normal"):null;
    SEA.plan=(S.plans&&S.plans[i])||"balanced";
    SEA.advance();
  }
  SEA.plan=plan;
}

async function save(){
  try{await window.storage.set(KEYFOR(slot),JSON.stringify(S))}catch(e){}
}
async function loadSlot(n){
  try{const r=await window.storage.get(KEYFOR(n));return r?JSON.parse(r.value):null}catch(e){return null}
}
async function allSlots(){
  const out=[];
  for(let n=1;n<=NSLOTS;n++){
    const d=await loadSlot(n);
    out.push(d&&d.myTeam?{n:n,team:d.myTeam,year:(d.uStart&&d.uStart.year)||2026,
      coach:(d.career&&d.career.name)||"",seasons:(d.history||[]).length,
      rec:d.career?d.career.w+"-"+d.career.l:"",titles:d.career?d.career.titles:0}:{n:n,empty:true});
  }
  return out;
}

const COACH_FIRST=["Ray","Mack","Dabo","Kirby","Lane","Deion","Marcus","Hugh","Bronco",
"Kalani","Sonny","Jimbo","Willie","Herm","Brent","Curt","Vic","Sherrone","Fran","Bo"];
function newDynasty(team,seed,coachName,roster){
  const rng0=new RNG(seed^0x5f3a);
  const people = (roster&&roster.length) ? roster
    : [{team:team, name:coachName||(rng0.pick(COACH_FIRST)+" "+rng0.pick(LAST))}];
  const mk=(p)=>({
    myTeam:p.team,
    career:{name:p.name||(rng0.pick(COACH_FIRST)+" "+rng0.pick(LAST)),
            rep:0,w:0,l:0,titles:0,confs:0,fired:0,
            stops:[{team:p.team,from:2026,w:0,l:0,titles:0}]},
    plans:{}, calls:{}, promos:{}, fires:{}, featured:null, history:[], expNow:null
  });
  S={seed:seed,uStart:null,seasonSeed:0,steps:0,origProgram:null,
     coaches:people.map(mk), turn:0};
  COACH_FIELDS.forEach(k=>{S[k]=S.coaches[0][k]});
  const u=newUniverse(seed); syncConf(u);
  S.coaches.forEach(c=>{
    u.coach[c.myTeam]={id:0,n:c.career.name,q:0,t:0,hired:true,you:true,
                       w:0,l:0,titles:0,confs:0,fired:0,stops:[]};
  });
  S.uStart=snap(u); S.origProgram=snap(u.program);
  S.seasonSeed=(seed*2654435761)>>>0 % 2147483647;
  rebuild(); S.expNow=expectations(); save(); view="team"; render();
}

/* ============ advance ============ */
function doAdvance(){
  if(SEA.phase==="done"){ openOffseason(); return; }
  const before=SEA.step;
  const ph=SEA.phase;
  S.plans=S.plans||{}; S.plans[before]=plan;
  if(live&&live.done)live=null;               // last game is over; don't block the next
  ensureCoaches();
  SEA.userTeam=S.myTeam;
  SEA.featured=(S.featured===undefined?null:S.featured);
  SEA.plan=plan;
  const ug=(SEA.phase==="week")?SEA.nextGame(S.myTeam)
          :(SEA.phase!=="done"?SEA.postMatchup(S.myTeam):null);
  const wantLive = ug && SEA.roster && !prefersReduced() && (S.watchMode||"all")!=="never";
  if(wantLive && !live){
    startLive(ug, before);
    return;                                    // the game is played in the viewer
  }
  // no live game to play (a bye, or watching turned off): still hand over
  if(isHotSeat() && (S.turn||0) < coachCount()-1){
    S.plans[before]=plan;
    stashCoach(); live=null; plan="balanced";
    loadCoach((S.turn||0)+1);
    handoff=true; save(); render(); return;
  }
  SEA.userTeam=S.myTeam;
  SEA.advance();
  SEA.forcedList=[]; SEA.forced=null;
  S.steps++;
  plan="balanced";
  if(isHotSeat()){ stashCoach(); loadCoach(0) }
  LEAGUE.ui.afterAdvance(ph);
  flash={type:SEA.phase==="week"||before<LEAGUE.weeks?"week":"post",step:before};
  const g=heroGame();
  const rk=SEA.poll.rankMap();
  if(g&&!prefersReduced()&&(S.watchMode||"all")==="never"){
    reveal="half";
    if(revealTimer)clearTimeout(revealTimer);
    revealTimer=setTimeout(()=>{reveal="final";render()},1500);
  }else reveal=null;
  save(); render();
}

function openOffseason(){
  if(SEA.phase!=="done")return;
  const rng=new RNG((S.seasonSeed^(U.year*7919))>>>0);
  if(S.off&&S.off.year===SEA.year)return;      // already booked this coach
  recordCoaches(U,SEA.rec,SEA.champion,SEA.champs,SEA.year);
  const A=offseasonCoaching(U,rng,SEA.rec,SEA.elo,S.myTeam);
  const my=S.myTeam, C=S.career;
  const exp=S.expNow||expectations();
  const titles={natl:SEA.champion===my,playoff:SEA.field.indexOf(my)>=0,
                conf:Object.keys(SEA.champs).some(c=>SEA.champs[c]===my)};
  C.rep=C.rep*0.94;                       // reputations fade, good and bad
  C.rep+=repDelta(SEA.rec[my][0],SEA.rec[my][1],exp.w,U.program[my],titles);
  C.rep=Math.max(-48,Math.min(80,C.rep));
  C.w+=SEA.rec[my][0]; C.l+=SEA.rec[my][1];
  if(titles.natl)C.titles++; if(titles.conf)C.confs++;
  const st=C.stops[C.stops.length-1];
  st.w+=SEA.rec[my][0]; st.l+=SEA.rec[my][1];
  if(titles.natl)st.titles++;
  st.to=SEA.year;
  const staffCands={};
  if(A.staffOpen&&A.staffOpen.oc)staffCands.oc=coordCandidates(rng,U.program[my],"oc",C.rep);
  if(A.staffOpen&&A.staffOpen.dc)staffCands.dc=coordCandidates(rng,U.program[my],"dc",C.rep);
  const jobs=A.userOpen?jobMarket(U,rng,C.rep,A.openJobs,my):[];
  const poach=A.userOpen?[]:poachOffers(U,rng,C.rep,A.openJobs,my);
  const pool=LEAGUE.offseason.budget.pool(U,my,SEA.rec[my][0]);
  S.off={year:SEA.year,act:A,jobs:jobs,poach:poach,move:null,pool:pool,staff:staffCands,
    picks:{recruit:"balanced",phil:(U.phil||"balanced"),oc:null,dc:null,
      budget:{recruit:Math.ceil(pool/4),develop:Math.floor(pool/4),
              facility:Math.floor(pool/4),retention:pool-Math.ceil(pool/4)-2*Math.floor(pool/4)}},
    rngA:[rng.a,rng.sp]};
  flash=null; save(); render();
}

function budgetLeft(){
  if(!S.off)return 0;
  const B=S.off.picks.budget;
  return S.off.pool-LEAGUE.offseason.budget.buckets.reduce((s,b)=>s+(B[b.k]||0),0);
}

function commitOffseason(){
  const P=S.off.picks, A=S.off.act, C=S.career;
  if(A.userOpen&&S.off.move===null)return;
  if(budgetLeft()!==0)return;
  const rng=new RNG(0); rng.a=S.off.rngA[0]; rng.sp=S.off.rngA[1];
  const oldTeam=S.myTeam;
  let dest=S.off.move;
  if(dest==="retire"){S.retired=true;save();render();return}
  if(dest&&dest!==oldTeam){
    // the program you leave hires someone else; you take the new job
    U.coach[oldTeam]=newCoach(rng,U.program[oldTeam]);
    C.fired+=(A.userOpen?1:0);
    C.stops.push({team:dest,from:SEA.year+1,w:0,l:0,titles:0});
    S.myTeam=dest; U.userTeam=dest; U.phil="balanced";
    U.coach[dest]=Object.assign({},U.coach[oldTeam]||{},
      {id:0,n:C.name,q:0,t:0,hired:true,you:true});
  }
  ["oc","dc"].forEach(side=>{
    const cands=S.off.staff&&S.off.staff[side];
    if(cands){
      const pick=cands[P[side]!==null&&P[side]!==undefined?P[side]:0];
      if(side==="oc")U.oc[S.myTeam]=pick; else U.dc[S.myTeam]=pick;
    }
  });
  S.pending=S.pending||{};
  S.pending[S.myTeam]={recruit:P.recruit, phil:P.phil, budget:P.budget,
                       featured:(S.featured===undefined?null:S.featured)};
  if(isHotSeat() && (S.turn||0) < coachCount()-1){
    writeSeasonHistory();                       // this coach's year, in their book
    stashCoach(); loadCoach((S.turn||0)+1);
    S.off=null; handoff=true; openOffseason(); save(); render(); return;
  }
  const users=S.pending; S.pending=null;
  endSeason(rng,{userTeam:S.myTeam,users:users,coach:null,
    recruit:P.recruit, phil:P.phil, budget:P.budget,
    featured:(S.featured!==undefined?S.featured:null)}, A);
  S.featured=null;
}

/* One coach's year, written into their own book. In a hot seat every coach
   calls this for themselves before the world moves on. */
function writeSeasonHistory(){
  const my=S.myTeam, rk=SEA.poll.rankMap();
  const result=SEA.resultLine?SEA.resultLine(my):"";
  const exp=S.expNow||expectations();
  const gr=seasonGrade(SEA.rec[my][0],SEA.rec[my][1],result,exp);
  const myGames=[].concat(...SEA.weeks.map(w=>w.games)).filter(g=>g.home===my||g.away===my);
  const bestWin=myGames.filter(g=>g.winner===my)
    .sort((x,y)=>(x.home===my?(x.arank||999):(x.hrank||999))-(y.home===my?(y.arank||999):(y.hrank||999)))[0];
  const bwOpp=bestWin?(bestWin.home===my?bestWin.away:bestWin.home):null;
  const bwRank=bestWin?(bestWin.home===my?bestWin.arank:bestWin.hrank):null;
  S.history=S.history||[];
  S.history.push({
    card:{conf:LEAGUE.conf.names[CONF[my]]||"",
      confRec:SEA.confrec[my][0]+"-"+SEA.confrec[my][1],
      bestWin: bwOpp?{opp:bwOpp,rank:bwRank||null,
        score:(bestWin.home===my?bestWin.hp+"-"+bestWin.ap:bestWin.ap+"-"+bestWin.hp)}:null,
      coach:S.career.name, titles:S.career.titles, seasons:S.history.length+1},
    year:SEA.year, rec:SEA.rec[my][0]+"-"+SEA.rec[my][1], rank:rk[my]||99,
    result:result, grade:gr.g, gradeLine:gr.l, team:my,
    champion:SEA.champion, confChamp:Object.keys(SEA.champs).some(c=>SEA.champs[c]===my)
  });
}

function endSeason(rng,choices,act){
  if(SEA.phase!=="done"||!rng||!act)return;
  const my=S.myTeam, rk=SEA.poll.rankMap();
  const result=SEA.seasonResult(my);
  const teamRows={};
  NAMES.forEach(t=>{teamRows[t]=[SEA.rec[t][0],SEA.rec[t][1],rk[t]]});
  const {confChamps,bowlOf,post,pnote,cfpOf}=SEA.postRecord();
  LEAGUE.rivals.record(U,SEA);
  SEA.bankCareers(U);
  if(S.calls){ const keep={}, pre=SEA.year+":";
    Object.keys(S.calls).forEach(k=>{if(k.indexOf(pre)===0)keep[k]=S.calls[k]});
    S.calls=keep; }
  if(U.coach[S.myTeam])U.coach[S.myTeam].q=Math.round(Math.max(-40,Math.min(60,S.career.rep*0.62)));
  const B=LEAGUE.offseason.run(U,rng,SEA.healthy(),SEA.elo,SEA.rec,choices);
  const off=Object.assign({},act,B);
  const exp=S.expNow||expectations();
  const gr=seasonGrade(SEA.rec[my][0],SEA.rec[my][1],result,exp);
  const miles=milestones(SEA.rec[my][0],SEA.rec[my][1],result,rk[my]);
  const myGames=[].concat(...SEA.weeks.map(w=>w.games)).filter(g=>g.home===my||g.away===my);
  const bestWin=myGames.filter(g=>g.winner===my)
    .sort((x,y)=>(x.home===my?(x.arank||999):(x.hrank||999))-(y.home===my?(y.arank||999):(y.hrank||999)))[0];
  const bwOpp=bestWin?(bestWin.home===my?bestWin.away:bestWin.home):null;
  const bwRank=bestWin?(bestWin.home===my?bestWin.arank:bestWin.hrank):null;
  S.history.push({
    card:{conf:LEAGUE.conf.names[CONF[my]]||"",
      confRec:SEA.confrec[my][0]+"-"+SEA.confrec[my][1],
      bestWin: bwOpp?{opp:bwOpp,rank:bwRank||null,
        score:(bestWin.home===my?bestWin.hp+"-"+bestWin.ap:bestWin.ap+"-"+bestWin.hp)}:null,
      coach:S.career.name, titles:S.career.titles, seasons:S.history.length+1},
    grade:gr.g,gradeLine:gr.l,miles:miles,exp:exp.t,
    year:SEA.year,rec:SEA.rec[my][0]+"-"+SEA.rec[my][1],
    rank:rk[my],champion:SEA.champion,result:result,
    program:Math.round(U.program[my]),
    fired:off.fired.indexOf(my)>=0, firedList:off.fired,
    confChamp:Object.keys(SEA.champs).some(c=>SEA.champs[c]===my),
    nFired:off.fired.length,
    teams:teamRows, confChamps:confChamps, bowls:bowlOf, cfp:cfpOf,
    realigned:off.realigned||[],
    coordMoves:(off.coordMoves||[]).slice(0,6),
    draft:(off.draft&&off.draft.picks)?off.draft.picks
      .filter(d=>d.team===my||d.draft.round<=1)
      .slice(0,40).map(d=>({n:d.n,p:d.p,team:d.team,peak:d.peak||d.r,
        early:!!d.early,d:d.draft})):[],
    post:post, pnote:pnote,
    heis:(SEA.mvpRace(3)||[]).map(x=>({n:x.n,p:x.p,t:x.t,r:x.r,c:x.c,line:x.line})),
    allconf:(function(){const o=SEA.allConfAll(),k=CONF[my];
      return {conf:k,list:(o[k]||[]).map(x=>({pos:x.pos,team:x.team,n:x.n,r:x.r,c:x.c}))}})(),
    classes:off.classes||{}, early:off.early||{},
    coachNow:(U.coach&&U.coach[my])?{n:U.coach[my].n,q:U.coach[my].q,t:U.coach[my].t}:null,
    hires:(off.hires||[]).slice(0,60), poached:(off.poached||[]).slice(0,12),
    top10:SEA.poll.order().slice(0,10)});
  S.uStart=snap(U); S.off=null; S.plans={};
  S.seasonSeed=(S.seasonSeed*1103515245+12345)>>>0;
  S.steps=0; rebuild(); S.expNow=expectations();
  flash={type:"offseason"}; view="team"; save(); render();
}

/* ============ rendering ============ */
function rkTag(r){return r&&r<=25?`<span class="rk">${r}</span>`:""}

function gameLine(g,mine){
  const hw=g.winner===g.home;
  const best=Math.min(g.hrank||999,g.arank||999);
  const ups=g.hrank&&g.arank?(hw?g.hrank>g.arank:g.arank>g.hrank):false;
  const cls="game"+(best<=25?" marquee":"")+(ups&&best<=25?" upset":"")+(mine?" mine":"");
  const side=(t,s,r,w,seed,rec)=>`<div class="side ${w?'w':''}">${
    seed?`<span class="sdchip">${seed}</span>`:rkTag(r)}
    <span class="nm">${TL(t)}</span>${rec?`<span class="grec">${rec}</span>`:""}
    <span class="sc">${s}</span></div>`;
  const chips=[];
  if(g.title)chips.push(`<span class="chip ttl">${esc(g.title)}</span>`);
  if(g.site)chips.push(`<span class="chip ttl">${esc(g.site)}</span>`);
  if(ups&&best<=25)chips.push(`<span class="chip up">Upset</span>`);
  if(g.neutral&&!g.site&&!g.title)chips.push(`<span class="chip">Neutral</span>`);
  if(g.margin<=3)chips.push(`<span class="chip">One score</span>`);
  const rv=LEAGUE.rivals.name(g.home,g.away);
  if(rv)chips.push(`<span class="chip riv">${esc(rv)}</span>`);
  return `<article class="${cls}"><div class="edge" style="${mine?`background:${teamInk(g.winner)}`:""}"></div><div class="gbody">
    ${side(g.away,g.ap,g.arank,!hw,g.aseed,g.arec)}${side(g.home,g.hp,g.hrank,hw,g.hseed,g.hrec)}
    ${chips.length?`<div class="meta">${chips.join("")}</div>`:""}</div></article>`;
}

/* ---- watching a game ---- */
let watch=null;   // {g, script, i, timer}

function watchSeed(g){
  return (g.hp*7919 + g.ap*104729 + (g.week||0)*131 + (g.home.length*17) + g.away.length)>>>0;
}

function startWatch(g){
  if(!g||!SEA.roster)return;
  const drives=(g.drives&&g.drives.length)?g.drives:null;
  watch={g:g, script:drives?driveScript(g,drives):gameScript(g,SEA.roster[g.home],SEA.roster[g.away],watchSeed(g)),
         i:-1, paused:(S.watchStep===true)};
  reveal=null;
  tickWatch();
}

/* Turn the real drives into readable lines, using the actual rosters. */
function driveScript(g,drives){
  const rng=new RNG(watchSeed(g));
  const RH=SEA.roster[g.home], RA=SEA.roster[g.away];
  const OUTTXT={PUNT:["three and out","forced to punt","stalls out, punt","goes backwards, punt"],
                DOWNS:["turned over on downs"],MISS:["the kick is no good"],
                INT:["intercepted"],FUM:["fumble, recovered by the defence"]};
  return drives.map(d=>{
    const off=d.home?RH:RA, def=d.home?RA:RH;
    const nm=i=>off&&off[i]?off[i].n:"the offence";
    const dn=i=>def&&def[i]?def[i].n:"the defence";
    let text;
    if(d.kind==="TD"){
      const y=Math.round(rng.range(2,64));
      text = rng.r()<0.56 ? `${nm(0)} ${y}-yd TD pass to ${nm(rng.r()<0.62?2:3)}`
           : rng.r()<0.8  ? `${nm(1)} ${y}-yd TD run`
                          : `${nm(0)} ${Math.round(rng.range(1,12))}-yd TD run`;
    } else if(d.kind==="FG"){ text=`${Math.round(rng.range(19,52))}-yd field goal`; }
    else if(d.kind==="INT"){ text=`intercepted by ${dn(8)}`; }
    else if(d.kind==="FUM"){ text=`fumble, recovered by ${dn(7)}`; }
    else if(d.kind==="MISS"){ text=`${Math.round(rng.range(38,56))}-yd attempt is no good`; }
    else { text=rng.pick(OUTTXT[d.kind]||["punt"]); }
    const sec=Math.max(5,Math.round(890-((d.n-1)%6+1)*140-rng.range(0,50)));
    return {n:d.n,q:d.q,clock:Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0"),
      team:d.home?g.home:g.away, pts:d.pts, outcome:d.kind, text:text,
      start:d.start, end:d.pts>0?100:Math.min(95,d.start+20),
      yards:d.pts>0?100-d.start:Math.max(0,20),
      ball: d.home ? 100-(d.pts>0?100:d.start+18) : (d.pts>0?100:d.start+18),
      h:d.h, a:d.a};
  });
}
const SPEEDS=[["slow",0.34,"Slow"],["normal",0.52,"Normal"],["fast",1.0,"Fast"],["rapid",2.1,"Very fast"]];
function speedMult(){
  const k=S.watchSpeed||"normal";
  const f=SPEEDS.find(s=>s[0]===k);
  return f?f[1]:1;
}
function watchGap(){
  const n=Math.max(1,watch.script.length);
  return Math.max(120,Math.min(2600,Math.round(7200/n/speedMult())));
}
function tickWatch(){
  if(!watch)return;
  if(watch.timer){clearTimeout(watch.timer);watch.timer=null}
  render();
  if(!watch.paused && watch.i<watch.script.length){
    watch.timer=setTimeout(()=>{watch.i++;tickWatch()},watch.i<0?650:watchGap());
  }
}
function stepWatch(){
  if(!watch)return;
  if(watch.i<watch.script.length){watch.i++;}
  tickWatch();
}
function togglePause(){
  if(!watch)return;
  watch.paused=!watch.paused;
  S.watchStep=watch.paused; save();
  tickWatch();
}
function stopWatch(finish){
  if(watch&&watch.timer)clearTimeout(watch.timer);
  if(finish&&watch){watch.i=watch.script.length;watch.timer=null;render();return}
  watch=null; render();
}

function watchView(){
  const g=watch.g, my=S.myTeam;
  const upto=watch.script.slice(0,Math.max(0,Math.min(watch.i+1,watch.script.length)));
  const cur=upto[upto.length-1]||null;
  const H=cur?cur.h:0, A=cur?cur.a:0;
  const done=watch.i>=watch.script.length;
  const kick=watch.i<0;
  const mine=(g.home===my)?H:A, theirs=(g.home===my)?A:H;
  const q=cur?cur.q:1;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  const OUT={TD:"TD",FG:"FG",SAF:"SAFETY",PUNT:"PUNT",DOWNS:"DOWNS",MISS:"NO GOOD",
             INT:"INT",FUM:"FUMBLE",HALF:"HALF",END:"END"};
  return `<div class="watchwrap">
    <div class="wtop ${done?(mine>theirs?'win':'loss'):''}">
      <div class="wlabel">${done?`FINAL &middot; ${mine>theirs?"WIN":"LOSS"}`
        :kick?`<span class="live"></span>KICKOFF &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>Q${q} ${esc(cur.clock)} &middot; drive ${cur.n}`}</div>
      <div class="wscore">
        <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span>
          <span class="wn">${A}</span></div>
        <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span>
          <span class="wn">${H}</span></div>
      </div>
    </div>
    ${fieldSVG(g,cur,teamColor(g.home),teamColor(g.away),venue)}
    ${cur?`<div class="fpos">${esc(cur.team)} ball &middot; started own ${cur.start}
      &middot; ${cur.yards} yards</div>`
      :`<div class="fpos">Ready for kickoff at ${esc(venue)}</div>`}
    <div class="grouphead">Drive chart</div>
    <div class="plays">${upto.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''}">
      <span class="pq">Q${e.q} ${e.clock}</span>
      <div class="ptxt"><b>${esc(e.team)}</b> ${esc(e.text)}
        <span class="dtag ${e.pts?'sc':''}">${OUT[e.outcome]||e.outcome}</span></div>
      <span class="pscore">${e.a}&ndash;${e.h}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the opening drive&hellip;</span></div>`}</div>
    <div class="actionbar">
      ${done?`<button class="advance" id="wdone">Back to the season</button>`
      :`<div class="wspeed">${SPEEDS.map(s=>
          `<button class="spbtn" data-speed="${s[0]}"
            aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
        <div class="wctl">
          <button class="wbtn" id="wpause">${watch.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
          <button class="wbtn ${watch.paused?'hot':''}" id="wstep">Next drive &rarr;</button>
          <button class="wbtn" id="wskip">Skip</button>
        </div>
        <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>`}
    </div></div>`;
}

function prefersReduced(){
  try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}
}

function liveRec(team){
  const w=SEA.rec[team][0], l=SEA.rec[team][1];
  if(reveal!=="half")return [w,l];
  const g=heroGame();
  if(!g||(g.home!==team&&g.away!==team))return [w,l];
  return g.winner===team?[w-1,l]:[w,l-1];
}

function liveConf(team){
  const w=SEA.confrec[team][0], l=SEA.confrec[team][1];
  if(reveal!=="half")return [w,l];
  const g=heroGame();
  if(!g||!g.conf||(g.home!==team&&g.away!==team))return [w,l];
  return g.winner===team?[w-1,l]:[w,l-1];
}

function heroGame(){
  const my=S.myTeam;
  if(flash&&flash.type==="week"){
    const W=SEA.weeks[flash.step];
    if(W)return W.games.find(x=>x.home===my||x.away===my)||null;
  }else if(flash&&flash.type==="post"){
    const pools=[SEA.rounds.fin,SEA.rounds.sf,SEA.rounds.qf,SEA.rounds.r1,SEA.bowls,SEA.titles];
    for(const p of pools){const f=p.find(x=>x.home===my||x.away===my);if(f)return f}
  }
  return null;
}

function heroResult(){
  const my=S.myTeam;
  let g=null,label="";
  if(flash&&flash.type==="week"){
    const W=SEA.weeks[flash.step];
    if(W){g=W.games.find(x=>x.home===my||x.away===my);label=W.label}
  }else if(flash&&flash.type==="post"){
    const pools=[SEA.rounds.fin,SEA.rounds.sf,SEA.rounds.qf,SEA.rounds.r1,SEA.bowls,SEA.titles];
    for(const p of pools){const f=p.find(x=>x.home===my||x.away===my);if(f){g=f;break}}
  }
  if(!g)return "";
  const won=g.winner===my;
  const opp=g.home===my?g.away:g.home;
  const half=(reveal==="half"&&g.hh!==undefined);
  const ms=half?(g.home===my?g.hh:g.ah):(g.home===my?g.hp:g.ap);
  const os=half?(g.home===my?g.ah:g.hh):(g.home===my?g.ap:g.hp);
  const cur=SEA.poll.rankMap(), pv=SEA.prevRank;
  let move="";
  if(pv&&pv[my]){
    const d=pv[my]-cur[my];
    if(cur[my]<=25&&pv[my]>25)move=`<div class="hmove up">Entered the poll at #${cur[my]}</div>`;
    else if(cur[my]>25&&pv[my]<=25)move=`<div class="hmove dn">Dropped out of the poll</div>`;
    else if(cur[my]<=25&&d>0)move=`<div class="hmove up">&#9650; Up ${d} to #${cur[my]}</div>`;
    else if(cur[my]<=25&&d<0)move=`<div class="hmove dn">&#9660; Down ${-d} to #${cur[my]}</div>`;
    else if(cur[my]<=25)move=`<div class="hmove flat">Holding at #${cur[my]}</div>`;
  }
  if(half)return `<div class="hero half">
    <div class="hlabel"><span class="live"></span>HALFTIME${label?" &middot; "+esc(label):""}</div>
    <div class="hscore">${ms}<span>&ndash;</span>${os}</div>
    <div class="hopp">${g.home===my?"vs":"at"} ${esc(opp)}</div>
    <div class="hfoot">Second half under way&hellip;</div></div>`;
  return `<div class="hero ${won?'win':'loss'}" style="--tc:${teamInk(my)}">
    <div class="hlabel">FINAL &middot; ${won?"WIN":"LOSS"}${label?" &middot; "+esc(label):""}</div>
    <div class="hscore">${ms}<span>&ndash;</span>${os}</div>
    <div class="hopp">${g.home===my?"vs":"at"} ${esc(opp)}</div>${move}
    ${SEA.roster?`<button class="rewatch" data-rewatch="1">Rewatch</button>`:""}</div>`;
}


/* ============ what's at stake ============ */
function winProb(me,opp,atHome,neutral){
  const v=t=>(SEA.hfa&&SEA.hfa[t])||LEAGUE.tuning.hfa;
  const hfa=neutral?0:(atHome?v(me):-v(opp));
  return 1/(1+Math.pow(10,-((SEA.elo[me]+hfa-SEA.elo[opp])/400)));
}

function confPosition(t){
  const c=CONF[t];
  if(c==="IND")return null;
  const mem=NAMES.filter(x=>CONF[x]===c).sort((x,y)=>{
    const px=SEA.confrec[x][0]/Math.max(1,SEA.confrec[x][0]+SEA.confrec[x][1]);
    const py=SEA.confrec[y][0]/Math.max(1,SEA.confrec[y][0]+SEA.confrec[y][1]);
    return py-px||SEA.confrec[y][0]-SEA.confrec[x][0]||SEA.elo[y]-SEA.elo[x];
  });
  return {pos:mem.indexOf(t)+1,of:mem.length,conf:LEAGUE.conf.names[c]};
}

function streakOf(t){
  let n=0,won=null;
  for(let i=SEA.weeks.length-1;i>=0;i--){
    const g=SEA.weeks[i].games.find(x=>x.home===t||x.away===t);
    if(!g)continue;
    const w=g.winner===t;
    if(won===null)won=w;
    if(w!==won)break;
    n++;
  }
  return {n:n,won:won};
}

/* Returns the single most interesting thing riding on this game. */
function stakesFor(ng){
  const my=S.myTeam, opp=ng.home===my?ng.away:ng.home;
  const rk=SEA.poll.rankMap();
  const wk=SEA.step, left=LEAGUE.weeks-wk;
  const rec=SEA.rec[my], w=rec[0], l=rec[1];
  const cp=confPosition(my);
  const riv=LEAGUE.rivals.name(my,opp);
  const out=[];

  if(riv){
    const ser=LEAGUE.rivals.series(U,my,opp);
    let extra="";
    if(ser&&ser.streak&&ser.streak.n>=2)
      extra=ser.streak.team===my?` You've won ${ser.streak.n} in a row.`
                             :` They've won ${ser.streak.n} in a row.`;
    out.push({p:100,tag:"RIVALRY",
      l:`${riv[0].toUpperCase()+riv.slice(1)} is on the line.${extra}`});
  }

  if(l===0&&w>=4)out.push({p:90,tag:"UNBEATEN",
    l:`${w}-0 and counting. A perfect season is still live.`});

  if(wk>=8&&cp){
    if(cp.pos<=2&&left<=4)out.push({p:88,tag:"TITLE RACE",
      l:`You sit ${cp.pos===1?"first":"second"} in the ${cp.conf} with ${left} to play &mdash; the championship game is right there.`});
    else if(cp.pos===3&&left<=4)out.push({p:80,tag:"TITLE RACE",
      l:`Third in the ${cp.conf}, one spot out of the championship game.`});
  }

  if(wk>=7){
    const f=LEAGUE.ui.projectedField();
    const idx=f.indexOf(my);
    if(idx>=0)out.push({p:85,tag:"PLAYOFF",
      l:`You'd be the No. ${idx+1} seed if the season ended today.${idx<4?" That's a first-round bye.":""}`});
    else{
      const order=SEA.poll.order();
      const outs=order.filter(t=>f.indexOf(t)<0);
      const spot=outs.indexOf(my);
      if(spot>=0&&spot<6)out.push({p:86,tag:"BUBBLE",
        l:`${spot===0?"First team out":"Number "+(spot+1)+" out"} of the projected field. You need this one.`});
    }
  }

  if(rk[opp]<=10)out.push({p:78,tag:"MARQUEE",
    l:`A win over No. ${rk[opp]} ${opp} is the kind of result that decides seeding.`});
  else if(rk[opp]<=25)out.push({p:62,tag:"RANKED",
    l:`No. ${rk[opp]} ${opp} is a résumé game either way.`});

  const st=streakOf(my);
  if(!st.won&&st.n>=3)out.push({p:74,tag:"SLIDE",
    l:`${st.n} straight losses. The seat under your coach is getting warm.`});
  else if(st.won&&st.n>=5)out.push({p:58,tag:"STREAK",
    l:`${st.n} in a row. Nobody wants to be the one who ends it.`});

  if(w===5&&left<=5)out.push({p:70,tag:"BOWL",
    l:`Win and you're bowl eligible.`});
  if(l>=6)out.push({p:40,tag:"SPOILER",
    l:`Nothing left but pride and a chance to wreck somebody's season.`});

  if(!out.length)out.push({p:0,tag:"WEEK "+(wk+1),
    l:`${ng.home===my?"Home":"On the road"} against ${opp}. Take care of business.`});

  out.sort((x,y)=>y.p-x.p);
  return out.slice(0,2);
}

function seatBadge(){
  const my=S.myTeam;
  if(!U||!U.coach)return "";
  const w=SEA.rec[my][0], l=SEA.rec[my][1];
  if(w+l<4)return `<span class="seat cool">Settled</span>`;
  const wp=w/(w+l);
  const short=(U.program[my]-SEA.elo[my])/45;
  let heat=(U.bad[my]||0)*1.4+Math.max(0,short)+(wp<0.42?1.2:0);
  if(U.coach[my].t<=1)heat-=1.6;
  if(U.coach[my].q>=30)heat-=0.6;
  if(heat>=3.6)return `<span class="seat hot">HOT SEAT</span>`;
  if(heat>=2.2)return `<span class="seat warm">Under pressure</span>`;
  return `<span class="seat cool">Secure</span>`;
}

let teamTab="overview";

function starBar(r){
  const pct=Math.max(0,Math.min(100,(r-38)/(99-38)*100));
  return `<span class="rbar"><i style="width:${pct}%"></i></span>`;
}

function rosterOf(t){
  if(!SEA.roster||!SEA.roster[t])return "";
  const hurt={}; SEA.talent.active(t).forEach(e=>hurt[e.idx]=e);
  const R=SEA.roster[t];
  const avg=Math.round(R.reduce((s,p)=>s+p.r,0)/R.length);
  return `<div class="grouphead">Starters &middot; average rating ${avg}</div>`+
    R.map((p,i)=>{const inj=hurt[i];
      return `<div class="prow2 ${inj?'out':''}">
        <span class="ppos">${esc(p.p)}</span>
        <div class="pmain"><div class="pname">${esc(p.n)}</div>
          <div class="psub">${LEAGUE.classes[p.c]}${p.pot>p.r?" &middot; ceiling "+p.pot:" &middot; at ceiling"}${
            inj?` &middot; <span class="outtag">out ${inj.w} wk${inj.w===1?"":"s"}</span>`:""}</div></div>
        ${starBar(p.r)}<span class="prate">${p.r}</span></div>
        ${p.st2&&p.st2.g?`<div class="sline2">${esc(statLine(p.p,p.st2))}</div>`:""}`}).join("");
}

function teamPanel(){
  const my=S.myTeam, rk=SEA.poll.rankMap();
  const inj=SEA.talent.active(my);
  const co=U&&U.coach?U.coach[my]:null;
  let h=heroResult();
  h+=teamCardHTML(my,rk,co);
  if(reveal==="half")return h;
  h+=injuryHTML(inj);
  h+=nextUpHTML(my,rk);
  return h;
}

function rosterView(){
  const my=S.myTeam;
  if(!SEA.roster)return `<div class="note">No roster data in this save.</div>`;
  const hurt={}; SEA.talent.active(my).forEach(e=>hurt[e.idx]=e);
  const R=SEA.roster[my];
  const avg=Math.round(POS.reduce((s,P,i)=>s+R[i].r,0)/POS.length);
  let h=coachMark("roster","Each position shows your starter and the man behind him. Featuring gives a player the ball more and speeds his development. You can also hand the job to a backup \u2014 costly now if he isn't ready, but he develops far faster once he's playing.");
  const F=(S.featured!==null&&S.featured!==undefined)?R[S.featured]:null;
  h+=`<div class="note">${F?`Featuring <b>${esc(F.n)}</b>${F.c>=3
      ? " \u2014 a senior, so you get the boost but he graduates before the development lands."
      : F.pot-F.r<4 ? " \u2014 he's near his ceiling, so there's little development left."
      : " \u2014 room to grow, and far likelier to stay than declare early."}`
      :"Nobody featured. Tap a starter to feature him."}</div>`;
  h+=`<div class="grouphead">Two deep &middot; starters average ${avg}</div>`;
  h+=POS.map((P,i)=>{
    const s=R[i], b=R[BK(i)], inj=hurt[i];
    const feat=S.featured===i;
    const tag=p=>`${LEAGUE.classes[p.c]}${p.pot>p.r?" &middot; ceiling "+p.pot:" &middot; at ceiling"}`;
    return `<div class="depth ${inj?'out':''}">
      <div class="dpos">${esc(P.p)}</div>
      <div class="dbody">
        <div class="prow2 ${feat?'feat':''}" data-feat="${i}">
          <div class="pmain"><div class="pname">${esc(s.n)}
            ${inj?`<span class="outtag">OUT ${inj.w}w</span>`:`<span class="startag">STARTER</span>`}
            ${feat?`<span class="feattag">FEATURED</span>`:""}</div>
            <div class="psub">${tag(s)}${s.c>=3?" &middot; <span class='gradtag'>graduates</span>":
              (s.c>=2&&s.r>=76?" &middot; <span class='draftag'>draft risk</span>":"")}</div></div>
          ${starBar(s.r)}<span class="prate">${s.r}</span></div>
        ${s.st2&&s.st2.g?`<div class="sline2">${esc(statLine(P.p,s.st2))}</div>`:""}
        <div class="prow2 bk">
          <div class="pmain"><div class="pname sm">${esc(b.n)}</div>
            <div class="psub">${tag(b)} &middot; ${s.r-b.r>0?(s.r-b.r)+" behind":"even"}</div></div>
          <button class="promo" data-promo="${i}">Start him</button>
          <span class="prate sm">${b.r}</span></div>
      </div></div>`;
  }).join("");
  const hz=SEA.mvpRace(30).filter(x=>x.t===my);
  if(hz.length){
    h+=`<div class="grouphead">In the ${LEAGUE.awards.mvp} conversation</div>`;
    h+=hz.map(x=>`<div class="frow"><div class="fmain"><div class="fname">${esc(x.n)}</div>
      <div class="fnote">${esc(x.p)} &middot; ${esc(x.line||"")}</div></div></div>`).join("");
  }
  return h;
}

function myTeamView(){
  const my=S.myTeam, rk=SEA.poll.rankMap();
  const inj=SEA.talent.active(my);
  let h=wide?"":heroResult();
  const co=U&&U.coach?U.coach[my]:null;
  h+=`<div class="subtabs">${[["overview","Overview"],["roster","Roster"]].map(([k,l])=>
    `<button class="subtab" data-m="${k}" aria-pressed="${teamTab===k}">${l}</button>`).join("")}</div>`;
  if(teamTab==="roster")return h+rosterView();
  if(!wide){h+=teamCardHTML(my,rk,co)+(reveal==="half"?"":attentionHTML(my))+injuryHTML(inj)+
    (reveal==="half"?"":nextUpHTML(my,rk))}
  h+=(reveal==="half"?"":seasonLogHTML(my));
  return h;
}

function teamCardHTML(my,rk,co){
  let h=`<div class="idcard" style="--tc:${teamInk(my)};border-left:4px solid ${teamInk(my)}">
    <div class="iname" style="color:${teamInk(my)}">${esc(my)}</div>
    <div class="imeta">${esc(LEAGUE.conf.names[CONF[my]])} &middot; ${SEA.year} season</div>
    <div class="stats">
      <div><b>${(()=>{const r=liveRec(my);return r[0]+"-"+r[1]})()}</b><span>Record</span></div>
      <div><b>${(()=>{const r=liveConf(my);return r[0]+"-"+r[1]})()}</b><span>Conference</span></div>
      <div><b>${reveal==="half"?"&mdash;":(rk[my]<=25?"#"+rk[my]:"NR")}</b><span>Poll</span></div>
    </div>${co?`<div class="coachbar">
      <div class="cleft"><div class="cname">${esc(co.n)}${co.you?' <span class="youtag">YOU</span>':""}</div>
        <div class="cmeta">Head coach &middot; ${co.t<=0?"first season":"year "+(co.t+1)}
        &middot; ${coachGrade(co.q)}</div></div>
      ${seatBadge()}</div>`:""}
    ${(()=>{const O=(SEA.oc&&SEA.oc[my])||(U.oc&&U.oc[my]);
      const D=(SEA.dc&&SEA.dc[my])||(U.dc&&U.dc[my]);
      if(!O||!D)return "";
      const row=(lab,c)=>`<div class="stline"><span class="stlab">${lab}</span>
        <span class="stn">${esc(c.n)}</span><span class="sts">${esc(c.s)}</span>
        <span class="stq ${c.q>=20?'up':c.q<=-20?'dn':''}">${c.q>0?"+":""}${c.q}</span></div>`;
      return `<div class="staffbar">${row("OC",O)}${row("DC",D)}</div>`})()}
    ${(()=>{const e=S.expNow||expectations();
      const w=SEA.rec[my][0],l=SEA.rec[my][1],left=12-(w+l);
      const need=Math.max(0,e.w-w);
      return `<div class="expbar"><span class="etag">${esc(e.t)}</span>
        <span class="eline">${w+l===0?esc(e.l)
          :need===0?`Target of ${e.w} wins already met.`
          :need>left?`${e.w} wins is out of reach now.`
          :`${need} more win${need===1?"":"s"} from the ${e.w} expected.`}</span></div>`})()}
    </div>`;
  return h;
}

function injuryHTML(inj){
  let h="";
  if(inj.length){
    h+=`<div class="grouphead">Injury report</div>`;
    h+=inj.map(e=>`<div class="injrow"><span class="ipos">${esc(e.k)}</span>
      <div class="iwho"><div class="pname">${esc(e.who||e.k)}</div>
      <div class="psub">out ${e.w} more week${e.w===1?"":"s"}${
        e.rating?" &middot; rated "+e.rating:""}</div></div>
      <span class="imag">${Math.round(e.m)}</span></div>`).join("");
  }
  return h;
}

function coachMark(key,text){
  S.seen=S.seen||{};
  if(S.seen[key])return "";
  return `<div class="mark" data-mark="${key}"><b>New:</b> ${text}
    <span class="markx">Got it</span></div>`;
}

function planPickerHTML(wp){
  return `${coachMark("plan","This choice is real. Safe protects a lead, risks give an underdog a puncher's chance. It resets to Balanced each week.")}
  <div class="planbox"><div class="planlab">Your gameplan</div>
    <div class="plans">${Object.keys(PLANS).map(k=>
      `<button class="planbtn" data-plan="${k}" aria-pressed="${plan===k}">
        ${esc(PLANS[k].l)}</button>`).join("")}</div>
    <div class="pland">${esc(PLANS[plan].d)}${
      wp!==null&&wp<0.35&&plan!=="aggressive"?" &mdash; as a big underdog, chaos is your friend.":
      wp!==null&&wp>0.75&&plan!=="safe"?" &mdash; you're the favourite; variance is your enemy.":""}</div>
  </div>`;
}

/* Things worth your attention right now. */
function attentionHTML(my){
  if(SEA.phase!=="week"||!SEA.roster)return "";
  const R=SEA.roster[my], out=[];
  const hurt={}; SEA.talent.active(my).forEach(e=>hurt[e.idx]=e);
  POS.forEach((P,i)=>{
    const s=R[i], b=R[BK(i)];
    if(!s||!b||hurt[i])return;
    if(b.r>s.r+2)out.push({k:"depth",i:i,
      h:`${b.n} has passed ${s.n} at ${P.p}`,
      b:`${b.r} to ${s.r}. He's ready.`});
    else if(b.r>=s.r-1&&b.c<s.c&&b.pot>s.pot+6)out.push({k:"depth",i:i,
      h:`${b.n} is level with ${s.n} at ${P.p}`,
      b:`Younger, ceiling of ${b.pot}. Playing him now speeds him up.`});
  });
  const w=SEA.rec[my][0], l=SEA.rec[my][1];
  const exp=S.expNow||expectations();
  const shortfall=(w+l)>=4 && l>=3 && (w/(w+l))<0.5;
  ["oc","dc"].forEach(side=>{
    const st=side==="oc"?SEA.oc:SEA.dc;
    if(!st||!st[my]||st[my].interim||SEA.midFired[side])return;
    if(!shortfall&&st[my].q>-25)return;
    out.push({k:"staff",side:side,
      h:`Your ${side==="oc"?"offensive":"defensive"} coordinator is under fire`,
      b:`${st[my].n} &mdash; ${coordGrade(st[my].q)}. An interim would be replacement level;
        you'd hire properly in the offseason.`});
  });
  if(!out.length)return "";
  return `<div class="grouphead">Needs a decision</div>`+
    out.slice(0,3).map(x=>`<div class="attn">
      <div class="attnmain"><div class="fname">${esc(x.h)}</div>
      <div class="cdesc">${x.b}</div></div>
      ${x.k==="depth"?`<button class="attnbtn" data-promo="${x.i}">Start him</button>`
        :`<button class="attnbtn flag" data-fire="${x.side}">Make a change</button>`}
    </div>${(()=>{const s=staffAside(x.k,(SEA.step||0)+(x.i||0));
      return s?`<div class="say tight"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`:""})()}`).join("");
}

function nextUpHTML(my,rk){
  let h="";
  if(SEA.phase!=="week"&&SEA.phase!=="done"){
    const pn=SEA.postNext(my);
    if(pn){
      const wp=pn.opp?winProb(my,pn.opp,false,true):null;
      h+=`<div class="grouphead">Next up</div>
        <div class="nextcard"><div class="nlabel">${esc(pn.label.toUpperCase())}</div>
        <div class="nopp">${pn.opp?rkTag(rk[pn.opp])+TL(pn.opp):"Opponent TBD"}</div>
        <div class="nrec">${pn.opp?SEA.rec[pn.opp][0]+"-"+SEA.rec[pn.opp][1]
          +" &middot; "+esc(LEAGUE.conf.names[CONF[pn.opp]])
          :"Matchup set when the round is played"}</div>
        ${wp!==null?`<div class="odds"><span class="obar"><i style="width:${(wp*100).toFixed(0)}%"></i></span>
          <span class="opct">${Math.round(wp*100)}%</span>
          <span class="olab">win probability</span></div>`:""}
        ${planPickerHTML(wp)}</div>`;
    }
    return h;
  }
  const ng=SEA.nextGame(my);
  if(!ng&&SEA.phase==="week"){
    h+=`<div class="grouphead">Next up &mdash; ${esc(LEAGUE.dates[SEA.step]||"")}</div>
      <div class="nextcard bye"><div class="nlabel">OPEN DATE</div>
      <div class="byeowl">${owlSVG("owlmini",false)}</div>
      <div class="nopp">Bye week</div>
      <div class="nrec">No game &mdash; everyone else plays on</div></div>`;
  }
  if(ng){
    const opp=ng.home===my?ng.away:ng.home;
    const wp=winProb(my,opp,ng.home===my,ng.neutral);
    const st=stakesFor(ng);
    const riv=LEAGUE.rivals.name(my,opp);
    const ser=riv?LEAGUE.rivals.series(U,my,opp):null;
    h+=`<div class="grouphead">Next up &mdash; ${esc(LEAGUE.dates[SEA.step]||"")}</div>
      <div class="nextcard ${riv?'riv':''}">
      <div class="nlabel">${ng.home===my?"HOME vs":"AWAY at"}</div>
      <div class="nopp">${rkTag(rk[opp])}${TL(opp)}</div>
      <div class="nrec">${SEA.rec[opp][0]}-${SEA.rec[opp][1]} &middot; ${esc(LEAGUE.conf.names[CONF[opp]])}</div>
      ${ng.home!==my&&!ng.neutral?`<div class="venue">Road game at ${esc(opp)} &mdash;
        ${esc(venueLabel((SEA.hfa&&SEA.hfa[opp])||LEAGUE.tuning.hfa))}.</div>`:""}
      ${ser?`<div class="series"><b>${ser.w}-${ser.l}</b> in the series${
        ser.streak&&ser.streak.n>1?` &middot; ${ser.streak.team===my
          ? "you've won "+ser.streak.n+" straight"
          : esc(ser.streak.team)+" has won "+ser.streak.n+" straight"}`:""}
        ${ser.games[0]?` &middot; last year ${ser.games[0].w===my?"you won":esc(ser.games[0].w)+" won"} ${ser.games[0].s}`:""}
      </div>`:""}
      <div class="odds"><span class="obar"><i style="width:${(wp*100).toFixed(0)}%"></i></span>
        <span class="opct">${Math.round(wp*100)}%</span>
        <span class="olab">win probability</span></div>
      ${st.map(x=>`<div class="stake"><span class="stag">${esc(x.tag)}</span>
        <span class="sline">${x.l}</span></div>`).join("")}
      ${planPickerHTML(wp)}</div>`;
  }
  return h;
}

/* Whole slate: results where played, fixtures where not. */
function scheduleHTML(team,compact){
  const rows=[];
  for(let w=0;w<LEAGUE.weeks;w++){
    const W=SEA.weeks[w];
    const played=!!W;
    const g=played?W.games.find(x=>x.home===team||x.away===team)
                  :SEA.sched.find(x=>x.week===w&&(x.home===team||x.away===team));
    const label=`Wk ${w+1}`;
    if(!g){rows.push(`<div class="srow byerow"><span class="spos">&ndash;</span>
      <span class="steam">Bye week</span><span class="sconf byelbl">${label}</span></div>`);continue}
    const opp=g.home===team?g.away:g.home;
    const rk=SEA.poll.rankMap()[opp];
    const riv=LEAGUE.rivals.name(team,opp);
    if(played){
      const won=g.winner===team;
      const ms=g.home===team?g.hp:g.ap, os=g.home===team?g.ap:g.hp;
      rows.push(`<div class="srow"><span class="spos ${won?'wl-w':'wl-l'}">${won?"W":"L"}</span>
        <span class="steam">${g.home===team?"vs":"at"} ${rkTag(g.home===team?g.arank:g.hrank)}${TL(opp)}${
          riv?` <em class="rivmark">${esc(riv)}</em>`:""}</span>
        <span class="sconf">${ms}-${os}</span></div>`);
    }else{
      rows.push(`<div class="srow up"><span class="spos">${label.replace("Wk ","")}</span>
        <span class="steam">${g.home===team?"vs":"at"} ${rkTag(rk)}${TL(opp)}${
          riv?` <em class="rivmark">${esc(riv)}</em>`:""}</span>
        <span class="sall">${esc(LEAGUE.dates[w]||"")}</span></div>`);
    }
  }
  // postseason
  const post=[];
  SEA.titles.forEach(g=>{if(g.home===team||g.away===team)post.push([g,g.title])});
  SEA.bowls.forEach(g=>{if(g.home===team||g.away===team)post.push([g,g.title])});
  [["First Round",SEA.rounds.r1],["Quarterfinal",SEA.rounds.qf],
   ["Semifinal",SEA.rounds.sf],["National Championship",SEA.rounds.fin]]
   .forEach(([n,gs])=>gs.forEach(g=>{if(g.home===team||g.away===team)post.push([g,n])}));
  post.forEach(([g,n])=>{
    const won=g.winner===team, opp=g.home===team?g.away:g.home;
    const ms=g.home===team?g.hp:g.ap, os=g.home===team?g.ap:g.hp;
    rows.push(`<div class="srow post"><span class="spos ${won?'wl-w':'wl-l'}">${won?"W":"L"}</span>
      <span class="steam">${esc(opp)} <em class="rivmark sod">${esc(n)}</em></span>
      <span class="sconf">${ms}-${os}</span></div>`);
  });
  return rows.join("");
}

function seasonLogHTML(my){
  return `<div class="grouphead">${SEA.year} schedule</div>`+scheduleHTML(my);
}

function expectations(){
  const my=S.myTeam, p=U?U.program[my]:1500;
  const last=S.history.length?S.history[S.history.length-1]:null;
  if(p>=1860)return {w:11,l:"A playoff berth. Anything less is a disappointment.",t:"PLAYOFF OR BUST"};
  if(p>=1700)return {w:9,l:"Nine wins and a New Year's bowl. Contend in the conference.",t:"CONTEND"};
  if(p>=1540)return {w:8,l:"Eight wins and a decent bowl. Beat someone you shouldn't.",t:"PUSH FORWARD"};
  if(p>=1400)return {w:6,l:"Get to a bowl game. Six wins keeps everyone happy.",t:"BOWL ELIGIBLE"};
  return {w:4,l:"Show progress. Four wins would be real movement here.",t:"BUILD SOMETHING"};
}

function seasonGrade(wins,losses,result,exp){
  let s=(wins-exp.w)*1.0;
  if(/NATIONAL/i.test(result))s+=5;
  else if(/title game/i.test(result))s+=3;
  else if(/semifinal/i.test(result))s+=2.4;
  else if(/quarterfinal/i.test(result))s+=1.8;
  else if(/first round|Playoff/i.test(result))s+=1.4;
  else if(/^Won the/.test(result))s+=0.8;
  else if(/^Lost the/.test(result))s+=0.2;
  else if(/No bowl|Losing season/.test(result))s-=(exp.w>=6?1.0:0.2);
  const g=s>=4?"A+":s>=2.6?"A":s>=1.6?"A-":s>=0.9?"B+":s>=0.2?"B":s>=-0.6?"B-":
          s>=-1.4?"C+":s>=-2.2?"C":s>=-3.2?"C-":s>=-4.4?"D":"F";
  const l=s>=2.6?"Far beyond what anyone expected.":
          s>=0.9?"Ahead of schedule.":
          s>=-0.6?"About what was expected.":
          s>=-2.2?"Short of the mark.":
          "A bad year, and everyone knows it.";
  return {g:g,l:l};
}

function milestones(wins,losses,result,rank){
  const my=S.myTeam, out=[], H=S.history;
  const mine=H.map(h=>h.teams&&h.teams[my]?h.teams[my]:null).filter(Boolean);
  if(!mine.length){
    if(wins>=11)out.push(`${wins} wins in your first season in charge.`);
    return out;
  }
  const bestW=Math.max(...mine.map(r=>r[0]));
  const bestR=Math.min(...mine.map(r=>r[2]));
  if(wins>bestW)out.push(`Best season of your tenure &mdash; ${wins} wins, past the old high of ${bestW}.`);
  if(rank<bestR&&rank<=25)out.push(`Highest finish yet at No. ${rank}.`);
  if(/NATIONAL/i.test(result)&&!H.some(h=>h.champion===my))
    out.push(`First national title of your tenure.`);
  let streak=0;
  for(let i=mine.length-1;i>=0;i--){if(mine[i][0]>mine[i][1])streak++;else break}
  if(wins>losses&&streak+1>=5)out.push(`${streak+1} straight winning seasons.`);
  if(losses>=9&&wins<=3)out.push(`Worst season in ${mine.length+1} years. That will be remembered.`);
  return out;
}

/* ============ weekly news desk ============ */
function loserRank(g){return g.winner===g.home?g.arank:g.hrank}
function winnerRank(g){return g.winner===g.home?g.hrank:g.arank}
function scoreOf(g,t){return g.home===t?g.hp:g.ap}
function oppOf(g,t){return g.home===t?g.away:g.home}

function weekNews(W){
  const my=S.myTeam, items=[];
  const gs=W.games;
  const rankTxt=r=>r&&r<=25?"No. "+r+" ":"";

  // headline: the best ranked team to go down
  const ups=gs.filter(g=>loserRank(g)<=25&&winnerRank(g)>loserRank(g))
              .sort((a,b)=>loserRank(a)-loserRank(b));
  if(ups.length){
    const g=ups[0], L=g.loser, Wn=g.winner;
    const lr=loserRank(g), wr=winnerRank(g);
    const verb=g.margin>=21?"routed":g.margin<=3?"edged":"beat";
    items.push({p:90,k:"upset",tone:"flag",
      h:`${rankTxt(wr)}${Wn} ${verb} ${rankTxt(lr)}${L}, ${Math.max(g.hp,g.ap)}-${Math.min(g.hp,g.ap)}`,
      b: lr<=5 ? `A top-five team is down. ${L} won't drop out, but the margin for error is gone.`
        : wr>25 ? `${Wn} came in unranked. ${L} will pay for this one in the poll.`
        : `${Wn} moves up; ${L} slides.`});
  }
  // other ranked casualties
  const more=ups.slice(1,3);
  if(more.length)items.push({p:40,k:"also",tone:"muted",
    h:`Also down: ${more.map(g=>rankTxt(loserRank(g))+g.loser).join(", ")}`,
    b:`${more.length===1?"That's":"Those are"} more cracks in the top 25.`});

  // your team, framed
  const mg=gs.find(g=>g.home===my||g.away===my);
  if(mg){
    const won=mg.winner===my, opp=oppOf(mg,my);
    const ms=scoreOf(mg,my), os=scoreOf(mg,opp);
    const oppR=mg.home===my?mg.arank:mg.hrank;
    let b;
    if(won&&oppR<=25)b=`A ranked scalp. That plays well with voters.`;
    else if(won&&mg.margin>=28)b=`Never in doubt.`;
    else if(won&&mg.margin<=3)b=`Survived. They won't all look like that.`;
    else if(won)b=`Business handled.`;
    else if(oppR<=10)b=`No shame in it, but the résumé takes a hit.`;
    else if(oppR>25)b=`That is the kind of loss that follows you into December.`;
    else b=`A setback.`;
    items.push({p:100,k:"you",tone:"gold",
      h:`${my} ${won?"beat":"lost to"} ${rankTxt(oppR)}${opp}, ${ms}-${os}`,b:b});
  }else{
    items.push({p:100,k:"you",tone:"muted",h:`${my} was idle`,
      b:`An open date. Everyone else kept playing.`});
  }

  // who's left unbeaten
  const unb=NAMES.filter(t=>SEA.rec[t][1]===0&&SEA.rec[t][0]>0);
  if(unb.length&&SEA.step>=4){
    unb.sort((x,y)=>SEA.poll.rankMap()[x]-SEA.poll.rankMap()[y]);
    items.push({p:50,k:"unbeaten",tone:"muted",
      h:unb.length===1?`${unb[0]} stands alone at ${SEA.rec[unb[0]][0]}-0`
        :`${unb.length} teams still unbeaten`,
      b:unb.slice(0,6).join(", ")+(unb.length>6?" and others":"")+"."});
  }

  // rivalry, with the series behind it
  const rivG=gs.filter(g=>LEAGUE.rivals.name(g.home,g.away))
    .sort((x,y)=>Math.min(x.hrank||999,x.arank||999)-Math.min(y.hrank||999,y.arank||999))[0];
  if(rivG){
    const nm=LEAGUE.rivals.name(rivG.home,rivG.away);
    const ser=LEAGUE.rivals.series(U,rivG.winner,rivG.loser);
    let b=`${rivG.winner} keeps ${nm}.`;
    if(ser&&ser.streak&&ser.streak.n>=2)
      b=`${ser.streak.team} has now won ${ser.streak.n} straight in ${nm}.`;
    else if(ser)b=`${ser.w}-${ser.l} in the series.`;
    items.push({p:85,k:"riv",tone:"flag",
      h:`${rivG.winner} takes ${nm}, ${Math.max(rivG.hp,rivG.ap)}-${Math.min(rivG.hp,rivG.ap)}`,b:b});
  }

  // performance of the week
  if(SEA.roster){
    let best=null;
    NAMES.forEach(t=>{
      SEA.roster[t].forEach((pl,i)=>{
        if(!pl||!pl.last||pl.last.week!==SEA.step-1)return;
        const L=pl.last.line, P=pl.last.pos;
        let v=0,txt="";
        if(P==="QB"&&L.pyd>=300){v=L.pyd+L.ptd*45;txt=`${L.pyd} yards and ${L.ptd} touchdown${L.ptd===1?"":"s"}`}
        else if(P==="RB"&&L.ryd>=150){v=L.ryd*1.5+L.rtd*45;txt=`${L.ryd} rushing yards and ${L.rtd} score${L.rtd===1?"":"s"}`}
        else if((P==="WR"||P==="WR2")&&L.cyd>=140){v=L.cyd*1.6+L.ctd*45;
          txt=`${L.rec} catch${L.rec===1?"":"es"} for ${L.cyd} yards`}
        else if(P==="EDGE"&&L.sck>=2){v=L.sck*90;txt=`${L.sck} sack${L.sck===1?"":"s"}`}
        else if((P==="CB"||P==="S")&&L.ints>=2){v=L.ints*95;txt=`${L.ints} interception${L.ints===1?"":"s"}`}
        if(v&&(!best||v>best.v))best={v:v,n:pl.n,t:pl.last.team,p:P,txt:txt};
      });
    });
    if(best)items.push({p:best.t===my?88:62,k:"star",tone:best.t===my?"gold":"muted",
      h:`${best.n} goes for ${best.txt}`,
      b:`The ${best.p} carried ${best.t}${best.t===my?" \u2014 your guy.":"."}`});
  }

  // a team on a run
  const st=streakOf(my);
  if(st.n>=4)items.push({p:80,k:"run",tone:st.won?"gold":"flag",
    h:st.won?`${my} has won ${st.n} in a row`:`${my} has lost ${st.n} straight`,
    b:st.won?`Nobody wants to see you right now.`:`Something has to change.`});

  // biggest beating
  const blow=gs.slice().sort((a,b)=>b.margin-a.margin)[0];
  if(blow&&blow.margin>=38)items.push({p:30,k:"blowout",tone:"muted",
    h:`${blow.winner} ${Math.max(blow.hp,blow.ap)}, ${blow.loser} ${Math.min(blow.hp,blow.ap)}`,
    b:`The week's worst mismatch.`});

  // injury desk
  if(SEA.roster){
    const hurt=[];
    NAMES.forEach(t=>{
      const rk=SEA.poll.rankMap()[t];
      if(rk>30)return;
      SEA.talent.log[t].forEach(x=>{
        if(x.kind==="injury"&&x.wk===SEA.step&&x.who)
          hurt.push({t:t,rk:rk,who:x.who,p:x.what,w:x.weeks});
      });
    });
    hurt.sort((a,b)=>a.rk-b.rk);
    if(hurt.length){const x=hurt[0];
      items.push({p:70,k:"inj",tone:"flag",
        h:`${rankTxt(x.rk)}${x.t} loses ${x.who} (${x.p})`,
        b:`Out ${x.w>=14?"for the season":"about "+x.w+" week"+(x.w===1?"":"s")}.`+
          (hurt.length>1?` ${hurt.length-1} other ranked team${hurt.length>2?"s":""} took a hit too.`:"")});
    }
  }

  // heisman watch
  if(SEA.step>=6&&SEA.roster){
    const hz=SEA.mvpRace(2);
    if(hz.length)items.push({p:55,k:"heis",tone:"muted",
      h:`${LEAGUE.awards.mvp} watch: ${hz[0].n}, ${LEAGUE.classes[hz[0].c]} ${hz[0].p}, ${hz[0].t}`,
      b:`${hz[0].line||""}${hz[1]?" \u00b7 "+hz[1].n+" ("+hz[1].t+") is closest.":""}`});
  }
  items.sort((x,y)=>(y.p||0)-(x.p||0));
  return items;
}

function newsBlock(){
  const W=SEA.weeks[SEA.weeks.length-1];
  if(!W||!W.games.length)return "";
  const items=weekNews(W).slice(0,6);
  if(!items.length)return "";
  return `<div class="grouphead">The week that was</div>`+
    items.map(x=>`<div class="news ${x.tone}">
      <div class="nh">${esc(x.h)}</div>${x.b?`<div class="nb">${esc(x.b)}</div>`:""}
    </div>`).join("");
}

/* ============ playoff picture ============ */
function scoresView(){
  if(!SEA.weeks.length&&!SEA.field.length)
    return `<div class="note">The season hasn't started. Hit the button below to play Week 1.</div>`;
  const pv=LEAGUE.ui.postseasonView(); if(pv)return pv;
  const W=SEA.weeks[SEA.weeks.length-1];
  if(!W)return `<div class="note">No games yet.</div>`;
  const marq=W.games.filter(g=>Math.min(g.hrank||999,g.arank||999)<=25);
  const rest=W.games.filter(g=>Math.min(g.hrank||999,g.arank||999)>25);
  let h=`<div class="dateline"><h2>${esc(W.label)}</h2><span>${esc(W.date||"")}</span></div>`;
  h+=newsBlock();
  if(marq.length)h+=`<div class="grouphead">Ranked teams</div>`+
    marq.map(g=>gameLine(g,g.home===S.myTeam||g.away===S.myTeam)).join("");
  if(rest.length)h+=`<div class="grouphead">Around the country &mdash; ${rest.length} games</div>`+
    `<div class="${wide?'gamegrid':''}">`+
    rest.map(g=>gameLine(g,g.home===S.myTeam||g.away===S.myTeam)).join("")+`</div>`;
  return h;
}

function standingsView(){
  const st=SEA.weeks.length?SEA.weeks[SEA.weeks.length-1].standings:SEA.standings(null);
  let h=`<div class="dateline"><h2>Standings</h2><span>${SEA.year}</span></div>`;
  const mine=CONF[S.myTeam];
  const order=LEAGUE.conf.order.filter(c=>c===mine).concat(LEAGUE.conf.order.filter(c=>c!==mine));
  if(wide)h+=`<div class="standgrid">`;
  order.forEach(c=>{
    const head=`<div class="srow shead"><span class="spos">#</span>
      <span class="dot" style="opacity:0"></span>
      <span class="steam">Team</span><span class="sconf">Conf</span>
      <span class="sall">Overall</span></div>`;
    const row=(r,i,mark)=>`<div class="srow ${r.team===S.myTeam?'mine':''}">
      <span class="spos ${mark?'qual':''}">${i+1}</span>
      <span class="dot" style="background:${teamColor(r.team)}"></span>
      <span class="steam">${rkTag(r.rank)}${TL(r.team)}</span>
      <span class="sconf">${r.cr}</span><span class="sall">${r.rec}</span></div>`;
    h+=`<div class="cbox"><div class="chead">${esc(LEAGUE.conf.names[c])}</div>`;
    if(hasDivisions(c)){
      const div={};
      st[c].forEach(r=>{const d=divisionOf(U,r.team)||"East";(div[d]=div[d]||[]).push(r)});
      Object.keys(div).sort().forEach(dn=>{
        h+=`<div class="divhead">${esc(dn)} Division</div>`+head;
        h+=div[dn].map((r,i)=>row(r,i,i===0)).join("");
      });
    }else{
      h+=head+st[c].map((r,i)=>row(r,i,i<2)+(i===1?`<div class="divider"></div>`:"")).join("");
    }
    h+=`</div>`;
  });
  if(wide)h+=`</div>`;
  h+=`<div class="note">Conference record, then overall. Amber marks who would play for the
    title &mdash; the top two, or each division winner in the Sun Belt, the one conference
    still split into divisions.</div>`;
  return h;
}

let dynTab="program", dynTeam=null, dynQ="", league=null, leagueMsg="";
let dynCoach=null, coachQ="";

function coachRows(){
  if(!U||!U.coach)return [];
  return coachTable(U);
}

function coachCard(c){
  const grade=coachGrade(c.q);
  const pct=(c.w+c.l)?(c.w/(c.w+c.l)).toFixed(3).replace(/^0/,""):"\u2013";
  let h=`<div class="idcard" style="border-left:4px solid ${c.you?"var(--vote)":teamInk(c.team)}">
    <div class="iname" style="color:${c.you?"var(--vote)":teamInk(c.team)}">${esc(c.n)}</div>
    <div class="imeta">${c.you?"You &middot; ":""}head coach, ${esc(c.team)} &middot; year ${c.t+1}
      &middot; ${esc(grade)}</div>
    <div class="stats">
      <div><b>${c.w}-${c.l}</b><span>Career</span></div>
      <div><b>${pct}</b><span>Win %</span></div>
      <div><b>${c.titles}</b><span>Titles</span></div>
      <div><b>${c.confs}</b><span>Conf</span></div>
    </div></div>`;
  if(c.stops&&c.stops.length){
    h+=`<div class="grouphead">Coaching stops</div>`;
    h+=c.stops.slice().reverse().map(s=>`<div class="stop" style="padding:9px 16px">
      <span class="dot" style="background:${teamColor(s.team)}"></span>
      <span class="stopteam">${TL(s.team)}</span>
      <span class="stopyr">${s.from}${s.to>s.from?"\u2013"+s.to:""}</span>
      <span class="stoprec">${s.w}-${s.l}${s.titles?" \u00b7 "+s.titles+"\u00d7":""}</span></div>`).join("");
  }else{
    h+=`<div class="note">No completed seasons at this job yet.</div>`;
  }
  return h;
}

function coachesView(){
  const my=S.myTeam;
  if(dynCoach){
    const c=coachRows().find(x=>x.team===dynCoach);
    if(c)return `<button class="backbtn" id="cback">&larr; All coaches</button>`+coachCard(c);
    dynCoach=null;
  }
  const ql=coachQ.trim().toLowerCase();
  let rows=coachRows().filter(c=>!ql||c.n.toLowerCase().includes(ql)||c.team.toLowerCase().includes(ql));
  rows.sort((a,b)=>b.titles-a.titles||b.confs-a.confs||(b.w-b.l)-(a.w-a.l));
  let h=`<div class="seedrow"><input id="cfind" class="seedbox findbox"
    placeholder="Search coaches or programs..." value="${esc(coachQ)}"></div>`;
  h+=`<div class="grouphead">${rows.length} head coaches &middot; ranked by what they've won</div>`;
  h+=rows.slice(0,60).map(c=>`<div class="frow cpick ${c.you?'mine':''}" data-coach="${esc(c.team)}">
    <span class="dot" style="background:${teamColor(c.team)}"></span>
    <div class="fmain"><div class="fname">${esc(c.n)}${c.you?' <span class="youtag">YOU</span>':''}</div>
    <div class="fnote">${esc(c.team)} &middot; year ${c.t+1}${
      c.stops&&c.stops.length>1?" &middot; "+c.stops.length+" jobs":""}</div></div>
    <div class="tstat"><span class="trec">${c.w}-${c.l}</span>
    <span class="trk">${c.titles?c.titles+"\u00d7 natl":(c.confs?c.confs+"\u00d7 conf":"")}</span></div></div>`).join("");
  if(rows.length>60)h+=`<div class="note">Showing 60. Search to narrow.</div>`;
  return h;
}

function openTeam(t){
  if(!t||!CONF[t])return;
  view="dyn"; dynTab="teams"; dynTeam=t; flash=null; save(); render();
  window.scrollTo({top:0});
}
const TL=t=>`<span class="tlink" data-team="${esc(t)}">${esc(t)}</span>`;

function sanitizeKey(s){return String(s).replace(/[^A-Za-z0-9_-]/g,"").slice(0,24)||"coach"}

async function postSeason(){
  const C=S.career, last=S.history[S.history.length-1];
  if(!last){leagueMsg="Finish a season first.";render();return}
  const key="lg-"+S.seed+"-"+sanitizeKey(C.name);
  const row={coach:C.name,team:S.myTeam,seed:S.seed,year:last.year,rec:last.rec,
    rank:last.rank,result:last.result,grade:last.grade,
    titles:C.titles,cw:C.w,cl:C.l,rep:Math.round(C.rep),at:Date.now()};
  try{
    await window.storage.set(key,JSON.stringify(row),true);
    leagueMsg="Posted "+last.year+".";
    await loadLeague();
  }catch(e){leagueMsg="Couldn't post right now.";render()}
}

async function loadLeague(){
  try{
    const r=await window.storage.list("lg-",true);
    const keys=(r&&r.keys)?r.keys:[];
    const rows=[];
    for(const k of keys.slice(0,80)){
      try{const v=await window.storage.get(k,true); if(v&&v.value)rows.push(JSON.parse(v.value))}
      catch(e){}
    }
    league=rows;
  }catch(e){league=[]; leagueMsg="Shared table unavailable here."}
  render();
}

function leagueView(){
  const my=S.myTeam;
  let h=`<div class="note">Post your season to a table everyone using this game can see.
    Friends on the <b>same world seed</b> are playing the identical universe, so those rows
    are directly comparable. <b>Anything you post is public.</b></div>`;
  h+=`<div class="lgbtns"><button class="advance" id="lgpost">Post ${
    S.history.length?S.history[S.history.length-1].year:"season"}</button>
    <button class="introskip wide" id="lgload">Refresh table</button></div>`;
  if(leagueMsg)h+=`<div class="lgmsg">${esc(leagueMsg)}</div>`;
  if(league===null)return h+`<div class="note">Tap refresh to load.</div>`;
  if(!league.length)return h+`<div class="note">Nothing posted yet.</div>`;
  const mine=league.filter(r=>r.seed===S.seed);
  const other=league.filter(r=>r.seed!==S.seed);
  const row=r=>`<div class="frow ${r.coach===S.career.name&&r.team===my?'mine':''}">
    <span class="dot" style="background:${teamColor(r.team)}"></span>
    <div class="fmain"><div class="fname">${esc(r.coach)}</div>
    <div class="fnote">${esc(r.team)} &middot; ${r.year} &middot; ${esc(r.result||"")}</div></div>
    <div class="tstat"><span class="trec">${esc(r.rec)}</span>
    <span class="trk">${r.grade||""}${r.titles?" \u00b7 "+r.titles+"\u00d7":""}</span></div></div>`;
  const sortf=(a,b)=>(b.titles-a.titles)||(parseInt(b.rec)-parseInt(a.rec));
  if(mine.length){h+=`<div class="grouphead">Your world &mdash; seed ${S.seed}</div>`;
    h+=mine.sort(sortf).map(row).join("")}
  if(other.length){h+=`<div class="grouphead">Other worlds</div>`;
    h+=other.sort(sortf).slice(0,25).map(row).join("")}
  return h;
}

function allTime(t){
  let w=0,l=0,best=999,titles=0,confs=0,cfp=0,pw=0,pl=0,coach=0;
  S.history.forEach(h=>{
    const r=h.teams[t]; if(!r)return;
    w+=r[0]; l+=r[1]; if(r[2]<best)best=r[2];
    if(h.champion===t)titles++;
    if(h.confChamps&&Object.values(h.confChamps).indexOf(t)>=0)confs++;
    if(h.cfp&&h.cfp[t])cfp++;
    if(h.post&&h.post[t]){pw+=h.post[t][0]; pl+=h.post[t][1]}
    else if(h.bowls&&h.bowls[t]){h.bowls[t][0]==="W"?pw++:pl++}
    if(h.firedList&&h.firedList.indexOf(t)>=0)coach++;
  });
  const rk=SEA?SEA.poll.rankMap()[t]:999;
  return {w:w,l:l,best:best===999?null:best,titles:titles,confs:confs,cfp:cfp,
          post:pw+"-"+pl,postGames:pw+pl,coach:coach,now:rk,
          pct:(w+l)?(w/(w+l)):null,seasons:S.history.length};
}

function seasonRowsFor(t){
  return S.history.map(h=>{
    const r=h.teams[t]||[0,0,999];
    const seed=h.cfp?h.cfp[t]:null;
    const bw=h.bowls?h.bowls[t]:null;
    let res;
    if(h.pnote&&h.pnote[t])res=h.pnote[t]+(seed?" \u00b7 No. "+seed+" seed":"");
    else if(h.champion===t)res="National champions";
    else if(seed)res="Playoff, No. "+seed+" seed";
    else if(bw)res=(bw[0]==="W"?"Won the ":"Lost the ")+bw[1];
    else res=r[0]>=6?"No bowl":"Losing season";
    const cc=h.confChamps?Object.keys(h.confChamps).find(c=>h.confChamps[c]===t):null;
    return {year:h.year,rec:r[0]+"-"+r[1],rank:r[2],res:res,grade:(t===S.myTeam?h.grade:null),
            champ:h.champion===t,conf:cc?LEAGUE.conf.names[cc]:null,
            coach:!!(h.firedList&&h.firedList.indexOf(t)>=0)};
  }).reverse();
}

function teamCard(t){
  const rows=seasonRowsFor(t);
  const A=allTime(t);
  const orig=S.origProgram?Math.round(S.origProgram[t]):null;
  const now=U?Math.round(U.program[t]):null;
  const d=(orig!==null&&now!==null)?now-orig:0;
  const base=S.history.length?S.history[0].year:SEA.year;
  let h=`<div class="idcard" style="border-left:4px solid ${teamInk(t)}">
    <div class="iname" style="color:${teamInk(t)}">${esc(t)}</div>
    <div class="imeta">${esc(LEAGUE.conf.names[CONF[t]])} &middot; currently
      ${A.now<=25?"ranked #"+A.now:"unranked ("+A.now+"th)"}</div>
    <div class="stats">
      <div><b>${A.w}-${A.l}</b><span>All-time</span></div>
      <div><b>${A.pct!==null?A.pct.toFixed(3).replace(/^0/,""):"\u2013"}</b><span>Win %</span></div>
      <div><b>${A.best?"#"+A.best:"\u2013"}</b><span>Best finish</span></div>
    </div>
    <div class="stats">
      <div><b>${A.titles}</b><span>Titles</span></div>
      <div><b>${A.confs}</b><span>Conf</span></div>
      <div><b>${A.cfp}</b><span>Playoffs</span></div>
      <div><b>${A.post}</b><span>Postseason</span></div>
    </div>
    ${U&&U.coach&&U.coach[t]?`<div class="coachbar plain cpick" data-coach="${esc(t)}">
      <div class="cleft"><div class="cname">${esc(U.coach[t].n)}</div>
      <div class="cmeta">Head coach &middot; ${U.coach[t].t<=0?"first season":"year "+(U.coach[t].t+1)}
      &middot; ${coachGrade(U.coach[t].q)}</div></div></div>
      ${U.oc&&U.oc[t]?`<div class="staffbar plain">
        <div class="stline"><span class="stlab">OC</span><span class="stn">${esc(U.oc[t].n)}</span>
          <span class="sts">${esc(U.oc[t].s)}</span></div>
        <div class="stline"><span class="stlab">DC</span><span class="stn">${esc(U.dc[t].n)}</span>
          <span class="sts">${esc(U.dc[t].s)}</span></div></div>`:""}`:""}
    <div class="progline">Program strength since ${base}:
      <b class="${d>0?'up':d<0?'dn':''}">${d>0?"+":""}${d}</b>
      ${A.coach?` &middot; ${A.coach} coaching change${A.coach>1?"s":""}`:""}</div></div>`;
  if(U&&U.series&&LEAGUE.rivals.of[t]){
    const rows=LEAGUE.rivals.of[t].map(x=>LEAGUE.rivals.series(U,t,x.o)?{o:x.o,s:LEAGUE.rivals.series(U,t,x.o)}:null)
                          .filter(Boolean);
    if(rows.length){
      h+=`<div class="grouphead">Rivalries</div>`;
      h+=rows.map(r=>`<div class="frow">
        <span class="dot" style="background:${teamColor(r.o)}"></span>
        <div class="fmain"><div class="fname">vs ${TL(r.o)}</div>
        <div class="fnote">${esc(r.s.name)}${r.s.streak&&r.s.streak.n>1
          ?" &middot; "+esc(r.s.streak.team)+" has won "+r.s.streak.n+" straight":""}</div></div>
        <span class="fcfp ${r.s.w>r.s.l?'up':r.s.w<r.s.l?'dn':''}">${r.s.w}-${r.s.l}</span></div>`).join("");
    }
  }
  h+=rosterOf(t);
  h+=`<div class="grouphead">${SEA.year} schedule</div>`+scheduleHTML(t);
  if(!rows.length)return h+`<div class="note">No completed seasons yet.</div>`;
  const book=(LEAGUE.records&&U)?LEAGUE.records.book(U,t):[];
  const leaders=(LEAGUE.records&&U)?LEAGUE.records.leaders(U,t):[];
  if(leaders.length){
    h+=`<div class="grouphead">Career leaders</div>`;
    h+=`<div class="ldwrap">`+leaders.map(L=>`<div class="ldcat">
      <div class="ldlabel">${esc(L.label)}</div>
      ${L.top.map((x,i)=>`<div class="ldrow ${i===0?'first':''}">
        <span class="ldn">${i+1}</span>
        <span class="ldname">${esc(x.a.n)}</span>
        <span class="ldyr">${x.a.to}</span>
        <span class="ldv">${x.v.toLocaleString()}</span></div>`).join("")}
    </div>`).join("")+`</div>`;
  }
  if(book.length){
    h+=`<div class="grouphead">Record book &mdash; ${book.length} played and left</div>`;
    h+=book.slice(0,12).map(x=>`<div class="arow">
      <div class="fmain"><div class="fname">${esc(x.n)}
        <span class="dpos">${esc(x.p)}</span>
        ${x.early?`<span class="etag">left early</span>`:""}</div>
      <div class="fnote">${x.from}&ndash;${x.to} &middot; ${esc(LEAGUE.records.alumniLine(x))}</div></div>
      <span class="ares ${x.draft?(x.draft.round<=1?'gold':'up'):''}">${
        x.draft?(x.draft.round+"."+String(x.draft.pick).padStart(2,"0")):"\u2013"}</span>
      </div>`).join("");
    if(book.length>12)h+=`<div class="note">Showing the top 12 by draft position.</div>`;
  }
  h+=`<div class="grouphead">Season by season</div>`;
  h+=rows.map((r,i)=>{
    const idx=(t===S.myTeam)?(S.history.length-1-i):-1;
    const has=idx>=0&&S.history[idx]&&S.history[idx].card;
    return `<div class="yrow ${r.champ?'gold':''}">
    <span class="yr">${r.year}</span>
    ${r.grade?`<span class="ygrade">${esc(r.grade)}</span>`:""}
    <div class="ymain"><div class="yrec">${r.rec}
      <span class="yrank">${r.rank<=25?"final #"+r.rank:"unranked"}</span></div>
    <div class="yres">${esc(r.res)}${r.conf?" &middot; "+esc(r.conf)+" champion":""}${
      r.coach?' &middot; <span class="coachtag">new coach hired</span>':""}</div></div>
    ${has?`<button class="ycard" data-card="${idx}" title="Season card">&#8599;</button>`:""}
    </div>`}).join("");
  return h;
}

function dynastyView(){
  const my=S.myTeam;
  let h=`<div class="dateline"><h2>Dynasty</h2>
    <span>${S.history.length} season${S.history.length===1?"":"s"}</span></div>`;
  h+=`<div class="subtabs">${[["program","You"],["coaches","Coaches"],["teams","Teams"],
    ["league","History"],["shared","Online"]].map(([k,l])=>
    `<button class="subtab" data-d="${k}" aria-pressed="${dynTab===k}">${l}</button>`).join("")}</div>`;

  if(dynTab==="program"){
    const C=S.career;
    h+=`<div class="idcard careercard">
      <div class="iname">${esc(C.name)}</div>
      <div class="imeta">You &middot; head coach &middot; ${esc(repGrade(C.rep))}</div>
      <div class="stats">
        <div><b>${C.w}-${C.l}</b><span>Career</span></div>
        <div><b>${C.titles}</b><span>Titles</span></div>
        <div><b>${C.confs}</b><span>Conf</span></div>
        <div><b>${C.fired}</b><span>Fired</span></div>
      </div>
      <div class="grouphead" style="padding:14px 0 6px;border:none">Coaching stops</div>
      ${C.stops.map(s=>`<div class="stop">
        <span class="dot" style="background:${teamColor(s.team)}"></span>
        <span class="stopteam">${esc(s.team)}</span>
        <span class="stopyr">${s.from}${s.to&&s.to>s.from?"\u2013"+s.to:s.to?"":"\u2013"}</span>
        <span class="stoprec">${s.w}-${s.l}${s.titles?" \u00b7 "+s.titles+"\u00d7":""}</span>
      </div>`).join("")}</div>`;
    h+=teamCard(my);
    h+=`<div class="seedrow"><div class="seedbox seedshow">SEED ${S.seed}</div>
      <span class="seedhint">Anyone starting with this seed gets the identical universe.
      Pick a different team and you live the same seasons from another sideline.</span></div>`;
    return h;
  }

  if(dynTab==="teams"){
    if(dynTeam)return h+`<button class="backbtn" id="dback">&larr; All teams</button>`+teamCard(dynTeam);
    h+=`<div class="seedrow"><input id="dfind" class="seedbox findbox"
      placeholder="Search any of 132 programs..." value="${esc(dynQ)}"></div>`;
    const ql=dynQ.trim().toLowerCase();
    const list=NAMES.filter(t=>!ql||t.toLowerCase().includes(ql));
    const cur=SEA?SEA.poll.rankMap():{};
    list.sort((x,y)=>(cur[x]||999)-(cur[y]||999));
    if(!list.length)return h+`<div class="note">No team matches that.</div>`;
    h+=`<div class="note">Tap any program for its roster, schedule and history. You can also
      tap a team name anywhere in the game &mdash; scores, standings, the poll.</div>`;
    h+=`<div class="grouphead">${list.length} programs &middot; ordered by current ranking</div>`;
    h+=list.map(t=>{
      const A=allTime(t);
      const bits=[esc(LEAGUE.conf.names[CONF[t]])];
      if(A.titles)bits.push(A.titles+" title"+(A.titles>1?"s":""));
      if(A.best)bits.push("best #"+A.best);
      return `<div class="frow tpick" data-t="${esc(t)}">
        <span class="dot" style="background:${teamColor(t)}"></span>
        <div class="fmain"><div class="fname">${esc(t)}${t===my?' <span class="youtag">YOU</span>':''}</div>
        <div class="fnote">${bits.join(" &middot; ")}</div></div>
        <div class="tstat"><span class="trec">${A.w}-${A.l}</span>
        <span class="trk">${A.now<=25?"#"+A.now:"NR"}</span></div></div>`;
    }).join("");
    return h;
  }

  if(dynTab==="coaches")return h+coachesView();
  if(dynTab==="shared")return h+leagueView();

  // league history
  if(!S.history.length)return h+`<div class="note">Finish a season and league history builds here.</div>`;
  // live race, once enough of the current season has been played
  if(SEA&&SEA.step>=6&&SEA.roster){
    const hz=SEA.mvpRace(5);
    if(hz.length){
      h+=`<div class="grouphead">${LEAGUE.awards.mvp} race &mdash; ${SEA.year}, week ${Math.min(SEA.step,LEAGUE.weeks)}</div>`;
      h+=hz.map((x,i)=>`<div class="frow ${x.t===my?'mine':''}">
        <span class="sd">${i+1}</span>
        <span class="dot" style="background:${teamColor(x.t)}"></span>
        <div class="fmain"><div class="fname">${esc(x.n)}</div>
        <div class="fnote">${LEAGUE.classes[x.c]} ${esc(x.p)} &middot; ${esc(x.t)} ${x.rec}</div>
        ${x.line?`<div class="sline2 inrow">${esc(x.line)}</div>`:""}</div>
        <span class="fcfp">${x.r}</span></div>`).join("");
    }
  }
  const hw=S.history.filter(x=>x.heis&&x.heis.length);
  if(hw.length){
    h+=`<div class="grouphead">${LEAGUE.awards.mvp} winners</div>`;
    h+=hw.slice().reverse().map(x=>{const w=x.heis[0];
      return `<div class="frow ${w.t===my?'mine':''}">
        <span class="sd">${x.year}</span>
        <span class="dot" style="background:${teamColor(w.t)}"></span>
        <div class="fmain"><div class="fname">${esc(w.n)}</div>
        <div class="fnote">${LEAGUE.classes[w.c]} ${esc(w.p)} &middot; ${esc(w.t)}</div>
        ${w.line?`<div class="sline2 inrow">${esc(w.line)}</div>`:""}</div>
        <span class="fcfp">${w.r}</span></div>`}).join("");
  }
  const ac=S.history.length?S.history[S.history.length-1].allconf:null;
  if(ac&&ac.list&&ac.list.length){
    h+=`<div class="grouphead">All-${esc(LEAGUE.conf.names[ac.conf]||ac.conf)} &mdash;
      ${S.history[S.history.length-1].year}</div>`;
    h+=ac.list.map(x=>`<div class="frow ${x.team===my?'mine':''}">
      <span class="sd">${esc(x.pos)}</span>
      <span class="dot" style="background:${teamColor(x.team)}"></span>
      <div class="fmain"><div class="fname">${esc(x.n)}</div>
      <div class="fnote">${LEAGUE.classes[x.c]} &middot; ${esc(x.team)}</div></div>
      <span class="fcfp">${x.r}</span></div>`).join("");
  }
  h+=`<div class="grouphead">National champions</div>`;
  h+=S.history.slice().reverse().map(x=>{
    const r=x.teams[x.champion];
    return `<div class="yrow ${x.champion===my?'gold':''}"
      style="border-left:3px solid ${teamInk(x.champion)}">
      <span class="yr">${x.year}</span>
      <div class="ymain"><div class="yrec">${esc(x.champion)}</div>
      <div class="yres">${r?r[0]+"-"+r[1]:""}${x.confChamps?" &middot; "+
        (Object.keys(x.confChamps).find(c=>x.confChamps[c]===x.champion)
          ?LEAGUE.conf.names[Object.keys(x.confChamps).find(c=>x.confChamps[c]===x.champion)]+" champion"
          :"at-large"):""}</div></div></div>`;
  }).join("");
  const last=S.history[S.history.length-1];
  h+=`<div class="grouphead">Final top 10 &mdash; ${last.year}</div>`;
  h+=last.top10.map((t,i)=>{const r=last.teams[t];
    return `<div class="srow ${t===my?'mine':''}"><span class="spos">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${esc(t)}</span>
      <span class="sall">${r[0]}-${r[1]}</span></div>`}).join("");
  if(S.origProgram&&U){
    const base=S.history[0].year;
    const d=NAMES.map(t=>[t,Math.round(U.program[t]-S.origProgram[t])])
                 .sort((x,y)=>y[1]-x[1]);
    h+=`<div class="grouphead">Risen most since ${base}</div>`;
    h+=d.slice(0,8).map(([t,v])=>`<div class="srow"><span class="spos"></span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${esc(t)}</span><span class="sconf up">+${v}</span></div>`).join("");
    h+=`<div class="grouphead">Fallen most since ${base}</div>`;
    h+=d.slice(-8).reverse().map(([t,v])=>`<div class="srow"><span class="spos"></span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${esc(t)}</span><span class="sconf dn">${v}</span></div>`).join("");
    h+=`<div class="note">Program strength is the slow-moving baseline &mdash; recruiting,
      resources, coaching. Measured against where each program stood in ${base}.</div>`;
  }
  return h;
}

function offseasonBanner(){
  const last=S.history[S.history.length-1];
  if(!last)return "";
  const my=S.myTeam;
  const myHire=(last.hires||[]).find(x=>x.team===my);
  const myPoach=(last.poached||[]).find(x=>x.from===my);
  let news="";
  if(myPoach)news=`<div class="bnews flag"><b>${esc(myPoach.name)} left for
    ${esc(myPoach.to)}.</b> ${myHire?esc(myHire.name)+" takes over.":""}</div>`;
  else if(last.fired&&myHire)news=`<div class="bnews flag"><b>Coaching change.</b>
    ${esc(myHire.name)} is your new head coach.</div>`;
  else if(myHire)news=`<div class="bnews"><b>${esc(myHire.name)}</b> hired as head coach.</div>`;
  const cls=last.classes?last.classes[my]:null;
  const early=last.early?last.early[my]:null;
  let rec="";
  if(cls)rec=`<div class="bnews"><b>Recruiting:</b> ${esc(cls.l)} &mdash;
    ranked ${cls.rank} of ${cls.of} nationally.</div>`;
  if(early){
    rec+=`<div class="bnews small">${early.map(p=>esc(p.n)+" ("+esc(p.p)+")").join(", ")}
      declared early for the draft.</div>`;
    if(early.some(p=>p.featured))
      rec+=`<div class="bnews"><b>NFL pipeline.</b> Sending a player you built to the draft
        is a recruiting pitch &mdash; future classes take note.</div>`;
  }
  const ra=(last.realigned||[]).length?`<div class="bnews"><b>Realignment.</b> ${
    last.realigned.map(m=>esc(m.team)+" leaves the "+esc(LEAGUE.conf.names[m.from]||m.from)+
      " for the "+esc(LEAGUE.conf.names[m.to]||m.to)).join("; ")}.</div>`:"";
  const hz=last.heis&&last.heis[0]?`<div class="bnews small">${esc(last.heis[0].n)}
    (${esc(last.heis[0].p)}, ${esc(last.heis[0].t)}) won the ${LEAGUE.awards.mvp}.</div>`:"";
  const mine=(last.allconf&&last.allconf.list||[]).filter(x=>x.team===my);
  const acn=mine.length?`<div class="bnews"><b>All-conference.</b> ${
    mine.map(x=>esc(x.n)+" ("+esc(x.pos)+")").join(", ")} made the
    All-${esc(LEAGUE.conf.names[last.allconf.conf]||"")} team.</div>`:"";
  const cm=(last.coordMoves||[]).filter(m=>m.from===my);
  const cmn=cm.length?`<div class="bnews flag"><b>Staff loss.</b> ${
    cm.map(m=>esc(m.name)+" ("+m.side.toUpperCase()+") takes the head job at "+esc(m.to)).join("; ")}.</div>`:"";
  const cmo=(last.coordMoves||[]).filter(m=>m.from!==my).slice(0,2).map(m=>
    `<div class="bnews small">${esc(m.name)}, ${esc(m.from)} ${m.side.toUpperCase()},
      hired as head coach at ${esc(m.to)}.</div>`).join("");
  const bigMoves=(last.poached||[]).slice(0,3).map(p=>
    `<div class="bnews small">${esc(p.name)} leaves ${esc(p.from)} for ${esc(p.to)}.</div>`).join("");
  return `<div class="banner"><div class="bkick">${last.year} in the books</div>
    <div class="btitle">${esc(last.result)}</div>
    <div class="bsub">${esc(last.champion)} won the national title.
      ${(last.hires||[]).length} programs hired a new head coach.</div>
    ${news}${cmn}${ra}${acn}${rec}${hz}${cmo}${bigMoves}
    ${(function(){
      const mine=(last.draft||[]).filter(d=>d.team===my);
      if(!mine.length)return "";
      return `<div class="grouphead">Draft night &mdash; ${last.year}</div>`+
        mine.map(d=>`<div class="drow">
          <span class="dpick">${d.d.round}.${String(d.d.pick).padStart(2,"0")}</span>
          <div class="fmain"><div class="fname">${esc(d.n)}
            <span class="dpos">${esc(d.p)}</span></div>
          <div class="fnote">${esc(d.d.nfl)}${d.early?" &middot; left early":""}${
            d.d.overall===1?" &middot; No. 1 overall":""}</div></div>
          <span class="dovr">#${d.d.overall}</span></div>`).join("");
    })()}
    <button class="cardbtn" data-card="${S.history.length-1}">Season card &mdash; share ${last.year}</button>
    </div>`;
}

/* ============ week compression ============ */
/* Weeks where nothing is on the line shouldn't cost a tap each. */
function weekWeight(w){
  const my=S.myTeam;
  const g=SEA.sched.find(x=>x.week===w&&(x.home===my||x.away===my));
  if(!g)return 0;
  const opp=g.home===my?g.away:g.home;
  if(LEAGUE.rivals.name(my,opp))return 3;
  const rk=SEA.poll.rankMap()[opp];
  if(rk<=25)return 3;
  if(w>=LEAGUE.weeks-3)return 2;
  const wp=winProb(my,opp,g.home===my,g.neutral);
  if(wp>0.30&&wp<0.70)return 2;
  return 1;
}

function nextBigWeek(){
  for(let w=SEA.step+1;w<LEAGUE.weeks;w++)if(weekWeight(w)>=2)return w;
  return LEAGUE.weeks;
}

function canSkip(){
  if(SEA.phase!=="week")return null;
  const target=nextBigWeek();
  if(target-SEA.step<2)return null;
  if(weekWeight(SEA.step)>=2)return null;
  const g=SEA.sched.find(x=>x.week===target&&(x.home===S.myTeam||x.away===S.myTeam));
  const opp=g?(g.home===S.myTeam?g.away:g.home):null;
  return {to:target,n:target-SEA.step,opp:opp};
}

function simAhead(){
  const sk=canSkip(); if(!sk)return;
  const from=SEA.step;
  S.plans=S.plans||{};
  while(SEA.step<sk.to&&SEA.phase==="week"){
    S.plans[SEA.step]="balanced"; SEA.plan="balanced";
    SEA.advance(); S.steps++;
  }
  flash={type:"digest",from:from,to:SEA.step};
  reveal=null; save(); render();
}

function digestBlock(){
  const my=S.myTeam;
  let h=`<div class="banner"><div class="bkick">Weeks ${flash.from+1}&ndash;${flash.to} simulated</div>`;
  const rows=[];
  for(let i=flash.from;i<flash.to;i++){
    const W=SEA.weeks[i]; if(!W)continue;
    const g=W.games.find(x=>x.home===my||x.away===my);
    if(!g){rows.push(`<div class="drow"><span class="dwk">${W.label}</span>
      <span class="dres bye">Bye</span></div>`);continue}
    const won=g.winner===my, opp=g.home===my?g.away:g.home;
    const ms=g.home===my?g.hp:g.ap, os=g.home===my?g.ap:g.hp;
    rows.push(`<div class="drow"><span class="dwk">${W.label}</span>
      <span class="dres ${won?'w':'l'}">${won?"W":"L"} ${ms}-${os}</span>
      <span class="dopp">${g.home===my?"vs":"at"} ${esc(opp)}</span></div>`);
  }
  h+=`<div class="digest">${rows.join("")}</div>`;
  const rk=SEA.poll.rankMap();
  h+=`<div class="bsub">Now ${SEA.rec[my][0]}-${SEA.rec[my][1]}${
    rk[my]<=25?", ranked No. "+rk[my]:", unranked"}.</div></div>`;
  return h;
}

function offseasonScreen(){
  const A=S.off.act, P=S.off.picks, my=S.myTeam;
  const last=SEA;
  let h=`<div class="dateline"><h2>Offseason</h2><span>${last.year} &rarr; ${last.year+1}</span></div>`;
  const exp=S.expNow||expectations();
  const res=(()=>{const b=last.myBowl?last.myBowl(my):null;return ""})();
  const gr=seasonGrade(last.rec[my][0],last.rec[my][1],
    last.champion===my?"NATIONAL":(last.field.indexOf(my)>=0?"Playoff":
      (last.myBowl(my)?(last.myBowl(my).winner===my?"Won the ":"Lost the ")+last.myBowl(my).title
       :last.rec[my][0]>=6?"No bowl":"Losing season")),exp);
  const miles=milestones(last.rec[my][0],last.rec[my][1],
    last.champion===my?"NATIONAL":"",last.poll.rankMap()[my]);
  h+=`<div class="banner"><div class="bkick">${last.year} final</div>
    <div class="gradebox"><span class="grade">${gr.g}</span>
      <div><div class="btitle" style="margin:0">${last.rec[my][0]}-${last.rec[my][1]}</div>
      <div class="gradeline">${esc(gr.l)}</div></div></div>
    ${miles.map(m=>`<div class="bnews"><b>Milestone.</b> ${m}</div>`).join("")}
    <div class="bsub">${esc(last.champion)} won the national title.
    ${A.hires.length} programs changed coaches.</div>
    ${A.poached.slice(0,2).map(p=>`<div class="bnews small">${esc(p.name)} leaves
      ${esc(p.from)} for ${esc(p.to)}.</div>`).join("")}</div>`;

  const C=S.career;
  const jobRow=(t,tag)=>`<div class="cand ${S.off.move===t?'on':''}" data-job="${esc(t)}">
    <div class="candtop"><div>
      <div class="fname" style="color:${teamInk(t)}">${esc(t)}</div>
      <div class="fnote">${esc(LEAGUE.conf.names[CONF[t]])} &middot; ${
        U.program[t]>=1850?"blue blood":U.program[t]>=1650?"solid job":
        U.program[t]>=1450?"middling job":"rebuild"}</div></div>
      <span class="cgrade">${esc(tag)}</span></div>
    <div class="cdesc">Last season ${last.rec[t]?last.rec[t][0]+"-"+last.rec[t][1]:"&mdash;"}.
      ${U.program[t]>U.program[my]?"A step up.":U.program[t]<U.program[my]-120?"A step down.":"A lateral move."}</div></div>`;

  if(A.userOpen){
    h+=`<div class="firedbox"><div class="bkick">You have been let go</div>
      <div class="btitle">${esc(my)} has fired you.</div>
      <div class="bsub">Career ${C.w}-${C.l} &middot; you are ${esc(repGrade(C.rep))}.
      ${S.off.jobs.length?"These programs will take you.":"Nobody is calling."}</div></div>`;
    h+=`<div class="grouphead">1. Where do you go next?</div>`;
    h+=S.off.jobs.map(t=>jobRow(t,U.program[t]>U.program[my]?"step up":"opening")).join("");
    h+=`<div class="cand ${S.off.move==="retire"?'on':''}" data-job="retire">
      <div class="candtop"><div><div class="fname">Retire</div>
      <div class="fnote">End your career here</div></div></div>
      <div class="cdesc">Walk away with a ${C.w}-${C.l} record and ${C.titles}
        national title${C.titles===1?"":"s"}.</div></div>`;
  }else if(S.off.poach.length){
    h+=`<div class="grouphead">1. You have offers</div>`;
    h+=`<div class="note">${esc(repGrade(C.rep))[0].toUpperCase()+esc(repGrade(C.rep)).slice(1)}
      &mdash; bigger programs have come calling. You can stay or you can go.</div>`;
    h+=`<div class="cand ${!S.off.move?'on':''}" data-job="${esc(my)}">
      <div class="candtop"><div><div class="fname" style="color:${teamInk(my)}">Stay at ${esc(my)}</div>
      <div class="fnote">Year ${(U.coach[my]?U.coach[my].t:0)+1}</div></div>
      <span class="cgrade">loyalty</span></div>
      <div class="cdesc">Finish what you started.</div></div>`;
    h+=S.off.poach.map(t=>jobRow(t,"step up")).join("");
  }else{
    h+=`<div class="grouphead">Your job</div>
      <div class="coachbar plain" style="padding:12px 16px">
      <div class="cleft"><div class="cname">${esc(C.name)} <span class="youtag">YOU</span></div>
      <div class="cmeta">Year ${(U.coach[my]?U.coach[my].t:0)+1} at ${esc(my)}
        &middot; career ${C.w}-${C.l} &middot; ${esc(repGrade(C.rep))}</div></div></div>`;
  }

  const SC=S.off.staff||{};
  ["oc","dc"].forEach(side=>{
    const cands=SC[side]; if(!cands)return;
    const label=side==="oc"?"offensive":"defensive";
    h+=`<div class="grouphead">Hire a new ${label} coordinator</div>`;
    h+=`<div class="note">Your ${label} coordinator has moved on. He shapes how that side
      of the ball plays and develops.</div>`;
    h+=cands.map((c,i)=>`<div class="cand ${(P[side]===i||(P[side]==null&&i===0))?'on':''}"
      data-coord="${side}" data-ci="${i}">
      <div class="candtop"><div><div class="fname">${esc(c.n)}</div>
      <div class="fnote">${esc(c.s)}</div></div>
      <span class="cgrade">${esc(c.grade)}</span></div></div>`).join("");
  });
  const step=(A.userOpen||S.off.poach.length)?1:0;
  const B=P.budget, used=LEAGUE.offseason.budget.buckets.reduce((s,b)=>s+(B[b.k]||0),0), left=S.off.pool-used;
  h+=`<div class="grouphead">${step?"2":"1"}. Budget &mdash; ${S.off.pool} to spend</div>`;
  h+=coachMark("budget","You must spend every point. Facilities compound for years but only if you keep the job; retention and development pay off right away.");
  h+=`<div class="note">Every point you put somewhere is a point you didn't put
    somewhere else. Bigger programs and better seasons earn a bigger pool.</div>`;
  h+=`<div class="budgetleft ${left===0?'done':''}">${left>0?left+" unspent":
      left<0?Math.abs(left)+" over budget":"Fully allocated"}</div>`;
  h+=LEAGUE.offseason.budget.buckets.map(bk=>`<div class="bud">
    <div class="budtop"><div><div class="fname">${esc(bk.l)}</div>
      <div class="cdesc" style="margin-top:3px">${esc(bk.d)}</div></div>
      <div class="budctl">
        <button class="budbtn" data-bud="${bk.k}" data-dir="-1">&minus;</button>
        <span class="budval">${B[bk.k]||0}</span>
        <button class="budbtn" data-bud="${bk.k}" data-dir="1" ${left<=0?'disabled':''}>+</button>
      </div></div>
    <div class="budbar"><i style="width:${((B[bk.k]||0)/S.off.pool*100).toFixed(0)}%"></i></div>
  </div>`).join("");
  h+=`<div class="grouphead">${step?"3":"2"}. Recruiting focus</div>`;
  h+=Object.keys(LEAGUE.offseason.recruitFocus).map(k=>`<div class="opt ${P.recruit===k?'on':''}" data-rec="${k}">
    <div class="fname">${esc(LEAGUE.offseason.recruitFocus[k].l)}</div>
    <div class="cdesc">${esc(LEAGUE.offseason.recruitFocus[k].d)}</div></div>`).join("");

  h+=`<div class="grouphead">${step?"4":"3"}. Team philosophy</div>`;
  h+=Object.keys(PHILOSOPHY).map(k=>`<div class="opt ${P.phil===k?'on':''}" data-phil="${k}">
    <div class="fname">${esc(PHILOSOPHY[k].l)}</div>
    <div class="cdesc">${esc(PHILOSOPHY[k].d)}</div></div>`).join("");
  return h;
}

/* ============ shell ============ */
const TABS=[["team","Team"],["scores","Scores"],["poll",LEAGUE.ui.rankingTab],
            ["stand","Standings"],["dyn","Dynasty"]];

function liveScoreboard(){
  const g=live.g, my=S.myTeam;
  const H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const q=last?last.q:1;
  const kick=!live.drives.length;
  return `<div class="wtop">
    <div class="wlabel"><span class="live"></span>${kick?"KICKOFF":"Q"+q+" &middot; drive "+live.drives.length}
      ${g.label?" &middot; "+esc(g.label):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}</div>
    <div class="wscore">
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span>
        <span class="wn">${A}</span></div>
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span>
        <span class="wn">${H}</span></div>
    </div></div>`;
}

function liveView(){
  const g=live.g, my=S.myTeam;
  const last=live.drives[live.drives.length-1]||null;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  const OUT={TD:"TD",FG:"FG",PUNT:"PUNT",DOWNS:"DOWNS",MISS:"NO GOOD",INT:"INT",FUM:"FUMBLE"};
  const ballOf=d=>{const end=d.pts>0?100:Math.min(95,d.start+18);
    return d.home?100-end:end};
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${fieldSVG(g,last?{ball:ballOf(last)}:null,teamColor(g.home),teamColor(g.away),venue)}
    ${last?`<div class="fpos">${esc(last.home?g.home:g.away)} ball &middot; started own ${last.start}</div>`
          :`<div class="fpos">Ready for kickoff at ${esc(venue)}</div>`}
    <div class="grouphead">Drive chart</div>
    <div class="plays">${live.drives.slice().reverse().map(d=>{
      const tm=d.home?g.home:g.away;
      return `<div class="play ${tm===my?'mine':''}">
        <span class="pq">Q${d.q} &middot; ${d.n}</span>
        <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}
          <span class="dtag ${d.pts?'sc':''}">${OUT[d.kind]||d.kind}</span></div>
        <span class="pscore">${d.a}&ndash;${d.h}</span></div>`}).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the opening drive&hellip;</span></div>`}</div>
    <div class="actionbar">
      <div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
        aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
      <div class="wctl">
        <button class="wbtn" id="wpause">${live.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
        <button class="wbtn ${live.paused?'hot':''}" id="wstep">Next drive &rarr;</button>
        <button class="wbtn" id="wskip">Skip</button>
      </div>
      <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>
    </div></div>`;
}

function driveWord(d){
  if(d.note)return d.note;
  if(d.kind==="TD")return "touchdown";
  if(d.kind==="FG")return "field goal";
  if(d.kind==="INT")return "intercepted";
  if(d.kind==="FUM")return "lost the ball";
  if(d.kind==="MISS")return "the kick is no good";
  if(d.kind==="DOWNS")return "turned over on downs";
  return "forced to punt";
}

function liveCallView(){
  const dp=live.ask.dp, g=live.g, my=S.myTeam;
  const mine=live.ask.mine, theirs=live.ask.theirs;
  return `<div class="watchwrap">
    ${liveScoreboard()}
    <div class="callbox">
      <div class="wlabel">Your call</div>
      <div class="calltitle">${esc(dp.h)}</div>
      <div class="callscore">${esc(my)} ${mine} &middot; ${esc(g.home===my?g.away:g.home)} ${theirs}</div>
      <div class="callsub">${esc(dp.b)}</div>
    </div>
    <div class="grouphead staffhead">The staff room</div>
    <div class="staffroom">${staffTake(dp,{mine:mine,theirs:theirs,q:live.drives.length}).map(s=>
      `<div class="say"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`).join("")}</div>
    <div class="callopts">${dp.opts.map(o=>
      `<button class="advance callbtn" data-call="${esc(o[0])}">${esc(o[1])}</button>`).join("")}</div>
    <div class="grouphead">Drive chart</div>
    <div class="plays">${live.drives.slice().reverse().slice(0,6).map(d=>{
      const tm=d.home?g.home:g.away;
      return `<div class="play ${tm===my?'mine':''}">
        <span class="pq">Q${d.q} &middot; ${d.n}</span>
        <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}</div>
        <span class="pscore">${d.a}&ndash;${d.h}</span></div>`}).join("")}</div>
  </div>`;
}

function callView(){
  const dp=pendingCall.dp;
  return `<div class="watchwrap">
    <div class="wtop"><div class="wlabel"><span class="live"></span>Your call</div>
      <div class="calltitle">${esc(dp.h)}</div>
      <div class="callsub">${esc(dp.b)}</div></div>
    <div class="grouphead staffhead">The staff room</div>
    <div class="staffroom">${staffTake(dp,{mine:mine,theirs:theirs,q:live.drives.length}).map(s=>
      `<div class="say"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`).join("")}</div>
    <div class="callopts">${dp.opts.map(o=>
      `<button class="advance callbtn" data-call="${esc(o[0])}">${esc(o[1])}</button>`).join("")}</div>
  </div>`;
}

function answerCall(v){
  const before=SEA.step;
  S.calls=S.calls||{};
  S.calls[callKey(before)]=(S.calls[callKey(before)]||[]).concat([v]);
  pendingCall=null;
  save();
  doAdvance();
}

let cardFor=null, cardMsg="";

function cardView(){
  const h=cardFor;
  return `<div class="cardwrap">
    <div class="cardframe">${seasonCardSVG(h,S.myTeam)}</div>
    <div class="cardacts">
      <button class="advance" id="cshare">Share this season</button>
      <button class="wbtn" id="ccopy">Copy as text</button>
      <button class="wbtn" id="cback">Back</button>
    </div>
    ${cardMsg?`<div class="note center">${esc(cardMsg)}</div>`:""}
  </div>`;
}

function handoffView(){
  const c=activeCoach()||{};
  const n=coachCount(), i=(S.turn||0)+1;
  return `<div class="handwrap">
    <div class="handlabel">Pass it over &middot; coach ${i} of ${n}</div>
    <div class="handname">${esc(c.career?c.career.name:"")}</div>
    <div class="handteam" style="color:${teamInk(S.myTeam)}">${esc(S.myTeam)}</div>
    <div class="handrec">${SEA.rec[S.myTeam][0]}-${SEA.rec[S.myTeam][1]}${
      SEA.poll.rankMap()[S.myTeam]?" &middot; No. "+SEA.poll.rankMap()[S.myTeam]:""}</div>
    <div class="handnote">The others have played their week. Your turn.</div>
    <div class="actionbar"><button class="advance" id="hgo">I'm ready</button></div>
  </div>`;
}

function render(){
  if(handoff&&S.myTeam){
    el("app").innerHTML=handoffView();
    const b=el("hgo"); if(b)b.onclick=()=>{handoff=false;render()};
    return;
  }
  if(cardFor){
    el("app").innerHTML=cardView();
    const sh=el("cshare"); if(sh)sh.onclick=async()=>{
      cardMsg="Preparing image\u2026"; render();
      const r=await shareCard(cardFor,S.myTeam);
      cardMsg = r==="shared"?"Shared." : r==="saved"?"Image saved to your downloads."
              : r==="copied"?"Image not supported here \u2014 copied the text instead."
              : "Couldn't share on this device.";
      render();
    };
    const cp=el("ccopy"); if(cp)cp.onclick=async()=>{
      try{await navigator.clipboard.writeText(seasonCardText(cardFor,S.myTeam));cardMsg="Copied."}
      catch(e){cardMsg="Clipboard blocked here."}
      render();
    };
    const bk=el("cback"); if(bk)bk.onclick=()=>{cardFor=null;cardMsg="";render()};
    return;
  }
  if(live&&S.myTeam&&!live.done){
    el("app").innerHTML=live.ask?liveCallView():liveView();
    if(live.ask){
      document.querySelectorAll("[data-call]").forEach(b=>b.onclick=()=>answerLive(b.dataset.call));
    }else{
      const pz=el("wpause"); if(pz)pz.onclick=()=>{live.paused=!live.paused;S.watchStep=live.paused;save();liveTick()};
      const st2=el("wstep"); if(st2)st2.onclick=()=>{live.paused=true;S.watchStep=true;liveTick()};
      const sk=el("wskip"); if(sk)sk.onclick=()=>endLive();
      document.querySelectorAll("[data-speed]").forEach(x=>x.onclick=()=>{
        S.watchSpeed=x.dataset.speed;save();render()});
    }
    return;
  }
  if(watch&&S.myTeam){
    el("app").innerHTML=watchView();
    const b=el("wdone"); if(b)b.onclick=()=>stopWatch(false);
    const pz=el("wpause"); if(pz)pz.onclick=()=>togglePause();
    const st=el("wstep"); if(st)st.onclick=()=>{watch.paused=true;S.watchStep=true;stepWatch()};
    const sk=el("wskip"); if(sk)sk.onclick=()=>stopWatch(true);
    document.querySelectorAll("[data-speed]").forEach(x=>x.onclick=()=>{
      S.watchSpeed=x.dataset.speed; save(); tickWatch();});
    return;
  }
  if(S.title){
    if(!S._slots){allSlots().then(v=>{S._slots=v;render()});
      el("app").innerHTML=`<div class="titlewrap">${LOGO}
        <h1 class="wordmark"><span class="wm-a">Football</span><br>
        <span class="wm-b">Coach</span></h1></div>`;return}
    renderTitle();return}
  if(S.introStep!==null&&S.introStep!==undefined&&!S.myTeam){renderIntro();return}
  if(!S.myTeam&&S.setup&&!S.setup.ready){renderSetup();return}
  if(!S.myTeam){renderStart();return}
  if(S.help){
    el("app").innerHTML=`<div class="stick"><div class="topbar">
      <div class="tb-left"><span class="tb-yr">${SEA.year}</span>
      <span class="tb-team" style="color:${teamInk(S.myTeam)}">${esc(S.myTeam)}</span></div>
      </div></div>${helpPanel()}`;
    const c=el("hclose"); if(c)c.onclick=()=>{S.help=false;render()};
    document.querySelectorAll("[data-watch]").forEach(b=>b.onclick=()=>{
      S.watchMode=b.dataset.watch; save(); render();});
    document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{
      S.watchSpeed=b.dataset.speed; save(); render();});
    return;
  }
  if(S.retired){
    const C=S.career;
    el("app").innerHTML=`<header class="mast">
      <div class="kicker">Career complete</div>
      <h1>${esc(C.name)}</h1>
      <p>${C.w}-${C.l} across ${C.stops.length} program${C.stops.length===1?"":"s"},
      ${C.titles} national title${C.titles===1?"":"s"}, ${C.confs} conference title${C.confs===1?"":"s"}.
      ${C.fired?`Fired ${C.fired} time${C.fired===1?"":"s"} along the way.`:"Never fired."}</p></header>
      <div class="grouphead">Coaching stops</div>
      ${C.stops.map(s=>`<div class="stop" style="padding:10px 16px">
        <span class="dot" style="background:${teamColor(s.team)}"></span>
        <span class="stopteam">${esc(s.team)}</span>
        <span class="stopyr">${s.from}\u2013${s.to||s.from}</span>
        <span class="stoprec">${s.w}-${s.l}</span></div>`).join("")}
      <div class="actionbar"><button class="advance gold" id="reset2">New career</button></div>`;
    const r=el("reset2"); if(r)r.onclick=async()=>{
      try{await window.storage.delete(KEY)}catch(e){}
      S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0};
      U=null;SEA=null;renderStart();};
    return;
  }
  const rk=SEA.poll.rankMap(), my=S.myTeam;
  const done=SEA.phase==="done";
  const inOff=!!S.off;
  wide=isWide();
  try{document.body.classList.toggle("offseason",!!S.off)}catch(e){}
  el("app").innerHTML=`
    <div class="stick">
      <div class="topbar">
        <div class="tb-left"><span class="tb-yr">${SEA.year}</span>
          <span class="tb-team" style="color:${teamInk(my)}">${esc(my)}</span></div>
        <div class="tb-right">${(()=>{const r=liveRec(my);return r[0]+"-"+r[1]})()}
          ${reveal==="half"?"":(rk[my]<=25?`<span class="tb-rk">#${rk[my]}</span>`:"")}
          <button class="reset" id="ttl" title="Title screen">&#9632;</button>
          <button class="reset" id="hlp" title="How it works">?</button>
          <button class="reset" id="rst" title="Start over">&#8635;</button></div>
      </div>
      ${inOff?"":`<div class="tabs">${TABS.map(([k,l])=>
        `<button class="tab" data-v="${k}" aria-selected="${view===k}">${l}</button>`).join("")}</div>`}
    </div>
    ${inOff?"":`<div class="hint">Space or Enter advances &middot; keys 1&ndash;5 switch views</div>`}
    <div class="cols">
    ${wide&&!inOff?`<aside id="side">${teamPanel()}
      <div class="sidebtn"><button class="advance ${done?'gold':''}" id="adv2">${
        SEA.buttonLabel()}</button>${(()=>{const sk=canSkip();return sk?
        `<button class="skip" id="skip2">Sim ${sk.n} weeks &rarr; ${esc(sk.opp||"the run-in")}</button>`:""})()}
      </div></aside>`:""}
    <main id="view">${inOff?offseasonScreen():
      (flash&&flash.type==="offseason"?offseasonBanner():
       flash&&flash.type==="digest"?digestBlock():"")+
      (view==="team"?myTeamView():view==="scores"?scoresView():
       view==="poll"?LEAGUE.ui.rankingView():view==="stand"?standingsView():dynastyView())}</main>
    </div>
    <div class="actionbar${wide&&!inOff?" hideWide":""}">
      ${(()=>{const sk=canSkip();return sk?`<button class="skip" id="skip">Sim ${sk.n} weeks
        &rarr; ${esc(sk.opp||"the run-in")}</button>`:""})()}
      <button class="advance ${done||inOff?'gold':''}" id="adv" ${
        inOff&&((S.off.act.userOpen&&S.off.move===null)||budgetLeft()!==0)?'disabled':''}>${
        inOff?(S.off.act.userOpen&&S.off.move===null?"Choose your next job"
              :budgetLeft()>0?"Allocate "+budgetLeft()+" more"
              :budgetLeft()<0?"Over budget":
              S.off.move==="retire"?"Retire"
              :S.off.move&&S.off.move!==S.myTeam?"Take the "+S.off.move+" job"
              :"Begin "+(SEA.year+1)+" season"):SEA.buttonLabel()}</button>
    </div>`;
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{view=t.dataset.v;flash=null;render()});
  document.querySelectorAll(".subtab").forEach(b=>b.onclick=()=>{
    if(b.dataset.d){dynTab=b.dataset.d; dynTeam=null; dynCoach=null}
    else if(b.dataset.m){teamTab=b.dataset.m}
    else LEAGUE.ui.subtab(b);
    render()});
  document.querySelectorAll(".tpick").forEach(b=>b.onclick=()=>{dynTeam=b.dataset.t;render()});
  const db=el("dback"); if(db)db.onclick=()=>{dynTeam=null;render()};
  document.querySelectorAll("[data-coach]").forEach(b=>b.onclick=()=>{
    dynCoach=b.dataset.coach; save(); render();});
  const cb=el("cback"); if(cb)cb.onclick=()=>{dynCoach=null;render()};
  const cf=el("cfind"); if(cf)cf.oninput=()=>{coachQ=cf.value;
    const p=cf.selectionStart; render();
    const n=el("cfind"); if(n){n.focus();n.setSelectionRange(p,p)}};
  const lp=el("lgpost"); if(lp)lp.onclick=()=>{postSeason()};
  const ll=el("lgload"); if(ll)ll.onclick=()=>{leagueMsg="";loadLeague()};
  const df=el("dfind"); if(df)df.oninput=()=>{dynQ=df.value;
    const p=df.selectionStart; render();
    const n=el("dfind"); if(n){n.focus();n.setSelectionRange(p,p)}};
  document.querySelectorAll(".planbtn").forEach(b=>b.onclick=()=>{plan=b.dataset.plan;render()});
  const sb=el("skip"); if(sb)sb.onclick=()=>{simAhead();window.scrollTo({top:0})};
  const tb2=el("ttl"); if(tb2)tb2.onclick=async()=>{save();S.title=true;S._slots=await allSlots();render()};
  const hb=el("hlp"); if(hb)hb.onclick=()=>{S.help=true;render()};
  const rb=el("rst"); if(rb)rb.onclick=async()=>{
    if(confirm("Abandon this dynasty and start a new one?")){
      try{await window.storage.delete(KEY)}catch(e){}
      S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0};
      U=null;SEA=null;flash=null;renderStart();}};
  const advance=()=>{
    if(S.off){commitOffseason();window.scrollTo({top:0});return}
    if(SEA.phase!=="week"&&view==="team"&&!wide)view="scores";
    doAdvance();
    if(!wide)window.scrollTo({top:0,behavior:"auto"});
  };
  const a2=el("adv2"); if(a2)a2.onclick=advance;
  const s2=el("skip2"); if(s2)s2.onclick=()=>simAhead();
  el("adv").onclick=()=>{
    if(S.off){commitOffseason();window.scrollTo({top:0});return}
    if(SEA.phase!=="week"&&view==="team")view="scores";
    doAdvance();
    window.scrollTo({top:0,behavior:"auto"});
  };
  document.querySelectorAll("[data-team]").forEach(b=>b.onclick=(ev)=>{
    ev.stopPropagation(); openTeam(b.dataset.team);});
  document.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>{
    S.seen=S.seen||{}; S.seen[b.dataset.mark]=1; save(); render();});
  document.querySelectorAll("[data-fire]").forEach(b=>b.onclick=()=>{
    if(confirm("Replace your coordinator with an interim for the rest of the season?"))
      fireCoord(b.dataset.fire);});
  document.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{
    const h=S.history[+b.dataset.card]; if(h){cardFor=h;cardMsg="";render()}});
  document.querySelectorAll("[data-coord]").forEach(b=>b.onclick=()=>{
    S.off.picks[b.dataset.coord]=+b.dataset.ci; save(); render();});
  document.querySelectorAll("[data-bud]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.bud, d=+b.dataset.dir, B=S.off.picks.budget;
    const nv=(B[k]||0)+d;
    if(nv<0)return;
    if(d>0&&budgetLeft()<=0)return;
    B[k]=nv; save(); render();});
  const rw=document.querySelector("[data-rewatch]");
  if(rw)rw.onclick=()=>{const g=heroGame(); if(g)startWatch(g)};
  document.querySelectorAll("[data-promo]").forEach(b=>b.onclick=(ev)=>{
    ev.stopPropagation(); promote(+b.dataset.promo);});
  document.querySelectorAll("[data-feat]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.feat;
    S.featured=(S.featured===i?null:i);
    if(SEA)SEA.featured=S.featured;
    save(); render();});
  document.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{
    S.off.move=(b.dataset.job===S.myTeam?null:b.dataset.job);save();render()});
  document.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>{
    S.off.picks.recruit=b.dataset.rec;save();render()});
  document.querySelectorAll("[data-phil]").forEach(b=>b.onclick=()=>{
    S.off.picks.phil=b.dataset.phil;save();render()});
}

const TIERS=[
 {max:15, l:"Blue blood",   d:"A playoff berth is the expectation. Miss twice and you're gone.",
  c:"flag"},
 {max:42, l:"Contender",    d:"Nine wins and a conference push keeps everyone happy.",c:"sod"},
 {max:78, l:"Middle of the pack",d:"Get to a bowl. Beat someone you shouldn't. Good place to learn.",
  c:"turf",rec:true},
 {max:106,l:"Tough job",    d:"Six wins here is a genuine achievement.",c:"vote"},
 {max:999,l:"Rebuild",      d:"Hard mode. Four wins would be real movement.",c:"muted"}
];
function tierOf(rank){return TIERS.find(t=>rank<=t.max)}

/* The owl, drawn from the real one: cream face, rust feathering round the eyes,
   yellow rings, yellow beak and feet. */
function owlSVG(cls,withPost){
  return `<svg class="${cls||'owl'}" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
    ${withPost?`<g fill="none" stroke="var(--sodium)" stroke-width="4.4" stroke-linecap="square">
      <path d="M9 13 V50"/><path d="M63 13 V50"/><path d="M9 50 H63"/><path d="M36 50 V62"/>
    </g>
    <ellipse cx="36" cy="65" rx="11.5" ry="3" fill="none" stroke="var(--line)" stroke-width="2.2"/>`:""}
    <g>
      <!-- ear tufts -->
      <path d="M24 14 C22.6 7.6 24 4.8 26.4 4.2 C28.5 6.9 30 10 30.8 12.9 Z" fill="#C98A63"/>
      <path d="M48 14 C49.4 7.6 48 4.8 45.6 4.2 C43.5 6.9 42 10 41.2 12.9 Z" fill="#C98A63"/>
      <!-- jersey body -->
      <path d="M24 34 C24 32 28.5 30.5 36 30.5 C43.5 30.5 48 32 48 34
               L48.6 45 C48.6 48.6 43.4 50.4 36 50.4 C28.6 50.4 23.4 48.6 23.4 45 Z"
            fill="#2C3C6E"/>
      <!-- wings over the jersey -->
      <path d="M23.8 35.5 C20.6 37.4 19.2 41.6 20.4 46.2 C22.9 45.4 24.6 42.6 25 38.6 Z"
            fill="#C98A63"/>
      <path d="M48.2 35.5 C51.4 37.4 52.8 41.6 51.6 46.2 C49.1 45.4 47.4 42.6 47 38.6 Z"
            fill="#C98A63"/>
      <!-- rolled collar -->
      <ellipse cx="36" cy="32.6" rx="13.2" ry="4.4" fill="#3A4C89"/>
      <!-- head, sitting into the collar -->
      <path d="M36 5.8 C46.8 5.8 52.6 12.8 52.6 21.6 L52.6 26.4
               C52.6 32.6 45.8 36.4 36 36.4 C26.2 36.4 19.4 32.6 19.4 26.4
               L19.4 21.6 C19.4 12.8 25.2 5.8 36 5.8 Z" fill="#EDE7D8"/>
      <path d="M36 5.8 C43.9 5.8 49.2 9.7 51.5 15.5 C46.8 12.4 41.8 10.9 36 10.9
               C30.2 10.9 25.2 12.4 20.5 15.5 C22.8 9.7 28.1 5.8 36 5.8 Z"
            fill="#C98A63" opacity=".6"/>
      <circle cx="28" cy="20.6" r="7.7" fill="#B5744E"/>
      <circle cx="44" cy="20.6" r="7.7" fill="#B5744E"/>
      <circle cx="28" cy="20.6" r="4.9" fill="#F2C14E"/>
      <circle cx="44" cy="20.6" r="4.9" fill="#F2C14E"/>
      <circle cx="28" cy="20.6" r="3.45" fill="#14171F"/>
      <circle cx="44" cy="20.6" r="3.45" fill="#14171F"/>
      <circle cx="29.15" cy="19.35" r="1.12" fill="#FFFFFF"/>
      <circle cx="45.15" cy="19.35" r="1.12" fill="#FFFFFF"/>
      <path d="M36 22.6 L32.9 27.8 Q36 30.1 39.1 27.8 Z" fill="#F2C14E"/>
      <!-- feet gripping the bar -->
      <path d="M30.5 50.2 v3 M41.5 50.2 v3" stroke="#F2C14E" stroke-width="2.8"
        stroke-linecap="round" fill="none"/>
      <path d="M28.2 53.2 h4.6 M39.2 53.2 h4.6" stroke="#F2C14E" stroke-width="2.4"
        stroke-linecap="round" fill="none"/>
    </g>
  </svg>`;
}
const LOGO=owlSVG("logo",true);

const INTRO=[
 {h:"The job is yours until it isn't",
  b:"You have a record, a program, and a seat that gets warm. Miss expectations two years "+
    "running and you're fired \u2014 then you pick from whatever will still take you."},
 {h:"Two decisions that matter",
  b:"<b>Every week</b> you set a gameplan. Playing it safe protects a lead; taking risks is "+
    "how an underdog steals a game it has no business winning. "+
    "<b>Every offseason</b> you spend a budget across recruiting, development, facilities and "+
    "retention \u2014 and you can't fund everything."},
 {h:"Everything carries over",
  b:"Players graduate and develop. Recruiting classes compound. Facilities you build outlast "+
    "the season. Programs rise and fall across decades. Your career record follows you "+
    "wherever you go next."}
];

const GLOSSARY=[
 ["Program strength","The slow-moving baseline of a school \u2014 resources, recruiting pull, "+
  "reputation. It moves over years, not weeks, and sets what's expected of you."],
 ["Rating (player)","0\u201399 scale. A starter's rating drives how much he's worth to the team. "+
  "Quarterbacks matter far more than safeties."],
 ["Ceiling","How good a player can still become. Freshmen have room; seniors usually don't."],
 ["Win probability","Derived from the rating gap plus home field. Your gameplan shifts the "+
  "spread of outcomes around it, not the average."],
 ["Hot seat","Measured against your program's own expectations, not raw wins. A bad year at a "+
  "blue blood burns hotter than a bad year at a rebuild."],
 ["Poll vs. reality","Voters are sticky and punish losses out of proportion. The poll can be "+
  "wrong about you for weeks, and the playoff field is picked from it."],
 ["Reputation","What other programs think of you. Built by beating expectations, worth more at "+
  "a small school than a big one. It decides which jobs open up when you're fired."]
];

const PRE_RANK=(()=>{const o=LEAGUE.teams.slice().sort((a,b)=>b[1]-a[1]);
  const m={};o.forEach((t,i)=>m[t[0]]=i+1);return m})();

function pickList(q){
  const byConf={};NAMES.forEach(t=>{(byConf[CONF[t]]=byConf[CONF[t]]||[]).push(t)});
  const ql=q.trim().toLowerCase();
  return LEAGUE.conf.display
    .filter(c=>byConf[c]).map(c=>{
      const list=byConf[c].filter(t=>!ql||t.toLowerCase().includes(ql)).sort();
      if(!list.length)return "";
      return `<div class="cbox"><div class="chead">${LEAGUE.conf.names[c]}</div>
      <div class="pickgrid">${list.map(t=>{
        const ti=tierOf(PRE_RANK[t]);
        const gone=(S.picking||[]).some(x=>x.team===t);
        return `<button class="pick ${gone?"taken":""}" data-t="${esc(t)}"
          ${gone?"disabled":""} title="${esc(ti.l)}">
          <span class="dot" style="background:${teamColor(t)}"></span>
          <span class="pn">${esc(t)}<em class="ptier ${ti.c}">${esc(ti.l)}</em></span>
          <span class="pr">${PRE_RANK[t]}</span></button>`}).join("")}</div></div>`;
    }).join("")||`<div class="note">No team matches that.</div>`;
}

function bindPicks(){
  document.querySelectorAll(".pick").forEach(b=>b.onclick=()=>{
    const want=(S.setup&&S.setup.coaches)||1;
    if(want>1){
      S.picking=S.picking||[];
      const nm=((S.setup.names&&S.setup.names[S.picking.length])||"").trim()
             ||("Coach "+(S.picking.length+1));
      S.picking.push({team:b.dataset.t,name:nm});
      if(S.picking.length<want){ save(); render(); return; }
      const roster=S.picking.slice(); S.picking=null;
      newDynasty(roster[0].team,(S.setup.seed)>>>0,roster[0].name,roster);
    }else{
      newDynasty(b.dataset.t,(S.setup.seed)>>>0,S.setup.name);
    }
  });
}

function owlMark(size){
  return `<span class="owlmark" style="width:${size}px;height:${size}px">${owlSVG("owlmini",false)}</span>`;
}

const OWL_LINE="Baby Owl genius football coach!";

function renderTitle(){
  const slots=S._slots||[];
  el("app").innerHTML=`<div class="titlewrap">
    <div class="owlstage">
      <div class="logowrap" id="owltap">${LOGO}</div>
      ${owlTaps>=5?`<div class="bubble"><span>${esc(OWL_LINE)}</span></div>`:""}
    </div>
    <h1 class="wordmark"><span class="wm-a">Football</span><br><span class="wm-b">Coach</span></h1>
    <div class="tagline">Build a program. Win it all.</div>
    <div class="slots">${slots.map(s=>s.empty
      ? `<button class="slot empty" data-slot="${s.n}">
           <span class="slotn">Slot ${s.n}</span>
           <span class="slotmain">Empty &mdash; start a career</span></button>`
      : `<button class="slot" data-slot="${s.n}">
           <span class="slotn">Slot ${s.n}</span>
           <span class="slotmain" style="color:${teamInk(s.team)}">${esc(s.team)}</span>
           <span class="slotsub">${esc(s.coach)} &middot; ${s.year} &middot; ${s.seasons}
             season${s.seasons===1?"":"s"} &middot; ${s.rec}${s.titles?" &middot; "+s.titles+"\u00d7 champion":""}</span>
           <span class="slotdel" data-del="${s.n}">Erase</span></button>`).join("")}</div>
    <button class="introskip wide" id="thow">How to play</button>
  </div>`;
  document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=async(ev)=>{
    if(ev.target&&ev.target.dataset.del){
      if(!confirm("Erase this career permanently?"))return;
      try{await window.storage.delete(KEYFOR(+ev.target.dataset.del))}catch(e){}
      S._slots=await allSlots(); render(); return;
    }
    const n=+b.dataset.slot;
    slot=n;
    const d=await loadSlot(n);
    if(d&&d.myTeam){S=d;S.title=false;rebuild();S.expNow=S.expNow||expectations();render()}
    else {S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,
             setup:{name:"",seed:Math.floor(Math.random()*899999+100000)}};
          S.title=false;render()}
  });
  el("thow").onclick=()=>{S.title=false;S.introStep=0;render()};
  const ot=el("owltap");
  if(ot)ot.onclick=()=>{owlTaps++;
    ot.classList.remove("hoot"); void ot.offsetWidth; ot.classList.add("hoot");
    if(owlTaps>=5)render();};
}

function renderSetup(){
  const rng=new RNG(Date.now()&0xffff);
  el("app").innerHTML=`<div class="setupwrap">
    ${LOGO}
    <div class="kicker">New career</div>
    <h2 class="introh">Who are you?</h2>
    <div class="grouphead" style="border:none;padding-left:0">Your name</div>
    <input id="cname" class="seedbox namebox" maxlength="26"
      placeholder="Coach name" value="${esc(S.setup.name)}">
    <button class="introskip" id="crand">Suggest one</button>
    <div class="grouphead" style="border:none;padding-left:0">World seed</div>
    <input id="cseed" class="seedbox" value="${S.setup.seed}">
    <span class="seedhint">Share this number and a friend gets the identical universe &mdash;
      same schedules, same injuries, same upsets.</span>
    <div class="grouphead" style="border:none;padding-left:0">Playing together</div>
    <div class="setrow" style="padding:0 0 8px">${[1,2,3,4].map(n=>`
      <button class="setbtn" data-nco="${n}" aria-pressed="${(S.setup.coaches||1)===n}"
        >${n===1?"Just me":n}</button>`).join("")}</div>
    <span class="seedhint">More than one and you take turns on this device &mdash;
      same world, same season, different programs.</span>
    ${(S.setup.coaches||1)>1?`<div class="conames">${
      Array.from({length:(S.setup.coaches||1)-1}).map((_,i)=>`
      <input class="seedbox" data-coname="${i+1}" maxlength="26"
        placeholder="Coach ${i+2} name"
        value="${esc((S.setup.names&&S.setup.names[i+1])||"")}">`).join("")}</div>`:""}
    <div class="titlebtns"><button class="advance" id="cgo">Choose your program</button></div>
  </div>`;
  el("crand").onclick=()=>{S.setup.name=rng.pick(COACH_FIRST)+" "+rng.pick(LAST);render()};
  const grab=()=>{
    S.setup.name=(el("cname").value||"").trim()||rng.pick(COACH_FIRST)+" "+rng.pick(LAST);
    S.setup.seed=parseInt(el("cseed").value,10)||123456;
    S.setup.names=S.setup.names||[];
    document.querySelectorAll("[data-coname]").forEach(x=>{
      S.setup.names[+x.dataset.coname]=(x.value||"").trim();});
  };
  document.querySelectorAll("[data-nco]").forEach(b=>b.onclick=()=>{
    grab(); S.setup.coaches=+b.dataset.nco; render();});
  el("cgo").onclick=()=>{
    grab();
    S.setup.names=S.setup.names||[];
    S.setup.names[0]=S.setup.name;
    S.setup.ready=true; render();
  };
}

function renderIntro(){
  const i=S.introStep||0;
  const card=INTRO[i];
  el("app").innerHTML=`<div class="introwrap">
    <div class="kicker">How this works &middot; ${i+1} of ${INTRO.length}</div>
    <h2 class="introh">${card.h}</h2>
    <p class="introb">${card.b}</p>
    <div class="intronav">
      <button class="introskip" id="iskip">Skip</button>
      <button class="advance" id="inext">${i===INTRO.length-1?"Pick your program":"Next"}</button>
    </div>
    <div class="dots">${INTRO.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join("")}</div>
  </div>`;
  el("inext").onclick=()=>{
    if(i===INTRO.length-1){S.introStep=null;S.introDone=true;S.title=true;save();render()}
    else{S.introStep=i+1;render()}
  };
  el("iskip").onclick=()=>{S.introStep=null;S.introDone=true;S.title=true;save();render()};
}

function helpPanel(){
  return `<div class="helpwrap"><div class="helpowl">${owlSVG("owlmini",false)}</div>
    <div class="dateline"><h2>How it works</h2>
    <button class="closebtn" id="hclose">Close</button></div>
    ${INTRO.map(c=>`<div class="helpcard"><div class="fname">${c.h}</div>
      <div class="cdesc">${c.b}</div></div>`).join("")}
    <div class="grouphead">Glossary</div>
    ${GLOSSARY.map(([t,d])=>`<div class="helpcard"><div class="fname">${esc(t)}</div>
      <div class="cdesc">${esc(d)}</div></div>`).join("")}
    <div class="grouphead">Watching your games</div>
    <div class="setrow">${[["all","Every game"],["big","Only the big ones"],["never","Never \u2014 just the result"]]
      .map(([k,l])=>`<button class="setbtn" data-watch="${k}"
        aria-pressed="${(S.watchMode||"all")===k}">${l}</button>`).join("")}</div>
    <div class="helpcard"><div class="cdesc">Your games play out score by score without
      revealing the final. You can skip to the result at any point, or rewatch afterwards
      from the result card.</div></div>
    <div class="grouphead">Playback speed</div>
    <div class="setrow">${SPEEDS.map(s=>`<button class="setbtn" data-speed="${s[0]}"
      aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
    <div class="grouphead">Controls</div>
    <div class="helpcard"><div class="cdesc">Space or Enter advances. Keys 1&ndash;5 switch views.
      The circular button in the header abandons the current career.</div></div>
    <div style="height:30px"></div></div>`;
}

function renderStart(){
  const byConf={};NAMES.forEach(t=>{(byConf[CONF[t]]=byConf[CONF[t]]||[]).push(t)});
  el("app").innerHTML=`
    <header class="mast">
      <div class="kicker">${(function(){
        const n=(S.setup&&S.setup.coaches)||1;
        if(n<2)return esc(S.setup&&S.setup.name?S.setup.name:"New career");
        const taken=(S.picking||[]).length;
        return esc(((S.setup.names&&S.setup.names[taken])||"").trim()||("Coach "+(taken+1)));
      })()}</div>
      <h1>Where do you<br>want to coach?</h1>
      <p>Every program is a different job with different expectations. Win at a blue blood and
        it's what they pay you for; win at a rebuild and you'll have your pick of the country.</p>
    </header>
    ${(function(){
      const n=(S.setup&&S.setup.coaches)||1;
      if(n<2)return `<div class="grouphead">Your program</div>`;
      const taken=(S.picking||[]).map(x=>x.team);
      const who=((S.setup.names&&S.setup.names[taken.length])||"").trim()
              ||("Coach "+(taken.length+1));
      return `<div class="grouphead">${esc(who)} &mdash; pick a program
        (${taken.length+1} of ${n})</div>`+
        (taken.length?`<div class="note">Already taken: ${taken.map(esc).join(", ")}</div>`:"");
    })()}
    <div class="seedrow"><input id="find" class="seedbox findbox" placeholder="Search 132 teams...">
      <span class="seedhint">The number is the preseason rating rank. Lower means a stronger
      program &mdash; and higher expectations to go with it.</span></div>
    <div class="tierkey">${TIERS.map(t=>`<span class="${t.c}">${esc(t.l)}</span>`).join("")}</div>
    <div id="picks">${pickList("")}</div>
    <div style="height:40px"></div>`;
  bindPicks();
  const f=el("find");
  if(f)f.oninput=()=>{el("picks").innerHTML=pickList(f.value);bindPicks()};
}

window.addEventListener("resize",()=>{
  const w=isWide();
  if(w!==wide&&S.myTeam)render();
});
window.addEventListener("keydown",e=>{
  if(!S.myTeam)return;
  const tag=(e.target&&e.target.tagName)||"";
  if(tag==="INPUT"||tag==="TEXTAREA")return;
  if(live&&!live.done){
    if(live.ask)return;
    if(e.key===" "){e.preventDefault();live.paused=!live.paused;S.watchStep=live.paused;liveTick();return}
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();live.paused=true;liveTick();return}
    if(e.key==="Enter"){e.preventDefault();endLive();return}
    if(["1","2","3","4"].indexOf(e.key)>=0){e.preventDefault();
      S.watchSpeed=SPEEDS[+e.key-1][0];save();render();return}
    return;
  }
  if(watch){
    if(e.key===" "){e.preventDefault();
      if(watch.i>=watch.script.length)stopWatch(false); else togglePause(); return}
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();
      watch.paused=true;S.watchStep=true;stepWatch();return}
    if(["1","2","3","4"].indexOf(e.key)>=0){e.preventDefault();
      S.watchSpeed=SPEEDS[+e.key-1][0]; save(); tickWatch(); return}
    if(e.key==="Enter"){e.preventDefault();
      (watch.i>=watch.script.length)?stopWatch(false):stopWatch(true); return}
    return;
  }
  if(e.key===" "||e.key==="Enter"){e.preventDefault();
    const b=el("adv2")||el("adv"); if(b&&!b.disabled)b.click();}
  const keys={"1":"team","2":"scores","3":"poll","4":"stand","5":"dyn"};
  if(keys[e.key]&&!S.off){view=keys[e.key];flash=null;render()}
});

(async function(){
  S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,title:true};
  S._slots=await allSlots();
  render();
})();

