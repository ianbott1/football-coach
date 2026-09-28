/* ============ the game engine: hockey ============ */
/* Three 20-minute periods, played as six 10-minute segments. Each side takes
   shots at a rate shaped by its edge, and each shot scores at a rate shaped
   by it too (the goalie is part of a team's strength); penalties give the
   other side a power play. The side behind pushes in the third and the side
   ahead sits back (score effects). Trailing late, the goalie comes out for
   an extra attacker: goals both ways. Regular season: five minutes of
   three-on-three, then a shootout. Playoffs: sudden-death periods.
   Calls: at the second intermission (push, or lock it down) and, trailing by
   one or two late, when to pull the goalie. */
const DRIVES_PER_TEAM = 3;                    // segments per team half: six in a game
const SEGS = 6;
const HK_BASE = {
  shots:24,          // even-strength shots on goal per team per game (power plays add ~5)
  shotSd:1.0,        // spread of a segment's shots (x sqrt of the rate)
  sh:0.086,          // a shot's chance of scoring at even strength
  pens:3.1,          // power plays per team per game
  ppShots:1.55,      // shots on a power play
  ppSh:0.135,        // their chance of scoring
  shotEdge:0.0012,   // per Elo of edge: more shots...
  finishEdge:0.0011, // ...and a better chance each
  scoreFx:0.13,      // third period: the side behind shoots this much more
  pullMin:{normal:1.6, early:3.2},   // minutes the goalie is out
  pullFor:0.15,      // the trailer's goals a minute with the extra attacker
  pullAgainst:0.20,  // empty-net goals a minute against
  otGoal:0.68,       // chance three-on-three produces a goal (else a shootout)
  soEdge:0.25        // how much edge counts in a shootout (of the overtime's)
};
const HK = Object.assign({}, HK_BASE, (typeof LEAGUE!=="undefined"&&LEAGUE.tuning&&LEAGUE.tuning.hk)||{});
/* gameplans and in-game modes: how many events a side creates, and allows */
const AGGR = {
  safe:      {own:1.12, opp:1.10},   // skate with them: more hockey, both ways
  balanced:  {own:1.00, opp:1.00},
  aggressive:{own:0.86, opp:0.84},   // clog it up: fewer chances, more luck
  push:      {own:1.20, opp:1.12},
  sit:       {own:0.84, opp:0.90},
  urgent:    {own:1.00, opp:1.00}
};
function shotsIn(rng,lam){ return Math.max(0,Math.round(rng.gauss(lam,Math.sqrt(Math.max(lam,0.01))*HK.shotSd))) }
function goalsFrom(rng,n,p){ let g=0; for(let i=0;i<n;i++)if(rng.r()<p)g++; return g }
function intCall(lead){
  return lead<0
    ? {k:"push",h:`Down ${-lead} after two`,q:"Twenty minutes left. Open it up?",
       opts:[["push","Push: pinch the D, more shots"],["normal","Stay the course"]]}
    : {k:"lock",h:`Up ${lead} after two`,q:"Twenty minutes left. Sit on it?",
       opts:[["sit","Lock it down: trap, block shots"],["normal","Keep playing our game"]]};
}
function pullCall(lead){
  return {k:"pull",h:`Down ${-lead}, late in the third`,q:"When does the goalie come out?",
    opts:[["early","Early: over three minutes left"],["normal","The usual: under two minutes"]]};
}
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, playoff){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const st={h:0,a:0,drives:[],seg:0,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null,
    ot:0, so:false, done:false, playoff:!!playoff};
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  const queueCalls=(when)=>{
    ["home","away"].forEach(side=>{
      if(!humans[side]||st.asked[when+side])return;
      const L=lead(side); let dp=null;
      if(when==="int"&&L!==0)dp=intCall(L);
      else if(when==="pull"&&(L===-1||L===-2))dp=pullCall(L);
      if(dp){st.asked[when+side]=true; st.queue.push({side:side,dp:dp})}
    });
  };
  // the computer: push when behind in the third, sit on a lead of two or more
  const cpuMode=(side,s)=>{ const L=lead(side);
    if(s>=4&&L<0)return "push"; if(s>=4&&L>=2)return "sit"; return st.mode[side] };
  const segment=(s)=>{
    const mH=humans.home&&st.late.home?st.late.home:(humans.home?st.mode.home:cpuMode("home",s));
    const mA=humans.away&&st.late.away?st.late.away:(humans.away?st.mode.away:cpuMode("away",s));
    const AH=AGGR[mH]||AGGR.balanced, AA=AGGR[mA]||AGGR.balanced;
    const e=gap;                                          // home's edge in Elo
    let lamH=HK.shots/SEGS*(1+e*HK.shotEdge)*AH.own*AA.opp;
    let lamA=HK.shots/SEGS*(1-e*HK.shotEdge)*AA.own*AH.opp;
    if(s>=4&&st.h!==st.a){ if(st.h<st.a){lamH*=1+HK.scoreFx;lamA*=1-HK.scoreFx*0.6} else {lamA*=1+HK.scoreFx;lamH*=1-HK.scoreFx*0.6} }
    const pH=HK.sh*(1+e*HK.finishEdge), pA=HK.sh*(1-e*HK.finishEdge);
    const sH=shotsIn(rng,lamH), sA=shotsIn(rng,lamA);
    let gH=goalsFrom(rng,sH,pH), gA=goalsFrom(rng,sA,pA);
    // power plays: each side draws penalties; a power play is a few good shots
    const Lh=st.lines.h, La=st.lines.a; let ppH=0,ppA=0;
    if(rng.r()<HK.pens/SEGS){ ppH=shotsIn(rng,HK.ppShots); const g=goalsFrom(rng,ppH,HK.ppSh*(1+e*HK.finishEdge)); gH+=g; Lh.ppg+=g; Lh.pp++; La.pim+=2 }
    if(rng.r()<HK.pens/SEGS){ ppA=shotsIn(rng,HK.ppShots); const g=goalsFrom(rng,ppA,HK.ppSh*(1-e*HK.finishEdge)); gA+=g; La.ppg+=g; La.pp++; Lh.pim+=2 }
    Lh.sog+=sH+ppH; La.sog+=sA+ppA;
    st.h+=gH; st.a+=gA;
    // the last segment: trailing by one or two, the goalie comes out
    let en=null;
    if(s===SEGS-1){
      const tr=st.h<st.a?"home":st.a<st.h?"away":null;
      if(tr&&Math.abs(st.h-st.a)<=2){
        const when=(humans[tr]&&st.late[tr+"pull"])||"normal", mins=HK.pullMin[when], edge=tr==="home"?e:-e;
        // minute by minute with the extra attacker, until a goal changes it
        let m=0; while(m<mins){ const dt=Math.min(1,mins-m); m+=dt;
          const trG=rng.r()<HK.pullFor*dt*(1+edge*HK.finishEdge), enG=rng.r()<HK.pullAgainst*dt*(1-edge*HK.finishEdge);
          if(trG&&(!enG||rng.r()<0.5)){ if(tr==="home")st.h++; else st.a++; en={side:tr,kind:"extra"}; break }
          if(enG){ if(tr==="home")st.a++; else st.h++; en={side:tr==="home"?"away":"home",kind:"empty"}; break }
        }
      }
    }
    const d={seg:s,h:st.h-(st.drives.length?st.drives[st.drives.length-1].sh:0),a:st.a-(st.drives.length?st.drives[st.drives.length-1].sa:0),
      sh:st.h,sa:st.a,shots:[sH+ppH,sA+ppA],pp:[ppH>0,ppA>0],en:en,ot:0};
    st.drives.push(d); return d;
  };
  const overtime=()=>{
    const e=gap, pH=0.5+e*HK.finishEdge*2.2;
    if(st.playoff){                                          // sudden death: 20-minute periods until a goal
      let k=0; while(k++<8){ st.ot=k;
        const lamH=HK.shots/3*(1+e*HK.shotEdge), lamA=HK.shots/3*(1-e*HK.shotEdge);
        const gH=goalsFrom(rng,shotsIn(rng,lamH),HK.sh*(1+e*HK.finishEdge)), gA=goalsFrom(rng,shotsIn(rng,lamA),HK.sh*(1-e*HK.finishEdge));
        if(gH||gA){ if(gH&&(!gA||rng.r()<gH/(gH+gA)))st.h++; else st.a++; break } }
      if(st.h===st.a){ if(rng.r()<pH)st.h++; else st.a++ }
    } else {
      st.ot=1;
      if(rng.r()<HK.otGoal){ if(rng.r()<pH)st.h++; else st.a++ }
      else { st.so=true; if(rng.r()<0.5+(pH-0.5)*HK.soEdge)st.h++; else st.a++ }
    }
    st.drives.push({seg:SEGS,sh:st.h,sa:st.a,ot:st.ot,so:st.so,h:0,a:0,shots:[0,0],pp:[false,false]});
  };
  st.next=function(){
    const fin=()=>({done:true,h:st.h,a:st.a,drives:st.drives});
    if(st.done)return fin();
    if(st.pendingSide){
      const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null;
      if(P.dp.k==="push"||P.dp.k==="lock")st.late[P.side]=v==="push"?"push":v==="sit"?"sit":null;
      else if(P.dp.k==="pull")st.late[P.side+"pull"]=v;
    }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      const r={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,theirs:Q.side==="home"?st.a:st.h,q:st.seg<4?2:3,side:Q.side};
      st.waiting=r; return r}
    if(st.seg===4&&!st.intDone){st.intDone=true; queueCalls("int"); if(st.queue.length)return st.next()}
    if(st.seg===5&&!st.pullDone){st.pullDone=true; queueCalls("pull"); if(st.queue.length)return st.next()}
    if(st.seg>=SEGS){ if(st.h===st.a)overtime(); st.done=true; return fin() }
    const d=segment(st.seg); st.seg++;
    return {drive:d,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}
/* A whole game at once: the same game, with the computer's calls, or
   opts.decide for a person who isn't watching. */
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans,opts.playoff);
  let guard=0;
  while(guard++<60){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,ot:e.ot,so:e.so,lines:e.lines};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q}); e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,ot:0,lines:e.lines};
}
