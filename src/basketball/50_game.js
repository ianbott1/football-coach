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
const BB = {
  pace: 69,             // possessions per team per game, both teams balanced
  paceSd: 3.0,
  gapPerPoss: 0.00025,  // rating gap (Elo) -> make-rate edge: about 25 Elo a point
  toBase: 0.17, toGap: 0.9,
  two: 0.52, three: 0.352,   // with fouls and and-ones, a two and a three are each worth ~1.05
  foul2: 0.085, foul3: 0.015, ft: 0.715, and1: 0.07,   // threes are rarely fouled
  oreb: 0.22,
  pressTO: 0.08,        // a press forces this many extra turnovers...
  pressEasy: 0.05,      // ...and gives up this much easier baskets when broken
  pressPace: 1.1,      // and speeds the game up
  garbage: 13,          // a lead this big after 25 minutes: the benches come in
  benchPull: 0.05       // the bench's make-rate cost to the side that's ahead
};
/* Calibrated on its own (test/bb-engine.js: 20,000 games, league spread sd
   160 Elo, home court 105 Elo): 72.8 points and 69 possessions a team, mean
   margin 11.9, game noise 12.7, home teams 59.2% (2.7 points) between equal
   sides, threes 35.2%, turnovers 0.173 a possession, overtime 6.9%.
   Real Division I: ~72, ~69, 11-12, ~11, 60-65% (~3), ~34%, ~0.18, ~6%.
   Calls (test/bb-calls.js): the press is usually right when behind late (as
   in real coaching); halftime and milking-the-clock calls are close; down 2
   on the last possession, the three is usually the better shot. */
const AGGR = {
  safe:      {tempo:1.36, three:0.18},        // work it inside: ~81 possessions against a balanced side
  balanced:  {tempo:1.00, three:0.38},
  aggressive:{tempo:0.66, three:0.64},        // shorten the game: ~57, and lots of threes
  // not gameplans: the engine's own late-game modes
  urgent:    {tempo:1.10, three:0.55},        // behind late: quick shots, threes
  sit:       {tempo:0.80, three:0.25},        // ahead late: bleed the clock
  chase:     {tempo:1.10, three:0.55},
  push:      {tempo:1.12, three:0.55}        // a coach's call: speed it up, let it fly
};
/* one possession: points scored, and a line for the box score */
function possession(rng, edge, mode, st, pressed){
  const A=AGGR[mode]||AGGR.balanced;
  if(pressed){ if(rng.r()<BB.pressTO){st.to++; return 0} edge+=BB.pressEasy }   // against the press
  if(rng.r() < BB.toBase - edge*BB.toGap*0.1){ st.to++; return 0 }
  for(let tries=0;tries<3;tries++){
    const three = rng.r() < A.three;
    // talent is worth the same per shot either way (2/3 of the edge on a
    // three), so taking more threes adds variance, not an edge
    const pMake = (three?BB.three+edge*2/3:BB.two+edge);
    if(rng.r() < (three?BB.foul3:BB.foul2)){          // fouled in the act
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

/* The calls a coach can make. dp: {k, h (headline), b (the situation),
   opts: [[key, label], ...]}. */
function halfCall(lead){
  return lead<0
    ? {k:"half",h:`Down ${-lead} at the half`,b:"Speed it up and let it fly, or stay the course?",
       opts:[["push","Speed it up, more threes"],["normal","Stay the course"]]}
    : {k:"half",h:lead>0?`Up ${lead} at the half`:"Tied at the half",b:"Slow it down and protect it, or keep going?",
       opts:[["sit","Slow it down"],["normal","Keep going"]]};
}
function lateCall(lead){
  return lead<0
    ? {k:"chase",h:`Down ${-lead}, four minutes left`,b:"Throw on the full-court press, or play it straight? The press forces turnovers and gives up easy baskets.",
       opts:[["press","Full-court press"],["normal","Play it straight"]]}
    : {k:"protect",h:`Up ${lead}, four minutes left`,b:"Milk the clock, or keep attacking?",
       opts:[["sit","Milk the clock"],["keep","Keep attacking"]]};
}
function lastCall(){
  return {k:"last",h:"Down 2, last possession",b:"A three wins it. A two sends it to overtime.",
    opts:[["three","Go for the win: three"],["two","Tie it: two, and overtime"]]};
}

/* The live game. humans: {home, away} (a bare boolean is the one-coach
   form: true = the user is home). next() plays a segment, or returns a call
   for a person to make; reply(v) answers it. */
function makeLiveGame(rng, eloH, eloA, planH, planA, humans){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const tempo=((AGGR[planH]||AGGR.balanced).tempo+(AGGR[planA]||AGGR.balanced).tempo)/2;
  const poss=Math.max(50,Math.round(rng.gauss(BB.pace*tempo,BB.paceSd)));
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const eH=gap*BB.gapPerPoss/2;
  const st={h:0,a:0,drives:[],seg:0,poss:poss,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null, answer:null,
    ot:0, done:false, last:null};
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  // calls due before a segment: queue one per human side that has one
  const queueCalls=(when)=>{
    ["home","away"].forEach(side=>{
      if(!humans[side]||st.asked[when+side])return;
      const L=lead(side); let dp=null;
      if(when==="half")dp=halfCall(L);
      else if(when==="late"&&L!==0&&Math.abs(L)<=9)dp=lateCall(L);
      else if(when==="last"&&L===-2)dp=lastCall();
      if(dp){st.asked[when+side]=true; st.queue.push({side:side,dp:dp})}
    });
  };
  const playSeg=(s)=>{
    const n=s<SEGS?Math.floor(poss/SEGS)+(s<poss%SEGS?1:0):Math.round(poss/SEGS);
    const g=gameState(Math.min(s,SEGS-1),st.h-st.a,eH,planH,planA);
    let mH=g.mH, mA=g.mA;
    // a person's calls override the computer's game management for their side
    // (a press is about the other side's possessions, not this side's mode)
    const lm=x=>x&&x!=="press"?x:null;
    if(humans.home)mH=lm(st.late.home)||st.mode.home; if(humans.away)mA=lm(st.late.away)||st.mode.away;
    if(s>=SEGS){mH="urgent";mA="urgent"}
    let dh=0,da=0, nH=n, nA=n;
    // a press: the side pressing makes the other side's possessions riskier
    // (more turnovers, but easier baskets when it's broken) and faster
    const pressH=st.late.home==="press", pressA=st.late.away==="press";
    const nn=(pressH||pressA)?Math.round(n*BB.pressPace):n;
    for(let i=0;i<Math.max(nn,nA);i++){
      dh+=possession(rng,g.eH,mH,st.lines.h,pressA); da+=possession(rng,-g.eH,mA,st.lines.a,pressH);
    }
    // the last minute of regulation: whoever is behind by one to eight fouls
    // to stop the clock, sending the leader to the line and getting the ball
    // back, up to four times (extra possessions: the game lasts longer)
    const lastSeg=s===SEGS-1, trail=st.h+dh-(st.a+da);
    const foulH=lastSeg&&trail<0&&trail>=-8, foulA=lastSeg&&trail>0&&trail<=8;
    if(foulH||foulA){
      for(let k=0;k<4;k++){
        const behindH=foulH&&st.h+dh<st.a+da, behindA=foulA&&st.a+da<st.h+dh;
        if(!behindH&&!behindA)break;
        if(behindA){ dh+=foulTrip(rng,st.lines.h); da+=possession(rng,-g.eH,"push",st.lines.a) }
        else { da+=foulTrip(rng,st.lines.a); dh+=possession(rng,g.eH,"push",st.lines.h) }
      }
    }
    st.h+=dh; st.a+=da;
    const d={seg:s,h:dh,a:da,sh:st.h,sa:st.a,ot:s>=SEGS?s-SEGS+1:0}; st.drives.push(d); return d;
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
  st.next=function(){
    if(st.done)return {done:true,h:st.h,a:st.a,drives:st.drives};
    if(st.ask)return st.ask;
    if(st.pendingSide){                               // an answer has come in
      const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null;
      if(P.dp.k==="half")st.mode[P.side]=v==="push"?"push":v==="sit"?"sit":st.mode[P.side];
      else if(P.dp.k==="chase")st.late[P.side]=v==="press"?"press":null;
      else if(P.dp.k==="protect")st.late[P.side]=v==="sit"?"sit":null;
      else if(P.dp.k==="last"){lastShot(P.side,v); st.lastDone=true}
    }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      st.ask={ask:Q.dp,mine:lead(Q.side)>=0?(Q.side==="home"?st.h:st.a):(Q.side==="home"?st.h:st.a),
              theirs:Q.side==="home"?st.a:st.h,q:st.seg<4?1:st.seg<SEGS?2:3,side:Q.side};
      const r=st.ask; st.ask=null; st.waiting=r; return r}
    if(st.seg===4&&!st.halfDone){st.halfDone=true; queueCalls("half"); if(st.queue.length)return st.next()}
    if(st.seg===SEGS-1&&!st.lateDone){st.lateDone=true; queueCalls("late"); if(st.queue.length)return st.next()}
    if(st.seg===SEGS&&!st.lastDone){
      st.lastDone=true;
      // someone trails by two with the last possession: a coin flip says who has the ball
      const trailer=st.h-st.a===-2?"home":st.a-st.h===-2?"away":null;
      if(trailer&&rng.r()<0.5){
        if(humans[trailer]){queueCalls("last"); if(st.queue.length)return st.next()}
        else lastShot(trailer,"two");                 // the computer ties it
      }
    }
    if(st.seg>=SEGS&&st.h!==st.a){st.done=true; return {done:true,h:st.h,a:st.a,drives:st.drives}}
    if(st.seg>=SEGS+6){ if(rng.r()<0.5)st.h++; else st.a++; st.done=true; return {done:true,h:st.h,a:st.a,drives:st.drives} }
    const d=playSeg(st.seg); st.seg++;
    return {drive:d,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}

/* A whole game at once (every game but the ones you watch): the same game,
   with the computer's calls, or opts.decide for a person who isn't watching. */
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans);
  let guard=0;
  while(guard++<200){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,poss:e.poss,ot:Math.max(0,e.seg-SEGS),lines:e.lines,last:e.last};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q});
      e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,poss:e.poss,ot:0,lines:e.lines};
}
