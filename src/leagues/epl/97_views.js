/* ============ views: English football ============ */
/* The tables, zones marked (the Premier League's Champions League places and
   the drop; the Championship's automatic promotion and play-offs), the
   play-off bracket, and the stakes line: the title race, the top four, the
   play-off race, the relegation scrap. */
let eplTab=null;
function zoneOf(d,pos){
  const R=DIVS[d];
  if(d==="PL")return pos<=5?"ucl":pos>=18?"down":"";
  if(pos<=R.up)return "up";
  if(R.po&&pos>=R.po[0]&&pos<=R.po[1])return "po";
  if(R.down&&pos>24-R.down)return "down";
  return "";
}
const ZONE_NOTE={ucl:"Champions League",down:"Relegation",up:"Promotion",po:"Play-offs"};
function eplTable(d){
  const my=S.myTeam, T=SEA.table(d);
  return `<div class="grouphead">${esc(LEAGUE.conf.names[d])}</div>`+T.map((t,i)=>{const z=zoneOf(d,i+1), G=SEA.gfga(t);
    return `<div class="frow ${t===my?'mine':''} zone-${z}"><span class="sd">${i+1}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${TL(t)}</div><div class="fnote">${z?ZONE_NOTE[z]:"&nbsp;"}</div></div>
      <span class="fcfp">${SEA.pts(t)} pts &middot; ${recStr(t)} &middot; ${G[0]-G[1]>=0?"+":""}${G[0]-G[1]}</span></div>`}).join("");
}
function eplRankingView(){
  const d=eplTab||CONF[S.myTeam];
  const tabs=`<div class="subtabs"><button class="subtab" data-et="CUP" aria-pressed="${d==="CUP"}">FA Cup</button>${DIV_ORDER.map(k=>`<button class="subtab" data-et="${k}" aria-pressed="${d===k}">${esc(LEAGUE.conf.names[k].replace("National League ","NL "))}</button>`).join("")}</div>`;
  if(d==="CUP")return `<div class="dateline"><h2>The FA Cup</h2><span>${SEA.year}</span></div>`+tabs+cupView();
  return `<div class="dateline"><h2>The table</h2><span>${SEA.year}</span></div>`+tabs+
    eplTable(d)+`<div class="note">Points, then goal difference, then goals scored.</div>`;
}
/* the FA Cup: where you stand, the latest round in full, the shocks before it */
function cupView(){
  const C=SEA.cup, my=S.myTeam; if(!C)return "";
  const tier=t=>DIVS[CONF[t]].tier, R=CUP_ROUNDS;
  const fate=cupFate(SEA,my);
  const enter=tier(my)<=2?"the third round":tier(my)<=4?"the first round":tier(my)===5?"the fourth qualifying round":"the third qualifying round";
  let h=`<div class="note">${fate?`<b>${esc(fate==="Winners"?"FA Cup winners.":fate+".")}</b>`
    :C.next!==undefined&&C.draws[C.next]&&C.draws[C.next].some(p=>p.indexOf(my)>=0)?`<b>Still in it:</b> ${esc(R[C.next].name)} next.`
    :`You enter in ${enter}.`} Ties are midweek; level after ninety minutes, extra time and penalties. Semi-finals and the final at Wembley.</div>`;
  if(C.winner)h+=`<div class="note"><b>${esc(C.winner)}</b> win the FA Cup${C.finalist?", beating "+esc(C.finalist)+" in the final":""}.</div>`;
  const row=(g,pair)=>{ const hm=g?g.home:pair[0], aw=g?g.away:pair[1], mine=hm===my||aw===my;
    const sc=g?`${g.hp}&ndash;${g.ap}${g.pens?" p":""}`:"v";
    const shock=g&&tier(g.winner)-tier(g.loser)>=2;
    return `<div class="frow ${mine?'mine':''}"><div class="fmain"><div class="fname">
      <span class="${g&&g.winner===hm?'cupw':''}">${TL(hm)}</span> <span class="cupsc">${sc}</span> <span class="${g&&g.winner===aw?'cupw':''}">${TL(aw)}</span></div>
      <div class="fnote">${esc(LEAGUE.conf.names[CONF[hm]])} v ${esc(LEAGUE.conf.names[CONF[aw]])}${shock?" &middot; <b>giant-killing</b>":""}</div></div></div>` };
  for(let i=R.length-1;i>=0;i--){
    const drawn=C.draws[i]; if(!drawn)continue;
    const played=C.played[i];
    const latest=i===C.next||(C.winner&&i===R.length-1);
    let list=drawn.map((p,j)=>row(played?played.find(x=>x.home===p[0]&&x.away===p[1]):null,p));
    if(!latest){ // earlier rounds: your tie and the shocks
      list=drawn.map((p,j)=>{ const g=played&&played.find(x=>x.home===p[0]&&x.away===p[1]);
        return (p.indexOf(my)>=0||(g&&tier(g.winner)-tier(g.loser)>=2))?row(g,p):"" }).filter(Boolean);
      if(!list.length)continue }
    h+=`<div class="grouphead">${esc(R[i].name.replace(/^./,c=>c.toUpperCase()))}${latest&&!played?" &middot; the draw":""}${!latest?" &middot; your tie and the shocks":""}</div>`+list.join("");
  }
  return h;
}
function eplBracket(){
  SEA._seed(); const d=eplTab&&DIVS[eplTab]&&DIVS[eplTab].po?eplTab:(DIVS[CONF[S.myTeam]].po?CONF[S.myTeam]:"CH");
  const P=SEA.po[d], R=P.rounds, S2=P.seeds, six=S2.length===6, sd=t=>SEA.seeds[t];
  const box=(g,a,b)=>g?bgame(g):bgame(null,a?{t:a,s:sd(a)}:null,b?{t:b,s:sd(b)}:null);
  const col=(t,items)=>`<div class="bcol"><div class="bhead">${t}</div><div class="bgames">${items.join("")}</div></div>`;
  let h=`<div class="subtabs">${DIV_ORDER.filter(k=>DIVS[k].po).map(k=>`<button class="subtab" data-et="${k}" aria-pressed="${d===k}">${esc(LEAGUE.conf.names[k].replace("National League ","NL "))}</button>`).join("")}</div>`;
  h+=`<div class="grouphead">${esc(LEAGUE.conf.names[d])} play-offs</div>`;
  if(P.winner)h+=`<div class="note"><b>${esc(P.winner)}</b> win the play-off final and go up.</div>`;
  const cols=[];
  if(six)cols.push(col("Eliminators",[box(R.po1[0],S2[2],S2[5]),box(R.po1[1],S2[3],S2[4])]));
  cols.push(col("Semi-finals",R.po2.length?R.po2.map(g=>bgame(g)):six?[box(null,S2[0],null),box(null,S2[1],null)]:[box(null,S2[0],S2[3]),box(null,S2[1],S2[2])]));
  cols.push(col("Final",[R.po3[0]?bgame(R.po3[0]):bgame(null)]));
  h+=`<div class="bracket">${cols.join("")}</div>`;
  h+=`<div class="note">Going up: ${esc(P.up.join(", ")||"to be decided")}.${P.down.length?" Going down: "+esc(P.down.join(", "))+".":""}</div>`;
  return h;
}
/* a bracket game box (the basketball one's shape) */
function bgame(g,top,bot){
  const slot=(t,s,pts,win)=>`<div class="bslot ${win?'bwin':''} ${t&&t===S.myTeam?'bmine':''}" style="--tc:${t?teamInk(t):'transparent'}">
    <span class="bseed">${s||""}</span><span class="bteam">${t?esc(t):'<span class="btbd">to be decided</span>'}</span><span class="bpts">${pts===undefined||pts===null?"":pts}</span></div>`;
  if(g)return `<div class="bgame">${slot(g.home,g.hseed,g.hp+(g.pens&&g.pens==="home"?"p":""),g.winner===g.home)}${slot(g.away,g.aseed,g.ap+(g.pens&&g.pens==="away"?"p":""),g.winner===g.away)}</div>`;
  return `<div class="bgame">${slot(top&&top.t,top&&top.s)}${slot(bot&&bot.t,bot&&bot.s)}</div>`;
}
function eplStakes(x){
  const {my,opp,wk,left}=x, out=[], d=CONF[my], T=SEA.table(d), pos=T.indexOf(my)+1, P=t=>SEA.pts(t);
  if(wk<10)return out;
  const R=DIVS[d];
  if(d==="PL"){
    if(pos<=2)out.push({p:90,tag:"TITLE RACE",l:`${pos===1?"Top of the table":"Second, "+(P(T[0])-P(my))+" behind "+esc(T[0])} with ${left} to play.`});
    else if(pos<=7)out.push({p:84,tag:"EUROPE",l:`${pos<=5?"In the Champions League places":"Chasing the top five"}: ${P(T[4])-P(my)>0?(P(T[4])-P(my))+" points off fifth":"fifth or better"}.`});
    const gap=P(my)-P(T[17]);
    if(pos>=15)out.push({p:92,tag:pos>=18?"IN THE DROP ZONE":"RELEGATION SCRAP",l:pos>=18?`${P(T[16])-P(my)} points from safety with ${left} to play.`:`${gap} point${gap===1?"":"s"} above the drop.`});
  } else {
    const pe=R.po[1], six=R.po[1]-R.po[0]===5;
    if(pos<=R.up)out.push({p:90,tag:"PROMOTION",l:`In the automatic places with ${left} to play.`});
    else if(pos<=pe)out.push({p:86,tag:"PLAY-OFFS",l:`In the play-off places. ${six&&pos<R.po[0]+2?"Straight to the semi-finals if it stays that way.":six?"An eliminator first.":"A semi-final if it stays that way."}`});
    else if(pos<=pe+4)out.push({p:80,tag:"PLAY-OFF RACE",l:`${P(T[pe-1])-P(my)} points off the play-offs.`});
    if(R.down&&pos>=24-R.down-2)out.push({p:92,tag:pos>24-R.down?"IN THE DROP ZONE":"RELEGATION SCRAP",l:pos>24-R.down?`${P(T[23-R.down])-P(my)} points from safety.`:`${P(my)-P(T[24-R.down])} points above the drop.`});
  }
  if(CONF[opp]===d&&Math.abs(T.indexOf(opp)+1-pos)<=2)out.push({p:82,tag:"SIX-POINTER",l:`${esc(opp)} are right beside you in the table. Three points for you, none for them.`});
  return out;
}
LEAGUE.ui={
  rankingTab:"Table",
  rankingView:eplRankingView,
  projectedField(){return []},
  postseasonView(){return SEA.phase!=="week"?eplBracket():null},
  afterAdvance(ph){},
  subtab(b){ if(b.dataset.et){eplTab=b.dataset.et;return true} return false },
  stakes:eplStakes,
  clinchTag:t=>"",
  standingsQualify:0
};
