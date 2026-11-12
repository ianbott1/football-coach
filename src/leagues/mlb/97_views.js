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
  // the games, each by its winner and score (round 58: "no game scores, no dates": Muse)
  const G=(x.games||[]).filter(g=>g.winner).map((g,i)=>`<span>G${i+1} ${esc(shortT(g.winner))} ${Math.max(g.hp,g.ap)}-${Math.min(g.hp,g.ap)}</span>`).join("");
  return `<div class="bgame">${row(x.hi)}${row(x.lo)}${G?`<div class="bscores">${G}</div>`:""}</div>`;
}
function shortT(t){ return String(t) }
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
/* October on one screen (round 58: three tabs of series tallies read as "no bracket": Muse; Instinct called the same
   screen the best in the game): your road through it, then both leagues and the World Series together, every
   series with its games' scores. */
function nflBracket(){
  const my=S.myTeam, mine=SEA.mySeries(my), live=mine&&!mine.winner&&SEA.phase!=="done";
  let h="";
  if(SEA.champion)h+=`<div class="note"><b>${esc(SEA.champion)}</b> wins the World Series.</div>`;
  if(live&&!isHotSeat())h+=`<div class="note">${esc(ROUND_NAME[mine.round])}: ${(o=>`${esc(my)} ${mine.w[my]||0}, ${esc(o)} ${mine.w[o]||0}`)(mine.hi===my?mine.lo:mine.hi)}.
    <button class="subtab" data-simseries="1">Sim the series</button> <span class="fnote">It stops before a game that could end your season.</span></div>`;
  // your road
  const road=NBA_ROUNDS.map(r=>(SEA.series[r]||[]).find(x=>x.hi===my||x.lo===my)).filter(Boolean);
  if(SEA.seeds&&SEA.seeds[my]){ const bye=SEA.bracket&&SEA.bracket[SEA.sideOf(my)]&&SEA.bracket[SEA.sideOf(my)].bye.indexOf(my)>=0;
    h+=`<div class="grouphead">Your road &mdash; No. ${SEA.seeds[my]} seed</div><div class="oroad">${bye?`<div class="orow"><b>Wild Card</b> A bye: one of the two best division winners.</div>`:""}${road.map(x=>{
      const o=x.hi===my?x.lo:x.hi, a=x.w[my]||0, b=x.w[o]||0, st=x.winner?(x.winner===my?`won ${a}-${b}`:`lost ${b}-${a}`):a===b?`level ${a}-${b}`:a>b?`lead ${a}-${b}`:`trail ${b}-${a}`;
      const G=(x.games||[]).filter(g=>g.winner).map(g=>{ const w=g.winner===my, us=g.home===my?g.hp:g.ap, th=g.home===my?g.ap:g.hp; return `<span class="${w?"w":"l"}">${w?"W":"L"} ${us}-${th}</span>` }).join(" ");
      return `<div class="orow"><b>${esc(ROUND_NAME[x.round||NBA_ROUNDS.find(r=>(SEA.series[r]||[]).indexOf(x)>=0)])}</b> vs ${TL(o)}: ${st}${G?`<div class="og">${G}</div>`:""}</div>` }).join("")}</div>` }
  else if(SEA.phase!=="week")h+=`<div class="note">You missed the postseason. The bracket as it goes:</div>`;
  const sides=Object.keys(LEAGUE.conf.sides), full=n=>n==="AL"?"American League":n==="NL"?"National League":n;
  h+=`<div class="grouphead">${full(sides[0])}</div>${confBracket(sides[0])}
    <div class="grouphead">World Series</div><div class="bracket"><div class="bcol"><div class="bgames">${seriesBox((SEA.series.ws||[])[0])}</div></div></div>
    <div class="grouphead">${full(sides[1])}</div>${confBracket(sides[1])}`;
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
  raceCard:bsRaceCard,
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

/* September (round 57): the race, from mid-August (the last 45 days). Your division, games behind and the magic number (wins of
   yours plus losses of the second club that clinch it: 163 less your wins less their losses) or the elimination
   number; the wild-card race the same way against the fourth (or third) place; last night's scores for every club
   in it; and the day you clinch, said once. */
const RACE_FROM=45;   // from mid-August
function bsRaceCard(my){
  const sea=SEA; if(sea.step<LEAGUE.weeks-RACE_FROM||sea.step>=LEAGUE.weeks)return "";
  const R=sea.rec, W=t=>R[t][0], L=t=>R[t][1], G=LEAGUE.tuning.schedule&&LEAGUE.tuning.schedule.games||162, M=G+1;
  const gb=(a,b)=>((W(a)-W(b))+(L(b)-L(a)))/2, gbs=x=>x<=0?"&mdash;":(x%1?x.toFixed(1):x);
  const sd=sea.sideOf(my), teams=NAMES.filter(t=>sea.sideOf(t)===sd), ck=sea.clinch?sea.clinch():{};
  const div=teams.filter(t=>CONF[t]===CONF[my]).sort((a,b)=>sea._tb(a,b));
  const leaders={}; LEAGUE.conf.sides[sd].forEach(d=>{ leaders[teams.filter(t=>CONF[t]===d).sort((a,b)=>sea._tb(a,b))[0]]=true });
  const wc=teams.filter(t=>!leaders[t]).sort((a,b)=>sea._tb(a,b));
  // the number, said plainly
  let divNum="", wcNum="";
  if(ck[my]==="y")divNum="Division clinched.";
  else if(div[0]===my){ const m=Math.max(0,M-W(my)-L(div[1])); divNum=`Magic number <b>${m}</b>: any mix of your wins and ${esc(div[1])} losses adding to ${m} wins the division.` }
  else { const e=Math.max(0,M-W(div[0])-L(my)); divNum=e?`Elimination number <b>${e}</b> in the division: ${esc(div[0])} wins and your losses adding to ${e} end it.`:"Out of the division race." }
  if(!leaders[my]&&ck[my]!=="y"&&ck[my]!=="x"){ const i=wc.indexOf(my);
    if(i<3){ const m=Math.max(0,M-W(my)-L(wc[3])); wcNum=`Wild card: magic number <b>${m}</b> against ${esc(wc[3])}.` }
    else { const e=Math.max(0,M-W(wc[2])-L(my)); wcNum=e?`Wild card: ${gbs(gb(wc[2],my))} games out; elimination number <b>${e}</b> against ${esc(wc[2])}.`:"Out of the wild-card race." } }
  else if(ck[my]==="x")wcNum="A postseason place clinched.";
  // the day it happened, once
  const C=S.bsClinch&&S.bsClinch.year===sea.year?S.bsClinch:(S.bsClinch={year:sea.year});
  ["y","x"].forEach(k=>{ if((ck[my]===k||(k==="x"&&ck[my]==="y"))&&C[k]===undefined)C[k]=sea.step });
  const today=C.y===sea.step?`${esc(LEAGUE.conf.names[CONF[my]])} champions: clinched today.`:C.x===sea.step?"Into the postseason: clinched today.":"";
  const row=(t,ref,cut)=>`<tr class="${t===my?"me":""}${cut?" cut":""}"><td>${TL(t)}</td><td>${W(t)}-${L(t)}</td><td>${ref?gbs(gb(ref,t)):""}</td><td>${ck[t]?`<span class="ck">${ck[t]}</span>`:""}</td></tr>`;
  const divT=div.map(t=>row(t,div[0])).join("");
  const showWC=wc.slice(0,Math.max(5,wc.indexOf(my)+1)), wcT=showWC.map((t,i)=>row(t,i<3?null:wc[2],i===3)).join("");
  // last night, for every club in either race
  const inRace=new Set(div.concat(showWC)), lastW=sea.weeks[sea.step-1], sc=[];
  ((lastW&&lastW.games)||[]).forEach(g=>{ if(!inRace.has(g.home)&&!inRace.has(g.away))return; const hw=g.hp>g.ap;
    sc.push(`<span class="${g.home===my||g.away===my?"me":""}">${esc(hw?g.home:g.away)} ${Math.max(g.hp,g.ap)}, ${esc(hw?g.away:g.home)} ${Math.min(g.hp,g.ap)}</span>`) });
  const left=sea.sched.filter(g=>g.week>=sea.step&&(g.home===my||g.away===my)).length;
  return `<div class="grouphead">The race &mdash; ${left} game${left===1?"":"s"} left</div>
    <div class="racecard">${today?`<div class="clinched">${today}</div>`:""}
      <div class="rnum">${divNum}${wcNum?"<br>"+wcNum:""}</div>
      <div class="rtabs"><table class="rt"><tr><th>${esc(LEAGUE.conf.names[CONF[my]])}</th><th>W-L</th><th>GB</th><th></th></tr>${divT}</table>
      <table class="rt"><tr><th>${esc(sd)} wild card</th><th>W-L</th><th>GB</th><th></th></tr>${wcT}</table></div>
      ${sc.length?`<div class="rscore"><b>Last night:</b> ${sc.join(" &middot; ")}</div>`:""}</div>`;
}
