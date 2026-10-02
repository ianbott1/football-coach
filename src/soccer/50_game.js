/* ============ the game engine: soccer ============ */
/* Ninety minutes as six 15-minute segments. In each, each side scores at a
   rate shaped by its edge (Poisson: most segments nothing, now and then a
   goal). The last half hour has score effects: the side behind pushes and is
   caught on the break more. A league game can be drawn; a knockout tie goes
   to thirty minutes of extra time and then penalties.
   Calls: at half-time (chase it or be patient; sit on it or keep going) and
   with twenty minutes left (all-out attack; park the bus; level: go for the
   win or take the point). */
const DRIVES_PER_TEAM = 3;
const SEGS = 6;
const SC_BASE = {
  goals:1.30,        // goals per side per game, even teams, before home advantage (calibrated)
  edge:0.0021,       // per Elo of edge: log of the scoring-rate ratio
  chase:0.22,        // last half hour: the side behind scores this much more...
  exposed:0.20,      // ...and concedes this much more on the break
  sitFor:-0.35, sitAgainst:-0.18,   // parking the bus: far fewer for, fewer against
  etGoals:0.30,      // extra time's share of a normal game's goals (tired legs)
  penEdge:0.12       // how much edge counts in a shoot-out
};
const SC = Object.assign({}, SC_BASE, (typeof LEAGUE!=="undefined"&&LEAGUE.tuning&&LEAGUE.tuning.sc)||{});
/* gameplans and in-game modes: how many chances a side creates, and allows */
const AGGR = {
  safe:      {own:1.12, opp:1.08},   // take the game to them: more football, both ways
  balanced:  {own:1.00, opp:1.00},
  aggressive:{own:0.60, opp:0.63},   // sit deep and counter: fewer chances, more luck
  push:      {own:1.35, opp:1.30},   // all-out attack
  sit:       {own:0.62, opp:0.84},   // park the bus
  win:       {own:1.18, opp:1.15},   // level late: go for the win
  point:     {own:0.75, opp:0.78},   // level late: take the point
  urgent:    {own:1.00, opp:1.00}
};
function poisson(rng,lam){ const L=Math.exp(-lam); let k=0,p=1; do{k++;p*=rng.r()}while(p>L&&k<12); return k-1 }
function halfCall(lead){
  return lead<0
    ? {k:"half",h:`Down ${-lead} at half-time`,q:"Forty-five minutes. Chase it now?",
       opts:[["push","Chase it: more bodies forward"],["normal","Be patient"]]}
    : {k:"half",h:`Up ${lead} at half-time`,q:"Forty-five minutes. Sit on it?",
       opts:[["sit","Sit on it"],["normal","Keep playing our game"]]};
}
function lateCall(lead){
  if(lead<0)return {k:"late",h:`Down ${-lead}, twenty minutes left`,q:"Throw everything at it?",
    opts:[["push","All-out attack"],["normal","Keep our shape"]]};
  if(lead>0)return {k:"late",h:`Up ${lead}, twenty minutes left`,q:"See it out?",
    opts:[["sit","Park the bus"],["normal","Keep going"]]};
  return {k:"late",h:"Level, twenty minutes left",q:"Go for the win, or take the point?",
    opts:[["win","Go for the win"],["point","Take the point"]]};
}
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, knockout){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const st={h:0,a:0,drives:[],seg:0,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null,
    ot:0, so:false, done:false, playoff:!!knockout, draw:false};
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  const queueCalls=(when)=>{
    ["home","away"].forEach(side=>{
      if(!humans[side]||st.asked[when+side])return;
      const L=lead(side); let dp=null;
      if(when==="half"&&L!==0)dp=halfCall(L);
      else if(when==="late")dp=lateCall(L);
      if(dp){st.asked[when+side]=true; st.queue.push({side:side,dp:dp})}
    });
  };
  // the computer: chase a deficit late, see out a lead of two, a narrow lead late
  // level late, the home side goes for the win (the crowd wants it): real
  // football has fewer draws than two independent scoring rates would give
  const cpuMode=(side,s)=>{ const L=lead(side);
    if(s>=4&&L<0)return "push"; if(s>=4&&L>=1)return "sit";
    if(s>=4&&L===0&&side==="home")return "win"; return st.mode[side] };
  const rate=(s,side)=>{
    const m=(humans[side]&&st.late[side])?st.late[side]:(humans[side]?st.mode[side]:cpuMode(side,s));
    return AGGR[m]||AGGR.balanced;
  };
  const segment=(s)=>{
    const AH=rate(s,"home"), AA=rate(s,"away"), e=gap*SC.edge;
    let lamH=SC.goals/SEGS*Math.exp(e/2)*AH.own*AA.opp;
    let lamA=SC.goals/SEGS*Math.exp(-e/2)*AA.own*AH.opp;
    if(s>=4&&st.h!==st.a){ if(st.h<st.a){lamH*=1+SC.chase;lamA*=1+SC.exposed} else {lamA*=1+SC.chase;lamH*=1+SC.exposed} }
    const gH=poisson(rng,lamH), gA=poisson(rng,lamA);
    st.h+=gH; st.a+=gA;
    st.lines.h.sog+=gH+poisson(rng,lamH*3.2); st.lines.a.sog+=gA+poisson(rng,lamA*3.2);
    // momentum: the home side's share of the play in this spell (its scoring rate
    // against the other's), with some noise: a side can dominate without scoring
    const mom=Math.max(0.12,Math.min(0.88,lamH/(lamH+lamA)+rng.gauss(0,0.07)));
    const d={seg:s,h:gH,a:gA,sh:st.h,sa:st.a,shots:[0,0],pp:[false,false],en:null,ot:0,mom:mom};
    st.drives.push(d); return d;
  };
  const extraTime=()=>{
    const e=gap*SC.edge; st.ot=1;
    const gH=poisson(rng,SC.goals*SC.etGoals*Math.exp(e/2)), gA=poisson(rng,SC.goals*SC.etGoals*Math.exp(-e/2));
    st.h+=gH; st.a+=gA;
    if(st.h===st.a){ st.so=true; const p=0.5+Math.tanh(e)*SC.penEdge; st.pens=rng.r()<p?"home":"away" }
    st.drives.push({seg:SEGS,sh:st.h,sa:st.a,ot:1,so:st.so,pens:st.pens||null,h:gH,a:gA,shots:[0,0],pp:[false,false]});
  };
  st.next=function(){
    const fin=()=>({done:true,h:st.h,a:st.a,drives:st.drives});
    if(st.done)return fin();
    if(st.pendingSide){
      const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null;
      st.late[P.side]=v==="normal"?null:v;
    }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      const r={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,theirs:Q.side==="home"?st.a:st.h,q:st.seg<3?2:4,side:Q.side};
      st.waiting=r; return r}
    if(st.seg===3&&!st.halfDone){st.halfDone=true; queueCalls("half"); if(st.queue.length)return st.next()}
    if(st.seg===4&&!st.lateDone){st.lateDone=true; queueCalls("late"); if(st.queue.length)return st.next()}
    if(st.seg>=SEGS){ if(st.h===st.a){ if(st.playoff)extraTime(); else st.draw=true } st.done=true; return fin() }
    const d=segment(st.seg); st.seg++;
    return {drive:d,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans,opts.playoff);
  let guard=0;
  while(guard++<60){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,ot:e.ot,so:e.so,pens:e.pens||null,draw:e.draw,lines:e.lines};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q}); e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,ot:0,draw:e.h===e.a,lines:e.lines};
}
