/* ============ players: soccer ============ */
/* A squad as six units, each a first-choice player and one behind him:
   goalkeeper, centre-backs, full-backs, midfield, wingers, striker. The bench
   plays about a quarter of the time (rotation, substitutes, injuries). */

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

/* unit, share of team strength, backup dropoff, share of injuries, bench share */
const POS=[
  {p:"GK", w:0.14, drop:12, hz:0.05, bench:0.10},
  {p:"CB", w:0.18, drop:9,  hz:0.19, bench:0.25},
  {p:"FB", w:0.14, drop:8,  hz:0.19, bench:0.28},
  {p:"CM", w:0.22, drop:9,  hz:0.21, bench:0.28},
  {p:"W",  w:0.15, drop:9,  hz:0.18, bench:0.32},
  {p:"ST", w:0.17, drop:10, hz:0.18, bench:0.28},
];
const BENCH=0.25;                        // an average, for anything that needs one number
function pickInjuredPos(rng){
  let x=rng.r(), acc=0;
  for(let i=0;i<POS.length;i++){acc+=POS[i].hz; if(x<acc)return i}
  return POS.length-1;
}
const R_SLOPE=24.3, R_INT=56;
const ratingToElo=r=>R_INT+R_SLOPE*r;
const eloToRating=e=>(e-R_INT)/R_SLOPE;
function playerName(rng){ const f=rng.pick(PNAMES_F), l=rng.pick(PNAMES_L); return f+" "+wideLast(f,l,PNAMES_L) }   // the same two draws; the surname read through a wider list (core 21_names)
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
const OUT=["goals","ast","shots"];
const STAT_KEYS={GK:["sv","ga","cs"],CB:OUT.concat(["cs"]),FB:OUT.concat(["cs"]),CM:OUT,W:OUT,ST:OUT};
function blankStats(pos){const o={g:0}; (STAT_KEYS[pos]||[]).forEach(k=>o[k]=0); return o}
/* each first-choice player's share of the team's goals, assists and shots */
const ROLE={CB:{goals:0.06,ast:0.04,shots:0.07},FB:{goals:0.05,ast:0.14,shots:0.08},CM:{goals:0.16,ast:0.24,shots:0.20},
            W:{goals:0.22,ast:0.24,shots:0.24},ST:{goals:0.36,ast:0.12,shots:0.28}};
function gameStats(rng,pl,posIdx,forPts,oppPts,won){
  const P=POS[posIdx].p;
  if(P==="GK"){ const sa=Math.max(oppPts,Math.round(rng.gauss(4.4,1.8)+oppPts)); return {sv:sa-oppPts, ga:oppPts, cs:oppPts===0?1:0} }
  const R=ROLE[P], q=(pl.r-60)/20, star=Math.max(0.5,1+q*0.45+rng.gauss(0,0.2)), first=1-POS[posIdx].bench;
  const pick=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(rng.r()<p)k++;return k};
  const goals=pick(forPts,Math.min(0.9,R.goals*first*star));
  const ast=pick(forPts,Math.min(0.9,R.ast*first*star*0.9));
  const shots=Math.max(goals,Math.round(rng.gauss(12*R.shots*first*star,0.8)));
  const o={goals:goals, ast:ast, shots:shots}; if(P==="CB"||P==="FB")o.cs=oppPts===0?1:0; return o;
}
function addStats(dst,src){dst.g=(dst.g||0)+1; Object.keys(src).forEach(k=>dst[k]=(dst[k]||0)+src[k])}
function statLine(pos,s){
  if(!s||!s.g)return "";
  if(pos==="GK")return `${s.cs||0} clean sheet${s.cs===1?"":"s"}, ${s.sv||0} save${s.sv===1?"":"s"} in ${s.g} game${s.g===1?"":"s"}`;
  return `${s.goals||0} goal${s.goals===1?"":"s"}, ${s.ast||0} assist${s.ast===1?"":"s"} in ${s.g} game${s.g===1?"":"s"}`;   // "IN 1 GAMES" (Instinct)
}
function statProd(pos,s){
  if(!s||!s.g)return 0;
  if(pos==="GK")return (s.cs||0)*3+(s.sv||0)*0.25;
  return (s.goals||0)*3+(s.ast||0)*2+(s.cs||0)*(pos==="CB"?1.5:1);
}
