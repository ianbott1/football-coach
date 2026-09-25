/* ============ live game engine ============ */
/* Games are played out drive by drive and the score emerges from them, so a
   decision made in the fourth quarter genuinely changes the ending. */

const DRIVES_PER_TEAM = 12;
const MAX_CALLS = 3;          // how many decisions a single game will ask of you

/* Aggression presets, used both as a pre-game plan and as an in-game choice. */
const AGGR = {
  safe:      {td:-0.050, fg:+0.058, to:-0.070},
  balanced:  {td: 0,     fg: 0,     to: 0},
  aggressive:{td:+0.082, fg:-0.060, to:+0.086}
};

/* Chance of each outcome on one drive, given the gap between the two teams. */
function driveOdds(offElo, defElo, startYd, aggr){
  const x = (offElo - defElo) / 470;
  const field = (startYd - 27) / 100;              // better starting spot helps
  const A = AGGR[aggr] || AGGR.balanced;
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
function fgOdds(stall){
  const dist = (100-stall) + 17;
  if (dist<=25) return 0.96;
  if (dist<=32) return 0.90;
  if (dist<=40) return 0.80;
  if (dist<=47) return 0.66;
  if (dist<=54) return 0.48;
  return 0.30;
}
function fgDistance(stall){ return (100-stall)+17; }

/* Fourth-down conversion: distance is what matters, quality adjusts it. */
function goOdds(togo, offElo, defElo){
  const base = 0.68 / (1 + 0.165*(Math.max(1,togo)-1));
  const adj = (offElo-defElo)/3400;
  return Math.max(0.12, Math.min(0.82, base + adj));
}

/* Where a drive starts, given how the previous one ended. */
function nextStart(rng, prevKind){
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
    const start=nextStart(rng,st.prev);
    const q=Math.min(4,Math.floor(i/(st.total/4))+1);
    let aggr=home?st.aggrH:st.aggrA;
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
          else if(choice==="push")aggr="aggressive";
          else if(choice==="sit"){
            aggr="safe";
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
      res = conv ? rollDrive(rng, home?eloH:eloA, home?eloA:eloH, Math.min(88,start+6), "aggressive")
                 : {pts:0,kind:"DOWNS"};
      if(conv&&res.pts===0)res={pts:0,kind:res.kind};
    }else{
      res = rollDrive(rng, home?eloH:eloA, home?eloA:eloH, start, aggr);
    }
    if(home)st.h+=res.pts; else st.a+=res.pts;
    st.drives.push({home:home,q:q,start:start,pts:res.pts,kind:res.kind,
                    h:st.h,a:st.a,n:i+1,aggr:aggr});
    st.prev=res.kind;
  }
  // overtime rather than an arbitrary tiebreak
  let ot=0;
  while(st.h===st.a&&ot<24){
    ot++;
    const home=(ot%2===1);
    const r=rollDrive(rng,home?eloH:eloA,home?eloA:eloH,75,"aggressive");
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
      opts:[["go",`Go for it \u00b7 ${gp}%`],
            ["kick",`Kick it \u00b7 ${dist} yds \u00b7 ${fp}%`],
            stall<78?["punt","Pin them deep"]:null].filter(Boolean)};
  }
  if (stall >= 44) {
    return {k:"fourth", h:`Fourth and ${togo} at ${where}`,
      b:`${dist} yards is a long way for the kicker. Go for it, or flip the field.`,
      opts:[["go",`Go for it \u00b7 ${gp}%`],["punt","Punt it away"]]};
  }
  return null;
}

/* After a touchdown, when the arithmetic makes two points interesting. */
function twoPointCall(mine, theirs, q, late){
  const d = (mine + 7) - theirs;
  if (q < 3) return null;
  if ([-5,-2,-1,1,2,4,5].indexOf(d) >= 0) {
    return {k:"two", h:`Kick it, or go for two`,
      b:`A conversion puts you at ${d + 1}; the kick leaves it at ${d}.`,
      opts:[["kick","Kick the extra point"],["two","Go for two"]]};
  }
  return null;
}

function makeLiveGame(rng, eloH, eloA, planH, planA, userIsHome){
  const st={h:0,a:0,drives:[],prev:"TD",i:0,total:DRIVES_PER_TEAM*2,
            aggrH:planH||"balanced",aggrA:planA||"balanced",
            baseH:planH||"balanced",baseA:planA||"balanced",
            used:{},calls:0,rng:rng,endAfter:undefined,
            ask:null,stage:null,pend:null,answer:null};

  function push(home,q,start,res,aggr){
    if(home)st.h+=res.pts; else st.a+=res.pts;
    const drive={home:home,q:q,start:start,pts:res.pts,kind:res.kind,
                 h:st.h,a:st.a,n:st.i+1,aggr:aggr,note:res.note||null,
                 converted:(res.converted===undefined?null:res.converted),
                 togo:res.togo||null};
    st.drives.push(drive);
    st.prev=res.kind; st.i++; st.pend=null; st.stage=null;
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
      const r=rollDrive(rng,home?eloH:eloA,home?eloA:eloH,75,"aggressive");
      if(home)st.h+=r.pts; else st.a+=r.pts;
      st.drives.push({home:home,q:5,start:75,pts:r.pts,kind:r.kind,
                      h:st.h,a:st.a,n:st.total+st.otGuard,aggr:"aggressive",
                      note:"overtime",ot:true,converted:null,togo:null});
      return {drive:st.drives[st.drives.length-1],h:st.h,a:st.a};
    }

    const i=st.i, home=i%2===0;
    const isUser = home ? userIsHome : !userIsHome;
    const q=Math.min(4,Math.floor(i/(st.total/4))+1);
    const mine=userIsHome?st.h:st.a, theirs=userIsHome?st.a:st.h;
    const late = i>=st.total-7;
    const offE=home?eloH:eloA, defE=home?eloA:eloH;

    // ---- resume from a decision ----
    if(st.stage){
      const choice=st.answer; st.answer=null;
      const P=st.pend, stage=st.stage;
      if(stage==="strategy"){
        st.stage=null;
        if(choice==="push"){ if(home)st.aggrH="aggressive"; else st.aggrA="aggressive" }
        else if(choice==="sit"){
          if(home)st.aggrH="safe"; else st.aggrA="safe";
          st.endAfter=Math.min(st.total-1,i+3);
        } else { if(home)st.aggrH=st.baseH; else st.aggrA=st.baseA }
        // fall through and play the drive normally
      } else if(stage==="fourth"){
        let res;
        if(choice==="go"){
          const tg=P.res.togo||3;
          if(rng.r()<goOdds(tg,offE,defE)){
            // converted: the drive carries on from there
            const r2=rollDrive(rng,offE,defE,Math.min(90,P.res.stall+Math.max(2,tg)),"aggressive");
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
            ? {pts:3,kind:"FG",stall:P.res.stall,note:fgDistance(P.res.stall)+"-yd kick is good"}
            : {pts:0,kind:"MISS",stall:P.res.stall,note:fgDistance(P.res.stall)+"-yd kick is no good"};
        } else res={pts:0,kind:"PUNT",stall:P.res.stall,note:"punted it away"};
        return {drive:push(home,P.q,P.start,res,P.aggr),h:st.h,a:st.a};
      } else if(stage==="two"){
        let res;
        if(choice==="two"){
          res = rng.r()<0.47 ? {pts:8,kind:"TD",stall:100,note:"two-point conversion good"}
                             : {pts:6,kind:"TD",stall:100,note:"two-point try failed"};
        } else {
          res = rng.r()<0.97 ? {pts:7,kind:"TD",stall:100}
                             : {pts:6,kind:"TD",stall:100,note:"extra point missed"};
        }
        return {drive:push(home,P.q,P.start,res,P.aggr),h:st.h,a:st.a};
      }
    }

    const start=nextStart(rng,st.prev);

    // ---- strategic call before the snap ----
    if(isUser&&st.calls<MAX_CALLS&&!st.stage){
      const ctx={q:q,idx:i,total:st.total,startYd:start,used:st.used,rng:rng,
                 mine:mine,theirs:theirs};
      const dp=decisionPoint(ctx,true);
      if(dp){
        st.used[dp.k]=true; st.calls++;
        st.stage="strategy"; st.pend={q:q,start:start};
        return {ask:dp,mine:mine,theirs:theirs,q:q};
      }
    }

    const aggr=home?st.aggrH:st.aggrA;
    const res=rollDrive(rng,offE,defE,start,aggr);

    // ---- a call the situation creates ----
    if(isUser&&st.calls<MAX_CALLS){
      if((res.kind==="PUNT"||res.kind==="DOWNS"||res.kind==="MISS")&&(st.used.fourth||0)<2){
        const dp=fourthDownCall(res.stall,res.togo||3,offE,defE);
        if(dp){
          st.used.fourth=(st.used.fourth||0)+1; st.calls++;
          st.stage="fourth"; st.pend={q:q,start:start,res:res,aggr:aggr};
          return {ask:dp,mine:mine,theirs:theirs,q:q};
        }
      }
      if(res.kind==="TD"&&!st.used.two){
        const dp=twoPointCall(mine,theirs,q,late);
        if(dp){
          st.used.two=true; st.calls++;
          st.stage="two"; st.pend={q:q,start:start,res:res,aggr:aggr};
          return {ask:dp,mine:mine,theirs:theirs,q:q};
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

  if (veryLate && diff < 0 && diff >= -16 && !used.chase) {
    return {
      k:"chase",
      h:`Down ${-diff} with the clock going`,
      b:`Time to force it, or keep playing your game and hope for a stop.`,
      opts:[["push","Open it up"],["normal","Stay patient"]]
    };
  }
  if (veryLate && diff > 0 && diff <= 14 && !used.protect) {
    return {
      k:"protect",
      h:`Up ${diff} late`,
      b:`Sit on it and shorten the game, or keep the throttle down.`,
      opts:[["sit","Bleed the clock"],["keep","Keep attacking"]]
    };
  }
  if (q === 3 && idx === Math.floor(total/2) && Math.abs(diff) >= 17 && !used.half) {
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

/* Apply a decision to the rest of the game. */
function applyChoice(state, key, choice){
  state.used[key] = true;
  if (key === "fourth") {
    state.pendingFourth = choice;
  } else if (choice === "push") {
    state.aggr = "aggressive";
  } else if (choice === "sit") {
    state.aggr = "safe";
  } else if (choice === "keep" || choice === "normal") {
    state.aggr = state.basePlan;
  }
}

