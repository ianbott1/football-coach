/* ============ offseason screens: pro football ============ */
/* The offseason screen (job offers, staff, contracts, free agency, the
   draft, philosophy) and the banner that closes a season. */

/* next year's payroll before free agency: everyone under contract, plus the
   expiring players you've chosen to re-sign at their asking price */
function nflPlannedPay(){
  const R=U.roster[S.myTeam], P=S.off.picks;
  let pay=R.reduce((s,p,i)=>{if(!p)return s;
    if(P.asks&&P.asks[i])return s+(P.resign[i]?P.asks[i].sal:0);
    return s+p.k.sal},0);
  if(P.trade)pay+=P.trade.sal-P.trade.giveSal;          // an agreed trade counts now
  return pay;
}
/* Trade block: put one player under contract on it and see what teams offer. */
function nflHumans(){return (S.coaches||[]).map((c,i)=>i===(S.turn||0)?S.myTeam:c.myTeam)}
function nflTradeHTML(P){
  const R=U.roster[S.myTeam];
  let h=`<div class="grouphead">Swap deals</div>`;
  if(P.trade){
    const T=P.trade;
    return h+`<div class="cand on"><div class="candtop"><div><div class="fname">${esc(T.giveName)} for ${esc(T.n)} <span class="dpos">${esc(T.p)}</span></div>
      <div class="fnote">With ${esc(T.team)} &middot; he's rated ${T.r}, age ${T.age}, ${money(T.sal)} a year for ${T.yrs} more year${T.yrs===1?"":"s"}</div></div>
      <span class="cgrade">agreed</span></div>
      <div class="cdesc">Goes through when the offseason runs.</div>
      <button class="skip small" data-tcancel="1">Call it off</button></div>`;
  }
  if(P.block!==null&&P.block!==undefined&&R[P.block]){
    const g=R[P.block], offers=nflTradeOffers(U,S.myTeam,P.block,nflHumans());
    h+=`<div class="note">${esc(g.n)} (${esc(g.p)}, rated ${g.r}, age ${g.age}, ${money(g.k.sal)}) is on the block.
      <button class="skip small" data-tunblock="1">Take him off</button></div>`;
    h+=offers.length?offers.map((o,k)=>`<div class="drow">
        <div class="fmain"><div class="fname">${esc(o.team)} offer ${esc(o.n)} <span class="dpos">${esc(o.p)}</span></div>
        <div class="fnote">Rated ${o.r}, ceiling ${o.pot}, age ${o.age} &middot; ${money(o.sal)} a year for ${o.yrs} more year${o.yrs===1?"":"s"}</div></div>
        <button class="skip small" data-taccept="${k}">Accept</button></div>`).join("")
      :`<div class="note">Nobody is offering anything you need for him.</div>`;
    return h;
  }
  const can=R.map((p,i)=>({p:p,i:i})).filter(x=>x.p&&x.p.k.yrs>=2);
  h+=`<div class="note">Offer one player in a straight swap and see what clubs come back with: a player at one of your weakest spots, worth about the same.</div>`;
  h+=can.map(x=>`<div class="drow"><div class="fmain"><div class="fname">${esc(x.p.n)} <span class="dpos">${esc(x.p.p)}</span></div>
      <div class="fnote">${x.i<POS.length?"Starter":"Backup"} &middot; rated ${x.p.r} &middot; age ${x.p.age} &middot; ${money(x.p.k.sal)} a year</div></div>
      <button class="skip small" data-tblock="${x.i}">Shop him</button></div>`).join("");
  return h;
}
/* Your draft board: players you want, in order. At each of your picks you
   take the highest one still there; if none are left, your style picks. */
function nflBoardHTML(P){
  const C=nflDraftClass(U,S.myTeam), byId={}; C.list.forEach(p=>byId[p.pid]=p);
  const board=(P.board||[]).filter(id=>byId[id]);
  const val=p=>p.sr+(p.spot-p.sr)*0.45;
  const row=(p,i,on)=>`<div class="drow">
      <span class="dpick">${on?(i+1)+".":""}</span>
      <div class="fmain"><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span></div>
        <div class="fnote">${esc(p.from)} &middot; age ${p.age} &middot; scouts say ~${p.sr}, ceiling ~${p.spot}</div></div>
      <button class="skip small" ${on?`data-bdrm="${p.pid}"`:`data-bdadd="${p.pid}"`}>${on?"Remove":"Add"}</button></div>`;
  let h=`<div class="grouphead">Your draft board</div>`;
  h+=board.length?board.map((id,i)=>row(byId[id],i,true)).join("")
     :`<div class="note">Empty: your draft style will choose. Add players below and you'll take the highest one still there at each of your picks.</div>`;
  const pool=C.list.filter(p=>board.indexOf(p.pid)<0).sort((a,b)=>val(b)-val(a)).slice(0,30);
  h+=`<div class="grouphead">The class &mdash; best 30 by your scouts</div>`+pool.map(p=>row(p,0,false)).join("");
  return h;
}
/* Free agents you want, in order. They get your first look when free agency
   opens, at the asking price plus about 10%, if they fit; then your style
   fills whatever is left. */
function nflTargetsHTML(P,room){
  const pre=nflFreeAgentPreview(U,S.myTeam), byKey={}; pre.forEach(x=>byKey[x.key]=x);
  const mine=(P.targets||[]).filter(k=>byKey[k]);
  let left=room-0.5;                                // leave a little room for the academy
  const seenPos={};
  const row=(x,on,i)=>{ let fit="";
      if(on){left-=x.ask; fit=left>=0?"fits":left>=-8?"fits only by squeezing the draft class":"won't fit as things stand";   // the signing checks the cap; this reserves rookie money
        if(seenPos[x.p])fit="you already want a "+x.p+": only one can be signed"; seenPos[x.p]=1}
      return `<div class="drow">
      <span class="dpick">${on?(i+1)+".":""}</span>
      <div class="fmain"><div class="fname">${esc(x.n)} <span class="dpos">${esc(x.p)}</span> <span class="ptag">${x.starter?"would start":"depth: better than your backup"}</span></div>
        <div class="fnote">${esc(x.team)} &middot; age ${x.age} &middot; rated ${x.r} &middot; about ${money(x.ask)} a year${on?" &middot; "+fit:""}</div></div>
      <button class="skip small" ${on?`data-fatrm="${esc(x.key)}"`:`data-fatadd="${esc(x.key)}"`}>${on?"Remove":"Add"}</button></div>`};
  let h=`<div class="grouphead">Free transfers you want</div>`;
  h+=mine.length?mine.map((k,i)=>row(byKey[k],true,i)).join("")
    :`<div class="note">None yet: your assistant's style will decide. Players you add get your first look, in your order, if the wages fit.</div>`;
  const pool=pre.filter(x=>mine.indexOf(x.key)<0).slice(0,25);
  h+=`<div class="grouphead">Out of contract this summer &mdash; the best 25</div>`+
    (pool.length?pool.map(x=>row(x,false)).join(""):`<div class="note">Nobody worth chasing this year.</div>`);
  return h;
}
/* The transfer window: your kitty, bids for your players, your bids (in
   order, checked against the money and the wage budget as they stand), and
   the market at each position: players who'd improve you, and whether they'd come. */
function tWindowHTML(P){
  const my=S.myTeam, H=nflHumans(), pay=nflPlannedPay();
  const offers=tOffers(U,my,H), sales=P.sales||[], salesIn=sales.reduce((a,o)=>a+o.fee,0);
  const kitty=(P.kitty!=null?P.kitty:tKitty(U,my,payroll(U.roster[my])))+salesIn, carry=(U.kitty&&U.kitty[my])||0;
  const mkt=tMarket(U,my,H), byKey={}; mkt.forEach(x=>byKey[x.key]=x);
  const bids=(P.bids||[]).filter(k=>byKey[k]);
  let h=`<div class="budgetleft done">Transfer kitty ${money(kitty)} &middot; wage room ${money(Math.max(0,LEAGUE.budgetOf(U,my)-pay))} a year</div>
    <div class="note">The kitty comes from the club's wage bill and earnings${carry?`, plus ${money(carry)} saved from last summer`:""}${salesIn?`, plus ${money(salesIn)} from sales`:""}. Half of whatever you don't spend carries over to next summer. Players move up the pyramid, not down.</div>`;
  h+=`<div class="grouphead">Bids for your players</div>`;
  h+=offers.length?offers.map(o=>{ const on=sales.some(x=>x.key===o.key);
    return `<div class="cand ${on?'on':''}" data-sell="${esc(o.key)}"><div class="candtop"><div>
      <div class="fname">${esc(o.team)} bid ${money(o.fee)} for ${esc(o.n)} <span class="dpos">${esc(o.p)}</span></div>
      <div class="fnote">${o.starter?"Your starter":"A backup"} &middot; rated ${o.r} &middot; age ${o.age} &middot; ${esc(LEAGUE.conf.names[CONF[o.team]])}</div></div>
      <span class="cgrade">${on?"sell":"keep him"}</span></div></div>` }).join("")
    :`<div class="note">Nobody bigger is bidding for anyone of yours this summer.</div>`;
  let left=kitty, wl=LEAGUE.budgetOf(U,my)-pay+sales.reduce((a,o)=>{const p=U.roster[my].find(q=>q&&tKey(my,q)===o.key);return a+(p?p.k.sal:0)},0);
  const brow=(x,on,i)=>{ let fit="";
    if(on){ if(!x.willing)fit=x.why; else if(x.fee>left)fit="more than the kitty has left"; else if(x.wage>wl)fit="his wages won't fit"; else {fit="fits"; left-=x.fee; wl-=x.wage} }
    return `<div class="drow"><span class="dpick">${on?(i+1)+".":""}</span>
      <div class="fmain"><div class="fname">${esc(x.n)} <span class="dpos">${esc(x.p)}</span> <span class="ptag">${x.starter?"would start":"depth: better than your backup"}</span></div>
      <div class="fnote">${esc(x.team)} (${esc(LEAGUE.groupShort?LEAGUE.groupShort(CONF[x.team]):LEAGUE.conf.names[CONF[x.team]])}) &middot; age ${x.age}${x.age>=33?" (may retire)":""} &middot; rated ${x.r}${x.pot>x.r+2?", ceiling "+x.pot:""} &middot; ${money(x.fee)} + ${money(x.wage)} a year${on?" &middot; <b>"+esc(fit)+"</b>":!x.willing?" &middot; "+esc(x.why):""}</div></div>
      ${on?`<button class="skip small" data-bidrm="${esc(x.key)}">Remove</button>`:x.willing?`<button class="skip small" data-bidadd="${esc(x.key)}">Bid</button>`:`<span class="nogo">won't come</span>`}</div>` };
  h+=`<div class="grouphead">Your bids</div>`;
  h+=bids.length?bids.map((k,i)=>brow(byKey[k],true,i)).join("")+`<div class="note">They go in this order when the window opens, while the money lasts.</div>`
    :`<div class="note">None yet. Bid below: the asking fee, in the order you add them.</div>`;
  h+=`<div class="grouphead">The market &mdash; who'd improve you</div>`;
  POS.forEach((P2,i)=>{
    const R=U.roster[my], st=R[i];
    const list=mkt.filter(x=>x.i===i&&bids.indexOf(x.key)<0);
    const can=x=>x.fee<=kitty?1:0;   // what the kitty can pay for first, best first; then the best beyond it
    const will=list.filter(x=>x.willing).sort((a,b)=>(can(b)-can(a))||(b.r-a.r)).slice(0,3), no=list.filter(x=>!x.willing).length;
    h+=`<div class="divhead">${esc(P2.p)} &middot; your starter ${st?esc(st.n)+", "+st.r:"none"}</div>`;
    h+=will.length?will.map(x=>brow(x,false)).join(""):`<div class="note">Nobody who'd come is better than what you have.</div>`;
    if(no)h+=`<div class="note">${no} better player${no===1?"":"s"} at ${esc(P2.p)} won't come: bigger clubs, or higher divisions.</div>`;
  });
  return h;
}
function nflPickSlot(){
  const o=nflDraftOrder(SEA.rec,SEA.elo).indexOf(S.myTeam)+1;
  return ordinal(o);
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
  // the cap at work: what you pay now, against what you can (Muse: a "won't fit" signing with no payroll shown)
  if(X.payroll!=null)rec+=`<div class="bnews small"><b>Payroll after the summer:</b> ${money2(X.payroll)} of ${money2(LEAGUE.budgetOf?LEAGUE.budgetOf(U,my):NFL_CAP)}${LEAGUE.budgetOf?" (the wage budget)":" (the cap)"}.</div>`;
  if((X.grew||[]).length){ const G=X.grew.slice().sort((a,b)=>(b.to-b.from)-(a.to-a.from));
    rec+=`<div class="bnews small"><b>Big summers:</b> ${list(G,p=>esc(p.n)+" ("+esc(p.p)+", "+p.age+") "+p.from+" to "+p.to+(p.leap?" &middot; breakout":""))}.${G.some(p=>p.leap)?` <span class="planwhy">A breakout: now and then a young player takes a big step in a summer.</span>`:""}</div>` }
  if((X.retired||[]).length)rec+=`<div class="bnews small"><b>Retired:</b> ${list(X.retired,p=>esc(p.n)+" ("+esc(p.p)+", "+p.age+")")}.</div>`;
  const tin=(X.transfers||[]).filter(x=>x.done&&!x.out), tout=(X.transfers||[]).filter(x=>x.done&&x.out), tmiss=(X.transfers||[]).filter(x=>!x.done);
  if(tin.length)rec+=`<div class="bnews"><b>Signed:</b> ${list(tin,x=>esc(x.n)+" ("+esc(x.p)+", "+x.r+") from "+esc(x.from)+", "+money(x.fee))}.</div>`;
  if(tout.length)rec+=`<div class="bnews"><b>Sold:</b> ${list(tout,x=>esc(x.n)+" to "+esc(x.to)+", "+money(x.fee))}.</div>`;
  if(tmiss.length)rec+=`<div class="bnews small"><b>Deals that didn't happen:</b> ${list(tmiss,x=>esc(x.n)+" ("+esc(x.p)+"): "+esc(x.why))}.</div>`;
  if(X.kittyLeft)rec+=`<div class="bnews small">${money(X.kittyLeft)} left in the kitty: half of it carries over.</div>`;
  if((X.signed||[]).length)rec+=`<div class="bnews"><b>Free transfers:</b> ${list(X.signed,p=>esc(p.n)+" ("+esc(p.p)+", "+p.r+") "+money(p.sal)+" a year")}.</div>`;
  if(X.trade)rec+=X.trade.done?`<div class="bnews"><b>Trade:</b> ${esc(X.trade.gave)} (${esc(X.trade.gp)}) to ${esc(X.trade.with)} for ${esc(X.trade.got)} (${esc(X.trade.qp)}).</div>`
    :`<div class="bnews small"><b>Trade called off:</b> ${esc(X.trade.why)}.</div>`;
  const missed=(X.targets||[]).filter(x=>!x.got);
  if(missed.length)rec+=`<div class="bnews small"><b>Targets you missed:</b> ${list(missed,x=>esc(x.n)+" ("+esc(x.p)+") "+esc(x.why))}.</div>`;
  const gone=(X.released||[]).filter(p=>p.r>=66);
  if(gone.length)rec+=`<div class="bnews small">Moved on: ${list(gone,p=>esc(p.n)+" ("+esc(p.p)+")")}.</div>`;
  const ra="";
  const hz=last.awards.mvp[0]?`<div class="bnews small">${esc(last.awards.mvp[0].n)}
    (${esc(last.awards.mvp[0].p)}, ${esc(last.awards.mvp[0].t)}) won the ${LEAGUE.awards.mvp}.</div>`:"";
  const mine=(last.awards.team&&last.awards.team.list||[]).filter(x=>x.team===my);
  const acn=mine.length?`<div class="bnews"><b>Team of the Season.</b> ${
    mine.map(x=>esc(x.n)+" ("+esc(x.pos)+")").join(", ")} made it.</div>`:"";
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
    <div class="bsub">${esc(last.champion)} won the Premier League.
      ${(last.coaching.hires||[]).length} clubs appointed a new manager.</div>
    ${news}${cmn}${ra}${acn}${rec}${hz}${cmo}${bigMoves}
    ${(function(){
      const mine=(X.draft||[]).filter(d=>d.team===my);
      if(!mine.length)return "";
      return `<div class="grouphead">Academy graduates &mdash; ${last.year+1}</div>`+
        mine.map(d=>`<div class="drow">
          <div class="fmain"><div class="fname">${esc(d.n)}
            <span class="dpos">${esc(d.p)}</span></div>
          <div class="fnote">rated ${d.r}, ceiling ${d.pot} &middot; ${d.made?"into the squad":"not ready: let go"}</div></div></div>`).join("");
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
    last.seasonResult(my),last.poll.rankMap()[my]);
  h+=`<div class="banner"><div class="bkick">${last.year} final</div>
    <div class="gradebox"><span class="grade">${gr.g}</span>
      <div><div class="btitle" style="margin:0">${recStr(my)}</div>
      <div class="gradeline">${esc(gr.l)}</div></div></div>
    ${miles.map(m=>`<div class="bnews"><b>Milestone.</b> ${m}</div>`).join("")}
    <div class="bsub">${esc(last.champion)} won the Premier League.
    ${A.hires.length} clubs changed managers.</div>
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
    <div class="cdesc">Last season ${last.rec[t]?recStr(t):"&mdash;"}.
      ${U.program[t]>U.program[my]?"A step up.":U.program[t]<U.program[my]-120?"A step down.":"A lateral move."}</div></div>`;

  if(A.userOpen){
    h+=`<div class="firedbox"><div class="bkick">You have been let go</div>
      <div class="btitle">${esc(my)} has fired you.</div>
      <div class="bsub">Career ${careerRec(C)} &middot; you are ${esc(repGrade(C.rep))}.
      ${S.off.jobs.length?"These teams will take you.":"Nobody is calling."}</div></div>`;
    h+=`<div class="grouphead">1. Where do you go next?</div>`;
    h+=S.off.jobs.map(t=>jobRow(t,U.program[t]>U.program[my]?"step up":"opening")).join("");
    h+=`<div class="cand ${S.off.move==="retire"?'on':''}" data-job="retire">
      <div class="candtop"><div><div class="fname">Retire</div>
      <div class="fnote">End your career here</div></div></div>
      <div class="cdesc">Walk away with a ${careerRec(C)} record and ${C.titles}
        championship${C.titles===1?"":"s"}.</div></div>`;
  }else if(S.off.poach.length){
    h+=`<div class="grouphead">1. You have offers</div>`;
    h+=`<div class="note">${esc(repGrade(C.rep))[0].toUpperCase()+esc(repGrade(C.rep)).slice(1)}
      &mdash; bigger clubs have come calling. You can stay or you can go.</div>`;
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
        &middot; career ${careerRec(C)} &middot; ${esc(repGrade(C.rep))}</div></div></div>`;
  }

  const SC=S.off.staff||{};
  ["oc","dc"].forEach(side=>{
    const cands=SC[side]; if(!cands)return;
    const label=side==="oc"?"offensive":"defensive";
    h+=`<div class="grouphead">Hire a new ${esc(SPORT.staff[side].long)}</div>`;
    h+=`<div class="note">Your ${esc(SPORT.staff[side].long)} has moved on. He shapes how that side
      of the game plays and develops.</div>`;
    h+=cands.map((c,i)=>`<div class="cand ${(P[side]===i||(P[side]==null&&i===0))?'on':''}"
      data-coord="${side}" data-ci="${i}">
      <div class="candtop"><div><div class="fname">${esc(c.n)}</div>
      <div class="fnote">${esc(c.s)}</div></div>
      <span class="cgrade">${esc(c.grade)}</span></div></div>`).join("");
  });
  const step=(A.userOpen||S.off.poach.length)?1:0, n=k=>step+k;
  // the roster you'd carry into the new year, and what it costs
  const R=U.roster[S.myTeam], expiring=Object.keys(P.asks||{}).map(Number);
  const cap=LEAGUE.budgetOf(U,S.myTeam), pay=nflPlannedPay(), room=cap-pay;
  h+=staffPlanHTML(P);
  h+=`<div class="grouphead">${n(1)}. Expiring contracts</div>`;
  h+=coachMark("contracts","Players you don't re-sign leave on a free transfer. Then the transfer window: buy and sell, inside your kitty and your wage budget.");
  h+=`<div class="budgetleft ${pay<=cap?'done':''}">Wages &pound;${pay.toFixed(1)}M a year &middot; budget &pound;${cap}M &middot; ${
    room>=0?"&pound;"+room.toFixed(1)+"M to spend":"&pound;"+(-room).toFixed(1)+"M over budget"}</div>`;
  h+=`<div class="note">No salary cap in English football: the budget is what the club earns. The Premier League earns far more, and a relegated club keeps a parachute for two summers.</div>`;
  if(!expiring.length)h+=`<div class="note">Nobody's contract is up this year.</div>`;
  h+=expiring.map(i=>{const p=R[i], a=P.asks[i], on=!!P.resign[i];
    return `<div class="cand ${on?'on':''}" data-resign="${i}">
      <div class="candtop"><div><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span></div>
      <div class="fnote">${i<POS.length?"Starter":"Backup"} &middot; age ${p.age+1} next season &middot; rated ${p.r}</div></div>
      <span class="cgrade">${on?"re-sign":"let go"}</span></div>
      <div class="cdesc">Asking ${money(a.sal)} a year for ${a.yrs} year${a.yrs===1?"":"s"}${
        p.age>=31?" &middot; on the wrong side of thirty":""}.</div>${staffTag(i)}</div>`}).join("");
  h+=`<div class="grouphead">${n(2)}. The transfer window</div>`;
  h+=tWindowHTML(P);
  h+=`<div class="grouphead">${n(3)}. Free transfers</div>`;
  h+=`<div class="note">Players out of contract cost no fee, only wages. Your assistant fills any gaps in this style:</div>`;
  const FA=LEAGUE.offseason.faStyles;
  h+=Object.keys(FA).map(k=>`<div class="opt ${P.fa===k?'on':''}" data-fa="${k}">
    <div class="fname">${esc(FA[k].l)}</div><div class="cdesc">${esc(FA[k].d)}</div></div>`).join("");
  h+=nflTargetsHTML(P,room);
  h+=nflTradeHTML(P);
  h+=`<div class="grouphead">${n(4)}. The academy</div>`;
  h+=`<div class="note">No draft in English football: one or two youngsters come through your academy each summer, better at a bigger club. They join as backups if they're better than who's there.</div>`;
  h+=`<div class="grouphead">${n(5)}. Club philosophy</div>`;
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
    // your own players may take you over the cap, up to the tax line
    const over=nflPlannedPay()-LEAGUE.budgetOf(U,S.myTeam);
    return over>0?"Over the wage budget by "+money(over):null;
  },
  bindOffseason(){
    document.querySelectorAll("[data-resign]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.resign; S.off.picks.resign[i]=!S.off.picks.resign[i]; save(); render();});
    document.querySelectorAll("[data-fa]").forEach(b=>b.onclick=()=>{
      S.off.picks.fa=b.dataset.fa; save(); render();});
    document.querySelectorAll("[data-draft]").forEach(b=>b.onclick=()=>{
      S.off.picks.draft=b.dataset.draft; save(); render();});
    document.querySelectorAll("[data-tblock]").forEach(b=>b.onclick=()=>{S.off.picks.block=+b.dataset.tblock; save(); render();});
    document.querySelectorAll("[data-tunblock]").forEach(b=>b.onclick=()=>{S.off.picks.block=null; save(); render();});
    document.querySelectorAll("[data-tcancel]").forEach(b=>b.onclick=()=>{S.off.picks.trade=null; save(); render();});
    document.querySelectorAll("[data-taccept]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, R=U.roster[S.myTeam], g=R[P.block];
      const o=nflTradeOffers(U,S.myTeam,P.block,nflHumans())[+b.dataset.taccept]; if(!o||!g)return;
      P.trade=Object.assign({},o,{giveName:g.n,giveSal:g.k.sal}); P.block=null; save(); render();});
    document.querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, k=b.dataset.sell; P.sales=P.sales||[];
      if(P.sales.some(x=>x.key===k))P.sales=P.sales.filter(x=>x.key!==k);
      else { const o=tOffers(U,S.myTeam,nflHumans()).find(x=>x.key===k); if(o)P.sales=P.sales.concat([{key:o.key,team:o.team,fee:o.fee}]) }
      save(); render();});
    document.querySelectorAll("[data-bidadd]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, k=b.dataset.bidadd, x=tMarket(U,S.myTeam,nflHumans()).find(m=>m.key===k);
      P.bids=(P.bids||[]).concat([k]);
      // the fee and wage you were shown are the ones you pay (they were worked out again after the summer: half price)
      if(x){ P.bidTerms=Object.assign({},P.bidTerms||{},{[k]:{fee:x.fee,wage:x.wage}}) }
      save(); render();});
    document.querySelectorAll("[data-bidrm]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, k=b.dataset.bidrm; P.bids=(P.bids||[]).filter(x=>x!==k); save(); render();});
    document.querySelectorAll("[data-fatadd]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks; P.targets=(P.targets||[]).concat([b.dataset.fatadd]); save(); render();});
    document.querySelectorAll("[data-fatrm]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, k=b.dataset.fatrm; P.targets=(P.targets||[]).filter(x=>x!==k); save(); render();});
    document.querySelectorAll("[data-bdadd]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks; P.board=(P.board||[]).concat([+b.dataset.bdadd]); save(); render();});
    document.querySelectorAll("[data-bdrm]").forEach(b=>b.onclick=()=>{
      const P=S.off.picks, id=+b.dataset.bdrm; P.board=(P.board||[]).filter(x=>x!==id); save(); render();});
  }
});
