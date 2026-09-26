/* ============ rivalries: college basketball ============ */
/* [team, team, name, week when it's a non-conference game (pinned into the
   schedule so it happens every year)] */
const RIVALS=[
["Duke","North Carolina","the Tobacco Road rivalry"],
["Kentucky","Louisville","the Battle for the Bluegrass",8],
["Kansas","Kansas State","the Sunflower Showdown"],
["Kansas","Missouri","the Border War",9],
["Indiana","Purdue","the Indiana-Purdue rivalry"],
["Michigan","Michigan State","the Michigan-Michigan State rivalry"],
["UCLA","USC","the Crosstown rivalry"],
["Arizona","Arizona State","the Duel in the Desert"],
["Cincinnati","Xavier","the Crosstown Shootout",7],
["Villanova","Saint Joseph's","the Holy War",6],
["Illinois","Missouri","Braggin' Rights",10],
["Gonzaga","Saint Mary's","the West Coast rivalry",5],
["Syracuse","Georgetown","the Syracuse-Georgetown rivalry",9],
["Oklahoma","Oklahoma State","Bedlam",4],
["Alabama","Auburn","the Iron Bowl of basketball"],
["Texas","Texas A&M","the Lone Star Showdown"],
["Utah","BYU","the Holy War of the West"],
["Memphis","Tennessee","the Memphis-Tennessee rivalry",3],
["Marquette","Wisconsin","the I-94 rivalry",2],
["Iowa","Iowa State","the Cy-Hawk series",1],
["Virginia","Virginia Tech","the Commonwealth Clash"],
["Florida","Kentucky","the Florida-Kentucky rivalry"],
["Penn","Princeton","the Ivy's oldest rivalry"],
["San Diego State","UNLV","the Mountain West rivalry",3]
].filter(r=>NAMES.indexOf(r[0])>=0&&NAMES.indexOf(r[1])>=0);
const RIVAL_OF={};
RIVALS.forEach(([a,b,n])=>{(RIVAL_OF[a]=RIVAL_OF[a]||[]).push({o:b,n:n});(RIVAL_OF[b]=RIVAL_OF[b]||[]).push({o:a,n:n})});
function rivalryName(a,b){const hit=(RIVAL_OF[a]||[]).find(x=>x.o===b); return hit?hit.n:null}
function seriesKey(a,b){return [a,b].sort().join("~")}
function recordRivalries(u,season){
  u.series=u.series||{};
  const all=[].concat(...season.weeks.map(w=>w.games),...(season.postPools?season.postPools():[]));
  const seen=new Set();
  all.forEach(g=>{
    if(!g||seen.has(g))return; seen.add(g);
    const nm=rivalryName(g.home,g.away); if(!nm)return;
    const k=seriesKey(g.home,g.away);
    const s=u.series[k]||(u.series[k]={n:nm,w:{},streak:null,games:[]});
    s.w[g.winner]=(s.w[g.winner]||0)+1;
    if(s.streak&&s.streak.t===g.winner)s.streak.n++; else s.streak={t:g.winner,n:1};
    s.games.push({y:season.year,w:g.winner,l:g.loser,s:Math.max(g.hp,g.ap)+"-"+Math.min(g.hp,g.ap)});
    if(s.games.length>25)s.games.shift();
  });
}
function seriesFor(u,a,b){
  if(!u||!u.series)return null;
  const s=u.series[seriesKey(a,b)]; if(!s)return null;
  return {name:s.n,w:s.w[a]||0,l:s.w[b]||0,streak:s.streak?{team:s.streak.t,n:s.streak.n}:null,games:s.games.slice().reverse()};
}
LEAGUE.rivals={name:rivalryName, series:seriesFor, record:recordRivalries, of:RIVAL_OF};
