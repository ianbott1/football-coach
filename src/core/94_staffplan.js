/* ============ the staff's plan for the offseason ============ */
/* The offseason screen asks a lot at once. Every choice on it starts at what
   your staff would do (the plan the computer's teams follow), so the card at
   the top says so in plain words: who they'd re-sign and let go, and why,
   how they'd use free agency and the draft. Change any of it, or none: the
   button goes on either way. "Back to the staff's plan" undoes your changes.
   Leagues with contracts call staffPlanHTML(P) from their offseason screen
   (pro football, pro basketball, pro hockey, soccer). */
function staffResignPlan(){
  const my=S.myTeam, R=U.roster[my];
  return LEAGUE.budgetOf?nflResignPlan(R,LEAGUE.budgetOf(U,my)):nflResignPlan(R);
}
/* why the staff would keep him or not, in a few words */
function staffWhy(p,i,keep){
  if(keep)return i<POS.length?"a starter worth what he's asking":"cheap, useful depth";
  if(p.age>32)return "his age";
  if(i>=POS.length)return "a backup you can replace for less";
  return "what he's asking, for what he gives you";
}
function staffPlanDefaults(){ return {fa:"balanced", draft:"bpa"} }
function staffPlanChanged(P){
  const rec=staffResignPlan(), D=staffPlanDefaults();
  const resignDiff=Object.keys(P.asks||{}).some(i=>!!P.resign[i]!==!!rec[i]);
  return resignDiff||P.fa!==D.fa||(P.draft&&P.draft!==D.draft)||(P.targets||[]).length||(P.board||[]).length
    ||P.trade||(P.bids||[]).length||(P.sales||[]).length;
}
function staffPlanHTML(P){
  const my=S.myTeam, R=U.roster[my], rec=staffResignPlan(), exp=Object.keys(P.asks||{}).map(Number);
  const keep=exp.filter(i=>rec[i]&&R[i]), go=exp.filter(i=>!rec[i]&&R[i]);
  const nm=i=>`${esc(R[i].n)} <span class="planpos">${esc(R[i].p)}</span>`;
  const FA=LEAGUE.offseason.faStyles, DR=LEAGUE.offseason.draftStyles, D=staffPlanDefaults();
  const changed=staffPlanChanged(P);
  return `<div class="plancard"><div class="bkick">Your staff's plan</div>
    <div class="planlead">${changed?"You've changed some of it. Everything else is still the staff's call.":"Everything below is already set to this. Change what you like, or nothing at all, and carry on."}</div>
    <div class="planrow"><b>Re-sign</b> ${keep.length?keep.map(nm).join(", "):"nobody"}</div>
    ${go.length?`<div class="planrow"><b>Let go</b> ${go.map(i=>nm(i)+` <span class="planwhy">(${esc(staffWhy(R[i],i,false))})</span>`).join(", ")}</div>`:""}
    <div class="planrow"><b>${LEAGUE.draws?"Free transfers":"Free agency"}</b> ${esc(FA[D.fa].l)}: ${esc(FA[D.fa].d.replace(/^Free transfers: (.)/,(m,c)=>c.toUpperCase()))}</div>
    ${LEAGUE.draws?`<div class="planrow"><b>Transfers</b> none: the staff spend only on free transfers. Bid below if a player is worth the fee.</div>`
      :`<div class="planrow"><b>Draft</b> ${esc(DR[D.draft].l)}: ${esc(DR[D.draft].d)}</div>
    <div class="planrow"><b>Trades</b> none. Put a player on the block below if you want offers.</div>`}
    ${changed?`<button class="rewatch seedraw" data-staffplan="1">Back to the staff's plan</button>`:""}</div>`;
}
/* on a contract row: what the staff would do with him */
function staffTag(i){
  const R=U.roster[S.myTeam], p=R[i]; if(!p)return "";
  const k=!!staffResignPlan()[i];
  return `<div class="stafftag ${k?'ok':''}">Staff: ${k?"keep":"let go"} &middot; ${esc(staffWhy(p,i,k))}</div>`;
}
function staffPlanReset(){
  const P=S.off.picks, D=staffPlanDefaults();
  P.resign=staffResignPlan(); P.fa=D.fa; P.draft=D.draft; P.targets=[]; P.board=[]; P.block=null; P.trade=null;
  if(P.bids)P.bids=[]; if(P.sales)P.sales=[];
}
/* college: the staff's plan is the even split and a balanced class */
function collegePlanHTML(P){
  const RF=LEAGUE.offseason.recruitFocus, bk=LEAGUE.offseason.budget.buckets;
  return `<div class="plancard"><div class="bkick">Your staff's plan</div>
    <div class="planlead">Everything below is already set to this. Change what you like, or nothing at all, and carry on.</div>
    <div class="planrow"><b>Budget</b> a quarter each to ${bk.map(b=>esc(b.l)).join(", ")}</div>
    <div class="planrow"><b>Recruiting</b> ${esc(RF.balanced?RF.balanced.l:"Balanced")}${RF.balanced?": "+esc(RF.balanced.d):""}</div>
    ${P.portal!==undefined?`<div class="planrow"><b>Transfer portal</b> nobody: add players below if you want them.</div>`:""}</div>`;
}

/* ---- how much the staff give away on a read ----
   Full: Pearl names what she sees and the answer. Hints: she points at what
   to look at and leaves the answer to you. Automatic: full advice in your
   first season, hints after (once you know how to read the panel). */
function staffHints(){
  const m=S.advice||"auto";
  return m==="hints"||(m==="auto"&&!!(S.history&&S.history.length));
}
function staffAdvice(dp,ctx){
  const R=staffTake(dp,ctx);
  if(!staffHints()||(dp.k!=="read"&&dp.k!=="prep"))return R;
  const H=SPORT.hints||{};
  const line=dp.k==="prep"?"Look at what they did most, and ask whether today is any different. Who's the stronger side?"
    :(H[dp.pearl]||"I've got a feeling, but you've got the numbers. What do they say?");
  return R.map(x=>x.who==="pearl"?Object.assign({},x,{pick:null,line:pearlSay(line,(ctx.mine||0)*7+(ctx.q||0))}):x);
}
