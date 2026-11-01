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
  homeFirst:true,                             // results read home first, as in Britain
  /* win, draw and loss, from the engine's own scoring model (Poisson) */
  wdl(me,opp,atHome,neutral){
    const hfa=neutral?0:(atHome?1:-1)*LEAGUE.tuning.hfa, e=(SEA.elo[me]+hfa-SEA.elo[opp])*SC.edge;
    const lm=SC.goals*Math.exp(e/2), lo=SC.goals*Math.exp(-e/2), P=(l,k)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
    let w=0,d=0; for(let i=0;i<10;i++)for(let j=0;j<10;j++){const p=P(lm,i)*P(lo,j); if(i>j)w+=p; else if(i===j)d+=p}
    return [w,d,1-w-d];
  },
  /* [club, starting strength, division]: the 2026-27 pyramid, tiers 1-6
     (data/england_2026_27.py). Strength bands by tier, overlapping a little
     (a promoted club is near the bottom of the division it joins): Premier
     League from last season's standing (spread 2.8x), the Championship's
     mapped onto 1300-1700, the lower tiers by stadium capacity (log), a
     little extra for clubs lately in the top flight. Bands wide enough that
     strength predicts the table (measured: tier 6 at 940-1100 was near-random). */
  teams:[["Arsenal",2176,"PL"],["Aston Villa",1924,"PL"],["Bournemouth",1784,"PL"],["Brentford",1700,"PL"],["Brighton",1784,"PL"],["Chelsea",2008,"PL"],["Coventry City",1504,"PL"],["Crystal Palace",1728,"PL"],["Everton",1672,"PL"],["Fulham",1672,"PL"],["Hull City",1420,"PL"],["Ipswich Town",1476,"PL"],["Leeds United",1616,"PL"],["Liverpool",2064,"PL"],["Manchester City",2176,"PL"],["Manchester United",1952,"PL"],["Newcastle United",1924,"PL"],["Nottingham Forest",1700,"PL"],["Sunderland",1728,"PL"],["Tottenham Hotspur",1728,"PL"],["Birmingham City",1540,"CH"],["Blackburn Rovers",1433,"CH"],["Bolton Wanderers",1353,"CH"],["Bristol City",1487,"CH"],["Burnley",1673,"CH"],["Cardiff City",1353,"CH"],["Charlton Athletic",1407,"CH"],["Derby County",1407,"CH"],["Lincoln City",1300,"CH"],["Middlesbrough",1567,"CH"],["Millwall",1460,"CH"],["Norwich City",1487,"CH"],["Portsmouth",1380,"CH"],["Preston North End",1407,"CH"],["Queens Park Rangers",1433,"CH"],["Sheffield United",1513,"CH"],["Southampton",1620,"CH"],["Stoke City",1460,"CH"],["Swansea City",1513,"CH"],["Watford",1460,"CH"],["West Bromwich Albion",1540,"CH"],["West Ham United",1700,"CH"],["Wolverhampton Wanderers",1673,"CH"],["Wrexham",1460,"CH"],["AFC Wimbledon",1240,"L1"],["Barnsley",1443,"L1"],["Blackpool",1368,"L1"],["Bradford City",1457,"L1"],["Bromley",1150,"L1"],["Burton Albion",1177,"L1"],["Cambridge United",1208,"L1"],["Doncaster Rovers",1350,"L1"],["Huddersfield Town",1471,"L1"],["Leicester City",1614,"L1"],["Leyton Orient",1242,"L1"],["Luton Town",1359,"L1"],["Mansfield Town",1259,"L1"],["Milton Keynes Dons",1502,"L1"],["Notts County",1408,"L1"],["Oxford United",1307,"L1"],["Peterborough United",1324,"L1"],["Plymouth Argyle",1386,"L1"],["Reading",1471,"L1"],["Sheffield Wednesday",1590,"L1"],["Stevenage",1190,"L1"],["Stockport County",1276,"L1"],["Wigan Athletic",1460,"L1"],["Wycombe Wanderers",1268,"L1"],["Accrington Stanley",1069,"L2"],["Barnet",1121,"L2"],["Bristol Rovers",1313,"L2"],["Cheltenham Town",1145,"L2"],["Chesterfield",1262,"L2"],["Colchester United",1251,"L2"],["Crawley Town",1097,"L2"],["Crewe Alexandra",1252,"L2"],["Exeter City",1190,"L2"],["Fleetwood Town",1062,"L2"],["Gillingham",1291,"L2"],["Grimsby Town",1218,"L2"],["Newport County",1176,"L2"],["Northampton Town",1189,"L2"],["Oldham Athletic",1336,"L2"],["Port Vale",1400,"L2"],["Rochdale",1255,"L2"],["Rotherham United",1302,"L2"],["Salford City",1050,"L2"],["Shrewsbury Town",1244,"L2"],["Swindon Town",1381,"L2"],["Tranmere Rovers",1400,"L2"],["Walsall",1283,"L2"],["York City",1200,"L2"],["AFC Fylde",1065,"NL"],["Aldershot Town",1101,"NL"],["Altrincham",1119,"NL"],["Barrow",1083,"NL"],["Boreham Wood",1004,"NL"],["Boston United",1029,"NL"],["Carlisle United",1300,"NL"],["Eastleigh",1037,"NL"],["FC Halifax Town",1183,"NL"],["Forest Green Rovers",1033,"NL"],["Gateshead",1210,"NL"],["Harrogate Town",1026,"NL"],["Hartlepool United",1123,"NL"],["Hornchurch",950,"NL"],["Kidderminster Harriers",1081,"NL"],["Scunthorpe United",1154,"NL"],["Solihull Moors",1047,"NL"],["Southend United",1221,"NL"],["Sutton United",1027,"NL"],["Tamworth",1007,"NL"],["Wealdstone",983,"NL"],["Woking",1067,"NL"],["Worthing",979,"NL"],["Yeovil Town",1165,"NL"],["AFC Telford United",1103,"NN"],["Bedford Town",885,"NN"],["Brackley Town",931,"NN"],["Buxton",1047,"NN"],["Chester",1058,"NN"],["Chorley",977,"NN"],["Darlington",913,"NN"],["Harborough Town",820,"NN"],["Hebburn Town",885,"NN"],["Hednesford Town",1090,"NN"],["Hereford",1049,"NN"],["King's Lynn Town",1180,"NN"],["Macclesfield",1052,"NN"],["Marine",885,"NN"],["Merthyr Town",970,"NN"],["Morecambe",1111,"NN"],["Oxford City",931,"NN"],["Radcliffe",931,"NN"],["Scarborough Athletic",909,"NN"],["South Shields",970,"NN"],["Southport",1089,"NN"],["Spalding United",855,"NN"],["Spennymoor Town",991,"NN"],["Worksop Town",922,"NN"],["AFC Totton",927,"NS"],["Billericay Town",973,"NS"],["Braintree Town",1029,"NS"],["Chelmsford City",973,"NS"],["Chesham United",1080,"NS"],["Dagenham & Redbridge",1138,"NS"],["Dorking Wanderers",1031,"NS"],["Dover Athletic",1158,"NS"],["Ebbsfleet United",1067,"NS"],["Farnborough",1180,"NS"],["Farnham Town",834,"NS"],["Folkestone Invicta",1013,"NS"],["Hampton & Richmond Borough",973,"NS"],["Hemel Hempstead Town",942,"NS"],["Horsham",927,"NS"],["Maidenhead United",1013,"NS"],["Maidstone United",1027,"NS"],["Salisbury",1080,"NS"],["Slough Town",927,"NS"],["Tonbridge Angels",927,"NS"],["Torquay United",1158,"NS"],["Truro City",981,"NS"],["Walton & Hersham",820,"NS"],["Weston-super-Mare",973,"NS"]],
  /* where a club relegated from the National League goes: North or South */
  region:{"AFC Fylde":"N","Aldershot Town":"S","Altrincham":"N","Barrow":"N","Boreham Wood":"S","Boston United":"N","Carlisle United":"N","Eastleigh":"S","FC Halifax Town":"N","Forest Green Rovers":"S","Gateshead":"N","Harrogate Town":"N","Hartlepool United":"N","Hornchurch":"S","Kidderminster Harriers":"N","Scunthorpe United":"N","Solihull Moors":"N","Southend United":"S","Sutton United":"S","Tamworth":"N","Wealdstone":"S","Woking":"S","Worthing":"S","Yeovil Town":"S","AFC Telford United":"N","Bedford Town":"N","Brackley Town":"N","Buxton":"N","Chester":"N","Chorley":"N","Darlington":"N","Harborough Town":"N","Hebburn Town":"N","Hednesford Town":"N","Hereford":"N","King's Lynn Town":"N","Macclesfield":"N","Marine":"N","Merthyr Town":"N","Morecambe":"N","Oxford City":"N","Radcliffe":"N","Scarborough Athletic":"N","South Shields":"N","Southport":"N","Spalding United":"N","Spennymoor Town":"N","Worksop Town":"N","AFC Totton":"S","Billericay Town":"S","Braintree Town":"S","Chelmsford City":"S","Chesham United":"S","Dagenham & Redbridge":"S","Dorking Wanderers":"S","Dover Athletic":"S","Ebbsfleet United":"S","Farnborough":"S","Farnham Town":"S","Folkestone Invicta":"S","Hampton & Richmond Borough":"S","Hemel Hempstead Town":"S","Horsham":"S","Maidenhead United":"S","Maidstone United":"S","Salisbury":"S","Slough Town":"S","Tonbridge Angels":"S","Torquay United":"S","Truro City":"S","Walton & Hersham":"S","Weston-super-Mare":"S","Arsenal":"S","Chelsea":"S","Crystal Palace":"S","Brentford":"S","Brighton":"S","Bournemouth":"S","Fulham":"S","Tottenham Hotspur":"S","Ipswich Town":"S","Southampton":"S","Portsmouth":"S","Charlton Athletic":"S","Millwall":"S","Queens Park Rangers":"S","Watford":"S","Norwich City":"S","Bristol City":"S","Swansea City":"S","Cardiff City":"S","West Ham United":"S","AFC Wimbledon":"S","Bromley":"S","Cambridge United":"S","Leyton Orient":"S","Luton Town":"S","Milton Keynes Dons":"S","Oxford United":"S","Peterborough United":"S","Plymouth Argyle":"S","Reading":"S","Stevenage":"S","Wycombe Wanderers":"S","Barnet":"S","Bristol Rovers":"S","Cheltenham Town":"S","Colchester United":"S","Crawley Town":"S","Exeter City":"S","Gillingham":"S","Newport County":"S","Northampton Town":"S","Swindon Town":"S"},
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
    names:{PL:"Premier League",CH:"Championship",L1:"League One",L2:"League Two",NL:"National League",
      NN:"National League North",NS:"National League South"},
    order:["PL","CH","L1","L2","NL","NN","NS"], display:["PL","CH","L1","L2","NL","NN","NS"], autoBidPool:[], divisions:{},
    sides:{"Premier League":["PL"],"Championship":["CH"],"League One":["L1"],"League Two":["L2"],
      "National League":["NL"],"National League North":["NN"],"National League South":["NS"]}
  },
  weeks:46, dates:EPL_DATES,
  classes:[], classTag:c=>"Age "+c, bowls:[],
  draftTeams:["the academy"],
  awards:{mvp:"Player of the Season", weights:{GK:1,CB:1,FB:1,CM:1,W:1,ST:1},
    premium:{GK:0.88,CB:0.9,FB:0.88,CM:1.02,W:1.04,ST:1.08}},
  tuning:{hfa:120, gapScale:1, pFloor:700, pCeil:2300, talentSteps:12, sc:{}},
  venues:{},
  schedule:{games:38},
  playoff:{size:6, perSide:6, byes:0},
  stepLabel:w=>`Matchday ${w+1}`,
  myGameLabel:n=>`Matchday ${n}`,
  groupFilter:true,                            // Scores and Standings filter by division
  groupShort:c=>LEAGUE.conf.names[c].replace("National League ","NL "),              // your matchday: the Premier League skips weeks
  position:t=>SEA&&SEA.table?SEA.table(CONF[t]).indexOf(t)+1:0,  // table position, not a ranking
  positionLine:t=>`${ordinal(LEAGUE.position(t))} in ${LEAGUE.conf.names[CONF[t]]}`,
  rankTop:6,
  /* W-D-L and points: three a win, one a draw */
  // the league's record: play-off games don't count in the table
  recText(t,sea,r){ const [w,l]=r||(sea.regRec||sea.rec)[t], d=(sea.drw&&sea.drw[t])||0; return `${w}-${d}-${l}` },
  points(t,sea){ const [w]=(sea.regRec||sea.rec)[t], d=(sea.drw&&sea.drw[t])||0; return 3*w+d },
  standingsCol:{label:"Pts", val:(t,sea)=>LEAGUE.points(t,sea)},
  /* the owl in a scarf, club colours */
  art:{owlExtra:`
      <path d="M24 44.5 C30 47 42 47 48 44.5 L48.5 48 C42 50.5 30 50.5 23.5 48 Z" fill="#D7263D"/>
      <path d="M42 47.5 L45 58 L41.5 58.6 L39.5 48.2 Z" fill="#D7263D"/>`},

  text:{bye:"No game this week",
    rankedWin:["A win over one of the league's best. That tells you something.","Beat a big club. That's the kind of result that changes a season.","Three points off a real side."],
    badLoss:["Points you can't afford to drop.","Beaten by a side you should beat. It'll be remembered in May.","The kind of result that decides who goes down."],
    champions:"champions",
    org:"Club", orgs:"clubs", group:"Division", rank:"Position",
    groupShort:"Div",
    standingsNote:`<div class="note">Record W-D-L: three points a win, one a draw; then goal difference, then
      goals scored. Each division's promotion, play-off and relegation places are marked on its table.</div>`,
    ranking:"the table", top:"the table", entered:"Up to ",
    orgNote:base=>`Club stature is the slow-moving baseline &mdash; support, revenue, history. Measured
      against where each club stood in ${base}.`,
    pickIntro:"Every club is a different job with different expectations. Win at a giant and it's what they pay you for; win at a club nobody expects anything of and you'll have your pick of the jobs.",
    tagline:"Build a club. Win the league.",
    gameName:"Soccer Coach", eyebrow:"English",
    site:"Soccer Coach: ianbott1.github.io/football-coach",
    week:"weekend",
    tiers:[
      {max:4,   l:"Title challenger", d:"Win the league, or at least finish in the top four.",c:"flag"},
      {max:8,   l:"Europe",           d:"A top-seven finish and a European place.",c:"sod"},
      {max:17,  l:"Premier League",   d:"The top flight: stay there.",c:"turf",rec:true},
      {max:44,  l:"Championship",     d:"One step from the Premier League.",c:"vote"},
      {max:92,  l:"Football League",  d:"League One and League Two: the professional game.",c:"muted"},
      {max:999, l:"Non-league",       d:"The National League and below: start here and climb.",c:"muted"}
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
