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
  let h=`<div class="grouphead">Trade block</div>`;
  if(P.trade){
    const T=P.trade;
    return h+`<div class="cand on"><div class="candtop"><div><div class="fname">${esc(T.giveName)} for ${esc(T.n)} <span class="dpos">${esc(T.p)}</span></div>
      <div class="fnote">With ${esc(T.team)} &middot; he's rated ${T.r}, age ${T.age}, $${T.sal.toFixed(1)}M for ${T.yrs} more year${T.yrs===1?"":"s"}</div></div>
      <span class="cgrade">agreed</span></div>
      <div class="cdesc">Goes through when the offseason runs.</div>
      <button class="skip small" data-tcancel="1">Call it off</button></div>`;
  }
  if(P.block!==null&&P.block!==undefined&&R[P.block]){
    const g=R[P.block], offers=nflTradeOffers(U,S.myTeam,P.block,nflHumans());
    h+=`<div class="note">${esc(g.n)} (${esc(g.p)}, rated ${g.r}, age ${g.age}, $${g.k.sal.toFixed(1)}M) is on the block.
      <button class="skip small" data-tunblock="1">Take him off</button></div>`;
    h+=offers.length?offers.map((o,k)=>`<div class="drow">
        <div class="fmain"><div class="fname">${esc(o.team)} offer ${esc(o.n)} <span class="dpos">${esc(o.p)}</span></div>
        <div class="fnote">Rated ${o.r}, ceiling ${o.pot}, age ${o.age} &middot; $${o.sal.toFixed(1)}M for ${o.yrs} more year${o.yrs===1?"":"s"}</div></div>
        <button class="skip small" data-taccept="${k}">Accept</button></div>`).join("")
      :`<div class="note">Nobody is offering anything you need for him.</div>`;
    return h;
  }
  const can=R.map((p,i)=>({p:p,i:i})).filter(x=>x.p&&x.p.k.yrs>=2);
  h+=`<div class="note">Put one player under contract on the block and see what teams offer: a player at one of your weakest spots, worth about the same.</div>`;
  h+=can.map(x=>`<div class="drow"><div class="fmain"><div class="fname">${esc(x.p.n)} <span class="dpos">${esc(x.p.p)}</span></div>
      <div class="fnote">${x.i<POS.length?"Starter":"Backup"} &middot; rated ${x.p.r} &middot; age ${x.p.age} &middot; $${x.p.k.sal.toFixed(1)}M</div></div>
      <button class="skip small" data-tblock="${x.i}">Shop him</button></div>`).join("");
  return h;
}
/* Your draft board: players you want, in order. At each of your picks you
   take the highest one still there; if none are left, your style picks. */
function nflBoardHTML(P){
  const C=nflDraftClass(U,S.myTeam), byId={}; C.list.forEach(p=>byId[p.pid]=p);
  const board=(P.board||[]).filter(id=>byId[id]);
  const val=p=>dnVal(dnRead(p.pid));       // your scouts' read, sharpened where you've held a workout
  // a mock draft from your scouts' numbers: who's likely gone before your first pick (Grokbot: make the
  // draft a decision, not a list). Your scouts' estimates only, so it gives nothing hidden away
  const ahead=dnOrder().indexOf(dnTeam());            // the real order, lottery included
  const gone=dnMock(C.list.map(p=>{ const x=dnRead(p.pid); return Object.assign({},p,{v:dnVal(x),sr:x.sr,spot:x.spot}) }),ahead,(((U.seed||0)*2246822519)^(SEA.year*31337))>>>0,dnOrder());   // core/91_draftnight
  // once draft night has picks, the board says who went where (Grokbot: the board kept listing drafted players)
  const took=(()=>{ const H=S.off.picks.hand; if(!dnOn()||!H||!H.length)return null; const o={}; dnState().picks.forEach(d=>o[d.pid]=d); return o })();
  const avail=p=>took&&took[p.pid]?`<span class="dgone">${took[p.pid].team===dnTeam()?"yours":"taken"} at #${took[p.pid].overall}${took[p.pid].team===dnTeam()?"":" by "+esc(took[p.pid].team)}</span>`:ahead<=0?"":dnLabel(gone[p.pid]||0,0);
  const row=(p,i,on)=>`<div class="drow">
      <span class="dpick">${on?(i+1)+".":""}</span>
      <div class="fmain"><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span> ${avail(p)}</div>
        <div class="fnote">${esc(p.from)} &middot; age ${p.age} &middot; scouts say ~${dnRead(p.pid).sr}, ceiling ~${dnRead(p.pid).spot}${dnRead(p.pid).wk?" &middot; worked out":dnRead(p.pid).unsure?" &middot; scouts unsure":""}</div></div>
      ${dnOn()&&!dnRead(p.pid).wk&&(S.off.picks.workouts||[]).length<dnWorkouts()?`<button class="skip small" data-dnwork="${p.pid}">Work out</button>`:""}
      <button class="skip small" ${on?`data-bdrm="${p.pid}"`:`data-bdadd="${p.pid}"`}>${on?"Remove":"Add"}</button></div>`;
  let h=`<div class="grouphead">Your draft board</div>`;
  h+=board.length?board.map((id,i)=>row(byId[id],i,true)).join("")
     :`<div class="note">Empty: your draft style will choose. Add players below and you'll take the highest one still there at each of your picks.</div>`;
  // worked-out players stay listed wherever their sharper read puts them (Instinct: one vanished from the 30)
  const wkd=(S.off.picks.workouts||[]), ranked=C.list.filter(p=>board.indexOf(p.pid)<0).sort((a,b)=>val(b)-val(a));
  const pool=ranked.slice(0,30).concat(ranked.slice(30).filter(p=>wkd.indexOf(p.pid)>=0));
  h+=`<div class="grouphead">The class &mdash; best 30 by your scouts</div>`+(ahead>0?`<div class="note">${nOf(ahead,"pick")} before yours. "Likely there" is a mock draft from your scouts' numbers; other teams see the class differently, and the lottery can move you.</div>`:"")+pool.map(p=>row(p,0,false)).join("");
  return h;
}
/* Free agents you want, in order. They get your first look when free agency
   opens, at the asking price plus about 10%, if they fit; then your style
   fills whatever is left. */
function nflTargetsHTML(P,room){
  const pre=nflFreeAgentPreview(U,S.myTeam), byKey={}; pre.forEach(x=>byKey[x.key]=x);
  const mine=(P.targets||[]).filter(k=>byKey[k]);
  let left=room-ROOKIE_ROOM;                        // leave room for the draft class
  const seenPos={};
  const row=(x,on,i)=>{ let fit="";
      // the signing checks the cap after the draft, so the class is already paid for: there is no squeezing it
      // (Instinct: a "squeezing" target then had no room). This room is right on average, within about 5M either
      // way (measured, Nov 2026: the class and the fill-ins vary), so near the line it says so.
      // with the gap in money, so "won't fit" says why (Grokbot: it read "won't fit" with $10.4M of room)
      if(on){left-=x.ask; const gap=`about $${Math.abs(left).toFixed(1)}M`, kept=`after ~$${ROOKIE_ROOM}M kept for the draft class`;
        fit=left>=2?"fits":left>=-3?`close: ${left>=0?gap+" spare":gap+" short"} ${kept}`:`probably won't fit: ${gap} short ${kept} (about half like this still sign: the class and the fill-ins vary)`;
        if(seenPos[x.p])fit="you already want a "+x.p+": the second signs only if there is still room at "+x.p+" after the first"; seenPos[x.p]=1}
      // the list you choose from says it too, against what's left after the players you've already added
      // (Grokbot: "fits" only showed after adding)
      else { const l2=left-x.ask; fit=l2>=2?"would fit":l2>=-3?"close":"probably wouldn't fit"; }
      return `<div class="drow">
      <span class="dpick">${on?(i+1)+".":""}</span>
      <div class="fmain"><div class="fname">${esc(x.n)} <span class="dpos">${esc(x.p)}</span></div>
        <div class="fnote">${esc(x.team)} &middot; age ${x.age} &middot; rated ${x.r} &middot; about $${x.ask.toFixed(1)}M${fit?" &middot; "+fit:""}</div></div>
      <button class="skip small" ${on?`data-fatrm="${esc(x.key)}"`:`data-fatadd="${esc(x.key)}"`}>${on?"Remove":"Add"}</button></div>`};
  let h=`<div class="grouphead">Free agents you want</div>`;
  if(mine.length)h+=`<div class="note">Prices are this summer's asks plus about 10%; a player who improves over the summer can ask more by the time free agency opens.</div>`;
  h+=mine.length?mine.map((k,i)=>row(byKey[k],true,i)).join("")
    :`<div class="note">None yet: your free-agency style will decide. Players you add get your first look, in your order, if you have the room.</div>`;
  // cheapest first, on a tap (Muse, rounds 18-21: four markets read "nothing under $5M" from the best-25 view, while the
  // bargains sat below the rating cut). The count under $3M is said either way.
  const cheap=!!S.faCheap, rest=pre.filter(x=>mine.indexOf(x.key)<0), under3=rest.filter(x=>x.ask<3).length;
  const pool=(cheap?rest.slice().sort((a,b)=>a.ask-b.ask||b.r-a.r):rest).slice(0,25);
  h+=`<div class="grouphead">Likely free agents &mdash; ${cheap?"the cheapest 25":"the best 25"}</div>
    <div class="note">${rest.length} likely free agents; ${under3} asking under $3M. <button class="skip small" data-facheap="1">${cheap?"Show the best first":"Show the cheapest first"}</button></div>`+
    (pool.length?pool.map(x=>row(x,false)).join(""):`<div class="note">Nobody worth chasing this year.</div>`);
  return h;
}
function nflPickSlot(){
  const o=dnOrder().indexOf(dnTeam())+1;
  return ordinal(o);                  // 21st, not 21th
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
    ${myHire.name===(S.career&&S.career.name)?"You take over as head coach.":esc(myHire.name)+" is your new head coach."}</div>`;
  else if(myHire)news=myHire.name===(S.career&&S.career.name)?`<div class="bnews"><b>You</b> take over as head coach.</div>`:`<div class="bnews"><b>${esc(myHire.name)}</b> hired as head coach.</div>`;
  const X=last.league||{};
  const list=(a,f)=>a.map(f).join(", ");
  let rec="";
  // the cap at work: what you pay now, against what you can (Muse: a "won't fit" signing with no payroll shown)
  if(X.payroll!=null)rec+=`<div class="bnews small"><b>Payroll after the summer:</b> ${money2(X.payroll)} of ${money2(LEAGUE.budgetOf?LEAGUE.budgetOf(U,my):NFL_CAP)}${LEAGUE.budgetOf?" (the wage budget)":" (the cap)"}.</div>`;
  if((X.grew||[]).length){ const G=X.grew.slice().sort((a,b)=>(b.to-b.from)-(a.to-a.from));
    rec+=`<div class="bnews small"><b>Big summers:</b> ${list(G,p=>esc(p.n)+" ("+esc(p.p)+", "+p.age+") "+p.from+" to "+p.to+(p.leap?" &middot; breakout":""))}.${G.some(p=>p.leap)?` <span class="planwhy">A breakout: now and then a young player takes a big step in a summer.</span>`:""}</div>` }
  if((X.retired||[]).length)rec+=`<div class="bnews small"><b>Retired:</b> ${list(X.retired,p=>esc(p.n)+" ("+esc(p.p)+", "+p.age+")")}.</div>`;
  if((X.signed||[]).length)rec+=`<div class="bnews"><b>Free agency:</b> ${list(X.signed,p=>esc(p.n)+" ("+esc(p.p)+", "+p.r+") $"+p.sal.toFixed(1)+"M")}.</div>`;
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
  const acn=mine.length?`<div class="bnews"><b>All-Star team.</b> ${
    mine.map(x=>esc(x.n)+" ("+esc(x.pos)+")").join(", ")} made the All-Star team.</div>`:"";
  const cm=(last.coaching.coordMoves||[]).filter(m=>m.from===my);
  const cmn=cm.length?`<div class="bnews flag"><b>Staff loss.</b> ${
    cm.map(m=>esc(m.name)+" ("+((typeof SPORT!=="undefined"&&SPORT.staff&&SPORT.staff[m.side])?SPORT.staff[m.side].short:m.side.toUpperCase())+") takes the head job at "+esc(m.to)).join("; ")}.</div>`:"";
  const cmo=(last.coaching.coordMoves||[]).filter(m=>m.from!==my).slice(0,2).map(m=>
    `<div class="bnews small">${esc(m.name)}, ${esc(m.from)} ${((typeof SPORT!=="undefined"&&SPORT.staff&&SPORT.staff[m.side])?SPORT.staff[m.side].short:m.side.toUpperCase())},
      hired as head coach at ${esc(m.to)}.</div>`).join("");
  const bigMoves=(last.coaching.poached||[]).slice(0,3).map(p=>
    `<div class="bnews small">${esc(p.name)} leaves ${esc(p.from)} for ${esc(p.to)}.</div>`).join("");
  return `<div class="banner"><div class="bkick">${last.year} in the books</div>
    <div class="btitle">${esc(last.result)}</div>
    <div class="bsub">${esc(last.champion)} won the Stanley Cup.
      ${nOf((last.coaching.hires||[]).length,"team")} hired a new head coach.</div>
    ${news}${cmn}${ra}${acn}${rec}${hz}${cmo}${bigMoves}
    ${(function(){
      const mine=(X.draft||[]).filter(d=>d.team===my), gone=X.boardGone||[];
      if(!mine.length&&!gone.length)return "";
      // each with the pick of yours he went before (Grokbot: one listed "before your pick" went after your first, before your second)
      const goneH=gone.length?`<div class="note">Taken before you could get them: ${gone.map(x=>`${esc(x.n)} (${esc(x.p)}) to ${esc(x.to)} at #${x.overall}${x.yours?`, before your #${x.yours}`:""}`).join(", ")}. Your board takes the highest player on it who's still there.</div>`:"";
      return `<div class="grouphead">Draft &mdash; rookies for the ${last.year+1} season</div>`+goneH+
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
  if(S.off.dn&&dnOn())return draftNightHTML();
  const A=S.off.act, P=S.off.picks, my=S.myTeam;
  const last=SEA;
  let h=`<div class="dateline"><h2>Offseason</h2><span>${last.year} &rarr; ${last.year+1}</span></div>`;
  const exp=S.expNow||expectations();
  const gr=seasonGrade(last.rec[my][0],last.rec[my][1],last.seasonResult(my),exp);
  const miles=milestones(last.rec[my][0],last.rec[my][1],
    last.champion===my?last.seasonResult(my):"",   /* round 55: was football's "SUPER BOWL CHAMPIONS", which this league's isTitle never matched */
   last.poll.rankMap()[my]);
  h+=`<div class="banner"><div class="bkick">${last.year} final</div>
    <div class="gradebox"><span class="grade">${gr.g}</span>
      <div><div class="btitle" style="margin:0">${recStr(my)}</div>
      <div class="gradeline">${esc(gr.l)}</div></div></div>
    ${(S.off&&S.off.act&&S.off.act.userOpen?[]:miles).map(m=>`<div class="bnews"><b>Milestone.</b> ${m}</div>`).join("")}
    <div class="bsub">${esc(last.champion)} won the Stanley Cup.
    ${nOf(A.hires.length,"team")} changed coaches.</div>
    ${A.poached.slice(0,2).map(p=>`<div class="bnews small">${esc(p.name)} leaves
      ${esc(p.from)} for ${esc(p.to)}.</div>`).join("")}</div>`;
  h+=seasonCallsHTML();

  const C=S.career;
  const jobRow=(t,tag)=>`<div class="cand ${S.off.move===t?'on':''}" data-job="${esc(t)}">
    <div class="candtop"><div>
      <div class="fname" style="color:${teamInk(t)}">${esc(t)}</div>
      <div class="fnote">${esc(LEAGUE.conf.names[CONF[t]])} &middot; ${
        U.program[t]>=1780?"contender":U.program[t]>=1680?"solid job":
        U.program[t]>=1600?"middling job":"rebuild"}</div></div>
      <span class="cgrade">${esc(tag)}</span></div>
    <div class="cdesc">Last season ${last.rec[t]?LEAGUE.recText(t,last):"&mdash;"}.
      ${U.program[t]>U.program[my]?"A step up.":U.program[t]<U.program[my]-120?"A step down.":"A lateral move."}</div></div>`;

  if(A.userOpen){
    h+=`<div class="firedbox"><div class="bkick">You have been let go</div>
      <div class="btitle">${esc(my)} has fired you.</div>
      <div class="bsub">Career ${careerRec(C)} &middot; you are ${esc(repGrade(C.rep))}.
      ${S.off.jobs.length?"These teams will take you.":"Nobody is calling."}</div></div>`;
    h+=firedHistoryHTML();   // your seasons stay in reach after a firing (Grokbot: the history tab was gone)
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
        &middot; career ${careerRec(C)} &middot; ${esc(repGrade(C.rep))}</div></div></div>`;
  }

  const SC=S.off.staff||{};
  ["oc","dc"].forEach(side=>{
    const cands=SC[side]; if(!cands)return;
    const label=side==="oc"?"offensive":"defensive";
    h+=`<div class="grouphead">Hire a new ${esc(SPORT.staff[side].long)}</div>`;
    h+=`<div class="note">Your ${esc(SPORT.staff[side].long)} has moved on. He shapes how that end
      of the floor plays and develops.</div>`;
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
  h+=staffPlanHTML(P);
  h+=`<div class="grouphead">${n(1)}. Expiring contracts</div>`;
  h+=coachMark("contracts","Players you don't re-sign go to free agency, where another team can take them. Rookies and free agents are added afterwards, inside whatever cap room you leave.");
  const tax=LEAGUE.taxLine||LEAGUE.cap;
  h+=`<div class="budgetleft ${pay<=tax?'done':''}">Payroll $${pay.toFixed(1)}M &middot; cap $${LEAGUE.cap}M &middot; ${
    room>=0?"$"+room.toFixed(1)+"M room":"$"+(-room).toFixed(1)+"M over the cap"}</div>`;
  if(tax>LEAGUE.cap)h+=`<div class="note">You can go over the cap to re-sign your own players, up to the $${tax}M tax line. Over the cap, you can't sign other teams' free agents.</div>`;
  if(!expiring.length)h+=`<div class="note">Nobody's contract is up this year.</div>`;
  h+=expiring.map(i=>{const p=R[i], a=P.asks[i], on=!!P.resign[i];
    return `<div class="cand ${on?'on':''}" data-resign="${i}">
      <div class="candtop"><div><div class="fname">${esc(p.n)} <span class="dpos">${esc(p.p)}</span></div>
      <div class="fnote">${i<POS.length?"Starter":"Backup"} &middot; age ${p.age+1} next season &middot; rated ${p.r}</div></div>
      <span class="cgrade">${on?"re-sign":"let go"}</span></div>
      <div class="cdesc">Asking $${a.sal.toFixed(1)}M a year for ${a.yrs} year${a.yrs===1?"":"s"}${
        p.age>=31?" &middot; on the wrong side of thirty":""}.</div>${staffTag(i)}</div>`}).join("");
  h+=`<div class="grouphead">${n(2)}. Free agency</div>`;
  const FA=LEAGUE.offseason.faStyles;
  h+=Object.keys(FA).map(k=>`<div class="opt ${P.fa===k?'on':''}" data-fa="${k}">
    <div class="fname">${esc(FA[k].l)}</div><div class="cdesc">${esc(FA[k].d)}</div></div>`).join("");
  h+=nflTargetsHTML(P,room);
  h+=nflTradeHTML(P);
  h+=`<div class="grouphead">${n(3)}. The draft</div>`;
  h+=dnSectionHTML();
  const DR=LEAGUE.offseason.draftStyles;
  h+=Object.keys(DR).map(k=>`<div class="opt ${P.draft===k?'on':''}" data-draft="${k}">
    <div class="fname">${esc(DR[k].l)}</div><div class="cdesc">${esc(DR[k].d)}</div></div>`).join("");
  h+=nflBoardHTML(P);
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
    // your own players may take you over the cap, up to the tax line
    const over=nflPlannedPay()-(LEAGUE.taxLine||LEAGUE.cap);
    return over>0?"Over the tax line by $"+over.toFixed(1)+"M":null;
  },
  bindOffseason(){
    if(S.off&&S.off.dn&&dnOn()){ bindDraftNight(); return }
    bindDraftSection();
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
