/* ============ rivalries: pro football ============ */
/* No named trophy games; a division rival is the rivalry. Series are kept
   across seasons for every pair of division rivals. */
const nflDivRival=(a,b)=>a!==b&&CONF[a]&&CONF[a]===CONF[b];
/* no game is billed as a named rivalry; the series is still kept */
function nflRivalName(a,b){return null}
const NFL_RIVAL_OF={};
NAMES.forEach(t=>{NFL_RIVAL_OF[t]=NAMES.filter(o=>o!==t&&CONF[o]===CONF[t]).map(o=>({o:o,n:LEAGUE.conf.names[CONF[t]]}))});
function nflSeriesKey(a,b){return [a,b].sort().join("~")}
function nflRecordSeries(u,season){
  u.series=u.series||{};
  const all=[].concat(...season.weeks.map(w=>w.games),...season.postPools());
  all.forEach(g=>{
    if(!nflDivRival(g.home,g.away))return; const nm=LEAGUE.conf.names[CONF[g.home]];
    const k=nflSeriesKey(g.home,g.away);
    const s=u.series[k]||(u.series[k]={n:nm,w:{},streak:null,games:[]});
    s.w[g.winner]=(s.w[g.winner]||0)+1;
    if(s.streak&&s.streak.t===g.winner)s.streak.n++; else s.streak={t:g.winner,n:1};
    s.games.push({y:season.year,w:g.winner,l:g.loser,s:Math.max(g.hp,g.ap)+"-"+Math.min(g.hp,g.ap)});
    if(s.games.length>25)s.games.shift();
  });
}
function nflSeriesFor(u,a,b){
  if(!u||!u.series)return null;
  const s=u.series[nflSeriesKey(a,b)]; if(!s)return null;
  return {name:s.n,w:s.w[a]||0,l:s.w[b]||0,
          streak:s.streak?{team:s.streak.t,n:s.streak.n}:null,games:s.games.slice().reverse()};
}
LEAGUE.rivals={name:nflRivalName, series:nflSeriesFor, record:nflRecordSeries, of:NFL_RIVAL_OF};
