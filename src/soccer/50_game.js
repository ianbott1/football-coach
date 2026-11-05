/* ============ the game engine: soccer ============ */
/* Ninety minutes as eighteen five-minute spells. In each, each side scores at a
   rate shaped by its edge (Poisson), by how both sides are playing, and by how
   tired each side's units are. A league game can be drawn; a knockout tie goes
   to thirty minutes of extra time and then penalties.

   Every side plays an approach: a high press, a low block, overloading the
   flanks, or going direct. It shows in the numbers (turnovers forced in your
   half, possession, crosses, long balls) and in the commentary. The right
   counter blunts it; the wrong one costs a little. Sides change approach at
   half-time now and then. Legs go: defence, midfield and attack tire at
   different rates (a press runs the front players, a block the back four), a
   tired unit creates or stops less, and a substitution freshens one. Bookings
   pile up; a centre-back on a yellow can see a second.

   Your calls: the read (25', and again at 55'), at half-time when you're
   ahead or behind, your changes (60', or wait to 70'), and the last twenty
   minutes when it's within a goal. Every call's last option is "carry on": what a skipped game does. */
const SEGS = 18;
const DRIVES_PER_TEAM = 9;                     // the live clock's pace: 18 spells a game
const SC_BASE = {
  goals:1.31,        // goals per side per game, even teams, before home advantage (calibrated)
  edge:0.0021,       // per Elo of edge: log of the scoring-rate ratio
  chase:0.22,        // last half hour: the side behind scores this much more...
  exposed:0.20,      // ...and concedes this much more on the break
  etGoals:0.30,      // extra time's share of a normal game's goals (tired legs)
  penEdge:0.12,      // how much edge counts in a shoot-out
  counter:{own:1.12, opp:0.82},   // reading them right: you create more, they create less
  misread:0.95,      // the wrong counter: your own chances, slightly fewer
  fit:[0.65,1.45],   // how hard each unit finds the day: a per-game spread on the drain
  drain:0.021,       // energy lost per spell, before approach and unit
  tiredOwn:0.55,     // chances made at zero energy, relative to fresh: 1 - this
  tiredOpp:0.55,     // chances allowed at zero energy: 1 + this
  yellow:0.034,      // bookings per side per spell
  red:{own:0.70, opp:1.32},  // down to ten
  flank:{right:1.17, wrong:0.93}, // overloading their weak flank, or the wrong one
  cueTrue:0.6,       // commentary that describes how a side really plays (else a random approach)
  flankTell:2.0,     // attacks that get through down the weak flank, against the other
  favW:7,            // a club's usual approach: this many times as likely as any other (was 4: the report's top
                     // approach was the one played 49% of the time; Instinct: about two-thirds. Nov 2026)
  scouted:6,         // games in a scouting report
  misprep:{own:0.93, opp:1.05},  // set up from kick-off for the wrong thing: out of shape until you change it
  prepped:{own:1.05, opp:0.95}   // ...and for the right thing: drilled all week, sharper than a change made mid-game
};
const SC = Object.assign({}, SC_BASE, (typeof LEAGUE!=="undefined"&&LEAGUE.tuning&&LEAGUE.tuning.sc)||{}, (typeof SC_TRY!=="undefined"?SC_TRY:{}));

/* gameplans and in-game modes: how many chances a side creates, and allows */
const AGGR = {
  safe:      {own:1.12, opp:1.08},   // take the game to them: more football, both ways
  balanced:  {own:1.00, opp:1.00},
  aggressive:{own:0.60, opp:0.63},   // sit deep and counter: fewer chances, more luck
  push:      {own:1.55, opp:1.45},   // all-out attack (was 1.35/1.30; sit 0.62/0.84; win 1.18/1.15: the late call moved 1.6 points. Nov 2026)
  sit:       {own:0.50, opp:0.80},   // park the bus
  win:       {own:1.35, opp:1.25},   // level late: go for the win
  point:     {own:0.75, opp:0.78},   // level late: take the point
  urgent:    {own:1.00, opp:1.00}
};
/* approaches: what a side does with and without the ball. own and opp scale
   its chances and the chances it allows; legs is how hard it runs each unit
   (defence, midfield, attack); the counter that beats it. */
const APPROACH = {
  press: {l:"a high press",           own:1.06, opp:1.05, legs:[0.9,1.35,1.35], counter:"long"},
  block: {l:"a low block",            own:0.86, opp:0.84, legs:[1.35,1.0,0.8],  counter:"wide"},
  wing:  {l:"overloading the flanks", own:1.05, opp:1.01, legs:[1.0,1.0,1.15],  counter:"double"},
  direct:{l:"going direct",           own:1.00, opp:1.02, legs:[1.0,0.85,1.1],  counter:"second"}
};
const APPROACH_KEYS=["press","block","wing","direct"];
const COUNTERS = {
  long:  {beats:"press",  l:"Go long over the press", d:"Skip midfield and turn their high line"},
  wide:  {beats:"block",  l:"Stretch them: width and crosses", d:"Get it wide and in the box, early"},
  double:{beats:"wing",   l:"Double up on the flanks", d:"Full-back and winger together on their wide men"},
  second:{beats:"direct", l:"Drop off and win the second balls", d:"Deeper line, midfield on the knock-downs"}
};
/* what each approach puts in the numbers, per spell: [turnovers forced in the
   other half, crosses, long balls, possession swing (points)] */
const TELL = {
  press: [2.0,0.5,0.6,  5],
  block: [0.3,0.4,0.5,-16],
  wing:  [0.5,1.8,0.6,  2],
  direct:[0.5,0.6,2.3, -6]
};
const TELL_BASE=[0.7,0.6,0.7,0];
const UNIT=["defence","midfield","attack"];

function poisson(rng,lam){ const L=Math.exp(-lam); let k=0,p=1; do{k++;p*=rng.r()}while(p>L&&k<12); return k-1 }
function halfCall(lead){
  return lead<0
    ? {k:"half",h:`Down ${-lead} at half-time`,q:"Forty-five minutes. Chase it now?",
       opts:[["push","Chase it: more bodies forward"],["normal","Be patient"]]}
    : {k:"half",h:`Up ${lead} at half-time`,q:"Forty-five minutes. Sit on it?",
       opts:[["sit","Sit on it"],["normal","Keep playing our game"]]};
}
function lateCall(lead){
  const A=["normal","Leave it to your assistant"];
  if(lead<0)return {k:"late",h:`Down ${-lead}, twenty minutes left`,q:"Throw everything at it?",
    opts:[["push","All-out attack"],["keep","Keep our shape"],A]};
  if(lead>0)return {k:"late",h:`Up ${lead}, twenty minutes left`,q:"See it out?",
    opts:[["sit","Park the bus"],["keep","Keep going"],A]};
  return {k:"late",h:"Level, twenty minutes left",q:"Go for the win, or take the point?",
    opts:[["win","Go for the win"],["point","Take the point"],A]};
}
/* the evidence on one side's approach so far: each tell against its baseline */
function readScore(T){
  const n=Math.max(1,T.n), out={};
  APPROACH_KEYS.forEach(k=>{ const t=TELL[k]; let s=0;
    s+=(T.to/n-TELL_BASE[0])*(t[0]-TELL_BASE[0]);
    s+=(T.cr/n-TELL_BASE[1])*(t[1]-TELL_BASE[1]);
    s+=(T.lb/n-TELL_BASE[2])*(t[2]-TELL_BASE[2]);
    s+=(T.pos/n)*(t[3])/60;
    out[k]=s; });
  return out;
}
function bestRead(T){ const s=readScore(T); return APPROACH_KEYS.reduce((a,k)=>s[k]>s[a]?k:a,APPROACH_KEYS[0]) }
function readCall(stage,T,hint,cur){
  // "keep your setup" first when you have one: re-picking it from the list was the only way, and a
  // mis-tap changed it (Instinct). "Leave it to your assistant" hands the read back, which is different.
  const opts=(cur&&COUNTERS[cur]?[["keep","Keep your setup: "+COUNTERS[cur].l]]:[]).concat(Object.keys(COUNTERS).map(c=>[c,COUNTERS[c].l])).concat([["normal","Leave it to your assistant"]]);
  return {k:"read",stage:stage,h:stage===1?"Twenty-five minutes in":"Ten minutes into the second half",
    q:stage===1?"How are they playing it? Pick the answer.":"Anything changed? Adjust, or leave it.",
    opts:opts, tell:{to:T.to,cr:T.cr,lb:T.lb,pos:Math.round(50+T.pos/Math.max(1,T.n)),n:T.n},
    best:bestRead(T), pearl:hint||bestRead(T)};
}
/* the flank: every side has a weaker one (a full-back having a hard day);
   attacks down it get through more often. At sixty minutes, where do you go? */
function flankCall(F,last){
  return {k:"flank",h:"Half-time: the flanks",q:"Where are we getting joy? Overload one side for the second half, or leave it.",
    opts:[["left","Overload the left"],["right","Overload the right"],["normal","Leave it to your assistant"]],
    flank:F.slice(), pearl:last||"normal"};
}
function subCall(E,booked,canWait,lead){
  const opts=[["att","Fresh legs up front"],["mid","Fresh legs in midfield"],["def","Fresh legs at the back"]];
  const why=[]; [0,1,2].forEach(u=>why.push(Math.round(E[u]*100)));
  if(booked)opts.push(["card","Take off the booked centre-back"]);
  if(canWait)opts.push(["wait","Wait ten minutes"]);
  opts.push(["normal","Leave it to your assistant"]);
  return {k:"subs",h:canWait?"Sixty minutes":"Seventy minutes",
    q:canWait?"Two changes to make. Your pick first; your assistant makes the other at seventy.":"Your pick, then your assistant's.",
    opts:opts, energy:why, booked:!!booked, lead:lead};
}

/* the scouting report: how a club set up in its last few games (its usual
   approach, weighed against the others as it would be against an even side),
   drawn from its own seed so it never moves the game */
function scoutReport(fav,seed){
  const r=new RNG(seed>>>0), w=APPROACH_KEYS.map(k=>k===fav?SC.favW:1), tot=w.reduce((a,b)=>a+b), n={};
  APPROACH_KEYS.forEach(k=>n[k]=0);
  for(let g=0;g<SC.scouted;g++){ let x=r.r()*tot, i=0; while(x>w[i]){x-=w[i];i++} n[APPROACH_KEYS[i]]++ }
  return n;
}
function prepCall(rep){
  const top=APPROACH_KEYS.reduce((a,k)=>rep[k]>rep[a]?k:a,APPROACH_KEYS[0]);
  const opts=Object.keys(COUNTERS).map(c=>[c,COUNTERS[c].l]).concat([["normal","Wait and see: leave it to your assistant"]]);
  return {k:"prep",h:"Before kick-off: the scouting report",q:"Set up for how they usually play, or wait and see?",
    opts:opts, report:Object.assign({},rep), n:SC.scouted, pearl:top};
}
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, knockout, ctx){
  ctx=ctx||{};
  const fav=ctx.fav||{};
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const side0=()=>({weak:rng.r()<0.5?"left":"right", fl:[0,0], aim:null, F:[0,1,2].map(()=>SC.fit[0]+rng.r()*(SC.fit[1]-SC.fit[0])), E:[1,1,1], app:null, ctr:null, booked:0, red:false, subs:0,
    tell:{to:0,cr:0,lb:0,pos:0,n:0}, sh:0, sot:0});
  const st={h:0,a:0,drives:[],seg:0,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null,
    ot:0, so:false, done:false, playoff:!!knockout, draw:false,
    S:{home:side0(), away:side0()}};
  st.gap=gap;
  const other=s=>s==="home"?"away":"home";
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  /* each side's approach: the computer's from its edge (the better side
     presses or attacks the flanks, the weaker sits deep or goes direct), a
     person's from the gameplan they picked */
  const pickApp=(side)=>{
    const m=st.mode[side];
    if(humans[side]){ if(m==="safe")return "press"; if(m==="aggressive")return "block";
      return rng.pick(["wing","direct"]) }
    const e=(side==="home"?gap:-gap);
    const w=(e>60?[3,1,3,1]:e<-60?[1,4,1,3]:[2,2,2,2]).map((x,i)=>APPROACH_KEYS[i]===fav[side]?x*SC.favW:x);
    let x=rng.r()*w.reduce((a,b)=>a+b), i=0; while(x>w[i]){x-=w[i];i++} return APPROACH_KEYS[i];
  };
  st.S.home.app=pickApp("home"); st.S.away.app=pickApp("away");
  const queueCall=(side,dp)=>{ if(!humans[side]||st.asked[dp.k+(dp.stage||"")+side])return;
    st.asked[dp.k+(dp.stage||"")+side]=true; st.queue.push({side:side,dp:dp}) };
  // the computer: chase a deficit late, see out a lead, the home side goes for the win
  const cpuMode=(side,s)=>{ const L=lead(side);
    if(s>=13&&L<0)return "push"; if(s>=13&&L>=1)return "sit";
    if(s>=13&&L===0&&side==="home")return "win"; return st.mode[side] };
  const modeOf=(s,side)=>{ const L=humans[side]&&st.late[side];
    if(L==="auto"||!humans[side])return cpuMode(side,s);
    return L||st.mode[side] };
  /* the computer's reads and changes */
  // it reads the other side right about half the time, and otherwise leaves it
  const readIt=(side,p)=>{ if(rng.r()<p){st.S[side].ctr=APPROACH[st.S[other(side)].app].counter; st.S[side].prepd=false} };
  const cpuRead=(side,p)=>{ if(!humans[side])readIt(side,p) };
  const assistantRead=(side,stage)=>readIt(side,stage===2?0.3:0.45);
  // the flank: spotted about four times in ten
  const aimIt=(side)=>{ if(rng.r()<0.4)st.S[side].aim=st.S[other(side)].weak };
  const segment=(s)=>{
    const H=st.S.home, A=st.S.away, e=gap*SC.edge, ev=[];
    const m={home:modeOf(s,"home"), away:modeOf(s,"away")};
    const rateOf=(side)=>{
      const X=st.S[side], O=st.S[other(side)], ap=APPROACH[X.app], oap=APPROACH[O.app];
      let own=ap.own*oap.opp*(AGGR[m[side]]||AGGR.balanced).own*(AGGR[m[other(side)]]||AGGR.balanced).opp;
      // counters: yours against their approach, theirs against yours
      if(X.ctr){ if(COUNTERS[X.ctr].beats===O.app)own*=SC.counter.own; else own*=SC.misread }
      if(O.ctr&&COUNTERS[O.ctr].beats===X.app)own*=SC.counter.opp;
      if(X.prepd)own*=COUNTERS[X.ctr].beats===O.app?SC.prepped.own:SC.misprep.own;
      if(O.prepd)own*=COUNTERS[O.ctr].beats===X.app?SC.prepped.opp:SC.misprep.opp;
      if(X.aim)own*=(X.aim===O.weak?SC.flank.right:SC.flank.wrong);
      // legs: your attack and midfield make chances, their defence and midfield stop them
      const myLegs=(X.E[2]*0.6+X.E[1]*0.4), theirLegs=(O.E[0]*0.6+O.E[1]*0.4);
      own*=(1-SC.tiredOwn*(1-myLegs))*(1+SC.tiredOpp*(1-theirLegs));
      if(X.red)own*=SC.red.own; if(O.red)own*=SC.red.opp;
      return own;
    };
    let lamH=SC.goals/SEGS*Math.exp(e/2)*rateOf("home");
    let lamA=SC.goals/SEGS*Math.exp(-e/2)*rateOf("away");
    if(s>=12&&st.h!==st.a){ if(st.h<st.a){lamH*=1+SC.chase;lamA*=1+SC.exposed} else {lamA*=1+SC.chase;lamH*=1+SC.exposed} }
    const gH=poisson(rng,lamH), gA=poisson(rng,lamA);
    const t0=s*5;
    const minute=()=>t0+1+rng.int(5);
    for(let i=0;i<gH;i++)ev.push({m:minute(),side:"home",k:"goal",u:rng.int(100)});
    for(let i=0;i<gA;i++)ev.push({m:minute(),side:"away",k:"goal",u:rng.int(100)});
    st.h+=gH; st.a+=gA;
    // shots, big chances that didn't go in
    [["home",lamH,gH],["away",lamA,gA]].forEach(([sd,lam,g])=>{
      const X=st.S[sd]; let shots=g+poisson(rng,lam*3.4), sot=g+Math.min(shots-g,poisson(rng,lam*1.1));
      // a chance the commentary calls (a save, a miss) is a shot in the numbers too:
      // a match once showed 0 shots and two great saves (same draws, same order)
      if(poisson(rng,lam*0.9)>0){ const e={m:minute(),side:sd,k:rng.r()<0.55?"save":"miss",u:rng.int(100)}; ev.push(e);
        if(e.k==="save")sot=Math.max(sot,g+1); shots=Math.max(shots,sot+(e.k==="miss"?1:0)) }
      X.sh+=shots; X.sot+=sot; st.lines[sd==="home"?"h":"a"].sog+=sot;
    });
    // the tells: what each side's approach puts in the numbers
    ["home","away"].forEach(sd=>{ const X=st.S[sd], O=st.S[other(sd)];
      const l=poisson(rng,0.55*(O.weak==="left"?SC.flankTell:1)), r=poisson(rng,0.55*(O.weak==="right"?SC.flankTell:1));
      X.fl[0]+=l; X.fl[1]+=r; if(l!==r)X.flLast=l>r?"left":"right"; });
    ["home","away"].forEach(sd=>{ const X=st.S[sd], t=TELL[X.app], T=X.tell;
      T.to+=poisson(rng,t[0]); T.cr+=poisson(rng,t[1]); T.lb+=poisson(rng,t[2]);
      T.pos+=t[3]+rng.gauss(0,6); T.n++;
      // the same numbers since half-time, for the second-half read: the whole-match ones mostly
      // describe the first half (Instinct: they lagged the change). No dice of their own.
      // the whole match too, never reset: the read's own numbers start again when they change their
      // approach at half-time, and the "whole match" column showed the same as "since half-time" (Instinct)
      { const W=X.tellAll=X.tellAll||{to:0,cr:0,lb:0,pos:0,n:0}, k=X.tellLast||{to:0,cr:0,lb:0,pos:0,n:0};
        W.to+=T.to-k.to; W.cr+=T.cr-k.cr; W.lb+=T.lb-k.lb; W.pos+=T.pos-k.pos; W.n+=T.n-k.n }
      if(st.seg>=9){ const U=X.tell2=X.tell2||{to:0,cr:0,lb:0,pos:0,n:0}, k=X.tellLast;
        if(k){ U.to+=T.to-k.to; U.cr+=T.cr-k.cr; U.lb+=T.lb-k.lb; U.pos+=T.pos-k.pos; U.n+=T.n-k.n } }
      X.tellLast={to:T.to,cr:T.cr,lb:T.lb,pos:T.pos,n:T.n};
      // a line of commentary on it, now and then; once in a while a misleading one
      if(rng.r()<0.32){ const k=rng.r()<SC.cueTrue?X.app:rng.pick(APPROACH_KEYS), u=rng.int(100);
        ev.push({m:minute(),side:sd,k:"cue",cue:k,u:u}); if(u%3===0)X.lastCue=k }   // the ones the commentary reads out
    });
    // legs
    ["home","away"].forEach(sd=>{ const X=st.S[sd], ap=APPROACH[X.app], md=m[sd];
      const hard=(md==="push"||md==="win")?1.25:(md==="sit"||md==="point")?0.9:md==="safe"?1.12:1;
      [0,1,2].forEach(u=>{ X.E[u]=Math.max(0,X.E[u]-SC.drain*ap.legs[u]*X.F[u]*hard*(0.85+rng.r()*0.3)) }) });
    // bookings: a press and a chase make more; a booked centre-back can see red
    ["home","away"].forEach(sd=>{ const X=st.S[sd], md=m[sd];
      const p=SC.yellow*(X.app==="press"?1.35:1)*(md==="push"?1.3:1)*(lead(sd)<0?1.1:1);
      if(rng.r()<p){
        if(X.booked&&!X.red&&rng.r()<0.42){ X.red=true; X.booked=0; ev.push({m:minute(),side:sd,k:"red"}) }
        else{ const def=rng.r()<0.45; if(def)X.booked=1; ev.push({m:minute(),side:sd,k:"yellow",def:def,u:rng.int(100)}) }
      }
    });
    ev.sort((x,y)=>x.m-y.m);
    // momentum: the home side's share of the play in this spell
    const mom=Math.max(0.12,Math.min(0.88,lamH/(lamH+lamA)+rng.gauss(0,0.07)));
    const d={seg:s,h:gH,a:gA,sh:st.h,sa:st.a,shots:[0,0],pp:[false,false],en:null,ot:0,mom:mom,ev:ev,
      E:{home:H.E.map(x=>Math.round(x*100)),away:A.E.map(x=>Math.round(x*100))},
      T:{home:Object.assign({},H.tell),away:Object.assign({},A.tell)},
      T2:{home:H.tell2?Object.assign({},H.tell2):null,away:A.tell2?Object.assign({},A.tell2):null},
      TA:{home:H.tellAll?Object.assign({},H.tellAll):null,away:A.tellAll?Object.assign({},A.tellAll):null},
      st:{home:[H.sh,H.sot],away:[A.sh,A.sot]}};
    st.drives.push(d); return d;
  };
  const extraTime=()=>{
    const e=gap*SC.edge; st.ot=1;
    const gH=poisson(rng,SC.goals*SC.etGoals*Math.exp(e/2)), gA=poisson(rng,SC.goals*SC.etGoals*Math.exp(-e/2));
    st.h+=gH; st.a+=gA;
    const ev=[]; for(let i=0;i<gH;i++)ev.push({m:91+rng.int(30),side:"home",k:"goal",u:rng.int(100)});
    for(let i=0;i<gA;i++)ev.push({m:91+rng.int(30),side:"away",k:"goal",u:rng.int(100)});
    ev.sort((x,y)=>x.m-y.m);
    if(st.h===st.a){ st.so=true; const p=0.5+Math.tanh(e)*SC.penEdge; st.pens=rng.r()<p?"home":"away" }
    st.drives.push({seg:SEGS,sh:st.h,sa:st.a,ot:1,so:st.so,pens:st.pens||null,h:gH,a:gA,shots:[0,0],pp:[false,false],ev:ev});
  };
  // your assistant makes the other change: the most tired unit
  const assistantSub=(side)=>{ const X=st.S[side]; const u=[0,1,2].reduce((a,b)=>X.E[b]<X.E[a]?b:a,0);
    X.E[u]=1; X.subs++; if(u===0)X.booked=0 };
  st.log=[];            // the person's reads, and what was true (for the result screen)
  const apply=(side,dp,v)=>{
    const X=st.S[side];
    if(dp.k==="prep"){ if(COUNTERS[v]){ const t=st.S[other(side)].app; X.ctr=v; X.prepd=true;
      st.log.push({side:side,k:"prep",pick:v,truth:t,right:COUNTERS[v].beats===t,split:(()=>{const a=Object.values(dp.report).sort((x,y)=>y-x);return a[0]===a[1]?a.filter(x=>x>0).join("-"):false})()}) } return }
    if(dp.k==="read"&&v==="keep"&&COUNTERS[X.ctr]){ const t=st.S[other(side)].app; st.log.push({side:side,k:"read",pick:X.ctr,truth:t,right:COUNTERS[X.ctr].beats===t,evid:dp.best}); return }
    if(dp.k==="read"&&COUNTERS[v]){ const t=st.S[other(side)].app; st.log.push({side:side,k:"read",pick:v,truth:t,right:COUNTERS[v].beats===t,evid:dp.best}) }
    if(dp.k==="flank"&&(v==="left"||v==="right")){ const t=st.S[other(side)].weak; st.log.push({side:side,k:"flank",pick:v,truth:t,right:v===t}) }
    if(dp.k==="flank"){ if(v==="left"||v==="right")X.aim=v; else aimIt(side); return }
    if(dp.k==="read"){ if(v&&COUNTERS[v]){ if(v!==X.ctr)X.prepd=false; X.ctr=v } else assistantRead(side,dp.stage); return }
    if(dp.k==="subs"){
      if(v==="wait"){ st.waitSub=st.waitSub||{}; st.waitSub[side]=true; return }
      if(v==="normal"){ assistantSub(side); if(dp.stage===2)assistantSub(side); return }
      const u=v==="att"?2:v==="mid"?1:0; X.E[u]=1; X.subs++; if(u===0||v==="card")X.booked=0;
      if(dp.stage===2)assistantSub(side);
      return }
    // late: "keep" holds your plan; "normal" hands it to your assistant (the computer's rule)
    if(dp.k==="late"){ st.late[side]=v==="keep"?st.mode[side]:v==="normal"?"auto":v; return }
    st.late[side]=v==="normal"?null:v;
  };
  st.next=function(){
    const fin=()=>({done:true,h:st.h,a:st.a,drives:st.drives});
    if(st.done)return fin();
    if(st.pendingSide){ const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null; apply(P.side,P.dp,v) }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      const r={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,theirs:Q.side==="home"?st.a:st.h,q:st.seg,side:Q.side};
      st.waiting=r; return r}
    const s=st.seg;
    if(s===0&&!st.p0){st.p0=true; ["home","away"].forEach(sd=>{ const o=other(sd);
      if(humans[sd]&&!humans[o]&&fav[o])queueCall(sd,prepCall(scoutReport(fav[o],(ctx.seed||0)+(o==="home"?1:2)))) });
      if(st.queue.length)return st.next()}
    if(s===5&&!st.r1){st.r1=true; ["home","away"].forEach(sd=>{cpuRead(sd,0.45);
      { const d=readCall(1,st.S[other(sd)].tell,st.S[other(sd)].lastCue); (st.p1=st.p1||{})[sd]=d.pearl; queueCall(sd,d) }}); if(st.queue.length)return st.next()}
    if(s===9&&!st.ht){st.ht=true;
      // half-time: the computer changes its approach now and then, more often when behind
      ["home","away"].forEach(sd=>{ if(humans[sd])return; const X=st.S[sd];
        if(rng.r()<(lead(sd)<0?0.5:0.25)){ X.app=rng.pick(APPROACH_KEYS.filter(k=>k!==X.app));
          X.tell={to:0,cr:0,lb:0,pos:0,n:0}; X.tellLast={to:0,cr:0,lb:0,pos:0,n:0}; X.lastCue=null } });
      ["home","away"].forEach(sd=>{ const L=lead(sd); if(L!==0&&Math.abs(L)<=2)queueCall(sd,halfCall(L));   // three up at half, it's gone
        if(humans[sd])queueCall(sd,flankCall(st.S[sd].fl,st.S[sd].flLast)); else aimIt(sd) });
      if(st.queue.length)return st.next()}
    if(s===11&&!st.r2){st.r2=true; ["home","away"].forEach(sd=>{ cpuRead(sd,0.3);
      { const d=readCall(2,st.S[other(sd)].tell,st.S[other(sd)].lastCue,st.S[sd].ctr); d.pearl1=(st.p1||{})[sd]; queueCall(sd,d) }}); if(st.queue.length)return st.next()}   // what Pearl read at 25
    if(s===12&&!st.s1){st.s1=true; ["home","away"].forEach(sd=>assistantSub(sd)) }
    if(s===14&&!st.s2){st.s2=true; ["home","away"].forEach(sd=>assistantSub(sd)) }
    if(s===14&&!st.lt){st.lt=true; ["home","away"].forEach(sd=>{ if(Math.abs(lead(sd))<=1)queueCall(sd,lateCall(lead(sd))) }); if(st.queue.length)return st.next()}   // at 75', within one goal: 2.4 points a call (test/call-weight.js); at 70' with the modes below sharpened: 5.5. Two up or down, nothing either way
    if(s>=SEGS){ if(st.h===st.a){ if(st.playoff)extraTime(); else st.draw=true } st.done=true; return fin() }
    const d=segment(s); st.seg++;
    return {drive:d,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}
/* each club's usual approach this season, and the seed for its scouting report */
function clubStyle(t,year){ return APPROACH_KEYS[strHash(t+"|"+year)%APPROACH_KEYS.length] }
function gameCtx(h,a,year,step){ return {fav:{home:clubStyle(h,year),away:clubStyle(a,year)}, seed:strHash(h+"|"+a+"|"+year+"|"+step)} }
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans,opts.playoff,opts.ctx);
  let guard=0;
  while(guard++<120){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,ot:e.ot,so:e.so,pens:e.pens||null,draw:e.draw,lines:e.lines};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q}); e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,ot:0,draw:e.h===e.a,lines:e.lines};
}
