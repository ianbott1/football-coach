/* ============ the FA Cup ============ */
/* The oldest cup in the world, every club in the game in it. Its shape is
   the real one, compressed: the non-league clubs (tiers 5 and 6) fight
   through two qualifying rounds; Leagues One and Two come in at the first
   round, the Premier League and the Championship at the third. Every round
   is an open draw (the first club out of the hat is at home), so a National
   League North side can draw a Premier League club. Ties are midweek, in the
   week of a league round: a club still in it plays twice that week. Level
   after ninety minutes: extra time, then penalties. The semi-finals and the
   final are at Wembley.
   A cup tie never touches a league record or a table (Season._resolve skips
   records for g.cup; the soccer table counts league games only). */
const CUP_ROUNDS=[
  {k:"q3", name:"third qualifying round", short:"Q3",  week:7},
  {k:"q4", name:"fourth qualifying round",short:"Q4",  week:10},
  {k:"r1", name:"first round",            short:"R1",  week:13},
  {k:"r2", name:"second round",           short:"R2",  week:17},
  {k:"r3", name:"third round",            short:"R3",  week:21},
  {k:"r4", name:"fourth round",           short:"R4",  week:25},
  {k:"r5", name:"fifth round",            short:"R5",  week:29},
  {k:"qf", name:"quarter-final",          short:"QF",  week:33},
  {k:"sf", name:"semi-final",             short:"SF",  week:38, neutral:true},
  {k:"f",  name:"final",                  short:"Final",week:45, neutral:true}
];
const CUP_WEEKS={}; CUP_ROUNDS.forEach((r,i)=>CUP_WEEKS[r.week]=i);
const cupTier=t=>DIVS[CONF[t]].tier;
/* who comes in at each round, and how many of the third qualifying round's
   clubs play (the rest have byes): the numbers make 32 qualifiers, 80 clubs
   in the first round and 64 in the third */
function cupEntrants(k){
  if(k==="q3")return NAMES.filter(t=>cupTier(t)===6);
  if(k==="q4")return NAMES.filter(t=>cupTier(t)===5);
  if(k==="r1")return NAMES.filter(t=>cupTier(t)===3||cupTier(t)===4);
  if(k==="r3")return NAMES.filter(t=>cupTier(t)<=2);
  return [];
}
function cupTitle(i){ return "FA Cup "+CUP_ROUNDS[i].name }
/* draw round i from these clubs into the schedule */
function cupDraw(sea,i,pool){
  const R=CUP_ROUNDS[i], C=sea.cup, rng=C.rng;
  let clubs=rng.shuffle(pool.slice()), byes=[];
  // the third qualifying round: 16 clubs play, 32 go straight through
  if(R.k==="q3"){ byes=clubs.slice(16); clubs=clubs.slice(0,16) }
  C.byes[i]=byes;
  const ties=[];
  for(let j=0;j+1<clubs.length;j+=2){
    const g={week:R.week, home:clubs[j], away:clubs[j+1], cup:true, round:i, conf:false,
      neutral:!!R.neutral, title:cupTitle(i)};
    if(R.neutral)g.site="Wembley";
    ties.push(g); sea.sched.push(g);
  }
  C.draws[i]=ties.map(g=>[g.home,g.away]);
  C.next=i;
}
const _eplInit=LEAGUE.post.init;
LEAGUE.post.init=function(sea){
  _eplInit(sea);
  // the cup draws use their own dice, so the league's results don't change
  // because a cup tie was drawn
  sea.cup={rng:new RNG((sea.year*104729+0xFAC)>>>0), draws:{}, byes:{}, out:{}, played:{}, winner:null, next:0, finalist:null};
  cupDraw(sea,0,cupEntrants("q3"));
};
LEAGUE.afterWeek=function(sea,w){
  const C=sea.cup; if(!C)return;
  const i=CUP_WEEKS[w]; if(i===undefined)return;
  const games=(sea.weeks[w]&&sea.weeks[w].games||[]).filter(g=>g.cup);
  C.played[i]=games;
  const win=[];
  games.forEach(g=>{ win.push(g.winner); C.out[g.loser]=i });
  if(i===CUP_ROUNDS.length-1){ C.winner=win[0]||null; C.finalist=games[0]?games[0].loser:null; return }
  const pool=win.concat(C.byes[i]||[]).concat(cupEntrants(CUP_ROUNDS[i+1].k));
  cupDraw(sea,i+1,pool);
};
/* where a club went out (or "winners"), for the history and the card */
function cupFate(sea,t){
  const C=sea&&sea.cup; if(!C)return null;
  if(C.winner===t)return "Winners";
  if(C.out[t]!==undefined)return C.out[t]===CUP_ROUNDS.length-1?"Runners-up":"Out in the "+CUP_ROUNDS[C.out[t]].name;
  return null;
}
/* the midweek date of a cup tie: three days after the league round's Saturday */
function cupDate(w){
  const d=LEAGUE.dates[w]||""; const m=d.split(" "), M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi=M.indexOf(m[0]); if(mi<0)return d;
  const dt=new Date(Date.UTC(mi>=7?2026:2027,mi,+m[1]+3)); return "Tue "+M[dt.getUTCMonth()]+" "+dt.getUTCDate();
}
/* the line on the next-up card: who they are, from where you stand */
function cupStake(my,opp,g){
  const d=cupTier(opp)-cupTier(my), R=CUP_ROUNDS[g.round];
  const lvl=n=>n===1?"a division":n+" divisions";
  if(R.k==="f")return "The final. The oldest trophy in the world.";
  if(R.k==="sf")return "A semi-final at Wembley. One more win and you're in the final.";
  if(d<=-2)return `${esc(opp)} are ${lvl(-d)} above you. This is what the cup is for.`;
  if(d===-1)return `${esc(opp)} are a division above you. Upsets happen every round.`;
  if(d>=2)return `${esc(opp)} are ${lvl(d)} below you, and this is their cup final. Don't be the story.`;
  if(d===1)return `${esc(opp)} are a division below you. A banana skin.`;
  return `A tie between equals.`;
}
LEAGUE.cup={rounds:CUP_ROUNDS, fate:cupFate, date:cupDate, weeks:CUP_WEEKS, stake:cupStake};
/* a trophy to celebrate the moment it's won, not at the end of the season */
LEAGUE.trophyNow=(sea,t)=>sea&&sea.cup&&sea.cup.winner===t?{key:"facup",line:"FA Cup winners"}:null;
/* the season card: a cup win, or a final */
LEAGUE.cardLine=(h,team)=>{ const c=h&&h.league&&h.league.cup; if(!c||!c.mine)return null;
  return c.mine==="Winners"?"FA CUP WINNERS":c.mine==="Runners-up"?"FA Cup finalists":null };
/* a cup week is two turns: the league round, then the cup ties (Season.advance) */
LEAGUE.splitCup=true;
