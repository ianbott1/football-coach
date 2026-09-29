/* ============ league: English football ============ */
/* The Premier League (20 clubs, 38 games) and the Championship (24 clubs, 46
   games), with promotion and relegation between them: three down, two up
   automatically and the play-off winner. Players are fictional; the clubs and
   the structure are the real 2026-27 ones. */
const EPL_DATES=(()=>{const out=[], d=new Date(Date.UTC(2026,7,15));       // Saturdays from Aug 15
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for(let i=0;i<46;i++){out.push(M[d.getUTCMonth()]+" "+d.getUTCDate()); d.setUTCDate(d.getUTCDate()+(i===18||i===19?4:6))}
  return out})();
const EPL_K=+((typeof process!=="undefined"&&process.env&&process.env.EPL_K)||2.8);
const EPL_SPREAD=list=>list.map(([n,e,d])=>[n,Math.round(1560+(e-1560)*EPL_K),d]);   // spread around the middle (calibrated)
const LEAGUE={
  id:"epl",
  name:"English Football",
  draws:true,                                 // a point for a draw, three for a win
  /* [club, starting strength (a prior: roughly last season's standing), division] */
  teams:EPL_SPREAD([
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
  ]),
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
  awards:{mvp:"Player of the Season", weights:{GK:1,CB:1,FB:1,CM:1,W:1,ST:1},
    premium:{GK:0.88,CB:0.9,FB:0.88,CM:1.02,W:1.04,ST:1.08}},
  tuning:{hfa:120, gapScale:1, pFloor:1000, pCeil:2300, talentSteps:12, sc:{}},
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
    rankedWin:["A win over one of the league's best. That tells you something.","Beat a big club. That's the kind of result that changes a season.","Three points off a real side."],
    badLoss:["Points you can't afford to drop.","Beaten by a side you should beat. It'll be remembered in May.","The kind of result that decides who goes down."],
    champions:"champions",
    org:"Club", orgs:"clubs", group:"Division", rank:"Position",
    groupShort:"Div",
    standingsNote:`<div class="note">Record W-D-L: three points a win, one a draw; then goal difference, then
      goals scored. The Premier League's bottom three go down. In the Championship the top two go up, and
      third to eighth play off for the last place, the final at Wembley.</div>`,
    ranking:"the table", top:"the table", entered:"Up to ",
    orgNote:base=>`Club stature is the slow-moving baseline &mdash; support, revenue, history. Measured
      against where each club stood in ${base}.`,
    gameName:"Football Manager Coach", eyebrow:"English",
    site:"Football Manager Coach: ianbott1.github.io/football-coach",
    week:"weekend",
    tiers:[
      {max:4,  l:"Title challenger", d:"Win the league, or at least finish in the top four.",c:"flag"},
      {max:8,  l:"Europe",            d:"A top-seven finish and a European place.",c:"sod"},
      {max:17, l:"Mid-table",         d:"The top half would be a good season.",c:"turf",rec:true},
      {max:20, l:"Survival",          d:"Stay up. Nothing else matters.",c:"vote"},
      {max:99, l:"Championship",      d:"Win promotion, or build towards it.",c:"muted"}
    ],
    intro:[
      {h:"The job is yours until it isn't",
       b:"You have a club, a board, and supporters who expect things. Fall short two seasons "+
         "running and you're sacked \u2014 then you take what's offered, which may be a division down."},
      {h:"Every point counts",
       b:"<b>Every match</b> you set a gameplan: take the game to them when you're the better side, "+
         "sit deep and counter when you're not. Late on, you decide whether to chase a result or "+
         "protect one \u2014 and when it's level, whether to go for the win or take the point. "+
         "The Premier League's bottom three are relegated; the Championship's top two go up, and a "+
         "play-off at Wembley decides the third."},
      {h:"Money, not a cap",
       b:"There's no salary cap. A club spends what it earns: the Premier League earns far more "+
         "than the Championship, which is why promotion matters so much and relegation hurts. "+
         "Relegated clubs keep a parachute payment for two summers."}
    ],
    glossary:[
      ["Club stature","The slow-moving baseline of a club \u2014 support, revenue, history. It moves over "+
       "years and sets what the board expects of you."],
      ["Rating (player)","0\u201399 scale. Each position has a first choice and a player behind him; the "+
       "bench plays about a quarter of the time."],
      ["Points","Three a win, one a draw. Level on points: goal difference, then goals scored."],
      ["Wage budget","What the club can pay a year, from its stature and division. No cap, but no "+
       "money you don't have."],
      ["Parachute","A relegated club keeps part of its Premier League income for two summers."],
      ["Play-offs","Third to eighth in the Championship: 5 v 8 and 6 v 7, then 3 and 4 join, then "+
       "the final at Wembley for the last promotion place."],
      ["Hot seat","Measured against your club's own expectations, not raw results."]
    ]
  }
};
