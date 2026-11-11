/* ============ things to play for: objectives and achievements ============ */
/* Every season the board sets three objectives beyond the main target: beat
   your rival, a home record, finish above a named side, and in soccer a cup
   run. They are worked out from the season as it started (the schedule and
   the preseason ratings), so a reload or a hot seat gets the same ones.
   Each met is worth reputation, which is what job offers and job security
   run on. Achievements are a career's trophy cabinet: unlocked once, kept. */

/* ---- objectives ---- */
function preElo(t){ return (SEA.preseason&&SEA.preseason[t])||SEA.elo[t]||1500 }
function myLeagueGames(my){ return SEA.sched.filter(g=>!g.cup&&(g.home===my||g.away===my)) }
function seasonObjectives(my){
  if(!SEA||!my)return [];
  if(S.obj&&S.obj.year===SEA.year&&S.obj.team===my){
    // a save from before a schedule change: the home count follows the schedule as it is now
    S.obj.list.forEach(o=>{ if(o.k!=="home")return; const n=myLeagueGames(my).filter(g=>g.home===my&&!g.neutral).length;
      if(n&&o.of!==n){ o.of=n; o.n=Math.min(o.n,n); o.l=`Win ${o.n} of your ${n} home games` } });
    return S.obj.list;
  }
  const out=[], games=myLeagueGames(my);
  // a rival on the schedule
  const rg=games.find(g=>LEAGUE.rivals.name(my,g.home===my?g.away:g.home));
  // three or more meetings: the season series, not one win (Grokbot: "Beat Montreal" done after 1 of 4)
  if(rg){ const o=rg.home===my?rg.away:rg.home, n=games.filter(g=>g.home===o||g.away===o).length, need=Math.floor(n/2)+1;
    out.push(n>=3?{k:"rival",opp:o,n:n,need:need,l:`Win the season series against ${o} (${need} of ${n})`}:{k:"rival",opp:o,l:`Beat ${o}`}) }
  // a cup run, where there is a cup
  if(LEAGUE.cup&&SEA.cup&&LEAGUE.cup.objective)out.push(LEAGUE.cup.objective(my));   // soccer: the quarter-finals; the third round; the first round proper
  // finish above the side rated just above you in your group
  const grp=NAMES.filter(t=>CONF[t]===CONF[my]&&t!==my&&preElo(t)>preElo(my)).sort((a,b)=>preElo(a)-preElo(b));
  if(grp.length)out.push({k:"above",opp:grp[0],l:`Finish above ${grp[0]}`});
  else out.push({k:"top",l:`Finish top of the ${LEAGUE.conf.names[CONF[my]]||"group"}`});   // rated best in it: win it
  // a home record a little better than you'd expect
  const H=games.filter(g=>g.home===my&&!g.neutral);
  if(H.length>=3){ const hfa=LEAGUE.tuning.hfa||0;
    const p=H.reduce((s,g)=>s+1/(1+Math.pow(10,-(preElo(my)+hfa-preElo(g.away))/wpScale("balanced"))),0)/H.length;   // round 56: the engine's own scale (was 400 everywhere: baseball's 680 set 61% home targets for an 87-win club)
    // what you'd expect to win (a draw isn't a win: about a quarter of soccer games are drawn)
    const pw=LEAGUE.draws?p*0.74:p;
    const t=Math.max(1,Math.min(H.length,Math.round(H.length*Math.min(0.88,pw))));
    out.push({k:"home",n:t,of:H.length,l:`Win ${t} of your ${H.length} home games`}) }
  // a run of wins, when there's room for a third
  const n=games.length;
  // six over 82-84 games: five was met in 24 of 24 hockey seasons (an average side gets six about half the time)
  const sk=n<=13?3:n<=40?4:n<=60?5:6;
  out.push({k:"streak",n:sk,l:`Win ${sk} games in a row`});
  const list=out.slice(0,3);
  S.obj={year:SEA.year,team:my,list:list};
  return list;
}
/* how each objective stands: met, failed, or how it's going */
function objStatus(o,my){
  const played=[].concat(...SEA.weeks.slice(0,LEAGUE.weeks).map(w=>w.games)).filter(g=>!g.cup&&(g.home===my||g.away===my));
  const done=SEA.phase!=="week";
  if(o.k==="rival"){ const m=played.filter(g=>g.home===o.opp||g.away===o.opp);
    if(o.need){ const w=m.filter(g=>g.winner===my).length, l=m.length-w;
      if(w>=o.need)return {s:"met",t:`Won ${w} of ${m.length}`};
      if(l>o.n-o.need)return {s:"miss",t:`Lost ${l} of ${o.n}`};
      return {s:"on",t:`${w} of ${o.need} won, ${o.n-m.length} to play`} }
    if(m.some(g=>g.winner===my))return {s:"met",t:"Done"};
    const left=myLeagueGames(my).filter(g=>(g.home===o.opp||g.away===o.opp)&&g.week>=SEA.step).length;
    return left&&!done?{s:"on",t:`${left} meeting${left===1?"":"s"} to come`}:{s:"miss",t:"Missed"} }
  if(o.k==="cup"){ const C=SEA.cup; if(!C)return {s:"on",t:""};
    if(C.draws[o.round]&&C.draws[o.round].some(p=>p.indexOf(my)>=0))return {s:"met",t:"Done"};
    if(C.out[my]!==undefined&&C.out[my]<o.round)return {s:"miss",t:"Knocked out"};
    return {s:"on",t:"Still in it"} }
  if(o.k==="above"){ const pos=t=>LEAGUE.position?LEAGUE.position(t):standRank(t);
    const a=pos(my), b=pos(o.opp);
    if(done)return a<b?{s:"met",t:"Done"}:{s:"miss",t:"Missed"};
    // level on record (0-0 in week one sorts one of you first): say level, not behind (Grokbot)
    const rw=t=>SEA.rec&&SEA.rec[t]?SEA.rec[t][0]-SEA.rec[t][1]:0, lvl=rw(my)===rw(o.opp)&&!LEAGUE.position;
    return {s:"on",t:lvl?"Level with them now":a<b?"Ahead of them now":"Behind them now"} }
  if(o.k==="top"){ const pos=LEAGUE.position?LEAGUE.position(my):standRank(my);
    if(done)return pos===1?{s:"met",t:"Done"}:{s:"miss",t:"Missed"};
    return {s:"on",t:pos===1?"Top now":"Not top now"} }
  if(o.k==="streak"){ let best=0,cur=0; played.slice().sort((a,b)=>(a.week||0)-(b.week||0)).forEach(g=>{ if(g.winner===my){cur++;best=Math.max(best,cur)} else cur=0 });
    // played is in week order already: SEA.weeks
    if(best>=o.n)return {s:"met",t:`${best} in a row`};
    return done?{s:"miss",t:`Best run ${best}`}:{s:"on",t:`Best so far ${best}`} }
  if(o.k==="last"){ const G=myLeagueGames(my).filter(g=>g.week>=o.from);
    let w=0; for(let k=o.from;k<Math.min(SEA.weeks.length,LEAGUE.weeks);k++)(SEA.weeks[k].games||[]).forEach(x=>{ if(!x.cup&&(x.home===my||x.away===my)&&x.winner===my)w++ });
    const left=G.filter(g=>g.week>=SEA.step).length;
    if(w>=o.n)return {s:"met",t:`${w} won`};
    if(w+left<o.n||done)return {s:"miss",t:`${w} won, ${o.n} needed`};
    return {s:"on",t:`${w} won, ${left} to play`} }
  if(o.k==="home"){ const w=played.filter(g=>g.home===my&&!g.neutral&&g.winner===my).length;
    const left=myLeagueGames(my).filter(g=>g.home===my&&!g.neutral&&g.week>=SEA.step).length;
    if(w>=o.n)return {s:"met",t:`${w} won`};
    if(w+left<o.n||done)return {s:"miss",t:`${w} won, ${o.n} needed`};
    // the ones not won too: "13 won, 28 to play" of 44 read as arithmetic gone wrong (Muse, round 20)
    const pl=played.filter(g=>g.home===my&&!g.neutral).length-w;
    return {s:"on",t:`${w} won${pl?`, ${pl} not`:""}, ${left} to play`} }
  return {s:"on",t:""};
}
/* Re-aimed (round 45): an objective settled with a third of the season still to play, met or missed, leaves a
   stretch with nothing on it (a series won by November, a streak gone in week 3). The board sets one more, at most
   two a season: the side just above you in the table now, or so many wins from the games left (a little better than
   your rating says, as the home record is). Set the first time it's seen and kept, so a reload doesn't move it. */
const REAIM_ON=true, REAIM_MAX=2;
function reaimObjectives(my){
  if(!REAIM_ON||!SEA||SEA.phase!=="week"||!S.obj||S.obj.year!==SEA.year||S.obj.team!==my)return;
  const O=S.obj; O.extra=O.extra||[]; if(O.extra.length>=REAIM_MAX)return;
  const all=myLeagueGames(my), left=all.filter(g=>g.week>=SEA.step);
  if(left.length<Math.max(3,Math.ceil(all.length/3)))return;
  const settled=O.list.concat(O.extra).filter(o=>!o.re&&objStatus(o,my).s!=="on");
  settled.forEach(o=>{ if(O.extra.length>=REAIM_MAX)return; o.re=SEA.step;
    const used=O.list.concat(O.extra), pos=t=>LEAGUE.position?LEAGUE.position(t):standRank(t), mine=pos(my);
    const above=NAMES.filter(t=>CONF[t]===CONF[my]&&t!==my&&pos(t)===mine-1)[0];
    if(above&&!used.some(x=>(x.k==="above"&&x.opp===above)||x.k==="top"))O.extra.push({k:"above",opp:above,l:`Finish above ${above}`,re0:SEA.step});
    else if(!used.some(x=>x.k==="last")){ const hfa=LEAGUE.tuning.hfa||0, e=t=>SEA.elo[t]||1500;
      const p=left.reduce((s,g)=>{ const opp=g.home===my?g.away:g.home, h=g.home===my&&!g.neutral?hfa:g.away===my&&!g.neutral?-hfa:0; return s+1/(1+Math.pow(10,-(e(my)+h-e(opp))/wpScale("balanced"))) },0)/left.length;   // round 56: the engine's scale ("93 of your last 135")
      const pw=LEAGUE.draws?p*0.74:p, n=Math.max(1,Math.min(left.length,Math.round(left.length*Math.min(0.88,pw)+0.5)));
      O.extra.push({k:"last",from:SEA.step,n:n,of:left.length,l:`Win ${n} of your last ${left.length}`,re0:SEA.step}) } });
}
function objectivesAll(my){ const L=seasonObjectives(my); return S.obj&&S.obj.extra?L.concat(S.obj.extra):L }
/* what the next game means (round 45): an objective it could settle, and where a win or a loss leaves you */
function divThe(d){ const n=LEAGUE.conf.names[d]||"the group"; return /^(League |the )/.test(n)?n:"the "+n }   // "the Championship", "League One"
const MEANS_ON=true;
function meansStakes(ng,my){
  const out=[]; if(!MEANS_ON||!SEA||SEA.phase!=="week"||!ng||ng.cup)return out;
  const opp=ng.home===my?ng.away:ng.home;
  reaimObjectives(my);
  const games=[].concat(...SEA.weeks.slice(0,LEAGUE.weeks).map(w=>w.games)).filter(g=>!g.cup&&(g.home===my||g.away===my));
  let cur=0; games.forEach(g=>{ cur=g.winner===my?cur+1:0 });
  objectivesAll(my).forEach(o=>{ if(out.length||objStatus(o,my).s!=="on")return;
    if(o.k==="rival"&&o.opp===opp){ const w=games.filter(g=>(g.home===opp||g.away===opp)&&g.winner===my).length;
      out.push({p:97,tag:"THE BOARD",l:o.need?(w+1>=o.need?`Win and the season series against ${esc(opp)} is yours: one of the board's objectives.`:`Game ${games.filter(g=>g.home===opp||g.away===opp).length+1} of ${o.n} against ${esc(opp)}: the board wants the series.`):`The board wants this one: beat ${esc(opp)}.`}) }
    else if(o.k==="above"&&o.opp===opp)out.push({p:96,tag:"THE BOARD",l:`${esc(opp)}: the side the board wants you to finish above. ${objStatus(o,my).t}.`});
    else if(o.k==="streak"&&cur>0&&cur+1>=o.n)out.push({p:96,tag:"THE BOARD",l:`${cur} in a row. Win and it's ${o.n}: one of the board's objectives.`});
    else if(o.k==="home"&&ng.home===my&&!ng.neutral){ const w=games.filter(g=>g.home===my&&!g.neutral&&g.winner===my).length; if(w+1>=o.n)out.push({p:96,tag:"THE BOARD",l:`Win here and that's ${o.n} home wins: one of the board's objectives.`}) }
    else if(o.k==="last"){ const st=objStatus(o,my); const m=/^(\d+) won/.exec(st.t), w=m?+m[1]:0; if(w+1>=o.n)out.push({p:96,tag:"THE BOARD",l:`One more win and it's ${o.n} of your last ${o.of}: the board's re-aimed objective.`}) } });
  // the table: where a win or a defeat leaves you, by the table's own order (its tiebreaks included): the record
  // nudged for a moment and put back. The pros and soccer; college tables go by conference record.
  if(!LEAGUE.standingsCompare||NAMES.filter(t=>CONF[t]===CONF[my]).length<3)return out;
  const posNow=()=>LEAGUE.position&&LEAGUE.position(my)?LEAGUE.position(my):standRank(my);
  const R=(SEA.regRec&&SEA.regRec[my])||SEA.rec[my], at=d=>{ R[d]++; try{ return posNow() }finally{ R[d]-- } };
  const now=posNow(), win=at(0), loss=at(1), name=divThe(CONF[my]);
  const played=games.length;
  if(played>=3){
    if(win<now)out.push({p:62,tag:"THE TABLE",l:`A win takes you ${win===1?"top of":"to "+ordinal(win)+" in"} ${esc(name)}${win===1?"":` (${ordinal(now)} now)`}.`});
    else if(loss>now)out.push({p:55,tag:"THE TABLE",l:`${ordinal(now)} in ${esc(name)}. A defeat drops you to ${ordinal(loss)}.`});
  }
  return out;
}
/* where a team stands in its group, for leagues without a table: by win share, then rating */
function standRank(t){
  // the order the Standings screen shows (conference record first): win share overall
  // marked a team "top" that the table had second (Grokbot)
  try{ const st=SEA.standings(null), L=st&&st[CONF[t]]; if(L&&L.length){ const i=L.findIndex(r=>r.team===t); if(i>=0)return i+1 } }catch(e){}
  const grp=NAMES.filter(x=>CONF[x]===CONF[t]);
  const r=x=>{const R=SEA.rec[x]; return R[0]/Math.max(1,R[0]+R[1])};
  grp.sort((x,y)=>r(y)-r(x)||SEA.elo[y]-SEA.elo[x]);
  return grp.indexOf(t)+1;
}
function objectivesHTML(my){
  if(SEA.phase==="done"&&!S.obj)return "";
  reaimObjectives(my);
  const L=objectivesAll(my); if(!L.length)return "";
  const why=typeof seatWhyNow==="function"&&SEA.phase!=="done"?seatWhyNow():"";
  return `<div class="grouphead">The board's objectives</div><div class="objs">${why?`<div class="objnote hotwhy">${esc(why)}</div>`:""}${L.map(o=>{const st=objStatus(o,my);
    return `<div class="obj ${st.s}"><span class="objmark">${st.s==="met"?"&#10003;":st.s==="miss"?"&#10007;":"&#9675;"}</span>
      <span class="objl">${o.re0!==undefined?`<b class="objre">Re-aimed</b> `:""}${esc(o.l)}</span><span class="objt">${esc(st.t)}</span></div>`}).join("")}
    <div class="objnote">Each one met is worth reputation: the next job, and the board's patience.${L.some(o=>o.re0!==undefined)?" A re-aimed one counts in place of one missed.":""}</div></div>`;
}
/* at the end of the season: how many were met, and what it's worth */
const OBJ_REP=2.5;
// a re-aimed objective counts in place of one missed: the board still judges three (more would inflate reputation,
// which fades 6% a season: two more met a season would settle 40 points higher)
function objectivesMet(my,orig){ const L=seasonObjectives(my), n=(orig?L:objectivesAll(my)).filter(o=>objStatus(o,my).s==="met").length; return Math.min(L.length,n) }

/* ---- achievements ---- */
const ACH=[
  {id:"firstwin", l:"Off the mark",         d:"Win your first game"},
  {id:"giant",    l:"Giant-killer",          d:"Beat a side rated far above yours"},
  {id:"perfect",  l:"Every read right",      d:"Get every read right in a game with three or more (reads, not calls)", reads:true},
  {id:"reader",   l:"Reads the game",        d:"Get 70% of your reads right over a season (12 or more)", reads:true},
  {id:"board",    l:"The board's favourite", d:"Meet all three objectives in a season"},
  {id:"unbeaten", l:"Unbeaten",              d:"Go a whole regular season without losing"},
  {id:"champ",    l:"Champions",             d:"Win the title"},
  {id:"b2b",      l:"Back to back",          d:"Win the title two seasons running"},
  {id:"dynasty",  l:"Dynasty",               d:"Three titles in five seasons"},
  {id:"rebuild",  l:"From the ground up",    d:"Win the title with a side that started in the bottom half"},
  {id:"promoted", l:"Going up",              d:"Win promotion", soccer:true},
  {id:"cup",      l:"Cup winners",           d:"Win the FA Cup", soccer:true},
  {id:"century",  l:"Century",               d:"Win 100 games"},
  {id:"furniture",l:"Part of the furniture", d:"Ten seasons at one club"}
];
let newAch=[];                     // unlocked since the last screen: shown once
function achList(){ return ACH.filter(a=>(!a.soccer||!!LEAGUE.draws)&&(!a.reads||typeof readText==="function")) }
function unlock(id){ const C=S.career; C.ach=C.ach||{}; if(C.ach[id])return; C.ach[id]=SEA.year; newAch.push(id); if(typeof sfx==="function")sfx("ach") }
function checkAchievements(){
  if(!SEA||!S.myTeam||!S.career)return;
  const my=S.myTeam, C=S.career, have=C.ach||{};
  const games=[].concat(...SEA.weeks.map(w=>w.games)).filter(g=>g.home===my||g.away===my);
  if(!have.firstwin&&(C.w>0||games.some(g=>g.winner===my)))unlock("firstwin");
  if(!have.giant&&games.some(g=>g.winner===my&&preElo(g.winner===g.home?g.away:g.home)-preElo(my)>=150))unlock("giant");
  if(!have.perfect&&S.played){ const P=S.played; for(const k in P){ (P[k]||[]).forEach(p=>{ if(p.team===my&&p.reads&&p.reads.length>=3&&p.reads.every(x=>x.right))unlock("perfect") }) } }
  const Y=S.readTally&&S.readTally.yr&&S.readTally.yr[SEA.year];
  if(!have.reader&&Y&&Y.n>=12&&Y.right/Y.n>=0.7)unlock("reader");
  if(careerNow(C).w>=100)unlock("century");     // the career once: in the offseason the season is already banked (it unlocked at 62 wins: Muse)
  if(LEAGUE.draws&&LEAGUE.cup&&SEA.cup&&SEA.cup.winner===my)unlock("cup");
  if(SEA.phase==="done"){
    const rec=(SEA.regRec||SEA.rec)[my];
    if(rec&&rec[1]===0)unlock("unbeaten");
    if(objectivesMet(my,true)>=3)unlock("board");
    const res=SEA.seasonResult(my)||"";
    if(LEAGUE.draws&&/[Pp]romoted/.test(res))unlock("promoted");
    if(SEA.champion===my){ unlock("champ");
      const H=S.history||[], last=H[H.length-1];
      if(last&&last.year===SEA.year-1&&last.champion===last.team&&last.team===my)unlock("b2b");
      const recent=H.filter(h=>h.year>SEA.year-5&&h.champion===h.team).length;
      if(recent>=2)unlock("dynasty");
      const order=NAMES.slice().sort((a,b)=>preElo(b)-preElo(a));
      if(order.indexOf(my)>=order.length/2)unlock("rebuild") }
    const st=C.stops&&C.stops[C.stops.length-1];
    if(st&&st.team===my&&SEA.year-st.from+1>=10)unlock("furniture");
  }
}
function achToastHTML(){
  if(!newAch.length)return "";
  const L=newAch.map(id=>ACH.find(a=>a.id===id)).filter(Boolean); newAch=[];
  try{ sfx("win") }catch(e){}
  return `<div class="achtoast">${L.map(a=>`<div><span>&#9733;</span><b>${esc(a.l)}</b> ${esc(a.d)}</div>`).join("")}</div>`;
}
function cabinetHTML(){
  const have=(S.career&&S.career.ach)||{}, L=achList();
  const got=L.filter(a=>have[a.id]), not=L.filter(a=>!have[a.id]);
  return `<div class="grouphead">Trophy cabinet &middot; ${got.length} of ${L.length}</div><div class="cabinet">${
    got.concat(not).map(a=>`<div class="ach ${have[a.id]?'got':''}"><span class="achstar">${have[a.id]?"&#9733;":"&#9734;"}</span>
      <div><b>${esc(a.l)}</b><span>${esc(a.d)}${have[a.id]?" &middot; "+have[a.id]:""}</span></div></div>`).join("")}</div>`;
}
