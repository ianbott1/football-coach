/* ============ players: hockey ============ */
/* Twelve players: a first unit (centre, two wings, two defencemen and the
   starting goalie) and a player behind each (the depth lines, the third
   pair, the backup goalie). Team strength comes from them, the goalie most
   of all. */

const PNAMES_F=["Marcus","Jalen","Trevor","DeAndre","Caleb","Xavier","Bryce","Amari","Cooper",
"Isaiah","Rashaun","Tanner","Malik","Grayson","Devonte","Hunter","Elijah","Josiah","Keenan","Dontae",
"Landon","Zaire","Kyler","Omari","Tre","Nico","Quinn","Deshaun","Cade","Tyrese","Micah","Damari",
"Kobe","Silas","Emory","Kade","Anwar","Diego","Kamari","Jamir","Ezra","Khalil","Nnamdi","Makai",
"Jaylen","Tariq","Darius","Moussa","Luka","Bogdan","Ousmane","Kel'el","Terrence","Armando","Otis"];
const PNAMES_L=["Whitfield","Okonkwo","Barrera","Sanders","Colquitt","Adeyemi","Reyes","Traylor",
"Mbeki","Vandenberg","Hollis","Guillory","Achebe","Kirkpatrick","Solano","Nwosu","Bettencourt",
"Ratliff","Delacroix","Ivory","Sinclair","Ogunleye","Castillo","Thibodeaux","Marchetti","Ude",
"Espinoza","Vann","Duckworth","Asante","Rios","Pettigrew","Oyelaran","Steadman","Cifuentes","Igwe",
"Balogun","Tremblay","Lindqvist","Kovalenko","Bergeron","Makinen","Duchene","Karlsson","Norwood","Mensah","Quintero","Ashworth","Diallo","Buchanan","Lefevre","Odom",
"Kponeh","Vasquez","Randle","Diabate","Petrovic","Kuminga","Sissoko","Harlan","Ellsworth"];

/* position, share of team strength, backup dropoff, share of injuries, and
   how much the player behind him plays (depth lines about 30%; a backup
   goalie starts about a fifth of games) */
const POS=[
  {p:"C",  w:0.17, drop:10, hz:0.20, bench:0.30},
  {p:"LW", w:0.13, drop:9,  hz:0.19, bench:0.30},
  {p:"RW", w:0.13, drop:9,  hz:0.19, bench:0.30},
  {p:"D",  w:0.14, drop:9,  hz:0.19, bench:0.30},
  {p:"D2", w:0.13, drop:9,  hz:0.18, bench:0.30},
  {p:"G",  w:0.30, drop:12, hz:0.05, bench:0.22},
];
const BENCH=0.28;                        // an average, for anything that needs one number
function pickInjuredPos(rng){
  let x=rng.r(), acc=0;
  for(let i=0;i<POS.length;i++){acc+=POS[i].hz; if(x<acc)return i}
  return POS.length-1;
}
const R_SLOPE=24.3, R_INT=56;
const ratingToElo=r=>R_INT+R_SLOPE*r;
const eloToRating=e=>(e-R_INT)/R_SLOPE;
function playerName(rng){return rng.pick(PNAMES_F)+" "+rng.pick(PNAMES_L)}
const BK=i=>i+POS.length;
function teamRating(roster){
  let s=0;
  POS.forEach((P,i)=>{const st=roster[i], bk=roster[BK(i)]||st;
    s+=P.w*((1-P.bench)*st.r+P.bench*bk.r)});
  return s;
}
function rosterElo(roster){return ratingToElo(teamRating(roster))}
function injuryCost(roster,idx){
  const P=POS[idx];
  if(!roster||!roster[BK(idx)])return -P.w*P.drop*R_SLOPE;
  const gap=Math.max(3,roster[idx].r-roster[BK(idx)].r);
  return -P.w*((1-P.bench)*gap+P.bench*6)*R_SLOPE;
}
function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}

/* ============ box scores ============ */
const SK=["goals","ast","pts","sog"];
const STAT_KEYS={C:SK,LW:SK,RW:SK,D:SK,D2:SK,G:["sv","ga","so"]};
function blankStats(pos){const o={g:0}; (STAT_KEYS[pos]||[]).forEach(k=>o[k]=0); return o}
/* each unit's share of the first unit's goals, assists and shots (depth
   players account for the rest) */
const ROLE={C:{goals:0.27,ast:0.26,sog:0.24},LW:{goals:0.25,ast:0.21,sog:0.22},RW:{goals:0.25,ast:0.21,sog:0.22},
            D:{goals:0.12,ast:0.17,sog:0.17},D2:{goals:0.11,ast:0.15,sog:0.15}};
/* one game's line for one first-unit player, consistent with his rating and the score */
function gameStats(rng,pl,posIdx,forPts,oppPts,won){
  const P=POS[posIdx].p;
  if(P==="G"){ const sa=Math.max(oppPts,Math.round(rng.gauss(29,4.5)));
    return {sv:sa-oppPts, ga:oppPts, so:oppPts===0?1:0} }
  const R=ROLE[P], q=(pl.r-60)/20, star=Math.max(0.5,1+q*0.45+rng.gauss(0,0.2)), first=1-POS[posIdx].bench;
  const pick=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(rng.r()<p)k++;return k};
  const goals=pick(forPts,Math.min(0.9,R.goals*first*star));
  const ast=pick(Math.round(forPts*1.7),Math.min(0.9,R.ast*first*star*0.55));
  const sog=Math.max(goals,Math.round(rng.gauss(29*R.sog*first*star,1.2)));
  return {goals:goals, ast:ast, pts:goals+ast, sog:sog};
}
function addStats(dst,src){dst.g=(dst.g||0)+1; Object.keys(src).forEach(k=>dst[k]=(dst[k]||0)+src[k])}
/* a season line: hockey counts totals */
function statLine(pos,s){
  if(!s||!s.g)return "";
  if(pos==="G"){ const sa=(s.sv||0)+(s.ga||0), sv=sa?(s.sv/sa):0;
    return `${sv.toFixed(3).replace(/^0/,"")} save %, ${((s.ga||0)/s.g).toFixed(2)} GAA${s.so?", "+s.so+" shutout"+(s.so===1?"":"s"):""}` }
  return `${s.goals||0} goals, ${s.ast||0} assists, ${s.pts||0} points`;
}
/* award production, from what a player actually did */
function statProd(pos,s){
  if(!s||!s.g)return 0;
  if(pos==="G"){ const sa=(s.sv||0)+(s.ga||0); return sa?Math.max(0,((s.sv/sa)-0.880)*1400)*Math.min(1,s.g/40):0 }
  return (s.pts||0)+(s.goals||0)*0.4;
}
