/* ============ league: college football ============ */
/* Everything that makes this game college football rather than some other
   league: who plays, how they are grouped, how long the season runs, where
   players come from and go to, and what things are called. The core reads
   all of it through LEAGUE and knows none of it itself. */
const LEAGUE={
  id:"cfb",
  name:"College Football",

  /* [program, starting Elo, conference] */
  teams:[
["Georgia",1995,"SEC"],
["Texas",1970,"SEC"],
["Texas A&M",1920,"SEC"],
["Ole Miss",1905,"SEC"],
["Oklahoma",1895,"SEC"],
["LSU",1885,"SEC"],
["Alabama",1870,"SEC"],
["Tennessee",1790,"SEC"],
["Missouri",1740,"SEC"],
["Florida",1700,"SEC"],
["Auburn",1665,"SEC"],
["South Carolina",1660,"SEC"],
["Vanderbilt",1650,"SEC"],
["Arkansas",1580,"SEC"],
["Kentucky",1545,"SEC"],
["Mississippi St",1500,"SEC"],
["Ohio State",2035,"B1G"],
["Oregon",2005,"B1G"],
["Indiana",1965,"B1G"],
["USC",1845,"B1G"],
["Michigan",1835,"B1G"],
["Washington",1820,"B1G"],
["Penn State",1810,"B1G"],
["Iowa",1770,"B1G"],
["Illinois",1655,"B1G"],
["Minnesota",1640,"B1G"],
["Nebraska",1610,"B1G"],
["Michigan State",1580,"B1G"],
["UCLA",1560,"B1G"],
["Wisconsin",1555,"B1G"],
["Rutgers",1500,"B1G"],
["Maryland",1470,"B1G"],
["Northwestern",1450,"B1G"],
["Purdue",1380,"B1G"],
["Texas Tech",1875,"B12"],
["BYU",1845,"B12"],
["Utah",1780,"B12"],
["Houston",1760,"B12"],
["Arizona",1680,"B12"],
["TCU",1665,"B12"],
["Oklahoma State",1620,"B12"],
["Iowa State",1610,"B12"],
["Kansas",1595,"B12"],
["Kansas State",1585,"B12"],
["Baylor",1575,"B12"],
["Cincinnati",1570,"B12"],
["Arizona State",1560,"B12"],
["UCF",1510,"B12"],
["Colorado",1480,"B12"],
["West Virginia",1450,"B12"],
["Miami",1940,"ACC"],
["SMU",1795,"ACC"],
["Louisville",1750,"ACC"],
["Clemson",1735,"ACC"],
["Georgia Tech",1640,"ACC"],
["Pittsburgh",1645,"ACC"],
["Virginia",1625,"ACC"],
["Virginia Tech",1620,"ACC"],
["Duke",1570,"ACC"],
["NC State",1545,"ACC"],
["Florida State",1540,"ACC"],
["North Carolina",1520,"ACC"],
["California",1590,"ACC"],
["Syracuse",1490,"ACC"],
["Boston College",1440,"ACC"],
["Wake Forest",1425,"ACC"],
["Stanford",1370,"ACC"],
["Notre Dame",1980,"IND"],
["Boise State",1690,"P12"],
["Texas State",1520,"P12"],
["San Diego St",1470,"P12"],
["Colorado State",1460,"P12"],
["Fresno State",1450,"P12"],
["Utah State",1420,"P12"],
["Oregon State",1415,"P12"],
["Washington St",1400,"P12"],
["Navy",1655,"AAC"],
["Tulane",1620,"AAC"],
["Memphis",1610,"AAC"],
["Army",1545,"AAC"],
["UTSA",1500,"AAC"],
["South Florida",1495,"AAC"],
["North Texas",1480,"AAC"],
["East Carolina",1440,"AAC"],
["Tulsa",1330,"AAC"],
["Charlotte",1300,"AAC"],
["Rice",1310,"AAC"],
["Temple",1270,"AAC"],
["FAU",1300,"AAC"],
["UAB",1290,"AAC"],
["UNLV",1610,"MW"],
["New Mexico",1595,"MW"],
["Northern Ill",1440,"MW"],
["Air Force",1435,"MW"],
["San Jose State",1400,"MW"],
["Nevada",1330,"MW"],
["Wyoming",1355,"MW"],
["Hawaii",1340,"MW"],
["UTEP",1250,"MW"],
["James Madison",1640,"SBC"],
["Louisiana",1600,"SBC"],
["South Alabama",1470,"SBC"],
["Marshall",1420,"SBC"],
["App State",1410,"SBC"],
["Georgia South",1390,"SBC"],
["Old Dominion",1380,"SBC"],
["Arkansas State",1350,"SBC"],
["Coastal Car",1330,"SBC"],
["Troy",1370,"SBC"],
["Ga State",1250,"SBC"],
["Western Mich",1470,"MAC"],
["Toledo",1470,"MAC"],
["Ohio",1450,"MAC"],
["Miami (OH)",1420,"MAC"],
["Buffalo",1360,"MAC"],
["Bowling Green",1350,"MAC"],
["Central Mich",1300,"MAC"],
["Eastern Mich",1280,"MAC"],
["Ball State",1240,"MAC"],
["Akron",1200,"MAC"],
["Kent State",1180,"MAC"],
["Liberty",1560,"CUSA"],
["Jacksonville St",1420,"CUSA"],
["Western Ky",1400,"CUSA"],
["Sam Houston",1350,"CUSA"],
["Louisiana Tech",1330,"SBC"],
["Middle Tenn",1290,"CUSA"],
["New Mexico St",1270,"CUSA"],
["FIU",1250,"CUSA"],
["Kennesaw State",1210,"CUSA"],
["Delaware",1230,"CUSA"],
["Missouri State",1180,"CUSA"]
],

  colors:{"Alabama":"#9E1B32","Arkansas":"#9D2235","Auburn":"#0C2340","Florida":"#0021A5","Georgia":"#BA0C2F","Kentucky":"#0033A0","LSU":"#461D7C","Ole Miss":"#14213D","Mississippi St":"#660000","Missouri":"#F1B82D","Oklahoma":"#841617","South Carolina":"#73000A","Tennessee":"#FF8200","Texas":"#BF5700","Texas A&M":"#500000","Vanderbilt":"#866D4B","Illinois":"#E84A27","Indiana":"#990000","Iowa":"#FFCD00","Maryland":"#E03A3E","Michigan":"#FFCB05","Michigan State":"#18453B","Minnesota":"#7A0019","Nebraska":"#E41C38","Northwestern":"#4E2A84","Ohio State":"#BB0000","Oregon":"#154733","Penn State":"#041E42","Purdue":"#CEB888","Rutgers":"#CC0033","UCLA":"#2D68C4","USC":"#990000","Washington":"#4B2E83","Wisconsin":"#C5050C","Arizona":"#AB0520","Arizona State":"#8C1D40","Baylor":"#154734","BYU":"#002E5D","Cincinnati":"#E00122","Colorado":"#CFB87C","Houston":"#C8102E","Iowa State":"#C8102E","Kansas":"#0051BA","Kansas State":"#512888","Oklahoma State":"#FF7300","TCU":"#4D1979","Texas Tech":"#CC0000","UCF":"#BA9B37","Utah":"#CC0000","West Virginia":"#EAAA00","Boston College":"#98002E","California":"#003262","Clemson":"#F66733","Duke":"#00539B","Florida State":"#782F40","Georgia Tech":"#B3A369","Louisville":"#AD0000","Miami":"#F47321","NC State":"#CC0000","North Carolina":"#4B9CD3","Pittsburgh":"#FFB81C","SMU":"#354CA1","Stanford":"#8C1515","Syracuse":"#F76900","Virginia":"#232D4B","Virginia Tech":"#630031","Wake Forest":"#9E7E38","Notre Dame":"#0C2340","Boise State":"#0033A0","Colorado State":"#1E4D2B","Fresno State":"#DB0032","Oregon State":"#DC4405","San Diego St":"#A6192E","Texas State":"#501214","Utah State":"#00263A","Washington St":"#981E32","Army":"#D4BF91","Charlotte":"#046A38","East Carolina":"#592A8A","FAU":"#CC0000","Memphis":"#003087","Navy":"#00205B","North Texas":"#00853E","Rice":"#00205B","South Florida":"#006747","Temple":"#9D2235","Tulane":"#006747","Tulsa":"#002D72","UAB":"#1E6B52","UTSA":"#F15A22","Air Force":"#003087","Hawaii":"#024731","Nevada":"#003831","New Mexico":"#BA0C2F","Northern Ill":"#BA0C2F","San Jose State":"#0055A8","UNLV":"#B10202","UTEP":"#FF8200","Wyoming":"#492F24","App State":"#222222","Arkansas State":"#CC092F","Coastal Car":"#006F71","Ga State":"#0039A6","Georgia South":"#041E42","James Madison":"#450084","Louisiana":"#CE181E","Marshall":"#00B140","Old Dominion":"#003057","South Alabama":"#00205B","Troy":"#8A2432","Akron":"#041E42","Ball State":"#BA0C2F","Bowling Green":"#FE5000","Buffalo":"#005BBB","Central Mich":"#6A0032","Eastern Mich":"#046A38","Kent State":"#002664","Miami (OH)":"#C41230","Ohio":"#00694E","Toledo":"#00265D","Western Mich":"#6C4023","Delaware":"#00539F","FIU":"#081E3F","Jacksonville St":"#CC0000","Kennesaw State":"#FDBB30","Louisiana Tech":"#002F8B","Middle Tenn":"#0066CC","Missouri State":"#5E0009","New Mexico St":"#8C0B42","Sam Houston":"#F56600","Western Ky":"#B01E24","Liberty":"#002D62"},

  conf:{
    names:{SEC:"SEC",B1G:"Big Ten",B12:"Big 12",ACC:"ACC",P12:"Pac-12",
  AAC:"American",MW:"Mountain West",SBC:"Sun Belt",MAC:"MAC",CUSA:"Conference USA",IND:"Independent"},
    order:["SEC","B1G","B12","ACC","P12","AAC","MW","SBC","MAC","CUSA"],
    /* team picker order: the independents sit with the power conferences */
    display:["SEC","B1G","B12","ACC","IND","P12","AAC","MW","SBC","MAC","CUSA"],
    /* the Group of Six: their best champion gets the fifth automatic bid */
    autoBidPool:["AAC","CUSA","MAC","MW","P12","SBC"],
    /* The Sun Belt is the only conference still split into divisions. Everyone else
       runs a single table with the top two meeting for the title. */
    divisions:{
      SBC:{ East:["App State","Coastal Car","Georgia South","Ga State","James Madison",
                  "Marshall","Old Dominion"],
            West:["Arkansas State","Louisiana","Louisiana Tech","South Alabama","Troy"] }
    }
  },

  /* regular season: weeks and their dates (the last is championship week) */
  weeks:14,
  dates:["Sep 5","Sep 12","Sep 19","Sep 26","Oct 3","Oct 10","Oct 17","Oct 24",
  "Oct 31","Nov 7","Nov 14","Nov 21","Nov 28","Dec 5"],

  /* players */
  classes:["Fr","So","Jr","Sr"],

  /* postseason */
  bowls:["Citrus Bowl","ReliaQuest Bowl","Alamo Bowl","Gator Bowl","Holiday Bowl",
"Duke's Mayo Bowl","Las Vegas Bowl","Pinstripe Bowl","Music City Bowl","Texas Bowl",
"Liberty Bowl","Sun Bowl","Pop-Tarts Bowl","Rate Bowl","Military Bowl","Independence Bowl",
"Birmingham Bowl","Armed Forces Bowl","Gasparilla Bowl","First Responder Bowl","Fenway Bowl",
"LA Bowl","New Mexico Bowl","Boca Raton Bowl","Cure Bowl","Camellia Bowl","New Orleans Bowl",
"Myrtle Beach Bowl","Frisco Bowl","Idaho Potato Bowl","Hawaii Bowl","Bahamas Bowl",
"Salute to Veterans Bowl","68 Ventures Bowl","Arizona Bowl"],

  /* where players go when they leave */
  draftTeams:["Arizona","Atlanta","Baltimore","Buffalo","Carolina","Chicago",
  "Cincinnati","Cleveland","Dallas","Denver","Detroit","Green Bay","Houston",
  "Indianapolis","Jacksonville","Kansas City","Las Vegas","LA Chargers","LA Rams",
  "Miami","Minnesota","New England","New Orleans","NY Giants","NY Jets",
  "Philadelphia","Pittsburgh","San Francisco","Seattle","Tampa Bay","Tennessee",
  "Washington"],

  awards:{mvp:"Heisman"},

  tuning:{
    hfa:62            // baseline home-field edge, Elo
  },

  /* Not every stadium is the same place. A handful are genuinely miserable to
     visit; most are ordinary; some are half empty in November. Added to a
     prestige-based base; anyone not listed gets 8. */
  venues:{
"LSU":26,"Penn State":24,"Ohio State":21,"Alabama":20,"Texas A&M":22,"Oregon":19,
"Clemson":18,"Wisconsin":17,"Tennessee":20,"Florida":16,"Georgia":18,"Michigan":19,
"Oklahoma":15,"Notre Dame":16,"Auburn":16,"Iowa":15,"Washington":15,"Utah":14,
"Virginia Tech":15,"West Virginia":13,"Mississippi St":12,"Ole Miss":12,"Texas":15,
"USC":11,"Nebraska":13,"BYU":12,"Boise State":14,"Air Force":10,"Hawaii":12,
"Kansas State":12,"Arkansas":12,"South Carolina":13,"Missouri":10,"Louisville":10,
"Miami":8,"Duke":4,"Northwestern":3,"Rutgers":5,"Purdue":5,"Vanderbilt":4,
"Wake Forest":5,"Boston College":6,"Stanford":4,"California":5,"Kent State":2,
"Akron":2,"Charlotte":3,"UTEP":3,"Temple":3,"FIU":2,"Ga State":2
},

  schedule:{
    games:12,
    confGames:{SEC:9,B1G:9,B12:9,P12:7},   // Pac-12 plays a round robin
    confGamesDefault:8
  },

  playoff:{
    size:12,
    autoBids:["SEC","B1G","B12","ACC"],    // plus the best autoBidPool champion
    independent:{team:"Notre Dame",withinRank:12,note:"Independent, top-12 bid"}
  }
};
