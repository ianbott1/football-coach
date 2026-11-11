/* ============ league: pro baseball ============ */
/* Thirty clubs, named by city (two cities have two), in two leagues of three divisions. Players are fictional. The
   structure is the real league's: the balanced 162-game schedule, a twelve-team postseason (three division winners
   and three wild cards a league; the top two division winners sit out a best-of-three wild-card round, then a
   best-of-five, a best-of-seven pennant and the World Series), a draft with a lottery, and payrolls (a soft limit: the
   real luxury-tax line for 2026, $244 million). */
const MLB_DATES=(()=>{const out=[], d=new Date(Date.UTC(2026,2,26));       // March 26 to September 27
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for(let i=0;i<186;i++){out.push(M[d.getUTCMonth()]+" "+d.getUTCDate()); d.setUTCDate(d.getUTCDate()+1)}
  return out})();
const MLB_K=+((typeof process!=="undefined"&&process.env&&process.env.MLB_K)||1.0);
const MLB_SPREAD=list=>list.map(([n,e,d])=>[n,Math.round(1500+(e-1500)*MLB_K),d]);
const LEAGUE={
  id:"mlb",
  rankAll:true,
  name:"Pro Baseball",
  /* [team, starting strength (a prior, not standings), division] */
  teams:MLB_SPREAD([
["Baltimore",1480,"ALE"],["Boston",1530,"ALE"],["NY Yankees",1550,"ALE"],["Tampa Bay",1495,"ALE"],["Toronto",1550,"ALE"],
["Chicago White Sox",1440,"ALC"],["Cleveland",1520,"ALC"],["Detroit",1530,"ALC"],["Kansas City",1510,"ALC"],["Minnesota",1475,"ALC"],
["Houston",1525,"ALW"],["LA Angels",1470,"ALW"],["Sacramento",1475,"ALW"],["Seattle",1545,"ALW"],["Texas",1510,"ALW"],
["Atlanta",1495,"NLE"],["Miami",1480,"NLE"],["NY Mets",1525,"NLE"],["Philadelphia",1555,"NLE"],["Washington",1450,"NLE"],
["Chicago Cubs",1540,"NLC"],["Cincinnati",1515,"NLC"],["Milwaukee",1560,"NLC"],["Pittsburgh",1470,"NLC"],["St. Louis",1490,"NLC"],
["Arizona",1505,"NLW"],["Colorado",1400,"NLW"],["LA Dodgers",1565,"NLW"],["San Diego",1540,"NLW"],["San Francisco",1500,"NLW"]
  ]),
  colors:{"Baltimore":"#DF4601","Boston":"#BD3039","NY Yankees":"#0C2340","Tampa Bay":"#092C5C","Toronto":"#134A8E",
    "Chicago White Sox":"#27251F","Cleveland":"#E31937","Detroit":"#0C2340","Kansas City":"#004687","Minnesota":"#002B5C",
    "Houston":"#EB6E1F","LA Angels":"#BA0021","Sacramento":"#003831","Seattle":"#005C5C","Texas":"#003278",
    "Atlanta":"#CE1141","Miami":"#00A3E0","NY Mets":"#FF5910","Philadelphia":"#E81828","Washington":"#AB0003",
    "Chicago Cubs":"#0E3386","Cincinnati":"#C6011F","Milwaukee":"#FFC52F","Pittsburgh":"#FDB827","St. Louis":"#C41E3A",
    "Arizona":"#A71930","Colorado":"#33006F","LA Dodgers":"#005A9C","San Diego":"#FFC425","San Francisco":"#FD5A1E"},
  conf:{
    names:{ALE:"AL East",ALC:"AL Central",ALW:"AL West",NLE:"NL East",NLC:"NL Central",NLW:"NL West"},
    order:["ALE","ALC","ALW","NLE","NLC","NLW"],
    display:["ALE","ALC","ALW","NLE","NLC","NLW"],
    autoBidPool:[],
    divisions:{},
    sides:{AL:["ALE","ALC","ALW"], NL:["NLE","NLC","NLW"]}
  },
  weeks:186,                                 // every calendar day, March 26 to September 27 (162 games each)
  skipIdle:true,
  dates:MLB_DATES,
  classes:[],
  classTag:c=>"Age "+c,
  bowls:[],
  draftTeams:["Vanderbilt","LSU","Florida","Texas A&M","Wake Forest","Arkansas","Stanford","Oregon State","IMG Academy",
    "Corona HS","Mater Dei","Georgia Tech","UCLA","Tennessee","Clemson","Virginia"],
  awards:{mvp:"Most Valuable Player", weights:{C:1,"1B":1,"2B":1,"3B":1,SS:1,LF:1,CF:1,RF:1,DH:1,SP:1,SP2:1,SP3:1,CL:1},
    premium:{C:1.04,"1B":0.98,"2B":1.02,"3B":1.02,SS:1.05,LF:0.98,CF:1.04,RF:1,DH:0.9,SP:0.85,SP2:0.8,SP3:0.78,CL:0.55}},
  tuning:{wpK:{safe:650,balanced:680,aggressive:720},   /* the engine's own win chance per rating gap (p=1/(1+10^(-gap/k))): gap 50 wins 53.9%, 100 wins 59.1% */
    hfa:40, gapScale:1, pFloor:1250, pCeil:1800, talentSteps:12},
  venues:{"Colorado":6,"Boston":2,"Cincinnati":1,"Sacramento":1,"San Francisco":-2,"Seattle":-2,"San Diego":-1},
  schedule:{games:162},
  playoff:{size:12, perSide:6, byes:2},
  /* the baby owl, suited up: a cap's brim and a jersey number */
  art:{owlExtra:`
      <path d="M20 15.6 C25 11.4 31 10 36 10 C41 10 47 11.4 52 15.6 L52 17.4 C46 15.2 41 14.4 36 14.4 C31 14.4 26 15.2 20 17.4 Z" fill="#1C3F7A"/>
      <path d="M44 16 C49 15.6 54 16.4 57 18.2 C53 18.4 48 18.2 44 17.6 Z" fill="#1C3F7A"/>
      <text x="36" y="49.5" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="8.5" fill="#F4F1EA">27</text>`},
  seatSpread:30,
  recText(t,sea,r){ const [w,l]=r||(sea.regRec||sea.rec)[t]; return `${w}-${l}` },   // the regular season's record: postseason games don't count
  stepLabel:w=>`Day ${w+1}`,                  // a calendar day, not your game number
  daily:true,                                 // a step is a day: Scores is headed by the date
  myGameLabel:n=>`Game ${n}`,
  bigTop:5,
  rankTop:10,
  text:{groupWord:"DIVISION",unit:"team",bye:"No game today",lostFinal:"beaten in the World Series",offWord:"winter",outOf:"out of the postseason",
    rankedWin:["A win over one of the league's best. That tells you something.","Took one from a contender. That's a statement.","A real team, and you beat them."],
    badLoss:["The kind of loss that decides the last wild card.","Beaten by a club going nowhere. It will cost you in September.","Games like this one decide divisions."],
    champions:"World Series champions",
    org:"Franchise", orgs:"teams", group:"Division", rank:"Power rank",
    groupShort:"Div",
    standingsNote:`<div class="note">Record W-L, then games behind the division leader. The three division winners in each league
      make the postseason, plus three wild cards: the best two division winners skip the wild-card round.
      <b>y</b> clinched the division &middot; <b>x</b> clinched a place &middot; <b>e</b> eliminated.</div>`,
    ranking:"the rankings", top:"the rankings", entered:"Up to No. ", dropped:"Out of the top ten",
    orgNote:base=>`Franchise strength is the slow-moving baseline &mdash; ownership, facilities,
      front office. Measured against where each franchise stood in ${base}.`,
    week:"day",
    pickIntro:"Every franchise is a different job with different expectations. Win with a contender and it's what they pay you for; win with a rebuild and you'll have your pick of the jobs.",
    tagline:"Build a franchise. Win the pennant.",
    gameName:"Pro Baseball Coach", eyebrow:"Pro",
    site:"Pro Baseball Coach: ianbott1.github.io/football-coach",
    tiers:[
      {max:5,  l:"Contender",  d:"Built to win now. Anything short of a deep October is a failure.",c:"flag"},
      {max:12, l:"Playoff team",d:"Make the postseason and win a series.",c:"sod"},
      {max:20, l:"Bubble team",d:"Fight for a wild card. A good place to learn.",c:"turf",rec:true},
      {max:26, l:"Rebuild",    d:"Develop the kids and show progress. Seventy-five wins would be a statement.",c:"vote"},
      {max:99, l:"Start over", d:"The bottom of the league. Seventy wins would be real movement.",c:"muted"}
    ],
    intro:[
      {h:"The job is yours until it isn't",
       b:"You have a record, a franchise, and an owner who is watching. Miss expectations two "+
         "years running and you're fired \u2014 then you pick from whatever will still take you."},
      {h:"A hundred and sixty-two games, then October",
       b:"<b>Every game</b> you set a gameplan: small ball, or swing for the fences. You read how their hitters are going "+
         "at it, decide when your starter is done, send up a pinch hitter late and choose when to run. Three division winners "+
         "and three wild cards from each league make the postseason; then a best-of-three, a best-of-five and two "+
         "best-of-sevens to the World Series. <b>Every offseason</b> you decide who to re-sign, who to chase in free agency "+
         "and how to draft."},
      {h:"Everything carries over",
       b:"Players age: they improve into their late twenties and decline after thirty-one or so. "+
         "Contracts run out. The worst teams get the best odds in the draft lottery. Your career "+
         "record follows you wherever you go next."}
    ],
    glossary:[
      ["Franchise strength","The slow-moving baseline of an organisation \u2014 ownership, facilities, "+
       "reputation. It moves over years and sets what's expected of you."],
      ["Rating (player)","0\u201399 scale. The rotation matters most: three starters, with the fourth and fifth behind them "+
       "taking about two starts in five. Bench players start about one game in eight."],
      ["Payroll","A soft limit at the 2026 luxury-tax line. A max contract is about a fifth of it."],
      ["Wild card","After the three division winners, the three best remaining records in each league get in."],
      ["Draft lottery","The teams that miss the postseason draw for the top picks; the worst records have the best odds."],
      ["Hot seat","Measured against your franchise's own expectations, not raw wins."]
    ]
  }
};
