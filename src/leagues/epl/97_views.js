/* ============ views: English football ============ */
/* The tables, zones marked (the Premier League's Champions League places and
   the drop; the Championship's automatic promotion and play-offs), the
   play-off bracket, and the stakes line: the title race, the top four, the
   play-off race, the relegation scrap. */
let eplTab=null;
function zoneOf(d,pos){
  if(d==="PL")return pos<=5?"ucl":pos>=18?"down":"";
  return pos<=2?"up":pos<=8?"po":"";
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
  return `<div class="dateline"><h2>The table</h2><span>${SEA.year}</span></div>
    <div class="subtabs">${["PL","CH"].map(k=>`<button class="subtab" data-et="${k}" aria-pressed="${d===k}">${esc(LEAGUE.conf.names[k])}</button>`).join("")}</div>`+
    eplTable(d)+`<div class="note">Points, then goal difference, then goals scored.</div>`;
}
function eplBracket(){
  SEA._seed(); const R=SEA.rounds, S2=SEA.po.seeds||[];
  const box=(g,a,b,sa,sb)=>g?bgame(g):bgame(null,a?{t:a,s:sa}:null,b?{t:b,s:sb}:null);
  const col=(t,items)=>`<div class="bcol"><div class="bhead">${t}</div><div class="bgames">${items.join("")}</div></div>`;
  const e=[box(R.po1[0],S2[2],S2[5],5,8),box(R.po1[1],S2[3],S2[4],6,7)];
  const sf=R.po2.length?R.po2.map(g=>bgame(g)):[box(null,S2[0],null,3),box(null,S2[1],null,4)];
  const f=[R.po3[0]?bgame(R.po3[0]):bgame(null)];
  let h=`<div class="grouphead">Championship play-offs</div>`;
  if(SEA.po.winner)h+=`<div class="note"><b>${esc(SEA.po.winner)}</b> win the play-off final and go up.</div>`;
  h+=`<div class="bracket">${col("Eliminators",e)}${col("Semi-finals",sf)}${col("Final, Wembley",f)}</div>`;
  h+=`<div class="note">Going up: ${esc((SEA.po.up||[]).join(", "))}. Going down: ${esc((SEA.po.down||[]).join(", "))}.</div>`;
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
  if(d==="PL"){
    if(pos<=2)out.push({p:90,tag:"TITLE RACE",l:`${pos===1?"Top of the table":"Second, "+(P(T[0])-P(my))+" behind "+esc(T[0])} with ${left} to play.`});
    else if(pos<=7)out.push({p:84,tag:"EUROPE",l:`${pos<=5?"In the Champions League places":"Chasing the top five"}: ${P(T[4])-P(my)>0?(P(T[4])-P(my))+" points off fifth":"fifth or better"}.`});
    const gap=P(my)-P(T[17]);
    if(pos>=15)out.push({p:92,tag:pos>=18?"IN THE DROP ZONE":"RELEGATION SCRAP",l:pos>=18?`${P(T[16])-P(my)} points from safety with ${left} to play.`:`${gap} point${gap===1?"":"s"} above the drop.`});
  } else {
    if(pos<=2)out.push({p:90,tag:"PROMOTION",l:`In the automatic places with ${left} to play.`});
    else if(pos<=8)out.push({p:86,tag:"PLAY-OFFS",l:`${pos}th: in the play-off places. ${pos<=4?"Straight to the semi-finals if it stays that way.":"An eliminator first."}`});
    else if(pos<=12)out.push({p:80,tag:"PLAY-OFF RACE",l:`${P(T[7])-P(my)} points off eighth.`});
  }
  if(CONF[opp]===d&&Math.abs(T.indexOf(opp)+1-pos)<=2)out.push({p:82,tag:"SIX-POINTER",l:`${esc(opp)} are right beside you in the table. Three points for you, none for them.`});
  return out;
}
LEAGUE.ui={
  rankingTab:"Table",
  rankingView:eplRankingView,
  projectedField(){return SEA.table("CH").slice(2,8)},
  postseasonView(){return SEA.phase!=="week"?eplBracket():null},
  afterAdvance(ph){},
  subtab(b){ if(b.dataset.et){eplTab=b.dataset.et;return true} return false },
  stakes:eplStakes,
  clinchTag:t=>"",
  standingsQualify:0
};
