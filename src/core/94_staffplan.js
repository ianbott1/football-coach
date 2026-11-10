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
  // the same ask re-rendered keeps its lines; a new one is checked against what each voice has said this game
  const L=typeof live!=="undefined"&&live?live:null;
  if(L&&L.staffFor&&L.staffFor.dp===dp)return L.staffFor.R;
  const R=staffFresh(staffAdvice0(dp,ctx),dp,L);
  if(L)L.staffFor={dp:dp,R:R};
  return R;
}
/* a voice doesn't say the same sentence twice in a game (Instinct: the Capybara's "simply too far" on
   three straight prompts; the Bears' "SEND EVERYONE" at 45' and 75'): the second time it points back */
/* each gag once a season: "Trap the mascot", "COOKIES AND CREAM!" and "Go fast. Go FAST." came back word for word
   nearly every game (Grokbot). A line a voice used in an earlier game this season loses its flourish (Pearl) or
   becomes a plain shout of the pick (the Bears); the advice itself is unchanged. */
function gagSeason(x,lab){
  const G=S.gags=(S.gags&&S.gags.y===SEA.year)?S.gags:{y:SEA.year,said:{}}, key=x.who+"|"+x.line, g=live&&live.step!==undefined?live.step+":"+(live.slot||0):"";
  const prev=G.said[key]; if(!prev){ G.said[key]=g; return x }
  if(prev===g)return x;                       // said earlier in this game: staffFresh handles that
  if(x.who==="pearl"&&typeof PEARL_AFTER!=="undefined"){ let l=x.line;
    (PEARL_BEFORE||[]).concat(PEARL_AFTER||[]).forEach(f=>{ if(f&&l.indexOf(f)>=0)l=l.replace(f,"") }); return Object.assign({},x,{line:l.trim()}) }
  if(x.who==="bears"&&lab){ const sh=["NO NOTES.","WE'VE DECIDED.","TRUST US.","FINAL ANSWER."], i=Object.keys(G.said).length%sh.length;
    return Object.assign({},x,{line:`${lab.toUpperCase()}! ${sh[i]}`}) }
  return x;
}
function staffFresh(R,dp,L){
  if(!L)return R; const said=L.said=L.said||{}, gave=L.gave=L.gave||{};
  R=R.map(x=>{ const o=x.pick&&dp.opts.find(q=>q[0]===x.pick); return gagSeason(x,o?o[1].replace(/\s*\(.*\)$/,""):"") });
  return R.map(x=>{ const S0=said[x.who]=said[x.who]||[], G=gave[x.who]=gave[x.who]||[];
    const o=x.pick&&dp.opts.find(q=>q[0]===x.pick), lab=o?o[1].replace(/\s*\(.*\)$/,""):"";
    if(S0.indexOf(x.line)<0||!x.pick){ S0.push(x.line); if(lab)G.push(lab.toLowerCase()); return x }
    // "as I said before" only when this voice really gave this advice before: Pearl said "Same as I said before:
    // leave it to your assistant!" having said "see this out" and "go right" (Instinct)
    const again=lab&&G.indexOf(lab.toLowerCase())>=0, l=lab||"the same";
    const line=x.who==="bears"?(again?`${l.toUpperCase()}! We said it before. We'll say it louder.`:`${l.toUpperCase()}! LOUDER THIS TIME.`)
      :x.who==="pearl"?pearlSay(again?`Same as I said before: ${l.toLowerCase()}!`:`I'll keep it simple: ${l.toLowerCase()}!`,dp.opts.length+S0.length)
      :again?`As I said earlier, I'm afraid: ${l.toLowerCase()}.`:`Briefly, then: ${l.toLowerCase()}.`;
    S0.push(line); if(lab)G.push(lab.toLowerCase()); return Object.assign({},x,{line:line}) });
}
function staffAdvice0(dp,ctx){
  const R=staffAdvice00(dp,ctx);
  return typeof voiceVary==="function"?R.map(x=>x&&x.line?Object.assign({},x,{line:voiceVary(x.line)}):x):R;   // round 47: the fixed lines, varied across games
}
function staffAdvice00(dp,ctx){
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
/* what a result is worth to you: a win 1, a loss 0; a draw half, except where the table says otherwise (soccer: a point
   against three for a win, LEAGUE.drawVal). A cup tie settled on penalties went to the side that won the shootout.
   Round 44: soccer's calls were graded with a draw as half a win, so "take the point" was worth more than the table
   gives for it, and level late the two answers rarely differed. */
function resultVal(r,meHome){
  const mine=meHome?r.h:r.a, th=meHome?r.a:r.h; if(mine!==th)return mine>th?1:0;
  if(r.pens)return (r.pens==="home")===!!meHome?1:0;
  const ev=typeof process!=="undefined"&&process.env&&process.env.DRAW_VAL;   // tests: grade a draw another way
  return ev?+ev:(LEAGUE.drawVal!=null?LEAGUE.drawVal:0.5);
}
const IMPACT_RUNS=400;
const IMPACT_ALL=true;   // round 48: grade against the third option too, where there is one
function impactDefault(dp){ return typeof verdictDefault==="function"?verdictDefault(dp):dp.opts[dp.opts.length-1][0] }
/* Situation calls (push, sit, protect, chase, half-time, late) are asked only when the game is in reach: a
   chance, with your assistant's choice from here, between GATE_LO and GATE_HI over GATE_RUNS replays of the rest.
   Outside it your assistant makes the call, as for a skipped game, so nothing about the result changes; "close
   either way" came mostly from calls in decided games (round 33: up 10 late in football, 100% either way;
   down 16 at half-time in basketball, 0-2%). Reads, scouting, flanks and the goalie are always asked: their
   answer is in the evidence, not the score. Football's fourth downs keep their own gate (inReach). */
const GATE_KINDS={protect:1,half:1,chase:1,push:1,lock:1,pull:1,late:1,close:1,third:1,onside:1,defend:1,final:1,tied:1}, GATE_LO=0.1, GATE_HI=0.9, GATE_RUNS=40;
function callInReach(args,seed,answers,meHome,j){
  let s=0;
  for(let m=0;m<GATE_RUNS;m++){ const rng=new RNG(seed), e=makeLiveGame(rng,...args); let i=0,g=0,r;
    while(g++<3000){ r=e.next(); if(r.done)break;
      if(r.ask){ let a; if(i<j)a=answers[i]; else { if(i===j){ rng.f=mulberry32((seed^Math.imul(m+101,0x9E3779B1))>>>0); rng.sp=null } a=impactDefault(r.ask) }
        e.reply(a); i++ } }
    s+=resultVal(r,meHome) }
  return s/GATE_RUNS;
}
/* ...and in reach, a call where no option beats your assistant's by SPREAD_MIN over SPREAD_RUNS replays each (the
   same dice for every option) goes to your assistant too: nothing to gain by taking it. asked, then stamped "close either way", it taught that
   your calls don't matter (Muse, round 43). Reads and scouting are never skipped: their answer is in the evidence. */
const SPREAD_ON=true;
// mid-game situation calls only: the final stretch (final, tied, overtime, the goalie pull) keeps its promise of a
// decision when the game is in reach (round 40), and crunch-time and third-period calls are reads
// round 46 (Ian: "gate them"): every situation call, the late ones too, is asked only when it gains 3 points on your
// assistant. Round 40 kept the final stretch, ties, overtime, the pull, the press and the third period out of it, so a
// close game always had a late decision; both testers found those calls graded "close either way" (soccer's 80th
// minute, the college press, hockey's overtime), which is the round-40 rule for cutting a call.
const SPREAD_KINDS=Object.assign({two:1,gstart:1,fouls:1},GATE_KINDS);   // round 44: who starts in goal, foul trouble
/* round 49, measured (1,172 gated calls, six seasons a game, each option's worth checked on 1,600 fresh replays):
   at 60 replays and 3 points the gate let through 432 calls, and only one in five of them truly gained 3 points on the
   assistant (picking the best of three noisy numbers flatters the best). 120 replays and 4 points: 269 through, one in
   three real, and a little over half the real ones still asked. Some kinds almost never matter whatever the gate:
   hockey's push and lock (0 of 68 truly worth 3 points) and its final stretch (1 of 40), college basketball's half-time
   and chase calls (3 of 95), college football's protect and onside (0 of 22), the pro onside kick (0 of 7). Those go
   to your assistant every time: asking them taught that the calls don't matter. */
const NEVER_ASK={nhl:{push:1,lock:1,final:1}, ncaab:{half:1,chase:1}, cfb:{protect:1,onside:1}, nfl:{onside:1}};
function neverAsk(k){ return !!(typeof LEAGUE!=="undefined"&&NEVER_ASK[LEAGUE.id]&&NEVER_ASK[LEAGUE.id][k]) }
const SPREAD_MIN=0.04, SPREAD_RUNS=+((typeof process!=="undefined"&&process.env&&process.env.SPREAD_RUNS)||120);
function callSpread(args,seed,answers,meHome,j,opts,dp){
  const rate=v=>{ let s=0;
    for(let m=0;m<SPREAD_RUNS;m++){ const rng=new RNG(seed), e=makeLiveGame(rng,...args); let i=0,g=0,r;
      while(g++<3000){ r=e.next(); if(r.done)break;
        if(r.ask){ let a; if(i<j)a=answers[i]; else if(i===j){ a=v; rng.f=mulberry32((seed^Math.imul(m+211,0x9E3779B1))>>>0); rng.sp=null } else a=impactDefault(r.ask);
          e.reply(a); i++ } }
      s+=resultVal(r,meHome) }
    return s/SPREAD_RUNS };
  const def=dp?impactDefault(dp):opts[opts.length-1][0], R=opts.map(o=>rate(o[0])), di=opts.findIndex(o=>o[0]===def);
  return di<0?Math.max(...R)-Math.min(...R):Math.max(...R)-R[di];   // the most you could gain on your assistant's call
}
/* the answers as yours: a call your assistant made because the game wasn't in reach is a blank (not graded, not weighed) */
function yourAnswers(answers,auto){ if(!auto||!auto.length)return answers; return answers.map((a,i)=>auto.indexOf(i)>=0?undefined:a) }
function callImpact(args,seed,answers,meHome,runs){
  runs=runs||IMPACT_RUNS;
  const play=(j,v,reseed)=>{                 // replay with answers before j, v at j; later asks: yours where they match, else his
    const rng=new RNG(seed), e=makeLiveGame(rng,...args); let i=0,g=0,r,dd=null,want=false;
    while(g++<3000){ r=e.next(); if(want){ dd=e.autoDid||null; want=false } if(r.done)break;
      if(r.ask){ let a; if(i===j)want=true;
        if(i<j)a=answers[i];
        else if(i===j){ a=v; if(reseed!==undefined){ rng.f=mulberry32((seed^Math.imul(reseed+1,0x9E3779B1))>>>0); rng.sp=null } }
        else a=(asks[i]&&asks[i].dp.k===r.ask.k&&answers[i]!==undefined)?answers[i]:impactDefault(r.ask);
        e.reply(a); i++ } }
    return {mine:meHome?r.h:r.a, theirs:meHome?r.a:r.h, v:resultVal(r,meHome), dd:dd};   // dd: what your assistant did with the call, on that night (round 50)
  };
  const asks=[]; { const e=makeLiveGame(new RNG(seed),...args); let i=0,g=0;
    while(g++<3000){ const r=e.next(); if(r.done)break;
      if(r.ask){ asks.push({dp:r.ask}); e.reply(answers[i]!==undefined?answers[i]:impactDefault(r.ask)); i++ } } }
  const out=[], score=x=>x.v;
  asks.forEach((A,j)=>{
    const pick=answers[j], def=impactDefault(A.dp);
    if(pick===undefined||pick===def||!A.dp.opts.some(o=>o[0]===def))return;      // left to him: nothing to compare
    const cf=play(j,def);                    // the same dice, his call
    let rp=0,rd=0; for(let m=0;m<runs;m++){ rp+=score(play(j,pick,m)); rd+=score(play(j,def,m)) }
    const lab=o=>(A.dp.opts.find(x=>x[0]===o)||[o,o])[1].split(" · ")[0].split(":")[0];
    // the other options too, on the same dice (round 48: seven in ten asked situation calls came back "close either
    // way" because the pick was level with the assistant's while a third option was the one that mattered; Muse:
    // "grade the dramatic calls"). Not for football, which grades every option in its own list.
    let best=null; if(IMPACT_ALL&&A.dp.k!=="read"&&A.dp.k!=="prep"&&typeof verdictDefault==="undefined"){
      A.dp.opts.forEach(o=>{ const v=o[0]; if(v===pick||v===def||/assistant/i.test(o[1]))return; let r=0; for(let m=0;m<runs;m++)r+=score(play(j,v,m));
        if(!best||r>best.r)best={k:v,r:r} }); }
    const bo=best&&best.r>Math.max(rp,rd)?{alt:lab(best.k),altv:Math.round((best.r-rp)/runs*1000)/1000,wa:Math.round(best.r/runs*100)}:{};
    out.push(Object.assign({k:A.dp.k, h:A.dp.h, pick:lab(pick), def:lab(def), pk:pick, dk:def, cf:{mine:cf.mine,theirs:cf.theirs}, dd:cf.dd||undefined, worth:Math.round((rp-rd)/runs*1000)/1000, wp:Math.round(rp/runs*100), wd:Math.round(rd/runs*100)},bo));
  });
  return out;
}
/* the post-game line: the call that mattered most, in words */
/* How clear a call's verdict is, in points: graded calls (football) against the best option, the rest
   against the assistant's call. Only a clear one (beyond 7) earns the headline: a 68-67 edge read "A GOOD
   CALL, AND IT WON YOU THIS GAME" and 4-point gaps were headlined beside "close either way" (Muse, Grokbot) */
function callClarity(c){ const w=Math.round(c.worth*1000)/10;   // in tenths of a point: 0.07*100 is 7.000000000000001, which headlined a 7-point call
  if(c.q!==undefined){ if(c.sp<=3)return 0; if(c.q<-3)return c.q; return Math.max(0,w) } return w }
function impactHTML(P){
  // one verdict per call: a read is judged in the reads below, right or wrong; judged here too, against the assistant,
  // the two could disagree on one call ("a little worse" above a tick: round 39), so here it's situation calls only
  const RK={}; P.forEach(q=>(q.reads||[]).forEach(r=>{ RK[r.k]=1 }));
  // football grades each call in its own list below, option by option against the best; summarised here too, the same
  // fourth down came twice on one card, from two sets of replays with two sets of numbers (Muse, rounds 14 and 20)
  const C=[].concat(...P.map(p=>(p.impact||[]).map(c=>Object.assign({res:p},c)))).filter(c=>!(c.k&&RK[c.k])&&c.q===undefined);
  if(!C.length)return "";
  // the clearest call leads, the wrong ones first when as clear (a field goal praised above two crossed punts: Grokbot)
  const c=C.reduce((a,x)=>Math.abs(callClarity(x))>Math.abs(callClarity(a))||(Math.abs(callClarity(x))===Math.abs(callClarity(a))&&callClarity(x)<callClarity(a))?x:a,C[0]), p=c.res;
  const out=(m,t)=>m>t?"win":m<t?(LEAGUE.draws?"defeat":"loss"):"draw";
  const res=out(p.mine,p.theirs), alt=out(c.cf.mine,c.cf.theirs);
  const altLine=`a ${c.cf.mine}-${c.cf.theirs} ${alt}`;
  // the same scale as the graded call: within 3 points the same, 4 to 7 a little, beyond 7 clearly
  const avgOf=w=>w>0.07?"wins clearly more often than his":w>0.03?"wins a little more often than his"
    :w>=-0.03?"made little difference either way":w>=-0.07?"wins a little less often than his":"loses clearly more often than his";
  const word=x=>{ const k=callClarity(x); return k>7?"clearly better than his":k>3?"a little better than his":k<-7?"clearly worse":k<-3?"a little worse":"close either way" };
  const pickWord=x=>/assistant/i.test(x.pick)?"you left it to your assistant":`you chose "${esc(x.pick)}"`;
  const k=callClarity(c), rank={win:2,draw:1,loss:0,defeat:0}, better=rank[res]>rank[alt], worse=rank[res]<rank[alt];
  // a read is listed once, in the reads below with its right-or-wrong; listed here too under its own headline, the
  // same call read as a second call and its answer as one never offered (Grokbot, round 38: "graded on a call I never saw")
  const rest=C.filter(x=>x!==c).map(x=>`${esc(x.h)} (${pickWord(x)}): ${Math.abs(callClarity(x))<=3&&x.altv>=0.03?`level with his, but "${esc(x.alt)}" was better by about ${Math.round(x.altv*100)} in 100`:word(x)}`);
  const restHTML=rest.length?`<div class="impbody imprest">Your other ${rest.length===1?"call":rest.length+" calls"} tonight: ${rest.join("; ")}.</div>`:"";
  // a read graded wrong is never headlined as a good call: "A STRONG CALL" sat above a cross for the same game plan
  // (Grokbot, pro basketball); the two judge different things (against the assistant; against the truth), so then
  // the card says the plain line instead
  const crossed=P.some(q=>(q.reads||[]).some(r=>r.pick===c.pk&&r.right===false&&!r.unclear));
  if(Math.abs(k)<=7||(k>0&&crossed)){   // no headline: one plain line, sized to the gap
    const lead=Math.abs(k)<=3&&c.altv>=0.03?`${esc(c.h)}: ${pickWord(c)}, level with your assistant's call over many replays, but "${esc(c.alt)}" was the better option: about ${Math.round(c.altv*100)} more wins in 100.${repRates(c)} <span class="reprate">"${esc(c.alt)}" won ${c.wa}%.</span>`
      :Math.abs(k)<=3?`${esc(c.h)}: ${pickWord(c)}, and over many replays it was close either way &mdash; not graded, right or wrong.`   // the same footing as "a little better" (Muse)
      :`${esc(c.h)}: ${pickWord(c)}. Over many replays it was ${k>0?"a little better than":"a little worse than"} ${c.q!==undefined&&k<0?"the best option":"the assistant's"} &mdash; worth knowing, not worth a headline.${repRates(c)}`;
    return `<div class="impact quiet"><div class="impbody">${lead}</div>${restHTML}</div>`; }
  const good=k>0;
  const verdict=good?"A strong call":"The wrong call";
  // nothing more when one replay gave the same result: "though tonight's dice gave the same result either way" read as
  // "your win didn't count", and on a one-point loss as if no call mattered (Instinct, Grokbot)
  const tonight=good?(better?(res==="draw"?"and it saved you a point.":"and it won you this game."):worse?"and unlucky tonight: keep making it.":"")
                    :(better?"though it worked tonight: the other way wins more often.":worse?"and it cost you this one.":"");
  return `<div class="impact"><div class="imphead">${verdict}${tonight?", "+tonight:"."}</div>
    <div class="impbody">${esc(c.h)}: ${pickWord(c)}. Over many replays from that moment, your call ${avgOf(c.worth).replace(/ than his$/," than the assistant's (\""+esc(c.def)+"\")")}${c.q!==undefined&&c.q<-7&&c.worth>-0.07?` (and well behind the best option)`:""}.${repRates(c)}</div>${restHTML}</div>`;
    // the one same-luck replay's score is gone from the card: a 117-85 win "became a 103-116 loss" beside "a little less
    // often", and players stopped trusting the replays (Grokbot). Whether tonight turned on it stays in the headline.
}
/* the replays behind a verdict, option by option, as football's fourth downs show them (Instinct, round 15: basketball's
   grades had no comparison to inspect). Win shares where a game has a winner; soccer grades in points, so it doesn't. */
function repRates(c){
  if(LEAGUE.draws||c.wp===undefined||c.wd===undefined||/assistant/i.test(c.pick))return "";
  const d=typeof filmDef==="function"&&filmDef(c.def)?filmDef(c.def):"his call";
  return ` <span class="reprate">${esc(c.pick)} won ${c.wp}% of the replays; ${esc(d)}, ${c.wd}%.</span>`;
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
  // only calls the card graded: a "close either way" call named "your costliest" contradicted its own card (Grokbot)
  for(let i=P.length-1;i>=0;i--){ const c=P[i].c; if(c.q!==undefined&&!(c.sp>3))P.splice(i,1) }
  P.sort((a,b)=>b.c.worth-a.c.worth);
  const one=(x,lab)=>`<div class="cand"><div class="candtop"><div><div class="fname">${lab}</div>
    <div class="fnote">${esc(x.c.h)}, against ${esc(x.p.other)} (${x.p.mine}&ndash;${x.p.theirs})</div></div></div>
    <div class="cdesc">${/assistant/i.test(x.c.pick)?"You left it to your assistant.":`You: ${esc(x.c.pick)}.`}${typeof assistantSaid==="function"?assistantSaid(x.c):""}
    ${(w=>w>=1?` Why: from that moment, your choice won about ${w} more games in 100 than his${x.p.mine>x.p.theirs?"":", though the game went the other way"}.`:w<=-1?` Why: from that moment, your choice won about ${-w} fewer games in 100 than his${x.p.mine>x.p.theirs?", though you won anyway":""}.`:"")(Math.round(x.c.worth*100))}</div></div>`;
  const best=P.length&&P[0].c.worth>=0.03?P[0]:null, worst=P.length&&P[P.length-1].c.worth<=-0.03?P[P.length-1]:null;
  if(!t&&!best&&!worst)return "";
  return t+(best||worst?`<div class="grouphead">The season's big calls</div>`+(best?one(best,"Your best call"):"")+(worst&&worst!==best?one(worst,"Your costliest call"):""):"");
}

/* ============ live win probability (round 46, a trial: Ian wanted to try it) ============ */
/* Between plays only, never on a call (it can't become a calculator for the options). From the score, the time left
   and the pre-game chance: the rest of the game's margin is taken as normal, mean mu*tau and spread sigma*sqrt(tau),
   where tau is the share of the game still to play and mu the full-game edge the pre-game chance implies. Sigma is
   each league's, fitted to its own engine (LIVE_SIG, measured: test/live-wp.js), and the line is checked for honesty
   there: when it says 70%, that side wins about 70% of the time. A level score after regulation goes to overtime
   (a shoot-out, extra time) at the pre-game edge, halved. */
const LIVE_WP_ON=true, LIVE_MU={};   // a league whose pre-game edge plays out smaller live (fitted, test/live-wp.js)
const LIVE_SIG={cfb:18,nfl:14,ncaab:16,nba:18,nhl:2.75,epl:1.9,mlb:4.2}, LIVE_POSS=1.5;   // fitted, 400 live games a league (test/live-wp.js); football: the ball next is worth about a point and a half
function liveTau(d){
  if(!d)return 1;
  if(d.q!==undefined){ const T=typeof DRIVES_PER_TEAM!=="undefined"?DRIVES_PER_TEAM*2:24; return d.q>=5?0.02:Math.max(0,1-(d.n||0)/T) }
  if(d.ot||d.so)return 0.03;
  const N=typeof SEGS!=="undefined"?SEGS:8; return Math.max(0,1-((d.seg||0)+1)/N);
}
function liveScore(d){ return d.q!==undefined?[d.h,d.a]:[d.sh,d.sa] }
function normCdf(z){ const t=1/(1+0.2316419*Math.abs(z)), y=0.3989423*Math.exp(-z*z/2)*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-y:y }
function normInv(p){ p=Math.min(0.9999,Math.max(0.0001,p)); let lo=-6,hi=6; for(let i=0;i<50;i++){ const m=(lo+hi)/2; if(normCdf(m)<p)lo=m; else hi=m } return (lo+hi)/2 }
/* [win, draw, loss] for the side with margin m (theirs subtracted), tau of the game to play, pre-game [w,d,l] */
function liveChance(m,tau,pre,sig,poss){
  const [w0,d0]=pre, s=sig, mu=s*normInv(Math.min(0.995,Math.max(0.005,w0+d0/2)));
  const E=m+mu*(LIVE_MU[LEAGUE.id]||1)*tau+(poss&&tau>0?poss*LIVE_POSS:0), S=Math.max(0.05,s*Math.sqrt(Math.max(tau,0.0001)));
  const pw=1-normCdf((0.5-E)/S), pl=normCdf((-0.5-E)/S), pt=Math.max(0,1-pw-pl);
  if(LEAGUE.draws&&!(typeof live!=="undefined"&&live&&live.g&&(live.g.cup||live.g.title||SEA.phase!=="week")))return [pw,pt,pl];   // a cup tie or a play-off goes on to a winner
  const q=0.5+((w0+d0/2)-0.5)*0.5; return [pw+pt*q,0,pl+pt*(1-q)];
}
function liveWPHTML(){
  if(!LIVE_WP_ON||(S&&S.liveWP===false)||!live||live.ask||live.done||live.h2h||!live.drives||!live.drives.length)return "";   // S.liveWP: off in the ? panel (round 50: Instinct)
  const d=live.drives[live.drives.length-1], sc=liveScore(d); if(sc[0]===undefined)return "";
  const meH=live.g.home===S.myTeam, m=meH?sc[0]-sc[1]:sc[1]-sc[0];
  if(!live.pre){ const opp=meH?live.g.away:live.g.home;
    try{ live.pre=LEAGUE.wdl?withPlan("balanced",()=>LEAGUE.wdl(S.myTeam,opp,meH,!!live.g.neutral)):[winProb(S.myTeam,opp,meH,!!live.g.neutral),0] }catch(e){ return "" } }
  const poss=d.q!==undefined?(d.home===meH?-1:1):0;   // football: who has the ball next
  const sig=LIVE_SIG[LEAGUE.id]||10, [w,dr,l]=liveChance(m,liveTau(d),live.pre,sig,poss), P=x=>Math.max(1,Math.min(99,Math.round(x*100)));
  // the three add to 100 (round 50: soccer's line read 101 twice: Muse): each rounded down, the leftover points to the largest remainders
  if(LEAGUE.draws&&dr>0.005){ const v=[w,dr,l].map(x=>x*100), f=v.map(Math.floor); let r=100-f.reduce((a,b)=>a+b,0);
    v.map((x,i)=>[x-f[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([_,i])=>{ if(r>0){ f[i]++; r-- } });
    const Q=f.map(x=>Math.max(1,Math.min(98,x)));
    return `<div class="livewp"><span class="lwlab">Right now</span><span class="lwbar"><i style="width:${Q[0]}%"></i><b style="width:${Q[1]}%"></b></span><span class="lwpct">${esc(S.myTeam)}: W ${Q[0]}% &middot; D ${Q[1]}% &middot; L ${Q[2]}%</span></div>` }
  return LEAGUE.draws&&dr>0.005?`<div class="livewp"><span class="lwlab">Right now</span><span class="lwbar"><i style="width:${P(w)}%"></i><b style="width:${P(dr)}%"></b></span><span class="lwpct">${esc(S.myTeam)}: W ${P(w)}% &middot; D ${P(dr)}% &middot; L ${P(l)}%</span></div>`
    :`<div class="livewp"><span class="lwlab">Right now</span><span class="lwbar"><i style="width:${P(w)}%"></i></span><span class="lwpct">${esc(S.myTeam)}: ${P(w)}% to win</span></div>`;
}
