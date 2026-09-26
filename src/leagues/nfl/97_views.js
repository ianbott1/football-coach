/* ============ screens: pro football ============ */
/* The ranking tab is the power ranking and the playoff picture by
   conference; once the regular season ends, Scores shows the bracket. */
let nflRankTab="power";

function nflPower(){
  const prev=SEA.prevRank, cur=SEA.poll.rankMap(), my=S.myTeam;
  return SEA.poll.order().map((t,i)=>{
    const d=prev&&prev[t]?prev[t]-(i+1):0;
    return `<div class="srow ${t===my?'mine':''}"><span class="spos">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <span class="steam">${TL(t)}</span>
      <span class="sconf">${esc(LEAGUE.conf.names[CONF[t]])}</span>
      <span class="sall">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span>
      <span class="sconf ${d>0?'up':d<0?'dn':''}">${d>0?"&#9650;"+d:d<0?"&#9660;"+(-d):""}</span></div>`;
  }).join("");
}
/* the seven seeds per conference as it stands */
function nflPicture(){
  const my=S.myTeam, f=SEA.seedsNow();
  return Object.keys(f).map(sd=>`<div class="grouphead">${sd}</div>`+f[sd].map((t,i)=>
    `<div class="frow ${t===my?'mine':''}"><span class="sd">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${TL(t)}</div>
      <div class="fnote">${i<4?"Leads the "+esc(LEAGUE.conf.names[CONF[t]]):"Wild card"}</div></div>
      <span class="fcfp">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span>
      ${i===0?'<span class="byebadge">Bye</span>':''}</div>`).join("")+(()=>{
      const out=NAMES.filter(t=>SEA.sideOf(t)===sd&&f[sd].indexOf(t)<0).sort((a,b)=>SEA._tb(a,b)).slice(0,3);
      return `<div class="note">In the hunt: ${out.map(t=>esc(t)+" "+SEA.rec[t][0]+"-"+SEA.rec[t][1]).join(", ")}.</div>`})()).join("");
}
function nflRankingView(){
  const bar=`<div class="dateline"><h2>Rankings</h2><span>${SEA.year}</span></div>
    <div class="subtabs">${[["power","Power ranking"],["picture","Playoff picture"]].map(([k,l])=>
    `<button class="subtab" data-k="${k}" aria-pressed="${nflRankTab===k}">${l}</button>`).join("")}</div>`;
  return bar+(nflRankTab==="picture"?nflPicture():nflPower());
}
function nflBracket(){
  const my=S.myTeam;
  let h=`<div class="dateline"><h2>Playoffs</h2><span>${SEA.year}</span></div>`;
  SEA._seed();
  const R=[["Super Bowl",SEA.rounds.sb],["Conference championships",SEA.rounds.conf],
           ["Divisional round",SEA.rounds.div],["Wild card round",SEA.rounds.wc]];
  R.forEach(([nm,gs])=>{if(gs.length){h+=`<div class="grouphead">${nm}</div>`+gs.map(g=>gameLine(g,g.home===my||g.away===my)).join("")}});
  const nx=SEA.phase!=="done"?SEA._pairs(SEA.roundOfPhase(SEA.phase)):[];
  if(nx.length)h+=`<div class="grouphead">Next &middot; ${esc(SEA.buttonLabel().replace(/^Play (the )?/,""))}</div>`+
    nx.map(([hm,aw,n,l])=>`<div class="frow ${hm===my||aw===my?'mine':''}"><div class="fmain">
      <div class="fname">(${SEA.seeds[aw]}) ${TL(aw)} <span class="vs">${n?"vs":"at"}</span> (${SEA.seeds[hm]}) ${TL(hm)}</div>
      <div class="fnote">${esc(l)}</div></div></div>`).join("");
  h+=`<div class="grouphead">The field</div>`+Object.keys(SEA.side).map(sd=>
    `<div class="note"><b>${sd}:</b> ${SEA.side[sd].map((t,i)=>(i+1)+". "+esc(t)).join(" &middot; ")}</div>`).join("");
  return h;
}
function nflStakes(x){
  const {my,opp,wk,left,w,l}=x, out=[];
  if(wk>=9){
    const f=SEA.seedsNow(), sd=SEA.sideOf(my), i=f[sd].indexOf(my);
    const lead=NAMES.filter(t=>CONF[t]===CONF[my]).sort((a,b)=>SEA._tb(a,b));
    if(i>=0&&i<4)out.push({p:88,tag:"DIVISION",l:`You lead the ${esc(LEAGUE.conf.names[CONF[my]])} with ${left} to play.${i===0?" Right now you'd have the bye.":""}`});
    else if(i>=4)out.push({p:84,tag:"WILD CARD",l:`You hold the No. ${i+1} seed. Every game from here moves you.`});
    else{
      const rest=NAMES.filter(t=>SEA.sideOf(t)===sd&&f[sd].indexOf(t)<0).sort((a,b)=>SEA._tb(a,b));
      const k=rest.indexOf(my);
      if(k>=0&&k<3)out.push({p:86,tag:"BUBBLE",l:`${k===0?"First team out":"Number "+(k+1)+" out"} of the playoff picture. You need this one.`});
    }
    if(CONF[opp]===CONF[my]&&lead[0]!==my&&lead.slice(0,2).indexOf(opp)>=0)
      out.push({p:82,tag:"DIVISION GAME",l:`${esc(opp)} is ahead of you in the division. This one counts twice.`});
  }
  if(w===8&&left<=6)out.push({p:60,tag:"WINNING SEASON",l:`One more win guarantees a winning record.`});
  return out;
}
LEAGUE.ui={
  rankingTab:"Rankings",
  rankingView:nflRankingView,
  projectedField(){const f=SEA.seedsNow(); return f.AFC.concat(f.NFC)},
  postseasonView(){return SEA.phase!=="week"?nflBracket():null},
  afterAdvance(ph){},
  subtab(b){if(b.dataset.k){nflRankTab=b.dataset.k;return true}return false},
  stakes:nflStakes
};
