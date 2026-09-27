/* ============ league: pro basketball ============ */
/* Thirty franchises, named by city, in six divisions of five. Players are
   fictional. The structure is the real league's: an 82-game schedule,
   a play-in and best-of-seven playoffs, a draft with a lottery, contracts and
   a salary cap (hard, at the real 2026-27 figure: $164.961M). */
const NBA_DATES=(()=>{const out=[], d=new Date(Date.UTC(2026,9,20));      // Oct 20, then every other day or so
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for(let i=0;i<90;i++){out.push(M[d.getUTCMonth()]+" "+d.getUTCDate()); d.setUTCDate(d.getUTCDate()+(i%5===4?3:2))}
  return out})();
const NBA_K=+((typeof process!=="undefined"&&process.env&&process.env.NBA_K)||1.7);
const NBA_SPREAD=list=>list.map(([n,e,d])=>[n,Math.round(1500+(e-1500)*NBA_K),d]);
const LEAGUE={
  id:"nba",
  name:"Pro Basketball",

  /* [franchise, starting strength (a prior, not standings), division];
     spread 1.7x around 1500 (calibrated: records spread like the real league's) */
  teams:NBA_SPREAD([
["Boston",1590,"ATL"],["Brooklyn",1440,"ATL"],["New York",1580,"ATL"],["Philadelphia",1500,"ATL"],["Toronto",1480,"ATL"],
["Chicago",1470,"CEN"],["Cleveland",1600,"CEN"],["Detroit",1560,"CEN"],["Indiana",1520,"CEN"],["Milwaukee",1510,"CEN"],
["Atlanta",1500,"SE"],["Charlotte",1450,"SE"],["Miami",1500,"SE"],["Orlando",1550,"SE"],["Washington",1420,"SE"],
["Denver",1590,"NW"],["Minnesota",1570,"NW"],["Oklahoma City",1640,"NW"],["Portland",1450,"NW"],["Utah",1420,"NW"],
["Golden State",1530,"PAC"],["LA Clippers",1520,"PAC"],["LA Lakers",1550,"PAC"],["Phoenix",1480,"PAC"],["Sacramento",1450,"PAC"],
["Dallas",1500,"SW"],["Houston",1570,"SW"],["Memphis",1520,"SW"],["New Orleans",1450,"SW"],["San Antonio",1540,"SW"]
  ]),
  colors:{"Boston":"#007A33","Brooklyn":"#000000","New York":"#006BB6","Philadelphia":"#006BB6","Toronto":"#CE1141",
    "Chicago":"#CE1141","Cleveland":"#860038","Detroit":"#C8102E","Indiana":"#002D62","Milwaukee":"#00471B",
    "Atlanta":"#E03A3E","Charlotte":"#1D1160","Miami":"#98002E","Orlando":"#0077C0","Washington":"#002B5C",
    "Denver":"#0E2240","Minnesota":"#0C2340","Oklahoma City":"#007AC1","Portland":"#E03A3E","Utah":"#002B5C",
    "Golden State":"#1D428A","LA Clippers":"#C8102E","LA Lakers":"#552583","Phoenix":"#1D1160","Sacramento":"#5A2D81",
    "Dallas":"#00538C","Houston":"#CE1141","Memphis":"#5D76A9","New Orleans":"#0C2340","San Antonio":"#000000"},

  conf:{
    names:{ATL:"Atlantic",CEN:"Central",SE:"Southeast",NW:"Northwest",PAC:"Pacific",SW:"Southwest"},
    order:["ATL","CEN","SE","NW","PAC","SW"],
    display:["ATL","CEN","SE","NW","PAC","SW"],
    autoBidPool:[],
    divisions:{},
    sides:{East:["ATL","CEN","SE"], West:["NW","PAC","SW"]}
  },

  weeks:90,                                  // 90 game dates, 82 games each: a date a step
  dates:NBA_DATES,
  classes:[],
  classTag:c=>"Age "+c,
  bowls:[],
  /* where drafted players played, for flavour */
  draftTeams:["Duke","Kentucky","Kansas","North Carolina","UConn","Gonzaga","Arizona","Houston","Auburn","Alabama",
    "Michigan State","Baylor","Texas","UCLA","Villanova","Purdue","Tennessee","Arkansas","Florida","Illinois",
    "Real Madrid","Partizan","ASVEL","Mega Superbet","Joventut","Ratiopharm Ulm","Overtime Elite","G League Ignite"],
  awards:{mvp:"MVP", weights:{PG:1,SG:1,SF:1,PF:1,C:1}},
  tuning:{hfa:60, gapScale:1, pFloor:1200, pCeil:1850, talentSteps:+((typeof process!=="undefined"&&process.env&&process.env.NBA_TS)||12),
    /* the pro game (docs/NBA.md): 48 minutes in quarters, ~99 possessions */
    bb:{pace:99,paceSd:2.5,two:0.545,three:0.362,foul2:0.13,foul3:0.02,ft:0.785,and1:0.09,oreb:0.24,
        toBase:0.135,gapPerPoss:0.00028,garbage:13,benchPull:0.08,quarters:true,lateLeft:"six"}},
  venues:{"Denver":6,"Utah":5,"Golden State":3,"Boston":3,"Oklahoma City":3,"Brooklyn":-3,"LA Clippers":-2,"Washington":-2},
  schedule:{games:82},
  playoff:{size:16, perSide:8, byes:0, playIn:true},
  /* the baby owl, suited up for the pros: a headband and a jersey number */
  art:{owlExtra:`
      <path d="M19.2 14.2 C24 11.2 30 10.2 36 10.2 C42 10.2 48 11.2 52.8 14.2 L52.2 18.4 C47.6 15.8 42 14.8 36 14.8 C30 14.8 24.4 15.8 19.8 18.4 Z" fill="#E4572E"/>
      <text x="36" y="49.5" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="8.5" fill="#F4F1EA">23</text>`},
  text:{
    rankedWin:["A win over one of the league's best. That tells you something.","Beat a contender. That's how they're built.","A statement win over a real team."],
    badLoss:["A loss you can't afford in this conference.","Beaten by a lottery team. It will cost you in the standings.","The kind of loss that decides who plays in the play-in."],
    champions:"NBA champions",
    org:"Franchise", orgs:"teams", group:"Division", rank:"Rank",
    groupShort:"Div",
    standingsNote:`<div class="note">Overall record, then division record. The top six in each conference
      go straight to the playoffs; 7 to 10 play in. <b>z</b> clinched the top seed &middot; <b>y</b> clinched
      the division &middot; <b>x</b> clinched a top-six place &middot; <b>e</b> eliminated.</div>`,
    ranking:"the rankings", top:"the rankings", entered:"Up to No. ",
    orgNote:base=>`Franchise strength is the slow-moving baseline &mdash; ownership, facilities,
      front office. Measured against where each franchise stood in ${base}.`,
    gameName:"Pro Basketball Coach", eyebrow:"Pro",
    site:"Pro Basketball Coach: ianbott1.github.io/football-coach",
    tiers:[
      {max:5,  l:"Contender",  d:"Built to win now. Anything short of a deep playoff run is a failure.",c:"flag"},
      {max:12, l:"Playoff team",d:"Make the playoffs and win a series.",c:"sod"},
      {max:20, l:"Play-in team",d:"Get to the play-in, and through it if you can. A good place to learn.",c:"turf",rec:true},
      {max:26, l:"Rebuild",    d:"Draft well, spend wisely, and show progress. Thirty-five wins would be a statement.",c:"vote"},
      {max:99, l:"Start over", d:"The bottom of the league. Twenty-five wins would be real movement.",c:"muted"}
    ],
    intro:[
      {h:"The job is yours until it isn't",
       b:"You have a record, a franchise, and an owner who is watching. Miss expectations two "+
         "years running and you're fired \u2014 then you pick from whatever will still take you."},
      {h:"Eighty-two games, then sixteen wins",
       b:"<b>Every game</b> you set a gameplan: work it inside when you're the better team, "+
         "shorten the game when you're not. The top six in each conference make the playoffs; "+
         "7 to 10 play in. Then four best-of-seven series. <b>Every offseason</b> you decide who to "+
         "re-sign, who to chase in free agency and how to draft \u2014 under a hard salary cap."},
      {h:"Everything carries over",
       b:"Players age: they improve into their late twenties and decline after thirty. "+
         "Contracts run out. The worst teams get the best odds in the draft lottery. Your career "+
         "record follows you wherever you go next."}
    ],
    glossary:[
      ["Franchise strength","The slow-moving baseline of an organisation \u2014 ownership, facilities, "+
       "reputation. It moves over years and sets what's expected of you."],
      ["Rating (player)","0\u201399 scale. Starters matter most; the bench plays a fifth of the minutes."],
      ["Age","Players improve until about 27, hold for a few years, and decline after 30."],
      ["Salary cap","A hard limit, at the real 2026-27 figure of $164.961 million. Stars are expensive; "+
       "rookie contracts are the cheapest good players in the league."],
      ["Play-in","Seventh and eighth play for the 7 seed; the loser gets another chance against "+
       "the winner of ninth against tenth for the 8 seed."],
      ["Draft lottery","The fourteen teams that miss the playoffs draw for the top four picks; "+
       "the worst records have the best odds."],
      ["Hot seat","Measured against your franchise's own expectations, not raw wins."]
    ]
  }
};
