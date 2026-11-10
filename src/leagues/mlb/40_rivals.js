/* ============ rivalries: pro hockey ============ */
/* Every division rival is a rivalry and the series is kept across seasons;
   a few of the oldest have names. */
const nflDivRival=(a,b)=>a!==b&&CONF[a]&&CONF[a]===CONF[b];
const NHL_NAMED={"Calgary~Edmonton":"The Battle of Alberta","Boston~Montreal":"Bruins-Canadiens",
  "Montreal~Toronto":"Leafs-Habs","Philadelphia~Pittsburgh":"The Battle of Pennsylvania",
  "NY Islanders~NY Rangers":"The Battle of New York","Los Angeles~Anaheim":"The Freeway Faceoff",
  "Anaheim~Los Angeles":"The Freeway Faceoff"};
function nflRivalName(a,b){return NHL_NAMED[[a,b].sort().join("~")]||null}
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
