/* ============ views: pro baseball ============ */
/* Power rankings, the playoff picture (three per division and two wild cards), the
   stakes line, and the playoffs: a drawn series bracket for each conference,
   the Finals, the play-in, and "Sim the series". */
let nflRankTab="power";
let nbaPostTab=null;
const CLINCH_TITLE={y:"Clinched the division",x:"Clinched a postseason place",e:"Eliminated"};
function nflClinchTag(t){
  const k=SEA.clinch()[t];
  return k?`<span class="clinch c${k==="p"?"x":k}" title="${CLINCH_TITLE[k]}">${k}</span>`:"";
}
const NFL_LEGEND=`<div class="note clinchkey"><b>y</b> clinched the division
  &middot; <b>x</b> clinched a postseason place &middot; <b>e</b> eliminated.
  Marks appear only once they're certain whatever happens in the games left.</div>`;
function nflPower(){
  const prev=SEA.prevRank, cur=SEA.poll.rankMap(), my=S.myTeam;
  return SEA.poll.order().map((t,i)=>{
    const d=prev&&prev[t]?prev[t]-(i+1):0;
    return `<div class="srow ${t===my?'mine':''}"><span class="spos">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${nflClinchTag(t)}${TL(t)}</span>
      <span class="sconf divn">${esc(LEAGUE.conf.names[CONF[t]])}</span>
      <span class="sall">${recStr(t)}</span>
      <span class="sconf ${d>0?'up':d<0?'dn':''}">${d>0?"&#9650;"+d:d<0?"&#9660;"+(-d):""}</span></div>`;
  }).join("")+NFL_LEGEND;
}
/* the postseason picture as it stands: the division leaders, then the wild cards, games behind */
function nflPicture(){
  const my=S.myTeam, R=SEA.rec, gb=(a,b)=>((R[a][0]-R[b][0])+(R[b][1]-R[a][1]))/2;
  const row=(t,note)=>`<div class="frow ${t===my?'mine':''}"><span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${nflClinchTag(t)}${TL(t)}</div><div class="fnote">${note}</div></div>
      <span class="fcfp">${recStr(t)}</span></div>`;
  return Object.keys(LEAGUE.conf.sides).map(sd=>{
    const divs=LEAGUE.conf.sides[sd], note={}; let h=`<div class="grouphead">${sd}</div>`;
    const lead=divs.map(d=>NAMES.filter(t=>CONF[t]===d).sort((a,b)=>SEA._tb(a,b))[0]).sort((a,b)=>SEA._tb(a,b));
    lead.forEach((t,i)=>note[t]=`${esc(LEAGUE.conf.names[CONF[t]])} leader${i<2?" (a bye)":""}`);
    const rest=NAMES.filter(t=>SEA.sideOf(t)===sd&&!note[t]).sort((a,b)=>SEA._tb(a,b));
    rest.slice(0,3).forEach((t,i)=>note[t]=`Wild card ${i+1}`);
    h+=Object.keys(note).sort((a,b)=>SEA._tb(a,b)).map(t=>row(t,note[t])).join("");
    const last=rest[2];
    h+=`<div class="note">Chasing: ${rest.slice(3,6).map(t=>esc(t)+" "+(last?(g=>g?g+" back":"level")(gb(last,t)):"")).join(", ")}.</div>`;
    return h}).join("")+NFL_LEGEND;
}
function nflRankingView(){
  const bar=`<div class="dateline"><h2>Rankings</h2><span>${SEA.year}</span></div>
    <div class="subtabs">${[["power","Power ranking"],["picture","Playoff picture"]].map(([k,l])=>
    `<button class="subtab" data-k="${k}" aria-pressed="${nflRankTab===k}">${l}</button>`).join("")}</div>`;
  return bar+(nflRankTab==="picture"?nflPicture():nflPower());
}
function nflStakes(x){
  const {my,opp,wk,left}=x, out=[];
  const ck=SEA.clinch()[my];
  if(ck==="y")out.push({p:94,tag:"DIVISION CLINCHED",l:`The ${esc(LEAGUE.conf.names[CONF[my]])} is yours. Now it's about the bye.`});
  else if(ck==="x")out.push({p:93,tag:"POSTSEASON CLINCHED",l:`You're in. What's left is who you play.`});
  else if(ck==="e")out.push({p:92,tag:"ELIMINATED",l:`Out of the race. Play the kids and think about the lottery.`});
  if(wk>=100&&!ck){
    const R=SEA.rec, gb=(a,b)=>((R[a][0]-R[b][0])+(R[b][1]-R[a][1]))/2, sd=SEA.sideOf(my);
    const lead=LEAGUE.conf.sides[sd].map(d=>NAMES.filter(t=>CONF[t]===d).sort((a,b)=>SEA._tb(a,b))[0]);
    const rest=NAMES.filter(t=>SEA.sideOf(t)===sd&&lead.indexOf(t)<0).sort((a,b)=>SEA._tb(a,b)), wi=rest.indexOf(my);
    const dl=NAMES.filter(t=>CONF[t]===CONF[my]).sort((a,b)=>SEA._tb(a,b))[0];
    if(dl===my)out.push({p:86,tag:"DIVISION LEAD",l:`Leading the ${esc(LEAGUE.conf.names[CONF[my]])} with ${left} to play. Stay there.`});
    else if(wi>=0&&wi<3)out.push({p:88,tag:"WILD CARD",l:`Holding wild card ${wi+1}${rest[3]?`; ${esc(rest[3])} is ${gb(my,rest[3])} back`:""}.`});
    else if(wi>=3&&wi<7)out.push({p:86,tag:"BUBBLE",l:`${gb(rest[2],my)} games out of the last wild card.`});
    if(SEA.sideOf(opp)===sd&&Math.abs(gb(opp,my))<=2)out.push({p:82,tag:"HEAD TO HEAD",l:`${esc(opp)} is right beside you in the standings: these count twice.`});
  }
  return out;
}
/* ---- the playoffs, drawn ---- */
function seriesBox(x){
  if(!x)return `<div class="bgame">${bslot(null)}${bslot(null)}</div>`;
  const row=t=>bslot(t,SEA.seeds[t],x.w[t],x.winner===t);
  return `<div class="bgame">${row(x.hi)}${row(x.lo)}</div>`;
}
function bslot(t,seed,wins,win){
  const my=t&&t===S.myTeam;
  return `<div class="bslot ${win?'bwin':''} ${my?'bmine':''}" style="--tc:${t?teamInk(t):'transparent'}">
    <span class="bseed">${seed||""}</span><span class="bteam">${t?esc(t):'<span class="btbd">to be decided</span>'}</span>
    <span class="bpts">${wins!==undefined&&wins!==null?wins:""}</span></div>`;
}
function confBracket(sd){
  const col=(title,items)=>`<div class="bcol"><div class="bhead">${title}</div><div class="bgames">${items.join("")}</div></div>`;
  const ser=r=>(SEA.series[r]||[]).filter(x=>x.side===sd);
  const pad=(a,n)=>{const o=a.slice(); while(o.length<n)o.push(null); return o};
  let wc=ser("wc");
  if(!wc.length&&SEA.step>=LEAGUE.weeks){ SEA._seed(); const B=SEA.bracket[sd]; wc=B?B.wc.map(p=>({hi:p[0],lo:p[1],w:{}})):[] }
  const byes=SEA.bracket&&SEA.bracket[sd]?SEA.bracket[sd].bye:[];
  return `<div class="bracket">${col("Wild Card",pad(wc,2).map(seriesBox))}${col("Division Series",pad(ser("ds"),2).map(seriesBox))}${col("Championship",pad(ser("cs"),1).map(seriesBox))}</div>`+
    (byes.length&&!ser("ds").length?`<div class="note">A bye to the Division Series: ${byes.map(t=>esc(t)).join(" and ")}.</div>`:"");
}
function nflBracket(){
  const my=S.myTeam, mine=SEA.mySeries(my), live=mine&&!mine.winner&&SEA.phase!=="done";
  const tabs=["AL","NL","Series"];
  if(!nbaPostTab)nbaPostTab=mine&&mine.side?mine.side:SEA.sideOf(my);
  let h=`<div class="subtabs">${tabs.map(k=>`<button class="subtab" data-np="${k}" aria-pressed="${nbaPostTab===k}">${k==="Series"?"World Series":k}</button>`).join("")}</div>`;
  if(SEA.champion)h+=`<div class="note"><b>${esc(SEA.champion)}</b> win the World Series.</div>`;
  if(live&&!isHotSeat())h+=`<div class="note">${esc(ROUND_NAME[mine.round])}: ${(o=>`${esc(my)} ${mine.w[my]||0}, ${esc(o)} ${mine.w[o]||0}`)(mine.hi===my?mine.lo:mine.hi)}.
    <button class="subtab" data-simseries="1">Sim the series</button> <span class="fnote">It stops before a game that could end your season.</span></div>`;
  if(nbaPostTab==="Series"){
    h+=`<div class="bracket"><div class="bcol"><div class="bhead">World Series</div><div class="bgames">${seriesBox((SEA.series.ws||[])[0])}</div></div></div>`;
  } else h+=confBracket(nbaPostTab);
  return h;
}
/* play out your series without watching, until it's decided (or it needs you) */
function simSeries(){
  let guard=0; const my=S.myTeam;
  while(guard++<10&&SEA.phase!=="done"){
    const x=SEA.mySeries(my); if(!x||x.winner)break;
    // stop before a game that could end your season: it simmed straight through game 6 of a 2-4 exit (Grokbot,
    // both seasons). Pressed when already facing elimination, it plays that one game.
    const opp=x.hi===my?x.lo:x.hi; if(guard>1&&(x.w[opp]||0)>=(ROUND_WIN[x.round]||4)-1)break;
    const r=SEA.phase.slice(0,2); simAdvance(); if(live)break;
    if(!SEA.phase.startsWith(r))break;
  }
}
LEAGUE.ui={
  standingsCols:STAND_TOTALS("RS","RA"),   // points for and against (Grokbot: a team stats page)
  rankingTab:"Rankings",
  rankingView:nflRankingView,
  projectedField(){const f=SEA.seedsNow(); return f.AL.slice(0,6).concat(f.NL.slice(0,6))},
  postseasonView(){return SEA.phase!=="week"?nflBracket():null},
  afterAdvance(ph){ if(ph==="week")nbaPostTab=null },
  subtab(b){
    if(b.dataset.k){nflRankTab=b.dataset.k;return true}
    if(b.dataset.np){nbaPostTab=b.dataset.np;return true}
    if(b.dataset.simseries){simSeries();return true}
    return false},
  stakes:nflStakes,
  clinchTag:t=>nflClinchTag(t),
  standingsQualify:1
};
