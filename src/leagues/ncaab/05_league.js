/* ============ league: college basketball ============ */
/* Every Division I school in its 2026-27 conference (04_teams.js, generated
   from data/ncaab_2026_27.py), a November-to-March season, conference
   tournaments, Selection Sunday and a 76-team NCAA tournament. */
const NCAAB_ELO=t=>Math.round(1450+(t.lvl+t.ped*0.8)*1.25);      // starting strength: a prior, calibrated
const LEAGUE={
  id:"ncaab",
  name:"College Basketball",
  /* [program, starting Elo, conference] */
  teams:NCAAB_TEAMS.map(t=>[t.n,NCAAB_ELO(t),t.conf]),
  colors:Object.fromEntries(NCAAB_TEAMS.map(t=>[t.n,t.c])),
  conf:{
    names:Object.fromEntries(NCAAB_CONFS.map(c=>[c,c])),
    order:NCAAB_CONFS.slice(),
    /* team picker: the high-majors first */
    display:["SEC","Big Ten","Big 12","ACC","Big East","Pac-12","Mountain West","Atlantic 10","West Coast","American",
      "Missouri Valley"].concat(NCAAB_CONFS.filter(c=>["SEC","Big Ten","Big 12","ACC","Big East","Pac-12","Mountain West",
      "Atlantic 10","West Coast","American","Missouri Valley"].indexOf(c)<0)),
    autoBidPool:[], divisions:{}
  },
  /* the regular season: one game date a step (11 non-conference, 19 conference) */
  weeks:30,
  dates:["Nov 3","Nov 7","Nov 11","Nov 14","Nov 18","Nov 22","Nov 26","Dec 2","Dec 6","Dec 13","Dec 20",
    "Dec 30","Jan 3","Jan 7","Jan 10","Jan 14","Jan 17","Jan 21","Jan 24","Jan 28","Jan 31","Feb 4","Feb 7",
    "Feb 11","Feb 14","Feb 18","Feb 21","Feb 25","Feb 28","Mar 4"],
  classes:["Fr","So","Jr","Sr"],
  bowls:[],
  /* where players go when they leave */
  draftTeams:["Atlanta","Boston","Brooklyn","Charlotte","Chicago","Cleveland","Dallas","Denver","Detroit",
    "Golden State","Houston","Indiana","LA Clippers","LA Lakers","Memphis","Miami","Milwaukee","Minnesota",
    "New Orleans","New York","Oklahoma City","Orlando","Philadelphia","Phoenix","Portland","Sacramento",
    "San Antonio","Toronto","Utah","Washington"],
  awards:{mvp:"Player of the Year", weights:{PG:1.12,SG:1.1,SF:1.04,PF:0.98,C:0.98}},
  tuning:{hfa:105, pFloor:1000, pCeil:2350},   // program strength spans more than in football
  /* arenas that are genuinely hard to visit (added to a prestige-based base) */
  venues:{"Kansas":30,"Duke":30,"Kentucky":24,"Gonzaga":22,"Purdue":22,"Michigan State":20,"Syracuse":16,
    "Houston":20,"Arizona":20,"North Carolina":18,"Iowa State":22,"Wisconsin":18,"Texas Tech":20,"BYU":20,
    "Villanova":16,"Illinois":18,"Indiana":18,"Tennessee":18,"Virginia":16,"Utah State":18,"San Diego State":18,
    "New Mexico":18,"Saint Mary's":16,"Dayton":18,"Wichita State":14,"Creighton":16,"Marquette":14,"Providence":16},
  schedule:{games:30, nonConf:11, confWeeks:19},
  playoff:{size:76, autoBids:32, atLarge:44, ineligible:NCAAB_TEAMS.filter(t=>t.trans).map(t=>t.n)},
  text:{
    rankedWin:["A ranked win. The committee will notice.","That one goes on the résumé.","A Quad 1 win, and they count."],
    badLoss:["That is the kind of loss that follows you to Selection Sunday.","An unranked team did that. The committee will remember.","One of those losses you have to explain in March."],
    champions:"National champions",
    org:"Program", orgs:"programs", group:"Conference", rank:"Poll",
    ranking:"the poll", top:"the top 25", entered:"Entered the poll at #",
    orgNote:base=>`Program strength is the slow-moving baseline &mdash; recruiting,
      resources, coaching. Measured against where each program stood in ${base}.`,
    gameName:"College Basketball Coach", eyebrow:"College",
    site:"College Basketball Coach: ianbott1.github.io/football-coach",
    tiers:[
 {max:12, l:"Blue blood",    d:"A deep March run is the expectation. Miss the tournament twice and you're gone.",c:"flag"},
 {max:45, l:"Contender",     d:"Make the tournament and win a game or two.",c:"sod"},
 {max:110,l:"Bubble team",   d:"Get into the field. Win your conference tournament and you're in regardless.",c:"turf",rec:true},
 {max:220,l:"Mid-major",     d:"A winning season and a real run at the conference title.",c:"vote"},
 {max:999,l:"Rebuild",       d:"Hard mode. A winning conference record would be real movement.",c:"muted"}
],
    intro:[
 {h:"The job is yours until it isn't",
  b:"You have a record, a program, and a seat that gets warm. Miss expectations two years "+
    "running and you're fired \u2014 then you pick from whatever will still take you."},
 {h:"Win your conference, or win enough",
  b:"Thirty-two conference champions get automatic bids to the NCAA tournament. Forty-four more "+
    "are picked on Selection Sunday. Every game from November on is part of your case."},
 {h:"Then it's March",
  b:"Seventy-six teams, one elimination bracket, a champion in Detroit. A 12 seed beats a 5 "+
    "about a third of the time. Players graduate, transfer and leave early for the NBA; "+
    "recruiting classes compound; programs rise and fall across decades."}
],
    glossary:[
 ["Program strength","The slow-moving baseline of a school \u2014 resources, recruiting pull, reputation. It moves over years, not weeks, and sets what's expected of you."],
 ["Rating (player)","0\u201399 scale. Starters matter most, but the bench plays a fifth of the minutes, so depth counts."],
 ["Ceiling","How good a player can still become. Freshmen have room; seniors usually don't."],
 ["Win probability","Derived from the rating gap plus home court (about three points). Your gameplan changes how swingy the game is, not the average."],
 ["Automatic bid","Win your conference tournament and you're in the NCAA tournament, whatever your record."],
 ["At-large bid","The 44 best teams without an automatic bid, as the committee sees them: record, strength, who you beat."],
 ["Opening Round","The 12 lowest-seeded at-large teams and the 12 lowest-seeded automatic qualifiers play first, for spots on the 11, 12, 15 and 16 lines."]
]
  }
};
