/* ============ offseason screens: pro football ============ */
/* The offseason screen (job offers, staff, contracts, free agency, the
   draft, philosophy) and the banner that closes a season. */

/* next year's payroll before free agency: everyone under contract, plus the
   expiring players you've chosen to re-sign at their asking price */
function nflPlannedPay(){
  const R=U.roster[S.myTeam], P=S.off.picks;
  return R.reduce((s,p,i)=>{if(!p)return s;
    if(P.asks&&P.asks[i])return s+(P.resign[i]?P.asks[i].sal:0);
    return s+p.k.sal},0);
}
function nflPickSlot(){
  const o=nflDraftOrder(SEA.rec,SEA.elo).indexOf(S.myTeam)+1;
  return o+(o===1?"st":o===2?"nd":o===3?"rd":"th");
}

function offseasonBanner(){
  const last=S.history[S.history.length-1];
  if(!last)return "";
  const my=S.myTeam;
  const myHire=(last.coaching.hires||[]).find(x=>x.team===my);
  const myPoach=(last.coaching.poached||[]).find(x=>x.from===my);
  let news="";
  if(myPoach)news=`<div class="bnews flag"><b>${esc(myPoach.name)} left for
    ${esc(myPoach.to)}.</b> ${myHire?esc(myHire.name)+" takes over.":""}</div>`;
  else if(last.coaching.fired&&myHire)news=`<div class="bnews flag"><b>Coaching change.</b>
    ${esc(myHire.name)} is your new head coach.</div>`;
  else if(myHire)news=`<div class="bnews"><b>${esc(myHire.name)}</b> hired as head coach.</div>`;
  const X=last.league||{};
  const list=(a,f)=>a.map(f).join(", ");
  let rec="";
  if((X.retired||[]).length)rec+=`<div class="bnews small"><b>Retired:</b> ${list(X.retired,p=>esc(p.n)+" ("+esc(p.p)+", "+p.age+")")}.</div>`;
  if((X.signed||[]).length)rec+=`<div class="bnews"><b>Free agency:</b> ${list(X.signed,p=>esc(p.n)+" ("+esc(p.p)+", "+p.r+") $"+p.sal.toFixed(1)+"M")}.</div>`;
  const gone=(X.released||[]).filter(p=>p.r>=66);
  if(gone.length)rec+=`<div class="bnews small">Moved on: ${list(gone,p=>esc(p.n)+" ("+esc(p.p)+")")}.</div>`;
  const ra="";
  const hz=last.awards.mvp[0]?`<div class="bnews small">${esc(last.awards.mvp[0].n)}
    (${esc(last.awards.mvp[0].p)}, ${esc(last.awards.mvp[0].t)}) won the ${LEAGUE.awards.mvp}.</div>`:"";
  const mine=(last.awards.team&&last.awards.team.list||[]).filter(x=>x.team===my);
  const acn=mine.length?`<div class="bnews"><b>All-Pro.</b> ${
    mine.map(x=>esc(x.n)+" ("+esc(x.pos)+")").join(", ")} made the All-Pro team.</div>`:"";
  const cm=(last.coaching.coordMoves||[]).filter(m=>m.from===my);
  const cmn=cm.length?`<div class="bnews flag"><b>Staff loss.</b> ${
    cm.map(m=>esc(m.name)+" ("+m.side.toUpperCase()+") takes the head job at "+esc(m.to)).join("; ")}.</div>`:"";
  const cmo=(last.coaching.coordMoves||[]).filter(m=>m.from!==my).slice(0,2).map(m=>
    `<div class="bnews small">${esc(m.name)}, ${esc(m.from)} ${m.side.toUpperCase()},
      hired as head coach at ${esc(m.to)}.</div>`).join("");
  const bigMoves=(last.coaching.poached||[]).slice(0,3).map(p=>
    `<div class="bnews small">${esc(p.name)} leaves ${esc(p.from)} for ${esc(p.to)}.</div>`).join("");
  return `<div class="banner"><div class="bkick">${last.year} in the books</div>
    <div class="btitle">${esc(last.result)}</div>
    <div class="bsub">${esc(last.champion)} won the Super Bowl.
      ${(last.coaching.hires||[]).length} teams hired a new head coach.</div>
    ${news}${cmn}${ra}${acn}${rec}${hz}${cmo}${bigMoves}
    ${(function(){
      const mine=(X.draft||[]).filter(d=>d.team===my);
      if(!mine.length)return "";
      return `<div class="grouphead">Draft &mdash; ${last.year+1}</div>`+
        mine.map(d=>`<div class="drow">
          <span class="dpick">${d.d.round}.${String(d.d.pick).padStart(2,"0")}</span>
          <div class="fmain"><div class="fname">${esc(d.n)}
            <span class="dpos">${esc(d.p)}</span></div>
          <div class="fnote">${esc(d.from)} &middot; rated ${d.r}, ceiling ${d.pot}${d.made?"":" &middot; practice squad"}</div></div>
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
  const gr=seasonGrade(last.rec[my][0],last.rec[my][1],last.seasonResult(my),exp);
  const miles=milestones(last.rec[my][0],last.rec[my][1],
    last.champion===my?"SUPER BOWL CHAMPIONS":"",last.poll.rankMap()[my]);
  h+=`<div class="banner"><div class="bkick">${last.year} final</div>
    <div class="gradebox"><span class="grade">${gr.g}</span>
      <div><div class="btitle" style="margin:0">${last.rec[my][0]}-${last.rec[my][1]}</div>
      <div class="gradeline">${esc(gr.l)}</div></div></div>
    ${miles.map(m=>`<div class="bnews"><b>Milestone.</b> ${m}</div>`).join("")}
    <div class="bsub">${esc(last.champion)} won the Super Bowl.
    ${A.hires.length} teams changed coaches.</div>
    ${A.poached.slice(0,2).map(p=>`<div class="bnews small">${esc(p.name)} leaves
      ${esc(p.from)} for ${esc(p.to)}.</div>`).join("")}</div>`;

  const C=S.career;
  const jobRow=(t,tag)=>`<div class="cand ${S.off.move===t?'on':''}" data-job="${esc(t)}">
    <div class="candtop"><div>
      <div class="fname" style="color:${teamInk(t)}">${esc(t)}</div>
      <div class="fnote">${esc(LEAGUE.conf.names[CONF[t]])} &middot; ${
        U.program[t]>=1780?"contender":U.program[t]>=1680?"solid job":
        U.program[t]>=1600?"middling job":"rebuild"}</div></div>
      <span class="cgrade">${esc(tag)}</span></div>
    <div class="cdesc">Last season ${last.rec[t]?last.rec[t][0]+"-"+last.rec[t][1]:"&mdash;"}.
      ${U.program[t]>U.program[my]?"A step up.":U.program[t]<U.program[my]-120?"A step down.":"A lateral move."}</div></div>`;

  if(A.userOpen){
    h+=`<div class="firedbox"><div class="bkick">You have been let go</div>
      <div class="btitle">${esc(my)} has fired you.</div>
      <div class="bsub">Career ${C.w}-${C.l} &middot; you are ${esc(repGrade(C.rep))}.
      ${S.off.jobs.length?"These teams will take you.":"Nobody is calling."}</div></div>`;
    h+=`<div class="grouphead">1. Where do you go next?</div>`;
    h+=S.off.jobs.map(t=>jobRow(t,U.program[t]>U.program[my]?"step up":"opening")).join("");
    h+=`<div class="cand ${S.off.move==="retire"?'on':''}" data-job="retire">
      <div class="candtop"><div><div class="fname">Retire</div>
      <div class="fnote">End your career here</div></div></div>
      <div class="cdesc">Walk away with a ${C.w}-${C.l} record and ${C.titles}
        Super Bowl${C.titles===1?"":"s"}.</div></div>`;
  }else if(S.off.poach.length){
    h+=`<div class="grouphead">1. You have offers</div>`;
    h+=`<div class="note">${esc(repGrade(C.rep))[0].toUpperCase()+esc(repGrade(C.rep)).slice(1)}
      &mdash; bigger franchises have come calling. You can stay or you can go.</div>`;
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
  const step=(A.userOpen||S.off.poach.length)?1:0, n=k=>step+k;
  // the roster you'd carry into the new year, and what it costs
  const R=U.roster[S.myTeam], expiring=Object.keys(P.asks||{}).map(Number);
  const pay=nflPlannedPay(), room=LEAGUE.cap-pay;
  h+=`<div class="grouphead">${n(1)}. Expiring contracts</div>`;
  h+=coachMark("contracts","Players you don't re-sign go to free agency, where another team can take them. Rookies and free agents are added afterwards, inside whatever cap room you leave.");
  h+=`<div class="budgetleft ${room>=0?'done':''}">Payroll $${pay.toFixed(1)}M of $${LEAGUE.cap}M &middot; ${
    room>=0?"$"+room.toFixed(1)+"M room":"$"+(-room).toFixed(1)+"M over the cap"}</div>`;
  if(!expiring.length)h+=`<div class="note">Nobody's contract is up this year.</div>`;
  h+=expiring.map(i=>{const p=R[i], a=P.asks[i], on=!!P.resign[i];
    return `<div class="cand ${on?'on':''}" data-resign="${i}">
      <div class="candtop"><div><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span></div>
      <div class="fnote">${i<POS.length?"Starter":"Backup"} &middot; age ${p.age+1} next season &middot; rated ${p.r}</div></div>
      <span class="cgrade">${on?"re-sign":"let go"}</span></div>
      <div class="cdesc">Asking $${a.sal.toFixed(1)}M a year for ${a.yrs} year${a.yrs===1?"":"s"}${
        p.age>=31?" &middot; on the wrong side of thirty":""}.</div></div>`}).join("");
  h+=`<div class="grouphead">${n(2)}. Free agency</div>`;
  const FA=LEAGUE.offseason.faStyles;
  h+=Object.keys(FA).map(k=>`<div class="opt ${P.fa===k?'on':''}" data-fa="${k}">
    <div class="fname">${esc(FA[k].l)}</div><div class="cdesc">${esc(FA[k].d)}</div></div>`).join("");
  h+=`<div class="grouphead">${n(3)}. The draft</div>`;
  h+=`<div class="note">You pick ${nflPickSlot()} in each round.</div>`;
  const DR=LEAGUE.offseason.draftStyles;
  h+=Object.keys(DR).map(k=>`<div class="opt ${P.draft===k?'on':''}" data-draft="${k}">
    <div class="fname">${esc(DR[k].l)}</div><div class="cdesc">${esc(DR[k].d)}</div></div>`).join("");
  h+=`<div class="grouphead">${n(4)}. Team philosophy</div>`;
  h+=Object.keys(PHILOSOPHY).map(k=>`<div class="opt ${P.phil===k?'on':''}" data-phil="${k}">
    <div class="fname">${esc(PHILOSOPHY[k].l)}</div>
    <div class="cdesc">${esc(PHILOSOPHY[k].d)}</div></div>`).join("");
  return h;
}

Object.assign(LEAGUE.ui,{
  offseasonScreen:offseasonScreen,
  offseasonBanner:offseasonBanner,
  /* null when you can go on; otherwise what the button says */
  offseasonBlock(){
    if(!S.off)return null;
    const over=nflPlannedPay()-LEAGUE.cap;
    return over>0?"Over the cap by $"+over.toFixed(1)+"M":null;
  },
  bindOffseason(){
    document.querySelectorAll("[data-resign]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.resign; S.off.picks.resign[i]=!S.off.picks.resign[i]; save(); render();});
    document.querySelectorAll("[data-fa]").forEach(b=>b.onclick=()=>{
      S.off.picks.fa=b.dataset.fa; save(); render();});
    document.querySelectorAll("[data-draft]").forEach(b=>b.onclick=()=>{
      S.off.picks.draft=b.dataset.draft; save(); render();});
  }
});
