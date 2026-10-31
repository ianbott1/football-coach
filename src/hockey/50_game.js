/* ============ the game engine: hockey ============ */
/* Three 20-minute periods, played as twelve five-minute spells. Each side
   takes shots at a rate shaped by its edge, and each shot scores at a rate
   shaped by it too and by the goalie in net; penalties give the other side a
   power play. The side behind pushes in the third and the side ahead sits
   back (score effects). Trailing late, the goalie comes out for an extra
   attacker: goals both ways. Regular season: five minutes of three-on-three,
   then a shootout. Playoffs: sudden-death periods.

   Every side plays a system: an aggressive forecheck, a neutral-zone trap or
   a grinding cycle. It shows in the numbers (giveaways it forces in your
   zone, zone entries it kills, time it spends cycling below your goal line)
   and in the commentary. The right answer blunts it; the wrong one costs a
   little. And every goalie has a night: now and then a genuinely bad one,
   which shows in goals let in against what the shots were worth, and in how
   soft they were. A goalie on a bad night is worth pulling; one who has been
   unlucky is better than his backup.

   Your calls: the read at the first intermission; your goalie at either
   intermission when he has let in two or more; at the second intermission,
   push or lock it down; trailing late, when to pull the goalie. Every call's
   last option leaves it to your assistant, who does what the computer does. */
const SEGS = 12;
const DRIVES_PER_TEAM = 6;                    // the live clock's pace: twelve spells a game
const HK_BASE = {
  shots:25,          // even-strength shots on goal per team per game (power plays add ~5)
  shotSd:1.0,        // spread of a spell's shots (x sqrt of the rate)
  sh:0.0798,         // a shot's chance of scoring at even strength (an average night: some are bad)
  pens:3.1,          // power plays per team per game
  ppShots:1.55,      // shots on a power play
  ppSh:0.135,        // their chance of scoring
  shotEdge:0.00134,  // per Elo of edge: more shots...
  finishEdge:0.00124,// ...and a better chance each (both up a little: bad nights in goal add luck)
  scoreFx:0.13,      // third period: the side behind shoots this much more
  pullMin:{normal:1.6, early:3.2},   // minutes the goalie is out
  pullFor:0.15,      // the trailer's goals a minute with the extra attacker
  pullAgainst:0.20,  // empty-net goals a minute against
  otGoal:0.68,       // chance three-on-three produces a goal (else a shootout)
  soEdge:0.25,       // how much edge counts in a shootout (of the overtime's)
  counter:{own:1.10, opp:0.85},   // the right answer to their system
  misread:0.95,      // the wrong answer: your own chances, slightly fewer
  offNight:0.10,     // how often a goalie has a genuinely bad night...
  offBy:0.060,       // ...and how much more often shots go in
  formSd:0.007,      // an ordinary night's spread
  backup:0.006,      // the backup: this much worse than the starter on average
  softBad:0.65, softOk:0.15,   // goals the commentary calls soft: on a bad night, on an ordinary one
  cueTrue:0.5        // commentary on a system that is about the real one
};
const HK = Object.assign({}, HK_BASE, (typeof LEAGUE!=="undefined"&&LEAGUE.tuning&&LEAGUE.tuning.hk)||{}, (typeof HK_TRY!=="undefined"?HK_TRY:{}));
/* gameplans and in-game modes: how many events a side creates, and allows */
const AGGR = {
  safe:      {own:1.12, opp:1.10},   // skate with them: more hockey, both ways
  balanced:  {own:1.00, opp:1.00},
  aggressive:{own:0.86, opp:0.84},   // clog it up: fewer chances, more luck
  push:      {own:1.20, opp:1.12},
  sit:       {own:0.84, opp:0.90},
  urgent:    {own:1.00, opp:1.00}
};
/* systems: own and opp scale a side's shots and the shots it allows */
const SYSTEM = {
  forecheck:{l:"an aggressive forecheck", own:1.05, opp:1.05, counter:"stretch"},
  trap:     {l:"a neutral-zone trap",     own:0.88, opp:0.86, counter:"dump"},
  cycle:    {l:"a grinding cycle",        own:1.03, opp:0.98, counter:"collapse"}
};
const SYSTEM_KEYS=["forecheck","trap","cycle"];
const ANSWERS = {
  stretch: {beats:"forecheck", l:"Stretch passes: beat the first man", d:"Quick, direct breakouts before their forwards arrive"},
  dump:    {beats:"trap",      l:"Dump it in and chase",               d:"Stop trying to carry it through the middle"},
  collapse:{beats:"cycle",     l:"Collapse low, take away the slot",   d:"Live with point shots; own the net-front"}
};
/* what each system leaves in the numbers, per spell: [giveaways it forces in
   the other side's zone, entries it kills at the blue line, cycle shifts] */
const HK_TELL = { forecheck:[2.0,0.6,0.7], trap:[0.5,2.1,0.5], cycle:[0.6,0.6,2.0] };
const HK_TELL_BASE=[0.7,0.7,0.7];
function shotsIn(rng,lam){ return Math.max(0,Math.round(rng.gauss(lam,Math.sqrt(Math.max(lam,0.01))*HK.shotSd))) }
function goalsFrom(rng,n,p){ let g=0; for(let i=0;i<n;i++)if(rng.r()<p)g++; return g }
function hkRead(T){
  const n=Math.max(1,T.n), out={};
  SYSTEM_KEYS.forEach(k=>{ const t=HK_TELL[k]; let s=0;
    s+=(T.to/n-HK_TELL_BASE[0])*(t[0]-HK_TELL_BASE[0]);
    s+=(T.fe/n-HK_TELL_BASE[1])*(t[1]-HK_TELL_BASE[1]);
    s+=(T.cy/n-HK_TELL_BASE[2])*(t[2]-HK_TELL_BASE[2]); out[k]=s });
  return SYSTEM_KEYS.reduce((a,k)=>out[k]>out[a]?k:a,SYSTEM_KEYS[0]);
}
const ASSIST=["normal","Leave it to your assistant"];
function readCall(T,hint){
  return {k:"read",h:"First intermission",q:"How are they playing us? Pick the answer.",
    opts:Object.keys(ANSWERS).map(a=>[a,ANSWERS[a].l]).concat([ASSIST]),
    tell:{to:T.to,fe:T.fe,cy:T.cy,n:T.n}, best:hkRead(T), pearl:hint||hkRead(T)};
}
function goalieCall(per,G){
  return {k:"goalie",h:per===1?"Your goalie, after one":"Your goalie, after two",
    q:"He's let in "+G.ga+". Bad night, or bad luck?",
    opts:[["swap","Put the backup in"],["keep","Keep him in"],ASSIST],
    ga:G.ga, xga:Math.round(G.xga*10)/10, soft:G.soft, sa:G.sa, pearl:G.lastSoft};
}
function intCall(lead){
  return lead<0
    ? {k:"push",h:`Down ${-lead} after two`,q:"Twenty minutes left. Open it up?",
       opts:[["push","Push: pinch the D, more shots"],["keep","Stay the course"],ASSIST]}
    : {k:"lock",h:`Up ${lead} after two`,q:"Twenty minutes left. Sit on it?",
       opts:[["sit","Lock it down: trap, block shots"],["keep","Keep playing our game"],ASSIST]};
}
function pullCall(lead){
  return {k:"pull",h:`Down ${-lead}, late in the third`,q:"When does the goalie come out?",
    opts:[["early","Early: over three minutes left"],["late","The usual: under two minutes"],ASSIST]};
}
function makeLiveGame(rng, eloH, eloA, planH, planA, humans, playoff){
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const night=()=>rng.r()<HK.offNight?HK.offBy+rng.gauss(0,HK.formSd):rng.gauss(0,HK.formSd);
  const side0=()=>({sys:null, ans:null, form:night(), backupIn:false, ga:0, xga:0, soft:0, sa:0, lastSoft:null,
    tell:{to:0,fe:0,cy:0,n:0}, lastCue:null});
  const st={h:0,a:0,drives:[],seg:0,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{home:null,away:null}, asked:{}, queue:[], ask:null,
    ot:0, so:false, done:false, playoff:!!playoff, S:{home:side0(),away:side0()}};
  const other=s=>s==="home"?"away":"home";
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  // a side's system: the better side forechecks, the weaker traps
  const pickSys=(side)=>{
    const m=st.mode[side];
    if(humans[side]){ if(m==="safe")return "forecheck"; if(m==="aggressive")return "trap"; return "cycle" }
    const e=side==="home"?gap:-gap, w=e>60?[3,1,2]:e<-60?[1,3,2]:[2,2,2];
    let x=rng.r()*6, i=0; while(x>w[i]){x-=w[i];i++} return SYSTEM_KEYS[i];
  };
  st.S.home.sys=pickSys("home"); st.S.away.sys=pickSys("away");
  const queueCall=(side,dp)=>{ const key=dp.k+(dp.h||"")+side; if(!humans[side]||st.asked[key])return;
    st.asked[key]=true; st.queue.push({side:side,dp:dp}) };
  // the computer: push when behind in the third, sit on a lead of two or more
  const cpuMode=(side,s)=>{ const L=lead(side);
    if(s>=8&&L<0)return "push"; if(s>=8&&L>=2)return "sit"; return st.mode[side] };
  const modeOf=(s,side)=>{ const L=humans[side]&&st.late[side];
    if(L==="auto"||!humans[side])return cpuMode(side,s);
    return L||st.mode[side] };
  const readIt=(side,p)=>{ if(rng.r()<p)st.S[side].ans=SYSTEM[st.S[other(side)].sys].counter };
  // the computer's goalie rule: four in, he's out (once)
  const cpuGoalie=(side)=>{ const X=st.S[side]; if(!X.backupIn&&X.ga>=4)swapGoalie(side) };
  const swapGoalie=(side)=>{ const X=st.S[side]; X.backupIn=true; X.form=night()+HK.backup; X.ga=0; X.xga=0; X.soft=0; X.sa=0;
    (st.pendEv=st.pendEv||[]).push({m:st.seg*5,side:side,k:"swap"}) };
  const segment=(s)=>{
    const mH=modeOf(s,"home"), mA=modeOf(s,"away");
    const AH=AGGR[mH]||AGGR.balanced, AA=AGGR[mA]||AGGR.balanced;
    const e=gap, ev=(st.pendEv||[]).splice(0);
    const sysF=(side)=>{ const X=st.S[side], O=st.S[other(side)]; let f=SYSTEM[X.sys].own*SYSTEM[O.sys].opp;
      if(X.ans){ if(ANSWERS[X.ans].beats===O.sys)f*=HK.counter.own; else f*=HK.misread }
      if(O.ans&&ANSWERS[O.ans].beats===X.sys)f*=HK.counter.opp;
      return f };
    let lamH=HK.shots/SEGS*(1+e*HK.shotEdge)*AH.own*AA.opp*sysF("home");
    let lamA=HK.shots/SEGS*(1-e*HK.shotEdge)*AA.own*AH.opp*sysF("away");
    if(s>=8&&st.h!==st.a){ if(st.h<st.a){lamH*=1+HK.scoreFx;lamA*=1-HK.scoreFx*0.6} else {lamA*=1+HK.scoreFx;lamH*=1-HK.scoreFx*0.6} }
    // a shot's chance: the shooter's edge, and the goalie it's against
    const pH=HK.sh*(1+e*HK.finishEdge)+st.S.away.form, pA=HK.sh*(1-e*HK.finishEdge)+st.S.home.form;
    const t0=s*5, minute=()=>t0+rng.r()*5;
    const shoot=(side,n,p,pp)=>{ const G=st.S[other(side)]; let g=0;
      for(let i=0;i<n;i++){ G.sa++; G.xga+=pp?HK.ppSh:HK.sh;
        if(rng.r()<Math.max(0.01,p)){ g++; G.ga++;
          // was it soft? A goalie on a bad night lets in more that he should stop
          const bad=G.form>HK.offBy/2, soft=rng.r()<(bad?HK.softBad:HK.softOk);
          if(soft){G.soft++; G.lastSoft=true} else G.lastSoft=false;
          ev.push({m:minute(),side:side,k:"goal",pp:!!pp,soft:soft,u:rng.int(100)}) } }
      return g };
    const sH=shotsIn(rng,lamH), sA=shotsIn(rng,lamA);
    let gH=shoot("home",sH,pH), gA=shoot("away",sA,pA);
    const Lh=st.lines.h, La=st.lines.a; let ppH=0,ppA=0;
    if(rng.r()<HK.pens/SEGS){ ppH=shotsIn(rng,HK.ppShots); ev.push({m:minute(),side:"away",k:"pen",u:rng.int(100)});
      const g=shoot("home",ppH,HK.ppSh*(1+e*HK.finishEdge)+st.S.away.form,true); gH+=g; Lh.ppg+=g; Lh.pp++; La.pim+=2 }
    if(rng.r()<HK.pens/SEGS){ ppA=shotsIn(rng,HK.ppShots); ev.push({m:minute(),side:"home",k:"pen",u:rng.int(100)});
      const g=shoot("away",ppA,HK.ppSh*(1-e*HK.finishEdge)+st.S.home.form,true); gA+=g; La.ppg+=g; La.pp++; Lh.pim+=2 }
    Lh.sog+=sH+ppH; La.sog+=sA+ppA;
    st.h+=gH; st.a+=gA;
    // big saves, now and then
    [["home",sA+ppA],["away",sH+ppH]].forEach(([sd,n])=>{ if(n>=3&&rng.r()<0.35)ev.push({m:minute(),side:sd,k:"save",u:rng.int(100)}) });
    // the tells
    ["home","away"].forEach(sd=>{ const X=st.S[sd], t=HK_TELL[X.sys], T=X.tell;
      T.to+=Math.max(0,Math.round(rng.gauss(t[0],Math.sqrt(t[0])))); T.fe+=Math.max(0,Math.round(rng.gauss(t[1],Math.sqrt(t[1]))));
      T.cy+=Math.max(0,Math.round(rng.gauss(t[2],Math.sqrt(t[2])))); T.n++;
      if(rng.r()<0.3){ const k=rng.r()<HK.cueTrue?X.sys:rng.pick(SYSTEM_KEYS), u=rng.int(100);
        ev.push({m:minute(),side:sd,k:"cue",cue:k,u:u}); if(u%3===0)X.lastCue=k } });
    // the last spell: trailing by one or two, the goalie comes out
    let en=null;
    if(s===SEGS-1){
      const tr=st.h<st.a?"home":st.a<st.h?"away":null;
      if(tr&&Math.abs(st.h-st.a)<=2){
        const pick=humans[tr]&&st.late[tr+"pull"], when=pick==="early"?"early":"normal";
        const mins=HK.pullMin[when], edge=tr==="home"?e:-e;
        ev.push({m:60-mins,side:tr,k:"pull"});
        let m=0; while(m<mins){ const dt=Math.min(1,mins-m); m+=dt;
          const trG=rng.r()<HK.pullFor*dt*(1+edge*HK.finishEdge), enG=rng.r()<HK.pullAgainst*dt*(1-edge*HK.finishEdge);
          if(trG&&(!enG||rng.r()<0.5)){ if(tr==="home")st.h++; else st.a++; en={side:tr,kind:"extra"};
            ev.push({m:60-mins+m,side:tr,k:"goal",extra:true,u:rng.int(100)}); break }
          if(enG){ if(tr==="home")st.a++; else st.h++; en={side:tr==="home"?"away":"home",kind:"empty"};
            ev.push({m:60-mins+m,side:other(tr),k:"goal",en:true,u:rng.int(100)}); break }
        }
      }
    }
    ev.sort((x,y)=>x.m-y.m); ev.forEach(x=>x.m=Math.min(59,Math.floor(x.m)));
    const prev=st.drives.length?st.drives[st.drives.length-1]:{sh:0,sa:0};
    const mom=Math.max(0.12,Math.min(0.88,(sH+ppH+0.5)/(sH+ppH+sA+ppA+1)+rng.gauss(0,0.05)));
    const d={seg:s,h:st.h-prev.sh,a:st.a-prev.sa,sh:st.h,sa:st.a,shots:[sH+ppH,sA+ppA],pp:[ppH>0,ppA>0],en:en,ot:0,ev:ev,mom:mom,
      T:{home:Object.assign({},st.S.home.tell),away:Object.assign({},st.S.away.tell)},
      sog:[Lh.sog,La.sog]};
    st.drives.push(d); return d;
  };
  const overtime=()=>{
    const e=gap, pH=0.5+e*HK.finishEdge*2.2, ev=[];
    if(st.playoff){                                          // sudden death: 20-minute periods until a goal
      let k=0; while(k++<8){ st.ot=k;
        const lamH=HK.shots/3*(1+e*HK.shotEdge), lamA=HK.shots/3*(1-e*HK.shotEdge);
        const gH=goalsFrom(rng,shotsIn(rng,lamH),HK.sh*(1+e*HK.finishEdge)+st.S.away.form), gA=goalsFrom(rng,shotsIn(rng,lamA),HK.sh*(1-e*HK.finishEdge)+st.S.home.form);
        if(gH||gA){ const w=(gH&&(!gA||rng.r()<gH/(gH+gA)))?"home":"away"; if(w==="home")st.h++; else st.a++;
          ev.push({m:60+(k-1)*20+rng.int(20),side:w,k:"goal",u:rng.int(100)}); break } }
      if(st.h===st.a){ const w=rng.r()<pH?"home":"away"; if(w==="home")st.h++; else st.a++; ev.push({m:60+st.ot*20,side:w,k:"goal",u:rng.int(100)}) }
    } else {
      st.ot=1;
      if(rng.r()<HK.otGoal){ const w=rng.r()<pH?"home":"away"; if(w==="home")st.h++; else st.a++; ev.push({m:60+rng.int(5),side:w,k:"goal",u:rng.int(100)}) }
      else { st.so=true; if(rng.r()<0.5+(pH-0.5)*HK.soEdge)st.h++; else st.a++ }
    }
    st.drives.push({seg:SEGS,sh:st.h,sa:st.a,ot:st.ot,so:st.so,h:0,a:0,shots:[0,0],pp:[false,false],ev:ev});
  };
  st.log=[];            // the person's reads, and what was true (for the result screen)
  const apply=(side,dp,v)=>{
    const X=st.S[side];
    if(dp.k==="read"&&ANSWERS[v]){ const t=st.S[other(side)].sys; st.log.push({side:side,k:"read",pick:v,truth:t,right:ANSWERS[v].beats===t}) }
    if(dp.k==="goalie"&&(v==="swap"||v==="keep")){ const off=X.form>HK.offBy/2; st.log.push({side:side,k:"goalie",pick:v,truth:off?"off":"ok",right:(v==="swap")===off}) }
    if(dp.k==="read"){ if(ANSWERS[v])X.ans=v; else readIt(side,0.45); return }
    if(dp.k==="goalie"){ if(v==="swap")swapGoalie(side); else if(v==="normal")cpuGoalie(side); return }
    if(dp.k==="push"||dp.k==="lock"){ st.late[side]=v==="push"?"push":v==="sit"?"sit":v==="keep"?st.mode[side]:"auto"; return }
    if(dp.k==="pull")st.late[side+"pull"]=v==="early"?"early":"normal";
  };
  st.next=function(){
    const fin=()=>({done:true,h:st.h,a:st.a,drives:st.drives});
    if(st.done)return fin();
    if(st.pendingSide){ const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null; apply(P.side,P.dp,v) }
    if(st.queue.length){const Q=st.queue.shift(); st.pendingSide=Q;
      const r={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,theirs:Q.side==="home"?st.a:st.h,q:st.seg,side:Q.side};
      st.waiting=r; return r}
    const s=st.seg;
    // first intermission: the read, and your goalie if he's let in two or more
    if(s===4&&!st.i1){st.i1=true; ["home","away"].forEach(sd=>{ const X=st.S[sd], O=st.S[other(sd)];
        if(!humans[sd]){ readIt(sd,0.45); cpuGoalie(sd); return }
        queueCall(sd,readCall(O.tell,O.lastCue));
        if(X.ga>=2&&!X.backupIn)queueCall(sd,goalieCall(1,X)) });
      if(st.queue.length)return st.next()}
    // second intermission: the score, and your goalie
    if(s===8&&!st.i2){st.i2=true; ["home","away"].forEach(sd=>{ const X=st.S[sd], L=lead(sd);
        if(!humans[sd]){ cpuGoalie(sd); return }
        if(X.ga>=2&&!X.backupIn)queueCall(sd,goalieCall(2,X));
        if(L!==0)queueCall(sd,intCall(L)) });
      if(st.queue.length)return st.next()}
    if(s===11&&!st.pl){st.pl=true; ["home","away"].forEach(sd=>{ const L=lead(sd); if(L===-1||L===-2)queueCall(sd,pullCall(L)) });
      if(st.queue.length)return st.next()}
    if(s>=SEGS){ if(st.h===st.a)overtime(); st.done=true; return fin() }
    const d=segment(s); st.seg++;
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
  while(guard++<120){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,ot:e.ot,so:e.so,lines:e.lines};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q}); e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,ot:0,lines:e.lines};
}
