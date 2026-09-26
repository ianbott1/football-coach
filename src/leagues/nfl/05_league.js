/* ============ league: pro football ============ */
/* Thirty-two franchises, named by city, in eight divisions of four. Players
   are fictional. The structure is the real league's: a 17-game schedule over
   18 weeks built by the league's rotation formula, fourteen playoff teams,
   a draft run in reverse order of finish, contracts and a salary cap. */
const LEAGUE={
  id:"nfl",
  name:"Pro Football",

  /* [franchise, starting strength, division] */
  teams:[
["Buffalo",1834,"AE"],["Miami",1645,"AE"],["New England",1674,"AE"],["NY Jets",1558,"AE"],
["Baltimore",1848,"AN"],["Cincinnati",1689,"AN"],["Cleveland",1558,"AN"],["Pittsburgh",1689,"AN"],
["Houston",1732,"AS"],["Indianapolis",1660,"AS"],["Jacksonville",1674,"AS"],["Tennessee",1529,"AS"],
["Denver",1761,"AW"],["Kansas City",1805,"AW"],["Las Vegas",1544,"AW"],["LA Chargers",1747,"AW"],
["Dallas",1645,"NE"],["NY Giants",1558,"NE"],["Philadelphia",1863,"NE"],["Washington",1703,"NE"],
["Chicago",1689,"NN"],["Detroit",1834,"NN"],["Green Bay",1776,"NN"],["Minnesota",1732,"NN"],
["Atlanta",1631,"NS"],["Carolina",1587,"NS"],["New Orleans",1544,"NS"],["Tampa Bay",1732,"NS"],
["Arizona",1602,"NW"],["LA Rams",1790,"NW"],["San Francisco",1761,"NW"],["Seattle",1776,"NW"]
  ],

  colors:{"Buffalo":"#00338D","Miami":"#008E97","New England":"#002244","NY Jets":"#125740",
    "Baltimore":"#241773","Cincinnati":"#FB4F14","Cleveland":"#FF3C00","Pittsburgh":"#FFB612",
    "Houston":"#03202F","Indianapolis":"#002C5F","Jacksonville":"#006778","Tennessee":"#4B92DB",
    "Denver":"#FB4F14","Kansas City":"#E31837","Las Vegas":"#A5ACAF","LA Chargers":"#0080C6",
    "Dallas":"#003594","NY Giants":"#0B2265","Philadelphia":"#004C54","Washington":"#5A1414",
    "Chicago":"#0B162A","Detroit":"#0076B6","Green Bay":"#203731","Minnesota":"#4F2683",
    "Atlanta":"#A71930","Carolina":"#0085CA","New Orleans":"#D3BC8D","Tampa Bay":"#D50A0A",
    "Arizona":"#97233F","LA Rams":"#003594","San Francisco":"#AA0000","Seattle":"#69BE28"},

  conf:{
    names:{AE:"AFC East",AN:"AFC North",AS:"AFC South",AW:"AFC West",
           NE:"NFC East",NN:"NFC North",NS:"NFC South",NW:"NFC West"},
    order:["AE","AN","AS","AW","NE","NN","NS","NW"],
    display:["AE","AN","AS","AW","NE","NN","NS","NW"],
    autoBidPool:[],
    divisions:{},                              // a division is already the group
    /* the two conferences, each four divisions */
    sides:{AFC:["AE","AN","AS","AW"], NFC:["NE","NN","NS","NW"]}
  },

  /* 18 weeks, 17 games, one bye each */
  weeks:18,
  dates:["Sep 10","Sep 17","Sep 24","Oct 1","Oct 8","Oct 15","Oct 22","Oct 29","Nov 5",
    "Nov 12","Nov 19","Nov 26","Dec 3","Dec 10","Dec 17","Dec 24","Dec 31","Jan 7"],

  classes:[],                                  // players have ages, not class years
  classTag:c=>"Age "+c,

  bowls:[],
  /* where drafted players played in college, for flavour */
  draftTeams:["Alabama","Georgia","Ohio State","Michigan","LSU","Texas","Oregon","USC",
    "Clemson","Penn State","Notre Dame","Florida","Oklahoma","Tennessee","Miami","Washington",
    "Iowa","Wisconsin","Utah","Auburn","Florida State","Texas A&M","TCU","Kansas State",
    "Missouri","Ole Miss","South Carolina","Arizona State","Boise State","Toledo","Tulane","Houston"],

  awards:{mvp:"MVP",
    /* MVP voters care about quarterbacks above everything */
    weights:{QB:2.2,RB:1.05,WR:0.95,WR2:0.35,OT:0.15,EDGE:0.8,DT:0.35,LB:0.35,CB:0.4,S:0.3}},

  tuning:{hfa:40, drives:10},                  // less home field than on campus; fewer, longer drives
  venues:{"Seattle":10,"Kansas City":9,"Green Bay":9,"Buffalo":8,"Denver":8,"Philadelphia":7,
    "New Orleans":7,"Baltimore":6,"Pittsburgh":6,"Minnesota":5,"LA Chargers":-6,"LA Rams":-4,
    "Las Vegas":-3,"Jacksonville":-2,"Tampa Bay":-2,"Arizona":-2},

  schedule:{games:17},

  playoff:{size:14, perSide:7, byes:1},

  text:{
    champions:"Super Bowl champions",
    site:"Football Coach: Pro \u2014 ianbott1.github.io/football-coach",
    tiers:[
      {max:5,  l:"Contender",  d:"The roster is built to win now. Anything short of a deep run is a failure.",c:"flag"},
      {max:12, l:"Playoff team",d:"Get in, win a game in January, and keep the owner happy.",c:"sod"},
      {max:20, l:"Middle of the pack",d:"Win the close ones and sneak into a wild card spot. A good place to learn.",c:"turf",rec:true},
      {max:27, l:"Rebuild",    d:"Draft well, spend wisely, and show progress. Eight wins would be a statement.",c:"vote"},
      {max:99, l:"Start over", d:"The bottom of the league. Six wins would be real movement.",c:"muted"}
    ],
    intro:[
      {h:"The job is yours until it isn't",
       b:"You have a record, a franchise, and an owner who is watching. Miss expectations two "+
         "years running and you're fired \u2014 then you pick from whatever will still take you."},
      {h:"Two decisions that matter",
       b:"<b>Every week</b> you set a gameplan. Playing it safe protects a lead; taking risks is "+
         "how an underdog steals a game. <b>Every offseason</b> you decide who to re-sign, how "+
         "to spend in free agency, and how to draft \u2014 all under a hard salary cap."},
      {h:"Everything carries over",
       b:"Players age: they improve into their late twenties and decline after thirty. "+
         "Contracts run out. The worst teams pick first in the draft. Your career record "+
         "follows you wherever you go next."}
    ],
    glossary:[
      ["Franchise strength","The slow-moving baseline of an organisation \u2014 ownership, facilities, "+
       "reputation. It moves over years and sets what's expected of you."],
      ["Rating (player)","0\u201399 scale. A starter's rating drives how much he's worth to the team. "+
       "Quarterbacks matter far more than safeties, and are paid like it."],
      ["Age","Players improve until about 27, hold for a few years, and decline after 30. "+
       "Quarterbacks last longer."],
      ["Salary cap","A hard limit on what you pay the players who matter. Stars are expensive; "+
       "rookie contracts are the cheapest good players in the league."],
      ["Win probability","Derived from the rating gap plus home field. Your gameplan shifts the "+
       "spread of outcomes around it, not the average."],
      ["Hot seat","Measured against your franchise's own expectations, not raw wins."],
      ["Reputation","What other front offices think of you. It decides which jobs open up when "+
       "you're fired."]
    ]
  }
};
