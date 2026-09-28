/* ============ league: pro hockey ============ */
/* Thirty franchises, named by city, in six divisions of five. Players are
   fictional. The structure is the real league's: an 82-game schedule,
   a play-in and best-of-seven playoffs, a draft with a lottery, contracts and
   a salary cap (hard, at the real 2026-27 figure: $164.961M). */
const NHL_DATES=(()=>{const out=[], d=new Date(Date.UTC(2026,9,7));        // Oct 7, then a date every other day or so
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for(let i=0;i<90;i++){out.push(M[d.getUTCMonth()]+" "+d.getUTCDate()); d.setUTCDate(d.getUTCDate()+(i%5===4?3:2))}
  return out})();
const NHL_K=+((typeof process!=="undefined"&&process.env&&process.env.NHL_K)||1.6);
const NHL_SPREAD=list=>list.map(([n,e,d])=>[n,Math.round(1500+(e-1500)*NHL_K),d]);
const LEAGUE={
  id:"nhl",
  name:"Pro Hockey",
  tracksOT:true,                              // a point for an overtime or shootout loss
  /* [team, starting strength (a prior, not standings), division] */
  teams:NHL_SPREAD([
["Boston",1510,"ATL"],["Buffalo",1470,"ATL"],["Detroit",1500,"ATL"],["Florida",1570,"ATL"],
["Montreal",1500,"ATL"],["Ottawa",1510,"ATL"],["Tampa Bay",1560,"ATL"],["Toronto",1550,"ATL"],
["Carolina",1570,"MET"],["Columbus",1480,"MET"],["New Jersey",1530,"MET"],["NY Islanders",1480,"MET"],
["NY Rangers",1500,"MET"],["Philadelphia",1470,"MET"],["Pittsburgh",1470,"MET"],["Washington",1540,"MET"],
["Chicago",1430,"CEN"],["Colorado",1580,"CEN"],["Dallas",1570,"CEN"],["Minnesota",1540,"CEN"],
["Nashville",1460,"CEN"],["St. Louis",1500,"CEN"],["Utah",1500,"CEN"],["Winnipeg",1560,"CEN"],
["Anaheim",1450,"PAC"],["Calgary",1480,"PAC"],["Edmonton",1570,"PAC"],["Los Angeles",1540,"PAC"],
["San Jose",1420,"PAC"],["Seattle",1460,"PAC"],["Vancouver",1490,"PAC"],["Vegas",1560,"PAC"]
  ]),
  colors:{"Boston":"#FFB81C","Buffalo":"#003087","Detroit":"#CE1126","Florida":"#C8102E","Montreal":"#AF1E2D",
    "Ottawa":"#C52032","Tampa Bay":"#002868","Toronto":"#00205B","Carolina":"#CE1126","Columbus":"#002654",
    "New Jersey":"#CE1126","NY Islanders":"#00539B","NY Rangers":"#0038A8","Philadelphia":"#F74902",
    "Pittsburgh":"#FCB514","Washington":"#C8102E","Chicago":"#CF0A2C","Colorado":"#6F263D","Dallas":"#006847",
    "Minnesota":"#154734","Nashville":"#FFB81C","St. Louis":"#002F87","Utah":"#6CACE4","Winnipeg":"#041E42",
    "Anaheim":"#F47A38","Calgary":"#C8102E","Edmonton":"#FF4C00","Los Angeles":"#111111","San Jose":"#006D75",
    "Seattle":"#001628","Vancouver":"#00205B","Vegas":"#B4975A"},
  conf:{
    names:{ATL:"Atlantic",MET:"Metropolitan",CEN:"Central",PAC:"Pacific"},
    order:["ATL","MET","CEN","PAC"],
    display:["ATL","MET","CEN","PAC"],
    autoBidPool:[],
    divisions:{},
    sides:{East:["ATL","MET"], West:["CEN","PAC"]}
  },
  weeks:90,                                  // 90 game dates, 82 games each: a date a step
  dates:NHL_DATES,
  classes:[],
  classTag:c=>"Age "+c,
  bowls:[],
  /* where drafted players played, for flavour */
  draftTeams:["London Knights","Everett Silvertips","Saskatoon Blades","Moose Jaw Warriors","Kitchener Rangers",
    "Boston University","Michigan","Minnesota","Denver","Frolunda","Djurgarden","HIFK","USNTDP","Sherbrooke Phoenix"],
  awards:{mvp:"Hart Trophy", weights:{C:1,LW:1,RW:1,D:1,D2:1,G:1},
    /* the race compares each player with his position; this is the voters' premium on top */
    premium:{C:1.06,LW:1.02,RW:1.02,D:0.93,D2:0.9,G:0.97}},
  tuning:{hfa:20, gapScale:1, pFloor:1250, pCeil:1800, talentSteps:12},
  venues:{"Colorado":4,"Winnipeg":3,"Edmonton":2,"Vegas":2,"San Jose":-3,"Anaheim":-2,"Columbus":-2},
  schedule:{games:82},
  playoff:{size:16, perSide:8, byes:0},
  /* the baby owl, suited up: a helmet strap would hide the face; a jersey stripe and a number */
  art:{owlExtra:`
      <path d="M22.6 44.2 H49.4" stroke="#D7263D" stroke-width="2.2"/>
      <text x="36" y="51.2" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="7.5" fill="#F4F1EA">99</text>`},
  /* W-L-OTL, as hockey writes it; points: two a win, one an overtime loss */
  // the regular season's record: playoff games don't count in the standings
  recText(t,sea){ const [w,l]=(sea.regRec||sea.rec)[t], o=(sea.otl&&sea.otl[t])||0; return `${w}-${l-o}-${o}` },
  points(t,sea){ const [w]=(sea.regRec||sea.rec)[t], o=(sea.otl&&sea.otl[t])||0; return 2*w+o },

  text:{
    rankedWin:["A win over one of the league's best. That tells you something.","Beat a contender on their ice. That's a statement.","Two points off a real team."],
    badLoss:["Points you can't give away in this division.","Beaten by a lottery team. It will cost you in the standings.","The kind of loss that decides the last wild card."],
    champions:"Stanley Cup champions",
    org:"Franchise", orgs:"teams", group:"Division", rank:"Rank",
    groupShort:"Div",
    standingsNote:`<div class="note">Record W-L-OTL: two points a win, one for losing in overtime or a
      shootout. The top three in each division make the playoffs, plus two wild cards in each conference.
      <b>z</b> clinched the conference &middot; <b>y</b> clinched the division &middot; <b>x</b> clinched a
      playoff place &middot; <b>e</b> eliminated.</div>`,
    ranking:"the rankings", top:"the rankings", entered:"Up to No. ",
    orgNote:base=>`Franchise strength is the slow-moving baseline &mdash; ownership, facilities,
      front office. Measured against where each franchise stood in ${base}.`,
    gameName:"Pro Hockey Coach", eyebrow:"Pro",
    site:"Pro Hockey Coach: ianbott1.github.io/football-coach",
    tiers:[
      {max:5,  l:"Contender",  d:"Built to win now. Anything short of a long playoff run is a failure.",c:"flag"},
      {max:12, l:"Playoff team",d:"Make the playoffs and win a round.",c:"sod"},
      {max:20, l:"Bubble team",d:"Fight for a wild card. A good place to learn.",c:"turf",rec:true},
      {max:26, l:"Rebuild",    d:"Draft well, spend wisely, and show progress. Thirty-five wins would be a statement.",c:"vote"},
      {max:99, l:"Start over", d:"The bottom of the league. Thirty wins would be real movement.",c:"muted"}
    ],
    intro:[
      {h:"The job is yours until it isn't",
       b:"You have a record, a franchise, and an owner who is watching. Miss expectations two "+
         "years running and you're fired \u2014 then you pick from whatever will still take you."},
      {h:"Eighty-two games, then sixteen wins",
       b:"<b>Every game</b> you set a gameplan: skate with them when you're the better team, "+
         "clog it up when you're not. Late in games you decide when to pull the goalie. The top "+
         "three in each division make the playoffs, plus two wild cards; then four best-of-seven "+
         "rounds for the Cup. <b>Every offseason</b> you decide who to re-sign, who to chase in free "+
         "agency and how to draft \u2014 under a hard salary cap."},
      {h:"Everything carries over",
       b:"Players age: they improve into their late twenties and decline after thirty. "+
         "Contracts run out. The worst teams get the best odds in the draft lottery. Your career "+
         "record follows you wherever you go next."}
    ],
    glossary:[
      ["Franchise strength","The slow-moving baseline of an organisation \u2014 ownership, facilities, "+
       "reputation. It moves over years and sets what's expected of you."],
      ["Rating (player)","0\u201399 scale. The goalie matters most; the depth lines play about "+
       "a third of the time, and the backup goalie starts about a fifth of games."],
      ["Points","Two for a win, one for an overtime or shootout loss. Standings go by points."],
      ["Salary cap","A hard limit, at the real 2026-27 figure of $104 million, with no exceptions. "+
       "A max contract is 20% of it. Entry-level deals are the cheapest good players in the league."],
      ["Wild card","After the top three in each division, the two best remaining teams in each "+
       "conference get in."],
      ["Draft lottery","The sixteen teams that miss the playoffs draw for the top two picks; "+
       "the worst records have the best odds, and a team can move up at most ten places."],
      ["Hot seat","Measured against your franchise's own expectations, not raw wins."]
    ]
  }
};
