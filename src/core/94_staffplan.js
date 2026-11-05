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
/* (each league's nflResignPlan fills RESIGN_WHY from its own rule: rating
   bars, age, the ask and the cap; Instinct: the old reasons were fixed strings) */
let RESIGN_WHY={};
const money2=x=>(LEAGUE.draws?"\u00a3":"$")+(+x).toFixed(1)+"M";
function staffWhy(p,i,keep){
  staffResignPlan();
  return RESIGN_WHY[i]||(keep?"worth keeping":"not worth what he's asking");
}
function staffPlanDefaults(){ return {fa:"balanced", draft:"bpa"} }
function staffPlanChanged(P){
  const rec=staffResignPlan(), D=staffPlanDefaults();
  const resignDiff=Object.keys(P.asks||{}).some(i=>!!P.resign[i]!==!!rec[i]);
  return resignDiff||P.fa!==D.fa||(P.draft&&P.draft!==D.draft)||(P.targets||[]).length||(P.board||[]).length
    ||P.trade||(P.bids||[]).length||(P.sales||[]).length;
}
/* The plan as it stands: the staff's, with your changes marked. It showed
   only the staff's while the rows below changed ("Let go Quinn Pettigrew"
   after you'd re-signed him: Grokbot, in every pro game). */
function staffPlanHTML(P){
  const my=S.myTeam, R=U.roster[my], rec=staffResignPlan(), exp=Object.keys(P.asks||{}).map(Number);
  const keep=exp.filter(i=>P.resign[i]&&R[i]), go=exp.filter(i=>!P.resign[i]&&R[i]);
  const mine=i=>!!P.resign[i]!==!!rec[i]?` <span class="planyou">your change</span>`:"";
  const nm=i=>`${esc(R[i].n)} <span class="planpos">${esc(R[i].p)}</span>${mine(i)}`;
  const FA=LEAGUE.offseason.faStyles, DR=LEAGUE.offseason.draftStyles, D=staffPlanDefaults();
  const fa=FA[P.fa]?P.fa:D.fa, dr=DR[P.draft]?P.draft:D.draft, tg=(P.targets||[]).length, bd=(P.board||[]).length;
  const changed=staffPlanChanged(P);
  return `<div class="plancard"><div class="bkick">${changed?"Your plan":"Your staff's plan"}</div>
    <div class="planlead">${changed?"The staff's plan, with your changes marked.":"Everything below is already set to this. Change what you like, or nothing at all, and carry on."}</div>
    <div class="planrow"><b>Re-sign</b> ${keep.length?keep.map(nm).join(", "):"nobody"}</div>
    ${go.length?`<div class="planrow"><b>Let go</b> ${go.map(i=>nm(i)+(mine(i)?"":` <span class="planwhy">(${esc(staffWhy(R[i],i,false))})</span>`)).join(", ")}</div>`:""}
    <div class="planrow"><b>${LEAGUE.draws?"Free transfers":"Free agency"}</b> ${esc(FA[fa].l)}${fa!==D.fa?` <span class="planyou">your change</span>`:`: ${esc(FA[fa].d.replace(/^Free transfers: (.)/,(m,c)=>c.toUpperCase()))}`}${tg?` &middot; ${tg} target${tg===1?"":"s"} of yours first`:""}</div>
    ${LEAGUE.draws?`<div class="planrow"><b>Transfers</b> ${(P.bids||[]).length?(P.bids.length+" bid"+(P.bids.length===1?"":"s")+" of yours"):"none: the staff spend only on free transfers. Bid below if a player is worth the fee."}${(P.sales||[]).length?` &middot; ${P.sales.length} sale${P.sales.length===1?"":"s"}`:""}</div>`
      :`<div class="planrow"><b>Draft</b> ${esc(DR[dr].l)}${dr!==D.draft?` <span class="planyou">your change</span>`:`: ${esc(DR[dr].d)}`}${bd?` &middot; your board of ${bd} first`:""}</div>
    <div class="planrow"><b>Trades</b> ${P.trade?`${esc(P.trade.giveName)} for ${esc(P.trade.n)} <span class="planyou">your change</span>`:"none. Put a player on the block below if you want offers."}</div>`}
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
  const RF=LEAGUE.offseason.recruitFocus, bk=LEAGUE.offseason.budget.buckets, B=P.budget||{};
  // the staff's split is a quarter each, rounded (10 points: 3-2-2-3), so compare with that exactly, not
  // with "all equal" (it said "your change" before anything was touched: Instinct, Grokbot)
  const pool=S.off&&S.off.pool, dflt=pool?{recruit:Math.ceil(pool/4),develop:Math.floor(pool/4),facility:Math.floor(pool/4),retention:pool-Math.ceil(pool/4)-2*Math.floor(pool/4)}:null;
  const even=dflt?bk.every(b=>(B[b.k]||0)===(dflt[b.k]||0)):bk.every(b=>(B[b.k]||0)===(B[bk[0].k]||0)), rf=RF[P.recruit]?P.recruit:"balanced", pt=(P.portal||[]).length, bd=(P.rboard||[]).length;
  const changed=!even||rf!=="balanced"||pt||bd, you=` <span class="planyou">your change</span>`;
  return `<div class="plancard"><div class="bkick">${changed?"Your plan":"Your staff's plan"}</div>
    <div class="planlead">${changed?"The staff's plan, with your changes marked.":"Everything below is already set to this. Change what you like, or nothing at all, and carry on."}</div>
    <div class="planrow"><b>Budget</b> ${even?`a quarter each to ${bk.map(b=>esc(b.l)).join(", ")}`:bk.map(b=>`${esc(b.l)} ${B[b.k]||0}`).join(", ")+you}</div>
    <div class="planrow"><b>Recruiting</b> ${esc(RF[rf]?RF[rf].l:"Balanced")}${rf!=="balanced"?you:RF[rf]?": "+esc(RF[rf].d):""}${bd?` &middot; your board of ${bd}`:""}</div>
    ${P.portal!==undefined?`<div class="planrow"><b>Transfer portal</b> ${pt?pt+" player"+(pt===1?"":"s")+" of yours"+you:"nobody: add players below if you want them."}</div>`:""}</div>`;
}

/* ---- how much the staff give away on a read ----
   Full: Pearl names what she sees and the answer. Hints: she points at what
   to look at and leaves the answer to you. Hints are the default from the
   first season (Nov 2026: both testers found Full gave the answer away);
   Full is the opt-in. A save that chose "Automatic" (full in season one,
   hints after) now gets hints. */
function staffHints(){ return (S.advice||"hints")!=="full" }
function staffAdvice(dp,ctx){
  const R=staffTake(dp,ctx);
  if(!staffHints()||(dp.k!=="read"&&dp.k!=="prep"))return R;
  const H=SPORT.hints||{};
  // a second read says whether the place to look has moved since the first (hints are the default, so
  // the same line twice was what most players saw: Instinct)
  const again=dp.stage===2&&dp.pearl1!==undefined;
  const line=dp.k==="prep"?"Look at what they did most, and ask whether today is any different. Who's the stronger side?"
    :again&&dp.pearl1===dp.pearl?"Same place to look as before. Has anything in the numbers moved?"
    :again&&H[dp.pearl]?"Something's moved since the first read. "+H[dp.pearl]
    :(H[dp.pearl]||"I've got a feeling, but you've got the numbers. What do they say?");
  return R.map(x=>x.who==="pearl"?Object.assign({},x,{pick:null,line:pearlSay(line,(ctx.mine||0)*7+(ctx.q||0))}):x);
}

/* a scouting report with no clear leader, said before you commit (Muse: the
   verdict named a 3-3 split afterwards, the report never warned you) */
function splitNote(R){
  const a=Object.values(R||{}).sort((x,y)=>y-x); if(a.length<2||a[0]!==a[1])return "";
  return `<div class="evn"><b>A split report: ${a.filter(x=>x>0).join("-")}.</b> No clear usual way, so setting up for one is closer to a guess. Waiting to see how they start is a fair call too.</div>`;
}

/* ---- what your calls did ----
   Each call you made, against what the assistant would have done (the
   option you'd get by leaving it to him). Two replays from the moment of the
   call: once with the same dice, the same game with his choice, for a result
   you can see ("a 20-24 loss instead"); and many times with fresh luck after
   it, for whether the call was worth it on average. The averages add up to a
   season's ledger: what your calls were worth in wins (Muse and Instinct:
   "nothing shows a good call mattering"). */
const IMPACT_RUNS=400;
function impactDefault(dp){ return typeof verdictDefault==="function"?verdictDefault(dp):dp.opts[dp.opts.length-1][0] }
function callImpact(args,seed,answers,meHome,runs){
  runs=runs||IMPACT_RUNS;
  const play=(j,v,reseed)=>{                 // replay with answers before j, v at j; later asks: yours where they match, else his
    const rng=new RNG(seed), e=makeLiveGame(rng,...args); let i=0,g=0,r;
    while(g++<3000){ r=e.next(); if(r.done)break;
      if(r.ask){ let a;
        if(i<j)a=answers[i];
        else if(i===j){ a=v; if(reseed!==undefined){ rng.f=mulberry32((seed^Math.imul(reseed+1,0x9E3779B1))>>>0); rng.sp=null } }
        else a=(asks[i]&&asks[i].dp.k===r.ask.k&&answers[i]!==undefined)?answers[i]:impactDefault(r.ask);
        e.reply(a); i++ } }
    return {mine:meHome?r.h:r.a, theirs:meHome?r.a:r.h};
  };
  const asks=[]; { const e=makeLiveGame(new RNG(seed),...args); let i=0,g=0;
    while(g++<3000){ const r=e.next(); if(r.done)break;
      if(r.ask){ asks.push({dp:r.ask}); e.reply(answers[i]!==undefined?answers[i]:impactDefault(r.ask)); i++ } } }
  const out=[], score=x=>x.mine>x.theirs?1:x.mine===x.theirs?0.5:0;
  asks.forEach((A,j)=>{
    const pick=answers[j], def=impactDefault(A.dp);
    if(pick===undefined||pick===def||!A.dp.opts.some(o=>o[0]===def))return;      // left to him: nothing to compare
    const cf=play(j,def);                    // the same dice, his call
    let rp=0,rd=0; for(let m=0;m<runs;m++){ rp+=score(play(j,pick,m)); rd+=score(play(j,def,m)) }
    const lab=o=>(A.dp.opts.find(x=>x[0]===o)||[o,o])[1].split(" · ")[0].split(":")[0];
    out.push({h:A.dp.h, pick:lab(pick), def:lab(def), pk:pick, dk:def, cf:cf, worth:Math.round((rp-rd)/runs*1000)/1000});
  });
  return out;
}
/* the post-game line: the call that mattered most, in words */
function impactHTML(P){
  const C=[].concat(...P.map(p=>(p.impact||[]).map(c=>Object.assign({res:p},c))));
  if(!C.length)return "";
  const c=C.reduce((a,x)=>Math.abs(x.worth)>Math.abs(a.worth)?x:a,C[0]), p=c.res;
  const out=(m,t)=>m>t?"win":m<t?(LEAGUE.draws?"defeat":"loss"):"draw";
  const res=out(p.mine,p.theirs), alt=out(c.cf.mine,c.cf.theirs);
  const altLine=`a ${c.cf.mine}-${c.cf.theirs} ${alt}`;
  // one margin with the graded calls: within 3 points is "about as often" there and "little difference"
  // here (they disagreed: "won about as often (100% and 97%)" beside "wins clearly more often": Grokbot)
  // the same scale as the graded call: within 3 points the same, 4 to 7 a little, beyond 7 clearly
  const avgOf=w=>w>0.07?"wins clearly more often than his":w>0.03?"wins a little more often than his"
    :w>=-0.03?"made little difference either way":w>=-0.07?"wins a little less often than his":"loses clearly more often than his";
  const avg=avgOf(c.worth);
  // every other call you made against his, weighed the same way: the ones left out (a slow-down, the
  // press) read as if they were never weighed (Instinct)
  const rest=C.filter(x=>x!==c).map(x=>`${esc(x.h)} ("${esc(x.pick)}"): ${avgOf(x.worth).replace(/ than his$/,"").replace(/^made little/,"little")}`);
  // one replay is one roll of the dice: the headline credits the call only when
  // the average over many replays agrees (measured: on its own, the same-luck
  // replay disagreed with the average about as often as not)
  const rank={win:2,draw:1,loss:0,defeat:0}, better=rank[res]>rank[alt], worse=rank[res]<rank[alt];
  // the headline says both things, tonight's dice and the average, and never lets them contradict
  // ("You won, but not because of the call" above a replay that lost without it: Grokbot)
  const small=Math.abs(c.worth)<=0.03;
  const head=better?(c.worth>0.03?(res==="draw"?`Your call saved a point.`:`Your call won this game.`)
        :small?`Your call won this one tonight; over many replays it makes little difference.`
        :`Your call won this one tonight, though over many replays it loses more often.`)
    :worse?(c.worth<-0.03?`That call cost you this one.`
        :small?`The call went against you tonight; over many replays it makes little difference.`
        :`Unlucky: the call was sound.`)
    :c.cf.mine===p.mine&&c.cf.theirs===p.theirs?(small?`Same score either way tonight: on these dice the call changed nothing.`
        :`Same score either way tonight, but over many replays your call ${c.worth>0?"wins more often":"loses more often"}.`)
    :small?`Same ${res==="draw"?"draw":res==="win"?"win":"defeat"} either way tonight.`
    // the headline and the replays agree in one sentence ("Same defeat either way" above "wins clearly more often": Grokbot)
    :`Same ${res==="draw"?"draw":res==="win"?"win":"defeat"} either way tonight, but over many replays your call ${c.worth>0?"wins more often":"loses more often"}.`;
  return `<div class="impact"><div class="imphead">${head}</div>
    <div class="impbody">${esc(c.h)}: you chose "${esc(c.pick)}". The same game with the same luck and the assistant's call ("${esc(c.def)}") ends ${altLine}. Over many replays, your call ${avg}.${better&&c.worth<=0.03||worse&&c.worth>=-0.03?" One game is one roll of the dice.":""}</div>${rest.length?`<div class="impbody imprest">Your other ${rest.length===1?"call":rest.length+" calls"} against his, over many replays: ${rest.join("; ")}.</div>`:""}</div>`;
}
/* the season's ledger: what your calls were worth, in wins, against leaving them to the assistant */
function ledgerLine(){
  const L=S.callLedger&&S.callLedger[SEA.year]; if(!L||!L.n)return "";
  const w=L.worth, a=Math.abs(w), say=a<0.25?"about even":`about ${w>0?"+":"−"}${a<1?(Math.round(a*10)/10):(Math.round(a*2)/2)} win${a>=0.75&&a<1.25?"":"s"}`;
  // says what it counts: every call that differed from the assistant's, graded or not (the big number
  // beside it counts only graded ones, and the two read as a contradiction: Grokbot)
  return `Every call you made differently from the assistant this season (${L.n}): ${say} against leaving ${L.n===1?"it":"them"} to him, over many replays.`;
}
/* the season's calls, in the offseason review: the tally, and the call that helped most and the
   one that cost most, in words (Instinct: a season-end summary of your decisions) */
function seasonCallsHTML(){
  const yr=SEA.year, me=S.myTeam, P=[];
  Object.keys(S.played||{}).forEach(k=>{ if(k.split(":")[0]!==String(yr))return;
    (S.played[k]||[]).forEach(p=>{ if(p.team!==me)return; (p.impact||[]).forEach(c=>{ if(typeof c.worth==="number")P.push({c:c,p:p}) }) }) });
  const t=tallyHTML();
  P.sort((a,b)=>b.c.worth-a.c.worth);
  const one=(x,lab)=>`<div class="cand"><div class="candtop"><div><div class="fname">${lab}</div>
    <div class="fnote">${esc(x.c.h)}, against ${esc(x.p.other)} (${x.p.mine}&ndash;${x.p.theirs})</div></div></div>
    <div class="cdesc">You: ${esc(x.c.pick)}.${!x.c.def?"":/assistant/i.test(x.c.def)?" Your assistant would have left things as they were.":` Your assistant would have gone with ${esc(x.c.def)}.`}</div></div>`;
  const best=P.length&&P[0].c.worth>=0.03?P[0]:null, worst=P.length&&P[P.length-1].c.worth<=-0.03?P[P.length-1]:null;
  if(!t&&!best&&!worst)return "";
  return t+(best||worst?`<div class="grouphead">The season's big calls</div>`+(best?one(best,"The one that paid"):"")+(worst&&worst!==best?one(worst,"The one that cost you"):""):"");
}
