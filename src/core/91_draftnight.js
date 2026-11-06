/* Draft night (pro football, pro basketball, hockey).

   The draft is drawn with its own dice, from the rosters as the season
   ended, so it can be shown pick by pick before the rest of the summer runs
   (contracts, aging and free agency stay on the offseason's own dice). It
   used to run in the middle of that batch, so nothing about it, the lottery
   included, could be known until the summer was over. The players drafted
   still join their rosters at the same point (league run, step 4).

   users: the human coaches' choices by team: draft (style), board (pids in
   order), hand (pids, one per pick of yours, made on draft night; null =
   none made). A pick the coach hasn't made yet: with stopFor set to that
   team, the draft stops there and says who's on the clock; otherwise the
   board, then the staff, decide, exactly as for a skipped draft night.

   Every pick draws the same dice whoever is taken (one draw per prospect
   still on the board, and one prospect goes per pick), so a different
   choice of yours changes later picks only through who is left. */
const DRAFT_NIGHT=0x2f6b1d3;
/* The draft's shape (tuned by measurement, test/draft-years.js): how far prospects spread, how many are
   hidden stars or busts, how foggy everyone's read is. Settable from the environment for the tuning runs. */
// only a set string counts: in a browser there is no process, and the lookup gave false, read as 0 (an empty draft class)
const denv=(k,d)=>{ const v=typeof process!=="undefined"&&process.env?process.env[k]:undefined; return typeof v==="string"&&v!==""&&isFinite(+v)?+v:d };
// Nov 2026 (draft night, round 30): a wider class with hidden stars (8%, +6 now and +6 ceiling) and busts (10%),
// reads 1.8x foggier and 30% of prospects hard to read, classes 1.4x deeper, the whole class 2.5 lower so
// the leagues' talent is unchanged (starters within 0.5 of before, measured). A league can override any of
// these (LEAGUE.offseason.draftShape: pro football keeps the old spread, which held its league's shape);
// the environment overrides both, for the tuning runs.
const DRAFT_DEF={sd:1.6, tp:0.08, tr:6, tpp:6, bp:0.1, fog:1.8, deep:1.4, shift:2.5, unsure:0.3, um:2.2};
const DRAFT_ENV={sd:"DRAFT_SD",tp:"DRAFT_TP",tr:"DRAFT_TR",tpp:"DRAFT_TPP",bp:"DRAFT_BP",fog:"DRAFT_FOG",deep:"DRAFT_DEEP",shift:"DRAFT_SHIFT",unsure:"DRAFT_UNSURE",um:"DRAFT_UM"};
const DRAFT_K=new Proxy({},{get:(o,k)=>{ const L=(typeof LEAGUE!=="undefined"&&LEAGUE.offseason&&LEAGUE.offseason.draftShape)||{};
  return denv(DRAFT_ENV[k],L[k]!==undefined?L[k]:DRAFT_DEF[k]) }});
/* some prospects are hard to read (a small school, an injury year): everyone misjudges them more, and your
   scouts say so. Fixed per player; the average fog is unchanged (clear reads are sharper). */
function draftUnsure(u,p){ return DRAFT_K.unsure>0&&(strHash((u.seed||0)+"|"+u.year+"|"+p.pid)%1000)/1000<DRAFT_K.unsure }
function draftFogOf(u,p){ if(!(DRAFT_K.unsure>0))return 1; const cm=Math.max(0.2,(1-DRAFT_K.unsure*DRAFT_K.um)/(1-DRAFT_K.unsure)); return draftUnsure(u,p)?DRAFT_K.um:cm }
/* a prospect's hidden shape, on its own dice (sh) so the class's other draws don't move: now and then a
   star (better now, a higher ceiling), now and then a bust (no ceiling); the class's average is kept */
function draftShape(sh,r,pot,lo,hi){
  const star=sh.r()<DRAFT_K.tp, bust=sh.r()<DRAFT_K.bp;
  r=r-DRAFT_K.tp*DRAFT_K.tr-DRAFT_K.shift+(star?DRAFT_K.tr:0);
  pot=pot-DRAFT_K.tp*DRAFT_K.tr-DRAFT_K.shift+(star?DRAFT_K.tr+DRAFT_K.tpp:0);
  r=Math.round(Math.max(lo,Math.min(hi,r)));
  pot=Math.round(Math.min(99,bust?r+2:Math.max(r+2,pot)));
  return {r:r,pot:pot,star:star,bust:bust};
}
/* a team's scouts' read on one prospect: its own dice per team and player, so it never moves;
   a private workout (wk) makes it sharper */
function scoutNoise(u,team){ return Math.max(0.8,2.6-orgEdge(u,team)*1.2)*DRAFT_K.fog }
function scoutRead(u,team,p,wk){
  const noise=scoutNoise(u,team)*(wk?WK_SHARP:draftFogOf(u,p));
  const r=new RNG(((u.seed||0)*69069^((u.year|0)*7919)^Math.imul(p.pid+1,2654435761)^strHash(team)^(wk?0x5f3759df:0))>>>0);
  const sr=Math.round(p.r+r.gauss(0,noise));
  return {sr:sr,spot:Math.round(Math.max(sr,p.pot+r.gauss(0,noise*1.6))),wk:!!wk,unsure:!wk&&draftUnsure(u,p)};
}
function draftRng(u){ return new RNG((((u.seed||0)*2246822519)^((u.year|0)*48271)^DRAFT_NIGHT)>>>0) }
function draftScore(style,R,p){
  return style==="need"?nflGain(R,p)*1.6+p.r*0.3
        :style==="upside"?p.pot*1.2+p.r*0.2+nflGain(R,p)*0.3
        :p.r+(p.pot-p.r)*0.45+nflGain(R,p)*0.5;
}
function draftNight(u,rec,elo,users,rounds,stopFor){
  users=users||{};
  const rng=draftRng(u), order=nflDraftOrder(rec,elo,rng), N=order.length;
  const prospects=nflDraftClass(u).list.map(p=>Object.assign({},p));
  const used={}, picks=[]; let boardGone=null;
  // each team's roster with its rookies placed as they're taken, so a later pick sees an earlier one (as before)
  const RR={}, rosterOf=t=>RR[t]||(RR[t]=u.roster[t].slice());
  const nextOf=(t,overall)=>{ const i=order.indexOf(t); if(i<0)return null;
    for(let r2=1;r2<=rounds;r2++){ const o=(r2-1)*N+i+1; if(o>overall)return o } return null };
  for(let rd=1;rd<=rounds;rd++)for(let k=0;k<N;k++){
    const t=order[k], R=rosterOf(t), ch=users[t]||null, overall=(rd-1)*N+k+1;
    const style=(ch&&ch.draft)||"bpa";
    const scout=(2.5-orgEdge(u,t)*1.4)*DRAFT_K.fog;     // how often a team misjudges a prospect
    // your staff work from your scouts' read, as you do (workouts included): beating them is judgment, not
    // hidden numbers. The dice are drawn either way, so nothing else moves.
    const wk=ch&&ch.workouts||[], read=ch?(p=>{ const x=scoutRead(u,t,p,wk.indexOf(p.pid)>=0); return Object.assign({},p,{r:x.sr,pot:x.spot}) }):null;
    let bi=0,bs=-1e9; prospects.forEach((p,i)=>{if(p.taken)return; const e=rng.gauss(0,scout)*draftFogOf(u,p), s=read?draftScore(style,R,read(p)):draftScore(style,R,p)+e; if(s>bs){bs=s;bi=i}});
    const staff=bi;
    // a coach's own board comes first: the highest player on it still there
    const board=(ch&&ch.board)||[];
    const mine=board.map(id=>prospects.findIndex(p=>p.pid===id&&!p.taken)).find(i=>i>=0);
    if(mine!==undefined)bi=mine;
    // a pick made on draft night
    if(ch&&ch.hand){
      const j=used[t]||0;
      if(j<ch.hand.length){ used[t]=j+1; const i=prospects.findIndex(p=>p.pid===ch.hand[j]&&!p.taken); if(i>=0)bi=i }
      else if(stopFor===t&&!ch.handDone)
        return {stop:{overall:overall,round:rd,pick:k+1,team:t,staff:prospects[staff].pid,suggest:prospects[bi].pid,
                      next:nextOf(t,overall)},order:order,picks:picks,prospects:prospects,rounds:rounds,boardGone:boardGone};
    }
    const p=prospects[bi]; p.taken=true;
    { const q=Object.assign({},p); if(nflGain(R,q)>0.6||!R[q.i]||!R[BK(q.i)])nflPlace(R,q) }
    // a player on someone's board taken before their turn: say so, or the board looks ignored
    Object.keys(users).forEach(ut2=>{ const B=(users[ut2]&&users[ut2].board)||[];
      if(ut2!==t&&B.indexOf(p.pid)>=0){ boardGone=boardGone||{}; (boardGone[ut2]=boardGone[ut2]||[]).push({n:p.n,p:p.p,to:t,overall:overall,yours:nextOf(ut2,overall)}) } });
    picks.push({pid:p.pid,n:p.n,p:p.p,team:t,round:rd,pick:k+1,overall:overall,staff:prospects[staff].pid});
  }
  return {order:order,picks:picks,prospects:prospects,rounds:rounds,boardGone:boardGone};
}
/* the drafted players join their teams (league run, step 4): the same placement as before */
function placeDraftNight(u,DN,rep,pool,leave,why){
  const byPid={}; DN.prospects.forEach(p=>byPid[p.pid]=p);
  const out=[];
  DN.picks.forEach(d=>{
    const t=d.team, R=u.roster[t], p=byPid[d.pid];
    p.draft={round:d.round,pick:d.pick,overall:d.overall,team:t,year:u.year};
    p.k={sal:rookieSal(d.overall),yrs:4}; p.joined=u.year+1; p.drafted=true;
    const g=nflGain(R,p);
    const made=g>0.6||!R[p.i]||!R[BK(p.i)];
    if(made){const o=nflPlace(R,p); if(o){rep.released[t].push(why?{n:o.n,p:o.p,r:o.r,why:why}:{n:o.n,p:o.p,r:o.r});
      if(o.r>=58){o.from=t;pool.push(o)} else leave(t,o,"released")}}
    rep.drafted[t].push({n:p.n,p:p.p,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made});
    out.push({n:p.n,p:p.p,team:t,r:p.r,pot:p.pot,from:p.from,d:p.draft,made:made,pid:p.pid});
  });
  if(DN.boardGone)rep.boardGone=DN.boardGone;
  return out;
}

/* ---- Draft night, the screen (single-coach careers; a hot seat keeps the board) ----
   Your picks are kept as you make them (S.off.picks.hand), so a reload comes
   back to the same pick, and the summer's run replays them. A pick you leave
   goes to your board, then your staff, as a skipped draft night does. */
const WK_SHARP=denv("DRAFT_WK",0.3);
// private workouts a year: where they're worth something (hockey's draftees rarely make a roster, and one who
// doesn't is gone, so a sharper read there changes nothing: measured, 7 drafts)
function dnWorkouts(){ return (LEAGUE.offseason&&LEAGUE.offseason.workouts)||0 }
function dnOn(){ return !!(S.off&&LEAGUE.offseason&&LEAGUE.offseason.draftRounds&&!isHotSeat()&&S.off.move!=="retire"&&!(S.off.act.userOpen&&S.off.move===null)) }
function dnTeam(){ return S.off&&S.off.move&&S.off.move!=="retire"?S.off.move:S.myTeam }
function dnOrder(){ return nflDraftOrder(SEA.rec,SEA.elo,draftRng(U)) }    // the lottery is the first thing drawn
function dnState(){ const t=dnTeam(), P=S.off.picks;
  return draftNight(U,SEA.rec,SEA.elo,{[t]:{draft:P.draft,board:P.board||[],hand:P.hand||[],handDone:!!P.handDone,workouts:P.workouts||[]}},LEAGUE.offseason.draftRounds,t) }
/* your scouts' read on a prospect; a private workout sharpens it (its own dice per player, so it never moves) */
function dnRead(pid,t){
  t=t||dnTeam(); const p=nflDraftClass(U,t).list[pid];
  return scoutRead(U,t,p,((S.off&&S.off.picks.workouts)||[]).indexOf(pid)>=0);
}
const dnVal=x=>x.sr+(x.spot-x.sr)*0.45;
/* where he'd fit on your roster as it stands */
function dnFit(p,t){ const R=U.roster[t]||[], i=p.i, x=dnRead(p.pid,t);
  if(i===undefined||i<0)return ""; const s=R[i], b=R[BK(i)];
  if(!s)return "fills an empty starting spot";
  if(x.sr>s.r)return `would start over ${esc(s.n)} (${s.r})`;
  // the summer keeps a rookie only if he helps (league run, step 4): said here, on your scouts' numbers, so a pick isn't cut by surprise
  const q=Object.assign({},p,{r:x.sr,pot:x.spot});
  return b&&!(nflGain(R,q)>0.6)?`<span class="dmaybe">may not make the roster</span> behind ${esc(s.n)} (${s.r}) and ${esc(b.n)} (${b.r})`:`backup to ${esc(s.n)} (${s.r})` }
/* a mock of the picks between now and your next, from your scouts' numbers: who's likely still there */
function dnMock(avail,ahead,key){
  const gone={}; if(ahead<=0)return gone; const M=80, r=new RNG(key>>>0);
  for(let m=0;m<M;m++){ const taken=new Set(); for(let k=0;k<ahead;k++){ let bi=-1,bs=-1e9;
      avail.forEach(p=>{ if(taken.has(p.pid))return; const v=p.v+r.gauss(0,3); if(v>bs){bs=v;bi=p.pid} }); if(bi<0)break; taken.add(bi) }
    taken.forEach(id=>gone[id]=(gone[id]||0)+1/M) }
  return gone;
}
/* the lottery, in words (basketball, hockey) */
function dnLotteryLine(){
  const before=nflDraftOrder(SEA.rec,SEA.elo), after=dnOrder(), t=dnTeam();
  if(before.join()===after.join())return "";
  const a=after.indexOf(t)+1, b=before.indexOf(t)+1;
  const top=after[0]===t?"You won the lottery: the first pick is yours.":`${esc(after[0])} won the lottery and picks first.`;
  const you=a===b?`You stay at ${ordinal(a)}.`:a<b?`You move up from ${ordinal(b)} to ${ordinal(a)}.`:`You drop from ${ordinal(b)} to ${ordinal(a)}.`;
  return `<div class="bnews flag"><b>Draft lottery.</b> ${top} ${after[0]===t||a===b?"":you}</div>`;
}
/* the offseason screen's draft section: your slot, the lottery, and the way in */
function dnSectionHTML(){
  const t=dnTeam(), o=dnOrder().indexOf(t)+1, P=S.off.picks, R=LEAGUE.offseason.draftRounds;
  let h=dnLotteryLine()+`<div class="note">You pick ${ordinal(o)} in each round${R>1?` (${nOf(R,"pick")} in all)`:""}.</div>`;
  if(!dnOn())return h;
  const made=(P.hand||[]).length, done=P.handDone||made>=R;
  h+=`<button class="advance gold dnopen" data-dnopen="1">${done?"Draft night: see your class":made?`Draft night: back to pick ${made+1} of ${R}`:"Go to draft night"}</button>`;
  h+=`<div class="note">${done?"Your picks are in.":`Make each pick yourself as the draft unfolds. Some prospects are hard to read, for you and every other team${dnWorkouts()?`: up to ${dnWorkouts()} private workouts get you a much sharper read on the ones you choose`:""}. Any pick you leave goes to your board below, then your staff.`}</div>`;
  return h;
}
function dnRowHTML(p,t,label,canPick){
  const x=dnRead(p.pid,t), wk=S.off.picks.workouts||[];
  return `<div class="drow dnrow">
    <div class="fmain"><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span> ${label||""}${x.wk?` <span class="dthere">worked out</span>`:x.unsure?` <span class="dmaybe">scouts unsure</span>`:""}</div>
      <div class="fnote">${esc(p.from)} &middot; age ${p.age} &middot; scouts say ~${x.sr}, ceiling ~${x.spot} &middot; ${dnFit(p,t)}</div></div>
    ${!x.wk&&wk.length<dnWorkouts()?`<button class="skip small" data-dnwork="${p.pid}">Work out</button>`:""}
    ${canPick?`<button class="skip small dnpick" data-dnpick="${p.pid}">Draft</button>`:""}</div>`;
}
function draftNightHTML(){
  const t=dnTeam(), D=dnState(), P=S.off.picks, mine=D.picks.filter(d=>d.team===t), wk=P.workouts||[];
  const last=mine.length?mine[mine.length-1].overall:0;
  const board=new Set(P.board||[]);
  let h=`<div class="dateline"><h2>Draft night</h2><span>${SEA.year}</span></div>`+dnLotteryLine();
  // the picks since your last: the latest few revealed one by one (the delay is CSS; nothing waits on it), the rest folded
  const since=D.picks.filter(d=>d.overall>last&&d.team!==t);
  const tick=(d,i,step)=>{ const x=dnRead(d.pid,t);
    return `<div class="dnline${step!==null?" dnrev":""}"${step!==null?` style="animation-delay:${Math.round(i*step)}ms"`:""}><span class="dpick">#${d.overall}</span>
      <span class="dnwho"><b style="color:${teamInk(d.team)}">${esc(d.team)}</b> ${esc(d.n)} <span class="dpos">${esc(d.p)}</span>${board.has(d.pid)?` <span class="dgone">off your board</span>`:""}</span>
      <span class="dnsc">~${x.sr} / ~${x.spot}</span></div>` };
  let tk="";
  if(since.length){ const SHOW=6, old=since.slice(0,-SHOW), now=since.slice(-SHOW), step=Math.min(220,1800/now.length);
    tk=`<div class="grouphead">${last?"Since your last pick":"The picks before yours"}</div>`
      +(old.length?`<details class="dnfold"><summary>${nOf(old.length,"earlier pick")}</summary>${old.map(d=>tick(d,0,null)).join("")}</details>`:"")
      +now.map((d,i)=>tick(d,i,step)).join("")+`<div class="note">Your scouts' read: now ~ / ceiling ~.</div>` }
  if(D.stop){
    const s=D.stop, avail=D.prospects.filter(p=>!p.taken).map(p=>Object.assign({},p,{v:dnVal(dnRead(p.pid,t))})).sort((a,b)=>b.v-a.v);
    const ahead=s.next?s.next-s.overall-1:0, gone=dnMock(avail,ahead,(U.seed||0)*2246822519^SEA.year*31337^s.overall);
    const lab=p=>!s.next?"":gone[p.pid]>0.75?`<span class="dgone">likely gone by #${s.next}</span>`:gone[p.pid]>0.25?`<span class="dmaybe">might last to #${s.next}</span>`:`<span class="dthere">likely there at #${s.next}</span>`;
    const sug=D.prospects.find(p=>p.pid===s.suggest), fromBoard=board.has(s.suggest);
    h+=`<div class="banner"><div class="bkick">Round ${s.round}, pick ${s.pick} &middot; #${s.overall} overall</div>
      <div class="btitle">You're on the clock.</div>
      <div class="bsub">${s.next?`Your next pick is #${s.next}.`:"Your last pick of the draft."} ${wk.length<dnWorkouts()?`${nOf(dnWorkouts()-wk.length,"private workout")} left: each gives you a much sharper read on one player, worth most where your scouts are unsure.`:dnWorkouts()?"Workouts used.":""}</div></div>`+tk;
    h+=`<div class="grouphead">${fromBoard?"Top of your board":"Your staff's pick"}</div>`+dnRowHTML(sug,t,lab(sug),true)
      +`<button class="skip" data-dnstaff="1">${fromBoard?"Take the top of my board":"Let my staff make this pick"}</button>`;
    h+=`<div class="grouphead">Best available, by your scouts</div>`+avail.filter(p=>p.pid!==s.suggest).slice(0,24).map(p=>dnRowHTML(p,t,lab(p),true)).join("");
    if(s.next)h+=`<div class="note">"Likely there" is a mock of the picks before your next one, from your scouts' numbers; other teams see the class their own way.</div>`;
    h+=`<button class="skip" data-dnrest="1">Let my staff make the rest of my picks</button>`;
  }else{
    h+=`<div class="banner"><div class="bkick">${SEA.year} draft</div><div class="btitle">Your class is in.</div>
      <div class="bsub">They join the roster when the new season's rosters are set.</div></div>`+tk;
  }
  if(mine.length)h+=`<div class="grouphead">Your class</div>`+mine.map(d=>{ const p=D.prospects.find(q=>q.pid===d.pid), x=dnRead(d.pid,t);
    return `<div class="drow"><span class="dpick">#${d.overall}</span><div class="fmain"><div class="fname">${esc(d.n)} <span class="dpos">${esc(d.p)}</span>${x.wk?` <span class="dthere">worked out</span>`:""}</div>
      <div class="fnote">scouts say ~${x.sr}, ceiling ~${x.spot} &middot; ${(P.hand||[])[mine.indexOf(d)]===undefined||(P.staffPicked||[]).indexOf(d.pid)>=0?"your staff's pick":"your pick"}</div></div></div>` }).join("");
  h+=`<button class="skip" data-dnback="1">Back to the offseason</button>`;
  return h;
}
function bindDraftNight(){
  const P=S.off.picks, go=()=>{ save(); render(); window.scrollTo({top:0,behavior:"auto"}) };
  document.querySelectorAll("[data-dnpick]").forEach(b=>b.onclick=()=>tapTwice(b,"Tap again",()=>{ P.hand=(P.hand||[]).concat([+b.dataset.dnpick]); go() }));
  document.querySelectorAll("[data-dnstaff]").forEach(b=>b.onclick=()=>{ const D=dnState(); if(D.stop){ P.hand=(P.hand||[]).concat([D.stop.suggest]); if(!(P.board||[]).length||(P.board||[]).indexOf(D.stop.suggest)<0)P.staffPicked=(P.staffPicked||[]).concat([D.stop.suggest]); go() } });
  document.querySelectorAll("[data-dnrest]").forEach(b=>b.onclick=()=>tapTwice(b,"Tap again: your staff picks the rest",()=>{ P.handDone=true; go() }));
  document.querySelectorAll("[data-dnwork]").forEach(b=>b.onclick=()=>{ P.workouts=P.workouts||[]; if(P.workouts.length<dnWorkouts())P.workouts.push(+b.dataset.dnwork); save(); render() });
  document.querySelectorAll("[data-dnback]").forEach(b=>b.onclick=()=>{ S.off.dn=false; go() });
}
/* the offseason screen's own buttons for it */
function bindDraftSection(){
  document.querySelectorAll("[data-dnopen]").forEach(b=>b.onclick=()=>{ S.off.dn=true; S.off.picks.hand=S.off.picks.hand||[]; save(); render(); window.scrollTo({top:0,behavior:"auto"}) });
  document.querySelectorAll("[data-dnwork]").forEach(b=>b.onclick=()=>{ const P=S.off.picks; P.workouts=P.workouts||[]; if(P.workouts.length<dnWorkouts())P.workouts.push(+b.dataset.dnwork); save(); render() });
}
/* a change of job: draft night was for the other team */
function dnReset(){ if(!S.off)return; const P=S.off.picks; delete P.hand; delete P.handDone; delete P.staffPicked; delete P.workouts; S.off.dn=false }
