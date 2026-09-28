/* ============ league: English football ============ */
/* The Premier League (20 clubs, 38 games) and the Championship (24 clubs, 46
   games), with promotion and relegation between them: three down, two up
   automatically and the play-off winner. Players are fictional; the clubs and
   the structure are the real 2026-27 ones. */
const EPL_DATES=(()=>{const out=[], d=new Date(Date.UTC(2026,7,15));       // Saturdays from Aug 15
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for(let i=0;i<46;i++){out.push(M[d.getUTCMonth()]+" "+d.getUTCDate()); d.setUTCDate(d.getUTCDate()+(i===18||i===19?4:6))}
  return out})();
const LEAGUE={
  id:"epl",
  name:"English Football",
  draws:true,                                 // a point for a draw, three for a win
  /* [club, starting strength (a prior: roughly last season's standing), division] */
  teams:[
["Arsenal",1780,"PL"],["Aston Villa",1690,"PL"],["Bournemouth",1640,"PL"],["Brentford",1610,"PL"],
["Brighton",1640,"PL"],["Chelsea",1720,"PL"],["Coventry City",1540,"PL"],["Crystal Palace",1620,"PL"],
["Everton",1600,"PL"],["Fulham",1600,"PL"],["Hull City",1510,"PL"],["Ipswich Town",1530,"PL"],
["Leeds United",1580,"PL"],["Liverpool",1740,"PL"],["Manchester City",1780,"PL"],["Manchester United",1700,"PL"],
["Newcastle United",1690,"PL"],["Nottingham Forest",1610,"PL"],["Sunderland",1620,"PL"],["Tottenham Hotspur",1620,"PL"],
["Birmingham City",1450,"CH"],["Blackburn Rovers",1410,"CH"],["Bolton Wanderers",1380,"CH"],["Bristol City",1430,"CH"],
["Burnley",1500,"CH"],["Cardiff City",1380,"CH"],["Charlton Athletic",1400,"CH"],["Derby County",1400,"CH"],
["Lincoln City",1360,"CH"],["Middlesbrough",1460,"CH"],["Millwall",1420,"CH"],["Norwich City",1430,"CH"],
["Portsmouth",1390,"CH"],["Preston North End",1400,"CH"],["Queens Park Rangers",1410,"CH"],["Sheffield United",1440,"CH"],
["Southampton",1480,"CH"],["Stoke City",1420,"CH"],["Swansea City",1440,"CH"],["Watford",1420,"CH"],
["West Bromwich Albion",1450,"CH"],["West Ham United",1510,"CH"],["Wolverhampton Wanderers",1500,"CH"],["Wrexham",1420,"CH"]
  ],
  colors:{"Arsenal":"#EF0107","Aston Villa":"#670E36","Bournemouth":"#DA291C","Brentford":"#E30613","Brighton":"#0057B8",
    "Chelsea":"#034694","Coventry City":"#59CBE8","Crystal Palace":"#1B458F","Everton":"#003399","Fulham":"#111111",
    "Hull City":"#F5A12D","Ipswich Town":"#3A64A3","Leeds United":"#FFCD00","Liverpool":"#C8102E","Manchester City":"#6CABDD",
    "Manchester United":"#DA291C","Newcastle United":"#241F20","Nottingham Forest":"#DD0000","Sunderland":"#EB172B",
    "Tottenham Hotspur":"#132257","Birmingham City":"#0000FF","Blackburn Rovers":"#009EE0","Bolton Wanderers":"#263C7E",
    "Bristol City":"#E21F26","Burnley":"#6C1D45","Cardiff City":"#0070B5","Charlton Athletic":"#D4021D","Derby County":"#111111",
    "Lincoln City":"#D71920","Middlesbrough":"#E11B22","Millwall":"#001D5E","Norwich City":"#00A650","Portsmouth":"#001489",
    "Preston North End":"#1F3F7A","Queens Park Rangers":"#1D5BA4","Sheffield United":"#EE2737","Southampton":"#D71920",
    "Stoke City":"#E03A3E","Swansea City":"#121212","Watford":"#FBEE23","West Bromwich Albion":"#122F67",
    "West Ham United":"#7A263A","Wolverhampton Wanderers":"#FDB913","Wrexham":"#D71920"},
  conf:{
    names:{PL:"Premier League",CH:"Championship"},
    order:["PL","CH"], display:["PL","CH"], autoBidPool:[], divisions:{},
    sides:{"Premier League":["PL"],"Championship":["CH"]}
  },
  weeks:46, dates:EPL_DATES,
  classes:[], classTag:c=>"Age "+c, bowls:[],
  draftTeams:["the academy"],
  awards:{mvp:"Player of the Season", weights:{GK:1,D:1,D2:1,M:1,F:1,F2:1},
    premium:{GK:0.9,D:0.92,D2:0.9,M:1.02,F:1.06,F2:1.04}},
  tuning:{hfa:120, gapScale:1, pFloor:1250, pCeil:1900, talentSteps:12, sc:{}},
  venues:{},
  schedule:{games:38},
  playoff:{size:6, perSide:6, byes:0},
  stepLabel:w=>`Matchday ${w+1}`,
  rankTop:6,
  /* W-D-L and points: three a win, one a draw */
  recText(t,sea,r){ const [w,l]=r||sea.rec[t], d=(sea.drw&&sea.drw[t])||0; return `${w}-${d}-${l}` },
  points(t,sea){ const [w]=sea.rec[t], d=(sea.drw&&sea.drw[t])||0; return 3*w+d },
  standingsCol:{label:"Pts", val:(t,sea)=>LEAGUE.points(t,sea)},
  /* the owl in a scarf, club colours */
  art:{owlExtra:`
      <path d="M24 44.5 C30 47 42 47 48 44.5 L48.5 48 C42 50.5 30 50.5 23.5 48 Z" fill="#D7263D"/>
      <path d="M42 47.5 L45 58 L41.5 58.6 L39.5 48.2 Z" fill="#D7263D"/>`},

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
    week:"night",                                // the digest: "The night that was"
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
      {h:"Eighty-four games, then sixteen wins",
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
       "conference get in. Ties go to regulation wins."],
      ["Draft lottery","The sixteen teams that miss the playoffs draw for the top two picks; "+
       "the worst records have the best odds, and a team can move up at most ten places."],
      ["Hot seat","Measured against your franchise's own expectations, not raw wins."]
    ]
  }
};
