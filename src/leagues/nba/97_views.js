/* ============ views: pro basketball ============ */
/* Power rankings, the playoff picture (six straight in, 7-10 play in), the
   stakes line, and the playoffs: a drawn series bracket for each conference,
   the Finals, the play-in, and "Sim the series". */
let nflRankTab="power";
let nbaPostTab=null;
const CLINCH_TITLE={z:"Clinched the top seed",y:"Clinched the division",x:"Clinched a top-six place",p:"Clinched at least the play-in",e:"Eliminated"};
function nflClinchTag(t){
  const k=SEA.clinch()[t];
  return k?`<span class="clinch c${k==="p"?"x":k}" title="${CLINCH_TITLE[k]}">${k}</span>`:"";
}
const NFL_LEGEND=`<div class="note clinchkey"><b>z</b> clinched the top seed &middot; <b>y</b> clinched the division
  &middot; <b>x</b> clinched a top-six place &middot; <b>p</b> the play-in at least &middot; <b>e</b> eliminated.
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
function nflPicture(){
  const my=S.myTeam, f=SEA.seedsNow();
  return Object.keys(f).map(sd=>`<div class="grouphead">${sd}</div>`+f[sd].slice(0,10).map((t,i)=>
    `<div class="frow ${t===my?'mine':''}"><span class="sd">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${nflClinchTag(t)}${TL(t)}</div>
      <div class="fnote">${i<6?"Playoffs":"Play-in"}</div></div>
      <span class="fcfp">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span></div>`).join("")+(()=>{
      const out=f[sd].slice(10,13);
      return `<div class="note">Just out: ${out.map(t=>esc(t)+" "+SEA.rec[t][0]+"-"+SEA.rec[t][1]).join(", ")}.</div>`})()).join("")+NFL_LEGEND;
}
function nflRankingView(){
  const bar=`<div class="dateline"><h2>Rankings</h2><span>${SEA.year}</span></div>
    <div class="subtabs">${[["power","Power ranking"],["picture","Playoff picture"]].map(([k,l])=>
    `<button class="subtab" data-k="${k}" aria-pressed="${nflRankTab===k}">${l}</button>`).join("")}</div>`;
  return bar+(nflRankTab==="picture"?nflPicture():nflPower());
}
function nflStakes(x){
  const {my,opp,wk,left,w,l}=x, out=[];
  const ck=SEA.clinch()[my];
  if(ck==="z")out.push({p:95,tag:"TOP SEED",l:`The 1 seed is yours. Home court all the way to the Finals.`});
  else if(ck==="y")out.push({p:94,tag:"DIVISION CLINCHED",l:`The ${esc(LEAGUE.conf.names[CONF[my]])} is yours. Now it's about seeding.`});
  else if(ck==="x")out.push({p:93,tag:"PLAYOFFS CLINCHED",l:`A top-six place, no play-in. What's left is where you're seeded.`});
  else if(ck==="e")out.push({p:92,tag:"ELIMINATED",l:`Out of the top ten. Play the young guys and think about the lottery.`});
  if(wk>=40&&!ck){
    const f=SEA.seedsNow(), sd=SEA.sideOf(my), i=f[sd].indexOf(my);
    if(i>=0&&i<6)out.push({p:86,tag:"PLAYOFF PLACE",l:`You're the No. ${i+1} seed with ${left} to play. Stay in the top six and skip the play-in.`});
    else if(i>=6&&i<10)out.push({p:88,tag:"PLAY-IN",l:`No. ${i+1} right now: a play-in place. ${i<8?"Seventh or eighth gets two chances.":"Ninth or tenth needs two wins to get in."}`});
    else if(i>=10&&i<13)out.push({p:86,tag:"BUBBLE",l:`${i===10?"First team out":"Number "+(i-9)+" out"} of the play-in. You need this one.`});
    if(SEA.sideOf(opp)===sd){const oi=f[sd].indexOf(opp); if(Math.abs(oi-i)<=2)out.push({p:82,tag:"STANDINGS GAME",l:`${esc(opp)} is right beside you in the standings. This one counts twice.`})}
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
  return `<div class="bracket">${col("First round",pad(ser("r1"),4).map(seriesBox))}${col("Semifinals",pad(ser("r2"),2).map(seriesBox))}${col("Conference finals",pad(ser("r3"),1).map(seriesBox))}</div>`;
}
function nflBracket(){
  const my=S.myTeam, mine=SEA.mySeries(my), live=mine&&!mine.winner&&SEA.phase!=="done";
  const tabs=["East","West","Finals","Play-in"];
  if(!nbaPostTab)nbaPostTab=mine&&mine.side&&mine.side!=="Finals"?mine.side:SEA.sideOf(my);
  let h=`<div class="subtabs">${tabs.map(k=>`<button class="subtab" data-np="${k}" aria-pressed="${nbaPostTab===k}">${k}</button>`).join("")}</div>`;
  if(SEA.champion)h+=`<div class="note"><b>${esc(SEA.champion)}</b> are NBA champions.</div>`;
  if(live&&!isHotSeat())h+=`<div class="note">${esc(ROUND_NAME[mine.round])}: ${esc(mine.hi)} ${mine.w[mine.hi]}, ${esc(mine.lo)} ${mine.w[mine.lo]}.
    <button class="subtab" data-simseries="1">Sim the series</button></div>`;
  if(nbaPostTab==="Play-in"){
    const gs=SEA.rounds.pi;
    h+=gs.length?gs.map(g=>`<div class="brow ${g.home===my||g.away===my?'mine':''}">${esc(g.title)}: <b>${esc(g.winner)}</b> ${Math.max(g.hp,g.ap)}-${Math.min(g.hp,g.ap)} ${esc(g.loser)}</div>`).join("")
      :`<div class="note">Seventh and eighth play for the 7 seed; ninth and tenth for a chance at the 8.</div>`;
  } else if(nbaPostTab==="Finals"){
    h+=`<div class="bracket"><div class="bcol"><div class="bhead">NBA Finals</div><div class="bgames">${seriesBox((SEA.series.r4||[])[0])}</div></div></div>`;
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
  projectedField(){const f=SEA.seedsNow(); return f.East.slice(0,10).concat(f.West.slice(0,10))},
  postseasonView(){return SEA.phase!=="week"?nflBracket():null},
  afterAdvance(ph){ if(ph==="pi2")nbaPostTab=null },
  subtab(b){
    if(b.dataset.k){nflRankTab=b.dataset.k;return true}
    if(b.dataset.np){nbaPostTab=b.dataset.np;return true}
    if(b.dataset.simseries){simSeries();return true}
    return false},
  stakes:nflStakes,
  clinchTag:t=>nflClinchTag(t),
  standingsQualify:1
};
