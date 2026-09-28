/* ============ views: pro hockey ============ */
/* Power rankings, the playoff picture (three per division and two wild cards), the
   stakes line, and the playoffs: a drawn series bracket for each conference,
   the Finals, the play-in, and "Sim the series". */
let nflRankTab="power";
let nbaPostTab=null;
const CLINCH_TITLE={z:"Clinched the conference",y:"Clinched the division",x:"Clinched a playoff place",e:"Eliminated"};
function nflClinchTag(t){
  const k=SEA.clinch()[t];
  return k?`<span class="clinch c${k==="p"?"x":k}" title="${CLINCH_TITLE[k]}">${k}</span>`:"";
}
const NFL_LEGEND=`<div class="note clinchkey"><b>z</b> clinched the conference &middot; <b>y</b> clinched the division
  &middot; <b>x</b> clinched a playoff place &middot; <b>e</b> eliminated.
  Marks appear only once they're certain whatever happens in the games left.</div>`;
function nflPower(){
  const prev=SEA.prevRank, cur=SEA.poll.rankMap(), my=S.myTeam;
  return SEA.poll.order().map((t,i)=>{
    const d=prev&&prev[t]?prev[t]-(i+1):0;
    return `<div class="srow ${t===my?'mine':''}"><span class="spos">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${nflClinchTag(t)}${TL(t)}</span>
      <span class="sconf">${esc(LEAGUE.conf.names[CONF[t]])}</span>
      <span class="sall">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span>
      <span class="sconf ${d>0?'up':d<0?'dn':''}">${d>0?"&#9650;"+d:d<0?"&#9660;"+(-d):""}</span></div>`;
  }).join("")+NFL_LEGEND;
}
/* the seven seeds per conference as it stands */
/* the playoff picture as it stands: three per division, then the wild cards */
function nflPicture(){
  const my=S.myTeam, pts=t=>SEA.pts(t);
  const row=(t,note)=>`<div class="frow ${t===my?'mine':''}"><span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${nflClinchTag(t)}${TL(t)}</div><div class="fnote">${note}</div></div>
      <span class="fcfp">${pts(t)} pts &middot; ${recStr(t)}</span></div>`;
  return Object.keys(LEAGUE.conf.sides).map(sd=>{
    const divs=LEAGUE.conf.sides[sd], inTop=new Set(); let h=`<div class="grouphead">${sd}</div>`;
    divs.forEach(d=>{const top=NAMES.filter(t=>CONF[t]===d).sort((a,b)=>SEA._tb(a,b)).slice(0,3); top.forEach(t=>inTop.add(t));
      h+=top.map((t,i)=>row(t,`${esc(LEAGUE.conf.names[d])} ${i+1}`)).join("")});
    const rest=NAMES.filter(t=>SEA.sideOf(t)===sd&&!inTop.has(t)).sort((a,b)=>SEA._tb(a,b));
    h+=rest.slice(0,2).map((t,i)=>row(t,`Wild card ${i+1}`)).join("");
    h+=`<div class="note">Chasing: ${rest.slice(2,5).map(t=>esc(t)+" "+pts(t)+" pts").join(", ")}.</div>`;
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
  if(ck==="z")out.push({p:95,tag:"CONFERENCE CLINCHED",l:`The most points in the conference. Home ice through three rounds.`});
  else if(ck==="y")out.push({p:94,tag:"DIVISION CLINCHED",l:`The ${esc(LEAGUE.conf.names[CONF[my]])} is yours. Now it's about home ice.`});
  else if(ck==="x")out.push({p:93,tag:"PLAYOFFS CLINCHED",l:`You're in. What's left is who you play.`});
  else if(ck==="e")out.push({p:92,tag:"ELIMINATED",l:`Out of the race. Play the kids and think about the lottery.`});
  if(wk>=40&&!ck){
    const sd=SEA.sideOf(my), q=SEA.seedsNow()[sd], inTop=new Set();
    LEAGUE.conf.sides[sd].forEach(d=>NAMES.filter(t=>CONF[t]===d).sort((a,b)=>SEA._tb(a,b)).slice(0,3).forEach(t=>inTop.add(t)));
    const rest=q.filter(t=>!inTop.has(t)), wi=rest.indexOf(my);
    if(inTop.has(my))out.push({p:86,tag:"PLAYOFF PLACE",l:`Top three in the ${esc(LEAGUE.conf.names[CONF[my]])} with ${left} to play. Stay there.`});
    else if(wi>=0&&wi<2)out.push({p:88,tag:"WILD CARD",l:`Holding wild card ${wi+1}. ${esc(rest[2]||"")} is ${SEA.pts(rest[wi])-SEA.pts(rest[2]||rest[wi])} points back.`});
    else if(wi>=2&&wi<5)out.push({p:86,tag:"BUBBLE",l:`${SEA.pts(rest[1])-SEA.pts(my)} points out of the last wild card. You need these two.`});
    if(SEA.sideOf(opp)===sd&&Math.abs(SEA.pts(opp)-SEA.pts(my))<=4)out.push({p:82,tag:"FOUR-POINT GAME",l:`${esc(opp)} is right beside you in the standings. Two points for you, none for them.`});
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
  return `<div class="bracket">${col("First round",pad(ser("r1"),4).map(seriesBox))}${col("Second round",pad(ser("r2"),2).map(seriesBox))}${col("Conference final",pad(ser("r3"),1).map(seriesBox))}</div>`;
}
function nflBracket(){
  const my=S.myTeam, mine=SEA.mySeries(my), live=mine&&!mine.winner&&SEA.phase!=="done";
  const tabs=["East","West","Final"];
  if(!nbaPostTab)nbaPostTab=mine&&mine.side&&mine.side!=="Finals"?mine.side:(mine&&mine.side==="Finals"?"Final":SEA.sideOf(my));
  let h=`<div class="subtabs">${tabs.map(k=>`<button class="subtab" data-np="${k}" aria-pressed="${nbaPostTab===k}">${k}</button>`).join("")}</div>`;
  if(SEA.champion)h+=`<div class="note"><b>${esc(SEA.champion)}</b> win the Stanley Cup.</div>`;
  if(live&&!isHotSeat())h+=`<div class="note">${esc(ROUND_NAME[mine.round])}: ${esc(mine.hi)} ${mine.w[mine.hi]}, ${esc(mine.lo)} ${mine.w[mine.lo]}.
    <button class="subtab" data-simseries="1">Sim the series</button></div>`;
  if(nbaPostTab==="Final"){
    h+=`<div class="bracket"><div class="bcol"><div class="bhead">Stanley Cup Final</div><div class="bgames">${seriesBox((SEA.series.r4||[])[0])}</div></div></div>`;
  } else h+=confBracket(nbaPostTab);
  return h;
}
/* play out your series without watching, until it's decided (or it needs you) */
function simSeries(){
  let guard=0; const my=S.myTeam;
  while(guard++<10&&SEA.phase!=="done"){
    const x=SEA.mySeries(my); if(!x||x.winner)break;
    const r=SEA.phase.slice(0,2); simAdvance(); if(live)break;
    if(!SEA.phase.startsWith(r))break;
  }
}
LEAGUE.ui={
  rankingTab:"Rankings",
  rankingView:nflRankingView,
  projectedField(){const f=SEA.seedsNow(); return f.East.slice(0,8).concat(f.West.slice(0,8))},
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
