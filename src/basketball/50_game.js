/* ============ the game: basketball ============ */
/* Played possession by possession: a turnover, or a shot (two or three),
   with fouls to the line and offensive rebounds for a second chance. The
   rating gap tilts each side's make rates and turnovers; home court is a
   small edge for the home side. A gameplan sets the pace (possessions) and
   the share of threes. Twos and threes are worth the same on average, so a
   plan changes how swingy a game is, not how many points it's worth: more
   possessions and fewer threes let the better team's talent show; fewer
   possessions and more threes make it a game of chances.
   Possessions are grouped into eight five-minute segments, which the live
   view shows one at a time (the sport's "drives"). */
const DRIVES_PER_TEAM = 4;                    // segments per half; 8 in a game
const SEGS = 8;
const BB_COLLEGE = {
  pace: 69,             // possessions per team per game, both teams balanced
  paceSd: 3.0,
  gapPerPoss: 0.00039,  // rating gap (Elo) -> make-rate edge (calibrated: test/bb-calibrate.js)
  toBase: 0.164, toGap: 0.9,
  two: 0.533, three: 0.360,   // with fouls and and-ones, a two and a three are each worth ~1.05
  foul2: 0.085, foul3: 0.015, ft: 0.715, and1: 0.07,   // threes are rarely fouled
  oreb: 0.22,
  pressTO: 0.08,        // a press forces this many extra turnovers...
  pressEasy: 0.05,      // ...and gives up this much easier baskets when broken
  pressPace: 1.1,      // and speeds the game up
  garbage: 13,          // a lead this big after 25 minutes: the benches come in
  benchPull: 0.05,      // the bench's make-rate cost to the side that's ahead
  // reading the game (test/bb-reads.js)
  answer:{share:-0.10, p3:-0.03, p2:-0.035, f2:0.85, to:0.035, p2t:-0.015},   // the right defense on their style
  leak:{p2:0.012, p3:0.008},  // the wrong one: easier looks somewhere else
  cueTrue:0.4,          // commentary on a style that is about the real one
  favW:4,               // a team's usual offense: this many times as likely as any other. The report is right 61% of
                        // the time in college (70% pro); 5 made it 72%, but more predictable opponents cut March upsets
                        // (6 v 11 favourites 63.5% to 67.1%, real 61.5), so it stays (Nov 2026)
  scouted:6,            // games in a scouting report
  prepped:{p2:-0.008, p3:-0.008},   // the right defense, drilled all week: sharper than a mid-game switch
  misprep:{p2:0.008, p3:0.006},     // the wrong one from the tip: out of position until you change it
  pnrTell:[2.0,5.0],    // ball screens a segment: other styles, pick-and-roll
  starOwn:0.022,        // your star off the floor: your make rates, this much lower...
  starClutch:2.2,       // ...and this many times more in the closing segments (who finishes games)
  starDef:0.006,        // ...and theirs this much higher
  starFouls:2.6,        // a star's fouls a game, an ordinary crew
  foulOut:5,
  teamFouls:17,         // fouls called on a side a game, an ordinary crew
  crews:[[0.25,0.65],[0.5,1.0],[0.25,1.7]]   // how tight tonight's referees are: [share of games, fouls x]
};
/* a league can set its own game (LEAGUE.tuning.bb): the pros play 48
   minutes in quarters, faster, with better shooting */
const BB = Object.assign({}, BB_COLLEGE,
  (typeof LEAGUE!=="undefined"&&LEAGUE.tuning&&LEAGUE.tuning.bb)||{});
/* Calibrated on its own (test/bb-engine.js: 20,000 games, league spread sd
   160 Elo, home court 105 Elo): 72.8 points and 69 possessions a team, mean
   margin 11.9, game noise 12.7, home teams 59.2% (2.7 points) between equal
   sides, threes 35.2%, turnovers 0.173 a possession, overtime 6.9%.
   Real Division I: ~72, ~69, 11-12, ~11, 60-65% (~3), ~34%, ~0.18, ~6%.
   Calls (test/bb-calls.js): the press is usually right when behind late (as
   in real coaching); halftime and milking-the-clock calls are close; down 2
   on the last possession, the three is usually the better shot. */
const AGGR = {
  safe:      {tempo:1.08, three:0.18},        // work it inside: a little quicker. It was 1.36, which put a played NBA game at 136-142 a team (Ian, Muse, Grokbot); real paces differ by a few percent
  balanced:  {tempo:1.00, three:0.38},
  aggressive:{tempo:0.92, three:0.64},        // shorten the game: a little slower (was 0.66), and lots of threes
  // not gameplans: the engine's own late-game modes
  urgent:    {tempo:1.10, three:0.55},        // behind late: quick shots, threes
  sit:       {tempo:0.80, three:0.25},        // ahead late: bleed the clock
  chase:     {tempo:1.10, three:0.55},
  push:      {tempo:1.12, three:0.55}        // a coach's call: speed it up, let it fly
};
/* one possession: points scored, and a line for the box score */
const NOMOD={share:0,p2:0,p3:0,to:0,f2:1};
function possession(rng, edge, mode, st, pressed, m){
  const A=AGGR[mode]||AGGR.balanced; m=m||NOMOD;
  if(pressed){ if(rng.r()<BB.pressTO){st.to++; return 0} edge+=BB.pressEasy }   // against the press
  if(rng.r() < BB.toBase - edge*BB.toGap*0.1 + m.to){ st.to++; return 0 }
  for(let tries=0;tries<3;tries++){
    const three = rng.r() < Math.max(0.05,Math.min(0.85,A.three+m.share));
    // talent is worth the same per shot either way (2/3 of the edge on a
    // three), so taking more threes adds variance, not an edge
    const pMake = (three?BB.three+edge*2/3+m.p3:BB.two+edge+m.p2);
    if(rng.r() < (three?BB.foul3:BB.foul2*m.f2)){          // fouled in the act
      const n=three?3:2; let pts=0; st.fta+=n;
      for(let i=0;i<n;i++) if(rng.r()<BB.ft){pts++; st.ftm++}
      return pts;
    }
    if(three)st.tpa++; else st.fga2++;
    if(rng.r() < pMake){
      if(three)st.tpm++; else st.fgm2++;
      let pts=three?3:2;
      if(!three&&rng.r()<BB.and1){st.fta++; if(rng.r()<BB.ft){pts++;st.ftm++}}
      return pts;
    }
    if(rng.r() >= BB.oreb) return 0;                  // defense rebounds
    st.oreb++;
  }
  return 0;
}
/* How the game is managed from here, given the segment and the home lead:
   the edge (home side's) and each side's mode. */
function gameState(seg,lead,eH,planH,planA){
  const left=SEGS-seg, big=Math.abs(lead);
  let e=eH, mH=planH, mA=planA;
  if(seg>=5&&big>=BB.garbage){                    // decided: benches on both sides
    e=eH*0.4-Math.sign(lead)*BB.benchPull; mH="balanced"; mA="balanced";
  }else if(left<=2&&big>=4&&big<BB.garbage){      // late and close enough to matter
    if(lead>0){mH="sit";mA="chase"} else {mH="chase";mA="sit"}
  }
  return {eH:e,mH:mH,mA:mA};
}
const blankTeamLine=()=>({to:0,fta:0,ftm:0,tpa:0,tpm:0,fga2:0,fgm2:0,oreb:0});
/* Late, the team behind fouls: the leader goes to the line (two shots) and
   the trailer gets the ball back and hunts threes. */
function foulTrip(rng,st){let p=0; st.fta+=2; for(let i=0;i<2;i++)if(rng.r()<BB.ft){p++;st.ftm++} return p}

/* Every side has a way of scoring: bombing threes, pounding the paint, or
   running pick-and-roll. Each leaves a mark on the shot chart (three-point
   attempts, points in the paint, ball screens), and each has a defense that
   blunts it; the wrong defense leaks somewhere else. */
const STYLE={
  threes:{l:"bombing threes",       mod:{share:0.15, p2:0,     p3:-0.006, to:0,     f2:1},   answer:"chase"},
  paint: {l:"pounding the paint",   mod:{share:-0.15,p2:-0.005,p3:0,      to:0,     f2:1.2}, answer:"pack"},
  pnr:   {l:"running pick-and-roll",mod:{share:0,    p2:0.006, p3:0,      to:0.008, f2:1},   answer:"trap"}
};
const STYLE_KEYS=["threes","paint","pnr"];
const DEFENSES={
  chase:{beats:"threes",l:"Run them off the line",  d:"Close out hard, switch everything, live with drives"},
  pack: {beats:"paint", l:"Pack the paint: zone",    d:"Wall off the rim, make them shoot over it"},
  trap: {beats:"pnr",   l:"Trap the ball handler",   d:"Blitz the pick-and-roll, make someone else beat you"}
};
/* the offense a side runs, against the defense it faces: one possession's modifier */
function styleMod(off,def,prepd){
  const b=STYLE[off].mod, m={share:b.share,p2:b.p2,p3:b.p3,to:b.to,f2:b.f2};
  if(def){ if(DEFENSES[def].beats===off){ const A=BB.answer;
      if(off==="threes"){m.share+=A.share; m.p3+=A.p3}
      else if(off==="paint"){m.p2+=A.p2; m.f2*=A.f2}
      else {m.to+=A.to; m.p2+=A.p2t} }
    else { m.p2+=BB.leak.p2; m.p3+=BB.leak.p3 }
    if(prepd){ const P=DEFENSES[def].beats===off?BB.prepped:BB.misprep; m.p2+=P.p2; m.p3+=P.p3 } }
  return m;
}
function bbRead(T){
  // the share of shots from three, and the ball screens: which style fits best
  const n=Math.max(1,T.n), f=Math.max(1,T.fga), r=T.tpa/f;
  const ll=k=>{ const rk=0.38+STYLE[k].mod.share, sr=Math.sqrt(rk*(1-rk)/f), mu=(k==="pnr"?BB.pnrTell[1]:BB.pnrTell[0])*n, sp=1.3*Math.sqrt(n);
    return -((r-rk)**2)/(2*sr*sr)-((T.pnr-mu)**2)/(2*sp*sp) };
  return STYLE_KEYS.reduce((a,k)=>ll(k)>ll(a)?k:a,STYLE_KEYS[0]);
}
const ASSIST=["normal","Leave it to your assistant"];
/* The calls a coach can make. dp: {k, h (headline), b (the situation),
   opts: [[key, label], ...]}; the last option always leaves it to the assistant. */
function readCall(stage,T,hint,cur){
  // "keep your setup" first when you have one, as in soccer (Instinct): "leave it to your assistant" hands the read back
  return {k:"read",stage:stage,h:stage===1?(BB.quarters?"End of the first quarter":"Ten minutes in"):"Half-time: their offense",
    b:stage===1?"How are they scoring? Pick the defense.":"Anything changed? Adjust the defense, or leave it.",
    // your current defense once, as "keep" (it was listed twice, the plain one identical to keeping: Instinct)
    opts:(stage===2&&cur&&DEFENSES[cur]?[["keep","Keep your setup: "+DEFENSES[cur].l]]:[]).concat(Object.keys(DEFENSES).filter(d=>!(stage===2&&d===cur)).map(d=>[d,DEFENSES[d].l])).concat([ASSIST]),
    tell:{tpa:T.tpa,fga:T.fga,paint:T.paint,pnr:T.pnr,n:T.n}, best:bbRead(T), pearl:hint||bbRead(T)};
}
function foulCall(half,X,T,seg){
  return {k:"fouls",h:`Your star has ${X.f} fouls`,b:half===1?"Sit him until the half, or ride it out?":"Sit him until the last ten minutes, or leave him in?",
    opts:[["sit",half===1?"Sit him until the half":"Sit him until crunch time"],["play","Leave him in"],ASSIST],
    f:X.f, out:BB.foulOut, called:T.fouls, avg:Math.round(BB.teamFouls*2*seg/SEGS), pearl:T.lastSeg};
}
function halfCall(lead){
  return lead<0
    ? {k:"half",h:`Down ${-lead} at the half`,b:"Speed it up and let it fly, or stay the course?",
       opts:[["push","Speed it up, more threes"],["keep","Stay the course"],ASSIST]}
    : {k:"half",h:lead>0?`Up ${lead} at the half`:"Tied at the half",b:"Slow it down and protect it, or keep going?",
       opts:[["sit","Slow it down"],["keep","Keep going"],ASSIST]};
}
function lateCall(lead){
  return lead<0
    ? {k:"chase",h:`Down ${-lead}, ${BB.lateLeft||"five"} minutes left`,b:"Throw on the full-court press, or play it straight? The press forces turnovers and gives up easy baskets.",
       opts:[["press","Full-court press"],["keep","Play it straight"],ASSIST]}
    : {k:"protect",h:`Up ${lead}, ${BB.lateLeft||"five"} minutes left`,b:"Milk the clock, or keep attacking?",
       opts:[["sit","Milk the clock"],["keep","Keep attacking"],ASSIST]};
}
/* crunch time, level or ahead: a timeout, and what they go to now. Close teams lean on a closing play of their own
   (the report of their last close finishes); some stay with what they've run tonight. Measured as a call
   (test/call-weight.js), not a clock choice: milking it or attacking moved about 3 points and was cut (round 33).
   Grokbot: elimination games and a tied finish into overtime came and went with no call. */
/* a lead of 10 to 12 with a call's worth left: rest the starters now, or keep them in until it's safe (the bench
   comes in by itself at 13). The bench makes fewer shots; the starters can't get hurt from the bench. Muse and
   Grokbot: a decided game had nothing in its second half to decide, while real coaches make exactly this call
   (and Muse's college point guard was hurt in one). */
function restCall(lead){
  return {k:"rest",h:`Up ${lead}, ${BB.lateLeft||"five"} minutes left`,
    b:"Rest your starters? The bench finishes it: a lead this size usually holds, though not always, and nobody gets hurt sitting down. Keep them in and they close it out, at the usual risk.",
    opts:[["rest","Rest the starters"],["keep","Keep them in until it's safe"],["normal","Leave it to your assistant"]]};
}
function closeCall(lead,rep,n,cur){
  const top=STYLE_KEYS.reduce((a,k)=>rep[k]>rep[a]?k:a,STYLE_KEYS[0]);
  return {k:"close",h:`${lead>0?"Up "+lead:"Tied"}, ${BB.lateLeft||"five"} minutes left`,
    b:"Timeout. They'll go to their closing play, or stay with what's worked tonight. What do you take away?",
    opts:(cur&&DEFENSES[cur]?[["keep","Keep your setup: "+DEFENSES[cur].l]]:[]).concat(Object.keys(DEFENSES).filter(d=>d!==cur).map(d=>[d,DEFENSES[d].l])).concat([ASSIST]),
    report:Object.assign({},rep), n:n, pearl:top};
}
function lastCall(){
  return {k:"last",h:"Down 2, last possession",b:"A three wins it. A two sends it to overtime.",
    opts:[["three","Go for the win: three"],["two","Tie it: two, and overtime"],ASSIST]};
}

/* The live game. humans: {home, away} (a bare boolean is the one-coach
   form: true = the user is home). next() plays a segment, or returns a call
   for a person to make; reply(v) answers it. */
/* the scouting report: the offenses a team ran in its last few games,
   drawn from its own seed so it never moves the game */
function scoutReport(fav,seed){
  const r=new RNG(seed>>>0), w=STYLE_KEYS.map(k=>k===fav?BB.favW:1), tot=w.reduce((a,b)=>a+b), n={};
  STYLE_KEYS.forEach(k=>n[k]=0);
  for(let g=0;g<BB.scouted;g++){ let x=r.r()*tot, i=0; while(x>w[i]){x-=w[i];i++} n[STYLE_KEYS[i]]++ }
  return n;
}
function prepCall(rep){
  const top=STYLE_KEYS.reduce((a,k)=>rep[k]>rep[a]?k:a,STYLE_KEYS[0]);
  return {k:"prep",h:"Before tip-off: the scouting report",b:"Game-plan for how they usually score, or wait and see?",
    opts:Object.keys(DEFENSES).map(d=>[d,DEFENSES[d].l]).concat([["normal","Wait and see: leave it to your assistant"]]),
    report:Object.assign({},rep), n:BB.scouted, pearl:top};
}
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, playoff, ctx){
  ctx=ctx||{}; const fav=ctx.fav||{};
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const tempo=((AGGR[planH]||AGGR.balanced).tempo+(AGGR[planA]||AGGR.balanced).tempo)/2;
  const poss=Math.max(50,Math.round(rng.gauss(BB.pace*tempo,BB.paceSd)));
  // a mismatch past BB.softGap counts half: the better side rests and coasts, so
  // even a great team loses some (unset: no change). Pro: 82-0 happened.
  const rawGap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1), sg=BB.softGap;
  const gap=sg&&Math.abs(rawGap)>sg?Math.sign(rawGap)*(sg+(Math.abs(rawGap)-sg)*0.5):rawGap;
  const eH=gap*BB.gapPerPoss/2;
  // tonight's referees
  let cx=rng.r(), crew=1; for(const [w,f] of BB.crews){ if(cx<w){crew=f;break} cx-=w }
  const side0=()=>({off:null, def:null, f:0, sitTo:-1, out:false, asked1:false, asked2:false,
    tell:{tpa:0,fga:0,paint:0,pnr:0,n:0}, lastCue:null});
  const st={h:0,a:0,drives:[],seg:0,poss:poss,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null, answer:null,
    ot:0, done:false, last:null, crew:crew, S:{home:side0(),away:side0()}, fouls:{home:0,away:0}, lastSeg:{home:0,away:0}};
  const other=sd=>sd==="home"?"away":"home";
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  // a side's offense: a person's from the gameplan, the computer's by chance
  const pickOff=(side)=>{ const m=st.mode[side];
    if(humans[side]&&m==="safe")return "paint"; if(humans[side]&&m==="aggressive")return "threes";
    if(!fav[side])return STYLE_KEYS[rng.int(3)];
    const w=STYLE_KEYS.map(k=>k===fav[side]?BB.favW:1); let x=rng.r()*w.reduce((a,b)=>a+b), i=0; while(x>w[i]){x-=w[i];i++} return STYLE_KEYS[i] };
  st.S.home.off=pickOff("home"); st.S.away.off=pickOff("away");
  st.gap=gap;
  const readIt=(side,p)=>{ if(rng.r()<p){st.S[side].def=STYLE[st.S[other(side)].off].answer; st.S[side].prepd=false} };
  const queueCall=(side,dp)=>{ const key=dp.k+(dp.stage||"")+side; if(!humans[side]||st.asked[key])return;
    st.asked[key]=true; st.queue.push({side:side,dp:dp}) };
  // calls due before a segment: the old score calls
  const queueCalls=(when)=>{
    ["home","away"].forEach(side=>{
      if(!humans[side])return;
      const L=lead(side); let dp=null;
      // not at 20 either way: neither answer moves a game that's gone (Instinct: comfortable-lead busywork)
      if(when==="half"){ if(Math.abs(L)<20)dp=halfCall(L) }
      // only when behind: protecting a lead (milk the clock or keep attacking) measured about 3 points a call and
      // 0.1 a game, close either way two times in three (round 33): cut, as Ian's rule asks
      else if(when==="late"&&L<0&&L>=-9)dp=lateCall(L);
      else if(when==="late"&&L>=10&&L<BB.garbage)dp=restCall(L);
      else if(when==="late"&&L>=0&&L<=9){
        if(L>0)st.late[side]="auto";   // the clock: your assistant closes it out, as he would have (round 33)
        const o=other(side), O=st.S[o];
        if(!humans[o]){ const cp=(ctx.close&&ctx.close[o])||fav[o]||O.off;
          O.closeTo=rng.r()<(BB.closePref||0.6)?cp:O.off;
          dp=closeCall(L,scoutReport(cp,(ctx.seed||0)+(o==="home"?11:12)),BB.scouted,st.S[side].def) } }
      else if(when==="last"&&L===-2)dp=lastCall();
      if(dp)queueCall(side,dp);
    });
  };
  const starOn=(X,s)=>!X.out&&!(s<X.sitTo);
  const playSeg=(s)=>{
    const n=s<SEGS?Math.floor(poss/SEGS)+(s<poss%SEGS?1:0):Math.round(poss/SEGS);
    const g=gameState(Math.min(s,SEGS-1),st.h-st.a,eH,planH,planA);
    let mH=g.mH, mA=g.mA;
    // a person's calls override the computer's game management for their side
    // (a press is about the other side's possessions, not this side's mode);
    // "auto" hands it back to the assistant, who manages as the computer does
    const lm=(x,plan)=>x==="auto"?null:x==="keep"?plan:x&&x!=="press"?x:null;
    if(humans.home&&st.late.home!=="auto")mH=lm(st.late.home,st.mode.home)||st.mode.home;
    if(humans.away&&st.late.away!=="auto")mA=lm(st.late.away,st.mode.away)||st.mode.away;
    if(s>=SEGS){mH="urgent";mA="urgent"}
    const H=st.S.home, A=st.S.away;
    // stars off the floor: in foul trouble, or fouled out
    const onH=starOn(H,s), onA=starOn(A,s);
    const cl=s>=SEGS-2?BB.starClutch:1, so=BB.starOwn*cl, sd=BB.starDef*cl;
    const rH=st.rest&&st.rest.home?BB.benchPull*0.5:0, rA=st.rest&&st.rest.away?BB.benchPull*0.5:0;   // a rested side's bench, for the last few minutes
    const ehH=g.eH-(onH?0:so)+(onA?0:sd)-rH+rA, ehA=-g.eH-(onA?0:so)+(onH?0:sd)-rA+rH;
    const modH=styleMod(H.off,A.def,A.prepd), modA=styleMod(A.off,H.def,H.prepd);
    let dh=0,da=0, nA=n;
    const pressH=st.late.home==="press", pressA=st.late.away==="press";
    const nn=(pressH||pressA)?Math.round(n*BB.pressPace):n;
    const L0h=Object.assign({},st.lines.h), L0a=Object.assign({},st.lines.a);
    const ev=(st.pendEv||[]).splice(0), t0=s;
    const pStar=BB.starFouls/Math.max(40,poss)*crew;
    for(let i=0;i<Math.max(nn,nA);i++){
      dh+=possession(rng,ehH,mH,st.lines.h,pressA,modH); da+=possession(rng,ehA,mA,st.lines.a,pressH,modA);
      // the stars' fouls: on defense, while on the floor
      // a star who fouls out mid-stretch is gone at once (Muse: an "8th foul" in a six-foul league); the
      // dice are drawn as before, so nothing else in the game moves
      if(s<SEGS){ if(onH&&rng.r()<pStar){ const u=rng.int(100); if(!H.out){ H.f++; ev.push({side:"home",k:"foul",f:H.f,u:u}); if(H.f>=BB.foulOut){H.out=true; H.outEv={side:"home",k:"out"}; ev.push(H.outEv)} } }
        if(onA&&rng.r()<pStar){ const u=rng.int(100); if(!A.out){ A.f++; ev.push({side:"away",k:"foul",f:A.f,u:u}); if(A.f>=BB.foulOut){A.out=true; A.outEv={side:"away",k:"out"}; ev.push(A.outEv)} } } }
    }
    [["home",H],["away",A]].forEach(([sd,X])=>{ if(X.outEv&&X.outEv.u===undefined){ X.outEv.u=rng.int(100); delete X.outEv }   // drawn where it always was
      else if(!X.out&&X.f>=BB.foulOut){X.out=true; ev.push({side:sd,k:"out",u:rng.int(100)})} });
    // the last minute of regulation: whoever is behind by one to eight fouls
    // to stop the clock, sending the leader to the line and getting the ball
    // back, up to four times (extra possessions: the game lasts longer)
    const lastSeg=s===SEGS-1, trail=st.h+dh-(st.a+da);
    const foulH=lastSeg&&trail<0&&trail>=-8, foulA=lastSeg&&trail>0&&trail<=8;
    if(foulH||foulA){
      for(let k=0;k<4;k++){
        const behindH=foulH&&st.h+dh<st.a+da, behindA=foulA&&st.a+da<st.h+dh;
        if(!behindH&&!behindA)break;
        if(behindA){ dh+=foulTrip(rng,st.lines.h); da+=possession(rng,ehA,"push",st.lines.a) }
        else { da+=foulTrip(rng,st.lines.a); dh+=possession(rng,ehH,"push",st.lines.h) }
      }
    }
    // the shot chart: attempts, points in the paint, ball screens; fouls called
    [["home",st.lines.h,L0h],["away",st.lines.a,L0a]].forEach(([sd,L,L0])=>{ const X=st.S[sd], T=X.tell;
      const tpa=L.tpa-L0.tpa, fga=tpa+L.fga2-L0.fga2, paint=2*(L.fgm2-L0.fgm2);
      T.tpa+=tpa; T.fga+=fga; T.paint+=paint; T.pnr+=Math.max(0,Math.round(rng.gauss(X.off==="pnr"?BB.pnrTell[1]:BB.pnrTell[0],1.3))); T.n++;
      // highlights: threes made, buckets inside
      const m3=L.tpm-L0.tpm, m2=L.fgm2-L0.fgm2;
      if(m3>=2||(m3&&rng.r()<0.5))ev.push({side:sd,k:"three",n:m3,u:rng.int(100)});
      if(m2>=4&&rng.r()<0.6)ev.push({side:sd,k:"inside",n:m2,u:rng.int(100)});
      if(rng.r()<0.3){ const k=rng.r()<BB.cueTrue?X.off:rng.pick(STYLE_KEYS), u=rng.int(100);
        ev.push({side:sd,k:"cue",cue:k,u:u}); if(u%3===0)X.lastCue=k }
      const tf=Math.max(0,Math.round(rng.gauss(BB.teamFouls/SEGS*crew,1.4)));
      st.fouls[sd]+=tf; st.lastSeg[sd]=tf });
    st.h+=dh; st.a+=da;
    const d={seg:s,h:dh,a:da,sh:st.h,sa:st.a,ot:s>=SEGS?s-SEGS+1:0,ev:ev,
      T:{home:Object.assign({},H.tell),away:Object.assign({},A.tell)}, star:{home:[H.f,onH,H.out],away:[A.f,onA,A.out]},
      fouls:Object.assign({},st.fouls)};
    st.drives.push(d); return d;
  };
  // the last possession, when a side trails by two: a three to win or a two to tie
  const lastShot=(side,choice)=>{
    const L=st.lines[side==="home"?"h":"a"], e=side==="home"?eH:-eH;
    const three=choice==="three";
    if(three)L.tpa++; else L.fga2++;
    const made=rng.r()<(three?BB.three+e*2/3:BB.two+e);
    if(made){ if(three)L.tpm++; else L.fgm2++;
      if(side==="home")st.h+=three?3:2; else st.a+=three?3:2 }
    st.last={side:side,choice:choice,made:made};
    st.drives.push({seg:"last",side:side,choice:choice,made:made,sh:st.h,sa:st.a});
  };
  // foul trouble: the computer (and your assistant) sits him, as most coaches do
  const troubleAt=(s,X)=>{ if(X.out||s<X.sitTo)return 0;
    if(s>=1&&s<=3&&!X.asked1&&X.f>=BB.foulOut-3)return 1;
    if(s>=4&&s<=6&&!X.asked2&&X.f>=BB.foulOut-2)return 2; return 0 };
  const sitStar=(X,half)=>{ X.sitTo=half===1?4:6 };
  st.log=[];            // the person's reads, and what was true (for the result screen)
  // did the numbers on the card mark what they were doing? (the card's own marks: three-point share
  // 45%+ or 31%- , pick-and-rolls 3.4+ a stretch). If not, a miss isn't held against you (Instinct: 38%
  // threes against a 39% average, nothing marked, and "wrong: they were bombing threes")
  const shownOf=(dp,t)=>{ const T=dp.tell; if(!T)return true; const sh=100*T.tpa/Math.max(1,T.fga), n=Math.max(1,T.n);
    return t==="threes"?sh>=45:t==="paint"?sh<=31:t==="pnr"?T.pnr/n>=3.4:true };
  const apply=(side,dp,v)=>{
    const X=st.S[side];
    if(dp.k==="prep"){ if(DEFENSES[v]){ const t=st.S[other(side)].off; X.def=v; X.prepd=true;
      st.log.push({side:side,h:dp.h,k:"prep",pick:v,truth:t,right:DEFENSES[v].beats===t,split:(()=>{const a=Object.values(dp.report).sort((x,y)=>y-x);return a[0]===a[1]?a.filter(x=>x>0).join("-"):false})()}); { const L=st.log[st.log.length-1]; if(L.split)L.unclear=true }   // a split report is a coin flip: not graded either way (Grokbot: 3-3 graded "right")
      } else if(v!==undefined&&dp.report){ const t=st.S[other(side)].off, ks=Object.keys(dp.report).sort((a,b)=>dp.report[b]-dp.report[a]);
        // waiting is a decision too, graded on whether the report's favourite was right (Muse, round 39: no trace on the card)
        st.log.push({side:side,h:dp.h,k:"prep",pick:"wait",waited:true,fav:ks[0],truth:t,right:ks[0]!==t,unclear:dp.report[ks[0]]===dp.report[ks[1]]}) } return }
    if(dp.k==="read"&&v==="keep"&&DEFENSES[X.def]){ const t=st.S[other(side)].off, ok=DEFENSES[X.def].beats===t; st.log.push({side:side,h:dp.h,k:"read",pick:X.def,truth:t,right:ok,evid:dp.best,unclear:!ok&&!shownOf(dp,t)}); return }
    if(dp.k==="read"&&DEFENSES[v]){ const t=st.S[other(side)].off, ok=DEFENSES[v].beats===t; st.log.push({side:side,h:dp.h,k:"read",pick:v,truth:t,right:ok,evid:dp.best,unclear:!ok&&!shownOf(dp,t)}) }
    if(dp.k==="read"){ if(DEFENSES[v]){ if(v!==X.def)X.prepd=false; X.def=v } else readIt(side,dp.stage===2?0.3:0.45); return }
    if(dp.k==="fouls"){ if(v!=="play")sitStar(X,dp.half); return }
    if(dp.k==="half"){ st.mode[side]=v==="push"?"push":v==="sit"?"sit":st.mode[side]; return }
    if(dp.k==="chase"){ st.late[side]=v==="press"?"press":v==="keep"?"keep":"auto"; return }
    if(dp.k==="protect"){ st.late[side]=v==="sit"?"sit":v==="keep"?"keep":"auto"; return }
    if(dp.k==="rest"){ st.late[side]="auto"; if(v==="rest"){ st.rest=st.rest||{}; st.rest[side]=true }
      st.log.push({side:side,k:"rest",pick:v==="rest"?"rest":"keep",unclear:true}); return }   // not right or wrong: priced in knocks, not wins
    if(dp.k==="close"){ const O=st.S[other(side)]; if(O.closeTo)O.off=O.closeTo; const t=O.off;
      const pick=v==="keep"?X.def:DEFENSES[v]?v:null;
      if(pick&&DEFENSES[pick]){ st.log.push({side:side,h:dp.h,k:"close",pick:pick,truth:t,right:DEFENSES[pick].beats===t}); if(pick!==X.def)X.prepd=false; X.def=pick }
      else readIt(side,0.45);
      return }
    if(dp.k==="last"){ lastShot(side,v==="three"?"three":"two"); st.lastDone=true }
  };
  st.next=function(){
    if(st.done)return {done:true,h:st.h,a:st.a,drives:st.drives};
    if(st.ask)return st.ask;
    if(st.pendingSide){ const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null; apply(P.side,P.dp,v) }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      st.ask={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,
              theirs:Q.side==="home"?st.a:st.h,q:st.seg<4?1:st.seg<SEGS?2:3,side:Q.side};
      const r=st.ask; st.ask=null; st.waiting=r; return r}
    const s=st.seg;
    if(s===0&&!st.p0){st.p0=true; ["home","away"].forEach(sd=>{ const o=other(sd);
      if(humans[sd]&&!humans[o]&&fav[o])queueCall(sd,prepCall(scoutReport(fav[o],(ctx.seed||0)+(o==="home"?1:2)))) });
      if(st.queue.length)return st.next()}
    // foul trouble, either side, before any segment of regulation
    if(s<SEGS&&st.ft!==s){ st.ft=s; ["home","away"].forEach(sd=>{ const X=st.S[sd], h=troubleAt(s,X); if(!h)return;
        if(h===1)X.asked1=true; else X.asked2=true;
        // measured as a call (sit him or ride it out, by how tight the referees are)
        // it was worth nothing either way, so it isn't one: he sits, as most coaches do
        sitStar(X,h); st.pendEv=(st.pendEv||[]).concat([{side:sd,k:"sit",f:X.f,u:rng.int(100)}]) });
      if(st.queue.length)return st.next() }
    // the reads: end of the first quarter (two segments), and the half
    if(s===2&&!st.r1){st.r1=true; ["home","away"].forEach(sd=>{ const O=st.S[other(sd)];
        if(humans[sd]){ const d=readCall(1,O.tell,O.lastCue); (st.p1=st.p1||{})[sd]=d.pearl; (st.b1=st.b1||{})[sd]=d.best; queueCall(sd,d) } else readIt(sd,0.45) });
      if(st.queue.length)return st.next()}
    if(s===4&&!st.halfDone){st.halfDone=true; ["home","away"].forEach(sd=>{ const O=st.S[other(sd)];
        if(humans[sd]){ const d=readCall(2,O.tell,O.lastCue,st.S[sd].def); d.pearl1=(st.p1||{})[sd]; d.best1=(st.b1||{})[sd]; queueCall(sd,d) } else if(rng.r()<0.3)readIt(sd,1) });   // what Pearl read the first time
      queueCalls("half"); if(st.queue.length)return st.next()}
    if(s===SEGS-1&&!st.lateDone){st.lateDone=true; queueCalls("late"); if(st.queue.length)return st.next()}
    if(s===SEGS&&!st.lastDone){
      st.lastDone=true;
      // someone trails by two with the last possession: a coin flip says who has the ball
      const trailer=st.h-st.a===-2?"home":st.a-st.h===-2?"away":null;
      if(trailer&&rng.r()<0.5){
        if(humans[trailer]){queueCalls("last"); if(st.queue.length)return st.next()}
        else lastShot(trailer,"two");                 // the computer ties it
      }
    }
    if(s>=SEGS&&st.h!==st.a){st.done=true; return {done:true,h:st.h,a:st.a,drives:st.drives}}
    if(s>=SEGS+6){ if(rng.r()<0.5)st.h++; else st.a++; st.done=true; return {done:true,h:st.h,a:st.a,drives:st.drives} }
    const d=playSeg(s); st.seg++;
    return {drive:d,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}

/* A whole game at once (every game but the ones you watch): the same game,
   with the computer's calls, or opts.decide for a person who isn't watching. */
/* each team's usual offense this season, and the seed for its scouting report */
function clubStyle(t,year){ return STYLE_KEYS[strHash(t+"|"+year)%STYLE_KEYS.length] }
function clubClose(t,year){ return STYLE_KEYS[strHash(t+"|close|"+year)%STYLE_KEYS.length] }   // what they go to in a close finish
function gameCtx(h,a,year,step){ return {fav:{home:clubStyle(h,year),away:clubStyle(a,year)}, close:{home:clubClose(h,year),away:clubClose(a,year)}, seed:strHash(h+"|"+a+"|"+year+"|"+step)} }
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans,opts.playoff,opts.ctx);
  let guard=0;
  while(guard++<200){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,poss:e.poss,ot:Math.max(0,e.seg-SEGS),lines:e.lines,last:e.last};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q});
      e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,poss:e.poss,ot:0,lines:e.lines};
}
