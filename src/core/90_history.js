/* ============ the history book ============ */
/* One entry per coach per season. Version 2 is league-neutral: everything the
   core reads has a name that means the same thing in any league, and what
   only one league understands lives under entry.league, written and read by
   that league alone.

   {v:2, year, team, rec:"w-l", rank, result, grade, gradeLine,
    champion,                          league champion that year
    honours:{title, group, seed},      won it all / won your group / playoff seed
    group:{key, name, rec},            conference or division, and record in it
    bestWin:{opp, rank, score}|null,
    coach:{name, titles, seasons},
    -- written at the end of the season, absent from a hot-seat coach's
       early entry (written before the world moves on):
    miles, exp, program,
    teams:{team:[w,l,rank]}, top10, groupChamps:{group:team},
    seeds:{team:seed}, post:{team:[w,l]}, pnote:{team:line},
    awards:{mvp:[{n,p,t,r,c,line}], team:{group, list:[{pos,team,n,r,c}]}},
    coaching:{fired, firedList, nFired, hires, poached, coordMoves, coachNow},
    league:{id, ...}}                  e.g. cfb: bowls, draft, classes, early, realigned
*/
const HISTORY_V=2;

/* The part of an entry every coach gets, whenever it is written. */
function seasonEntry(my){
  const rk=SEA.poll.rankMap();
  const result=SEA.seasonResult(my);
  const exp=S.expNow||expectations();
  const gr=seasonGrade(SEA.rec[my][0],SEA.rec[my][1],result,exp);
  const myGames=[].concat(...SEA.weeks.map(w=>w.games)).filter(g=>g.home===my||g.away===my);
  const bestWin=myGames.filter(g=>g.winner===my)
    .sort((x,y)=>(x.home===my?(x.arank||999):(x.hrank||999))-(y.home===my?(y.arank||999):(y.hrank||999)))[0];
  const bwOpp=bestWin?(bestWin.home===my?bestWin.away:bestWin.home):null;
  // a league with a table has no rankings to quote: positions instead
  const POS=!!LEAGUE.position;
  const bwRank=bestWin&&!POS?(bestWin.home===my?bestWin.arank:bestWin.hrank):null;
  const hon=SEA.honours(my), seeds=SEA.postRecord().cfpOf;
  return Object.assign({v:HISTORY_V, year:SEA.year, team:my,
    rec:recStr(my), rank:POS?null:rk[my],
    result:result, grade:gr.g, gradeLine:gr.l, miss:!!gr.miss,
    champion:SEA.champion,
    honours:{title:SEA.champion===my, group:hon.conf, seed:seeds[my]||null},
    group:{key:CONF[my], name:LEAGUE.conf.names[CONF[my]]||"",
           rec:POS?recStr(my):SEA.confrec[my][0]+"-"+SEA.confrec[my][1]},
    bestWin: bwOpp?{opp:bwOpp,rank:bwRank||null,
      score:(bestWin.home===my?bestWin.hp+"-"+bestWin.ap:bestWin.ap+"-"+bestWin.hp)}:null,
    coach:{name:S.career.name, titles:S.career.titles, seasons:S.history.length+1}},
    POS?{pos:LEAGUE.position(my)}:{});
}

/* ---- old saves ---- */
/* Version 1 entries (no v) are migrated when a save is loaded. They didn't
   record the team for the end-of-season entry, so it comes from the coach's
   career stops. */
function teamInYear(career,year,fallback){
  const st=(career&&career.stops||[]).find(s=>s.from<=year&&(s.to===undefined||s.to>=year));
  return st?st.team:fallback;
}
function migrateEntry(h,career,fallback){
  if(!h||h.v>=2)return h;
  const c=h.card||{}, team=h.team||teamInYear(career,h.year,fallback);
  const keyOf=name=>Object.keys(LEAGUE.conf.names).find(k=>LEAGUE.conf.names[k]===name)||null;
  const out={v:2, year:h.year, team:team, rec:h.rec, rank:h.rank, result:h.result,
    grade:h.grade, gradeLine:h.gradeLine, champion:h.champion,
    miss:/Short of the mark|A bad year/.test(h.gradeLine||""),
    honours:{title:h.champion===team, group:!!h.confChamp, seed:(h.cfp&&h.cfp[team])||null},
    group:{key:(h.allconf&&h.allconf.conf)||keyOf(c.conf), name:c.conf||"", rec:c.confRec||""},
    bestWin:c.bestWin||null,
    coach:{name:c.coach, titles:c.titles, seasons:c.seasons}};
  if(h.miles)out.miles=h.miles;
  if(h.exp!==undefined)out.exp=h.exp;
  if(h.program!==undefined)out.program=h.program;
  if(h.teams){
    out.teams=h.teams; out.top10=h.top10||[];
    out.groupChamps=h.confChamps||{}; out.seeds=h.cfp||{};
    // the oldest saves have bowls but no postseason tally or notes
    let post=h.post, pnote=h.pnote;
    if(!post&&h.bowls){post={};Object.keys(h.bowls).forEach(t=>{post[t]=h.bowls[t][0]==="W"?[1,0]:[0,1]})}
    if(!pnote&&h.bowls){pnote={};Object.keys(h.bowls).forEach(t=>{
      pnote[t]=(h.bowls[t][0]==="W"?"Won the ":"Lost the ")+h.bowls[t][1]})}
    out.post=post||{}; out.pnote=pnote||{};
    out.awards={mvp:h.heis||[],
      team:h.allconf?{group:h.allconf.conf,list:h.allconf.list||[]}:null};
    out.coaching={fired:!!h.fired, firedList:h.firedList||[], nFired:h.nFired||0,
      hires:h.hires||[], poached:h.poached||[], coordMoves:h.coordMoves||[],
      coachNow:h.coachNow||null};
    out.league=LEAGUE.migrateHistory?LEAGUE.migrateHistory(h):{id:LEAGUE.id};
  }
  return out;
}
function migrateSave(d){
  if(!d)return d;
  if(d.history)d.history=d.history.map(h=>migrateEntry(h,d.career,d.myTeam));
  (d.coaches||[]).forEach(c=>{
    if(c.history)c.history=c.history.map(h=>migrateEntry(h,c.career,c.myTeam))});
  [d].concat(d.coaches||[]).forEach(c=>(c&&c.history||[]).forEach(backfillDraws));
  // in the offseason the career already holds the finished season, which isn't in the history yet
  const extra=!d.off?0:(d.seasonNow&&d.seasonNow.banked&&d.seasonNow.d!==undefined)?d.seasonNow.d:null;
  if(extra!==null)[d].concat(d.off?[]:(d.coaches||[])).forEach(c=>{ if(c&&c.career&&c.history)careerDraws(c.career,c.history,c.myTeam,c===d?extra:0) });
  return d;
}
/* soccer: a career and its coaching stops that began before draws were kept
   counted none (a stop read 54-0-48 against a true 54-36-48: Muse, three
   rounds). Recounted from the seasons themselves, which do keep them. */
function careerDraws(C,H,fallback,extra){
  if(!LEAGUE.draws||!C.stops)return;
  const rows=H.map(h=>{ const t=h.team||fallback, r=h.teams&&h.teams[t]; return r&&r[3]!==undefined?{y:h.year,t:t,d:r[3]}:null });
  if(rows.some(x=>!x))return;                          // a season without draws: leave the counts as they are
  C.stops.forEach((st,i)=>{ st.d=rows.filter(x=>x.t===st.team&&x.y>=st.from&&(st.to===undefined||x.y<=st.to)).reduce((a,x)=>a+x.d,0)+(i===C.stops.length-1?extra||0:0) });
  C.d=rows.reduce((a,x)=>a+x.d,0)+(extra||0);
}
/* soccer seasons saved before Nov 2026 kept wins and losses but not draws, so
   a club's all-time record counted only the newer seasons' draws (Muse). A
   season's games are fixed by the division, so the draws are what's left. */
function backfillDraws(h){
  const res=h&&h.league&&h.league.res;
  if(!LEAGUE.draws||!LEAGUE.seasonGames||!h||!h.teams||!res)return;
  Object.keys(h.teams).forEach(t=>{ const r=h.teams[t];
    if(r&&r.length===3&&res[t])r.push(Math.max(0,LEAGUE.seasonGames(res[t])-r[0]-r[1])) });
}
