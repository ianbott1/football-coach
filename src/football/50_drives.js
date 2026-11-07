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

/* your defense on their late drive (the "defend" call): prevent gives up field goals and the clock to stop the
   touchdown; pressure takes the ball away more often and gives up more big plays. Which is right depends on the
   score: up 4 to 8 only a touchdown beats you; up 1 to 3 or level, a field goal does too. */
const FB_REST_DEF={td:+0.070, fg:+0.030, to:-0.025};   // your backups on defense
const DEF_MODE = {
  prevent: {td:-0.090, fg:+0.090, to:-0.035},
  pressure:{td:+0.035, fg:-0.070, to:+0.075}
};
/* Chance of each outcome on one drive, given the gap between the two teams. */
function driveOdds(offElo, defElo, startYd, aggr, dmode){
  const A0 = AGGR[aggr] || AGGR.balanced, D = typeof dmode==="string" ? DEF_MODE[dmode] : dmode;
  const A = D ? {td:A0.td+D.td, fg:A0.fg+D.fg, to:A0.to+D.to, gap:A0.gap} : A0;
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

function rollDrive(rng, offElo, defElo, startYd, aggr, dmode){
  const o = driveOdds(offElo, defElo, startYd, aggr, dmode);
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
  if (prevKind === "ONSIDE") return cl(rng.gauss(52,4), 40, 65);          // you recovered your own onside kick
  if (prevKind === "ONSIDEX") return cl(rng.gauss(58,5), 45, 75);         // they recovered it: a short field
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

/* ---- their defense, and your answer (round 35) ----
   Every other game reads the opponent; football only had the scoreboard (Grokbot: decision weight 4 of 10, pro
   football under one call a game). Each club has a usual defense; a scouting report before kickoff, the drive
   chart's numbers in the second quarter and after half-time, and an answer for your offense that holds until
   you change it. Only in a game a person coaches against the computer: no other game moves. */
const SCHEMES={
  blitz:{l:"sending extra rushers",   counter:"quick"},
  shell:{l:"sitting back, two deep",  counter:"run"},
  box:  {l:"loading the box",         counter:"deep"}
};
const SCHEME_KEYS=["blitz","shell","box"];
const FB_ANSWERS={
  quick:{beats:"blitz", l:"Quick passes and screens", d:"Get it out before the rush gets there"},
  run:  {beats:"shell", l:"Run the ball",             d:"Lean on them while they sit back"},
  deep: {beats:"box",   l:"Take shots downfield",     d:"Throw over a defense crowding the line"}
};
const FB_READ=Object.assign({right:{td:+0.070,fg:0,to:-0.025}, wrong:{td:-0.020,fg:0,to:+0.015},
  favW:3, scouted:6, sw:0.30, swBehind:0.50, tell:2.1, base:0.8}, (LEAGUE.tuning&&LEAGUE.tuning.fbRead)||{});
// per drive of yours, what their defense leaves in the numbers: blitzes, deep safeties, men in the box
const FB_TELL={blitz:[FB_READ.tell,FB_READ.base,FB_READ.base],shell:[FB_READ.base,FB_READ.tell,FB_READ.base],box:[FB_READ.base,FB_READ.base,FB_READ.tell]};
function fbRead(T){ const n=Math.max(1,T.n), v=[T.bl/n,T.sh/n,T.bx/n]; return SCHEME_KEYS[v.indexOf(Math.max(...v))] }
function clubScheme(t,year){ return SCHEME_KEYS[strHash(t+"|def|"+year)%SCHEME_KEYS.length] }
function gameCtx(h,a,year,step){ return {fav:{home:clubScheme(h,year),away:clubScheme(a,year)}, seed:strHash(h+"|"+a+"|"+year+"|"+step)} }
function fbReport(fav,seed){
  const r=new RNG(seed>>>0), w=SCHEME_KEYS.map(k=>k===fav?FB_READ.favW:1), tot=w.reduce((a,b)=>a+b), n={};
  SCHEME_KEYS.forEach(k=>n[k]=0);
  for(let g=0;g<FB_READ.scouted;g++){ let x=r.r()*tot, i=0; while(x>w[i]){x-=w[i];i++} n[SCHEME_KEYS[i]]++ }
  return n;
}
const FB_ASSIST=["normal","Leave it to your assistant"];
function fbPrepCall(rep){
  const top=SCHEME_KEYS.reduce((a,k)=>rep[k]>rep[a]?k:a,SCHEME_KEYS[0]);
  return {k:"prep",h:"Before kickoff: the scouting report",b:"Game-plan your offense for how they usually defend, or wait and see?",
    opts:Object.keys(FB_ANSWERS).map(a=>[a,FB_ANSWERS[a].l]).concat([["normal","Wait and see: leave it to your assistant"]]),
    report:Object.assign({},rep), n:FB_READ.scouted, pearl:top};
}
function fbReadCall(stage,T,T2,last,cur){
  const D=T2&&T2.n?T2:null;
  return {k:"read",stage:stage,h:stage===1?"Second quarter: their defense":"After half-time: their defense",
    b:stage===1?"How are they defending you? Pick your answer.":"Anything changed since the break? Adjust, or leave it.",
    opts:(cur&&FB_ANSWERS[cur]?[["keep","Keep it: "+FB_ANSWERS[cur].l]]:[]).concat(Object.keys(FB_ANSWERS).filter(a=>a!==cur).map(a=>[a,FB_ANSWERS[a].l])).concat([FB_ASSIST]),
    tell:Object.assign({},T), tell2:D?Object.assign({},D):null, best:fbRead(D||T), pearl:last?fbRead(last):fbRead(T)};
}

/* A game you step through one drive at a time. next() returns either a drive,
   a decision that needs an answer, or done. */

/* A decision offered when a drive dies in makeable territory. */
function fourthDownCall(stall, togo, offElo, defElo){
  // fourth and 10 or more: left to the assistant. It moved 4.7 points a call, 60% under 3 (test/call-weight.js,
  // 276 calls); Grokbot was asked about a fourth and 12 on the opening drive
  if (togo >= 10) return null;
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
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, knock, ctx){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  ctx=ctx||{};
  const st={h:0,a:0,drives:[],prev:"TD",i:0,total:DRIVES_PER_TEAM*2,
            aggrH:planH||"balanced",aggrA:planA||"balanced",
            baseH:planH||"balanced",baseA:planA||"balanced",
            usedH:{},usedA:{},callsH:0,callsA:0,humans:humans,
            rng:rng,endAfter:undefined,
            ask:null,stage:null,pend:null,answer:null};
  // their defense against each person's offense (a person facing the computer)
  st.D={}; st.ans={home:null,away:null}; st.log=[];
  ["home","away"].forEach(sd=>{ const o=sd==="home"?"away":"home"; if(!humans[sd]||humans[o])return;
    const fav=ctx.fav&&ctx.fav[o]; let sch;
    if(fav){ const w=SCHEME_KEYS.map(k=>k===fav?FB_READ.favW:1); let x=rng.r()*w.reduce((a,b)=>a+b), i=0; while(x>w[i]){x-=w[i];i++} sch=SCHEME_KEYS[i] }
    else sch=SCHEME_KEYS[rng.int(3)];
    st.D[sd]={sch:sch,fav:fav,T:{bl:0,sh:0,bx:0,n:0},T2:{bl:0,sh:0,bx:0,n:0},last:null,asked:{}} });
  const readMod=sd=>{ const D=st.D[sd], a=st.ans[sd]; if(!D||!a||!FB_ANSWERS[a])return null; return FB_ANSWERS[a].beats===D.sch?FB_READ.right:FB_READ.wrong };
  const tellDrive=sd=>{ const D=st.D[sd]; if(!D)return; const t=FB_TELL[D.sch], pz=l=>{ let k=0,p=Math.exp(-l),c=p,u=rng.r(); while(u>c&&k<12){k++;p*=l/k;c+=p} return k };
    const x={bl:pz(t[0]),sh:pz(t[1]),bx:pz(t[2]),n:1}; ["bl","sh","bx","n"].forEach(k=>{ D.T[k]+=x[k]; if(D.half)D.T2[k]+=x[k] }); D.last=x };

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
      } else if(stage==="fbread"){
        st.stage=null; const D=st.D[side], dp=P.dp;
        const pick=choice==="keep"?st.ans[side]:FB_ANSWERS[choice]?choice:null;
        if(pick&&FB_ANSWERS[pick]){
          const e={side:side,k:dp.k,pick:pick,truth:D.sch,right:FB_ANSWERS[pick].beats===D.sch};
          if(dp.k==="read")e.evid=dp.best; if(dp.k==="prep"){ const a=Object.values(dp.report).sort((x,y)=>y-x); if(a[0]===a[1])e.unclear=true }
          st.log.push(e); st.ans[side]=pick }
        else if(dp.k==="read"&&rng.r()<0.45)st.ans[side]=SCHEMES[D.sch].counter;   // your assistant reads it, about as often as anyone
        // fall through and play the drive
      } else if(stage==="rest"){
        st.stage=null;
        if(choice==="rest"){ st.rest=st.rest||{}; st.rest[side]=true; if(home)st.aggrH="sit"; else st.aggrA="sit" }
        st.log.push({side:side,k:"rest",pick:choice==="rest"?"rest":"keep",unclear:true});
        // fall through and play the drive
      } else if(stage==="onside"){
        // asked of the side that just scored, before the other side's possession
        st.stage=null;
        if(choice==="onside"){ const ok=rng.r()<ONSIDE_P;
          if(ok){ st.drives.push({home:home,q:q,start:null,pts:0,kind:"ONSIDE",h:st.h,a:st.a,n:st.i+1,aggr:"balanced",
              note:"never had it: the onside kick was recovered",converted:null,togo:null});
            st.prev="ONSIDE"; st.at=null; st.i++; return {drive:st.drives[st.drives.length-1],h:st.h,a:st.a} }
          st.prev="ONSIDEX"; st.at=null; st.onsideMiss=true }
        // fall through: their possession, from wherever the kick left it
      } else if(stage==="defend"){
        st.stage=null; st.dmode=(choice==="prevent"||choice==="pressure")?choice:null;
        // fall through and play their drive against it
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

    // ---- before their possession: your onside kick, or your defense on a late drive ----
    // (asked of the side without the ball: the other one, a person facing the computer)
    const oth=home?"away":"home", othUser=home?humans.away:humans.home, othCalls=home?st.callsA:st.callsH;
    if(othUser&&!isUser&&!st.stage&&!st.lateAsked&&othCalls<MAX_CALLS){
      const oMine=home?st.a:st.h, oTheirs=home?st.h:st.a, d=oMine-oTheirs, left=st.total-i;   // left: possessions to go, this one included
      const oUsed=home?st.usedA:st.usedH;
      // you just scored and still trail, with too few possessions to win it the slow way
      if(!oUsed.onside&&(st.prev==="TD"||st.prev==="FG")&&d<0&&d>=-16&&left<=4){
        oUsed.onside=true; if(home)st.callsA++; else st.callsH++; st.lateAsked=true;
        st.stage="onside"; st.pend={q:q};
        return {ask:onsideCall(d,left),mine:oMine,theirs:oTheirs,q:q,side:oth} }
      // their late drive, you ahead by a score or level
      if(!oUsed.defend&&d>=0&&d<=8&&left<=3){
        oUsed.defend=true; if(home)st.callsA++; else st.callsH++; st.lateAsked=true;
        st.stage="defend"; st.pend={q:q};
        return {ask:defendCall(d,left),mine:oMine,theirs:oTheirs,q:q,side:oth} }
    }
    if(!st.stage)st.lateAsked=false;

    const start=st.startHold!==undefined?st.startHold:nextStart(rng,st.prev,st.at); st.startHold=undefined;

    // ---- their defense: the half-time change, and your reads (before your drive) ----
    if(!st.stage&&i>=st.total/2){ ["home","away"].forEach(sd=>{ const D=st.D[sd]; if(!D||D.half)return; D.half=true;
        const behind=(sd==="home"?st.a-st.h:st.h-st.a)<0;   // their side behind
        if(rng.r()<(behind?FB_READ.swBehind:FB_READ.sw)){ const ks=SCHEME_KEYS.filter(k=>k!==D.sch); D.sch=ks[rng.int(ks.length)] } }) }
    if(isUser&&!st.stage&&st.D[side]){ const D=st.D[side]; let dp=null;
      if(!D.asked.prep&&D.fav){ D.asked.prep=true; dp=fbPrepCall(fbReport(D.fav,(ctx.seed||0)+(side==="home"?2:1))) }
      else if(!D.asked.r1&&q>=2&&D.T.n>=2){ D.asked.r1=true; dp=fbReadCall(1,D.T,null,D.last,st.ans[side]) }
      else if(!D.asked.r2&&D.half&&D.T2.n>=2&&callMatters(q,mine-theirs)){ D.asked.r2=true; dp=fbReadCall(2,D.T,D.T2,D.last,st.ans[side]) }
      if(dp){ st.stage="fbread"; st.pend={q:q,dp:dp}; st.startHold=start; return {ask:dp,mine:mine,theirs:theirs,q:q,side:side} } }

    // ---- a decided game, your ball: rest the starters? (Muse: a 24-point fourth-quarter lead asked nothing) ----
    if(isUser&&!st.stage&&q>=4&&mine-theirs>=14&&mine-theirs<=24&&!(home?st.usedH:st.usedA).rest){
      (home?st.usedH:st.usedA).rest=true; st.stage="rest"; st.pend={q:q}; st.startHold=start;
      return {ask:{k:"rest",h:`Up ${mine-theirs} in the fourth quarter`,
        b:`Rest your starters? The backups run the clock out: a lead this size usually holds, though not always, and nobody gets hurt on the sideline. ${possLeft(st.total-i,true)}`,
        opts:[["rest","Rest the starters"],["keep","Keep them in until it's safe"],["normal","Leave it to your assistant"]]},mine:mine,theirs:theirs,q:q,side:side} }

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
    let dm=!isUser?st.dmode:readMod(side); if(!isUser)st.dmode=null;
    // their drive against your rested starters: the backups give up more (the price of resting them)
    if(!isUser&&st.rest&&st.rest[home?"away":"home"]){ const D0=typeof dm==="string"?DEF_MODE[dm]:dm, R0=FB_REST_DEF;
      dm={td:(D0?D0.td:0)+R0.td, fg:(D0?D0.fg:0)+R0.fg, to:(D0?D0.to:0)+R0.to} }   // your defense, this drive only; your offense's answer, until you change it
    const res=rollDrive(rng,offE,defE,start,aggr,dm);
    if(isUser)tellDrive(side);
    if(dm&&!isUser)res.note=(res.note?res.note+"; ":"")+(dm==="prevent"?"against your prevent defense":"against your pressure");
    if(st.onsideMiss){ st.onsideMiss=false; res.note=(res.note?res.note+"; ":"")+"after recovering the onside kick" }

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

/* how much game is left, in the engine's own clock: possessions. "About 6 minutes" was a guess on top of it
   (Grokbot: late calls without the exact time); the drives left are exact. left counts this one. */
function possLeft(left,mineNext){
  const you=mineNext?Math.ceil(left/2):Math.floor(left/2), them=left-you;
  return `Possessions left: ${you} for you, ${them} for them.`;
}
const ONSIDE_P=(LEAGUE.tuning&&LEAGUE.tuning.onside)||0.12;   // about one in eight recovered, under today's kickoff rules
function onsideCall(diff,left){
  // left: possessions to go, theirs next. Kick deep and they get theirs; recover it and theirs is gone.
  const need=-diff<=3?"a field goal":-diff<=8?"a touchdown":"two scores";
  return {k:"onside",h:`Down ${-diff} after your score`,
    b:`You need ${need}. Kick it deep and make a stop, or try the onside kick? About one in eight is recovered; a miss hands them a short field. ${possLeft(left,false)}`,
    opts:[["onside","Onside kick"],["normal","Kick it deep, as your assistant would"]],left:left,diff:diff};
}
function defendCall(diff,left){
  const what=diff===0?"Any score beats you.":diff<=3?"A field goal "+(diff===3?"ties it":"beats you")+".":"Only a touchdown beats you.";
  return {k:"defend",h:diff===0?"Tied, and they have the ball":`Up ${diff}, and they have the ball`,
    b:`${what} Prevent defense gives up yards and field goals to stop the big play; pressure takes the ball away more often and gives up more touchdowns. ${possLeft(left,false)}`,
    opts:[["prevent","Prevent: nothing deep"],["pressure","Bring pressure"],["normal","Play it straight, as your assistant would"]],left:left,diff:diff};
}

/* Is this a moment worth stopping the game for? */
function decisionPoint(state, isUser){
  if (!isUser) return null;
  const q=state.q, idx=state.idx, total=state.total, mine=state.mine,
        theirs=state.theirs, startYd=state.startYd, used=state.used;
  const late = idx >= Math.floor(total * 0.78);
  const veryLate = idx >= total - 7;
  const diff = mine - theirs;
  // roughly how long is left: drives come about evenly through the game (Grokbot: a late call showed the quarter, not the clock)
  // before the fourth it's the quarter's clock: "About 18 minutes left" at "end of the third" read as wrong (Grokbot;
  // it was 3 in the quarter plus the fourth)
  const left = Math.max(1, Math.round(60*(total-idx)/total)), inQ = Math.min(15, Math.max(1, left-(4-Math.min(4,q))*15)),
        clock = q>=4 ? " "+possLeft(total-idx,true) : ` About ${inQ} minute${inQ===1?"":"s"} left in the ${["first","second","third"][q-1]||"third"} quarter.`;

  // asked on your last possession, when what you need is known: a field
  // goal to win or tie, or nothing less than a touchdown
  const lastBall = idx >= total - 2;
  if (lastBall && diff < 0 && diff >= -8 && !used.chase) {
    return {
      k:"chase",
      h:`Down ${-diff}, last possession`,
      b:(-diff<=3 ? `A field goal ${-diff===3?"ties it":"wins it"}. Take what they give you, or go for the touchdown?`
                  : `Only a touchdown will do. Force it downfield, or work it and trust the clock?`)+clock,
      opts:[["push","Open it up"],["normal","Stay patient"]]
    };
  }
  if (veryLate && diff > 0 && diff <= 10 && !used.protect) {   // up 12 to 14 the choice moved nothing (test/call-weight.js, Nov 2026)
    return {
      k:"protect",
      h: q>=4?`Up ${diff} late`:`Up ${diff} in the third`,   // it can come in the third (Grokbot: "up 4 late" in Q3)
      b:`Sit on it and shorten the game, or keep the throttle down.`+clock,
      opts:[["sit","Bleed the clock"],["keep","Keep attacking"]]
    };
  }
  // two scores either way at the break, but not three: up 24 at half, "manage it" was asked and
  // changed nothing (Grokbot; Instinct: "comfortable-lead busywork")
  // cut (round 33): asked only at two scores or more, where it never moved anything (0 to 1.3 points a call, 100%
  // either way in every measured case); the close games' half-time is the fourth downs' and the late calls' job
  if (false && q === 3 && idx === Math.floor(total/2) && Math.abs(diff) >= 14 && callMatters(q,diff) && !used.half) {
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


