/* ============ live game engine ============ */
/* Games are played out drive by drive and the score emerges from them, so a
   decision made in the fourth quarter genuinely changes the ending. */

const DRIVES_PER_TEAM = (LEAGUE.tuning&&LEAGUE.tuning.drives)||12;   // the league sets its pace
/* How much a rating gap is worth on the field. College gaps are enormous; a
   pro league's are small but decide more, so a league can steepen it. */
const GAP_SCALE = (LEAGUE.tuning&&LEAGUE.tuning.gapScale)||1;
/* A league can have teams manage the game late: sit on a three-score lead in
   the fourth quarter, take risks when well behind. Applies only to a side
   nobody is calling; a coach makes that choice for himself. */
const GAME_STATE = !!(LEAGUE.tuning&&LEAGUE.tuning.gameState);
function situational(aggr,i,total,mine,theirs){
  if(!GAME_STATE||i<total*0.75)return aggr;
  const d=mine-theirs;
  return d>=17?"sit":d<=-9?"chase":aggr;
}
const MAX_CALLS = 6;          // how many decisions a single game will ask of you (it was 3, and most games asked 2:
                              // testers, Nov 2026: "a coached game asks less of you than one real drive does")
/* a call worth asking: not in a game that's decided (a fourth and 12 at 37-17, a fourth and 1
   down 27 were asked and graded irrelevant: Instinct, Grokbot) */
function callMatters(q,diff){ const a=Math.abs(diff); return !(a>=28||(q>=3&&a>=21)||(q===4&&a>=17)) }
/* a rough chance of winning from the score, the quarter and the strengths: a fourth down asked when it was
   under 10% or over 90% moved 2.2-2.9 points; between, 9.2 (test/call-weight.js, 276 calls, Nov 2026; strength /15 fitted: kept 9.2, dropped 3.2) */
function inReach(q,diff,edge){ const frac=Math.max(0.05,(4-Math.min(4,q)+0.5)/4), z=(diff+edge/15*frac)/(13*Math.sqrt(frac));
  const p=0.5*(1+erfApprox(z/Math.SQRT2)); return p>=0.1&&p<=0.9 }
function erfApprox(x){ const t=1/(1+0.3275911*Math.abs(x)), y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return x>=0?y:-y }

/* Aggression presets, used both as a pre-game plan and as an in-game choice. */
/* A gameplan is a trade between talent and chance. gap scales how much the
   rating gap counts on the side's own drives: safe lets the better team's
   talent show, risk makes the game more of a coin flip. At even strength the
   three are worth the same; an underdog should take risks, a favourite
   should play it safe. td/fg/to only change how it looks (more field goals
   and fewer turnovers when safe; more touchdowns and turnovers when
   risky), set so they don't change who wins. See test/plans.js. */
const AGGR = {
  safe:      {td:-0.015, fg:+0.035, to:-0.015, gap:1.30},   // rebalanced Nov 2026 (turnovers now give the ball
                                                            // at the spot): even strength within 0.4 of each other over 40,000 games
  balanced:  {td: 0,     fg: 0,     to: 0,     gap:1.00},
  aggressive:{td:+0.022, fg:-0.045, to:+0.030, gap:0.55},
  // not a gameplan: the engine's own urgency, for overtime and for a fourth
  // down it has decided to go for (the old "aggressive" numbers)
  urgent:    {td:+0.082, fg:-0.060, to:+0.086, gap:1.00},
  // late-game management for sides nobody is calling (see situational):
  // sitting on a lead burns clock, chasing a deficit takes shots
  sit:       {td:-0.050, fg:+0.058, to:-0.070, gap:1.00},
  chase:     {td:+0.082, fg:-0.060, to:+0.086, gap:1.00},
  // your call to force it on a last possession: touchdown or bust. Right
  // when you need a touchdown; a mistake when a field goal would do.
  force:     {td:+0.080, fg:-0.120, to:+0.090, gap:1.00}
};

/* Chance of each outcome on one drive, given the gap between the two teams. */
function driveOdds(offElo, defElo, startYd, aggr){
  const A = AGGR[aggr] || AGGR.balanced;
  // risk makes a drive less about who is better; safe makes it more so
  const x = (offElo - defElo) * GAP_SCALE / 470 * (A.gap || 1);
  const field = (startYd - 27) / 100;              // better starting spot helps
  let td = 0.238 + x * 0.115 + field * 0.24 + A.td;
  let fg = 0.170 + x * 0.0227 + field * 0.10 + A.fg;
  let to = 0.135 - x * 0.0339 + A.to;
  td = Math.max(0.02, Math.min(0.62, td));
  fg = Math.max(0.03, Math.min(0.30, fg));
  to = Math.max(0.03, Math.min(0.30, to));
  return {td:td, fg:fg, to:to};
}

function rollDrive(rng, offElo, defElo, startYd, aggr){
  const o = driveOdds(offElo, defElo, startYd, aggr);
  const r = rng.r();
  if (r < o.td) return {pts:7, kind:"TD", stall:100};
  if (r < o.td + o.fg) return {pts:3, kind:"FG", stall:Math.min(92,startYd+Math.round(rng.range(12,40)))};
  if (r < o.td + o.fg + o.to) {
    return {pts:0, kind: rng.r()<0.55 ? "INT" : "FUM",
            stall:Math.min(96,startYd+Math.round(rng.range(0,42)))};
  }
  // the drive stalled: where it died, and how far short, decide the options
  const gain = Math.round(rng.gauss(22,17));
  const stall = Math.max(startYd-6, Math.min(96, startYd+gain));
  const u = rng.r();
  const togo = u<0.24?1 : u<0.42?2 : u<0.56?3 : u<0.68?4 : u<0.78?5 :
               u<0.86?7 : u<0.93?9 : Math.round(rng.range(11,17));
  const s = rng.r();
  let kind = s<0.70 ? "PUNT" : (s<0.86 ? "DOWNS" : "MISS");
  if (stall>=72 && kind==="PUNT") kind="MISS";       // you don't punt from there
  return {pts:0, kind:kind, stall:stall, togo:togo};
}

/* Field-goal success by distance (stall yard -> attempt length). */
/* a smooth curve through the old steps' middles: every yard counts (it was a staircase: 80% from 33 to
   40 yards, 66% from 41 to 47, so a 41-yarder and a 47-yarder were the same kick: Grokbot, Instinct) */
const FG_CURVE=[[18,0.97],[25,0.95],[32,0.88],[40,0.78],[47,0.65],[54,0.48],[60,0.32],[70,0.15]];
function fgOdds(stall){
  const d=(100-stall)+17, C=FG_CURVE;
  if(d<=C[0][0])return C[0][1];
  for(let i=1;i<C.length;i++){ if(d<=C[i][0]){ const [a,pa]=C[i-1],[b,pb]=C[i]; return pa+(pb-pa)*(d-a)/(b-a) } }
  return C[C.length-1][1];
}
function fgDistance(stall){ return (100-stall)+17; }

/* Fourth-down conversion: distance is what matters, quality adjusts it. */
function goOdds(togo, offElo, defElo){
  const base = 0.68 / (1 + 0.165*(Math.max(1,togo)-1));
  const adj = (offElo-defElo) * GAP_SCALE / 3400;
  return Math.max(0.12, Math.min(0.82, base + adj));
}

/* Where a drive starts, given how the previous one ended, and where: a turnover or a miss gives the
   other side the ball at the spot (it was a random ~42 whatever the spot, so a fumble at their 10 handed
   them the ball near midfield: "a kickoff after a Denver fumble", "started own 72": Grokbot) */
const PUNT_GROSS=45;
function nextStart(rng, prevKind, at){
  const cl=(x,a,b)=>Math.round(Math.max(a,Math.min(b,x)));
  if (at!==undefined&&at!==null){
    if (prevKind === "INT") return cl(100-at+rng.gauss(6,9), 2, 95);      // and a return
    if (prevKind === "FUM") return cl(100-at+rng.gauss(2,4), 2, 95);
    if (prevKind === "DOWNS") return cl(100-at, 4, 95);
    if (prevKind === "MISS") return cl(Math.max(20,100-at+7), 20, 80);   // the spot of the kick, or the 20
    // a punt goes from where it's kicked: ~45 yards and a short return, or a touchback. It was the
    // opponent's 24 whatever the spot, so punting from your own 10 cost nothing and pinning them from
    // midfield gained nothing, and going for it won most fourth downs (Instinct)
    if (prevKind === "PUNT"){ const land=100-at-rng.gauss(PUNT_GROSS,7); return land<=0?20:cl(land+Math.max(0,rng.gauss(6,5)),2,70) }
  }
  if (prevKind === "TD" || prevKind === "FG") return Math.round(rng.gauss(26, 6));
  if (prevKind === "PUNT") return Math.round(Math.max(4, Math.min(60, rng.gauss(24, 10))));
  if (prevKind === "INT" || prevKind === "FUM") return Math.round(Math.max(4, Math.min(75, rng.gauss(42, 16))));
  if (prevKind === "DOWNS") return Math.round(Math.max(10, Math.min(80, rng.gauss(48, 12))));
  if (prevKind === "MISS") return Math.round(Math.max(15, Math.min(60, rng.gauss(32, 8))));
  return Math.round(rng.gauss(26, 6));
}

/* Play a whole game out, drive by drive. If a decision hook is supplied it may
   pause; otherwise the game runs start to finish. */
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const st={
    h:0, a:0, drives:[], prev:"TD", idx:0,
    total:DRIVES_PER_TEAM*2,
    aggrH:planH||"balanced", aggrA:planA||"balanced",
    baseH:planH||"balanced", baseA:planA||"balanced",
    used:{}, rng:rng
  };
  for(let i=0;i<st.total;i++){
    if(st.endAfter!==undefined&&i>st.endAfter)break;   // clock ran out
    const home=i%2===0;
    const start=nextStart(rng,st.prev,st.at);
    const q=Math.min(4,Math.floor(i/(st.total/4))+1);
    let aggr=home?st.aggrH:st.aggrA;
    if(!(opts.decide&&(home?opts.userIsHome:!opts.userIsHome)))
      aggr=situational(aggr,i,st.total,home?st.h:st.a,home?st.a:st.h);
    let forced=null;
    if(opts.decide){
      const isUser = home ? opts.userIsHome : !opts.userIsHome;
      if(isUser){
        const ctx={q:q, idx:i, total:st.total, startYd:start, used:st.used, rng:rng,
                   mine: opts.userIsHome?st.h:st.a, theirs: opts.userIsHome?st.a:st.h};
        const dp=decisionPoint(ctx,true);
        if(dp){
          const choice=opts.decide(dp,ctx);
          st.used[dp.k]=true;
          if(dp.k==="fourth")forced=choice;
          else if(choice==="push")aggr=(dp.k==="chase"?"force":"chase");   // calls are game management,
          else if(choice==="sit"){                     // not the weekly gameplan
            aggr="sit";
            // running clock takes possessions off the board for both teams
            st.endAfter=Math.min(st.total-1, i+2);   // running clock really does end games
          }
          else aggr=home?st.baseH:st.baseA;
          if(home)st.aggrH=aggr; else st.aggrA=aggr;
        }
      }
    }
    let res;
    if(forced==="kick"){
      res = rng.r()< (0.62 + (start-55)*0.006) ? {pts:3,kind:"FG"} : {pts:0,kind:"MISS"};
    }else if(forced==="punt"){
      res = {pts:0,kind:"PUNT"};
    }else if(forced==="go"){
      const conv = rng.r() < 0.52;
      res = conv ? rollDrive(rng, home?eloH:eloA, home?eloA:eloH, Math.min(88,start+6), "urgent")
                 : {pts:0,kind:"DOWNS"};
      if(conv&&res.pts===0)res={pts:0,kind:res.kind};
    }else{
      res = rollDrive(rng, home?eloH:eloA, home?eloA:eloH, start, aggr);
    }
    if(home)st.h+=res.pts; else st.a+=res.pts;
    st.drives.push({home:home,q:q,start:start,pts:res.pts,kind:res.kind,
                    h:st.h,a:st.a,n:i+1,aggr:aggr});
    st.prev=res.kind; st.at=res.stall;
  }
  // overtime rather than an arbitrary tiebreak
  let ot=0;
  while(st.h===st.a&&ot<24){
    ot++;
    const home=(ot%2===1);
    const r=rollDrive(rng,home?eloH:eloA,home?eloA:eloH,75,"urgent");
    if(home)st.h+=r.pts; else st.a+=r.pts;
    st.drives.push({home:home,q:5,start:75,pts:r.pts,kind:r.kind,
                    h:st.h,a:st.a,n:st.total+ot,aggr:"aggressive",note:"overtime",ot:true});
  }
  return st;
}

/* A game you step through one drive at a time. next() returns either a drive,
   a decision that needs an answer, or done. */

/* A decision offered when a drive dies in makeable territory. */
function fourthDownCall(stall, togo, offElo, defElo){
  const dist = fgDistance(stall);
  const yard = Math.max(1, 100 - stall);
  const gp = Math.round(goOdds(togo, offElo, defElo)*100);
  const fp = Math.round(fgOdds(stall)*100);
  const where = stall>=50 ? `their ${yard}` : `your own ${stall}`;
  if (stall >= 62) {
    return {k:"fourth", h:`Fourth and ${togo} at ${where}`,
      b:`A ${dist}-yard attempt from here, or keep the drive alive.`,
      opts:[["go",`Go for it \u00b7 ${gp}% to convert`],
            ["kick",`Kick it \u00b7 ${dist} yds \u00b7 ${fp}% to make`],
            stall<78?["punt","Pin them deep"]:null].filter(Boolean)};
  }
  if (stall >= 44) {
    return {k:"fourth", h:`Fourth and ${togo} at ${where}`,
      // too far to kick, and it says so (Grokbot: "72 yards is a long way for the kicker", and Go or Punt
      // with no word on why there was no kick)
      b:`Too far to kick: it would be a ${dist}-yard try. Go for it, or punt and flip the field.`,
      opts:[["go",`Go for it \u00b7 ${gp}% to convert`],["punt","Punt it away"]]};
  }
  // fourth and short in your own half: the call coaches are second-guessed on most (added Nov 2026)
  if (stall >= 30 && togo <= 2) {
    return {k:"fourth", h:`Fourth and ${togo} at ${where}`,
      b:`Short yardage in your own half. Keep the drive alive, or punt and play the field?`,
      opts:[["go",`Go for it \u00b7 ${gp}% to convert`],["punt","Punt it away"]]};
  }
  return null;
}

/* After a touchdown, when the arithmetic makes two points interesting. */
function twoPointCall(mine, theirs, q, late){
  const d = (mine + 7) - theirs;
  if (q < 3) return null;
  if ([-5,-2,-1,1,2,4,5].indexOf(d) >= 0) {
    // in scores, not margins: "puts you at 0" read as a score of nothing
    const td=mine+6, say=(m,t)=>`${m}-${t}${m>t?", up "+(m-t):m<t?", down "+(t-m):", tied"}`;
    return {k:"two", h:`After the touchdown, ${td}-${theirs}`,
      b:`Kick it, or go for two? Two points makes it ${say(td+2,theirs)}; the kick makes it ${say(td+1,theirs)}.`,
      opts:[["kick","Kick the extra point"],["two","Go for two"]]};
  }
  return null;
}

/* humans: which sides a person is calling, {home, away}. A bare boolean is
   the one-coach form: true means the user is the home side. Each side has
   its own calls, asked only on its own drives, and an ask says whose it is. */
function makeLiveGame(rng, eloH, eloA, planH, planA, humans){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const st={h:0,a:0,drives:[],prev:"TD",i:0,total:DRIVES_PER_TEAM*2,
            aggrH:planH||"balanced",aggrA:planA||"balanced",
            baseH:planH||"balanced",baseA:planA||"balanced",
            usedH:{},usedA:{},callsH:0,callsA:0,humans:humans,
            rng:rng,endAfter:undefined,
            ask:null,stage:null,pend:null,answer:null};

  function push(home,q,start,res,aggr){
    if(home)st.h+=res.pts; else st.a+=res.pts;
    const drive={home:home,q:q,start:start,pts:res.pts,kind:res.kind,
                 h:st.h,a:st.a,n:st.i+1,aggr:aggr,note:res.note||null,
                 converted:(res.converted===undefined?null:res.converted),
                 togo:res.togo||null};
    if(res.kind==="FG"||res.kind==="MISS")drive.stall=res.stall;   // where the kick was from: the box score says how long
    st.drives.push(drive);
    st.prev=res.kind; st.at=res.stall; st.i++; st.pend=null; st.stage=null;
    return drive;
  }

  st.next=function(){
    const regOver = st.i>=st.total||(st.endAfter!==undefined&&st.i>st.endAfter);
    if(regOver){
      if(st.h!==st.a||st.otGuard>24)
        return {done:true,h:st.h,a:st.a,drives:st.drives};
      // overtime, both teams from the opponent's 25
      st.otGuard=(st.otGuard||0)+1;
      const home=(st.otGuard%2===1);
      const r=rollDrive(rng,home?eloH:eloA,home?eloA:eloH,75,"urgent");
      if(home)st.h+=r.pts; else st.a+=r.pts;
      st.drives.push({home:home,q:5,start:75,pts:r.pts,kind:r.kind,
                      h:st.h,a:st.a,n:st.total+st.otGuard,aggr:"aggressive",
                      note:"overtime",ot:true,converted:null,togo:null});
      return {drive:st.drives[st.drives.length-1],h:st.h,a:st.a};
    }

    const i=st.i, home=i%2===0;
    const isUser = home ? humans.home : humans.away;
    const q=Math.min(4,Math.floor(i/(st.total/4))+1);
    // asks only ever go to the side with the ball, so the score is theirs
    const mine=home?st.h:st.a, theirs=home?st.a:st.h;
    const side=home?"home":"away";
    const used=home?st.usedH:st.usedA;
    const calls=()=>home?st.callsH:st.callsA, called=()=>{if(home)st.callsH++;else st.callsA++};
    const late = i>=st.total-7;
    const offE=home?eloH:eloA, defE=home?eloA:eloH;

    // ---- resume from a decision ----
    if(st.stage){
      const choice=st.answer; st.answer=null;
      const P=st.pend, stage=st.stage;
      if(stage==="strategy"){
        st.stage=null;
        // calls are game management, not the weekly gameplan
        if(choice==="push"){ const m=(P.k==="chase"?"force":"chase"); if(home)st.aggrH=m; else st.aggrA=m }
        else if(choice==="sit"){
          if(home)st.aggrH="sit"; else st.aggrA="sit";
          st.endAfter=Math.min(st.total-1,i+3);
        } else { if(home)st.aggrH=st.baseH; else st.aggrA=st.baseA }
        // fall through and play the drive normally
      } else if(stage==="fourth"){
        let res;
        if(choice==="go"){
          const tg=P.res.togo||3;
          if(rng.r()<goOdds(tg,offE,defE)){
            // converted: the drive carries on from there
            const r2=rollDrive(rng,offE,defE,Math.min(90,P.res.stall+Math.max(2,tg)),"urgent");
            res=r2;
            res.converted=true;
            res.note = r2.pts>0 ? `converted on fourth and ${tg}, then scored`
                                : `converted on fourth and ${tg}, drive stalled later`;
          } else {
            res={pts:0,kind:"DOWNS",stall:P.res.stall,
                 converted:false,
                 note:`went for it on fourth and ${tg} and came up short`};
          }
        } else if(choice==="kick"){
          res = rng.r()<fgOdds(P.res.stall)
            ? {pts:3,kind:"FG",stall:P.res.stall,note:"kicked a "+fgDistance(P.res.stall)+"-yard field goal"}
            : {pts:0,kind:"MISS",stall:P.res.stall,note:"missed a "+fgDistance(P.res.stall)+"-yard field goal"};
        } else res={pts:0,kind:"PUNT",stall:P.res.stall,note:"punted it away"};
        return {drive:push(home,P.q,P.start,res,P.aggr),h:st.h,a:st.a};
      } else if(stage==="two"){
        let res;
        if(choice==="two"){
          res = rng.r()<0.47 ? {pts:8,kind:"TD",stall:100,note:"scored, and the two-point try was good"}
                             : {pts:6,kind:"TD",stall:100,note:"scored, but the two-point try failed"};
        } else {
          res = rng.r()<0.97 ? {pts:7,kind:"TD",stall:100}
                             : {pts:6,kind:"TD",stall:100,note:"scored, but missed the extra point"};
        }
        if(home)st.h-=6; else st.a-=6;            // put on the board at the question; push adds the whole score
        return {drive:push(home,P.q,P.start,res,P.aggr),h:st.h,a:st.a};
      }
    }

    const start=nextStart(rng,st.prev,st.at);

    // ---- strategic call before the snap ----
    if(isUser&&calls()<MAX_CALLS&&!st.stage){
      const ctx={q:q,idx:i,total:st.total,startYd:start,used:used,rng:rng,
                 mine:mine,theirs:theirs};
      const dp=decisionPoint(ctx,true);
      if(dp){
        used[dp.k]=true; called();
        st.stage="strategy"; st.pend={q:q,start:start,k:dp.k};
        return {ask:dp,mine:mine,theirs:theirs,q:q,side:side};
      }
    }

    const aggr=isUser?(home?st.aggrH:st.aggrA)
                     :situational(home?st.aggrH:st.aggrA,i,st.total,mine,theirs);
    const res=rollDrive(rng,offE,defE,start,aggr);

    // ---- a call the situation creates ----
    if(isUser&&calls()<MAX_CALLS){
      if((res.kind==="PUNT"||res.kind==="DOWNS"||res.kind==="MISS")&&(used.fourth||0)<4&&callMatters(q,mine-theirs)&&inReach(q,mine-theirs,home?eloH-eloA:eloA-eloH)){
        const dp=fourthDownCall(res.stall,res.togo||3,offE,defE);
        if(dp){
          used.fourth=(used.fourth||0)+1; called();
          st.stage="fourth"; st.pend={q:q,start:start,res:res,aggr:aggr};
          return {ask:dp,mine:mine,theirs:theirs,q:q,side:side};
        }
      }
      if(res.kind==="TD"&&(used.two||0)<2){
        const dp=twoPointCall(mine,theirs,q,late);
        if(dp){
          used.two=(used.two||0)+1; called();
          st.stage="two"; st.pend={q:q,start:start,res:res,aggr:aggr};
          if(home)st.h+=6; else st.a+=6;          // the touchdown is on the board while you decide
          return {ask:dp,mine:mine+6,theirs:theirs,q:q,side:side};
        }
      }
    }
    return {drive:push(home,q,start,res,aggr),h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; };
  return st;
}

/* Is this a moment worth stopping the game for? */
function decisionPoint(state, isUser){
  if (!isUser) return null;
  const q=state.q, idx=state.idx, total=state.total, mine=state.mine,
        theirs=state.theirs, startYd=state.startYd, used=state.used;
  const late = idx >= Math.floor(total * 0.78);
  const veryLate = idx >= total - 7;
  const diff = mine - theirs;

  // asked on your last possession, when what you need is known: a field
  // goal to win or tie, or nothing less than a touchdown
  const lastBall = idx >= total - 2;
  if (lastBall && diff < 0 && diff >= -8 && !used.chase) {
    return {
      k:"chase",
      h:`Down ${-diff}, last possession`,
      b: -diff<=3 ? `A field goal ${-diff===3?"ties it":"wins it"}. Take what they give you, or go for the touchdown?`
                  : `Only a touchdown will do. Force it downfield, or work it and trust the clock?`,
      opts:[["push","Open it up"],["normal","Stay patient"]]
    };
  }
  if (veryLate && diff > 0 && diff <= 10 && !used.protect) {   // up 12 to 14 the choice moved nothing (test/call-weight.js, Nov 2026)
    return {
      k:"protect",
      h: q>=4?`Up ${diff} late`:`Up ${diff}, end of the third`,   // it can come in the third (Grokbot: "up 4 late" in Q3)
      b:`Sit on it and shorten the game, or keep the throttle down.`,
      opts:[["sit","Bleed the clock"],["keep","Keep attacking"]]
    };
  }
  // two scores either way at the break, but not three: up 24 at half, "manage it" was asked and
  // changed nothing (Grokbot; Instinct: "comfortable-lead busywork")
  if (q === 3 && idx === Math.floor(total/2) && Math.abs(diff) >= 14 && callMatters(q,diff) && !used.half) {
    return {
      k:"half",
      h: diff < 0 ? `Down ${-diff} at the break` : `Up ${diff} at the break`,
      b: diff < 0 ? `You need something different in the second half.`
                  : `You can put your foot down or start managing this.`,
      opts: diff < 0 ? [["push","Take more risks"],["normal","Stick with it"]]
                     : [["sit","Manage it"],["normal","Keep going"]]
    };
  }
  return null;
}


