/* ============ state ============ */
/* Each game keeps its own save slots. All three games live on one website,
   so they share the browser's storage: the slots used to be shared too, and a
   game could list (and overwrite) another game's saves. College football
   keeps the original keys, so its saves are untouched. */
const SAVE_KEYS={cfb:"fbcoach-v2", nfl:"fbcoach-pro-v2", ncaab:"bbcoach-v1", nba:"bbcoach-pro-v1", nhl:"hkcoach-pro-v1", epl:"sccoach-v1", mlb:"bscoach-pro-v1"};
const LEGACY_KEY="fbcoach-v2";
const KEYBASE=SAVE_KEYS[LEAGUE.id]||LEGACY_KEY;
const NSLOTS=3;
let slot=1;
const KEYFOR=n=>KEYBASE+"-slot"+n;
let S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,plans:{}};
let plan="balanced", reveal=null, revealTimer=null;
/* round 71: a floor under the finish (Muse, priority 3: college basketball asked nothing after half-time in ten straight
   games, baseball's World Series Game 7 nothing after the 3rd, football no fourth-quarter call in several). In a close
   game's late window (SPORT.lateFloor: when it starts, and what close is) the first call that comes up is yours,
   whatever the gate would have said; it's graded as any call is, and "close either way" when it was. One a game. */
const LATE_FLOOR_ON=true;
function lateFloorDue(L,any){
  try{ if(!LATE_FLOOR_ON||!L||L.h2h||L.lateShown||typeof SPORT==="undefined"||!SPORT.lateFloor)return false;
    const F=SPORT.lateFloor, D=L.drives||[], d=D[D.length-1]; if(!d||!F.late(D,d))return false;
    const h=d.sh!==undefined?d.sh:d.h, a=d.sa!==undefined?d.sa:d.a; return Math.abs((h||0)-(a||0))<=F.close }catch(e){ return false } }
/* ---- hot seat ----
   Several people can share one save, each coaching their own program in the
   same world. Only one is "active" at a time: their state is swapped onto S so
   the rest of the game needs no changes at all. */
const COACH_FIELDS=["myTeam","career","plans","calls","promos","fires","featured","featuredLast","callLedger","deploy","chLog",
                    "history","expNow","readTally","film","lifeCalls","storyYr","rivals","callCareer"];   // round 41: the season story

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
let handoffNotes={};    // hot seat: team -> the coach who deferred a game against it
let handoff=false;      // showing the "pass the device" screen
let owlTaps=0;

/* ---- head to head ----
   When two coaches in a hot seat meet, the game is played once, on the later
   coach's turn, and each coach calls their own side. The earlier coach picks
   a plan and hands over without playing. */
function coachIndexOf(team){
  if(!S.coaches)return -1;
  if(team===S.myTeam)return S.turn||0;
  return S.coaches.findIndex((c,i)=>i!==(S.turn||0)&&c.myTeam===team);
}
function opponentOf(g){ return g?(g.home===S.myTeam?g.away:g.home):null }
/* Both coaches' plans and featured players, applied to one game. */
function h2hElo(g,step,oj){
  const keepU=SEA.userTeam, keepF=SEA.featured, oc=S.coaches[oj];
  SEA.userTeam=null; SEA.featured=null; const keepDep=SEA.deploy; SEA.deploy=null;
  const e0=SEA.matchupElo(g,"balanced");
  SEA.userTeam=S.myTeam; SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;
  const e1=SEA.matchupElo(g,plan);
  SEA.userTeam=oc.myTeam; SEA.featured=(oc.featured===undefined?null:oc.featured); SEA.deploy=oc.deploy||null;
  const e2=SEA.matchupElo(g,(oc.plans&&oc.plans[step])||"balanced");
  SEA.userTeam=keepU; SEA.featured=keepF; SEA.deploy=keepDep;
  return {h:e1.h+e2.h-e0.h, a:e1.a+e2.a-e0.a};
}

/* Answers belong to a season as well as a week. Keyed by step alone, season
   three replays season one's decisions and silently answers everything. */
function callKey(step,year){ return (year||SEA.year)+":"+step; }
/* The gameplan, by step and by half: a cup week plays its league game and its tie as two halves of one step, and each
   can be played with a different plan (round 59: a league game played on "safe", then the cup tie simmed on
   "balanced", overwrote the step's one plan, and a reload replayed the tie another way: 3-1 came back 0-0, and the
   season went its own way from there). Saves from before keep one plan a step. */
function planKey(step,half){ return half?step+"#1":step }
function planFor(step,half){ const P=S.plans||{}; return (half&&P[step+"#1"]!==undefined?P[step+"#1"]:P[step])||"balanced" }

function liveSeed(step){
  return ((S.seasonSeed^0x9E37)+step*7919)>>>0;
}

function startLive(g,step,slot){
  const oj=isHotSeat()?coachIndexOf(opponentOf(g)):-1;
  const h2h=oj>=0&&oj<(S.turn||0);                 // an earlier coach waited for this one
  const e=h2h?h2hElo(g,step,oj):SEA.matchupElo(g,plan);
  const rng=new RNG(liveSeed(step));
  const userIsHome=(g.home===S.myTeam);
  const oppPlan=h2h?((S.coaches[oj].plans&&S.coaches[oj].plans[step])||"balanced"):"balanced";
  const knock=SEA.phase!=="week"||!!g.cup, ctx=typeof gameCtx==="function"?gameCtx(g.home,g.away,SEA.year,step):undefined;
  const ckey0=callKey(step)+(slot?"#"+slot:""), pm=((S.planMid&&S.planMid[ckey0])||[]).map(x=>x.slice());   // round 68: plan changes made in this game
  live={pm:pm,g:g, step:step, slot:slot||0, ckey:callKey(step)+(slot?"#"+slot:""),
        eng:makeLiveGame(rng,e.h,e.a,
              userIsHome?plan:oppPlan, userIsHome?oppPlan:plan,
              h2h?{home:true,away:true}:userIsHome,
              // a knockout (a postseason game, a cup tie): extra time and
              // penalties in soccer, sudden death in hockey, not a draw or a
              // shootout. Without it a level play-off left no winner.
              knock, ctx, pm),
        args:[e.h,e.a,userIsHome?plan:oppPlan,userIsHome?oppPlan:plan,h2h?{home:true,away:true}:userIsHome,knock,ctx,pm],
        drives:[], ask:null, done:false,
        paused:(S.watchStep===true), userIsHome:userIsHome,
        h2h:h2h?{coach:oj,team:opponentOf(g)}:null};
  // replay any answers already recorded for this week
  live.replay=((S.calls&&S.calls[live.ckey])||[]).slice();
  live.ri=0;
  reveal=null; watch=null;
  liveTick();
}

function syncTail(r){ if(r&&Array.isArray(r.drives)&&r.drives.length>live.drives.length&&r.drives.slice(0,live.drives.length).every((d,i)=>d===live.drives[i]))
  for(let i=live.drives.length;i<r.drives.length;i++)live.drives.push(r.drives[i]) }
function liveTick(){
  if(live&&live.finishing){ if(live.timer)clearTimeout(live.timer); live.finishing=false; if(live.hold&&typeof hlRelease==="function")hlRelease(true); live.done=true; finishLive(); return }
  if(live&&live.hold&&typeof hlRelease==="function")hlRelease(true);
  if(!live||live.done)return;               // a click after the final whistle: the game is already recorded
  if(live.timer){clearTimeout(live.timer);live.timer=null}
  if(!live.kicked){                       // a beat on the empty field first
    live.kicked=true; sfx("start");
    render();
    if(!live.paused){live.timer=setTimeout(liveTick,650);return}
    return;
  }
  let guard=0, fresh=null;
  while(guard++<(live.ff?4000:200)){
    const r=live.eng.next();
    // a period the engine plays inside its finish (hockey's overtime, a shoot-out) is in its drive list but
    // was never handed back one stretch at a time: a played 3-4 overtime loss was recorded and replayed as
    // 3-3 at 54 minutes (Instinct)
    if(r.done){ const k0=live.drives.length; syncTail(r);
      // round 67: overtime and a shoot-out are in the tail the engine hands back at the end; their highlights play
      // before the final whistle (Ian: a 5-4 shoot-out win he never saw)
      // the screen may still be the overtime call, with no pitch: the live view is drawn first, the score held
      const tail=live.drives.slice(k0); let hm=0;
      if(!live.ff&&tail.length&&typeof hlPlayTail==="function"&&typeof hlCan==="function"&&hlCan()){
        live.hold={n:k0,h:live.lastH||0,a:live.lastA||0}; live.ask=null; render(); hm=hlPlayTail(live,tail); if(!hm)live.hold=null }
      if(hm){ live.finishing=true; live.timer=setTimeout(()=>{ live.finishing=false; if(live.hold&&typeof hlRelease==="function")hlRelease(true); live.done=true; finishLive() },hm); return }
      live.done=true; finishLive(); return }
    if(r.ask){
      if(live.ri<live.replay.length){          // answered before, keep going
        live.eng.reply(live.replay[live.ri++]);
        continue;
      }
      // a situation call in a decided game goes to your assistant (core 94: callInReach)
      // the floor (round 50): in a one-score game the crunch-time read is the player's, never gated: "the gate should filter
      // the trivial; it must not confiscate the climax" (Muse). A read is judged on the evidence, not the replays.
      const floorCall=r.ask.k==="close"&&typeof CLOSE_FLOOR!=="undefined"&&Math.abs((r.mine||0)-(r.theirs||0))<=CLOSE_FLOOR||lateFloorDue(live);
      if(!floorCall&&typeof SPREAD_KINDS!=="undefined"&&(SPREAD_KINDS[r.ask.k]||GATE_KINDS[r.ask.k])&&live.args&&!live.h2h){
        const j=live.replay.length, meH=r.side?r.side==="home":live.g.home===S.myTeam;
        const p=GATE_KINDS[r.ask.k]?callInReach(live.args,liveSeed(live.step),live.replay,meH,j):0.5;
        if(p<GATE_LO||p>GATE_HI||neverAsk(r.ask.k)||(SPREAD_ON&&(SPREAD_KINDS[r.ask.k]||r.ask.spread)&&callSpread(live.args,liveSeed(live.step),live.replay,meH,j,r.ask.opts,r.ask)<SPREAD_MIN)){ const v=impactDefault(r.ask), k=live.ckey||callKey(live.step);
          S.calls=S.calls||{}; S.calls[k]=(S.calls[k]||[]).concat([v]);
          S.callAuto=S.callAuto||{}; S.callAuto[k]=(S.callAuto[k]||[]).concat([j]);
          // the rare decisions say so when the assistant takes them (round 46: both testers met neither foul trouble nor
          // the back-to-back goalie in a week of play, and couldn't tell rare from missing)
          if(ANNOUNCE_KINDS[r.ask.k]){ const AS={fouls:"sit",gstart:"backup"}, o=(r.ask.opts||[]).find(x=>x[0]===v&&!/assistant/i.test(x[1]))||(r.ask.opts||[]).find(x=>x[0]===AS[r.ask.k]); /* left to him: he sits a star in foul trouble, starts the backup */ live.autoNote={h:r.ask.k==="gstart"?"Second night of a back-to-back":(r.ask.h||""), l:o?o[1]:"", at:live.drives.length, rule:r.ask.k==="fouls"&&typeof foulRule==="function"?foulRule():""} }
          live.replay.push(v); live.ri=live.replay.length; live.eng.reply(v); continue } }
      if(lateFloorDue(live,true))live.lateShown=true;   // round 71: the late window has had its call
      live.ff=false;                            // skipping stops at your next call
      live.ask={dp:r.ask, mine:r.mine, theirs:r.theirs, q:r.q,
                team:r.side?(r.side==="home"?live.g.home:live.g.away):S.myTeam, at:Date.now(), floor:!!floorCall};
      render();
      return;
    }
    // the score before this stretch (kept here: drives record it differently by sport,
    // and football's don't carry sh/sa, which made every drive look like a score)
    const pH=live.lastH||0, pA=live.lastA||0;
    live.drives.push(r.drive); fresh=r.drive;
    // round 66: when a highlight will play this stretch, the page keeps the score, the run of play and the goal's
    // sound and flash as they were until the clip is over (Ian: a goal was told before the ball went in). hlRelease
    // shows them.
    if(!live.ff){ if(typeof hlWillPlay==="function"&&hlWillPlay(live,r.drive))live.hold={n:live.drives.length-1,h:pH,a:pA,clock:typeof hlHeadClock==="function"&&HL.pending&&HL.pending.clips?hlHeadClock(HL.pending.clips[0]):null}; else feelSpell(live,pH,pA) }
    live.lastH=live.eng.h; live.lastA=live.eng.a;
    if(live.ff)continue;                       // skipping: on to the next call or the final whistle
    break;
  }
  render();
  // the stretch's highlights play, and the next stretch waits for them (core 97_highlights; 0 where there are none)
  const hm=fresh&&typeof hlPlay==="function"?hlPlay(live,fresh):0;
  if(!hm&&live.hold&&typeof hlRelease==="function")hlRelease();   // nothing played after all: show it now
  if(!live.paused&&!live.done&&!live.ask){
    live.timer=setTimeout(liveTick, Math.max(liveGap(),hm));
  }
}
/* your game plan, changed mid-game: from the next stretch, recorded so a reload or a replay plays it the same */
function livePlanNow(){ if(!live)return plan; const side=live.userIsHome?"home":"away", c=(live.pm||[]).filter(x=>x[1]===side); return c.length?c[c.length-1][2]:(live.args?live.args[live.userIsHome?2:3]:plan) }
function setPlanMidGame(p){
  if(!live||live.done||!PLANS[p]||live.h2h)return; const side=live.userIsHome?"home":"away"; if(livePlanNow()===p)return;
  const n=live.drives.length; for(let i=live.pm.length-1;i>=0;i--)if(live.pm[i][0]===n&&live.pm[i][1]===side)live.pm.splice(i,1);
  live.pm.push([n,side,p]); setLivePlan(live.eng,side,p);
  S.planMid=S.planMid||{}; S.planMid[live.ckey]=live.pm.map(x=>x.slice()); save(); render() }
/* the bar under the live game: your plan from here, and how much of the game to watch */
function livePlanBarHTML(){
  if(!live||live.done||typeof PLANS==="undefined")return "";
  const cur=livePlanNow(), HLM=[["goals","Goals only"],["key","Key moments"],["all","Every chance"],["full","Full match"],["off","Off"]];
  return `<div class="liveplan" style="margin:8px 0 2px">${live.h2h?"":`<div class="fnote" style="margin-bottom:4px">Game plan from here${(live.pm||[]).length?" (changed in this game)":""}</div>
    <div class="wspeed">${Object.keys(PLANS).map(k=>`<button class="spbtn" data-midplan="${k}" aria-pressed="${cur===k}">${esc(PLANS[k].l)}</button>`).join("")}</div>`}
    ${typeof hlCan==="function"&&hlCan()?`<div class="fnote" style="margin:6px 0 4px">Highlights</div>
    <div class="wspeed">${HLM.filter(([v])=>v!=="full"||(typeof HL_SPORT!=="undefined"&&HL_SPORT.ambient)).map(([v,l])=>`<button class="spbtn" data-hlm="${v}" aria-pressed="${hlMode()===v}">${l}</button>`).join("")}</div>`:""}</div>` }
function liveGap(){
  // a full match: the pitch keeps playing between the moments, so each stretch takes long enough to watch (round 68)
  if(typeof hlMode==="function"&&hlMode()==="full"&&typeof HL_SPORT!=="undefined"&&HL_SPORT.ambient&&typeof hlCan==="function"&&hlCan())return Math.round(Math.max(1200,4200/Math.sqrt(speedMult())));
  if(typeof liveGapFor==="function")return liveGapFor(live,speedMult());   // the sport paces it (soccer: by what happened)
  const n=DRIVES_PER_TEAM*2;
  return Math.max(120,Math.min(2600,Math.round(7200/n/speedMult())));
}
function answerLive(v){
  if(!live||live.done||!live.ask)return;    // a second click on a call already answered
  S.calls=S.calls||{};
  const k=live.ckey||callKey(live.step);
  S.calls[k]=(S.calls[k]||[]).concat([v]);
  live.replay.push(v); live.ri=live.replay.length;
  live.eng.reply(v);
  live.ask=null; sfx("tap");
  save(); liveTick();
}
let liveEndedAt=0;
function finishLive(){ liveEndedAt=Date.now();
  if(view!=="team"&&view!=="scores")view="team";   // the result card lives on the team page: a game started from Dynasty ended there, with no card (Grokbot)
  if(live.finished)return;                  // once per game, however it's reached
  live.finished=true;
  const g=live.g;
  feelFinal(live);
  const meHome=(g.home===S.myTeam);
  const played={team:S.myTeam, other:(meHome?g.away:g.home),
              mine:(meHome?live.eng.h:live.eng.a),
              theirs:(meHome?live.eng.a:live.eng.h),
              drives:live.drives};
  if(LEAGUE.tracksOT){played.ot=live.eng.ot||0; played.so=!!live.eng.so}
  if(live.eng.rest&&live.eng.rest[meHome?"home":"away"])played.rested=true;   // starters rested: fewer knocks this week (Season._resolve)
  if(g.cup)played.cup=true;
  // was each call the better percentage play? (sports that judge their calls:
  // the same game replayed from that moment with each answer, many times)
  if(typeof callVerdicts==="function"&&!live.h2h&&live.args){
    const AU=(S.callAuto||{})[live.ckey||callKey(live.step)]||[];
    const V=callVerdicts(live.args,liveSeed(live.step),yourAnswers(live.replay,AU),meHome);
    if(V.judged)played.judged=V.judged;
    if(V.close)played.close=V.close;               // the nearest thing to a graded call, for a quiet game's debrief
    if(V.closes&&V.closes.length)played.closes=V.closes;   // every call made that the replays couldn't separate: listed, not graded (Grokbot: 5 calls, 3 lines)
    if(V.length)live.eng.log=(live.eng.log||[]).concat(V.map(v=>Object.assign({side:meHome?"home":"away"},v))) }
  // what your calls did: the same game with the assistant's call, and its worth over many replays
  if(!live.h2h&&live.args&&(live.replay||[]).length&&typeof callImpact==="function"){
    const I=callImpact(live.args,liveSeed(live.step),yourAnswers(live.replay,(S.callAuto||{})[live.ckey||callKey(live.step)]),meHome);
    // where a graded call is the same call, its replays decide both lines: two samples of the same
    // question disagreed in words (Grokbot, three reports)
    I.forEach(c=>{ const v=(live.eng.log||[]).find(x=>x.k==="call"&&x.h===c.h&&x.rk&&x.rk[c.pk]!==undefined&&x.rk[c.dk]!==undefined);
      if(v){ c.worth=Math.round((v.rk[c.pk]-v.rk[c.dk])*10)/1000;
        // the headline judges the call as the bullets do, against the best option (Grokbot: "A strong call" above
        // "As good as any", "A good call" beside a cross)
        const ks=Object.keys(v.rk), top=Math.max(...ks.map(k=>v.rk[k])); c.q=v.rk[c.pk]-top; c.sp=top-Math.min(...ks.map(k=>v.rk[k])) }
      else if(played.closes&&played.closes.some(x=>x.h===c.h)){ c.q=0; c.sp=0 } });
    if(I.length){ played.impact=I;
      const C=careerCalls(true);   // round 71: one career count, kept, only ever added to
      const L=S.callLedger=S.callLedger||{}, Y=L[SEA.year]=L[SEA.year]||{n:0,worth:0};
      I.forEach(c=>{Y.n++; Y.worth=Math.round((Y.worth+c.worth)*1000)/1000; if(Number.isFinite(c.worth)){ C.n++; C.w=Math.round((C.w+c.worth)*1000)/1000 } });
      Object.keys(L).forEach(y=>{ if(+y<SEA.year-1)delete L[y] }) } }
  // your reads, and whether they were right (sports whose engines keep a log)
  if(live.eng.log){ const side=meHome?"home":"away", R=live.eng.log.filter(x=>x.side===side);
    if(R.length){ played.reads=R.map(x=>{ const y=Object.assign({},x); delete y.side; return y });
      const T=S.readTally=S.readTally||{n:0,right:0,yr:{}}, Y=T.yr[SEA.year]=T.yr[SEA.year]||{n:0,right:0};
      // reads only: a call is priced in wins against your assistant (the ledger), not right or wrong (Instinct: "11 of 11
      // right (100%)" above a call that cost 6 games in 100). A read the screen couldn't show isn't counted.
      R.forEach(x=>{ if(x.unclear||x.k==="call"||x.waited||(x.k==="prep"&&x.followed))return; T.n++; Y.n++; if(x.right){T.right++; Y.right++}}) } }   // round 71: not a report left to the assistant
  // soccer: a drawn game, or who won a shoot-out (from your side: mine / theirs)
  if(LEAGUE.draws){played.draw=!!live.eng.draw;
    if(live.eng.pens)played.pens=((live.eng.pens==="home")===(live.g.home===S.myTeam))?"mine":"theirs"}
  SEA.forcedList=SEA.forcedList||[];
  SEA.forcedList.push(played);
  // keep it in the save: a reload must replay this result, not re-simulate
  S.played=S.played||{};
  const pk=callKey(live.step);
  S.played[pk]=(S.played[pk]||[]).concat([JSON.parse(JSON.stringify(played))]);
  if(!live.h2h&&typeof recordStory==="function")recordStory(played,g,live.step,meHome);   // the Film Room, the night's comeback (round 41)
  const step=live.step;
  live.result={hp:live.eng.h,ap:live.eng.a,
               mine:(g.home===S.myTeam?live.eng.h:live.eng.a)};
  // a second game of yours this step (a midweek cup tie): play it live too.
  // In a hot seat, a tie against a coach who comes later this turn waits for
  // them (they play it, both calling), as league meetings do
  if(SEA.phase==="week"&&SEA.gamesFor){
    const mine=SEA.gamesFor(S.myTeam,step), done=(S.played[pk]||[]).filter(p=>p.team===S.myTeam&&(!LEAGUE.splitCup||!!p.cup===!!SEA.half)).length;
    if(mine.length>done){ const nx=mine[done];
      if(isHotSeat()&&coachIndexOf(opponentOf(nx))>(S.turn||0))handoffNotes[opponentOf(nx)]={vs:S.myTeam, coach:S.career.name};
      else { live=null; save(); startLive(nx,step,done); return } }
  }
  // in a hot seat, hand over before the week is resolved
  if(isHotSeat() && (S.turn||0) < coachCount()-1){
    stashCoach();
    live=null; plan="balanced";
    loadCoach((S.turn||0)+1);
    handoff=true; save(); render(); return;
  }
  resolveWeek(step);
}

/* A cup night (the second part of a split cup week) that none of the
   coaches' teams is in: play it straight away, nobody needs to press for it. */
function skipCupNight(){
  if(!LEAGUE.splitCup||!SEA.half||SEA.phase!=="week")return;
  const teams=isHotSeat()?S.coaches.map((c,i)=>i===(S.turn||0)?S.myTeam:c.myTeam):[S.myTeam];
  if(teams.some(t=>SEA.gamesFor(t,SEA.step).length))return;
  SEA.userTeam=S.myTeam; SEA.advance(); clinchAfter(); S.steps++;
}
/* Everyone has had their turn: play out the rest of the league. */
function resolveWeek(step){
  handoffNotes={};
  SEA.userTeam=S.myTeam;
  const wasCup=!!SEA.half, wasPost=SEA.phase!=="week";
  SEA.advance(); clinchAfter();
  SEA.forcedList=[]; SEA.forced=null;
  S.steps++;
  skipCupNight();
  if(isHotSeat())plan="balanced";               // one coach: your gameplan stays as you set it
  flash={type:wasPost?"post":"week",step:step,cup:wasCup};     // a live playoff game gets its result card too
  // on a phone the result card is on the Team view: a game finished from Scores showed only the bracket (Instinct,
  // round 42: "a playoff win without an ending")
  if(!isWide())view="team";
  if(isHotSeat()){ stashCoach(); loadCoach(0) }
  save(); render();
}

/* Skip: the game runs on at once to your next call, which you still make (Grokbot: one tap of Skip jumped to
   the final score and your assistant took the calls, graded as yours). With no call left it's the final whistle. */
function skipLive(){
  if(!live||live.done||live.ask)return;
  if(live.timer){clearTimeout(live.timer);live.timer=null}
  live.kicked=true; live.ff=true; liveTick();
}
function endLive(){
  const was=live;                              // finishing can start your next game (a cup tie): keep that one
  if(live&&live.timer)clearTimeout(live.timer);
  if(live&&!live.done){                        // skip: run the rest instantly
    live.skipped=true; live.done=true;
    let guard=0;
    while(guard++<400){
      const r=live.eng.next();
      if(r.done){ syncTail(r); break }
      // a skipped game's remaining calls take the neutral option (the last:
      // stay the course, play it straight), not the aggressive first one
      // your assistant's, and not graded as yours (Grokbot: a skipped read was graded on the card)
      if(r.ask){ const v=r.ask.opts[r.ask.opts.length-1][0]; live.eng.reply(v);
        S.calls=S.calls||{};const k=live.ckey||callKey(live.step);
        S.callAuto=S.callAuto||{}; S.callAuto[k]=(S.callAuto[k]||[]).concat([(S.calls[k]||[]).length]);
        S.calls[k]=(S.calls[k]||[]).concat([v]); continue }
      live.drives.push(r.drive);
    }
    finishLive();
  }
  if(live===was)live=null; render();
}
let wide=false;
function isWide(){try{return window.innerWidth>=1024}catch(e){return false}}
let U=null, SEA=null, view="team", flash=null;

const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const el=id=>document.getElementById(id);

function snap(u){return JSON.parse(JSON.stringify(u))}

/* promoting a backup. An injury belongs to the player, not the slot: if the
   starter is hurt, his injury goes to the bench with him and stops costing
   the team (his replacement is the starter now, and in the team's strength).
   Promotions saved before Nov 2026 (plain numbers) replay as they were played:
   the injury stayed on the slot (Muse: "promote the healthy backup and the
   roster shows him as OUT"). */
function swapDepth(sea,i){
  const moveInj=typeof i==="object"; if(moveInj)i=i.i;
  const R=sea.roster&&sea.roster[S.myTeam];
  if(!R||!R[i]||!R[BK(i)])return;
  // by the change, not recomputed: the season's strength isn't rosterElo alone, so a swap and a swap back left it
  // somewhere else (Muse: a restored lineup read 83% then 66%; college football 33% then 28%, and stayed there)
  const before=rosterElo(R), t=R[i]; R[i]=R[BK(i)]; R[BK(i)]=t;
  sea.talent.base[S.myTeam]+=rosterElo(R)-before;
  if(moveInj)(sea.talent.inj[S.myTeam]||[]).forEach(e=>{
    if(e.idx===i){ e.idx=BK(i); e.m0=e.m; e.m=0 }
    else if(e.idx===BK(i)){ e.idx=i; if(e.m0!=null){ e.m=e.m0; delete e.m0 } } });
}

/* Featuring and ice time change how your games play from the moment you
   choose, so each change is kept with the step it was made at: a reload
   replays every game with the choice that was in force when it was played.
   (Only the latest was kept, and every simmed game replayed with it: records
   drifted between loads, 77-5 to 71-11; the title screen's summary, written
   at the last save, disagreed until the career was opened. Muse.) With no
   log for this season the choice hasn't changed since it began. */
function noteChoice(k,was,now){
  // logged in the offseason too, after the last game (so never applied to one): with no log for the
  // season, a reload replays it with today's choice from the first game, and featuring someone new
  // in the offseason rewrote last season (Grokbot: the final card went 54-28 to 53-29; measured in
  // four games, hockey by 13 wins)
  if(!SEA)return;
  // (called after the change: "was" is what held since the season began)
  if(!S.chLog||S.chLog.year!==SEA.year)S.chLog={year:SEA.year, ch:[],
    f0:k==="f"?(was===undefined?null:was):(S.featured===undefined?null:S.featured), d0:k==="d"?(was||null):(S.deploy||null)};
  S.chLog.ch.push({s:SEA.step, k:k, v:now===undefined?null:JSON.parse(JSON.stringify(now))});
}
/* a confirm on the page itself: the first tap turns the button into the
   question, the second does it. Browser dialogs (confirm) can be blocked or
   dismissed without a word, and then the button just does nothing (Muse: "Make a
   change" never worked, and sim-ahead kept stopping on it). */
function tapTwice(b,ask,fn){
  if(b.dataset.armed==="1"){ delete b.dataset.armed; fn(); return }
  b.dataset.armed="1"; const was=b.innerHTML, lab=b.getAttribute&&b.getAttribute("aria-label"); b.innerHTML=ask; b.classList.add("armed");
  if(lab)b.setAttribute("aria-label",ask);           // a screen reader hears the question too
  setTimeout(()=>{ if(b.dataset.armed==="1"){ delete b.dataset.armed; b.innerHTML=was; b.classList.remove("armed"); if(lab)b.setAttribute("aria-label",lab) } },5000);
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
  S.promos[k].push({i:i});
  swapDepth(SEA,{i:i});
  save(); render();
}

function rebuild(){
  if(S&&S.myTeam&&typeof careerCalls==="function")careerCalls(true);   // round 71: the career count is fixed as the career opens, then only added to
  plan=(!S.coaches||S.coaches.length<2)&&S.planNow?S.planNow:"balanced";   // the gameplan you last chose
  U=snap(S.uStart);
  syncConf(U);
  NAMES.forEach(t=>distinctStaff(U,t)); distinctLeague(U);   // saves from before names were kept distinct
  U.userTeam=S.myTeam;
  if(S.schedLock&&S.schedLock.year===U.year)U.schedLock=S.schedLock;
  SEA=new Season(U,S.seasonSeed);
  if(SEA._lock&&!(S.schedLock&&S.schedLock.year===U.year)){ S.schedLock=SEA._lock; lockNew=true }   // kept from now on
  delete U.schedLock;
  SEA.userTeam=S.myTeam;
  SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;
  // a save from before Nov 2026 past its first season can't tell this season's promotions and firings from last
  // season's: they're dropped (a lost one is redone in a tap; a stale one fired a coordinator for a whole season)
  if(S.choiceYear!==SEA.year){ if(S.choiceYear!==undefined||(S.history&&S.history.length)){ S.promos={}; S.fires={} } S.choiceYear=SEA.year }
  const CL=S.chLog&&S.chLog.year===SEA.year?S.chLog:null;   // the choices as they were made (noteChoice)
  if(CL){ SEA.featured=CL.f0; SEA.deploy=CL.d0 }
  for(let n=0;n<S.steps;n++){
    const i=SEA.step, first=!SEA.half;          // the step being played (a cup week's two parts share one)
    if(CL&&first)CL.ch.forEach(c=>{ if(c.s===i){ if(c.k==="f")SEA.featured=c.v; else SEA.deploy=c.v } });
    if(first&&S.promos&&S.promos[i])S.promos[i].forEach(k=>swapDepth(SEA,k));
    if(first&&S.fires&&S.fires[i])S.fires[i].forEach(sd=>SEA.fireCoordinator(S.myTeam,sd));
    const ans=(S.calls&&S.calls[callKey(i,SEA.year)+(SEA.half?"#1":"")])||[]; let ai=0;
    const pl=S.played&&S.played[callKey(i,SEA.year)];
    // recorded answers replay a game only for old saves that kept no live
    // results; where results are kept, any other game of yours that step
    // (a cup tie simulated in a hot seat) was played without them
    SEA.decideHook=(ans.length&&!(pl&&pl.length))?(()=>ans[ai++]||"normal"):null;
    SEA.plan=planFor(i,SEA.half);
    SEA.forcedList=pl?JSON.parse(JSON.stringify(pl)):[];
    SEA.advance();
    SEA.forcedList=[]; SEA.forced=null;
  }
  SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;   // and now, what's chosen now
  SEA.plan=plan;
  replayCarousel();
  auditTrophies();
}
/* Opening the offseason runs the league's coaching carousel, and it changes the league itself:
   head coaches hired and fired, coordinators hired away, every coach's record. A reload rebuilt
   the league from the season's start without it, so a coordinator hired away was still on your
   staff (Grokbot) and the next season began from another league (measured: head coaches,
   coordinators, rankings and history all differed). Replayed here with the same dice and the
   same inputs, kept when it first ran (older saves work them out again). */
function replayCarousel(){
  if(!SEA||SEA.phase!=="done")return;
  const yr=SEA.year, my=S.myTeam; let users;
  if(isHotSeat()){ if(!(S.carousel&&S.carousel.year===yr))return; users=S.carousel.users }
  else{ if(!(S.off&&S.off.year===yr))return; users=S.off.act&&S.off.act.users }
  if(!users){
    if(isHotSeat()){ users={}; S.coaches.forEach((c,i)=>{ const cur=i===(S.turn||0), t=cur?my:c.myTeam, H=(cur?S.history:c.history)||[];
      users[t]=missedTwiceFor(t,H,(cur?S.expNow:c.expNow)||LEAGUE.goals.expectations(U.program[t])) }) }
    else users={[my]:missedTwice(my,S.expNow||expectations())};
  }
  const rng=new RNG((S.seasonSeed^(U.year*7919))>>>0);
  recordCoaches(U,SEA.rec,SEA.champion,SEA.confChampions(),SEA.year,SEA.drw);
  offseasonCoaching(U,rng,SEA.rec,SEA.elo,users);
}
/* trophies the record can check, checked against it: a save from before a fix keeps a trophy it
   never earned (Muse: Century, "win 100 games", shown at 64 career wins). Only ones the record
   decides outright: the rest were earned in a moment the save doesn't keep. */
function auditTrophies(){
  const C=S.career; if(!C||!C.ach||!SEA||!S.myTeam)return;
  if(C.ach.century&&careerNow(C).w<ACH_CENT())delete C.ach.century;   // (round 60: per league; an earned one from the old 100 goes too)
}

let replaceAsk=false;        // the title screen asking which career a new one replaces (all slots full)
let lockNew=false;           // a schedule lock made on this load, not yet saved (rebuild)
let introAt=null;            // the "How to play" page showing, or null: never in a save
let saveOK=null;                     // did the last save land? null = not tried yet
/* Saves are coalesced: calls made in the same burst share one save, of the
   state as it stands when it runs (compressing a long career takes a
   moment). In a browser it runs after the screen has drawn. */
let savePending=null;
/* One career, two tabs (or windows): each save bumps a revision kept beside
   it, and a tab only saves over the revision it last read or wrote. A tab left
   open on an older state wiped newer progress without a word (measured:
   six games gone), which testers saw as careers "coming back" after an
   erase, title summaries a season behind, and a playoff series that changed
   on reload. Now the older tab stops saving and says so. */
let saveRev=null, staleTab=false, saveFail=false;
const REVKEY=n=>KEYFOR(n)+"-rev";
/* which of two copies of a save is further along (round 50; store.get asks when the database and localStorage
   disagree): revisions by number; careers by season, then by steps played. Anything unreadable: the database's. */
const savePos=v=>{ const d=JSON.parse(lzwUnpack(v)); if(!d||!d.myTeam)return null;
  return [(d.seasonNow&&d.seasonNow.year)||0, (d.history||[]).length, +d.steps||0] };
const pickMemo=new Map();
store.pick=function(dv,lv,k){
  if(/-rev/.test(k)||/^\d+$/.test(dv)&&/^\d+$/.test(lv))return (+lv||0)>(+dv||0)?1:0;
  const mk=k+"|"+dv.length+"|"+lv.length; if(pickMemo.has(mk))return pickMemo.get(mk);
  let w=0; try{ const a=savePos(dv), b=savePos(lv); if(a&&b){ for(let i=0;i<3;i++){ if(b[i]!==a[i]){ w=b[i]>a[i]?1:0; break } } } }catch(e){ w=0 }
  pickMemo.set(mk,w); return w };
async function readRev(n){ try{ const r=await store.get(REVKEY(n)); return r?(+r.value||0):0 }catch(e){ return null } }
async function claimSlot(n){ saveRev=await readRev(n); staleTab=false }
async function bumpRev(n){ const v=(await readRev(n))+1; try{ await store.set(REVKEY(n),String(v)) }catch(e){} return v }
/* a save that didn't land is said at once, not only on the way out: the browser's storage for these six games is
   full (every career, every game, one allowance) or blocked */
/* a live game's label: once it's over, the series state it carried (where the series stood before the game) goes
   (round 56: "SERIES TIED 1-1" above "Series 2-1: you lead" on the final card: Muse) */
function liveLabel(g){ const l=g&&g.label||""; return live&&live.done?l.split(" \u00b7 ")[0]:l }
/* the offseason's season (round 56: baseball's is the winter, "the start of summer" read wrong: Instinct) */
/* what a margin means in this sport (round 60: the words were football's, 3 points close, 21 a rout, 28 never in doubt,
   38 the week's blowout; a hockey or soccer side "lost a heartbreaker" by three, and nothing was ever routed) */
/* how long a run must be to be news (round 60: three straight losses was a slide and four a story in a 12-game season,
   and in 162 games that's most weeks): two more over 50+ games a season, one more over 20+ */
function gamesPerTeam(){ try{ return SEA.sched.length*2/NAMES.length }catch(e){ return 12 } }
function RUN(n){ const G=gamesPerTeam(); return n+(G>50?2:G>20?1:0) }
function MG(k){ const D={close:3,rout:21,crush:28,blow:38}; const M=(typeof SPORT!=="undefined"&&SPORT.margins)||{}; return M[k]!==undefined?M[k]:D[k] }
function OFFW(){ return (LEAGUE.text&&LEAGUE.text.offWord)||"summer" }
/* a regular-season series (round 57, baseball): "Game 2 of 3 · you took the first", from the games already played in it */
function serLine(ng,my){
  const done=SEA.sched.filter(x=>x.ser===ng.ser&&x.week<ngWeek(ng)), res=[];
  done.forEach(x=>{ const W=SEA.weeks[x.week]; const g=W&&(W.games||[]).find(y=>y.home===x.home&&y.away===x.away); if(g&&g.winner)res.push(g.winner===my) });
  const w=res.filter(Boolean).length, l=res.length-w, where=ng.home===my?"at home":"on the road";
  const so=!res.length?"the series opens":w===l?`series level ${w}-${l}`:w>l?`you lead ${w}-${l}`:`you trail ${l}-${w}`;
  return `Game ${ng.sg} of ${ng.sn} ${where} &middot; ${so}`;
}
function ngWeek(ng){ return ng.week!==undefined?ng.week:SEA.step }
/* the postseason's last round (round 56: "beaten in the final" asked whether the team that beat you went on to win it all, so a
   Division Series loss to the eventual champion read as a final: Instinct) */
function finalRound(){ const P=LEAGUE.post&&LEAGUE.post.phases; return P&&P.length?String(P[P.length-1]).replace(/g\d+$/,""):null }
/* what the browser said when it refused (round 56): the error's name, and the storage in use against the allowance */
function saveWhy(){ const F=store.lastFail; if(!F)return " (the disk may be nearly full)";
  const mb=b=>b>=1e9?(b/1e9).toFixed(1)+" GB":Math.round(b/1e6)+" MB";
  return ` (it said: ${esc(F.why)}${F.quota?`; storage in use: ${mb(F.used||0)} of ${mb(F.quota)}`:""})` }
function saveFailHTML(){ return saveFail&&!staleTab?`<div class="staletab" id="savefail" role="alert"><b>This career isn't saving.</b> ${store.kind()==="none"?"This browser is blocking storage (private browsing often does). Download a backup now so nothing is lost.":store.kind()==="database"?`This browser refused the save${saveWhy()}. Download a backup now so nothing is lost, and tell us what it said.`:"This browser's older storage for these games is full: every career in all six games shares one allowance. Download a backup now so nothing is lost, then erase a career you don't need from the title screen."}
  <button class="skip small" id="savefailbk">Download a backup</button></div>`:"" }
/* once a season, as it's banked: a career lives only in this browser; a file keeps it safe (Muse: "nothing ever
   points at" the backup) */
function backupNagHTML(){ if(!S||!S.myTeam||S.h2h||S.backedUp===SEA.year||(S.history||[]).length<1)return "";
  return `<div class="bknag"><b>Season banked.</b> Your career lives in this browser's storage, which can be cleared or fill up. A backup file keeps it safe.
    <span class="bkbtns"><button class="skip small" id="offbk">Download a backup</button><button class="skip small" id="offbkno">Not now</button></span></div>` }
function staleTabHTML(){ return newerHTML()+saveFailHTML()+(staleTab?`<div class="staletab" id="staletab" role="alert">This career was changed in another tab or window, so this one has stopped saving.
  <button class="skip small" id="stalego">Reload to pick up where it is now</button></div>`:"") }
function save(){
  if(savePending)return savePending;
  savePending=(async()=>{
    if(typeof requestAnimationFrame==="function")
      await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
    else await Promise.resolve();
    savePending=null;
    // no career open, nothing to save. The title screen's "How to play" called save() on Skip, and
    // with no career it wrote an empty one over slot 1 (slot's default): the slot-1 wipes, found by
    // Grokbot in the code and reproduced in four games. Never again from anywhere.
    if(!S||!S.myTeam)return false;
    if(staleTab)return false;
    if(saveRev!==null&&S.myTeam){ const cur=await readRev(slot);
      if(cur!==null&&cur!==saveRev){ staleTab=true; render(); return false } }
    S.league=LEAGUE.id;                                   // every save says which game it's from
    if(SEA&&S.myTeam&&SEA.rec&&SEA.rec[S.myTeam])S.seasonNow={year:SEA.year,rec:recStr(S.myTeam),played:SEA.rec[S.myTeam][0]+SEA.rec[S.myTeam][1]+((SEA.drw&&SEA.drw[S.myTeam])||0),done:SEA.phase==="done",
      w:SEA.rec[S.myTeam][0],l:SEA.rec[S.myTeam][1],d:(SEA.drw&&SEA.drw[S.myTeam])||0,banked:!!(S.off&&S.off.year===SEA.year),champ:SEA.phase==="done"&&SEA.champion===S.myTeam};
  try{saveOK=!!(await store.set(KEYFOR(slot),lzwPack(saveText(S))))}catch(e){saveOK=false}
    if(saveOK&&S.myTeam)saveRev=await bumpRev(slot);
    if(saveFail!==!saveOK){ saveFail=!saveOK; render() }
    return saveOK;
  })();
  return savePending;
}
/* The active coach's stash in S.coaches holds a copy of S.history (and it
   is S.history that's current): saved as a marker, not a second copy, and
   restored on load. A 30-season basketball save was 9.2 MB, a third of it
   this duplicate. */
function saveText(S){
  if(!S.coaches||!S.coaches.length)return JSON.stringify(S);
  const t=S.turn||0, cs=S.coaches.map((c,i)=>i===t&&c&&c.history?Object.assign({},c,{history:"@S.history"}):c);
  return JSON.stringify(Object.assign({},S,{coaches:cs}));
}
function unsaveDup(d){
  (d.coaches||[]).forEach(c=>{ if(c&&c.history==="@S.history")c.history=d.history });
  return d;
}
/* which game a save belongs to: new saves say; older ones are told apart by
   their players (pro players have contracts; basketball players play PG-C) */
function saveLeague(d){
  if(!d)return null;
  if(d.league)return d.league;
  const R=d.uStart&&d.uStart.roster; if(!R)return "cfb";
  for(const t in R){const ps=(R[t]||[]).filter(x=>x).map(x=>x.p), p=(R[t]||[]).find(x=>x); if(!p)continue;
    if(ps.indexOf("GK")>=0||ps.indexOf("ST")>=0)return "epl";     // soccer: goalkeepers and strikers
    if(ps.indexOf("G")>=0||ps.indexOf("LW")>=0)return "nhl";      // hockey: wingers and goalies (it has a C too)
    if(ps.indexOf("SS")>=0||ps.indexOf("SP")>=0)return "mlb";     // baseball: shortstops and starting pitchers (it has a C too)
    const hoops=["PG","SG","SF","PF","C"].indexOf(p.p)>=0;      // basketball positions first:
    if(hoops)return p.k?"nba":"ncaab";                            // pro basketball has contracts too
    return p.k?"nfl":"cfb"}
  return "cfb";
}
/* Move other games' saves out of the old shared slots into their own game's
   slots (first free one), once, whichever game is opened first. A save is
   removed from the old slot only after its copy has been written. */
let slotsMoved=false;
async function moveForeignSaves(){
  if(slotsMoved)return; slotsMoved=true;
  for(let n=1;n<=NSLOTS;n++){
    try{
      const r=await store.get(LEGACY_KEY+"-slot"+n); if(!r)continue;
      const lg=saveLeague(JSON.parse(lzwUnpack(r.value)));
      if(!lg||lg==="cfb"||!SAVE_KEYS[lg])continue;
      let dest=null;
      for(const m of [n].concat([1,2,3].filter(x=>x!==n))){
        if(!(await store.get(SAVE_KEYS[lg]+"-slot"+m))){dest=m;break}
      }
      if(!dest)continue;                              // nowhere to put it: leave it where it is
      const ok=await store.set(SAVE_KEYS[lg]+"-slot"+dest,r.value);
      const back=ok&&await store.get(SAVE_KEYS[lg]+"-slot"+dest);
      if(back&&back.value===r.value)await store.delete(LEGACY_KEY+"-slot"+n);
    }catch(e){}
  }
}
/* saves from before a finished game was recorded only once: drop the extra
   copies, and count the tally again from the games that are left */
function repairPlayed(d){
  if(!d||!d.played)return d;
  const T=d.readTally;
  Object.keys(d.played).forEach(k=>{ const seen=new Set(), yr=k.split(":")[0];
    d.played[k]=d.played[k].filter(p=>{ const id=p.team+"|"+p.other+"|"+!!p.cup+"|"+p.mine+"-"+p.theirs;
      if(!seen.has(id)){seen.add(id); return true}
      // a copy: take its reads back out of the tally they inflated
      if(T)(p.reads||[]).forEach(x=>{ T.n--; if(x.right)T.right--; const Y=T.yr&&T.yr[yr]; if(Y){Y.n--; if(x.right)Y.right--} });
      return false }) });
  if(T){ T.n=Math.max(0,T.n); T.right=Math.max(0,Math.min(T.right,T.n)) }
  return d;
}
/* null only when the slot is truly empty. A save that's there but won't open
   (damaged, or another game's) comes back as {broken} and is never shown as
   "Empty": an empty-looking slot invites a new career, which writes over it
   (Muse: two careers gone from slots that read Empty). */
async function loadSlot(n){
  await moveForeignSaves();
  let r=null; try{ r=await store.get(KEYFOR(n)) }catch(e){ return {broken:"storage"} }
  if(!r||!r.value)return null;
  try{ const d=unsaveDup(JSON.parse(lzwUnpack(r.value)));
    if(saveLeague(d)!==LEAGUE.id)return {broken:"another game's career"};   // never open another game's save
    return repairPlayed(migrateSave(d)) }catch(e){ return {broken:"damaged",err:String(e&&e.message||e)} }
}
/* One copy per game of the career you last opened, taken as it's opened: if
   its slot is ever found empty or unreadable, the title screen offers it back. */
const BAKKEY=()=>KEYBASE+"-lastopened";
async function keepCopy(n){ try{ const r=await store.get(KEYFOR(n)); if(r&&r.value)await store.set(BAKKEY(),JSON.stringify({n:n,at:Date.now(),v:r.value})) }catch(e){} }
async function readCopy(){ try{ const r=await store.get(BAKKEY()); if(!r)return null; const c=JSON.parse(r.value);
  const d=unsaveDup(JSON.parse(lzwUnpack(c.v))); return d&&d.myTeam?{n:c.n,at:c.at,v:c.v,team:d.myTeam,coach:(d.career&&d.career.name)||"",seasons:(d.history||[]).length}:null }catch(e){ return null } }
/* backups: a career saved as a file you keep, and opened again from it. A
   browser's storage can be cleared; a file on your computer or phone can't. */
function downloadBackup(){
  try{
    const text=lzwPack(saveText(Object.assign({},S,{league:LEAGUE.id}))), blob=new Blob([text],{type:"text/plain"});
    const a=document.createElement("a"), yr=(SEA&&SEA.year)||"";
    a.href=URL.createObjectURL(blob); a.download=`${LEAGUE.id}-${(S.myTeam||"career").replace(/[^A-Za-z0-9]+/g,"-")}-${yr}.coach`;
    document.body.appendChild(a); a.click(); setTimeout(()=>{try{URL.revokeObjectURL(a.href); a.remove()}catch(e){}},500);
    return true }catch(e){ return false }
}
/* a backup file's text to a career, or null if it isn't one of this game's */
function readBackup(text){
  try{ const d=unsaveDup(JSON.parse(lzwUnpack(String(text).trim())));
    if(!d||!d.myTeam||saveLeague(d)!==LEAGUE.id)return null; return repairPlayed(migrateSave(d)) }catch(e){ return null }
}
async function restoreBackup(file,into){
  const text=await file.text(), d=readBackup(text);
  if(!d){ alert("That file isn't a backup from this game."); return false }
  slot=into; saveRev=null; staleTab=false; S=d; S.title=false; rebuild(); S.expNow=S.expNow||expectations(); await save(); render(); return true;
}
async function allSlots(){
  const out=[];
  for(let n=1;n<=NSLOTS;n++){
    const d=await loadSlot(n);
    if(d&&d.broken){ out.push({n:n,broken:d.broken}); continue }
    // in the offseason the finished season is already in the career: take it out of "earlier seasons"
    // (it read "69-13 · 2 earlier seasons (183-63)" for 114-50: Muse)
    const N=d&&d.seasonNow, bk=N&&N.banked&&N.w!==undefined, C=d&&d.career&&(bk?{w:d.career.w-N.w,l:d.career.l-N.l,d:(d.career.d||0)-(N.d||0)}:d.career);
    out.push(d&&d.myTeam?{n:n,team:d.myTeam,year:(d.uStart&&d.uStart.year)||2026,
      coach:(d.career&&d.career.name)||"",seasons:(d.history||[]).length,
      rec:C?(LEAGUE.draws?`${C.w}-${C.d||0}-${C.l}`:C.w+"-"+C.l):"",
      // a title just won counts before the offseason banks it (round 50: "1x champion" after the second title: Muse)
      titles:(d.career?d.career.titles:0)+(N&&N.done&&N.champ&&!N.banked?1:0),
      now:d.seasonNow&&d.seasonNow.played?d.seasonNow:null}:{n:n,empty:true});
  }
  // the copy of the last career opened, offered back when its slot is empty or unreadable
  const c=await readCopy(), at=c&&out.find(x=>x.n===c.n);
  if(c&&at&&(at.empty||at.broken))at.copy={team:c.team,coach:c.coach,seasons:c.seasons,at:c.at};
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
     coaches:people.map(mk), turn:0, guide:!(roster&&roster.length>1)&&!GUIDE_SEEN.__off};   // the coach's notes, for a new career (not a hot seat)
  COACH_FIELDS.forEach(k=>{S[k]=S.coaches[0][k]});
  const u=newUniverse(seed); syncConf(u);
  S.coaches.forEach(c=>{
    u.coach[c.myTeam]={id:0,n:c.career.name,q:0,t:0,hired:true,you:true,
                       w:0,l:0,titles:0,confs:0,fired:0,stops:[]};
  });
  distinctLeague(u);
  u.schedV=3;                                            // a schedule drawn the same way every time (schedOrder); 3: round 71's spreads
  u.engV=ENGINE_NOW;                                     // round 71: new careers on the current engine
  S.uStart=snap(u); S.origProgram=snap(u.program);
  S.seasonSeed=(seed*2654435761)>>>0 % 2147483647;
  rebuild(); S.expNow=expectations(); save(); view="team"; render();
}

/* ============ advance ============ */
/* a team's record as text: W-L, or the league's own (hockey: W-L-OTL) */
/* the season's unit in words: a week in college and pro football; a night (and
   game days) in the long pro seasons */
function WK(){ return LEAGUE.text.week||"week" }
/* "for the season" only when it is: the rest of the regular season (14 was a football season's weeks, and in basketball
   "out for the season" sat beside "out 10 more game days" on one screen: Muse, round 50) */
function injSeason(w){ const left=(SEA&&LEAGUE.weeks)?Math.max(1,LEAGUE.weeks-SEA.step):14; return w>=Math.min(left,LEAGUE.weeks||14) }
/* an injury's length on a badge: games where a step is a game day (Ian: "Out 10w" in basketball) */
function outFor(n){ return LEAGUE.daily?`${n} ${n===1?"game":"games"}`:`${n}w` }
function stepWord(n){ const w=LEAGUE.text.week?"game day":"week"; return n===1?w:w+"s" }
/* a career's record: W-D-L where games can be drawn */
function careerRec(C,team,from,to){ const o=yourOTL(team,from,to); return o!==null?`${C.w}-${C.l-o}-${o}`:LEAGUE.draws?`${C.w}-${C.d||0}-${C.l}`:`${C.w}-${C.l}` }
/* hockey: your overtime losses, which careers and stops never kept (losses include them; Dynasty
   read 44-40 for a 44-31-9 season: Grokbot). Each season you coached saved its record as
   W-L-OTL, and the season being played counts too until it is banked. null outside hockey. */
function yourOTL(team,from,to){
  if(!LEAGUE.tracksOT||LEAGUE.draws||!LEAGUE.recText)return null;
  let o=0;
  (S.history||[]).forEach(h=>{ if(!h||(team&&h.team!==team)||(from!==undefined&&h.year<from)||(to!==undefined&&h.year>to))return;
    const m=/^\d+-\d+-(\d+)$/.exec(h.rec||""); if(m)o+=+m[1] });
  // this season's, unless its entry is already in the history: in the offseason its wins and losses are
  // in the career but its entry isn't written yet (Instinct: the offseason career read 41-43, three seasons)
  const inBook=(S.history||[]).some(h=>h&&h.year===SEA.year&&h.team===S.myTeam&&/^\d+-\d+-\d+$/.test(h.rec||""));
  if(SEA&&SEA.otl&&!inBook&&(!team||team===S.myTeam)&&(from===undefined||SEA.year>=from)&&(to===undefined||SEA.year<=to))o+=SEA.otl[S.myTeam]||0;
  return o;
}
/* the career so far including the season being played: a season is added to
   the career when the offseason opens, so mid-season (and after the last
   game, before the offseason) the career alone read 0-0 */
function careerNow(C){
  const my=S.myTeam, banked=S.off&&S.off.year===SEA.year;
  if(!SEA||!SEA.rec||!SEA.rec[my]||banked)return C;
  // the regular season, as the franchise's all-time line counts it (round 46: soccer's and hockey's careers took in
  // their play-off games, the all-time line didn't, and the two disagreed for every play-off season)
  const r=(SEA.regRec||SEA.rec)[my]; return Object.assign({},C,{w:C.w+r[0],l:C.l+r[1],d:(C.d||0)+((SEA.drw&&SEA.drw[my])||0)});
}
function ordinal(n){return n+(n%100>10&&n%100<14?"th":["th","st","nd","rd"][n%10]||"th")}
function recStr(t){ return LEAGUE.recText?LEAGUE.recText(t,SEA):SEA.rec[t][0]+"-"+SEA.rec[t][1] }
/* a record, with draws where the game has them (W-D-L) */
function wdl(w,l,d){ return LEAGUE.draws?`${w}-${d||0}-${l}`:`${w}-${l}` }
/* a season's record from the history book's table: [w,l,rank,draws] in soccer, [w,l,rank,,otl] in
   hockey (losses include overtime ones). Hockey's Dynasty and top-ten rows read 44-40, without
   the overtime losses (Grokbot); entries written before they were kept fall back on the record
   saved for the coach's own team. */
function histRec(r,h,t){
  if(!r)return "";
  if(LEAGUE.recText&&!LEAGUE.draws){
    if(r[4]!==undefined)return `${r[0]}-${r[1]-r[4]}-${r[4]}`;
    if(h&&h.rec&&(h.team===t)&&/^\d+-\d+-\d+$/.test(h.rec))return h.rec;
  }
  return wdl(r[0],r[1],r[3]);
}
function recFmt(t,r){ return LEAGUE.recText?LEAGUE.recText(t,SEA,r):r[0]+"-"+r[1] }
/* how many ranked teams wear a number: the top 25 in college, fewer in a 30-team league */
const RANK_TOP=(LEAGUE.rankTop||25);
/* where a team stands, in a word: table position where the league has a
   table (soccer: "7th"), otherwise its number if it wears one */
function standTag(t,rk){
  if(LEAGUE.position){const p=LEAGUE.position(t);return p?ordinal(p):"\u2014"}
  return rk[t]<=RANK_TOP||LEAGUE.rankAll?"#"+rk[t]:"NR";
}
/* "Sim game": play this one game without watching it, whatever the setting.
   Shown beside the main button, in the bottom bar and in the desktop side
   panel (on a laptop the side panel is where the buttons are). */
function simGameButton(id){
  if(!SEA||SEA.phase==="done"||(S.watchMode||"all")==="never"||prefersReduced()||(live&&!live.done))return "";
  const ug=SEA.phase==="week"?SEA.nextGame(S.myTeam):SEA.postMatchup(S.myTeam);
  return ug?`<button class="skip" id="${id}">Sim game</button>`:"";
}
let simOnce=false;
function simAdvance(){ simOnce=true; try{ doAdvance() }finally{ simOnce=false } }
/* A league with a game every calendar day (LEAGUE.skipIdle) plays through
   the days you don't play: the button always takes you to your next game. */
function skipIdleDays(){
  if(!LEAGUE.skipIdle||isHotSeat()||live)return;
  let g=0;
  while(SEA.phase==="week"&&!SEA.nextGame(S.myTeam)&&g++<30){
    // the same bookkeeping as any advance: a reload replays exactly S.steps steps
    SEA.userTeam=S.myTeam; SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;
    SEA.advance(); clinchAfter(); S.steps++;
  }
}
/* In the postseason, a round with no game of yours is the league's, not
   yours: the button sims on until you play again or it's over (it used to
   say "Play the Super Bowl" to a 5-12 team, and walk an eliminated team
   through every remaining game of every series one click at a time). */
function spectating(){
  return SEA&&SEA.phase!=="week"&&SEA.phase!=="done"&&!isHotSeat()&&SEA.postMatchup&&!SEA.postMatchup(S.myTeam);
}
function advLabel(){
  if(spectating())return "Sim to your next game, or the end";
  // a daily league skips your days off: name the date of the game it takes you to (Instinct: "PLAY OCT 16" under "NEXT UP OCT 17")
  if(LEAGUE.skipIdle&&LEAGUE.dates&&SEA.phase==="week"&&!isHotSeat()&&!SEA.nextGame(S.myTeam)){
    const nx=SEA.sched.filter(x=>x.week>SEA.step&&(x.home===S.myTeam||x.away===S.myTeam)).sort((x,y)=>x.week-y.week)[0];
    if(nx&&LEAGUE.dates[nx.week])return `Play ${LEAGUE.dates[nx.week]}`;
  }
  return SEA.buttonLabel();
}
function simPostOn(ph){
  let g=0, was=ph;
  while(SEA.phase!=="week"&&SEA.phase!=="done"&&g++<300){
    was=SEA.phase;
    SEA.userTeam=S.myTeam; SEA.advance(); clinchAfter(); SEA.forcedList=[]; SEA.forced=null; S.steps++;
    if((LEAGUE.post.stopAfter||["selection"]).indexOf(was)>=0){ view="scores"; break }     // a moment to see, not sim past: Selection Sunday, the field
    // (and shown: the click stopped there with the team page still up, so it looked like nothing happened: Grokbot)
    if(SEA.phase!=="done"&&SEA.postMatchup(S.myTeam))break;
  }
  LEAGUE.ui.afterAdvance(was);                  // the views follow the last round played (Selection Sunday's field)
  flash={type:"post"}; reveal=null; save(); render();
}
/* an old copy (round 48): the site's version.json names every game's current build; a page whose own stamp differs
   was served from the browser's cache, and says so once, with a reload that asks for the new one */
function versionCheck(){
  try{ if(typeof fetch!=="function"||!/^https?:/.test(location.protocol))return;
    const me=(location.pathname.split("/").pop()||"").split("?")[0]; if(!me)return;
    fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(V=>{
      if(!V||!V[me]||V[me]===BUILD_ID)return; window.__newer=V[me]; render() }).catch(()=>{});
  }catch(e){}
}
function newerHTML(){ return window.__newer?`<div class="savefail"><b>A newer version of this game is out.</b> Your browser opened an older copy (build ${esc(BUILD_ID)}; the current one is ${esc(window.__newer)}). <button class="skip small" onclick="location.replace(location.pathname+'?v='+window.__newer)">Load the new one</button> Your careers carry over.</div>`:"" }
/* soccer: a title, promotion or relegation settled by the week just played (95_story clinchCheck) */
function clinchAfter(){ if(typeof clinchCheck==="function"&&S.myTeam)try{ clinchCheck(S.myTeam) }catch(e){} }
function doAdvance(){
  scoreWk=null;                                   // Scores follows the new week
  skipIdleDays();
  if(SEA.phase==="done"){ openOffseason(); return; }
  const before=SEA.step;
  const ph=SEA.phase;
  S.plans=S.plans||{}; S.plans[planKey(before,SEA.half)]=plan;
  if(live&&live.done)live=null;               // last game is over; don't block the next
  ensureCoaches();
  SEA.userTeam=S.myTeam;
  SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;
  SEA.plan=plan;
  // your first game this step not yet played (a cup week has two; a reload
  // between them picks up at the second)
  const doneN=(S.played&&S.played[callKey(before)]||[]).filter(p=>p.team===S.myTeam&&(!LEAGUE.splitCup||!!p.cup===!!SEA.half)).length;
  const mineNow=(SEA.phase==="week"&&SEA.gamesFor)?SEA.gamesFor(S.myTeam,before):null;
  if(mineNow&&doneN&&doneN>=mineNow.length&&!isHotSeat()){ resolveWeek(before); return }
  const ug=(SEA.phase==="week")?(mineNow?mineNow[doneN]||null:SEA.nextGame(S.myTeam))
          :(SEA.phase!=="done"?SEA.postMatchup(S.myTeam):null);
  if(spectating()){ simPostOn(ph); return }
  const wantLive = ug && SEA.roster && !prefersReduced() && (S.watchMode||"all")!=="never" && !simOnce;
  // meeting a coach who comes later this turn: they play it, with both of you calling
  const laterRival = isHotSeat() && ug && coachIndexOf(opponentOf(ug)) > (S.turn||0);
  if(wantLive && !live && laterRival){ handoffNotes[opponentOf(ug)]={vs:S.myTeam, coach:S.career.name}; }
  else if(wantLive && !live){
    startLive(ug, before, SEA.half?1:(mineNow?doneN:0));
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
  const wasCup=!!SEA.half;
  SEA.advance(); clinchAfter();
  SEA.forcedList=[]; SEA.forced=null;
  S.steps++;
  skipCupNight();
  if(isHotSeat())plan="balanced";
  if(isHotSeat()){ stashCoach(); loadCoach(0) }
  LEAGUE.ui.afterAdvance(ph);
  flash={type:SEA.phase==="week"||before<LEAGUE.weeks?"week":"post",step:before,cup:wasCup};
  if(!isWide()&&heroGame())view="team";              // your result first, on a phone too (round 42)
  const g=heroGame();
  const rk=SEA.poll.rankMap();
  if(g&&!prefersReduced()&&(S.watchMode||"all")==="never"){
    reveal="half";
    if(revealTimer)clearTimeout(revealTimer);
    // the reveal re-renders only the screen it was for: fired on draft night it rebuilt the page between the two taps
    // of a pick and the pick was lost (found by the browser test, round 32)
    revealTimer=setTimeout(()=>{ if(reveal!=="half")return; reveal="final"; if(S.off||live)return; render() },1500);
  }else reveal=null;
  save(); render();
}

function openOffseason(){
  if(SEA.phase!=="done")return;
  const rng=new RNG((S.seasonSeed^(U.year*7919))>>>0);
  if(S.off&&S.off.year===SEA.year)return;      // already booked this coach
  const my=S.myTeam, C=S.career;
  const exp=S.expNow||expectations();
  let A;
  if(isHotSeat()){
    // once per offseason for the whole league; each coach reads their part
    if(!S.carousel||S.carousel.year!==SEA.year){
      recordCoaches(U,SEA.rec,SEA.champion,SEA.confChampions(),SEA.year,SEA.drw);
      const users={};
      S.coaches.forEach((c,i)=>{
        const cur=i===(S.turn||0);
        const t=cur?S.myTeam:c.myTeam, H=(cur?S.history:c.history)||[];
        const e=(cur?S.expNow:c.expNow)||LEAGUE.goals.expectations(U.program[t]);
        users[t]=missedTwiceFor(t,H,e);
      });
      S.carousel={year:SEA.year,act:offseasonCoaching(U,rng,SEA.rec,SEA.elo,users),users:users};
    }
    const X=S.carousel.act;
    A=Object.assign({},X,{userOpen:!!X.userOpenBy[my],candidates:X.candidatesBy[my]||null,
      staffOpen:X.staffOpenBy[my]||{oc:false,dc:false}});
  }else{
    recordCoaches(U,SEA.rec,SEA.champion,SEA.confChampions(),SEA.year,SEA.drw);
    const users={[my]:missedTwice(my,exp)};
    A=offseasonCoaching(U,rng,SEA.rec,SEA.elo,users); A.users=users;   // kept: a reload replays this (replayCarousel)
  }
  const titles=SEA.honours(my);
  C.rep=C.rep*0.94;                       // reputations fade, good and bad
  C.rep+=repDelta(SEA.rec[my][0],SEA.rec[my][1],exp.w,U.program[my],titles);
  // the board's objectives: each one met is worth reputation
  const om=objectivesMet(my); C.rep+=OBJ_REP*om;
  C.objLog=(C.objLog||[]).concat([{year:SEA.year,team:my,met:om,of:seasonObjectives(my).length}]);
  C.rep=Math.max(-48,Math.min(80,C.rep));
  const RR=(SEA.regRec||SEA.rec)[my];   // the regular season (careerNow)
  C.w+=RR[0]; C.l+=RR[1];
  if(LEAGUE.draws)C.d=(C.d||0)+((SEA.drw&&SEA.drw[my])||0);
  if(titles.natl)C.titles++; if(titles.conf)C.confs++;
  const st=C.stops[C.stops.length-1];
  st.w+=RR[0]; st.l+=RR[1]; if(LEAGUE.draws)st.d=(st.d||0)+((SEA.drw&&SEA.drw[my])||0);
  if(titles.natl)st.titles++;
  st.to=SEA.year;
  const staffCands={};
  if(A.staffOpen&&A.staffOpen.oc)staffCands.oc=coordCandidates(rng,U.program[my],"oc",C.rep);
  if(A.staffOpen&&A.staffOpen.dc)staffCands.dc=coordCandidates(rng,U.program[my],"dc",C.rep);
  // an assistant you fired during the season doesn't come back: his job is open (Muse: he returned the next season)
  // no two candidates with one name (two "Scott Blackmon"s, one unproven, one among the best: Instinct).
  // Renamed without dice, so nothing else changes.
  ["oc","dc"].forEach(side=>{ const L=staffCands[side]; if(!L)return; const seen=new Set();
    L.forEach((c,i)=>{ let k=0; while(seen.has(c.n)&&k<COACH_FIRST.length){ c.n=COACH_FIRST[(i*7+k++)%COACH_FIRST.length]+" "+c.n.split(" ").slice(1).join(" ") } seen.add(c.n) }) });
  ["oc","dc"].forEach(side=>{ if(SEA.midFired&&SEA.midFired[side]&&!staffCands[side]){
    staffCands[side]=coordCandidates(rng,U.program[my],side,C.rep); A.staffOpen=Object.assign({},A.staffOpen||{},{[side]:true}) } });
  // a league can run its own market (soccer: relative to your club, not fixed bands)
  // a hot seat: another coach's program is never on your market, even when they were fired from it the same winter.
  // Round 49 (test/firing.js): both humans fired in one offseason, the first took the second's program off the market,
  // then the second's departure handed it to a computer coach, and the first was left coaching nothing.
  const humanT=isHotSeat()?new Set((S.coaches||[]).map((x,i)=>i===(S.turn||0)?null:x&&x.myTeam).filter(Boolean)):null;
  const openJ=humanT?A.openJobs.filter(t=>!humanT.has(t)):A.openJobs;
  const jobs=A.userOpen?(LEAGUE.jobMarket?LEAGUE.jobMarket(U,rng,C.rep,openJ,my,!!A.fired):jobMarket(U,rng,C.rep,openJ,my)):[];
  const poach=A.userOpen?[]:(LEAGUE.poachOffers?LEAGUE.poachOffers(U,rng,C.rep,openJ,my):poachOffers(U,rng,C.rep,openJ,my));
  const LO=LEAGUE.offseason.open(U,my,SEA.rec[my][0]);   // the league's own choices
  S.off={year:SEA.year,act:A,jobs:jobs,poach:poach,move:null,pool:LO.pool,staff:staffCands,
    picks:Object.assign({phil:(U.phil||"balanced"),oc:null,dc:null},LO.picks),
    rngA:[rng.a,rng.sp]};
  flash=null; save(); render();
}

function commitOffseason(){
  const P=S.off.picks, A=S.off.act, C=S.career;
  if(A.userOpen&&S.off.move===null)return;
  if(LEAGUE.ui.offseasonBlock()!==null)return;
  // rngA was meant to carry the stream on, but the state it read was hidden (undefined), so every
  // offseason has run on seed 0 from here: kept, or every future offseason would change (Nov 2026)
  const rng=new RNG(0); rng.sp=S.off.rngA[1];
  const oldTeam=S.myTeam;
  let dest=S.off.move;
  if(dest==="retire"){S.retired=true;save();render();return}
  if(dest&&dest!==oldTeam){
    // the program you leave hires someone else; you take the new job
    U.coach[oldTeam]=newCoach(rng,U.program[oldTeam]); U.coach[oldTeam].since=SEA.year+1;
    C.fired+=(A.userOpen?1:0);
    C.stops.push({team:dest,from:SEA.year+1,w:0,l:0,titles:0});
    S.myTeam=dest; U.userTeam=dest; U.phil="balanced";
    U.coach[dest]=Object.assign({},U.coach[oldTeam]||{},
      {id:0,n:C.name,q:0,t:0,hired:true,you:true,since:SEA.year+1});
  }
  ["oc","dc"].forEach(side=>{
    const cands=S.off.staff&&S.off.staff[side];
    if(cands){
      const pick=cands[P[side]!==null&&P[side]!==undefined?P[side]:0];
      if(side==="oc")U.oc[S.myTeam]=pick; else U.dc[S.myTeam]=pick;
    }
  });
  distinctStaff(U,S.myTeam);
  S.pending=S.pending||{};
  S.pending[S.myTeam]=Object.assign(LEAGUE.offseason.choices(P),{phil:P.phil,
                       featured:(S.featured===undefined?null:S.featured), deploy:S.deploy||null});
  if(isHotSeat() && (S.turn||0) < coachCount()-1){
    writeSeasonHistory(oldTeam);                // this coach's year, in their book
    stashCoach(); loadCoach((S.turn||0)+1);
    S.off=null; handoff=true; openOffseason(); save(); render(); return;
  }
  const users=S.pending; S.pending=null;
  // featuring lasts a season: remember who it was, so the roster can say it reset
  // (from the club you coached this season: after a move, S.myTeam is the new
  // one, and its player in that slot is someone else; Muse saw the new club's
  // man named. Featuring doesn't follow you: the summer's development is for
  // the player you featured, and he isn't yours any more.)
  { const fp=(S.featured!==null&&S.featured!==undefined&&SEA.roster&&SEA.roster[oldTeam])?SEA.roster[oldTeam][S.featured]:null;
    S.featuredLast=fp?{n:fp.n,year:SEA.year,team:oldTeam}:null;
    if(oldTeam!==S.myTeam){ S.featured=null; users[S.myTeam]&&(users[S.myTeam].featured=null) } }
  endSeason(rng,Object.assign({userTeam:S.myTeam,users:users,coach:null},
    LEAGUE.offseason.choices(P),{phil:P.phil,
    featured:(S.featured!==undefined?S.featured:null), deploy:S.deploy||null}), A, oldTeam);
  S.featured=null;
}

/* One coach's year, written into their own book. In a hot seat every coach
   calls this for themselves before the world moves on. */
/* team: the team this coach just coached, which is not S.myTeam if they have
   already taken another job this offseason */
function writeSeasonHistory(team){
  S.history=S.history||[];
  S.history.push(seasonEntry(team||S.myTeam));
  h2hBank(team||S.myTeam);
}
/* Head to head, every opponent (Ian: the rivalry record before a game, for any team you've played): your games,
   whichever team you coached, banked when a season is written; the season under way is counted live. Starts
   from Nov 2026: earlier seasons kept no game-by-game results except the rivalries' series. */
function h2hGames(team){
  const out=[];
  (SEA.weeks||[]).forEach(W=>(W.games||[]).forEach(g=>{ if((g.home===team||g.away===team)&&g.winner!==undefined)out.push(g) }));
  if(typeof SEA.postGamesFor==="function")SEA.postGamesFor(team).forEach(x=>{ const g=x[0]||x; if(g&&out.indexOf(g)<0)out.push(g) });
  return out;
}
function h2hAdd(H,team,g){
  const opp=g.home===team?g.away:g.home, r=H[opp]=H[opp]||{w:0,l:0,d:0};
  const ms=g.home===team?g.hp:g.ap, os=g.home===team?g.ap:g.hp;
  if(g.winner===team)r.w++; else if(g.winner&&g.winner!=="draw"&&!g.draw)r.l++; else r.d++;
  r.y=SEA.year; r.s=`${ms}-${os}`; r.won=g.winner===team?1:g.winner&&!g.draw&&g.winner!=="draw"?0:0.5;
}
function h2hBank(team){
  if(S.h2hY===SEA.year)return; S.h2hY=SEA.year;
  const H=S.h2h=S.h2h||{}; h2hGames(team).forEach(g=>h2hAdd(H,team,g));
}
/* your record against opp, banked plus this season so far */
function h2hWith(opp){
  const B=(S.h2h||{})[opp], r=B?Object.assign({},B):{w:0,l:0,d:0};
  if(S.h2hY!==SEA.year){ const H={}; h2hGames(S.myTeam).forEach(g=>{ if(g.home===opp||g.away===opp)h2hAdd(H,S.myTeam,g) });
    const c=H[opp]; if(c){ r.w+=c.w; r.l+=c.l; r.d+=c.d; r.y=c.y; r.s=c.s; r.won=c.won } }
  return r.w+r.l+r.d?r:null;
}

/* seasonTeam: the team coached this season. If the coach has just changed
   jobs, S.myTeam is already the new one; the season belongs to the old. */
function endSeason(rng,choices,act,seasonTeam){
  if(SEA.phase!=="done"||!rng||!act)return;
  const my=seasonTeam||S.myTeam, rk=SEA.poll.rankMap();
  const result=SEA.seasonResult(my);
  const teamRows={};
  NAMES.forEach(t=>{teamRows[t]=[SEA.rec[t][0],SEA.rec[t][1],rk[t]]; if(LEAGUE.draws)teamRows[t].push((SEA.drw&&SEA.drw[t])||0);
    else if(SEA.otl)teamRows[t].push(null,SEA.otl[t]||0)});   // [w,l,rank,draws]
  const {confChamps,post,pnote,cfpOf}=SEA.postRecord();
  LEAGUE.rivals.record(U,SEA);
  SEA.bankCareers(U);
  if(S.calls){ const keep={}, pre=SEA.year+":";
    Object.keys(S.calls).forEach(k=>{if(k.indexOf(pre)===0)keep[k]=S.calls[k]});
    S.calls=keep;
    if(S.callAuto){ const ka={}; Object.keys(S.callAuto).forEach(k=>{if(k.indexOf(pre)===0)ka[k]=S.callAuto[k]}); S.callAuto=ka } }
  if(U.coach[S.myTeam])U.coach[S.myTeam].q=Math.round(Math.max(-40,Math.min(60,S.career.rep*0.62)));
  // the entry is written before the offseason runs: promotion, relegation
  // and realignment move teams, and the season belongs to the group it was played in
  const entry=seasonEntry(my);
  if(typeof bankStory==="function")bankStory(entry);   // its comeback and collapse; the head-to-head with each coach (round 41)
  const B=LEAGUE.offseason.run(U,rng,SEA.healthy(),SEA.elo,SEA.rec,choices);
  const off=Object.assign({},act,B);
  const exp=S.expNow||expectations();
  const miles=milestones(SEA.rec[my][0],SEA.rec[my][1],result,rk[my],my);
  S.history.push(Object.assign(entry,{
    miles:miles, exp:exp.t, program:Math.round(U.program[my]),
    teams:teamRows, top10:SEA.poll.order().slice(0,10),
    groupChamps:confChamps, seeds:cfpOf, post:post, pnote:pnote,
    awards:{mvp:(SEA.mvpRace(3)||[]).map(x=>({n:x.n,p:x.p,t:x.t,r:x.r,c:x.c,line:x.line})),
      team:SEA.awardTeam(my)},
    coaching:{fired:off.fired.indexOf(my)>=0, firedList:off.fired, nFired:off.fired.length,
      hires:(off.hires||[]).slice(0,60), poached:(off.poached||[]).slice(0,12),
      coordMoves:(off.coordMoves||[]).slice(0,6),
      coachNow:(U.coach&&U.coach[my])?{n:U.coach[my].n,q:U.coach[my].q,t:U.coach[my].t}:null},
    league:LEAGUE.historyExtras(SEA,off,my)}));
  // hot seat: the other coaches' entries for this season were written at the
  // hand-over, before the league had finished its year. Complete them now.
  (S.coaches||[]).forEach((c,i)=>{
    if(i===(S.turn||0)||!c.history)return;
    const e=c.history.find(x=>x.year===SEA.year&&!x.teams); if(!e)return;
    const t=e.team, before=c.history.filter(x=>x!==e);
    Object.assign(e,{program:Math.round(U.program[t]),
      exp:(c.expNow||LEAGUE.goals.expectations(U.program[t])).t,
      miles:milestones(SEA.rec[t][0],SEA.rec[t][1],e.result,rk[t],t,before),
      teams:teamRows, top10:SEA.poll.order().slice(0,10),
      groupChamps:confChamps, seeds:cfpOf, post:post, pnote:pnote,
      awards:{mvp:(SEA.mvpRace(3)||[]).map(x=>({n:x.n,p:x.p,t:x.t,r:x.r,c:x.c,line:x.line})),
        team:SEA.awardTeam(t)},
      coaching:{fired:off.fired.indexOf(t)>=0, firedList:off.fired, nFired:off.fired.length,
        hires:(off.hires||[]).slice(0,60), poached:(off.poached||[]).slice(0,12),
        coordMoves:(off.coordMoves||[]).slice(0,6),
        coachNow:(U.coach&&U.coach[t])?{n:U.coach[t].n,q:U.coach[t].q,t:U.coach[t].t}:null},
      league:LEAGUE.historyExtras(SEA,off,t)});
  });
  distinctLeague(U);
  U.schedV=3;                                            // (schedOrder; 3: round 71)
  U.engV=ENGINE_NOW;                                     // a new season on the current engine (round 71)
  delete S.schedLock;                                    // a new season draws its own, the same way every time
  // a promotion or a firing belongs to its season: kept by step, last season's were replayed into this one on every
  // reload (a coordinator fired in week 4 last year was fired again, and a whole season went to "Interim staff": Muse)
  S.uStart=snap(U); S.off=null; S.plans={}; S.played={}; S.carousel=null; S.promos={}; S.fires={}; S.choiceYear=U.year;
  S.seasonSeed=(S.seasonSeed*1103515245+12345)>>>0;
  S.steps=0; rebuild(); S.expNow=expectations();
  if(isHotSeat()){
    // a new season: every coach's expectations for the team they now coach,
    // no plans carried over from last year, and coach 1 goes first
    stashCoach();
    S.coaches.forEach(c=>{c.expNow=LEAGUE.goals.expectations(U.program[c.myTeam]); c.plans={}; c.promos={}; c.fires={}});
    loadCoach(0);
  }
  flash={type:"offseason"}; view="team"; save(); render();
}

/* ============ rendering ============ */
/* a rank beside a name: college's poll and soccer's table position mean something; the pro leagues' 1-25 ranking
   didn't (round 67, Ian: "relevant in college football, not in other sports"), so they show records instead */
function ranksMean(){ return !!LEAGUE.position||LEAGUE.id==="cfb"||LEAGUE.id==="ncaab" }
function rkTag(r){return ranksMean()&&r&&r<=RANK_TOP?`<span class="rk" title="${LEAGUE.position?"Table position":"Ranked No. "+r}">${LEAGUE.position?"":"#"}${r}</span>`:""}   // "#8", so it reads as a ranking, not part of a code

function gameLine(g,mine){
  const hw=g.winner===g.home;
  const best=Math.min(g.hrank||999,g.arank||999);
  const ups=g.hrank&&g.arank?(hw?g.hrank>g.arank:g.arank>g.hrank):false;
  const cls="game"+(best<=RANK_TOP?" marquee":"")+(ups&&best<=RANK_TOP?" upset":"")+(mine?" mine":"");
  const side=(t,s,r,w,seed,rec)=>`<div class="side ${w?'w':''}">${
    seed?`<span class="sdchip">${seed}</span>`:rkTag(r)}
    <span class="nm">${TL(t)}</span>${rec?`<span class="grec">${rec}</span>`:""}
    <span class="sc">${s}</span></div>`;
  const chips=[];
  if(g.title)chips.push(`<span class="chip ttl">${esc(g.title)}</span>`);
  if(g.site)chips.push(`<span class="chip ttl">${esc(g.site)}</span>`);
  if(ups&&best<=RANK_TOP)chips.push(`<span class="chip up">Upset</span>`);
  if(g.neutral&&!g.site&&!g.title)chips.push(`<span class="chip">Neutral</span>`);
  if(LEAGUE.draws){ if(g.draw)chips.push(`<span class="chip">Draw</span>`); else if(g.margin<=1)chips.push(`<span class="chip">One goal</span>`) }
  else if(g.margin<=((typeof SPORT!=="undefined"&&SPORT.closeMargin)||3))chips.push(`<span class="chip">${(typeof SPORT!=="undefined"&&SPORT.closeLabel)||"One score"}</span>`);   // baseball: one run (round 56: "ONE SCORE" on 4-1 and 7-4: Instinct)
  const rv=LEAGUE.rivals.name(g.home,g.away);
  if(rv)chips.push(`<span class="chip riv">${esc(rv)}</span>`);
  return `<article class="${cls}"><div class="edge" style="${mine?`background:${teamInk(g.winner)}`:""}"></div><div class="gbody">
    ${LEAGUE.homeFirst?side(g.home,g.hp,g.hrank,hw&&!g.draw,g.hseed,g.hrec)+side(g.away,g.ap,g.arank,!hw&&!g.draw,g.aseed,g.arec)
      :side(g.away,g.ap,g.arank,!hw,g.aseed,g.arec)+side(g.home,g.hp,g.hrank,hw,g.hseed,g.hrec)}
    ${chips.length?`<div class="meta">${chips.join("")}</div>`:""}</div></article>`;
}

/* ---- watching a game ---- */
let watch=null;   // {g, script, i, timer}

function watchSeed(g){
  return (g.hp*7919 + g.ap*104729 + (g.week||0)*131 + (g.home.length*17) + g.away.length)>>>0;
}

function speedMult(){
  const k=S.watchSpeed||"normal";
  const f=SPEEDS.find(s=>s[0]===k);
  return f?f[1]:1;
}
function watchGap(){
  const n=Math.max(1,watch.script.length);
  return Math.max(120,Math.min(2600,Math.round(7200/n/speedMult())));
}
/* playback speeds for watching a game (live or a replay) */
const SPEEDS=[["slow",0.34,"Slow"],["normal",0.52,"Normal"],["fast",1.0,"Fast"],["rapid",2.1,"Very fast"]];

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
const PRESS_AT={};
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

function prefersReduced(){
  try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}
}

function liveRec(team){
  const w=SEA.rec[team][0], l=SEA.rec[team][1];
  if(reveal!=="half")return [w,l];
  const g=heroGame();
  if(!g||(g.home!==team&&g.away!==team))return [w,l];
  if(g.draw)return [w,l];                                  // a draw: neither column
  return g.winner===team?[w-1,l]:[w,l-1];
}

function liveConf(team){
  const w=SEA.confrec[team][0], l=SEA.confrec[team][1], o=(SEA.confotl&&SEA.confotl[team])||0;   // [wins, losses (overtime ones included), overtime losses]
  if(reveal!=="half")return [w,l,o];
  const g=heroGame();
  if(!g||!g.conf||(g.home!==team&&g.away!==team))return [w,l,o];
  if(g.draw)return [w,l,o];
  return g.winner===team?[w-1,l,o]:[w,l-1,g.ot&&LEAGUE.tracksOT?o-1:o];
}

/* the game the result card shows: on a cup night the cup tie, otherwise
   the league game (Rewatch must replay the same one) */
function heroWeekGame(W,my){
  return (flash&&flash.cup?W.games.find(x=>x.cup&&(x.home===my||x.away===my)):null)
    ||W.games.find(x=>!x.cup&&(x.home===my||x.away===my))||W.games.find(x=>x.home===my||x.away===my)||null;
}
function heroGame(){
  const my=S.myTeam;
  if(flash&&flash.type==="week"){
    const W=SEA.weeks[flash.step];
    if(W)return heroWeekGame(W,my);
  }else if(flash&&flash.type==="post"){
    return lastPostGame(my);
  }
  return null;
}
/* your latest postseason game: pools run latest round first, and a series
   puts several of yours in one round (the first found was game 1, which made
   every result card in a series show game 1) */
function lastPostGame(my){
  for(const p of SEA.postPools()){ const m=p.filter(x=>x.home===my||x.away===my); if(m.length)return m[m.length-1] }
  return null;
}

function heroResult(){
  const my=S.myTeam;
  let g=null,label="",cupG=null;
  if(flash&&flash.type==="week"){
    const W=SEA.weeks[flash.step];
    if(W){g=heroWeekGame(W,my);label=W.label;
      cupG=W.games.find(x=>x.cup&&x!==g&&(x.home===my||x.away===my))||null;
      // leagues that number steps by calendar day name your game by your count
      if(g&&LEAGUE.myGameLabel)label=LEAGUE.myGameLabel(SEA.weeks.slice(0,flash.step+1)
        .filter(w=>w.games.some(x=>!x.cup&&(x.home===my||x.away===my))).length);
      if(g&&g.cup){label=g.title; cupG=null}}
  }else if(flash&&flash.type==="post"){
    g=lastPostGame(my);
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
    const T=RANK_TOP;
    if(cur[my]<=T&&pv[my]>T)move=`<div class="hmove up">${LEAGUE.text.entered}${cur[my]}</div>`;
    else if(cur[my]>T&&pv[my]<=T)move=`<div class="hmove dn">${LEAGUE.text.dropped||"Dropped out of the poll"}</div>`;
    else if(cur[my]<=T&&d>0)move=`<div class="hmove up">&#9650; Up ${d} to #${cur[my]} in ${esc(LEAGUE.text.ranking||"the rankings")}</div>`;
    else if(cur[my]<=T&&d<0)move=`<div class="hmove dn">&#9660; Down ${-d} to #${cur[my]} in ${esc(LEAGUE.text.ranking||"the rankings")}</div>`;   // what dropped (Grokbot: "Down 3 to 86")
    else if(cur[my]<=T)move=`<div class="hmove flat">Holding at #${cur[my]} in ${esc(LEAGUE.text.ranking||"the rankings")}</div>`;
  }
  if(LEAGUE.position&&LEAGUE.positionLine)move=`<div class="hmove flat">${LEAGUE.positionLine(my)}</div>`;
  // a playoff game says where the series stands, and a defeat that ends the season says so (Muse: Winnipeg's
  // Game 6 elimination looked exactly like a November game)
  if(flash&&flash.type==="post"&&!g.draw&&!half){
    const X=SEA.series&&g.series&&(SEA.series[g.series]||[]).find(x=>x.games&&x.games.indexOf(g)>=0);
    if(X){ const a=X.w[my]||0, b=X.w[opp]||0;
      move=X.winner===my?(SEA.champion===my?`<div class="hmove up">Champions: won the series ${a}&ndash;${b}</div>`:`<div class="hmove up">Series won ${a}&ndash;${b}: through to the next round</div>`)
        :X.winner?`<div class="hmove dn">Season over: ${g.series===finalRound()?(LEAGUE.text.lostFinal||"beaten in the final"):(LEAGUE.text.outOf||"out of the playoffs")}, ${a}&ndash;${b} in the series</div>`   // a Finals defeat isn't "out of the playoffs" (Grokbot)
        :`<div class="hmove flat">Series ${a}&ndash;${b}${a>b?": you lead":a<b?": they lead":": level"}</div>` }
    // a one-game knockout (football's playoffs and bowls) has no next game to look for: a defeat ends it there and then,
    // and says where (Grokbot, Instinct: the Wild Card loss read "Down 2 to #13" until the playoffs were simmed)
    // a conference tournament loss before Selection Sunday isn't the end of the season (Instinct, round 42)
    // ...nor after it, when the card is drawn again over a bracket you're in (Instinct, round 15: "Season over" above
    // "YOU'RE IN · 2 SEED"): a conference tournament game (g.ct) says what the field did
    else if(!won&&g.winner&&typeof NCAA_ROUNDS!=="undefined"&&(g.ct||!(SEA.field&&SEA.field.length))&&!(typeof SEA._nextFor==="function"&&SEA._nextFor(my)&&!g.ct)){
      const ctn=esc(String(g.title||"conference tournament").replace(/^(the )/i,"").replace(/ (First|Second|Quarter|Semi)[a-z]* ?(Round|final)s?$/i," Tournament").replace(/ Championship$/i,"").replace(/Tournament Tournament/,"Tournament"));
      const inF=SEA.field&&SEA.field.length&&SEA.seeds&&SEA.seeds[my];
      move=!(SEA.field&&SEA.field.length)?`<div class="hmove dn">Out of the ${ctn}. Selection Sunday decides the rest.</div>`
        :inF?`<div class="hmove flat">Out of the ${ctn}, and into the NCAA Tournament: a ${SEA.seeds[my]} seed${SEA.region&&SEA.region[my]?`, ${esc(SEA.region[my])}`:""}.</div>`
        :`<div class="hmove dn">Out of the ${ctn}, and left out of the NCAA field.</div>` }
    else if(!won&&g.winner&&(typeof SEA._nextFor==="function"?!SEA._nextFor(my):true))move=`<div class="hmove dn">Season over${g.title?`: beaten in the ${esc(String(g.title).replace(/^(the )/i,""))}`:""}</div>`;
    else if(won&&SEA.champion===my)move=`<div class="hmove up">Champions</div>` }
  const cupRes=LEAGUE.cup&&LEAGUE.cup.result?LEAGUE.cup.result(Object.assign({week:flash&&flash.step},g),my):null;   // a league's own line (the NBA Cup's group games, league games too)
  if(cupRes)move=g.cup?cupRes:(move||"")+cupRes;
  else if(g.cup&&LEAGUE.cup){ const nx=LEAGUE.cup.rounds[g.round+1];
    // a level tie says how it was settled: a 0-0 "into the second round" read as a mystery (Ian)
    const how=g.pens?(won?"Won on penalties: ":"Lost on penalties: "):g.ot?(won?"Won in extra time: ":"Lost in extra time: "):"";
    move=`<div class="hmove ${won?'up':'dn'}">${how}${won?(nx?(how?"into the ":"Into the ")+esc(nx.name):(how?LEAGUE.cup.name+" winners":LEAGUE.cup.name.toUpperCase()+" WINNERS")):(how?"out of the "+LEAGUE.cup.name:"Out of the "+LEAGUE.cup.name)}</div><button class="rewatch seedraw" data-cupview="1">${LEAGUE.cup.groups?"See the Cup":"See the draw"}</button>` }
  if(half)return `<div class="hero half">
    <div class="hlabel"><span class="live"></span>HALFTIME${label?" &middot; "+esc(label):""}</div>
    <div class="hscore">${ms}<span>&ndash;</span>${os}</div>
    <div class="hopp">${haWord(g,my)} ${esc(opp)}</div>
    <div class="hfoot">Second half under way&hellip;</div></div>`;
  // the big nights in order (Instinct, round 15): what happened, what it means, and then, a tap away, the audit
  const banner=(won&&SEA.champion===my&&/Champions/.test(move||"")&&typeof titleNightHTML==="function"?titleNightHTML(my):"")+(typeof clinchHTML==="function"&&!(won&&SEA.champion===my)?clinchHTML(my):"");
  const moment=!!banner||/Season over|Out of the|out of the|beaten in the|Champions|WINNERS|winners/.test(move||"");
  const audit=(()=>{ const st=flash&&flash.step; if(st===undefined||st===null||!S.played)return "";
      return impactHTML((S.played[callKey(st)]||[]).filter(p=>p.team===S.myTeam&&(!LEAGUE.splitCup||!!p.cup===!!(flash&&flash.cup)))) })()+readsHTML(flash&&flash.step);
  return `<div class="hero ${won?'win':g.draw?'draw':'loss'}${moment?" moment":""}" style="--tc:${teamInk(my)}">${moment?banner:""}
    <div class="hlabel">FINAL${g.pens?" (PENALTIES)":g.so?" (SHOOTOUT)":g.ot&&!LEAGUE.draws?" (OT)":g.ot?" (EXTRA TIME)":""} &middot; ${won?"WIN":g.draw?"DRAW":"LOSS"}${label?" &middot; "+esc(label):""}</div>
    <div class="hscore">${ms}<span>&ndash;</span>${os}</div>
    <div class="hopp">${haWord(g,my)} ${esc(opp)}</div>${move}${moment?"":banner}${cupG?cupLineHTML(cupG,my):""}${moment&&audit?`<details class="audit"${!won&&/Season over|Out of the|out of the|beaten in the|eliminated/i.test(move||"")?" open":""}><summary>Your calls tonight, graded</summary>${audit}</details>`:audit}${guideNote("result","Each call you made is graded here: a read against what they really did, a situation call against what your assistant would have done, replayed many times from that moment. Calls too close to separate aren't graded either way.")}
    ${SEA.roster?`<button class="rewatch" data-rewatch="1">Rewatch</button>`:""}</div>`;
}
/* the first few reads: how to read the panel */
function firstReadTip(){
  if(S.readTally&&S.readTally.n>=3)return "";
  if(S.guide===true&&!(S.seen&&S.seen.g_call_read)&&!GUIDE_SEEN.g_call_read)return "";   // the coach's note says it, once
  return `<div class="evtip">First reads: look for the number marked &#9650; or &#9660;, well away from the league average. That's how they're playing. Pick the answer that beats it, then see if you were right after the game.</div>`;
}
/* the season's tally of your reads and calls, kept on the team page all year */
function tallyHTML(){
  const T=S.readTally, led=typeof ledgerLine==="function"?ledgerLine():"";
  if(!T||!T.n)return led?`<div class="grouphead">Your calls</div><div class="tallycard"><div><div class="fnote tallynote">${esc(led)}</div></div></div>`:"";
  const Y=T.yr&&T.yr[SEA.year], lab=typeof TALLY_LABEL!=="undefined"?TALLY_LABEL:"Reading the game this season";
  const pct=(a,b)=>b?Math.round(100*a/b):0;
  return `<div class="grouphead">Your calls</div><div class="tallycard">
    <div class="tallybig">${Y&&Y.n?`${Y.right}<span>/${Y.n}</span>`:"&mdash;"}</div>
    <div><div class="fname">${esc(lab)}</div>
    <div class="fnote">${Y&&Y.n?pct(Y.right,Y.n)+"% this season &middot; ":"None yet this season &middot; "}${T.right} of ${T.n} in your career (${pct(T.right,T.n)}%) &middot; graded reads only</div>
    ${led?`<div class="fnote tallynote"><b>${esc(led)}</b></div>`:""}${readsByMonthHTML()}
    ${typeof TALLY_NOTE!=="undefined"?`<div class="fnote tallynote">${esc(TALLY_NOTE)}</div>`:""}
    ${(()=>{ const sm=simmedThisSeason(); return sm.sim?`<div class="fnote tallynote">Only games you watch count: you watched ${sm.watched} of your ${sm.all} games this season, and simmed ${sm.sim}.</div>`:"" })()}</div></div>`;
}
/* your reads month by month this season (round 61, Instinct: a long season needs a way to see whether you're getting
   better). Daily leagues only, from the games you watched; shown once two months have graded reads. */
function readsByMonthHTML(){
  if(!LEAGUE.daily||!LEAGUE.dates||!S.played)return "";
  const pre=SEA.year+":", M={}, order=[];
  Object.keys(S.played).forEach(k=>{ if(k.indexOf(pre)!==0)return; const st=+k.slice(pre.length), d=LEAGUE.dates[st]; if(!d)return;
    const m=String(d).split(" ")[0];
    S.played[k].forEach(p=>{ if(p.team!==S.myTeam||!p.reads)return; p.reads.forEach(x=>{ if(x.unclear||x.k==="call")return;
      if(!M[m]){ M[m]={n:0,r:0,st:st}; order.push(m) } M[m].n++; if(x.right)M[m].r++ }) }) });
  const ms=order.sort((a,b)=>M[a].st-M[b].st); if(ms.length<2)return "";
  return `<div class="fnote tallynote">By month: ${ms.map(m=>`${esc(m)} ${M[m].r}/${M[m].n}`).join(" &middot; ")}</div>
    <div style="display:flex;gap:4px;align-items:flex-end;height:28px;margin-top:4px" aria-hidden="true">${ms.map(m=>{ const f=M[m].r/M[m].n;
      return `<div title="${esc(m)}" style="flex:1;max-width:36px;height:${Math.max(3,Math.round(28*f))}px;background:var(--sodium);opacity:${M[m].n>=5?1:0.5};border-radius:2px"></div>` }).join("")}</div>`;
}
/* this season's games of yours: watched live (they can hold calls) or simmed (they can't) */
function simmedThisSeason(){
  const my=S.myTeam, pre=SEA.year+":";
  // postseason games too: a bowl was watched but not counted ("watched 5 of your 12" after 13: Grokbot)
  // each game once: college basketball's conference tournament sits in both lists ("watched 4 of your 39" after a
  // 31-5 season: Instinct, round 16)
  const G=new Set();   // the post list is [game, label] pairs, and holds games the weeks have too (a title game)
  SEA.weeks.forEach(W=>W.games.forEach(g=>{ if(g.home===my||g.away===my)G.add(g) }));
  if(typeof SEA.postGamesFor==="function")SEA.postGamesFor(my).forEach(x=>{ const g=Array.isArray(x)?x[0]:x; if(g)G.add(g) });
  const all=G.size;
  const watched=Object.keys(S.played||{}).filter(k=>k.indexOf(pre)===0).reduce((c,k)=>c+S.played[k].filter(p=>p.team===my).length,0);
  return {all:all, watched:Math.min(watched,all), sim:Math.max(0,all-watched)};
}
/* your reads in this week's live games, right or wrong, and the season's tally */
function readsHTML(step){
  if(step===undefined||step===null||typeof readText!=="function"||!S.played)return "";
  const P0=(S.played[callKey(step)]||[]).filter(p=>p.team===S.myTeam&&(!LEAGUE.splitCup||!!p.cup===!!(flash&&flash.cup)));
  const P=P0.filter(p=>p.reads||p.judged);
  // a game you watched with no call in it gets a line, not silence (Instinct: a 34-23 win moved on without a word)
  const au=((S.callAuto||{})[callKey(step)]||[]).length, asked=Math.max(0,((S.calls||{})[callKey(step)]||[]).length-au);
  // the calls your assistant took while the game wasn't in the balance: said, not graded (Grokbot: "graded separately")
  const auLine=au?`<div class="readnone">Your assistant took ${au===1?"one call":au+" calls"} that couldn't change much tonight (the game out of reach, or the options too close to matter); ${au===1?"it isn't":"they aren't"} graded.</div>`:"";
  if(P0.length&&!P.length){
    // every call shown and left to the assistant: "none of the moments came up" was false (round 39)
    if(asked&&P0.some(p=>(p.impact||[]).length))return auLine?`<div class="reads">${auLine}</div>`:"";   // yours are judged above, against the assistant
    if(asked)return `<div class="reads"><div class="readnone">You left ${asked===1?"tonight's call":"all "+asked+" of tonight's calls"} to your assistant, so there's nothing of yours to grade.</div>${auLine}</div>`;
    return `<div class="reads"><div class="readnone">No calls for you tonight: ${au?`the game was never in the balance at the moments that would have asked one, so your assistant took ${au===1?"it":"all "+au}`:"none of the moments that ask one came up"}. Nothing to grade.</div></div>` }
  const R=[].concat(...P.map(p=>p.reads||[])), CL=[].concat(...P.map(p=>p.closes||[]));
  const closeLines=CL.map(c=>`<div class="read na"><span>&ndash;</span><div><b class="readlab">Close either way:</b> ${esc(c.h)}: you chose "${esc(c.pick)}". ${c.opts.map(o=>`"${esc(o[0])}" won ${o[1]}%`).join(", ")} of replays, too close to call right or wrong.</div></div>`).join("");
  // calls made, none close enough to grade: say so, or the card looks broken
  if(!R.length){ const n=P.reduce((a,p)=>a+(p.judged||0),0);
    const c=P.map(p=>p.close).filter(Boolean)[0];
    const deb=c?`<div class="readnone"><b>${esc(c.h)}</b>: you chose "${esc(c.pick)}". ${c.opts.map(o=>`"${esc(o[0])}" won ${o[1]}%`).join(", ")} of replays: the options were that close, so the game turned on the plays, not the call.</div>`:"";
    return n?`<div class="reads"><div class="readnone">${n===1?"Your call this game":"None of your "+n+" calls this game"} ${n===1?"didn't make":"made"} a real difference to your chances, so ${n===1?"it isn't":"none is"} graded.</div>${CL.length?closeLines:deb}${auLine}</div>`:auLine?`<div class="reads">${auLine}</div>`:"" }
  const Y=S.readTally&&S.readTally.yr&&S.readTally.yr[SEA.year];
  // the same verdict twice (a read confirmed at half-time, a goalie kept twice) reads once, counted (Instinct)
  // each line says which call it was (a right game plan beside a wrong read looked like a contradiction,
  // and two identical lines couldn't be told apart: Grokbot)
  // a read goes by its own headline, the name it had on screen and in the line above ("First intermission" up top
  // and "First read" below read as two calls: round 39); the scouting report by that name
  const seen={}, label=x=>{ const k=x.k, n=seen[k]=(seen[k]||0)+1;
    if(k!=="prep"&&k!=="rest"&&k!=="call"&&x.h)return String(x.h).replace(/<[^>]+>/g,"");
    return k==="prep"?"Scouting report":k==="read"?(n===1?"First read":n===2?"Second read":"Read "+n):k==="flank"?"The flank":k==="goalie"?"Your goalie":k==="close"?"Crunch time":k==="third"?"Third-period read":k==="rest"?"Your starters":"" };
  // one line per read, starting with what you chose: merged lines ("First read and second read: ...") hid which choice
  // was graded and made the tally jump by more than the lines shown (Grokbot)
  // round 71: a report left to the assistant ("Wait and see: leave it to your assistant") is his, said as his and not
  // graded as yours (Instinct: "You chose 'Wait and see' ... it cost you" on a call left to him; Ian: never blame me for
  // an assistant's decision)
  const lines=[]; R.forEach(x=>{ const pk=typeof readPickLabel==="function"?readPickLabel(x):"", lb=label(x);
    if(x.waited){ lines.push({t:"Left to your assistant. "+String(readText(x)).replace(/^\s*You waited/,"He waited"),right:x.right,un:true,n:1,lb:lb?[lb]:[]}); return }
    // round 71 (Muse: "No verdict blames the player for following the shown report"): set up for what the report said most,
    // it's the better bet over a season (measured: +2.6 to +4.5 points a game), right or wrong on the night. Said so, and
    // not counted either way.
    if(x.k==="prep"&&x.followed){ lines.push({t:(pk?`You chose "${pk}", as the report said. `:"")+(x.right?"It was right.":"It was wrong this time: a few games can mislead, and following the report is still the better bet.")+" "+String(readText(x)).replace(/^(Your [^:]*right|You [^:]*wrong[^:]*):\s*they/,"They"),right:x.right,un:true,n:1,lb:lb?[lb]:[]}); return }
    lines.push({t:(pk?`You chose "${pk}". `:"")+readText(x),right:x.right,un:!!x.unclear,n:1,lb:lb?[lb]:[]}) });
  return `<div class="reads">${closeLines}${lines.map(x=>`<div class="read ${x.un?'na':x.right?'ok':'no'}"><span>${x.un?"&ndash;":x.right?"&#10003;":"&#10007;"}</span><div>${x.lb.length?`<b class="readlab">${esc(x.lb.join(" and "))}:</b> `:""}${esc(x.t)}</div></div>`).join("")}
    ${auLine}${Y&&Y.n>=3?`<div class="readtally">${typeof TALLY_LABEL!=="undefined"?TALLY_LABEL:"Reading the game this season"}: ${Y.right} of ${Y.n} right, all games so far (graded reads only)</div>`:""}</div>`;
}
/* a cup tie in the same week as the headline game: one line under it */
function cupLineHTML(g,my){
  const won=g.winner===my, opp=g.home===my?g.away:g.home, ms=g.home===my?g.hp:g.ap, os=g.home===my?g.ap:g.hp;
  const pens=g.pens?" on penalties":"";
  if(LEAGUE.cup&&LEAGUE.cup.result&&g.round===-1)return LEAGUE.cup.result(g,my).replace(/<button[\s\S]*$/,"");
  const nextR=LEAGUE.cup&&LEAGUE.cup.rounds[g.round+1];
  return `<div class="hmove ${won?'up':'dn'}">${esc(g.title)}: ${won?"beat":"lost to"} ${esc(opp)} ${ms}-${os}${pens}${
    won?(nextR?" &middot; into the "+esc(nextR.name):" &middot; CUP WINNERS"):" &middot; out"}</div>`;
}


/* ============ what's at stake ============ */
/* the odds line: one number, or (a league with draws) win, draw and loss */
/* what the "conference" count is: in the pro games and soccer it's division titles (Grokbot: "CONF 1" with no
   conference title, after a division win) */
function confWord(){ return LEAGUE.text.champsWord||(LEAGUE.id==="cfb"||LEAGUE.id==="ncaab"?"Conf":"Division") }
/* a win chance as shown: never 100% or 0% (Ian: "a 100% win chance vs Phoenix"; nothing in sport is certain, and
   the engine's own tails reach 99.6%) */
function pctShown(p){ return Math.max(1,Math.min(99,Math.round(p*100))) }
function withPlan(pl,fn){ const was=plan; plan=pl; try{ return fn() }finally{ plan=was } }
function oddsHTML(me,opp,atHome,neutral,wp){
  if(LEAGUE.wdl){ const [w,d,l]=withPlan("balanced",()=>LEAGUE.wdl(me,opp,atHome,neutral)), P=x=>Math.max(x>0?1:0,Math.min(99,Math.round(x*100)));
    return `<div class="odds"><span class="obar wdl"><i style="width:${P(w)}%"></i><b style="width:${P(d)}%"></b></span>
      <span class="opct">W ${P(w)}% &middot; D ${P(d)}% &middot; L ${P(l)}%</span><span class="olab">before the game</span>${ownMark(me)}</div>` }
  return `<div class="odds"><span class="obar"><i style="width:${(wp*100).toFixed(0)}%"></i></span>
        <span class="opct">${pctShown(wp)}%</span>
        <span class="olab">to win, before the game</span>${ownMark(me)}</div>${me===S.myTeam?injuredLine(opp,atHome,neutral):""}`;   // which number this is: the replays after a call are another (Instinct: "label every number's method")
}
/* the odds include your own choices: say so, since a point or two can hide
   in the rounding (Muse saw soccer's odds not move) */
function ownMark(me){
  if(me!==S.myTeam||!SEA)return "";
  const R=SEA.roster&&SEA.roster[S.myTeam], f=S.featured!==null&&S.featured!==undefined&&R&&R[S.featured]?R[S.featured]:null;
  const dep=S.deploy&&Object.keys(S.deploy).some(k=>S.deploy[k]&&S.deploy[k]!=="bal");
  if(!f&&!dep)return "";
  return `<span class="olab omark">with ${[f?"featuring "+esc(f.n.split(" ").slice(-1)[0]):"",dep?"your ice time":""].filter(Boolean).join(" and ")}</span>`;
}
/* The chance shown is the engine's own: each league's curve, measured by
   playing thousands of games at each gap, and your gameplan's (the safe plan
   steepens it, the bold one flattens it). It was the textbook /400 in every
   sport: pro football's favourites showed 70% and won 84%, hockey's showed
   70% and won 63%, and the plan buttons never moved the number (Grokbot,
   Instinct). */
function wpScale(pl){ const K=LEAGUE.tuning.wpK; return K?(K[pl]||K.balanced):400 }
/* The chance before a game is the engine's own, from the strengths the game will be played with: your lineup
   (a backup started), injuries, featuring, ice time, staff. It was worked out from the league's running ratings, so
   starting a backup 24 points worse moved nothing on screen while the game charged it in full (pro basketball 57%
   to 35%), and those ratings were badly calibrated (pro basketball's 96% won 87%, its 5% won 24%). Measured over
   four seasons a league, the engine's number holds: 95% wins 92-96%, 5% wins 2-6%. One number, every screen, and
   the same whichever plan is picked (Ian, round 33; the hub and roster screen disagreed by plan: Muse). */
function gameEdge(me,opp,atHome,neutral){
  const hm=atHome||neutral, g={home:hm?me:opp, away:hm?opp:me, neutral:!!neutral};
  const ku=SEA.userTeam, kf=SEA.featured, kd=SEA.deploy;
  if(S.myTeam){ SEA.userTeam=S.myTeam; SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null }
  try{ const e=SEA.matchupElo(g,"balanced"), d=e.h-e.a; return hm?d:-d }
  finally{ SEA.userTeam=ku; SEA.featured=kf; SEA.deploy=kd }
}
/* when an injury drags the chance down, say whose and by how much (Instinct: 13% in a playoff game with the starting
   quarterback out, and nothing on screen said why). With his injury taken away, the same engine. */
function injuredLine(opp,atHome,neutral){
  const my=S.myTeam; if(!opp||!SEA||!SEA.talent||!SEA.talent.inj)return "";
  const hurt=(SEA.talent.inj[my]||[]).filter(e=>e.w>0&&e.who); if(!hurt.length)return "";
  const g=SEA.nextGame?SEA.nextGame(my):null; if(atHome===null){ atHome=g?g.home===my:true; neutral=g?!!g.neutral:false }
  // on the headline's own basis (the balanced plan): computed under the plan you'd picked, the note read 73% beside a
  // headline of 62% on all six screens of a conference final (Muse, round 21; Instinct, round 16: 24% over 34%)
  const now=withPlan("balanced",()=>winProb(my,opp,atHome,neutral)), keep=SEA.talent.inj[my];
  SEA.talent.inj[my]=keep.filter(e=>!(e.w>0&&e.who)); let fit; try{ fit=withPlan("balanced",()=>winProb(my,opp,atHome,neutral)) }finally{ SEA.talent.inj[my]=keep }
  if(fit-now<0.03)return "";
  const names=hurt.slice().sort((a,b)=>a.m-b.m).slice(0,2).map(e=>esc(e.who)).join(" and ");
  return `<div class="oinj">${pctShown(now)}% without ${names} (injured); about ${pctShown(fit)}% with ${hurt.length>1?"them":"him"}.</div>`;
}
/* a league whose engine softens big mismatches (pro basketball: past 200 a gap counts half) shows the same softening,
   or its top chances overstate: shown 98%+ won 94.7% (round 39) */
function wpSoft(g){ const s=LEAGUE.tuning.softWp; if(!s)return g; const a=Math.abs(g); return a<=s[0]?g:Math.sign(g)*(s[0]+(a-s[0])*s[1]) }
function winProb(me,opp,atHome,neutral){
  return 1/(1+Math.pow(10,-wpSoft(gameEdge(me,opp,atHome,neutral))/wpScale("balanced")));
}
/* what your own choices add in your games, the same edge the games use: a
   featured starter who's healthy, and hockey's ice time (Muse: featuring
   never moved the displayed win probability) */
function ownEdge(){
  let e=0; const R=SEA.roster&&SEA.roster[S.myTeam];
  if(S.featured!==null&&S.featured!==undefined&&R&&R[S.featured]&&typeof FEATURE_EDGE!=="undefined"
     &&!SEA.talent.active(S.myTeam).some(x=>x.idx===S.featured))e+=featureEdge(SEA,S.myTeam,S.featured);
  if(typeof deployEdge==="function"&&SEA.userTeam===S.myTeam)e+=deployEdge(SEA,S.myTeam);
  return e;
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
    const g=SEA.weeks[i].games.find(x=>!x.cup&&(x.home===t||x.away===t));
    if(!g)continue;
    if(g.draw)break;                      // a draw ends a run either way (it was counted as a loss)
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
  // games left, not steps left: in the daily leagues a step is a day ("154 to play" at game 18 of 84: Grokbot)
  const wk=SEA.step, left=LEAGUE.daily?SEA.sched.filter(g=>!g.cup&&g.week>=wk&&g.week<LEAGUE.weeks&&(g.home===my||g.away===my)).length:LEAGUE.weeks-wk;
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

  const dr=(SEA.drw&&SEA.drw[my])||0;
  if(l===0&&w>=4&&!dr)out.push({p:90,tag:"UNBEATEN",
    l:`${w}-0 and counting. A perfect season is still live.`});
  else if(l===0&&w+dr>=6&&dr)out.push({p:88,tag:"UNBEATEN",
    l:`Unbeaten: ${recStr(my)}. Nobody has found a way past you yet.`});

  out.push(...LEAGUE.ui.stakes({my:my,opp:opp,rk:rk,wk:wk,left:left,w:w,l:l,cp:cp}));
  if(typeof meansStakes==="function")out.push(...meansStakes(ng,my));   // round 45: what this game means (an objective, the table)
  const st=streakOf(my);
  if(!st.won&&st.n>=RUN(3))out.push({p:74,tag:"SLIDE",
    l:`${st.n} straight losses. The seat under your coach is getting warm.`});
  else if(st.won&&st.n>=RUN(5))out.push({p:58,tag:"STREAK",
    l:`${st.n} in a row. Nobody wants to be the one who ends it.`});

  // out of it: a winning season no longer possible (it was six losses, a college football season,
  // and fired at game 18 of 84 in hockey: Grokbot)
  const nAll=SEA.sched.filter(g=>!g.cup&&g.week<LEAGUE.weeks&&(g.home===my||g.away===my)).length||12;
  if(l>=Math.ceil(nAll/2))out.push({p:40,tag:"SPOILER",
    l:`Nothing left but pride and a chance to wreck somebody's season.`});

  // the quiet line: your game number where steps are days (hockey, basketball) or matchdays
  const gNo=SEA.weeks.filter(W=>W.games.some(x=>!x.cup&&(x.home===my||x.away===my))).length+1;
  if(!out.length)out.push({p:0,tag:LEAGUE.myGameLabel?LEAGUE.myGameLabel(gNo).toUpperCase():(LEAGUE.skipIdle||LEAGUE.stepLabel)?"GAME "+gNo:"WEEK "+(wk+1),
    // round 72: a neutral site says so ("AT ATLANTA · vs BAYLOR" beside "Home against Baylor"; "On the road" under
    // "NEUTRAL SITE": Instinct)
    l:(wp=>{ const at=ng.neutral?`At a neutral site${ng.site?" in "+ng.site:""}, against ${opp}.`:`${ng.home===my?"Home":"On the road"} against ${opp}.`;
      return wp>=0.65?`${at} You should win this one. Take care of business.`
        :wp>=0.45?`${at} A game you can win.`
        :wp>=0.3?`${at} An uphill one: a win here would count.`
        :`${at} A big ask. Nobody expects it, which is what would make it.` })(winProb(my,opp,ng.home===my,ng.neutral))});

  out.sort((x,y)=>y.p-x.p);
  // what this game means (round 45) always gets its line: a third, when two others outrank it
  const top=out.slice(0,2), mean=out.find(x=>x.tag==="THE BOARD"||x.tag==="THE TABLE");
  if(mean&&top.indexOf(mean)<0)top.push(mean);
  return top;
}

/* A season misses expectations when its grade says so: "Short of the mark"
   or worse. Two in a row at the same job and you're fired. */
function seasonMissed(h){return h.miss!==undefined?!!h.miss:/Short of the mark|A bad year/.test(h.gradeLine||"")}
function missedTwiceFor(team,history,exp){
  const now=seasonGrade(SEA.rec[team][0],SEA.rec[team][1],SEA.seasonResult(team),exp);
  const prev=(history||[]).find(h=>h.year===SEA.year-1&&h.team===team);
  return !!(now.miss&&prev&&seasonMissed(prev));
}
function missedTwice(my,exp){return missedTwiceFor(my,S.history,exp)}
/* why the seat is hot, in a sentence: last year's target and what this year means */
function seatWhy(prev){
  if(!prev||!seasonMissed(prev))return "";
  const t=prev.exp?String(prev.exp).replace(/^Target:\s*/i,"").toLowerCase():"";
  return `You missed last year's target${t?` (${t})`:""}. Miss this year's too and the job goes.`;
}
function seatWhyNow(){ return seatWhy((S.history||[]).find(h=>h.year===SEA.year-1&&h.team===S.myTeam)) }
/* where you stand against that rule: missed last year here, you're on the
   hot seat all season; on pace to miss this year, you're under pressure */
function seatBadge(){
  const my=S.myTeam;
  if(!U||!U.coach)return "";
  const w=SEA.rec[my][0], l=SEA.rec[my][1];
  const prev=(S.history||[]).find(h=>h.year===SEA.year-1&&h.team===my);
  // after a missed year the seat is hot until this one is on course: it stayed "HOT SEAT" at 24-4 (Ian)
  const why=` title="You missed last season's target. Miss this one too and the job goes."`;   // says why (Instinct)
  // the reason is on the badge itself, not only on hover: a touch screen never showed it (Grokbot:
  // "hot seat at 0-0 with no reason")
  // and names the target missed, so a second-round exit isn't read as failure out of nowhere (Grokbot, hockey)
  // just "HOT SEAT": the reason ran the badge onto three lines and over the coach's name at 390px (Ian,
  // Instinct); it's on hover and at the top of the board's objectives (seatWhy)
  const hot=`<span class="seat hot" title="${esc(seatWhy(prev)||"You missed last season's target. Miss this one too and the job goes.")}">HOT SEAT</span>`;
  if(w+l<4)return prev&&seasonMissed(prev)?hot:`<span class="seat cool">Secure</span>`;   // one calm word, not two (Instinct: "Settled" and "Secure" read as different)
  const exp=S.expNow||expectations(), games=LEAGUE.schedule.games;
  const paceW=Math.round(w/(w+l)*games);
  // a league table grades by position, and a season without a result graded "on course" every week:
  // "Secure" all season, then fired (Grokbot, QPR). Grade where the table has you now.
  let g;
  if(LEAGUE.draws&&typeof SEA.table==="function"&&typeof CONF!=="undefined"&&typeof DIVS!=="undefined"){
    const d=CONF[my], tb=SEA.table(d), pos=tb.indexOf(my)+1, R=DIVS[d]||{};
    const res=R.down&&pos>tb.length-R.down?`Relegated (${pos}th)`:`Finished ${pos}th`;
    g=seasonGrade(w,l,res,exp) }
  else{
    // a postseason target counts too: outside the projected field you're on course to miss it (Grokbot: HOT SEAT in
    // college basketball's second year, with no warning all season that missing the tournament would cost the job)
    let res="";
    if(LEAGUE.ui.projectedField&&SEA.phase==="week"&&w+l>=6){ try{ const f=LEAGUE.ui.projectedField(); if(f&&f.length&&f.indexOf(my)<0)res="Projected outside the field" }catch(e){} }
    // in the postseason: the wins you have and the run so far, not a pace scaled to the regular season (a Final Four
    // team read "Under pressure: behind target" beside "24 wins reached ... Sweet 16: done": Instinct, round 42)
    if(SEA.phase!=="week"&&typeof SEA.seasonResult==="function"){ let r2=""; try{ r2=SEA.seasonResult(my)||"" }catch(e){}
      g=seasonGrade(w,l,r2,exp) }
    else g=seasonGrade(paceW,games-paceW,res,exp) }
  if(g.miss)return prev&&seasonMissed(prev)?hot:`<span class="seat warm" title="On this pace you'd miss the board's target.">Under pressure &middot; behind target</span>`;
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
  // starters are the first unit; the rest is depth (it averaged and listed all of them as "Starters": Muse)
  const st=R.slice(0,POS.length).filter(Boolean), avg=Math.round(st.reduce((s,p)=>s+p.r,0)/Math.max(1,st.length));
  const row=(p,i)=>{ if(!p)return ""; const inj=hurt[i];
      return `<div class="prow2 ${inj?'out':''}">
        <span class="ppos">${esc(p.p)}</span>
        <div class="pmain"><div class="pname">${plLink(t,p.n)}</div>
          <div class="psub">${classTag(p.c)}${p.pot>p.r?" &middot; ceiling "+p.pot:" &middot; at ceiling"}${
            inj?` &middot; <span class="outtag">out ${inj.w} ${stepWord(inj.w)}</span>`:""}</div></div>
        ${starBar(p.r)}<span class="prate">${p.r}</span></div>
        ${p.st2&&p.st2.g?`<div class="sline2">${esc(statLine(p.p,p.st2))}</div>`:""}`};
  return `<div class="grouphead">Starters &middot; average rating ${avg}</div>`+R.slice(0,POS.length).map((p,i)=>row(p,i)).join("")
    +(R.length>POS.length?`<div class="grouphead">Depth</div>`+R.slice(POS.length).map((p,i)=>row(p,i+POS.length)).join(""):"");
}

function teamPanel(){
  const my=S.myTeam, rk=SEA.poll.rankMap();
  const inj=SEA.talent.active(my);
  const co=U&&U.coach?U.coach[my]:null;
  let h=heroResult();
  h+=teamCardHTML(my,rk,co);
  if(reveal==="half")return h;
  h+=attentionHTML(my);      // the wide layout had no "Needs a decision" card: Make a change was unreachable on desktop (Instinct)
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
  const college=!!(LEAGUE.classes&&LEAGUE.classes.length), more=SPORT.featureMore||"gives a player the ball more";
  // what featuring does, in words: the sizes stay under the hood (Ian, Nov 2026)
  let h=coachMark("roster",`Each position shows your starter and the man behind him. Featuring ${more}: the team plays a little better while he's healthy (more so the better he is), and he develops faster over the offseason. You can also hand the job to a backup \u2014 costly now if he isn't ready, but he develops far faster once he's playing.`);
  const F=(S.featured!==null&&S.featured!==undefined)?R[S.featured]:null;
  // college players are seniors and declare early; pros are just older or younger
  h+=`<div class="note">${F?`Featuring <b>${esc(F.n)}</b>${college&&F.c>=3
      ? " \u2014 a senior, so you get the boost but he graduates before the development lands."
      : !college&&F.age>=30 ? ` \u2014 at ${F.age} you get the boost now, but there's little development left in him.`
      : F.pot-F.r<4 ? " \u2014 he's near his ceiling, so there's little development left."
      : college ? " \u2014 room to grow, and far likelier to stay than declare early."
      : " \u2014 room to grow, and the development will show next season."}`
      :S.featuredLast&&S.featuredLast.year===SEA.year-1&&(!S.featuredLast.team||S.featuredLast.team===my)&&!S.off?`Featuring lasts a season, so it reset when this one began (last season: ${esc(S.featuredLast.n)}). Tap a starter to feature him.`
      :"Nobody featured. Tap a starter to feature him."}${F&&S.off?` <span class="planwhy">Featuring resets when the new season starts: pick again then.</span>`:""}</div>`;
  if(typeof linesHTML==="function")h+=linesHTML();   // hockey: lines and ice time
  h+=`<div class="grouphead">Two deep &middot; starters average ${avg}</div>`;
  h+=POS.map((P,i)=>{
    const s=R[i], b=R[BK(i)], inj=hurt[i];
    const feat=S.featured===i;
    const tag=p=>`${classTag(p.c)}${p.pot>p.r?" &middot; ceiling "+p.pot:" &middot; at ceiling"}`;
    return `<div class="depth ${inj?'out':''}">
      <div class="dpos">${esc(P.p)}</div>
      <div class="dbody">
        <div class="prow2 ${feat?'feat':''}" data-feat="${i}">
          <div class="pmain"><div class="pname"><span style="font-family:var(--mono);color:var(--muted);margin-right:5px">#${shirtNo(my,i)}</span>${plLink(my,s.n)}
            ${inj?`<span class="outtag">OUT ${outFor(inj.w)}</span>`:`<span class="startag">STARTER</span>`}
            ${feat?`<span class="feattag">FEATURED</span>`:""}</div>
            <div class="psub">${tag(s)}${college&&s.c>=3?" &middot; <span class='gradtag'>graduates</span>":
              (college&&s.c>=2&&s.r>=76?" &middot; <span class='draftag'>draft risk</span>":"")}</div></div>
          ${starBar(s.r)}<span class="prate">${s.r}</span></div>
        ${s.st2&&s.st2.g?`<div class="sline2">${esc(statLine(P.p,s.st2))}</div>`:""}
        <div class="prow2 bk">
          <div class="pmain"><div class="pname sm"><span style="font-family:var(--mono);color:var(--muted);margin-right:5px">#${shirtNo(my,BK(i))}</span>${plLink(my,b.n)}${hurt[BK(i)]?` <span class="outtag">OUT ${outFor(hurt[BK(i)].w)}</span>`:""}</div>
            <div class="psub">${tag(b)} &middot; ${s.r-b.r>0?(s.r-b.r)+" behind":"even"}</div></div>
          <button class="promo" data-promo="${i}">Start him</button>
          <span class="prate sm">${b.r}</span></div>
        ${b.st2&&b.st2.g?`<div class="sline2 bk">${esc(statLine(P.p,b.st2))}</div>`:""}
      </div></div>`;   // the backup's season too, where you decide whether to start him (Muse: 3 goals the roster wouldn't show)
  }).join("");
  const hz=SEA.mvpRace(30).filter(x=>x.t===my);
  if(hz.length){
    h+=`<div class="grouphead">In the ${LEAGUE.awards.mvp} conversation</div>`;
    h+=hz.map(x=>`<div class="frow"><div class="fmain"><div class="fname">${esc(x.n)}</div>
      <div class="fnote">${esc(x.p)} &middot; ${esc(x.line||"")}</div></div></div>`).join("");
  }
  return h;
}

/* before the first game: what the summer changed, so a collapse or a leap has its reasons in view
   (Grokbot: Minnesota spent more, went 10-7 to 2-15, and nothing said why). From the offseason's
   own record: who left, who arrived, the best of each by rating. Pro leagues keep these lists. */
function changedHTML(my){
  if(!SEA||SEA.step>0||!S.history.length)return "";
  const h=S.history[S.history.length-1], X=h&&h.league; if(!X||(h.team&&h.team!==my))return "";
  const top=(L,n)=>(L||[]).filter(p=>p&&p.r).sort((a,b)=>b.r-a.r).slice(0,n);
  // a player who arrived and left in one summer (drafted, then cut) is in neither list as such: Instinct read a rookie as
  // both gone and in (round 50). He's named once, among those gone, for what happened.
  const arr=[].concat(X.signed||[],(X.draft||[]).filter(d=>d.team===my)), arrN=new Set(arr.map(p=>p&&p.n));
  const gone=[].concat(X.released||[],X.retired||[]), goneN=new Set(gone.map(p=>p&&p.n));
  const drN=new Set((X.draft||[]).filter(d=>d.team===my).map(d=>d.n));
  const out=top(gone.map(p=>arrN.has(p.n)?Object.assign({},p,{brief:drN.has(p.n)?"drafted":"signed"}):p),3), inn=top(arr.filter(p=>!goneN.has(p.n)),3);
  if(!out.length&&!inn.length)return "";
  const nm=p=>`${esc(p.n)} (${esc(p.p)}, ${p.r}${p.brief?`, ${p.brief} and let go this ${OFFW()}`:""})`;
  return `<div class="note"><b>Since last season:</b> ${out.length?`gone, ${out.map(nm).join(", ")}`:"nobody important left"}${inn.length?`; in, ${inn.map(nm).join(", ")}`:""}. Players also age and develop over the ${OFFW()}: the roster tab shows where you stand now.</div>`;
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
    (reveal==="half"?"":changedHTML(my)+nextUpHTML(my,rk)+objectivesHTML(my)+tallyHTML()+(typeof whatIfHTML==="function"?whatIfHTML():"")+starsHTML(my))}
  else if(reveal!=="half")h+=objectivesHTML(my)+tallyHTML()+(typeof whatIfHTML==="function"?whatIfHTML():"")+starsHTML(my);
  h+=(reveal==="half"?"":seasonLogHTML(my));
  return h;
}

function teamCardHTML(my,rk,co){
  let h=`<div class="idcard" style="--tc:${teamInk(my)};border-left:4px solid ${teamInk(my)}">
    <div class="iname" style="color:${teamInk(my)}">${esc(my)}</div>
    <div class="imeta">${esc(LEAGUE.conf.names[CONF[my]])} &middot; ${SEA.year} season</div>
    <div class="stats">
      <div><b>${recFmt(my,liveRec(my))}</b><span>Record</span></div>
      ${LEAGUE.position?`<div><b>${SEA.pts(my)}</b><span>Points</span></div>`
        :`<div><b>${(()=>{const r=liveConf(my);return LEAGUE.tracksOT&&!LEAGUE.draws?r[0]+"-"+(r[1]-r[2])+"-"+r[2]:r[0]+"-"+r[1]})()}</b><span>${LEAGUE.text.group}</span></div>`}
      <div title="${/Power/.test(LEAGUE.text.rank)?"The power ranking: how strong each team is playing now, not only its record":""}"><b>${reveal==="half"?"&mdash;":standTag(my,rk)}</b><span>${LEAGUE.text.rank}</span></div>
    </div>${co?`<div class="coachbar">
      <div class="cleft"><div class="cname">${esc(co.n)}${co.you?' <span class="youtag">YOU</span>':""}</div>
        <div class="cmeta">Head coach &middot; ${coachYear(co)<=1?"first season":"year "+coachYear(co)}
        &middot; coaching ${coachGrade(co.q)}</div></div>
      ${seatBadge()}</div>`:""}
    ${(()=>{const O=(SEA.oc&&SEA.oc[my])||(U.oc&&U.oc[my]);
      const D=(SEA.dc&&SEA.dc[my])||(U.dc&&U.dc[my]);
      if(!O||!D)return "";
      const row=(lab,c)=>`<div class="stline"><span class="stlab">${lab}</span>
        <span class="stn">${esc(c.n)}</span><span class="sts">${esc(c.s)}</span>
        <span class="stq ${c.q>=20?'up':c.q<=-20?'dn':''}" title="How good he is at the job: 0 is an average ${esc(SPORT.staff.any||"coach")}, +40 one of the best, -40 in over his head">${c.q>0?"+":""}${c.q}</span></div>`;
      return `<div class="staffbar">${row(SPORT.staff.oc.short,O)}${row(SPORT.staff.dc.short,D)}</div>
        <div class="stkey">${esc(SPORT.staff.oc.short)}, ${esc(SPORT.staff.dc.short)}: your two lead assistants. The number is how good each is at the job (0 average, +40 among the best); it shifts how your team plays and how fast players develop.</div>`})()}
    ${(()=>{const e=S.expNow||expectations();
      const w=SEA.rec[my][0],l=SEA.rec[my][1];
      // games left: your remaining regular-season games (was 12 minus games
      // played, a college football season), plus what a postseason run can add
      const left=SEA.sched.filter(g=>g.week>=SEA.step&&(g.home===my||g.away===my)).length;
      // only where play-off games count in the record (college); the pros count the regular season, so "it will take
      // a postseason run" promised wins that never arrive (Instinct, round 16: "6 to go" after a series win)
      const postMax=LEAGUE.postRecord?LEAGUE.post.phases.filter(p=>p!=="selection").length:0;
      const need=Math.max(0,e.w-w);
      // after the regular season, only a team still playing can add wins (it said "it will take a
      // postseason run" to a 36-46 team that had missed the playoffs)
      const alive=SEA.phase==="week"||(SEA.phase!=="done"&&LEAGUE.postRecord&&((SEA.seeds&&SEA.seeds[my])||(SEA.field&&SEA.field.indexOf(my)>=0)
        ||(SEA.bowlPairs||[]).some(p=>p.a===my||p.b===my)
        // before Selection Sunday everyone can still be picked: "Target of 21 wins missed: 19" came during the conference
        // tournament, three wins before Butler reached 22 (Muse, round 50)
        ||(LEAGUE.post&&LEAGUE.post.phases&&LEAGUE.post.phases.indexOf("selection")>=0&&LEAGUE.post.phases.indexOf(SEA.phase)>=0&&LEAGUE.post.phases.indexOf(SEA.phase)<=LEAGUE.post.phases.indexOf("selection"))));
      return `<div class="expbar"><span class="etag">${esc(e.t)}</span>
        <span class="eline">${w+l===0?esc(e.l)
          :e.pos?posGoalLine(e,my)
          // the pros after game 82: the wins are in; the play-offs are judged on their own (the board weighs both)
          :!LEAGUE.postRecord&&SEA.phase!=="week"&&need>0?(()=>{ const c=LEAGUE.goals.clauseLine?LEAGUE.goals.clauseLine(e,my):null;
              return `${w} wins of the ${e.w} asked. ${c?esc(c):SEA.phase==="done"?"":"The play-offs count for the rest."}` })()
          :need===0?(()=>{ const c=LEAGUE.goals.clauseLine?LEAGUE.goals.clauseLine(e,my):null;   // each clause as it stands (Instinct)
              return c?`${e.w} wins reached. ${esc(c)}`:SEA.phase==="done"?`${e.w} wins reached. ${esc(e.l)}`:`${e.w} wins reached. Still to do: ${esc(e.l)}` })()   // "WIN A SERIES · Target of 47 wins already met" read as done (Grokbot)
          :need>left+postMax||!alive?(SEA.phase==="week"?`${e.w} wins is out of reach now.`:`Target of ${e.w} wins missed: ${w} this season.`)   // after the season it's a result, not a forecast (Grokbot)
          // plainly: the target, then what's left of it ("46 more wins from the 47 expected" read oddly: Grokbot, Ian)
          :need>left?`Target: ${e.w} wins. ${need} to go: it will take a postseason run.`
          :`Target: ${e.w} wins. ${need} to go.`}</span></div>`})()}
    </div>`;
  return h;
}

const ANNOUNCE_KINDS={fouls:1,gstart:1};
function autoNoteIn(h){
  const N=live&&live.autoNote, wp=typeof liveWPHTML==="function"?liveWPHTML():"";
  const note=wp+(N&&live.drives.length-N.at<=3?`<div class="autonote"><b>${esc(N.h)}.</b> Your assistant's call: ${esc(N.l.toLowerCase())}. Nothing much between the options tonight, so it wasn't put to you.${N.rule?" "+esc(N.rule):""}</div>`:"");
  if(!note)return h;
  const i=h.indexOf('<div class="watchwrap">'); return i<0?note+h:h.slice(0,i+23)+note+h.slice(i+23);
}
/* soccer's goal line, aware of the occasion (Instinct, round 15: "Target: finish 2nd or better. You're 5th." on the
   night MK Dons went up through the play-offs). A clinch or a settled season says what happened first. */
function posGoalLine(e,my){
  const T=SEA.table?SEA.table(CONF[my]):null, p=T?T.indexOf(my)+1:0, tgt=`finish ${ordinal(e.pos)} or better`;
  const C=S.clinch&&S.clinch.year===SEA.year&&S.clinch.team===my?S.clinch.k:{};
  let res=""; if(SEA.phase!=="week"&&typeof SEA.seasonResult==="function"){ try{ res=SEA.seasonResult(my)||"" }catch(e){} }
  if(C.title||/CHAMPIONS/.test(res))return `Champions. The target was to ${tgt}: done, and then some.`;
  if(C.up||/^Promoted \(/.test(res))return `Promoted. The target was to ${tgt}: done.`;
  if(/Promoted through/.test(res))return `Up through the play-offs. The board asked for ${ordinal(e.pos)} or better (you finished ${ordinal(p)}); going up is what it wanted.`;
  if(C.down||/^Relegated/.test(res))return `Relegated. The target was to ${tgt}.`;
  return `Target: ${tgt}. ${p?"You're "+ordinal(p)+".":""}`;
}
/* how much an absence hurts, in a word: the size stays under the hood (it was a
   raw team-strength number, and a -195 read like nonsense next to a 78 rating) */
/* judged against a typical starter's absence in the same sport (the median,
   measured Nov 2026): Big loss ~ the top fifth, Minor ~ the bottom third */
const INJ_MED={cfb:28,nfl:21,ncaab:60,nba:42,nhl:34,epl:39,mlb:60};
function injHurt(m){ const x=Math.abs(m||0)/(INJ_MED[LEAGUE.id]||30);
  return x>=1.7?{l:"Big loss",c:"big"}:x>=0.7?{l:"Real loss",c:"mid"}:{l:"Minor",c:"low"} }
function injuryHTML(inj){
  let h="";
  if(inj.length){
    h+=`<div class="grouphead">Injury report</div>`;
    h+=inj.map(e=>`<div class="injrow"><span class="ipos">${esc(e.k)}</span>
      <div class="iwho"><div class="pname">${esc(e.who||e.k)}</div>
      <div class="psub">out ${e.w} more ${stepWord(e.w)}${
        e.rating?" &middot; rated "+e.rating:""}</div></div>
      <span class="imag ${injHurt(e.m).c}">${injHurt(e.m).l}</span></div>`).join("")
      +`<div class="stkey">How much each absence hurts depends on how good he is and how good the man replacing him is.</div>`;
  }
  return h;
}

function coachMark(key,text){
  S.seen=S.seen||{};
  if(S.seen[key])return "";
  return `<div class="mark" data-mark="${key}"><b>New:</b> ${text}
    <span class="markx">Got it</span></div>`;
}

/* The coach's notes: a guide through your first games, one note per kind of moment, each gone once read, all gone
   at "Skip the guide" (Ian: an optional tutorial). On for a new career (S.guide); a career from before has none.
   Help turns them back on. */
/* read once in this browser is read for good: every career, all six games (Ian, round 39: "I skip it every time").
   "Skip the guide" turns it off for new careers too; Help turns it back on. Kept beside the saves, never in them. */
const GUIDE_KEY="coach-guide-seen"; let GUIDE_SEEN={};
(async()=>{ try{ const r=await store.get(GUIDE_KEY); if(r&&r.value){ GUIDE_SEEN=JSON.parse(r.value)||{}; if(typeof render==="function"&&S&&S.myTeam)render() } }catch(e){} })();
function guideMark(k,off){ if(off)GUIDE_SEEN.__off=1; else if(k)GUIDE_SEEN[k]=1; try{ store.set(GUIDE_KEY,JSON.stringify(GUIDE_SEEN)) }catch(e){} }
function guideNote(key,text){
  if(S.guide!==true)return "";
  S.seen=S.seen||{}; if(S.seen["g_"+key]||GUIDE_SEEN["g_"+key])return "";
  return `<div class="mark guide" data-mark="g_${key}"><b>Coach's note:</b> ${text}
    <span class="markx">Got it</span> <span class="markx guideoff" data-guideoff="1">Skip the guide</span></div>`;
}
const GUIDE_CALL={
  prep:"Before the game: their last few games, by how they played. Pick the answer to what they did most, or wait and see. After the game you'll see whether you were right.",
  read:"The panel is how they're playing tonight. A number marked &#9650; or &#9660; is well away from the league average: that's the tell. Your staff disagree on purpose: Pearl says what she just saw, the Bears always want the bold thing, the capybara the safe one. The numbers are your best guide.",
  third:"Ten minutes left: some teams change their system for the third. The right-hand column counts only what's happened since the second intermission.",
  close:"Crunch time: they'll go to their closing play or stay with what's worked tonight. The report of their close finishes is beside what they've run tonight.",
  flank:"Where your attacks got through in the first half. A full-back having a hard day shows up here, but a small gap can be luck.",
  goalie:"Is your goalie having a bad night, or just unlucky? Soft goals tell you he's off; goals over the expected number can be bad luck on their own.",
  fourth:"The percentages are the play's own odds. Afterwards the call is graded on what wins the game, by replaying the rest of it many times with each option: a likely conversion can still be the wrong choice."
};
const GUIDE_SITUATION="A situation call: only asked while the game is still in the balance. After the game it's graded by replaying the rest of the game many times with each option, against leaving it to your assistant.";
function bindGuide(){
  document.querySelectorAll(".guide[data-mark]").forEach(b=>b.onclick=e=>{ if(e&&e.target&&e.target.dataset&&e.target.dataset.guideoff){ S.guide=false; guideMark(null,true) }
    else { S.seen=S.seen||{}; S.seen[b.dataset.mark]=1; guideMark(b.dataset.mark) } save(); render() });
}
function guideForCall(dp){ return guideNote("call_"+(GUIDE_CALL[dp.k]?dp.k:"situation"),GUIDE_CALL[dp.k]||GUIDE_SITUATION) }

function planPickerHTML(wp){
  return `
  <div class="planbox"><div class="planlab">Your gameplan</div>
    <div class="plans">${Object.keys(PLANS).map(k=>
      `<button class="planbtn" data-plan="${k}" aria-pressed="${plan===k}">
        ${esc(PLANS[k].l)}</button>`).join("")}</div>
    <div class="pland">${esc(PLANS[plan].d)}</div>
  </div>`;
}

/* Things worth your attention right now. */
function attentionHTML(my){
  if(SEA.phase!=="week"||!SEA.roster)return "";
  const R=SEA.roster[my], out=[];
  const hurt={}; SEA.talent.active(my).forEach(e=>hurt[e.idx]=e);
  POS.forEach((P,i)=>{
    const s=R[i], b=R[BK(i)];
    if(!s||!b||hurt[i]||hurt[BK(i)])return;      // never "start him" for a man who's hurt (Muse: an OUT player was recommended)
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
    // a losing run puts an ordinary assistant under fire, not a good one ("SACK HIM" for a +24
    // after an 11-3 year: Grokbot); a poor one is under fire whatever the record
    if(st[my].q>-25&&!(shortfall&&st[my].q<10))return;
    out.push({k:"staff",side:side,
      h:`Your ${SPORT.staff[side].long} is under fire`,
      // says why he's under fire (Grokbot: "under fire" after a 1-5 run, no reason given)
      b:`${st[my].n} &mdash; ${coordGrade(st[my].q)}. ${st[my].q<=-25?"One of the weakest at the job in the league.":`You're ${recStr(my)}, and he isn't good enough to be spared it.`}
        An interim would be replacement level; you'd hire properly in the offseason.`});
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
      // where it's played, as the game will be (round 48: the headline took every play-off game as neutral while the
      // injury note under it took it as a home game: 62% over "73% without him; about 81% with him", Muse round 21)
      const atH=pn.home===my||pn.home===true, neu=!!pn.neutral||pn.home===undefined;
      const wp=pn.opp?withPlan("balanced",()=>winProb(my,pn.opp,atH,neu)):null;
      h+=`<div class="grouphead">Next up</div>
        <div class="nextcard"><div class="nlabel">${esc(pn.label.toUpperCase())}</div>
        <div class="nopp">${pn.opp?rkTag(rk[pn.opp])+TL(pn.opp):"Opponent TBD"}</div>${pn.opp&&typeof seriesBookHTML==="function"?seriesBookHTML(pn.opp):""}${pn.opp&&typeof filmLine==="function"?filmLine(pn.opp):""}
        <div class="nrec">${pn.opp?recStr(pn.opp)
          +" &middot; "+esc(LEAGUE.conf.names[CONF[pn.opp]])
          :"Matchup set when the round is played"}</div>
        ${wp!==null?`<div class="odds"><span class="obar"><i style="width:${(wp*100).toFixed(0)}%"></i></span>
          <span class="opct">${pctShown(wp)}%</span>
          <span class="olab">to win, before the game</span></div>${injuredLine(pn.opp,atH,neu)}`:""}
        ${planPickerHTML(wp)}</div>`;
    }
    return h;
  }
  // the race, late in the season (round 57, baseball: magic numbers and the scoreboard; both testers lost interest by September)
  if(LEAGUE.ui.raceCard&&SEA.phase==="week")try{ h+=LEAGUE.ui.raceCard(my)||"" }catch(e){}
  let ng=SEA.nextGame(my), ngStep=SEA.step;
  // a league with a game most days (LEAGUE.skipIdle): the button plays through
  // the days you're off, so the card shows your next game, not an open date
  if(!ng&&SEA.phase==="week"&&LEAGUE.skipIdle){
    const nx=SEA.sched.filter(x=>x.week>SEA.step&&(x.home===my||x.away===my)).sort((x,y)=>x.week-y.week)[0];
    if(nx){ng=nx; ngStep=nx.week} }
  if(!ng&&SEA.phase==="week"){
    h+=`<div class="grouphead">Next up &mdash; ${esc(LEAGUE.dates[SEA.step]||"")}</div>
      <div class="nextcard bye"><div class="nlabel">OPEN DATE</div>
      <div class="byeowl">${owlSVG("owlmini",false)}</div>
      <div class="nopp">${esc(LEAGUE.text.bye||"Bye week")}</div>
      <div class="nrec">No game &mdash; everyone else plays on</div></div>`;
  }
  if(ng){
    const opp=ng.home===my?ng.away:ng.home;
    // the chance before the game is the same whichever plan you pick: clicking the plans and watching it move gave the
    // answer away (Ian). The plans are judged on the result card.
    const wp=withPlan("balanced",()=>winProb(my,opp,ng.home===my,ng.neutral));
    const st=stakesFor(ng);
    const riv=LEAGUE.rivals.name(my,opp);
    const ser=riv?LEAGUE.rivals.series(U,my,opp):null;
    const cupNight=ng.cup&&LEAGUE.cup;
    h+=`<div class="grouphead">Next up &mdash; ${esc(cupNight?LEAGUE.cup.date(ngStep):LEAGUE.dates[ngStep]||"")}</div>
      <div class="nextcard ${riv?'riv':''}${cupNight?' cupcard':''}">
      <div class="nlabel">${cupNight?esc(ng.title.toUpperCase())+" &middot; "+(ng.neutral?"AT "+esc((ng.site||"").toUpperCase()):ng.home===my?"HOME vs":"AWAY at"):ng.neutral?"NEUTRAL SITE"+(ng.site?" &middot; "+esc(ng.site.toUpperCase()):"")+" &middot; vs":ng.home===my?"HOME vs":"AWAY at"}</div>
      <div class="nopp">${rkTag(rk[opp])}${TL(opp)}</div>
      <div class="nrec">${recStr(opp)} &middot; ${esc(LEAGUE.conf.names[CONF[opp]])}</div>${ng.sn>1?`<div class="nrec serline">${serLine(ng,my)}</div>`:""}
      ${ng.home!==my&&!ng.neutral?`<div class="venue">Road game at ${esc(opp)} &mdash;
        ${esc(venueLabel((SEA.hfa&&SEA.hfa[opp])||LEAGUE.tuning.hfa,SEA.hfa?NAMES.map(t=>SEA.hfa[t]):null))}.</div>`:""}
      ${ser?`<div class="series"><b>${ser.w}-${ser.l}${ser.d?"-"+ser.d:""}</b> in the series${
        ser.streak&&ser.streak.n>1?` &middot; ${ser.streak.team===my
          ? "you've won "+ser.streak.n+" straight"
          : esc(ser.streak.team)+" has won "+ser.streak.n+" straight"}`:""}
        ${ser.games[0]?` &middot; last year ${ser.games[0].w===my?"you won":esc(ser.games[0].w)+" won"} ${ser.games[0].s}`:""}
      </div>`:(H=>H?`<div class="series"><b>${H.w}-${LEAGUE.draws?H.d+"-":""}${H.l}${!LEAGUE.draws&&H.d?"-"+H.d:""}</b> against them in your games${H.s?` &middot; last time ${H.won===1?"you won":H.won===0?"they won":"a draw"}, ${H.s}${H.y!==SEA.year?" ("+H.y+")":""}`:""}</div>`:"")(h2hWith(opp))}${typeof rivalLine==="function"?rivalLine(opp):""}${typeof filmLine==="function"?filmLine(opp):""}
      ${oddsHTML(my,opp,ng.home===my,ng.neutral,wp)}
      ${cupNight?`<div class="stake"><span class="stag">${esc(LEAGUE.cup.tag||"CUP")}</span><span class="sline">${LEAGUE.cup.stake(my,opp,ng)} ${esc(LEAGUE.cup.rule||"")}</span></div>
        <button class="rewatch seedraw" data-cupview="1">${LEAGUE.cup.groups?"See the Cup":"See the draw"}</button>`
        :((LEAGUE.cup&&LEAGUE.cup.groupLine&&LEAGUE.cup.groupLine(Object.assign({week:ngStep},ng)))?`<div class="stake"><span class="stag">${esc(LEAGUE.cup.tag)}</span><span class="sline">${LEAGUE.cup.groupLine(Object.assign({week:ngStep},ng))}</span></div><button class="rewatch seedraw" data-cupview="1">See the Cup</button>`:"")
        +st.map(x=>`<div class="stake"><span class="stag">${esc(x.tag)}</span>
        <span class="sline">${x.l}</span></div>`).join("")}
      ${guideNote("hub","The percentage is the game's own chance of winning, worked out from the lineup you've picked: start a backup and it moves. Your gameplan below doesn't move it on purpose: plans trade safety for variance, and each is judged on the result card.")}
      ${planPickerHTML(wp)}</div>`;
  }
  // a cup tie this week too (soccer's FA Cup): its own card, midweek
  if(SEA.phase==="week"&&SEA.gamesFor&&LEAGUE.cup){
    SEA.sched.filter(x=>x.week===SEA.step&&x.cup&&x!==ng&&(x.home===my||x.away===my)).forEach(cg=>{
      const opp=cg.home===my?cg.away:cg.home, wp=winProb(my,opp,cg.home===my,cg.neutral);
      const line=LEAGUE.cup.stake?LEAGUE.cup.stake(my,opp,cg):"";
      h+=`<div class="grouphead">Midweek &mdash; ${esc(LEAGUE.cup.date(SEA.step))}</div>
        <div class="nextcard cupcard">
        <div class="nlabel">${esc(cg.title.toUpperCase())} &middot; ${cg.neutral?"AT "+esc((cg.site||"").toUpperCase()):cg.home===my?"HOME vs":"AWAY at"}</div>
        <div class="nopp">${TL(opp)}</div>
        <div class="nrec">${recStr(opp)} &middot; ${esc(LEAGUE.conf.names[CONF[opp]])}</div>
        ${oddsHTML(my,opp,cg.home===my,cg.neutral,wp)}
        <div class="stake"><span class="stag">${esc(LEAGUE.cup.tag||"CUP")}</span><span class="sline">${line} ${esc(LEAGUE.cup.rule||"")}</span></div>
        <button class="rewatch seedraw" data-cupview="1">${LEAGUE.cup.groups?"See the Cup":"See the draw"}</button></div>`;
    });
  }
  return h;
}

/* Whole slate: results where played, fixtures where not. */
function scheduleHTML(team,compact){
  const rows=[];
  for(let w=0;w<LEAGUE.weeks;w++){
    const W=SEA.weeks[w];
    const played=!!W;
    // every game of yours that week: the league game first, then a cup tie
    const all=(played?W.games:SEA.sched.filter(x=>x.week===w)).filter(x=>x.home===team||x.away===team)
      .sort((x,y)=>(x.cup?1:0)-(y.cup?1:0));
    const label=`Wk ${w+1}`;
    if(!all.length&&LEAGUE.skipIdle)continue;           // a day off in a daily league is no row
    if(!all.length){rows.push(`<div class="srow byerow"><span class="spos">&ndash;</span>
      <span class="steam">${esc(LEAGUE.text.bye||"Bye week")}</span><span class="sconf byelbl">${label}</span></div>`);continue}
    all.forEach(g=>{
    const opp=g.home===team?g.away:g.home;
    const rk=SEA.poll.rankMap()[opp];
    const riv=LEAGUE.rivals.name(team,opp);
    if(played){
      const won=g.winner===team;
      const ms=g.home===team?g.hp:g.ap, os=g.home===team?g.ap:g.hp;
      const otl=!won&&g.ot, drew=!!g.draw;             // hockey: a point for losing in overtime; soccer: a draw
      rows.push(`<div class="srow"><span class="spos ${won?'wl-w':drew||otl?'wl-o':'wl-l'}">${won?"W":drew?"D":otl?"OTL":"L"}</span>
        <span class="steam">${haWord(g,team)} ${rkTag(g.home===team?g.arank:g.hrank)}${TL(opp)}${
          g.cup?` <em class="rivmark sod">${esc(g.title.replace(/^(FA|NBA) Cup /,"Cup "))}</em>`:riv?` <em class="rivmark">${esc(riv)}</em>`:""}</span>
        <span class="sconf">${ms}-${os}${g.pens?" p":g.ot?(g.so?" SO":" OT"):""}</span></div>`);
    }else{
      rows.push(`<div class="srow up"><span class="spos">${LEAGUE.skipIdle?"":label.replace("Wk ","")}</span>
        <span class="steam">${haWord(g,team)} ${rkTag(rk)}${TL(opp)}${ranksMean()||!SEA.rec[opp]?"":` <span class="srec" style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-left:4px">${recStr(opp)}</span>`}${
          g.cup?` <em class="rivmark sod">${esc(g.title.replace(/^(FA|NBA) Cup /,"Cup "))}</em>`:riv?` <em class="rivmark">${esc(riv)}</em>`:""}</span>
        <span class="sall">${esc(g.cup&&LEAGUE.cup?LEAGUE.cup.date(w):LEAGUE.dates[w]||"")}</span></div>`);
    }
    });
  }
  // postseason
  const post=SEA.postGamesFor(team);
  post.forEach(([g,n])=>{
    const won=g.winner===team, opp=g.home===team?g.away:g.home;
    const ms=g.home===team?g.hp:g.ap, os=g.home===team?g.ap:g.hp;
    rows.push(`<div class="srow post"><span class="spos ${won?'wl-w':'wl-l'}">${won?"W":"L"}</span>
      <span class="steam">${haWord(g,team)} ${esc(opp)} <em class="rivmark sod">${esc(n)}</em></span>
      <span class="sconf">${ms}-${os}</span></div>`);
  });
  return rows.join("");
}

function seasonLogHTML(my){
  return `<div class="grouphead">${SEA.year} schedule</div>`+scheduleHTML(my);
}

function expectations(){
  const my=S.myTeam, p=U?U.program[my]:1500;
  return LEAGUE.goals.expectations(p);
}

function seasonGrade(wins,losses,result,exp){ return LEAGUE.goals.grade(wins,losses,result,exp) }

function milestones(wins,losses,result,rank,team,history){
  const my=team||S.myTeam, out=[], H=history||S.history;
  // your seasons at this club only: the history holds every club's rows, so
  // after a move "your tenure" counted years before you arrived (Muse: a
  // milestone whose arithmetic didn't add up)
  const mine=H.filter(h=>(h.team||my)===my).map(h=>h.teams&&h.teams[my]?h.teams[my]:null).filter(Boolean);
  if(!mine.length){
    if(wins+losses>0&&wins>=Math.max(10,Math.ceil(0.7*(wins+losses))))out.push(`${wins} wins in your first season in charge.`);   // was 11 wins in any game: a 15-67 first NBA season was a "milestone"
    return out;
  }
  const bestW=Math.max(...mine.map(r=>r[0]));
  const bestR=Math.min(...mine.map(r=>r[2]));
  // from your third season: in year two it only ever beats year one, an odd thing to celebrate (Grokbot)
  if(wins>bestW&&mine.length>=2)out.push(`Best season of your tenure &mdash; ${wins} wins, past the old high of ${bestW}.`);
  if(rank<bestR&&rank<=RANK_TOP)out.push(`Highest finish yet at No. ${rank}.`);
  if(LEAGUE.goals.isTitle(result)&&!H.some(h=>h.champion===my&&(h.team||my)===my))
    out.push(LEAGUE.goals.firstTitle);
  let streak=0;
  for(let i=mine.length-1;i>=0;i--){if(mine[i][0]>mine[i][1])streak++;else break}
  if(wins>losses&&streak+1>=5)out.push(`${streak+1} straight winning seasons.`);
  if((wins+losses>=20?wins<=0.35*(wins+losses):losses>=9&&wins<=3)&&wins<Math.min(...mine.map(r=>r[0])))   /* round 55: 3 wins or fewer was football's; 82- and 162-game seasons never qualified */
  out.push(`Worst season of your ${mine.length+1} in charge. That will be remembered.`);
  return out;
}

/* ============ weekly news desk ============ */
function loserRank(g){return g.winner===g.home?g.arank:g.hrank}
function winnerRank(g){return g.winner===g.home?g.hrank:g.arank}
function scoreOf(g,t){return g.home===t?g.hp:g.ap}
function oppOf(g,t){return g.home===t?g.away:g.home}

/* One of several ways to say a thing, chosen by season, week and a key, so
   the same moment always reads the same (a reloaded save shows the same
   words) but the season doesn't repeat itself. */
function vary(list,key){
  let h=(2166136261^((SEA?SEA.year:0)*131+(SEA?SEA.step:0)))>>>0;   // FNV-1a, then mixed
  for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619)>>>0;
  h=(h^(h>>>13))>>>0; h=Math.imul(h,2246822507)>>>0; h=(h^(h>>>16))>>>0;   // keep it unsigned
  return list[h%list.length];
}
function weekNews(W){
  const my=S.myTeam, items=[];
  const gs=W.games;
  const rankTxt=r=>LEAGUE.position?"":r&&r<=RANK_TOP?"No. "+r+" ":"";   // a league with a table quotes no rankings

  // headline: the best ranked team to go down
  const ups=gs.filter(g=>g.winner&&loserRank(g)<=25&&winnerRank(g)>loserRank(g))   // a draw is no upset (it read "null edged null")
              .sort((a,b)=>loserRank(a)-loserRank(b));
  if(ups.length){
    const g=ups[0], L=g.loser, Wn=g.winner;
    const lr=loserRank(g), wr=winnerRank(g);
    const verb=g.margin>=MG("rout")?vary(["routed","ran over","blew out"],"uv"+Wn)
              :g.margin<=MG("close")?vary(["edged","held off","slipped past"],"uv"+Wn):vary(["beat","knocked off","took down"],"uv"+Wn);
    items.push({p:90,k:"upset",tone:"flag",
      h:g.pens?`${rankTxt(wr)}${Wn} beat ${rankTxt(lr)}${L} on penalties after a ${g.hp}-${g.ap} draw`   // a shoot-out isn't "edged, 3-3"
        :`${rankTxt(wr)}${Wn} ${verb} ${rankTxt(lr)}${L}, ${Math.max(g.hp,g.ap)}-${Math.min(g.hp,g.ap)}`,
      b: lr<=5 ? vary([`A top-five team is down. ${L} won't drop out, but the margin for error is gone.`,
                       `${L} was supposed to be one of the best. ${LEAGUE.text.week?"Not tonight.":"Not this week."}`,
                       `The top five just lost a member for a ${WK()}. ${L} has work to do.`],"ub"+L)
        : wr>25 ? vary([`${Wn} came in unranked. ${L} will pay for this one in ${LEAGUE.text.ranking}.`,
                        `Nobody had ${Wn} on this one. ${L} will feel it in ${LEAGUE.text.ranking}.`],"ub"+L)
        : vary([`${Wn} moves up; ${L} slides.`,`${Wn} climbs. ${L} has some explaining to do.`,
                `A swap in ${LEAGUE.text.ranking} coming: ${Wn} up, ${L} down.`],"ub"+L)});
  }
  // other ranked casualties
  const more=ups.slice(1,3);
  if(more.length)items.push({p:40,k:"also",tone:"muted",
    h:vary([`Also down: `,`Also losing: `,`More losses near the top: `],"ah")+more.map(g=>rankTxt(loserRank(g))+g.loser).join(", "),
    b:vary([`${more.length===1?"That's":"Those are"} more cracks in ${LEAGUE.text.top}.`,
            `It was that kind of ${WK()}.`,`Nobody is safe this year.`,`Expect some reshuffling.`],"ab")});

  // your team, framed
  const mg=gs.find(g=>g.home===my||g.away===my);
  if(mg){
    const won=mg.winner===my, opp=oppOf(mg,my);
    const ms=scoreOf(mg,my), os=scoreOf(mg,opp);
    const oppR=mg.home===my?mg.arank:mg.hrank;
    const v=(list)=>vary(list,"you"+opp);
    let b;
    if(mg.draw)b=v([`A point. Take it and move on.`,`Shared spoils.`,`Honours even.`,`A point gained, or two dropped: depends who you ask.`]);
    else if(won&&oppR<=25)b=v(LEAGUE.text.rankedWin);
    else if(won&&mg.margin>=MG("crush"))b=v([`Never in doubt.`,`Decided early.`,`A statement, if anyone was listening.`]);
    else if(won&&mg.margin<=MG("close"))b=v([`Survived. They won't all look like that.`,`Ugly, but it counts.`,`Closer than anyone wanted.`]);
    else if(won)b=v([`Business handled.`,`A solid day's work.`,`No drama. Next.`]);
    else if(oppR<=10)b=v([`No shame in it, but the résumé takes a hit.`,`Beaten by one of the best. It still counts as one.`]);
    else if(oppR>25){ const T=LEAGUE.text, played=(SEA.rec[my]||[0,0]).slice(0,2).reduce((x,y)=>x+y,0)+((SEA.drw&&SEA.drw[my])||0);
      const grp=NAMES.filter(t=>CONF[t]===CONF[my]).length, pos=LEAGUE.position?LEAGUE.position(my):0;
      b=v(T.badLossEarly&&played<=Math.ceil(LEAGUE.weeks/6)?T.badLossEarly:T.badLossLow&&pos&&pos>grp-6?T.badLossLow:T.badLoss) }
    else b=v([`A setback.`,`Not good enough, and they know it.`,`One to learn from, and quickly.`]);
    const verb=mg.pens?(won?"won on penalties against":"lost on penalties to"):mg.draw?v(["drew with","shared the points with","were held by"]):won?(mg.margin>=MG("crush")?v(["routed","ran away from","buried"]):mg.margin<=MG("close")?v(["edged","held off","survived"]):v(["beat","handled","got past"]))
                  :(mg.margin>=MG("crush")?v(["was run over by","was blown out by"]):mg.margin<=MG("close")?v(["fell just short against","lost a heartbreaker to","came up short against"]):v(["lost to","fell to","was beaten by"]));
    items.push({p:100,k:"you",tone:"gold",
      h:`${my} ${verb} ${rankTxt(oppR)}${opp}, ${ms}-${os}`,b:b});
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
        :vary([`${unb.length} teams still unbeaten`,`${unb.length} without a loss`,`Still perfect: ${unb.length} teams`],"un"),
      b:unb.slice(0,6).join(", ")+(unb.length>6?" and others":"")+"."});
  }

  // rivalry, with the series behind it
  const rivG=gs.filter(g=>LEAGUE.rivals.name(g.home,g.away))
    .sort((x,y)=>Math.min(x.hrank||999,x.arank||999)-Math.min(y.hrank||999,y.arank||999))[0];
  if(rivG){
    const nm=LEAGUE.rivals.name(rivG.home,rivG.away);
    // a draw has no winner (round 55: soccer's first named derbies read "null takes The Merseyside derby, 1-1")
    if(!rivG.winner){ const ser=LEAGUE.rivals.series(U,rivG.home,rivG.away);
      items.push({p:85,k:"riv",tone:"flag",h:`${rivG.home} and ${rivG.away} draw ${nm}, ${rivG.hp}-${rivG.ap}`,
        b:ser?`${ser.w}-${ser.l}${ser.d?"-"+ser.d:""} in the series for ${rivG.home} (won, lost, drawn).`:"Honours even."}) }
    else{
    const ser=LEAGUE.rivals.series(U,rivG.winner,rivG.loser);
    let b=`${rivG.winner} keeps ${nm}.`;
    if(ser&&ser.streak&&ser.streak.n>=2)
      b=`${ser.streak.team} has now won ${ser.streak.n} straight in ${nm}.`;
    else if(ser)b=`${ser.w}-${ser.l}${ser.d?"-"+ser.d:""} in the series${ser.d?" (won, lost, drawn)":""}.`;
    items.push({p:85,k:"riv",tone:"flag",
      h:`${rivG.winner} takes ${nm}, ${Math.max(rivG.hp,rivG.ap)}-${Math.min(rivG.hp,rivG.ap)}`,b:b}); }
  }

  // performance of the week
  if(SEA.roster){
    let best=null;
    NAMES.forEach(t=>{
      SEA.roster[t].forEach((pl,i)=>{
        if(!pl||!pl.last||pl.last.week!==SEA.step-1)return;
        const P=pl.last.pos, st=SPORT.starLine(P,pl.last.line);   // the sport says what stands out
        if(st&&(!best||st.v>best.v))best={v:st.v,n:pl.n,t:pl.last.team,p:P,txt:st.txt};
      });
    });
    if(best)items.push({p:best.t===my?88:62,k:"star",tone:best.t===my?"gold":"muted",
      h:`${best.n} goes for ${best.txt}`,
      b:best.t===my?vary([`The ${best.p} carried ${best.t} \u2014 your guy.`,`Your ${best.p}, and the day belonged to him.`,
                          `Put that one on the tape. Your ${best.p}.`],"st"+best.n)
                   :vary([`The ${best.p} carried ${best.t}.`,`${best.t}'s ${best.p} was the story.`,`A day to remember for ${best.t}'s ${best.p}.`],"st"+best.n)});
  }

  // a team on a run
  const st=streakOf(my);
  if(st.n>=RUN(4))items.push({p:80,k:"run",tone:st.won?"gold":"flag",
    h:st.won?`${my} has won ${st.n} in a row`:`${my} has lost ${st.n} straight`,
    b:st.won?`Nobody wants to see you right now.`:`Something has to change.`});

  // biggest beating
  const blow=gs.slice().sort((a,b)=>b.margin-a.margin)[0];
  if(blow&&blow.margin>=MG("blow"))items.push({p:30,k:"blowout",tone:"muted",
    h:`${blow.winner} ${Math.max(blow.hp,blow.ap)}, ${blow.loser} ${Math.min(blow.hp,blow.ap)}`,
    b:`The ${WK()}'s worst mismatch.`});

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
        b:`Out ${injSeason(x.w)?"for the season":"about "+x.w+" "+stepWord(x.w)}.`+
          (hurt.length>1?` ${hurt.length-1} other ranked team${hurt.length>2?"s":""} took a hit too.`:"")});
    }
  }

  // heisman watch
  if(SEA.step>=6&&SEA.roster){
    const hz=SEA.mvpRace(2);
    if(hz.length)items.push({p:55,k:"heis",tone:"muted",
      h:`${LEAGUE.awards.mvp} watch: ${hz[0].n}, ${classTag(hz[0].c)} ${hz[0].p}, ${hz[0].t}`,
      b:`${hz[0].line||""}${hz[1]?" \u00b7 "+hz[1].n+" ("+hz[1].t+") is closest.":""}`});
  }
  if(typeof milestoneNews==="function")milestoneNews(my).forEach(x=>items.push(x));
  items.sort((x,y)=>(y.p||0)-(x.p||0));
  return items;
}

function newsBlock(){
  const W=SEA.weeks[SEA.weeks.length-1];
  if(!W||!W.games.length)return "";
  const items=weekNews(W).slice(0,6);
  if(!items.length)return "";
  return `<div class="grouphead">${LEAGUE.text.week?"The "+LEAGUE.text.week+" that was":"The week that was"}</div>`+
    items.map(x=>`<div class="news ${x.tone}">
      <div class="nh">${esc(x.h)}</div>${x.b?`<div class="nb">${esc(x.b)}</div>`:""}
    </div>`).join("");
}

/* ============ playoff picture ============ */
let stConf=null;                // Standings in the college games: one conference, or null for all
let grpTab=null;                 // Scores and Standings: which division (LEAGUE.groupFilter), or All
function grpNow(){ return grpTab||CONF[S.myTeam] }
function grpTabsHTML(cupToo){
  const g=grpNow(), nm=c=>LEAGUE.groupShort?LEAGUE.groupShort(c):LEAGUE.conf.names[c];
  return `<div class="subtabs">${LEAGUE.conf.order.map(c=>`<button class="subtab" data-grp="${c}" aria-pressed="${g===c}">${esc(nm(c))}</button>`).join("")}${
    cupToo?`<button class="subtab" data-grp="CUP" aria-pressed="${g==="CUP"}">${esc(LEAGUE.cup?LEAGUE.cup.name:"Cup")}</button>`:""}<button class="subtab" data-grp="ALL" aria-pressed="${g==="ALL"}">All</button></div>`;
}
/* Scores can step back through the weeks played and on to the fixtures to
   come (scoreWk: which week; null follows the latest) */
let scoreWk=null;
function wkLabel(w){ return SEA.weeks[w]?SEA.weeks[w].label:(LEAGUE.stepLabel?LEAGUE.stepLabel(w):`Week ${w+1}`) }
/* a day with nobody playing is stepped over (Ian, round 39: basketball's Scores showed "No games" on an empty day) */
function wkHasGames(w){ return !!((SEA.weeks[w]&&SEA.weeks[w].games.length)||SEA.sched.some(x=>x.week===w)) }
function wkStep(w,d,maxW){ let v=w+d; while(v>=0&&v<=maxW&&!wkHasGames(v))v+=d; return v<0||v>maxW?null:v }
function wkNav(w,last,maxW){
  const pw=wkStep(w,-1,maxW), nw=wkStep(w,1,maxW);
  return `<div class="wknav"><button class="wkbtn" data-wk="${pw===null?w-1:pw}" ${pw===null?"disabled":""} aria-label="Earlier">&larr;</button>
    <div class="wkmid"><h2>${esc(LEAGUE.daily?(LEAGUE.dates[w]||wkLabel(w)):wkLabel(w))}</h2><span>${LEAGUE.daily?"":esc(LEAGUE.dates[w]||"")}${w>last?(LEAGUE.daily?"to come":" &middot; to come"):w<last?(LEAGUE.daily?"played":" &middot; played"):""}</span></div>
    <button class="wkbtn" data-wk="${nw===null?w+1:nw}" ${nw===null?"disabled":""} aria-label="Later">&rarr;</button></div>`;
}
/* home, away or neither: a neutral site (a bowl, a Super Bowl, a tournament) is "vs" for both
   sides, never "at" (Grokbot: "AT CHARLOTTE" for a conference tournament game; no marker on the
   Super Bowl); soccer's cup ties keep their "v" */
function haWord(g,team){ return g.neutral?(g.cup?"v":"vs"):g.home===team?"vs":"at" }
function fixtureLine(g,mine){
  // each side with its ranking (or seed) and record, as the results show them (Ian: "can't see the seeds or records")
  const rk=SEA.poll.rankMap(), sd=x=>(SEA.seeds&&SEA.seeds[x])||(g.hseed&&x===g.home?g.hseed:g.aseed&&x===g.away?g.aseed:null);
  const t=(x)=>`<div class="side"><span class="nm">${sd(x)?`<span class="rk">${sd(x)}</span>`:rkTag(rk[x])}${TL(x)} <span class="frec">${esc(recStr(x))}</span></span><span class="sc"></span></div>`;
  const chips=[]; if(g.title)chips.push(`<span class="chip ttl">${esc(g.title)}</span>`); if(g.site)chips.push(`<span class="chip ttl">${esc(g.site)}</span>`);
  const rv=LEAGUE.rivals.name(g.home,g.away); if(rv)chips.push(`<span class="chip riv">${esc(rv)}</span>`);
  return `<article class="game fixture${mine?" mine":""}"><div class="edge"></div><div class="gbody">
    ${LEAGUE.homeFirst?t(g.home)+t(g.away):t(g.away)+t(g.home)}${chips.length?`<div class="meta">${chips.join("")}</div>`:""}</div></article>`;
}
function fixturesView(w,last,maxW){
  const gs=SEA.sched.filter(x=>x.week===w), my=S.myTeam, mine=g=>g.home===my||g.away===my;
  let h=wkNav(w,last,maxW);
  if(!gs.length)return h+`<div class="note">No games ${LEAGUE.text.week?"this "+LEAGUE.text.week:"this week"}.</div>`;
  const line=g=>fixtureLine(g,mine(g));
  if(LEAGUE.groupFilter)h+=grpTabsHTML(false);
  const yours=gs.filter(mine); if(yours.length)h+=`<div class="grouphead">Yours</div>`+yours.map(line).join("");
  if(LEAGUE.groupFilter){ const g0=grpNow(), sel=g0==="CUP"?CONF[my]:g0, groups=sel==="ALL"?LEAGUE.conf.order:[sel];
    groups.forEach(c=>{ const L=gs.filter(g=>!g.cup&&CONF[g.home]===c); if(L.length)h+=`<div class="grouphead">${esc(LEAGUE.conf.names[c])} &mdash; ${L.length} games</div><div class="${wide?'gamegrid':''}">`+L.map(line).join("")+`</div>` });
    const cupG=gs.filter(g=>g.cup); if(cupG.length)h+=`<div class="grouphead">${esc(cupG[0].title)} &mdash; ${nOf(cupG.length,"tie")}</div>`+cupG.map(line).join("");
    return h }
  return h+`<div class="grouphead">Everyone &mdash; ${nOf(gs.length,"game")}</div><div class="${wide?'gamegrid':''}">`+gs.map(line).join("")+`</div>`;
}
function scoresView(){
  // before the season: the first week's fixtures, not a button to them (Ian, round 39)
  if(!SEA.weeks.length&&scoreWk===null){
    const n0=`<div class="note">The season hasn't started. Hit the button below to play ${LEAGUE.stepLabel?LEAGUE.stepLabel(0):"Week 1"}.</div>`;
    if(!(SEA.sched&&SEA.sched.length))return n0;
    const mx=Math.max(...SEA.sched.map(x=>x.week)); let w0=0; while(w0<mx&&!wkHasGames(w0))w0++;
    return n0+fixturesView(w0,-1,mx) }
  const pv=LEAGUE.ui.postseasonView(); if(pv)return pv;
  const last=SEA.weeks.length-1, maxW=Math.max(last,...SEA.sched.map(x=>x.week));
  let w=scoreWk===null?last:Math.max(0,Math.min(scoreWk,maxW));
  if(!wkHasGames(w)){ const f=wkStep(w,1,maxW), b=wkStep(w,-1,maxW); w=f!==null?f:b!==null?b:w }
  if(w>last)return fixturesView(w,last,maxW);
  const W=SEA.weeks[w];
  if(!W)return `<div class="note">No games yet.</div>`;
  if(LEAGUE.groupFilter){
    const cupG=W.games.filter(g=>g.cup), g0=grpNow(), sel=g0==="CUP"&&!cupG.length?CONF[S.myTeam]:g0;
    let h=wkNav(w,last,maxW)+grpTabsHTML(cupG.length>0)+(sel===CONF[S.myTeam]&&w===last?newsBlock():"");
    const line=g=>gameLine(g,g.home===S.myTeam||g.away===S.myTeam);
    if(sel==="CUP")return h+`<div class="grouphead">${esc(cupG[0].title)} &mdash; ${nOf(cupG.length,"tie")}</div>`+cupG.map(line).join("")+
      `<button class="rewatch seedraw" data-cupview="1">See the whole draw</button>`;
    const groups=sel==="ALL"?LEAGUE.conf.order:[sel];
    groups.forEach(c=>{ const gs=W.games.filter(g=>!g.cup&&CONF[g.home]===c); if(!gs.length)return;
      h+=`<div class="grouphead">${esc(LEAGUE.conf.names[c])} &mdash; ${nOf(gs.length,"game")}</div><div class="${wide?'gamegrid':''}">`+gs.map(line).join("")+`</div>` });
    if(sel==="ALL"&&cupG.length)h+=`<div class="grouphead">${esc(cupG[0].title)} &mdash; ${nOf(cupG.length,"tie")}</div>`+cupG.map(line).join("");
    return h;
  }
  const marq=W.games.filter(g=>Math.min(g.hrank||999,g.arank||999)<=25);
  const rest=W.games.filter(g=>Math.min(g.hrank||999,g.arank||999)>25);
  let h=wkNav(w,last,maxW);
  if(w===last)h+=newsBlock();
  if(marq.length)h+=`<div class="grouphead">Ranked teams</div>`+
    marq.map(g=>gameLine(g,g.home===S.myTeam||g.away===S.myTeam)).join("");
  if(rest.length)h+=`<div class="grouphead">Around the country &mdash; ${nOf(rest.length,"game")}</div>`+
    `<div class="${wide?'gamegrid':''}">`+
    rest.map(g=>gameLine(g,g.home===S.myTeam||g.away===S.myTeam)).join("")+`</div>`;
  return h;
}

function standingsView(){
  const st=SEA.weeks.length?SEA.weeks[SEA.weeks.length-1].standings:SEA.standings(null);
  // the rank beside a team is today's poll, as on the poll tab (the week's snapshot kept the poll from
  // before its games: Vanderbilt #12 in the poll, #14 here, Grokbot)
  const nowRk=reveal==="half"?null:SEA.poll.rankMap();
  let h=`<div class="dateline"><h2>Standings</h2><span>${SEA.year}</span></div>`;
  // round 69: the league's leaders sit beside the table
  h+=`<div class="subtabs">${[["table","Table"],["leaders","Leaders"]].map(([k,l])=>`<button class="subtab" data-sttab="${k}" aria-pressed="${standTab===k}">${l}</button>`).join("")}</div>`;
  if(standTab==="leaders")return h+leadersView();
  const mine=CONF[S.myTeam];
  let order=LEAGUE.conf.order.filter(c=>c===mine).concat(LEAGUE.conf.order.filter(c=>c!==mine));
  if(LEAGUE.groupFilter){ const g0=grpNow()==="CUP"?mine:grpNow(); h+=grpTabsHTML(false); if(g0!=="ALL")order=[g0] }
  // the college games' 30-odd conferences: pick one (Muse: "no conference filter")
  else if(LEAGUE.conf.order.length>4){
    if(stConf&&order.indexOf(stConf)<0)stConf=null;
    // what the groups are called (round 59: "Conference" over MLB's divisions: Instinct)
    const GW=((LEAGUE.text&&LEAGUE.text.groupWord)||"CONFERENCE").toLowerCase(), GW1=GW[0].toUpperCase()+GW.slice(1);
    h+=`<div class="confpick"><label for="stconf">${GW1}</label> <select id="stconf">
      <option value="">All ${GW==="league"?"leagues":GW.replace(/y$/,"ie")+"s"}</option>${order.map(c=>`<option value="${esc(c)}"${stConf===c?" selected":""}>${esc(LEAGUE.conf.names[c])}${c===mine?" (yours)":""}</option>`).join("")}</select></div>`;
    if(stConf)order=[stConf] }
  if(wide)h+=`<div class="standgrid">`;
  const XC=LEAGUE.ui.standingsCols||[];
  order.forEach(c=>{
    const head=`<div class="srow shead"><span class="spos">#</span>
      <span class="dot" style="opacity:0"></span>
      <span class="steam">Team</span><span class="sconf">${LEAGUE.standingsCol?LEAGUE.standingsCol.label:(LEAGUE.text.groupShort||"Conf")}</span>
      <span class="sall">Overall</span>${XC.map(x=>`<span class="sx${x.opt?" sxo":""}">${x.label}</span>`).join("")}</div>`;
    // a league's own columns (soccer's goal difference; basketball's streak and last ten) and zones (soccer)
    const zone=i=>LEAGUE.ui.standingsZone?LEAGUE.ui.standingsZone(c,i+1):"";
    const row=(r,i,mark)=>`<div class="srow ${r.team===S.myTeam?'mine':''}${zone(i)?" zone-"+zone(i):""}">
      <span class="spos ${mark?'qual':''}">${i+1}</span>
      <span class="dot" style="background:${teamColor(r.team)}"></span>
      <span class="steam">${LEAGUE.ui.clinchTag?LEAGUE.ui.clinchTag(r.team):""}${rkTag(nowRk?nowRk[r.team]:r.rank)}${TL(r.team)}</span>
      <span class="sconf">${r.cr}</span><span class="sall">${r.rec}</span>${XC.map(x=>`<span class="sx${x.opt?" sxo":""}">${x.val(r.team)}</span>`).join("")}</div>`;
    h+=`<div class="cbox"><div class="chead">${esc(LEAGUE.conf.names[c])}</div>`;
    if(hasDivisions(c)){
      const div={};
      st[c].forEach(r=>{const d=divisionOf(U,r.team)||"East";(div[d]=div[d]||[]).push(r)});
      Object.keys(div).sort().forEach(dn=>{
        h+=`<div class="divhead">${esc(dn)} Division</div>`+head;
        h+=div[dn].map((r,i)=>row(r,i,i===0)).join("");
      });
    }else{
      const q=LEAGUE.ui.standingsQualify!==undefined?LEAGUE.ui.standingsQualify:2;
      // the line falls where a season ends: after the top two in college football; after twelve in college
      // basketball, where twelve play the conference tournament (a line after two made no sense there: Ian)
      const cut=LEAGUE.ui.standingsCut!==undefined?LEAGUE.ui.standingsCut:q;
      h+=head+st[c].map((r,i)=>row(r,i,i<q)+(cut&&i===cut-1&&i<st[c].length-1?`<div class="divider"></div>`:"")).join("");
    }
    h+=`</div>`;
  });
  if(wide)h+=`</div>`;
  h+=LEAGUE.text.standingsNote!==undefined?LEAGUE.text.standingsNote:`<div class="note">Conference record, then overall. Amber marks who would play for the
    title &mdash; the top two, or each division winner in the Sun Belt, the one conference
    still split into divisions.</div>`;
  return h;
}

let dynTab="program", dynTeam=null, dynQ="", league=null, leagueMsg="";
let dynCoach=null, coachQ="";

function coachRows(){
  if(!U||!U.coach)return [];
  // a person's row is their whole career, every stop (it counted only the
  // current job, and disagreed with the You page: Muse)
  const careerOf=t=>{ if(t===S.myTeam)return S.career;
    const c=(S.coaches||[]).find((x,i)=>i!==(S.turn||0)&&x&&x.myTeam===t); return c&&c.career };
  return coachTable(U).map(r=>{ const C=r.you&&careerOf(r.team); if(!C)return r;
    // banked seasons, like every other coach's row (the season in progress isn't in theirs)
    return Object.assign({},r,{w:C.w,l:C.l,d:C.d||0,titles:C.titles,confs:C.confs,stops:C.stops.slice()}) });
}

/* "year N" at his club. Every coach's count goes up once an offseason, a new hire's too, so a coach
   hired this summer read "year 2" in his first season (Muse: the YEAR label lagged after a move). The
   count drives the computer's patience, so it stays; hires since Nov 2026 say when they started. */
function coachYear(c){ const y=c&&c.since!==undefined&&SEA?SEA.year-c.since+1:(c?c.t+1:1); return Math.max(1,y) }
/* hockey, your banked seasons: W-L-OTL from the seasons' own records (the coach page read W-L with the overtime
   losses inside the losses, a third version of one record: Muse, round 39) */
function bankedRec(w,l,team,from,to){
  if(!LEAGUE.tracksOT||LEAGUE.draws||!LEAGUE.recText)return null; let o=0;
  (S.history||[]).forEach(h=>{ if(!h||(team&&h.team!==team)||(from!==undefined&&h.year<from)||(to!==undefined&&h.year>to))return;
    const m=/^\d+-\d+-(\d+)$/.exec(h.rec||""); if(m)o+=+m[1] });
  return `${w}-${l-o}-${o}`;
}
function coachCard(c){
  const grade=coachGrade(c.q);
  // soccer: draws count as games (it showed 22-16-8 as "22-8, .733")
  const dd=LEAGUE.draws?(c.d||0):0, pct=(c.w+c.l+dd)?(c.w/(c.w+c.l+dd)).toFixed(3).replace(/^0/,""):"\u2013";
  let h=`<div class="idcard" style="border-left:4px solid ${c.you?"var(--vote)":teamInk(c.team)}">
    <div class="iname" style="color:${c.you?"var(--vote)":teamInk(c.team)}">${esc(c.n)}</div>
    <div class="imeta">${c.you?"You &middot; ":""}head coach, ${esc(c.team)} &middot; year ${coachYear(c)}
      &middot; ${esc(grade)}</div>
    <div class="stats">
      <div><b>${LEAGUE.draws?`${c.w}-${dd}-${c.l}`:(c.you&&bankedRec(c.w,c.l))||`${c.w}-${c.l}`}</b><span>Career</span></div>
      <div><b>${pct}</b><span>Win %</span></div>
      <div><b>${c.titles}</b><span>Titles</span></div>
      <div><b>${c.confs}</b><span>${confWord()}</span></div>
    </div></div>`;
  if(c.stops&&c.stops.length){
    h+=`<div class="grouphead">Coaching stops</div>`;
    h+=c.stops.slice().reverse().map(s=>`<div class="stop" style="padding:9px 16px">
      <span class="dot" style="background:${teamColor(s.team)}"></span>
      <span class="stopteam">${TL(s.team)}</span>
      <span class="stopyr">${s.from}${s.to>s.from?"\u2013"+s.to:""}</span>
      <span class="stoprec">${(c.you&&bankedRec(s.w,s.l,s.team,s.from,s.to))||wdl(s.w,s.l,s.d)}${s.titles?" \u00b7 "+s.titles+"\u00d7":""}</span></div>`).join("");
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
    placeholder="Search coaches or ${LEAGUE.text.orgs}..." value="${esc(coachQ)}"></div>`;
  h+=`<div class="grouphead">${rows.length} head coaches &middot; ranked by what they've won</div>`;
  h+=rows.slice(0,60).map(c=>`<div class="frow cpick ${c.you?'mine':''}" data-coach="${esc(c.team)}">
    <span class="dot" style="background:${teamColor(c.team)}"></span>
    <div class="fmain"><div class="fname">${esc(c.n)}${c.you?' <span class="youtag">YOU</span>':''}</div>
    <div class="fnote">${esc(c.team)} &middot; year ${coachYear(c)}${
      c.stops&&c.stops.length>1?" &middot; "+c.stops.length+" jobs":""}</div></div>
    <div class="tstat"><span class="trec">${wdl(c.w,c.l,c.d)}</span>
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
  if(store.kind()!=="claude"){leagueMsg="The shared table only works when the game runs inside Claude.";render();return}
  try{
    if(!(await store.set(key,JSON.stringify(row),true)))throw new Error("not stored");
    leagueMsg="Posted "+last.year+".";
    await loadLeague();
  }catch(e){leagueMsg="Couldn't post right now.";render()}
}

async function loadLeague(){
  if(store.kind()!=="claude"){league=[];leagueMsg="The shared table only works when the game runs inside Claude.";render();return}
  try{
    const r=await store.list("lg-",true);
    const keys=(r&&r.keys)?r.keys:[];
    const rows=[];
    for(const k of keys.slice(0,80)){
      try{const v=await store.get(k,true); if(v&&v.value)rows.push(JSON.parse(v.value))}
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
  let w=0,l=0,d=0,o=0,oAll=true,best=999,titles=0,confs=0,cfp=0,pw=0,pl=0,coach=0;
  S.history.forEach(h=>{
    const r=h.teams&&h.teams[t]; if(!r)return;
    w+=r[0]; l+=r[1]; d+=r[3]||0; if(r[4]!==undefined&&r[4]!==null)o+=r[4]; else oAll=false; if(r[2]<best)best=r[2];
    if(h.champion===t)titles++;
    if(h.groupChamps&&Object.values(h.groupChamps).indexOf(t)>=0)confs++;
    if(h.seeds&&h.seeds[t])cfp++;
    if(h.post&&h.post[t]){pw+=h.post[t][0]; pl+=h.post[t][1]}
    if(h.coaching&&h.coaching.firedList.indexOf(t)>=0)coach++;
  });
  // the season under way counts too, until it's archived (Grokbot: all-time 0-0 forty games into a first season)
  let cur=false;
  if(SEA&&SEA.rec&&SEA.rec[t]&&!S.history.some(h=>h.year===SEA.year)){ const r=(SEA.regRec||SEA.rec)[t]; cur=r[0]+r[1]>0;
    // and its finish, once it's done: "BEST FINISH #9" after a #5 season not yet archived (Grokbot)
    if(cur&&SEA.phase==="done"){ const k=SEA.poll.rankMap()[t]; if(k&&k<best)best=k }
    w+=r[0]; l+=r[1]; d+=(SEA.drw&&SEA.drw[t])||0; o+=(SEA.otl&&SEA.otl[t])||0 }
  const rk=SEA?SEA.poll.rankMap()[t]:999;
  return {w:w,l:l,best:best===999?null:best,titles:titles,confs:confs,cfp:cfp,
          post:pw+"-"+pl,postGames:pw+pl,coach:coach,now:rk,
          d:d, pct:(w+l+d)?(w/(w+l+d)):null,seasons:S.history.length,
          // hockey: overtime losses, where every season kept them (from Nov 2026)
          rec:(LEAGUE.tracksOT&&!LEAGUE.draws&&oAll&&(S.history.length||cur))?`${w}-${l-o}-${o}`:LEAGUE.draws?`${w}-${d}-${l}`:`${w}-${l}`};
}

function seasonRowsFor(t){
  return S.history.map((h,hi)=>{
    const r=(h.teams&&h.teams[t])||[0,0,999];
    const seed=h.seeds?h.seeds[t]:null;
    const res=LEAGUE.seasonLine(h,t,r,seed);
    const cc=h.groupChamps?Object.keys(h.groupChamps).find(c=>h.groupChamps[c]===t):null;
    // yours only where you coached this club that year (after a move it showed your other job's grades)
    const mine=(h.team||S.myTeam)===t;
    return {year:h.year,hi:mine?hi:-1,rec:histRec((h.teams&&h.teams[t])?r:null,h,t)||wdl(r[0],r[1],r[3]),rank:r[2],res:res,grade:(mine?h.grade:null),
            champ:h.champion===t,conf:cc?(LEAGUE.conf.names[cc]||cc.replace(/ champions$/,"")):null,
            coach:!!(h.coaching&&h.coaching.firedList.indexOf(t)>=0)};
  }).reverse();
}

/* the pro games: what a team pays, against its cap (or, in soccer, its wage
   budget), on every team's card and all season (Muse: payroll was
   offseason-only, and never shown for other teams) */
/* a franchise's long-run strength since the dynasty began, in words: the
   rating points were engine-speak on a coach's card (Instinct) */
function strengthWords(d){
  const a=Math.abs(d), up=d>0;
  return a<25?"about where it was":a<75?(up?"a little stronger":"a little weaker"):a<150?(up?"stronger":"weaker"):(up?"much stronger":"much weaker");
}
function payrollLine(t){
  if(typeof payroll!=="function"||!LEAGUE.cap)return "";
  const R=(SEA&&SEA.roster&&SEA.roster[t])||(U&&U.roster&&U.roster[t]); if(!R||!R.some(p=>p&&p.k))return "";
  const pay=payroll(R), lim=LEAGUE.budgetOf?LEAGUE.budgetOf(U,t):LEAGUE.cap, room=lim-pay;
  return `<div class="progline">Payroll <b>${money2(pay)}</b> of ${money2(lim)} ${LEAGUE.budgetOf?"wage budget":"cap"} &middot; ${
    room>=0?`${money2(room)} of room`:`<span class="dn">${money2(-room)} over</span>`}</div>`;
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
      ${LEAGUE.position?(LEAGUE.position(t)?ordinal(LEAGUE.position(t))+" in ":"no games yet in ")+esc(LEAGUE.conf.names[CONF[t]])
        :A.now<=RANK_TOP?"ranked #"+A.now:"unranked ("+ordinal(A.now)+")"}</div>
    <div class="stats">
      <div><b>${A.rec}</b><span>All-time</span></div>
      <div><b>${A.pct!==null?A.pct.toFixed(3).replace(/^0/,""):"\u2013"}</b><span>Win %</span></div>
      <div><b>${A.best?"#"+A.best:"\u2013"}</b><span>Best finish</span></div>
    </div>
    <div class="stats">
      <div><b>${A.titles}</b><span>Titles</span></div>
      <div><b>${A.confs}</b><span>${confWord()}</span></div>
      <div><b>${A.cfp}</b><span>Playoffs</span></div>
      <div><b>${A.post}</b><span>Postseason</span></div>
    </div>
    ${U&&U.coach&&U.coach[t]?`<div class="coachbar plain cpick" data-coach="${esc(t)}">
      <div class="cleft"><div class="cname">${esc(U.coach[t].n)}</div>
      <div class="cmeta">Head coach &middot; ${coachYear(U.coach[t])<=1?"first season":"year "+coachYear(U.coach[t])}
      &middot; ${coachGrade(U.coach[t].q)}</div></div></div>
      ${U.oc&&U.oc[t]?`<div class="staffbar plain">
        <div class="stline"><span class="stlab">${SPORT.staff.oc.short}</span><span class="stn">${esc(U.oc[t].n)}</span>
          <span class="sts">${esc(U.oc[t].s)}</span></div>
        <div class="stline"><span class="stlab">${SPORT.staff.dc.short}</span><span class="stn">${esc(U.dc[t].n)}</span>
          <span class="sts">${esc(U.dc[t].s)}</span></div></div>`:""}`:""}
    <div class="progline" title="How the ${esc(LEAGUE.text.org)}'s long-run strength has moved since ${base}: with results, ${LEAGUE.classes&&LEAGUE.classes.length?"recruiting":"the draft and signings"}, and the staff">${LEAGUE.text.org} since ${base}:
      <b class="${d>=25?'up':d<=-25?'dn':''}">${strengthWords(d)}</b>
      ${A.coach?` &middot; ${A.coach} coaching change${A.coach>1?"s":""}`:""}</div>${payrollLine(t)}</div>`;
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
        <span class="fcfp ${r.s.w>r.s.l?'up':r.s.w<r.s.l?'dn':''}">${r.s.w}-${r.s.l}${r.s.d?"-"+r.s.d:""}</span></div>`).join("");
    }
  }
  h+=rosterOf(t);
  h+=`<div class="grouphead">${SEA.year} schedule</div>`+scheduleHTML(t);
  if(!rows.length)return h+`<div class="note">No completed seasons yet.</div>`;
  const book=(LEAGUE.records&&U)?LEAGUE.records.book(U,t):[];
  // the franchise's leaders, the players still here included: from the departed alone, a backup who left with 108 passing
  // yards led pro football's list (Muse, round 50)
  const curL=((SEA&&SEA.roster&&SEA.roster[t])||[]).filter(p=>p&&p.car).map(p=>({n:p.n,p:p.p,to:SEA.year,now:true,car:p.car,
    line:LEAGUE.records.alumniLine?LEAGUE.records.alumniLine({p:p.p,car:p.car,yrs:p.yrsHere||1}):""}));
  const leaders=(LEAGUE.records&&U)?LEAGUE.records.leaders(Object.assign({},U,{alumni:Object.assign({},U.alumni||{},{[t]:((U.alumni&&U.alumni[t])||[]).concat(curL)})}),t):[];
  if(leaders.length){
    h+=`<div class="grouphead">Career leaders</div>`;
    h+=`<div class="ldwrap">`+leaders.map(L=>`<div class="ldcat">
      <div class="ldlabel">${esc(L.label)}</div>
      ${L.top.map((x,i)=>`<div class="ldrow ${i===0?'first':''}">
        <span class="ldn">${i+1}</span>
        <span class="ldname">${esc(x.a.n)}</span>
        <span class="ldyr">${x.a.now?"now":x.a.to}</span>
        <span class="ldv">${x.v.toLocaleString()}</span></div>`).join("")}
    </div>`).join("")+`</div>`;
  }
  if(book.length){
    h+=`<div class="grouphead">Record book &mdash; ${book.length} played and left</div>`;
    h+=book.slice(0,12).map(x=>`<div class="arow">
      <div class="fmain"><div class="fname">${esc(x.n)}
        <span class="dpos">${esc(x.p)}</span>
        ${x.early?`<span class="etag">${esc(LEAGUE.text.earlyTag||"left early")}</span>`:""}</div>
      <div class="fnote">${Math.min(x.from,x.to)}&ndash;${x.to} &middot; ${esc(LEAGUE.records.alumniLine(Object.assign({},x,{from:Math.min(x.from,x.to)})))}</div></div>
      <span class="ares ${x.draft?(x.draft.round<=1?'gold':'up'):''}">${
        x.draft?(x.draft.round+"."+String(x.draft.pick).padStart(2,"0")):"\u2013"}</span>
      </div>`).join("");
    if(book.length>12)h+=`<div class="note">Showing the top 12 by draft position.</div>`;
  }
  h+=`<div class="grouphead">${esc(t)}, season by season</div>`;
  h+=rows.map((r,i)=>{
    const idx=r.hi===undefined?-1:r.hi;
    const has=idx>=0&&S.history[idx]&&S.history[idx].coach;
    return `<div class="yrow ${r.champ?'gold':''}">
    <span class="yr">${r.year}</span>
    ${r.grade?`<span class="ygrade">${esc(r.grade)}</span>`:""}
    <div class="ymain"><div class="yrec">${r.rec}
      <span class="yrank">${r.rank<=RANK_TOP?"final #"+r.rank:"unranked"}</span></div>
    <div class="yres">${esc(r.res)}${r.conf?" &middot; "+esc(r.conf)+" champion":""}${
      r.coach?' &middot; <span class="coachtag">new coach hired</span>':""}</div></div>
    ${has?`<button class="ycard" data-card="${idx}" title="Season card">&#8599;</button>`:""}
    </div>`}).join("");
  return h;
}

/* your own seasons, whichever club: after a move, the club card below is the
   new club's history, not yours (Muse) */
/* a group title in the history: a conference, or hockey's "East champions" (a key that is no
   conference: it read "undefined champion", Muse) */
function groupChampName(k){ return LEAGUE.conf.names[k]?LEAGUE.conf.names[k]+" champion":String(k).replace(/s$/,"") }
function yourSeasonsHTML(noCards){
  // every finished season, one row each, from the first (it showed only after a move, and "TCU 2026-2027 13-12" as
  // one stop read as seasons merged: Grokbot, college football and basketball)
  // the season just finished shows the moment it's over, not once the offseason is done (Grokbot: "2027 under
  // way" and only 2026 listed, after the 2027 final)
  const H=historyNow(); if(!H.length)return "";
  return `<div class="grouphead">Your seasons</div>`+H.map((h,i)=>({h,i})).reverse().map(({h,i})=>`<div class="yrow ${h.honours&&h.honours.title?'gold':''}">
    <span class="yr">${h.year}</span>${h.grade?`<span class="ygrade">${esc(h.grade)}</span>`:""}
    <div class="ymain"><div class="yrec">${esc(h.team||"")} &middot; ${esc(h.rec||"")}</div>
    <div class="yres">${esc(h.result||"")}</div>${typeof storyRowLine==="function"?storyRowLine(h.story):""}</div>
    ${h.coach&&!h.now&&!noCards?`<button class="ycard" data-card="${i}" title="Season card">&#8599;</button>`:""}</div>`).join("");
}
function firedHistoryHTML(){
  const h=yourSeasonsHTML(true); if(!h)return "";
  return `<details class="firedhist"><summary>Your seasons so far</summary>${h}</details>`;
}
function historyNow(){
  const H=(S.history||[]).slice();
  if(SEA&&SEA.phase==="done"&&S.myTeam&&SEA.rec&&SEA.rec[S.myTeam]&&!H.some(h=>h.year===SEA.year)){
    try{ H.push(Object.assign(seasonEntry(S.myTeam),{now:true})) }catch(e){} }
  return H;
}
function dynastyView(){
  const my=S.myTeam;
  let h=`<div class="dateline"><h2>Dynasty</h2>
    <span>${(()=>{ const n=historyNow().length; return n+" season"+(n===1?"":"s")+" done" })()}${SEA&&SEA.phase!=="done"&&!S.history.some(h=>h.year===SEA.year)&&(SEA.rec[S.myTeam][0]+SEA.rec[S.myTeam][1])>0?" &middot; "+SEA.year+" under way":""}</span></div>`;
  h+=`<div class="subtabs">${[["program","You"],["coaches","Coaches"],["teams","Teams"],
    ["league","History"],["shared","Online"]].map(([k,l])=>
    `<button class="subtab" data-d="${k}" aria-pressed="${dynTab===k}">${l}</button>`).join("")}</div>`;

  if(dynTab==="program"){
    const C=S.career;
    h+=`<div class="idcard careercard">
      <div class="iname">${esc(C.name)}</div>
      <div class="imeta">You &middot; head coach &middot; ${esc(repGrade(C.rep))}</div>
      <div class="stats">
        <div><b>${careerRec(careerNow(C))}</b><span>Career</span></div>
        <div><b>${C.titles}</b><span>Titles</span></div>
        <div><b>${C.confs}</b><span>${confWord()}</span></div>
        <div><b>${C.fired}</b><span>Fired</span></div>
      </div>
      <div class="grouphead" style="padding:14px 0 6px;border:none">Coaching stops</div>
      ${C.stops.map((s,si)=>{ /* the job you're in counts this season too (it read 0-0-0 mid-season: Muse) */
        const cur=si===C.stops.length-1&&s.team===S.myTeam&&SEA&&SEA.rec[s.team]&&!(S.off&&S.off.year===SEA.year);
        // ...and its years run to this one ("Georgia 2026 56-16" over two seasons: Grokbot, three games)
        if(cur)s=Object.assign({},s,{w:s.w+SEA.rec[s.team][0],l:s.l+SEA.rec[s.team][1],d:(s.d||0)+((SEA.drw&&SEA.drw[s.team])||0),to:(SEA.rec[s.team][0]+SEA.rec[s.team][1]+((SEA.drw&&SEA.drw[s.team])||0))>0?SEA.year:s.to});   // only once this season has a game (it read 2026-2027 at 0-0: migrate test)
        return `<div class="stop">
        <span class="dot" style="background:${teamColor(s.team)}"></span>
        <span class="stopteam">${esc(s.team)}</span>
        <span class="stopyr">${s.from}${s.to&&s.to>s.from?"\u2013"+s.to:s.to?"":"\u2013"}</span>
        <span class="stoprec">${careerRec(s,s.team,s.from,s.to)}${s.titles?" \u00b7 "+s.titles+"\u00d7":""}</span>
      </div>`}).join("")}</div>`;
    h+=yourSeasonsHTML();
    h+=filmRoomHTML();
    h+=cabinetHTML();
    h+=teamCard(my);
    h+=`<div class="seedrow"><div class="seedbox seedshow">SEED ${S.seed}</div>
      <span class="seedhint">Anyone starting with this seed gets the identical universe.
      Pick a different team and you live the same seasons from another sideline.</span></div>`;
    return h;
  }

  if(dynTab==="teams"){
    if(dynTeam)return h+`<button class="backbtn" id="dback">&larr; All teams</button>`+teamCard(dynTeam);
    h+=`<div class="seedrow"><input id="dfind" class="seedbox findbox"
      placeholder="Search any of ${NAMES.length} ${LEAGUE.text.orgs}..." value="${esc(dynQ)}"></div>`;
    const ql=dynQ.trim().toLowerCase();
    const list=NAMES.filter(t=>!ql||t.toLowerCase().includes(ql));
    const cur=SEA?SEA.poll.rankMap():{};
    list.sort((x,y)=>(cur[x]||999)-(cur[y]||999));
    if(!list.length)return h+`<div class="note">No team matches that.</div>`;
    h+=`<div class="note">Tap any ${LEAGUE.text.orgs.replace(/s$/,"")} for its roster, schedule and history. You can also
      tap a team name anywhere in the game &mdash; scores, standings, ${LEAGUE.text.ranking}.</div>`;
    h+=`<div class="grouphead">${list.length} ${LEAGUE.text.orgs} &middot; ordered by current ranking</div>`;
    h+=list.map(t=>{
      const A=allTime(t);
      const bits=[esc(LEAGUE.conf.names[CONF[t]])];
      if(A.titles)bits.push(A.titles+" title"+(A.titles>1?"s":""));
      if(A.best)bits.push("best #"+A.best);
      return `<div class="frow tpick" data-t="${esc(t)}">
        <span class="dot" style="background:${teamColor(t)}"></span>
        <div class="fmain"><div class="fname">${esc(t)}${t===my?' <span class="youtag">YOU</span>':''}</div>
        <div class="fnote">${bits.join(" &middot; ")}</div></div>
        <div class="tstat"><span class="trec">${A.rec}</span>
        <span class="trk">${standTag(t,{[t]:A.now})}</span></div></div>`;
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
      h+=`<div class="grouphead">${LEAGUE.awards.mvp} race &mdash; ${SEA.year}, ${LEAGUE.daily?(SEA.step>=LEAGUE.weeks?"the regular season's end":esc(LEAGUE.dates[Math.max(0,SEA.step-1)]||"")):"week "+Math.min(SEA.step,LEAGUE.weeks)}</div>`;   // a game day isn't a week: "WEEK 194" (Grokbot)
      h+=hz.map((x,i)=>`<div class="frow ${x.t===my?'mine':''}">
        <span class="sd">${i+1}</span>
        <span class="dot" style="background:${teamColor(x.t)}"></span>
        <div class="fmain"><div class="fname">${esc(x.n)}</div>
        <div class="fnote">${classTag(x.c)} ${esc(x.p)} &middot; ${esc(x.t)} ${x.rec}</div>
        ${x.line?`<div class="sline2 inrow">${esc(x.line)}</div>`:""}</div>
        <span class="fcfp">${x.r}</span></div>`).join("");
    }
  }
  const hw=S.history.filter(x=>x.awards&&x.awards.mvp.length);
  if(hw.length){
    h+=`<div class="grouphead">${LEAGUE.awards.mvp} winners</div>`;
    h+=hw.slice().reverse().map(x=>{const w=x.awards.mvp[0];
      return `<div class="frow ${w.t===my?'mine':''}">
        <span class="sd">${x.year}</span>
        <span class="dot" style="background:${teamColor(w.t)}"></span>
        <div class="fmain"><div class="fname">${esc(w.n)}</div>
        <div class="fnote">${classTag(w.c)} ${esc(w.p)} &middot; ${esc(w.t)}</div>
        ${w.line?`<div class="sline2 inrow">${esc(w.line)}</div>`:""}</div>
        <span class="fcfp">${w.r}</span></div>`}).join("");
  }
  const lh=S.history.length?S.history[S.history.length-1]:null;
  const ac=lh&&lh.awards?lh.awards.team:null;
  if(ac&&ac.list&&ac.list.length){
    h+=`<div class="grouphead">${esc(LEAGUE.awards.teamLabel(ac.group))} &mdash;
      ${S.history[S.history.length-1].year}</div>`;
    h+=ac.list.map(x=>`<div class="frow ${x.team===my?'mine':''}">
      <span class="sd">${esc(x.pos)}</span>
      <span class="dot" style="background:${teamColor(x.team)}"></span>
      <div class="fmain"><div class="fname">${esc(x.n)}</div>
      <div class="fnote">${classTag(x.c)} &middot; ${esc(x.team)}</div></div>
      <span class="fcfp">${x.r}</span></div>`).join("");
  }
  h+=`<div class="grouphead">${LEAGUE.text.champions}</div>`;
  h+=S.history.slice().reverse().map(x=>{
    const r=x.teams&&x.teams[x.champion];
    return `<div class="yrow ${x.champion===my?'gold':''}"
      style="border-left:3px solid ${teamInk(x.champion)}">
      <span class="yr">${x.year}</span>
      <div class="ymain"><div class="yrec">${esc(x.champion)}</div>
      <div class="yres">${r?histRec(r,x,x.champion):""}${x.groupChamps?" &middot; "+
        (Object.keys(x.groupChamps).find(c=>x.groupChamps[c]===x.champion)
          ?groupChampName(Object.keys(x.groupChamps).find(c=>x.groupChamps[c]===x.champion))
          :"at-large"):""}</div></div></div>`;
  }).join("");
  if(LEAGUE.ui.historyHTML)h+=LEAGUE.ui.historyHTML();   // college basketball: past brackets
  // the latest season with league tables (an old hot-seat entry may lack them)
  const last=S.history.slice().reverse().find(x=>x.top10)||{year:S.history[S.history.length-1].year,top10:[],teams:{}};
  h+=`<div class="grouphead">Final top 10 &mdash; ${last.year}</div>`;
  h+=last.top10.map((t,i)=>{const r=last.teams[t];
    return `<div class="srow ${t===my?'mine':''}"><span class="spos">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${esc(t)}</span>
      <span class="sall">${histRec(r,last,t)}</span></div>`}).join("");
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
    h+=`<div class="note">${LEAGUE.text.orgNote(base)}</div>`;
  }
  return h;
}

/* ============ week compression ============ */
/* Weeks where nothing is on the line shouldn't cost a tap each. */
function weekWeight(w){
  const my=S.myTeam;
  const g=SEA.sched.find(x=>x.week===w&&(x.home===my||x.away===my));
  if(!g)return 0;
  const opp=g.home===my?g.away:g.home;
  if(LEAGUE.rivals.name(my,opp))return 3;
  if(DIGEST_INC&&typeof rivalName==="function"&&U.coach&&U.coach[opp]&&rivalName()&&U.coach[opp].n===rivalName())return 3;   // your rival coach (round 45)
  const rk=SEA.poll.rankMap()[opp];
  if(rk<=(LEAGUE.bigTop||RANK_TOP))return 3;   // a top side: the top 25 in college, the top ten (five over 82 games) in the pros
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
  const from=SEA.step, snap=digestSnap();
  S.plans=S.plans||{};
  while(SEA.step<sk.to&&SEA.phase==="week"){
    S.plans[planKey(SEA.step,SEA.half)]="balanced"; SEA.plan="balanced";
    SEA.advance(); clinchAfter(); S.steps++;
  }
  flash={type:"digest",from:from,to:SEA.step,snap:snap};
  reveal=null; save(); render();
}

/* ---- sim ahead: as far as you like, stopping when something needs you ---- */
let simSheet=false;
/* what you take charge of: a program (college), a team, a club */
const ORG_WORD=(typeof LEAGUE!=="undefined"&&LEAGUE.text&&LEAGUE.text.unit)||"program";
const SIM_STOPS=[["big","A big game is next (a rival, a top side"+(typeof LEAGUE!=="undefined"&&LEAGUE.cup?", a cup tie)":")")],["slide","We lose three in a row"],
  ["hurt","One of our players gets hurt"],["decide","Something needs a decision"]];
/* off until you tick them (Ian: sim ahead should just sim). Saves that never touched them had them
   all on by default; they start off too. */
function simStops(){ if(!S.simStops||!S.simStopsV){ S.simStops={big:false,slide:false,hurt:false,decide:false}; S.simStopsV=2 } return S.simStops }
function myGamesIn(w){ const my=S.myTeam; return SEA.gamesFor?SEA.gamesFor(my,w):SEA.sched.filter(g=>g.week===w&&(g.home===my||g.away===my)) }
/* the step after your nth game from here */
function afterGames(n){ let c=0; for(let w=SEA.step;w<LEAGUE.weeks;w++){ c+=myGamesIn(w).length; if(c>=n)return w+1 } return LEAGUE.weeks }
function simTargets(){
  if(SEA.phase!=="week"||isHotSeat()||(live&&!live.done))return [];
  const out=[{k:"g1",l:"Your next game",to:afterGames(1)}];
  [5,10,20].forEach(n=>{ const t=afterGames(n); if(t<LEAGUE.weeks&&t>out[out.length-1].to)out.push({k:"g"+n,l:`${n} games`,to:t}) });
  const big=nextBigWeek();
  if(big>SEA.step+1&&big<LEAGUE.weeks){ const g=myGamesIn(big)[0]; const opp=g?(g.home===S.myTeam?g.away:g.home):null;
    out.push({k:"big",l:`To the next big game${opp?": "+opp:""}`,to:big}) }
  out.push({k:"end",l:"To the end of the regular season",to:LEAGUE.weeks});
  return out;
}
const SIM_WHY={big:"A big game is next.",slide:"Three defeats in a row: worth a look.",hurt:"One of your players is hurt.",decide:"Something needs a decision."};
function hurtCount(t){ return SEA.talent.active(t).length }
function attnCount(t){ return (attentionHTML(t).match(/class="attn"/g)||[]).length }
/* the decisions on screen, by name (data-fire="oc", data-promo="3") */
function attnKeys(t){ return (attentionHTML(t).match(/data-(fire|promo)="[^"]*"/g)||[]) }
/* a decision sim-ahead hasn't already stopped for this season: one under fire
   comes and goes as the record crosses .500, and stopped every time it came back */
function newDecision(t){
  S.simSeen=S.simSeen||{}; const k=String(SEA.year), seen=S.simSeen[k]=S.simSeen[k]||[];
  Object.keys(S.simSeen).forEach(y=>{ if(y!==k)delete S.simSeen[y] });
  const fresh=attnKeys(t).filter(x=>seen.indexOf(x)<0); fresh.forEach(x=>seen.push(x)); return fresh.length>0;
}
function simRun(to){
  const my=S.myTeam, from=SEA.step, stops=simStops(), snap=digestSnap();
  let why=null;
  S.plans=S.plans||{};
  while(SEA.phase==="week"&&SEA.step<to){
    // before your game: is it one you'd want to play yourself?
    if(SEA.step>from&&stops.big&&(weekWeight(SEA.step)>=3||myGamesIn(SEA.step).some(g=>g.cup||g.title))){why="big";break}
    const h0=hurtCount(my), st0=streakOf(my); if(SEA.step===from)newDecision(my);   // what's on screen now isn't news
    S.plans[planKey(SEA.step,SEA.half)]="balanced"; SEA.plan="balanced";
    SEA.userTeam=my; SEA.featured=(S.featured===undefined?null:S.featured); SEA.deploy=S.deploy||null;
    SEA.advance(); clinchAfter(); S.steps++;
    if(SEA.phase!=="week")break;
    // after it: did something happen you'd want to know about now?
    const st=streakOf(my);
    // once per losing run: when it reaches three, not again at four, five... (it stopped after every defeat: Grokbot)
    if(stops.slide&&st.won===false&&st.n>=3&&!(st0.won===false&&st0.n>=3)){why="slide";break}
    if(stops.hurt&&hurtCount(my)>h0){why="hurt";break}
    if(stops.decide&&newDecision(my)){why="decide";break}
  }
  simSheet=false;
  flash={type:"digest",from:from,to:SEA.step,why:why,snap:snap};
  reveal=null; save(); render();
}
function simSheetHTML(){
  const T=simTargets(), st=simStops();
  return `<div class="simsheet" role="dialog" aria-label="Sim ahead"><div class="simbox">
    <div class="simhead">Sim ahead<button class="closebtn" id="simclose">Close</button></div>
    <div class="simnote">Your games are played by your assistant, as the computer would. You can take over at any point.</div>
    <div class="simgo">${T.map(t=>`<button class="advance simto" data-simto="${t.to}">${esc(t.l)}</button>`).join("")}</div>
    <div class="grouphead" style="border:none;padding-left:0">Stop early if</div>
    ${SIM_STOPS.map(([k,l])=>`<label class="simstop"><input type="checkbox" data-simstop="${k}" ${st[k]?"checked":""}> ${esc(l)}</label>`).join("")}
  </div></div>`;
}

/* the sim digest's incidents (round 45: a run of results said nothing about what happened in them) */
const DIGEST_INC=true;
function digestSnap(){
  const my=S.myTeam; let obj={};
  try{ if(typeof objectivesAll==="function")objectivesAll(my).forEach((o,i)=>{ obj[o.l]=objStatus(o,my).s }) }catch(e){}
  return {pos:(()=>{ try{ return LEAGUE.position?LEAGUE.position(my):standRank(my) }catch(e){ return null } })(), obj:obj};
}
function digestIncidents(){
  const my=S.myTeam, F=flash, out=[];
  // your injuries
  (SEA.talent.log[my]||[]).filter(x=>x.kind==="injury"&&x.who&&x.wk>F.from&&x.wk<=F.to).forEach(x=>
    out.push(`<b>${esc(x.who)}</b> (${esc(x.what)}) got hurt: out ${injSeason(x.weeks)?"for the season":"about "+x.weeks+" "+stepWord(x.weeks)}.`));
  // the games that stood out: the biggest win, the worst defeat, a rival met
  const G=[]; for(let i=F.from;i<Math.min(SEA.weeks.length,F.to+1);i++)(SEA.weeks[i]&&SEA.weeks[i].games||[]).forEach(g=>{ if(g.home===my||g.away===my)G.push(g) });
  const mg=g=>(g.home===my?g.hp-g.ap:g.ap-g.hp), opp=g=>g.home===my?g.away:g.home, sc=g=>g.home===my?`${g.hp}-${g.ap}`:`${g.ap}-${g.hp}`;
  if(G.length>=3){
    const bw=G.filter(g=>g.winner===my).sort((a,b)=>mg(b)-mg(a))[0], bl=G.filter(g=>g.winner&&g.winner!==my).sort((a,b)=>mg(a)-mg(b))[0];
    if(bw)out.push(`Best night: ${sc(bw)} ${haWord(bw,my)} ${esc(opp(bw))}.`);
    if(bl)out.push(`Worst: ${sc(bl)} ${haWord(bl,my)} ${esc(opp(bl))}.`);
  }
  G.filter(g=>LEAGUE.rivals.name(my,opp(g))).forEach(g=>out.push(`${g.winner===my?"Beat":g.winner?"Lost to":"Drew with"} ${esc(opp(g))}, ${sc(g)}: ${esc(LEAGUE.rivals.name(my,opp(g)))}.`));
  // the board's objectives settled along the way
  const was=(F.snap&&F.snap.obj)||{};
  try{ objectivesAll(my).forEach(o=>{ const st=objStatus(o,my).s; if(was[o.l]==="on"&&st!=="on")out.push(st==="met"?`Objective met: ${esc(o.l)}.`:`Objective missed: ${esc(o.l)}.`);
    else if(was[o.l]===undefined&&o.re0!==undefined)out.push(`The board re-aimed: ${esc(o.l)}.`) }) }catch(e){}
  if(typeof clinchDigest==="function")out.unshift(...clinchDigest(my,F.from,F.to));   // soccer: a title, promotion or relegation settled
  // the run you're on, and the table
  const st=streakOf(my); if(st.n>=3)out.push(st.won?`On a ${st.n}-game winning run.`:`${st.n} defeats in a row.`);
  const p0=F.snap&&F.snap.pos, p1=(()=>{ try{ return LEAGUE.position?LEAGUE.position(my):standRank(my) }catch(e){ return null } })();
  if(p0&&p1&&p0!==p1)out.push(`${p1<p0?"Up":"Down"} from ${ordinal(p0)} to ${ordinal(p1)} in ${esc(typeof divThe==="function"?divThe(CONF[my]):LEAGUE.conf.names[CONF[my]]||"the group")}.`);
  return out.length?`<div class="dinc"><div class="dinch">What happened</div>${out.slice(0,8).map(x=>`<div class="dincl">${x}</div>`).join("")}</div>`:"";
}
function digestBlock(){
  const my=S.myTeam;
  const rows=[]; let n=0;
  // through the last week with games played: a cup week stopped between its two halves has its league
  // game played already (the digest left it out: Grokbot, soccer)
  const last=Math.min(SEA.weeks.length,flash.to+1)-1;
  for(let i=flash.from;i<=last;i++){
    const W=SEA.weeks[i]; if(!W)continue;
    const gs=W.games.filter(x=>x.home===my||x.away===my).sort((x,y)=>(x.cup?1:0)-(y.cup?1:0));
    if(!gs.length){ if(!LEAGUE.skipIdle&&!LEAGUE.daily)rows.push(`<div class="drow"><span class="dwk">${W.label}</span>
      <span class="dres bye">Bye</span></div>`);continue}
    gs.forEach(g=>{ n++;
    const won=g.winner===my, opp=g.home===my?g.away:g.home;
    const ms=g.home===my?g.hp:g.ap, os=g.home===my?g.ap:g.hp;
    const gl=LEAGUE.myGameLabel?LEAGUE.myGameLabel(SEA.weeks.slice(0,i+1).reduce((c,w2)=>c+w2.games.filter(x=>!x.cup&&(x.home===my||x.away===my)).length,0)):W.label;
    rows.push(`<div class="drow"><span class="dwk">${g.cup?"Cup":gl}</span>
      <span class="dres ${won?'w':g.draw||g.ot?'o':'l'}">${won?"W":g.draw?"D":g.ot?"OTL":"L"} ${ms}-${os}${g.pens?" p":g.ot?(g.so?" SO":" OT"):""}</span>
      <span class="dopp">${haWord(g,my)} ${esc(opp)}</span></div>`) });
  }
  let h=`<div class="banner"><div class="bkick">${LEAGUE.skipIdle||LEAGUE.daily?n+" game"+(n===1?"":"s"):last<=flash.from?"Week "+(flash.from+1):"Weeks "+(flash.from+1)+"&ndash;"+(last+1)} simulated</div>`;
  if(flash.why)h+=`<div class="simwhy">Stopped: ${esc(SIM_WHY[flash.why]||"")}</div>`;
  if(flash.snap&&DIGEST_INC)h+=digestIncidents();   // first: after a long sim it sat under thirty rows of results
  h+=`<div class="digest">${rows.join("")}</div>`;
  const rk=SEA.poll.rankMap();
  h+=`<div class="bsub">Now ${recStr(my)}${
    LEAGUE.position?(LEAGUE.position(my)?", "+ordinal(LEAGUE.position(my))+" in "+esc(LEAGUE.conf.names[CONF[my]]):"")
      :(LEAGUE.rankAll||rk[my]<=RANK_TOP)?", ranked No. "+rk[my]:", unranked"}.</div></div>`;   // as the header says it (it read "unranked" beside #11: Grokbot)
  return h;
}


/* ============ shell ============ */
const TABS=[["team","Team"],["scores","Scores"],["poll",LEAGUE.ui.rankingTab],
            ["stand","Standings"],["dyn","Dynasty"]];

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
    <div class="handrec">${recStr(S.myTeam)}${
      SEA.poll.rankMap()[S.myTeam]?" &middot; No. "+SEA.poll.rankMap()[S.myTeam]:""}</div>
    <div class="handnote">${handoffNotes[S.myTeam]
      ?`You play ${esc(handoffNotes[S.myTeam].vs)} ${LEAGUE.text.week?"tonight":"this week"}. ${esc(handoffNotes[S.myTeam].coach)} has set their plan; the game is played now, and each of you makes your own calls.`
      :"The others have played their week. Your turn."}</div>
    <div class="actionbar"><button class="advance" id="hgo">I'm ready</button></div>
  </div>`;
}

/* ---- leaving for the title screen ---- */
/* The square saves first, then asks. The prompt says plainly whether the
   save landed, so nobody walks away from a career they can't get back. */
let quitAsk=false;
function quitPrompt(){
  const safe=saveOK===true;
  return `<div class="banner quitask" role="alertdialog" aria-labelledby="qtitle">
    <div class="btitle" id="qtitle">${safe?"Leave for the title screen?":"Your progress isn't saved"}</div>
    <div class="bsub">${safe
      ?`Everything is saved in slot ${slot}. Pick it on the title screen to carry on where you left off.`
      :`This browser isn't letting the game save${store.kind()==="none"?" (storage is blocked, often by private browsing)":""}. If you leave now, this career is lost.`}</div>
    <div class="lgbtns"><button class="advance gold" id="quitgo">${safe?"Go to the title screen":"Leave anyway"}</button>
      <button class="skip" id="quitno">Keep playing</button></div></div>`;
}

function render(){
  if(handoff&&S.myTeam){
    el("app").innerHTML=handoffView();
    const b=el("hgo"); if(b)b.onclick=()=>{handoff=false;delete handoffNotes[S.myTeam];render()};
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
  { const old=document.getElementById("tocall"); if(old&&old.remove)old.remove() }
  if(live&&S.myTeam&&!live.done){
    // a highlight still playing: the page as it stood before its stretch (round 66)
    const Hd=live.hold&&!live.ask?live.hold:null, sv=Hd?[live.drives,live.eng.h,live.eng.a]:null;
    if(Hd){ live.drives=sv[0].slice(0,Hd.n); live.eng.h=Hd.h; live.eng.a=Hd.a }
    try{
    el("app").innerHTML=live.ask?liveCallView().replace('<div class="callbox">',guideForCall(live.ask.dp)+(typeof filmMemoryHTML==="function"?filmMemoryHTML(live.ask.dp):"")+'<div class="callbox">'):autoNoteIn(liveView()).replace('<div class="actionbar">',livePlanBarHTML()+'<div class="actionbar">');
    }finally{ if(sv){ live.drives=sv[0]; live.eng.h=sv[1]; live.eng.a=sv[2] } }
    bindGuide();
    if(typeof hlMount==="function")hlMount();
    if(live.ask){
      // a call ignores taps for 0.7 s after it appears: at Very fast the 25' call came up under a tap meant for the
      // game, took it as an answer, and graded a call the player never made (Grokbot, soccer: five matches)
      document.querySelectorAll("[data-call]").forEach(b=>b.onclick=()=>{ if(live&&live.ask&&Date.now()-(live.ask.at||0)<700)return; answerLive(b.dataset.call) });
      // on a phone the answers can sit below the evidence: a pinned button says how many and jumps to them,
      // and goes once they're on screen (Grokbot: decision buttons below the fold at 390px)
      const co=document.querySelector(".callopts");
      if(co&&typeof IntersectionObserver!=="undefined"){ const n=co.querySelectorAll("[data-call]").length;
        const j=document.createElement("button"); j.id="tocall"; j.className="tocall"; j.textContent=`Your ${n} options \u2193`;
        j.onclick=()=>co.scrollIntoView({behavior:"smooth",block:"center"}); document.body.appendChild(j);
        const io=new IntersectionObserver(es=>{ es.forEach(e=>{ j.style.display=e.isIntersecting?"none":"" }) },{threshold:0.2}); io.observe(co); }
    }else{
      // the game redraws several times a second at Very fast, so a tap's press and release can land on two
      // different buttons and the click never fires: these act on the press (Grokbot: Normal didn't switch it off)
      // the press redraws the screen, so the click that follows lands on a new button: the time of the press is kept
      // by the button's name, not on the button, or a tap pauses and the click unpauses (round 61: pause did nothing on a phone)
      const onPress=(b,fn)=>{ if(!b)return; const k=b.id||("sp"+(b.dataset.speed||""));
        b.onpointerdown=e=>{ if(e.button>0)return; PRESS_AT[k]=Date.now(); fn() }; b.onclick=()=>{ if(Date.now()-(PRESS_AT[k]||0)>600)fn() } };
      onPress(el("wpause"),()=>{live.paused=!live.paused;S.watchStep=live.paused;save();
        if(live.paused){ if(live.timer){clearTimeout(live.timer);live.timer=null} render() }else liveTick()});   // pausing stops on the play shown; it used to play one more first
      onPress(el("wstep"),()=>{live.paused=true;S.watchStep=true;liveTick()});
      onPress(el("wskip"),()=>skipLive());
      document.querySelectorAll("[data-midplan]").forEach(x=>onPress(x,()=>setPlanMidGame(x.dataset.midplan)));
      document.querySelectorAll("[data-hlm]").forEach(x=>onPress(x,()=>{ S.highlights=x.dataset.hlm; save(); render(); if(typeof hlMount==="function")hlMount() }));
      document.querySelectorAll("[data-speed]").forEach(x=>onPress(x,()=>{
        S.watchSpeed=x.dataset.speed;save();render()}));
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
  if(introAt!==null){renderIntro();return}
  if(S.title){
    if(!S._slots){allSlots().then(v=>{S._slots=v;render()});
      el("app").innerHTML=`<div class="titlewrap">${LOGO}
        <div class="kicker wm-league">${esc(LEAGUE.text.eyebrow||"")}</div><h1 class="wordmark${SPORT.word.length>8?" wm-long":""}"><span class="wm-a">${esc(SPORT.word)}</span><br>
        <span class="wm-b">Coach</span></h1></div>`;return}
    renderTitle();return}
  if(!S.myTeam&&S.setup&&!S.setup.ready){renderSetup();return}
  if(!S.myTeam){renderStart();return}
  if(S.help){
    el("app").innerHTML=`<div class="stick"><div class="topbar">
      <div class="tb-left"><span class="tb-yr">${SEA.year}</span>
      <span class="tb-team${S.myTeam.length>13?" tb-long tb-xl":S.myTeam.length>9?" tb-long":""}" style="color:${teamInk(S.myTeam)}">${esc(S.myTeam)}</span></div>
      </div></div>${helpPanel()}`;
    const c=el("hclose"); if(c)c.onclick=()=>{S.help=false;render()};
    document.querySelectorAll("[data-watch]").forEach(b=>b.onclick=()=>{
      S.watchMode=b.dataset.watch; save(); render();});
    document.querySelectorAll("[data-advice]").forEach(b=>b.onclick=()=>{ S.advice=b.dataset.advice; save(); render() });
    const bk=el("backupbtn"); if(bk)bk.onclick=()=>{ save(); downloadBackup() };
    const rf2=el("restorefile2"); if(rf2)rf2.onchange=async()=>{ const f=rf2.files&&rf2.files[0]; if(!f)return;
      if(!confirm("Replace the career you're playing with this backup?"))return;
      await restoreBackup(f,slot) };
    document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{
      S.watchSpeed=b.dataset.speed; save(); render();});
    document.querySelectorAll("[data-guide]").forEach(b=>b.onclick=()=>{ S.guide=b.dataset.guide==="true"; if(S.guide){ Object.keys(S.seen||{}).forEach(k=>{ if(k.indexOf("g_")===0)delete S.seen[k] }); GUIDE_SEEN={}; guideMark(null,false) } save(); render() });
    document.querySelectorAll("[data-hl]").forEach(b=>b.onclick=()=>{ if(!S)return; S.highlights=b.dataset.hl; save(); render() });
    document.querySelectorAll("[data-livewp]").forEach(b=>b.onclick=()=>{ if(!S)return; S.liveWP=b.dataset.livewp==="true"; save(); render() });
    document.querySelectorAll("[data-music]").forEach(b=>b.onclick=()=>{ S.music=b.dataset.music==="true"; if(S.music&&!soundOn())S.sound=true; save(); if(musicOn())musicStart(); else musicStop(); render() });
    document.querySelectorAll("[data-sound]").forEach(b=>b.onclick=()=>{
      S.sound=b.dataset.sound==="true"; save(); if(soundOn())sfx("tap"); render();});
    return;
  }
  if(S.retired){
    const C=S.career;
    el("app").innerHTML=`<header class="mast">
      <div class="kicker">Career complete</div>
      <h1>${esc(C.name)}</h1>
      <p>${careerRec(C)} across ${C.stops.length} ${ORG_WORD}${C.stops.length===1?"":"s"},
      ${C.titles} national title${C.titles===1?"":"s"}, ${C.confs} conference title${C.confs===1?"":"s"}.
      ${C.fired?`Fired ${C.fired} time${C.fired===1?"":"s"} along the way.`:"Never fired."}</p></header>
      <div class="grouphead">Coaching stops</div>
      ${C.stops.map(s=>`<div class="stop" style="padding:10px 16px">
        <span class="dot" style="background:${teamColor(s.team)}"></span>
        <span class="stopteam">${esc(s.team)}</span>
        <span class="stopyr">${s.from}\u2013${s.to||s.from}</span>
        <span class="stoprec">${careerRec(s,s.team,s.from,s.to||s.from)}</span></div>`).join("")}
      <div class="actionbar"><button class="advance gold" id="reset2">New career</button></div>`;
    const r=el("reset2"); if(r)r.onclick=async()=>{
      try{await store.delete(KEYFOR(slot))}catch(e){} await bumpRev(slot); saveRev=null;
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
          <span class="tb-team${my.length>13?" tb-long tb-xl":my.length>9?" tb-long":""}" style="color:${teamInk(my)}">${esc(my)}</span></div>
        <div class="tb-right">${recFmt(my,liveRec(my))}
          ${reveal==="half"?"":(LEAGUE.position||LEAGUE.rankAll||rk[my]<=RANK_TOP?`<span class="tb-rk">${standTag(my,rk)}</span>`:"")}
          <button class="reset ${soundOn()?'':'off'}" id="snd" title="Sound ${soundOn()?'on':'off'}">&#9834;</button><button class="reset ${musicOn()?'':'off'}" id="mus" title="Music ${musicOn()?'on':'off'}">&#9835;</button>
          <button class="reset" id="ttl" title="Title screen">&#9632;</button>
          <button class="reset" id="hlp" title="How it works">?</button>
          <button class="reset" id="rst" title="Start over">&#8635;</button></div>
      </div>${quitAsk?quitPrompt():""}
      ${inOff?"":`<div class="tabs">${TABS.map(([k,l])=>
        `<button class="tab" data-v="${k}" aria-selected="${view===k}">${l}</button>`).join("")}</div>`}
    </div>
    ${inOff?"":`<div class="hint">Space or Enter advances &middot; keys 1&ndash;5 switch views</div>`}
    <div class="cols">
    ${wide&&!inOff?`<aside id="side">${teamPanel()}
      <div class="sidebtn"><button class="advance ${done?'gold':''}" id="adv2">${
        advLabel()}</button>${simGameButton("simone2")}${simTargets().length>1?`<button class="skip" id="skip2">Sim ahead&hellip;</button>`:""}
      </div></aside>`:""}
    <main id="view">${staleTabHTML()}${(checkAchievements(),achToastHTML())}${inOff?backupNagHTML()+LEAGUE.ui.offseasonScreen():
      (flash&&flash.type==="offseason"?LEAGUE.ui.offseasonBanner():
       flash&&flash.type==="digest"?digestBlock():"")+
      (playerSel?playerView():view==="team"?myTeamView():view==="scores"?scoresView():
       view==="poll"?LEAGUE.ui.rankingView():view==="stand"?standingsView():dynastyView())}</main>
    </div>
    <div class="actionbar${wide&&!inOff?" hideWide":""}">
      ${simTargets().length>1&&!(live&&!live.done)?`<button class="skip" id="skip">Sim ahead&hellip;</button>`:""}
      ${(()=>{ if(inOff||done||(S.watchMode||"all")==="never"||prefersReduced()||(live&&!live.done))return "";
        const ug=SEA.phase==="week"?SEA.nextGame(S.myTeam):SEA.postMatchup(S.myTeam);
        return ug?`<button class="skip" id="simone">Sim game</button>`:""})()}
      <button class="advance ${done||inOff?'gold':''}" id="adv" ${
        inOff&&!(S.off.dn&&dnOn())&&((S.off.act.userOpen&&S.off.move===null)||LEAGUE.ui.offseasonBlock()!==null)?'disabled':''}>${
        inOff&&S.off.dn&&dnOn()?"Back to the offseason":inOff?(S.off.act.userOpen&&S.off.move===null?"Pick your next job above"
              :LEAGUE.ui.offseasonBlock()!==null?LEAGUE.ui.offseasonBlock():
              S.off.move==="retire"?"Retire"
              :S.off.move&&S.off.move!==S.myTeam?"Take the "+S.off.move+" job"
              :"Begin "+(SEA.year+1)+" season"):advLabel()}</button>
    </div>`;
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{view=t.dataset.v;flash=null;playerSel=null;render()});
  // round 69: players' pages, the leaders
  document.querySelectorAll("[data-player]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); const k=x.dataset.player.split("|"); openPlayer(k[0],k.slice(1).join("|")) });
  document.querySelectorAll("[data-plback]").forEach(x=>x.onclick=()=>{ playerSel=null; render() });
  document.querySelectorAll("[data-sttab]").forEach(x=>x.onclick=()=>{ standTab=x.dataset.sttab; render() });
  document.querySelectorAll("[data-lead]").forEach(x=>x.onclick=()=>{ leadCat=+x.dataset.lead; render() });
  document.querySelectorAll(".subtab").forEach(b=>b.onclick=()=>{
    if(b.dataset.d){dynTab=b.dataset.d; dynTeam=null; dynCoach=null}
    else if(b.dataset.grp){grpTab=b.dataset.grp}
    else if(b.dataset.m){teamTab=b.dataset.m}
    else if(b.dataset.sttab){standTab=b.dataset.sttab}   // round 69
    else if(b.dataset.lead!=null){leadCat=+b.dataset.lead}
    else LEAGUE.ui.subtab(b);
    render()});
  document.querySelectorAll(".tpick").forEach(b=>b.onclick=()=>{dynTeam=b.dataset.t;render()});
  // "See the draw": the cup page (soccer), from wherever it's offered
  document.querySelectorAll("[data-cupview]").forEach(b=>b.onclick=(ev)=>{ ev.stopPropagation();
    view="poll"; LEAGUE.ui.subtab({dataset:{et:"CUP"}}); flash=null; window.scrollTo({top:0}); render() });
  const db=el("dback"); if(db)db.onclick=()=>{dynTeam=null;render()};
  document.querySelectorAll("[data-coach]").forEach(b=>b.onclick=()=>{
    dynCoach=b.dataset.coach; save(); render();});
  const cb=el("cback"); if(cb)cb.onclick=()=>{dynCoach=null;render()};
  const scf=el("stconf"); if(scf)scf.onchange=()=>{stConf=scf.value||null; render()};
  const sg=el("stalego"); if(sg)sg.onclick=()=>{ try{location.reload()}catch(e){} };
  const sfb=el("savefailbk"); if(sfb)sfb.onclick=()=>downloadBackup();
  const obk=el("offbk"); if(obk)obk.onclick=()=>{ save(); downloadBackup(); S.backedUp=SEA.year; save(); render() };
  const obn=el("offbkno"); if(obn)obn.onclick=()=>{ S.backedUp=SEA.year; save(); render() };
  const cf=el("cfind"); if(cf)cf.oninput=()=>{coachQ=cf.value;
    const p=cf.selectionStart; render();
    const n=el("cfind"); if(n){n.focus();n.setSelectionRange(p,p)}};
  const lp=el("lgpost"); if(lp)lp.onclick=()=>{postSeason()};
  const ll=el("lgload"); if(ll)ll.onclick=()=>{leagueMsg="";loadLeague()};
  const df=el("dfind"); if(df)df.oninput=()=>{dynQ=df.value;
    const p=df.selectionStart; render();
    const n=el("dfind"); if(n){n.focus();n.setSelectionRange(p,p)}};
  document.querySelectorAll(".planbtn").forEach(b=>b.onclick=()=>{plan=b.dataset.plan; if(!isHotSeat()){S.planNow=plan; save()} render()});
  // (the bottom bar's Sim ahead button is bound with skip2, above)
  // it asks, and says where the career is saved, or that it isn't (storage blocked: leaving loses it)
  const tb2=el("ttl"); if(tb2)tb2.onclick=async()=>{await save();quitAsk=true;render()};
  const sn=el("snd"); if(sn)sn.onclick=()=>{S.sound=!soundOn(); save(); if(soundOn()){sfx("tap"); if(musicOn())musicStart()} else musicStop(); render()};
  const mu=el("mus"); if(mu)mu.onclick=()=>{S.music=!musicOn(); if(S.music&&!soundOn())S.sound=true; save(); if(musicOn())musicStart(); else musicStop(); render()};
  celebrateIfDue();
  const qg=el("quitgo"); if(qg)qg.onclick=async()=>{quitAsk=false;S.title=true;S._slots=await allSlots();render()};
  const qn=el("quitno"); if(qn)qn.onclick=()=>{quitAsk=false;render()};
  const hb=el("hlp"); if(hb)hb.onclick=()=>{S.help=true;render();try{window.scrollTo(0,0)}catch(e){}};   // the glossary opened at the old scroll position (Grokbot)
  const rb=el("rst"); if(rb)rb.onclick=()=>tapTwice(rb,"Tap again to abandon this career",async()=>{
    {
      try{await store.delete(KEYFOR(slot))}catch(e){} await bumpRev(slot); saveRev=null;
      // back to the title screen, where the empty slot starts a career properly
      // (it went straight to the team picker with no setup, and picking a team
      // threw: every game needed a reload; Muse saw it in hockey)
      S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,title:true};
      U=null;SEA=null;flash=null;live=null;render();}});
  const advance=()=>{
    if(S.off&&S.off.dn&&dnOn()){S.off.dn=false;save();render();window.scrollTo({top:0});return}
    if(S.off){commitOffseason();window.scrollTo({top:0});return}
    if(SEA.phase!=="week"&&view==="team"&&!wide)view="scores";
    doAdvance();
    if(!wide)window.scrollTo({top:0,behavior:"auto"});
  };
  const a2=el("adv2"); if(a2)a2.onclick=advance;
  ["skip","skip2"].forEach(id=>{ const b=el(id); if(b)b.onclick=()=>{simSheet=true;render()} });
  if(simSheet){
    el("app").insertAdjacentHTML&&el("app").insertAdjacentHTML("beforeend",simSheetHTML());
    const c=el("simclose"); if(c)c.onclick=()=>{simSheet=false;render()};
    document.querySelectorAll("[data-simto]").forEach(b=>b.onclick=()=>{simRun(+b.dataset.simto); window.scrollTo({top:0,behavior:"auto"})});
    document.querySelectorAll("[data-simstop]").forEach(b=>b.onchange=()=>{simStops()[b.dataset.simstop]=b.checked; save()});
  }
  // a tap that was meant for the game screen's controls lands here when the game ends under the finger:
  // the bar's buttons wait a moment after a game (Grokbot: one tap simmed a week on a phone)
  const settling=()=>Date.now()-(liveEndedAt||0)<700;
  ["simone","simone2"].forEach(id=>{ if(el(id))el(id).onclick=()=>{ if(settling())return;
    if(SEA.phase!=="week"&&view==="team")view="scores";
    simAdvance(); window.scrollTo({top:0,behavior:"auto"});
  }});
  if(false)el("simone").onclick=()=>{
    if(SEA.phase!=="week"&&view==="team")view="scores";
    simAdvance(); window.scrollTo({top:0,behavior:"auto"});
  };
  el("adv").onclick=()=>{ if(settling())return;
    if(S.off&&S.off.dn&&dnOn()){S.off.dn=false;save();render();window.scrollTo({top:0});return}
    if(S.off){commitOffseason();window.scrollTo({top:0});return}
    if(SEA.phase!=="week"&&view==="team")view="scores";
    doAdvance();
    window.scrollTo({top:0,behavior:"auto"});
  };
  document.querySelectorAll("[data-team]").forEach(b=>b.onclick=(ev)=>{
    ev.stopPropagation(); openTeam(b.dataset.team);});
  if(typeof bindLines==="function")bindLines();
  document.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>{
    S.seen=S.seen||{}; S.seen[b.dataset.mark]=1; save(); render();});
  bindGuide();
  document.querySelectorAll("[data-fire]").forEach(b=>b.onclick=()=>
    tapTwice(b,"Tap again to confirm",()=>fireCoord(b.dataset.fire)));
  document.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{
    const h=S.history[+b.dataset.card]; if(h){cardFor=h;cardMsg="";render()}});
  document.querySelectorAll("[data-coord]").forEach(b=>b.onclick=()=>{
    S.off.picks[b.dataset.coord]=+b.dataset.ci; save(); render();});
  LEAGUE.ui.bindOffseason();
  document.querySelectorAll("[data-staffplan]").forEach(b=>b.onclick=()=>{ if(S.off&&typeof staffPlanReset==="function"){staffPlanReset(); save(); render()} });
  document.querySelectorAll("[data-wk]").forEach(b=>b.onclick=()=>{ const v=+b.dataset.wk;
    scoreWk=(v===SEA.weeks.length-1)?null:v; if(view!=="scores")view="scores"; render() });
  const rw=document.querySelector("[data-rewatch]");
  if(rw)rw.onclick=()=>{const g=heroGame(); if(g)startWatch(g)};
  document.querySelectorAll("[data-promo]").forEach(b=>b.onclick=(ev)=>{
    ev.stopPropagation(); promote(+b.dataset.promo);});
  document.querySelectorAll("[data-facheap]").forEach(b=>b.onclick=()=>{ S.faCheap=!S.faCheap; save(); render() });   // hockey's market, cheapest first (round 48)
  document.querySelectorAll("[data-feat]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.feat;
    const was=S.featured; S.featured=(S.featured===i?null:i);
    noteChoice("f",was,S.featured);
    if(SEA)SEA.featured=S.featured;
    save(); render();});
  document.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{
    const was=S.off.move; S.off.move=(b.dataset.job===S.myTeam?null:b.dataset.job); if(S.off.move!==was&&typeof dnReset==="function")dnReset(); save();render()});
  document.querySelectorAll("[data-phil]").forEach(b=>b.onclick=()=>{
    S.off.picks.phil=b.dataset.phil;save();render()});
}

const TIERS=LEAGUE.text.tiers;
function classTag(c){return LEAGUE.classTag?LEAGUE.classTag(c):LEAGUE.classes[c]}
function tierOf(rank){return TIERS.find(t=>rank<=t.max)}

/* The owl, drawn from the real one: cream face, rust feathering round the eyes,
   yellow rings, yellow beak and feet. */
function owlSVG(cls,withPost){
  return `<svg class="${cls||'owl'}" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
    ${withPost?SPORT.perch:""}
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
      ${(LEAGUE.art&&LEAGUE.art.owlExtra)||""}
      <!-- feet gripping the bar -->
      <path d="M30.5 50.2 v3 M41.5 50.2 v3" stroke="#F2C14E" stroke-width="2.8"
        stroke-linecap="round" fill="none"/>
      <path d="M28.2 53.2 h4.6 M39.2 53.2 h4.6" stroke="#F2C14E" stroke-width="2.4"
        stroke-linecap="round" fill="none"/>
    </g>
  </svg>`;
}
const LOGO=owlSVG("logo",true);

const INTRO=LEAGUE.text.intro, GLOSSARY=LEAGUE.text.glossary;

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
        const ti=LEAGUE.tierFor?LEAGUE.tierFor(t,PRE_RANK):tierOf(PRE_RANK[t]);   // soccer: by division, not by rating
        const gone=(S.picking||[]).some(x=>x.team===t);
        return `<button class="pick ${gone?"taken":""}" data-t="${esc(t)}"
          ${gone?"disabled":""} title="${esc(ti.l)}">
          <span class="dot" style="background:${teamColor(t)}"></span>
          <span class="pn">${esc(t)}<em class="ptier ${ti.c}">${esc(ti.l)}</em></span>
          <span class="pr">${PRE_RANK[t]}</span></button>`}).join("")}</div></div>`;
    }).join("")||`<div class="note">No team matches that.</div>`;
}

function bindPicks(){
  // tap a team to choose it, then the bar's one button starts (or tap it again): "Tap again to start" wrapped a word to
  // a line on a phone card, and a single tap seemed to do nothing (Grokbot)
  const start=b=>{
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
  };
  document.querySelectorAll(".pick").forEach(b=>b.onclick=()=>{
    if(b.classList.contains("sel")){ start(b); return }
    document.querySelectorAll(".pick.sel").forEach(x=>x.classList.remove("sel")); b.classList.add("sel");
    const app=el("app")||document.body; let bar=document.getElementById("pickbar");
    if(!bar){ bar=document.createElement("div"); bar.id="pickbar"; app.appendChild(bar) }
    const want=(S.setup&&S.setup.coaches)||1, who=want>1?`Coach ${((S.picking||[]).length+1)}: `:"";
    bar.innerHTML=`<button class="advance gold" id="pickgo">${who}Start with ${esc(b.dataset.t)}</button>`;
    el("pickgo").onclick=()=>start(b);
  });
}
/* the last result card, when a career is opened: it lived only in memory, so a reload lost it
   (Grokbot: the FINAL card disappears after any reload) */
function resumeFlash(){
  if(!SEA||S.off||!S.myTeam||SEA.phase==="done")return null;
  const st=SEA.step-1; if(st<0)return null;
  const W=SEA.weeks[st], my=S.myTeam;
  if(st<LEAGUE.weeks)return W&&W.games.some(g=>g.home===my||g.away===my)?{type:"week",step:st}:null;
  return SEA.postGamesFor(my).length?{type:"post"}:null;
}
/* back to the title screen with nothing open */
function toTitle(){ introAt=null; S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,title:true}; saveRev=null; render() }

function owlMark(size){
  return `<span class="owlmark" style="width:${size}px;height:${size}px">${owlSVG("owlmini",false)}</span>`;
}

const OWL_LINE="Baby Owl genius "+SPORT.word.toLowerCase()+" coach!";

/* a first job, three ways: a favourite, a contender, a rebuild. The
   contender is the quick start: good enough to win, not so good that
   anything less is failure. */
function firstJobs(){
  const order=NAMES.slice().sort((a,b)=>PRE_RANK[a]-PRE_RANK[b]), N=order.length;
  const at=f=>order[Math.min(N-1,Math.floor(N*f))];
  const r=Math.random();
  return [
    {k:"fav",  t:at(0.02+0.04*r), l:"The favourite", d:"Expected to win. The pressure starts on day one."},
    {k:"cont", t:at(0.18+0.12*r), l:"The contender", d:"A good side with a real chance. The best first job."},
    {k:"build",t:at(0.55+0.15*r), l:"The rebuild",   d:"Patience, and a hero if you pull it off."}
  ];
}
let firstJobPicks=null;
function quickStart(slotN){
  slot=slotN; saveRev=null; staleTab=false;                // a new career here: its first save sets the revision
  const J=(firstJobPicks||firstJobs())[1];
  S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,title:false,introDone:true,
     setup:{name:"",seed:Math.floor(Math.random()*899999+100000),ready:true}};
  newDynasty(J.t,S.setup.seed>>>0,"");
}

/* on an empty or unreadable slot: the copy taken when that career was last opened */
function copyHTML(s){
  if(!s.copy)return "";
  const d=new Date(s.copy.at), when=isNaN(d)?"":` (opened ${d.toLocaleDateString(undefined,{month:"short",day:"numeric"})})`;
  return `<button class="introskip wide copyback" data-copyback="${s.n}">Bring back ${esc(s.copy.team)}, ${esc(s.copy.coach)}'s career${when}</button>`;
}
function renderTitle(){
  const slots=S._slots||[];
  el("app").innerHTML=`${newerHTML()}<div class="titlewrap">
    <div class="owlstage">
      <div class="logowrap" id="owltap">${LOGO}</div>
      ${owlTaps>=5?`<div class="bubble"><span>${esc(OWL_LINE)}</span></div>`:""}
    </div>
    <div class="kicker wm-league">${esc(LEAGUE.text.eyebrow||"")}</div><h1 class="wordmark${SPORT.word.length>8?" wm-long":""}"><span class="wm-a">${esc(SPORT.word)}</span><br><span class="wm-b">Coach</span></h1>
    <div class="tagline">${esc(LEAGUE.text.tagline||"Build a program. Win it all.")}</div>
    ${(()=>{ const free=slots.find(x=>x.empty); if(!free||slots.some(x=>!x.empty))return "";
      firstJobPicks=firstJobPicks||firstJobs(); const J=firstJobPicks[1];
      return `<button class="advance quickstart" id="qstart" data-qs="${free.n}">Quick start<small>${esc(J.t)} &middot; ${esc(J.d)}</small></button>` })()}
    <div class="slots">${slots.map(s=>s.broken
      ? `<div class="slotwrap"><div class="slot broken"><span class="slotn">Slot ${s.n}</span>
           <span class="slotmain">This save won't open</span>
           <span class="slotsub">${s.broken==="damaged"?"The saved data is damaged.":"It holds "+esc(s.broken)+"."} It's kept as it is: nothing will write over it unless you erase it.</span></div>
           <button class="slotdel" data-del="${s.n}" aria-label="Erase the save in slot ${s.n}">Erase</button></div>${copyHTML(s)}`
      : s.empty
      ? `<button class="slot empty" data-slot="${s.n}">
           <span class="slotn">Slot ${s.n}</span>
           <span class="slotmain">Empty &mdash; start a career</span></button>${copyHTML(s)}`
      : `<div class="slotwrap"><button class="slot" data-slot="${s.n}">
           <span class="slotn">Slot ${s.n}</span>
           <span class="slotmain" style="color:${teamInk(s.team)}">${esc(s.team)}</span>
           <span class="slotsub">${esc(s.coach)} &middot; ${s.now?`${s.now.year} ${s.now.done?"finished":"so far"}: ${esc(s.now.rec)}`:""}${s.now&&!s.seasons?"":`${s.now?" &middot; ":""}${s.seasons}
             ${s.now?"earlier ":""}season${s.seasons===1?"":"s"}${s.now?"":" done"}${s.seasons?` (${s.rec})`:""}`}${s.titles?" &middot; "+s.titles+"\u00d7 champion":""}</span>
           </button>${replaceAsk
             ?`<button class="slotdel repl" data-repl="${s.n}" aria-label="Replace the career in slot ${s.n} with a new one">Replace</button>`
             :`<button class="slotdel" data-del="${s.n}" aria-label="Erase the career in slot ${s.n}">Erase</button>`}</div>`).join("")}</div>
    ${(()=>{ if(!slots.length||slots.some(x=>x.empty||x.broken))return "";
      // every slot full: a way into a new career (Muse: no entry point at all, short of erasing first)
      return replaceAsk
        ? `<div class="note">Pick the career to replace. Replacing erases it: to keep it, open it and save a backup file first.</div>
           <button class="introskip wide" id="tnewx">Cancel</button>`
        : `<button class="introskip wide" id="tnew">Start a new career</button>` })()}
    <button class="introskip wide" id="thow">How to play</button>
    <div class="buildid">Build ${typeof BUILD_ID!=="undefined"?BUILD_ID:"dev"}</div>
    <label class="introskip wide restorelbl">Restore a career from a backup file<input type="file" id="restorefile" accept=".coach,.txt,text/plain" hidden></label>
  </div>`;
  // Erase is its own button beside the slot (it was text inside the slot's button: anything that
  // pressed "Erase" as a control, a keyboard, a screen reader, a test agent, pressed the slot and loaded the career)
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=(ev)=>{ ev.stopPropagation();
    tapTwice(b,"Tap again to erase",async()=>{
      try{await store.delete(KEYFOR(+b.dataset.del))}catch(e){} await bumpRev(+b.dataset.del);
      S._slots=await allSlots(); render() }) });
  const tn=el("tnew"); if(tn)tn.onclick=()=>{ replaceAsk=true; render() };
  const tx=el("tnewx"); if(tx)tx.onclick=()=>{ replaceAsk=false; render() };
  document.querySelectorAll("[data-repl]").forEach(b=>b.onclick=(ev)=>{ ev.stopPropagation(); const n=+b.dataset.repl;
    tapTwice(b,"Tap again to replace",async()=>{
      try{await store.delete(KEYFOR(n))}catch(e){} await bumpRev(n); replaceAsk=false;
      S._slots=await allSlots(); render(); const e=document.querySelector(`[data-slot="${n}"]`); if(e)e.click() }) });
  document.querySelectorAll("[data-copyback]").forEach(b=>b.onclick=(ev)=>{ ev.stopPropagation();
    tapTwice(b,"Tap again to bring it back",async()=>{ const c=await readCopy(), n=+b.dataset.copyback; if(!c||c.n!==n)return;
      try{ await store.set(KEYFOR(n),c.v) }catch(e){} await bumpRev(n); S._slots=await allSlots(); render() }) });
  document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=async(ev)=>{
    const n=+b.dataset.slot;
    slot=n; await claimSlot(n);
    const d=await loadSlot(n); if(!(d&&d.myTeam))saveRev=null;
    if(d&&d.broken)return;                         // never start a career over a save that's there
    if(d&&d.myTeam){S=d;S.title=false;rebuild();S.expNow=S.expNow||expectations();keepCopy(n);flash=resumeFlash();if(lockNew){lockNew=false;save()}render()}
    else {S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,
             setup:{name:"",seed:Math.floor(Math.random()*899999+100000)}};
          S.title=false;render()}
  });
  // the page of "How to play" lives outside the career: it read S.introStep, and only with no
  // career loaded, so after leaving a career for the title screen the button resumed it (Muse)
  el("thow").onclick=()=>{introAt=0;render();try{window.scrollTo(0,0)}catch(e){}};   // it opened halfway down (Grokbot)
  const rf=el("restorefile"); if(rf)rf.onchange=async()=>{ const f=rf.files&&rf.files[0]; if(!f)return;
    const free=slots.find(x=>x.empty); let into=free?free.n:1;
    if(!free&&!confirm("Every slot is full. Replace the career in slot 1 with this backup?"))return;
    await restoreBackup(f,into) };
  const qs=el("qstart"); if(qs)qs.onclick=()=>quickStart(+qs.dataset.qs);
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
      same world, same season, different ${LEAGUE.text.orgs}.</span>
    ${(S.setup.coaches||1)>1?`<div class="conames">${
      Array.from({length:(S.setup.coaches||1)-1}).map((_,i)=>`
      <input class="seedbox" data-coname="${i+1}" maxlength="26"
        placeholder="Coach ${i+2} name"
        value="${esc((S.setup.names&&S.setup.names[i+1])||"")}">`).join("")}</div>`:""}
    <div class="titlebtns"><button class="advance" id="cgo">Choose your ${ORG_WORD}</button>
      <button class="introskip" id="cback">Back</button></div>
  </div>`;
  el("cback").onclick=()=>toTitle();
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
  const i=introAt||0;
  const card=INTRO[i];
  el("app").innerHTML=`<div class="introwrap">
    <div class="kicker">How this works &middot; ${i+1} of ${INTRO.length}</div>
    <h2 class="introh">${card.h}</h2>
    <p class="introb">${card.b}</p>
    <div class="intronav">
      <button class="introskip" id="iskip">Skip</button>
      <button class="advance" id="inext">${i===INTRO.length-1?"Pick your "+ORG_WORD:"Next"}</button>
    </div>
    <div class="dots">${INTRO.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join("")}</div>
  </div>`;
  el("inext").onclick=()=>{
    if(i===INTRO.length-1){ introAt=null; S.introDone=true; S.title=true; render();
      // "Pick your team" picks one: a new career in the first empty slot (it went back to the title)
      const e=document.querySelector(".slot.empty[data-slot]"); if(e)e.click() }
    else{introAt=i+1;render()}
  };
  el("iskip").onclick=()=>{introAt=null;S.introDone=true;S.title=true;render()};
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
    <div class="grouphead">Coach's notes</div>
    <div class="setrow">${[[true,"On"],[false,"Off"]].map(([v,l])=>`<button class="setbtn" data-guide="${v}" aria-pressed="${(S.guide===true)===v}">${l}</button>`).join("")}</div>
    <div class="fnote" style="padding:0 16px 8px">A short note the first time you meet each kind of call and screen.</div>
    <div class="grouphead">Sound</div>
    <div class="setrow">${[[true,"On"],[false,"Off"]].map(([v,l])=>`<button class="setbtn" data-sound="${v}"
      aria-pressed="${soundOn()===v}">${l}</button>`).join("")}</div>
    <div class="helpcard"><div class="cdesc">The crowd when you score, the whistle, a fanfare when you win.
      Phones also buzz for your goals. The &#9834; button in the top bar switches it too.</div></div>
    ${typeof HL_SPORT!=="undefined"?`<div class="grouphead">Highlights</div>
    <div class="setrow">${[["goals","Goals only"],["key","Key moments"],["all","Every chance"]].concat(typeof HL_SPORT!=="undefined"&&HL_SPORT.ambient?[["full","Full match"]]:[]).concat([["off","Off"]]).map(([v,l])=>`<button class="setbtn" data-hl="${v}"
      aria-pressed="${((S&&S.highlights)||"key")===v}">${l}</button>`).join("")}</div>
    <div class="note">In a game you watch, the moments play out on a pitch above the run of play. Tap the pitch to skip one.</div>`:""}
    <div class="grouphead">Live win chance</div>
    <div class="setrow">${[[true,"On"],[false,"Off"]].map(([v,l])=>`<button class="setbtn" data-livewp="${v}"
      aria-pressed="${(!S||S.liveWP!==false)===v}">${l}</button>`).join("")}</div>
    <div class="note">The bar above the score in a game you watch. It reads this game's odds, from replays of games like it: in these leagues the better side wins more often than in real life, so early leads can read high.</div>
    <div class="grouphead">Music</div>
    <div class="setrow">${[[true,"On"],[false,"Off"]].map(([v,l])=>`<button class="setbtn" data-music="${v}"
      aria-pressed="${musicOn()===v}">${l}</button>`).join("")}</div>
    ${S.myTeam?`<div class="grouphead">Your save</div>
    <div class="setrow"><button class="setbtn" id="backupbtn">Download a backup</button>
      <label class="setbtn restorelbl">Restore a backup<input type="file" id="restorefile2" accept=".coach,.txt,text/plain" hidden></label></div>
    <div class="helpcard"><div class="cdesc">Your career is saved in this browser as you play. Clearing the browser's data
      erases it, so keep a backup file now and then: it opens again from here, or from the title screen on any device.</div></div>`:""}
    <div class="buildid">Build ${typeof BUILD_ID!=="undefined"?BUILD_ID:"dev"}</div>
    <div class="grouphead">Staff advice on reads</div>
    <div class="setrow">${[["hints","Hints only"],["full","Full"]].map(([k,l])=>`<button class="setbtn" data-advice="${k}"
      aria-pressed="${(S.advice==="full"?"full":"hints")===k}">${l}</button>`).join("")}</div>
    <div class="helpcard"><div class="cdesc">Hints only (the default): Pearl points at the number to watch and leaves the answer to you.
      Full: she tells you what she sees and what to do.</div></div>
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
      <p>${LEAGUE.text.pickIntro?esc(LEAGUE.text.pickIntro):`Every program is a different job with different expectations. Win at a blue blood and
        it's what they pay you for; win at a rebuild and you'll have your pick of the country.`}</p>
    </header>
    ${(function(){
      const n=(S.setup&&S.setup.coaches)||1;
      if(n<2)return "";                         // the first jobs below carry the heading
      const taken=(S.picking||[]).map(x=>x.team);
      const who=((S.setup.names&&S.setup.names[taken.length])||"").trim()
              ||("Coach "+(taken.length+1));
      return `<div class="grouphead">${esc(who)} &mdash; pick a ${ORG_WORD}
        (${taken.length+1} of ${n})</div>`+
        (taken.length?`<div class="note">Already taken: ${taken.map(esc).join(", ")}</div>`:"");
    })()}
    <button class="backbtn" id="pback2">&larr; Back</button>
    ${(S.picking&&S.picking.length)?"":(()=>{ firstJobPicks=firstJobPicks||firstJobs();
      return `<div class="grouphead">Good first jobs</div><div class="firstjobs">${firstJobPicks.map(J=>`<button class="pick firstjob" data-t="${esc(J.t)}">
        <span class="dot" style="background:${teamColor(J.t)}"></span><span class="fjl">${esc(J.l)}</span>
        <span class="fjt">${esc(J.t)}</span><span class="fjd">${esc(J.d)}</span></button>`).join("")}</div>
        <div class="grouphead">Or any of them</div>` })()}
    <div class="seedrow"><input id="find" class="seedbox findbox" placeholder="Search ${NAMES.length} ${esc(LEAGUE.text.orgs||"teams")}...">
      <span class="seedhint">The number is the preseason rating rank. Lower means a stronger
      ${ORG_WORD} &mdash; and higher expectations to go with it.</span></div>
    <div class="tierkey">${TIERS.map(t=>`<span class="${t.c}">${esc(t.l)}</span>`).join("")}</div>
    <div id="picks">${pickList("")}</div>
    <div class="titlebtns"><button class="introskip" id="pback">Back</button></div>
    <div style="height:40px"></div>`;
  bindPicks();
  // back a step: to the setup, nothing started (testers: no way out of a new career once begun)
  el("pback").onclick=()=>{ if(S.setup){S.setup.ready=false} S.picking=null; render() };
  { const b2=el("pback2"); if(b2)b2.onclick=el("pback").onclick }   // at the top too: the bottom one sat under 132 teams (Grokbot)
  const f=el("find");
  if(f)f.oninput=()=>{el("picks").innerHTML=pickList(f.value);bindPicks()};
}

window.addEventListener("resize",()=>{
  const w=isWide();
  // narrowing with a result showing: the card goes where a phone shows it, not away with the side column
  if(w!==wide&&!w&&S.myTeam&&flash&&(flash.type==="week"||flash.type==="post"))view="team";
  if(w!==wide&&S.myTeam)render();
});
window.addEventListener("keydown",e=>{
  if(!S.myTeam)return;
  if(quitAsk){                              // nothing advances under an open prompt
    if(e.key==="Escape"){e.preventDefault();quitAsk=false;render()}
    else if(e.key===" "||e.key==="Enter")e.preventDefault();
    return;
  }
  const tag=(e.target&&e.target.tagName)||"";
  if(tag==="INPUT"||tag==="TEXTAREA")return;
  if(live&&!live.done){
    if(live.ask)return;
    if(e.key===" "){e.preventDefault();live.paused=!live.paused;S.watchStep=live.paused;liveTick();return}
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();live.paused=true;liveTick();return}
    if(e.key==="Enter"){e.preventDefault();skipLive();return}
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
  if(keys[e.key]&&!S.off){view=keys[e.key];flash=null;playerSel=null;render()}
});

/* the staff room never says the same line twice in one game (Instinct: the
   Bears' "SEND EVERYONE" at 45' and again at 75'). Each prompt keeps the
   line it got, so drawing the screen again doesn't change it. */
if(typeof bearYell==="function"){ const pickBear=bearYell;
  bearYell=function(kind,seed){
    if(!live)return pickBear(kind,seed);
    const said=live._said=live._said||{}, key=kind+"|"+seed+"|"+(live.ask?(live.ask.dp&&live.ask.dp.h)+"|"+live.ask.q:"");
    if(said[key])return said[key];
    const used=new Set(Object.values(said)); let line=pickBear(kind,seed);
    for(let k=1;k<12&&used.has(line);k++)line=pickBear(kind,seed+k*5);
    return said[key]=line;
  } }
/* another tab saved or erased: the title screen re-reads the slots, and a
   career open on an older revision stops saving (see save); a page brought
   back from the browser's back-forward cache re-reads too */
function watchOtherTabs(){
  try{
    window.addEventListener("storage",async e=>{
      if(!e.key||e.key.indexOf(KEYBASE)!==0)return;
      if(S&&S.title){ S._slots=await allSlots(); render(); return }
      if(S&&S.myTeam&&saveRev!==null&&e.key===REVKEY(slot)&&(+e.newValue||0)!==saveRev&&!staleTab){ staleTab=true; render() } });
    // a page brought back from the browser's cache shows its old title screen until the saves are read again:
    // blank the list first (Muse: "Winnipeg, 3 seasons" painted, then corrected to Edmonton, 5)
    // round 71: a page brought back in a career is as it was when it was left, and the career may have moved on since
    // (another tab, another visit): load it afresh
    window.addEventListener("pageshow",async e=>{ if(!e.persisted)return; if(S&&S.myTeam&&!S.title){ try{ location.reload() }catch(x){} return }
      if(S&&S.title){ S._slots=[]; S._slotsWait=true; render(); S._slots=await allSlots(); S._slotsWait=false; render() } });
    document.addEventListener("visibilitychange",async()=>{ if(document.visibilityState!=="visible"||!S)return;
      if(S.title&&S._slots&&!S._slotsWait){ S._slots=await allSlots(); render(); return }
      // back to a career tab: if it was saved somewhere else meanwhile, this tab stops saving and says so
      if(S.myTeam&&saveRev!==null&&!staleTab){ const cur=await readRev(slot); if(cur!==null&&cur!==saveRev){ staleTab=true; render() } } });
  }catch(e){}
}
(async function(){
  watchOtherTabs();
  S={myTeam:null,uStart:null,seasonSeed:0,steps:0,history:[],seed:0,title:true};
  S._slots=await allSlots();
  render();
  versionCheck();
})();

