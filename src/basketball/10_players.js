/* ============ players: basketball ============ */
/* Ten players per program: five starters and a backup at each spot. Team
   strength comes from them, starters and bench together (the bench plays a
   fifth of the minutes), so injuries, graduation, recruiting and depth all
   move it through actual people. */

const PNAMES_F=["Marcus","Jalen","Trevor","DeAndre","Caleb","Xavier","Bryce","Amari","Cooper",
"Isaiah","Rashaun","Tanner","Malik","Grayson","Devonte","Hunter","Elijah","Josiah","Keenan","Dontae",
"Landon","Zaire","Kyler","Omari","Tre","Nico","Quinn","Deshaun","Cade","Tyrese","Micah","Damari",
"Kobe","Silas","Emory","Kade","Anwar","Diego","Kamari","Jamir","Ezra","Khalil","Nnamdi","Makai",
"Jaylen","Tariq","Darius","Moussa","Luka","Bogdan","Ousmane","Kel'el","Terrence","Armando","Otis"];
const PNAMES_L=["Whitfield","Okonkwo","Barrera","Sanders","Colquitt","Adeyemi","Reyes","Traylor",
"Mbeki","Vandenberg","Hollis","Guillory","Achebe","Kirkpatrick","Solano","Nwosu","Bettencourt",
"Ratliff","Delacroix","Ivory","Sinclair","Ogunleye","Castillo","Thibodeaux","Marchetti","Ude",
"Espinoza","Vann","Duckworth","Asante","Rios","Pettigrew","Oyelaran","Steadman","Cifuentes","Igwe",
"Balogun","Tremblay","Norwood","Mensah","Quintero","Ashworth","Diallo","Buchanan","Lefevre","Odom",
"Kponeh","Vasquez","Randle","Diabate","Petrovic","Kuminga","Sissoko","Harlan","Ellsworth"];

/* position, share of team strength, backup dropoff, share of injuries */
const POS=[
  {p:"PG", w:0.22, drop:12, hz:0.20},
  {p:"SG", w:0.20, drop:11, hz:0.20},
  {p:"SF", w:0.20, drop:11, hz:0.20},
  {p:"PF", w:0.19, drop:11, hz:0.20},
  {p:"C",  w:0.19, drop:12, hz:0.20},
];
const BENCH=0.20;                        // the bench's share of the minutes
function pickInjuredPos(rng){
  let x=rng.r(), acc=0;
  for(let i=0;i<POS.length;i++){acc+=POS[i].hz; if(x<acc)return i}
  return POS.length-1;
}
/* rating <-> Elo, as in football: teamRating 45 -> 1150, 82 -> 2050 */
const R_SLOPE=24.3, R_INT=56;
const ratingToElo=r=>R_INT+R_SLOPE*r;
const eloToRating=e=>(e-R_INT)/R_SLOPE;
function playerName(rng){return rng.pick(PNAMES_F)+" "+rng.pick(PNAMES_L)}
/* ten players: 0-4 start, 5-9 back up the same spot */
const BK=i=>i+POS.length;
function teamRating(roster){
  let s=0;
  POS.forEach((P,i)=>{const st=roster[i], bk=roster[BK(i)]||st;
    s+=P.w*((1-BENCH)*st.r+BENCH*bk.r)});
  return s;
}
function rosterElo(roster){return ratingToElo(teamRating(roster))}
/* Elo cost of losing a starter: his minutes go to the backup, and the
   backup's to whoever is next (a walk-on's worth of drop) */
function injuryCost(roster,idx){
  const P=POS[idx];
  if(!roster||!roster[BK(idx)])return -P.w*P.drop*R_SLOPE;
  const gap=Math.max(3,roster[idx].r-roster[BK(idx)].r);
  return -P.w*((1-BENCH)*gap+BENCH*6)*R_SLOPE;
}

/* ============ box scores ============ */
const STAT_KEYS={PG:["pts","reb","ast","stl","blk","tpm"],SG:["pts","reb","ast","stl","blk","tpm"],
  SF:["pts","reb","ast","stl","blk","tpm"],PF:["pts","reb","ast","stl","blk","tpm"],C:["pts","reb","ast","stl","blk","tpm"]};
function blankStats(pos){const o={g:0}; (STAT_KEYS[pos]||[]).forEach(k=>o[k]=0); return o}
/* how a position's production splits: share of the starters' points,
   rebounds, assists, steals, blocks, and threes */
const ROLE={PG:{pts:0.22,reb:0.12,ast:0.40,stl:0.30,blk:0.05,tpm:0.28},
            SG:{pts:0.25,reb:0.14,ast:0.20,stl:0.25,blk:0.07,tpm:0.34},
            SF:{pts:0.22,reb:0.19,ast:0.16,stl:0.20,blk:0.13,tpm:0.24},
            PF:{pts:0.17,reb:0.25,ast:0.13,stl:0.14,blk:0.30,tpm:0.10},
            C: {pts:0.14,reb:0.30,ast:0.11,stl:0.11,blk:0.45,tpm:0.04}};
/* one game's line for one starter, consistent with his rating and the score */
function gameStats(rng,pl,posIdx,forPts,oppPts,won){
  const P=POS[posIdx].p, R=ROLE[P], q=(pl.r-60)/20;          // about -1 .. +1.5
  const star=Math.max(0.55,1+q*0.35+rng.gauss(0,0.22));
  const team={pts:forPts*(1-BENCH), reb:rng.gauss(36,4)*(1-BENCH), ast:forPts*0.19*(1-BENCH),
              stl:rng.gauss(6.5,1.8)*(1-BENCH), blk:rng.gauss(3.6,1.4)*(1-BENCH), tpm:forPts*0.105*(1-BENCH)};
  const s={};
  Object.keys(R).forEach(k=>{s[k]=Math.max(0,Math.round(team[k]*R[k]*star+rng.gauss(0,k==="pts"?2.5:0.8)))});
  if(s.tpm*3>s.pts)s.tpm=Math.floor(s.pts/3);
  return s;
}
function addStats(dst,src){dst.g=(dst.g||0)+1; Object.keys(src).forEach(k=>dst[k]=(dst[k]||0)+src[k])}
/* season line, per game */
function statLine(pos,s){
  if(!s||!s.g)return "";
  const pg=k=>((s[k]||0)/s.g).toFixed(1);
  if(pos==="PG")return `${pg("pts")} ppg, ${pg("ast")} apg, ${pg("reb")} rpg`;
  if(pos==="PF"||pos==="C")return `${pg("pts")} ppg, ${pg("reb")} rpg, ${pg("blk")} bpg`;
  return `${pg("pts")} ppg, ${pg("reb")} rpg, ${pg("tpm")} 3pm`;
}
/* award production, built from what a player actually did */
function statProd(pos,s){
  if(!s||!s.g)return 0;
  return s.pts*0.9+s.reb*0.8+s.ast*1.1+s.stl*1.8+s.blk*1.6;
}
