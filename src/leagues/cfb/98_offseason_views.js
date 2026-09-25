/* ============ offseason screens: college football ============ */
/* The offseason screen (job offers, staff, recruiting focus, philosophy,
   budget) and the banner that closes a season (coaching news, recruiting,
   realignment, awards, draft night). The core shows them through LEAGUE.ui
   and asks offseasonBlock() whether the user may move on yet. */

function budgetLeft(){
  if(!S.off)return 0;
  const B=S.off.picks.budget;
  return S.off.pool-LEAGUE.offseason.budget.buckets.reduce((s,b)=>s+(B[b.k]||0),0);
}

function offseasonBanner(){
  const last=S.history[S.history.length-1];
  if(!last)return "";
  const my=S.myTeam;
  const myHire=(last.hires||[]).find(x=>x.team===my);
  const myPoach=(last.poached||[]).find(x=>x.from===my);
  let news="";
  if(myPoach)news=`<div class="bnews flag"><b>${esc(myPoach.name)} left for
    ${esc(myPoach.to)}.</b> ${myHire?esc(myHire.name)+" takes over.":""}</div>`;
  else if(last.fired&&myHire)news=`<div class="bnews flag"><b>Coaching change.</b>
    ${esc(myHire.name)} is your new head coach.</div>`;
  else if(myHire)news=`<div class="bnews"><b>${esc(myHire.name)}</b> hired as head coach.</div>`;
  const cls=last.classes?last.classes[my]:null;
  const early=last.early?last.early[my]:null;
  let rec="";
  if(cls)rec=`<div class="bnews"><b>Recruiting:</b> ${esc(cls.l)} &mdash;
    ranked ${cls.rank} of ${cls.of} nationally.</div>`;
  if(early){
    rec+=`<div class="bnews small">${early.map(p=>esc(p.n)+" ("+esc(p.p)+")").join(", ")}
      declared early for the draft.</div>`;
    if(early.some(p=>p.featured))
      rec+=`<div class="bnews"><b>NFL pipeline.</b> Sending a player you built to the draft
        is a recruiting pitch &mdash; future classes take note.</div>`;
  }
  const ra=(last.realigned||[]).length?`<div class="bnews"><b>Realignment.</b> ${
    last.realigned.map(m=>esc(m.team)+" leaves the "+esc(LEAGUE.conf.names[m.from]||m.from)+
      " for the "+esc(LEAGUE.conf.names[m.to]||m.to)).join("; ")}.</div>`:"";
  const hz=last.heis&&last.heis[0]?`<div class="bnews small">${esc(last.heis[0].n)}
    (${esc(last.heis[0].p)}, ${esc(last.heis[0].t)}) won the ${LEAGUE.awards.mvp}.</div>`:"";
  const mine=(last.allconf&&last.allconf.list||[]).filter(x=>x.team===my);
  const acn=mine.length?`<div class="bnews"><b>All-conference.</b> ${
    mine.map(x=>esc(x.n)+" ("+esc(x.pos)+")").join(", ")} made the
    All-${esc(LEAGUE.conf.names[last.allconf.conf]||"")} team.</div>`:"";
  const cm=(last.coordMoves||[]).filter(m=>m.from===my);
  const cmn=cm.length?`<div class="bnews flag"><b>Staff loss.</b> ${
    cm.map(m=>esc(m.name)+" ("+m.side.toUpperCase()+") takes the head job at "+esc(m.to)).join("; ")}.</div>`:"";
  const cmo=(last.coordMoves||[]).filter(m=>m.from!==my).slice(0,2).map(m=>
    `<div class="bnews small">${esc(m.name)}, ${esc(m.from)} ${m.side.toUpperCase()},
      hired as head coach at ${esc(m.to)}.</div>`).join("");
  const bigMoves=(last.poached||[]).slice(0,3).map(p=>
    `<div class="bnews small">${esc(p.name)} leaves ${esc(p.from)} for ${esc(p.to)}.</div>`).join("");
  return `<div class="banner"><div class="bkick">${last.year} in the books</div>
    <div class="btitle">${esc(last.result)}</div>
    <div class="bsub">${esc(last.champion)} won the national title.
      ${(last.hires||[]).length} programs hired a new head coach.</div>
    ${news}${cmn}${ra}${acn}${rec}${hz}${cmo}${bigMoves}
    ${(function(){
      const mine=(last.draft||[]).filter(d=>d.team===my);
      if(!mine.length)return "";
      return `<div class="grouphead">Draft night &mdash; ${last.year}</div>`+
        mine.map(d=>`<div class="drow">
          <span class="dpick">${d.d.round}.${String(d.d.pick).padStart(2,"0")}</span>
          <div class="fmain"><div class="fname">${esc(d.n)}
            <span class="dpos">${esc(d.p)}</span></div>
          <div class="fnote">${esc(d.d.nfl)}${d.early?" &middot; left early":""}${
            d.d.overall===1?" &middot; No. 1 overall":""}</div></div>
          <span class="dovr">#${d.d.overall}</span></div>`).join("");
    })()}
    <button class="cardbtn" data-card="${S.history.length-1}">Season card &mdash; share ${last.year}</button>
    </div>`;
}

function offseasonScreen(){
  const A=S.off.act, P=S.off.picks, my=S.myTeam;
  const last=SEA;
  let h=`<div class="dateline"><h2>Offseason</h2><span>${last.year} &rarr; ${last.year+1}</span></div>`;
  const exp=S.expNow||expectations();
  const gr=seasonGrade(last.rec[my][0],last.rec[my][1],last.screenResult(my),exp);
  const miles=milestones(last.rec[my][0],last.rec[my][1],
    last.champion===my?"NATIONAL":"",last.poll.rankMap()[my]);
  h+=`<div class="banner"><div class="bkick">${last.year} final</div>
    <div class="gradebox"><span class="grade">${gr.g}</span>
      <div><div class="btitle" style="margin:0">${last.rec[my][0]}-${last.rec[my][1]}</div>
      <div class="gradeline">${esc(gr.l)}</div></div></div>
    ${miles.map(m=>`<div class="bnews"><b>Milestone.</b> ${m}</div>`).join("")}
    <div class="bsub">${esc(last.champion)} won the national title.
    ${A.hires.length} programs changed coaches.</div>
    ${A.poached.slice(0,2).map(p=>`<div class="bnews small">${esc(p.name)} leaves
      ${esc(p.from)} for ${esc(p.to)}.</div>`).join("")}</div>`;

  const C=S.career;
  const jobRow=(t,tag)=>`<div class="cand ${S.off.move===t?'on':''}" data-job="${esc(t)}">
    <div class="candtop"><div>
      <div class="fname" style="color:${teamInk(t)}">${esc(t)}</div>
      <div class="fnote">${esc(LEAGUE.conf.names[CONF[t]])} &middot; ${
        U.program[t]>=1850?"blue blood":U.program[t]>=1650?"solid job":
        U.program[t]>=1450?"middling job":"rebuild"}</div></div>
      <span class="cgrade">${esc(tag)}</span></div>
    <div class="cdesc">Last season ${last.rec[t]?last.rec[t][0]+"-"+last.rec[t][1]:"&mdash;"}.
      ${U.program[t]>U.program[my]?"A step up.":U.program[t]<U.program[my]-120?"A step down.":"A lateral move."}</div></div>`;

  if(A.userOpen){
    h+=`<div class="firedbox"><div class="bkick">You have been let go</div>
      <div class="btitle">${esc(my)} has fired you.</div>
      <div class="bsub">Career ${C.w}-${C.l} &middot; you are ${esc(repGrade(C.rep))}.
      ${S.off.jobs.length?"These programs will take you.":"Nobody is calling."}</div></div>`;
    h+=`<div class="grouphead">1. Where do you go next?</div>`;
    h+=S.off.jobs.map(t=>jobRow(t,U.program[t]>U.program[my]?"step up":"opening")).join("");
    h+=`<div class="cand ${S.off.move==="retire"?'on':''}" data-job="retire">
      <div class="candtop"><div><div class="fname">Retire</div>
      <div class="fnote">End your career here</div></div></div>
      <div class="cdesc">Walk away with a ${C.w}-${C.l} record and ${C.titles}
        national title${C.titles===1?"":"s"}.</div></div>`;
  }else if(S.off.poach.length){
    h+=`<div class="grouphead">1. You have offers</div>`;
    h+=`<div class="note">${esc(repGrade(C.rep))[0].toUpperCase()+esc(repGrade(C.rep)).slice(1)}
      &mdash; bigger programs have come calling. You can stay or you can go.</div>`;
    h+=`<div class="cand ${!S.off.move?'on':''}" data-job="${esc(my)}">
      <div class="candtop"><div><div class="fname" style="color:${teamInk(my)}">Stay at ${esc(my)}</div>
      <div class="fnote">Year ${(U.coach[my]?U.coach[my].t:0)+1}</div></div>
      <span class="cgrade">loyalty</span></div>
      <div class="cdesc">Finish what you started.</div></div>`;
    h+=S.off.poach.map(t=>jobRow(t,"step up")).join("");
  }else{
    h+=`<div class="grouphead">Your job</div>
      <div class="coachbar plain" style="padding:12px 16px">
      <div class="cleft"><div class="cname">${esc(C.name)} <span class="youtag">YOU</span></div>
      <div class="cmeta">Year ${(U.coach[my]?U.coach[my].t:0)+1} at ${esc(my)}
        &middot; career ${C.w}-${C.l} &middot; ${esc(repGrade(C.rep))}</div></div></div>`;
  }

  const SC=S.off.staff||{};
  ["oc","dc"].forEach(side=>{
    const cands=SC[side]; if(!cands)return;
    const label=side==="oc"?"offensive":"defensive";
    h+=`<div class="grouphead">Hire a new ${label} coordinator</div>`;
    h+=`<div class="note">Your ${label} coordinator has moved on. He shapes how that side
      of the ball plays and develops.</div>`;
    h+=cands.map((c,i)=>`<div class="cand ${(P[side]===i||(P[side]==null&&i===0))?'on':''}"
      data-coord="${side}" data-ci="${i}">
      <div class="candtop"><div><div class="fname">${esc(c.n)}</div>
      <div class="fnote">${esc(c.s)}</div></div>
      <span class="cgrade">${esc(c.grade)}</span></div></div>`).join("");
  });
  const step=(A.userOpen||S.off.poach.length)?1:0;
  const B=P.budget, used=LEAGUE.offseason.budget.buckets.reduce((s,b)=>s+(B[b.k]||0),0), left=S.off.pool-used;
  h+=`<div class="grouphead">${step?"2":"1"}. Budget &mdash; ${S.off.pool} to spend</div>`;
  h+=coachMark("budget","You must spend every point. Facilities compound for years but only if you keep the job; retention and development pay off right away.");
  h+=`<div class="note">Every point you put somewhere is a point you didn't put
    somewhere else. Bigger programs and better seasons earn a bigger pool.</div>`;
  h+=`<div class="budgetleft ${left===0?'done':''}">${left>0?left+" unspent":
      left<0?Math.abs(left)+" over budget":"Fully allocated"}</div>`;
  h+=LEAGUE.offseason.budget.buckets.map(bk=>`<div class="bud">
    <div class="budtop"><div><div class="fname">${esc(bk.l)}</div>
      <div class="cdesc" style="margin-top:3px">${esc(bk.d)}</div></div>
      <div class="budctl">
        <button class="budbtn" data-bud="${bk.k}" data-dir="-1">&minus;</button>
        <span class="budval">${B[bk.k]||0}</span>
        <button class="budbtn" data-bud="${bk.k}" data-dir="1" ${left<=0?'disabled':''}>+</button>
      </div></div>
    <div class="budbar"><i style="width:${((B[bk.k]||0)/S.off.pool*100).toFixed(0)}%"></i></div>
  </div>`).join("");
  h+=`<div class="grouphead">${step?"3":"2"}. Recruiting focus</div>`;
  h+=Object.keys(LEAGUE.offseason.recruitFocus).map(k=>`<div class="opt ${P.recruit===k?'on':''}" data-rec="${k}">
    <div class="fname">${esc(LEAGUE.offseason.recruitFocus[k].l)}</div>
    <div class="cdesc">${esc(LEAGUE.offseason.recruitFocus[k].d)}</div></div>`).join("");

  h+=`<div class="grouphead">${step?"4":"3"}. Team philosophy</div>`;
  h+=Object.keys(PHILOSOPHY).map(k=>`<div class="opt ${P.phil===k?'on':''}" data-phil="${k}">
    <div class="fname">${esc(PHILOSOPHY[k].l)}</div>
    <div class="cdesc">${esc(PHILOSOPHY[k].d)}</div></div>`).join("");
  return h;
}

/* ============ shell ============ */
const TABS=[["team","Team"],["scores","Scores"],["poll",LEAGUE.ui.rankingTab],
            ["stand","Standings"],["dyn","Dynasty"]];

Object.assign(LEAGUE.ui,{
  offseasonScreen:offseasonScreen,
  offseasonBanner:offseasonBanner,
  /* null when the offseason choices are complete, else what the button says */
  offseasonBlock(){
    const n=budgetLeft();
    return n>0?"Allocate "+n+" more":n<0?"Over budget":null;
  },
  bindOffseason(){
    document.querySelectorAll("[data-bud]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.bud, d=+b.dataset.dir, B=S.off.picks.budget;
      const nv=(B[k]||0)+d;
      if(nv<0)return;
      if(d>0&&budgetLeft()<=0)return;
      B[k]=nv; save(); render();});
    document.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>{
      S.off.picks.recruit=b.dataset.rec;save();render()});
  }
});
