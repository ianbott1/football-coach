
/* ============ players ============ */
/* A star core of ten rated starters per program. Team strength is DERIVED from
   these ratings rather than floating free, so injuries, graduation and recruiting
   all move the needle through actual people. */

const PNAMES_F=["Marcus","Jalen","Trevor","DeAndre","Caleb","Xavier","Bryce","Amari",
"Cooper","Isaiah","Rashaun","Tanner","Malik","Grayson","Devonte","Hunter","Elijah",
"Braxton","Josiah","Keenan","Dontae","Landon","Zaire","Kyler","Rocco","Jaxon","Omari",
"Tre","Bo","Nico","Quinn","Deshaun","Cade","Ronan","Tyreek","Micah","Damari","Jett",
"Kobe","Silas","Emory","Roman","Kade","Anwar","Diego","Kamari","Beau","Jamir","Tomas",
"Ezra","Khalil","Brock","Nnamdi","Sione","Tua","Leilani","Makai","Dax","Colt","Rhett"];
const PNAMES_L=["Whitfield","Okonkwo","Barrera","Sanders","Colquitt","Adeyemi","Reyes",
"Traylor","Mbeki","Vandenberg","Hollis","Guillory","Achebe","Kirkpatrick","Solano",
"Nwosu","Bettencourt","Ratliff","Fuamatu","Delacroix","Ivory","Sinclair","Ogunleye",
"Castillo","Thibodeaux","Marchetti","Ude","Bramlett","Espinoza","Kealoha","Vann",
"Duckworth","Asante","Rios","Pettigrew","Oyelaran","Steadman","Cifuentes","Igwe",
"Balogun","Tremblay","Norwood","Sarkisian","Faletau","Mensah","Quintero","Ashworth",
"Diallo","Buchanan","Lefevre","Odom","Tagovailoa","Kponeh","Vasquez","Randle"];

/* position, share of team strength, backup dropoff, award weight */
/* hz = share of injuries that land on this spot */
const POS=[
  {p:"QB",  w:0.27, drop:21, aw:1.14, hz:0.14},
  {p:"RB",  w:0.07, drop:10, aw:1.68, hz:0.13},
  {p:"WR",  w:0.09, drop:11, aw:1.68, hz:0.11},
  {p:"WR2", w:0.06, drop:9,  aw:0.7, hz:0.09},
  {p:"OT",  w:0.12, drop:12, aw:0.47, hz:0.13},
  {p:"EDGE",w:0.11, drop:13, aw:1.02, hz:0.10},
  {p:"DT",  w:0.08, drop:10, aw:0.62, hz:0.09},
  {p:"LB",  w:0.08, drop:10, aw:0.85, hz:0.08},
  {p:"CB",  w:0.07, drop:11, aw:0.78, hz:0.08},
  {p:"S",   w:0.05, drop:9,  aw:0.5, hz:0.05},
];
function pickInjuredPos(rng){
  let x=rng.r(), acc=0;
  for(let i=0;i<POS.length;i++){acc+=POS[i].hz; if(x<acc)return i}
  return POS.length-1;
}

/* rating <-> Elo: teamRating 45 -> 1150, 82 -> 2050 */
const R_SLOPE=24.3, R_INT=56;
const ratingToElo=r=>R_INT+R_SLOPE*r;
const eloToRating=e=>(e-R_INT)/R_SLOPE;

function playerName(rng){return rng.pick(PNAMES_F)+" "+rng.pick(PNAMES_L)}

function makePlayer(rng,target,cls,posIdx){
  // upperclassmen are closer to their ceiling; freshmen start lower with room to grow
  const clsAdj=[-7,-2,2,4][cls];   // centred so a normal class mix averages the target
  const r=Math.round(Math.max(30,Math.min(99,rng.gauss(target+clsAdj,5.5))));
  const pot=Math.round(Math.max(r,Math.min(99,r+rng.gauss(10-cls*2.5,5))));
  return {n:playerName(rng),p:POS[posIdx].p,i:posIdx,c:cls,r:r,pot:pot,
          hz:0,prod:0,st:0};
}

/* Twenty players: indices 0-9 start, 10-19 are the backup at the same spot. */
const BK=i=>i+POS.length;

function makeRoster(rng,programElo){
  const target=eloToRating(programElo);
  const bag=[]; [3,3,2,2].forEach((n,k)=>{for(let i=0;i<n;i++)bag.push(3-k)});
  rng.shuffle(bag);
  const r=POS.map((_,i)=>makePlayer(rng,target,bag[i],i));
  // backups are younger and a clear step down, but the gap varies a lot
  const bbag=[]; [1,2,3,4].forEach((n,k)=>{for(let i=0;i<n;i++)bbag.push(3-k)});
  rng.shuffle(bbag);
  POS.forEach((_,i)=>{
    const b=makePlayer(rng,target-rng.range(6,17),bbag[i],i);
    b.r=Math.min(b.r,r[i].r);            // never better than the starter on day one
    r.push(b);
  });
  return r;
}

function teamRating(roster){
  let s=0; POS.forEach((P,i)=>{s+=P.w*roster[i].r});
  return s;                                 // starters only
}
function rosterElo(roster){return ratingToElo(teamRating(roster))}

/* Elo cost of losing a starter: the actual drop-off to his backup. */
function injuryCost(roster,idx){
  const P=POS[idx];
  if(!roster||!roster[BK(idx)])return -P.w*P.drop*R_SLOPE;
  const gap=Math.max(3,roster[idx].r-roster[BK(idx)].r);
  return -P.w*gap*R_SLOPE;
}

/* ---- offseason roster churn ---- */
function developRoster(u,t,rng,focus,devMod,bud,featured,staff){
  focus=focus||{pos:null,r:0,pot:0}; devMod=devMod||0; bud=bud||null;
  const cls=(u.classAvg&&u.classAvg[t]!==undefined)?u.classAvg[t]:null;
  const coach=u.coach[t];
  const base=eloToRating(u.program[t]);
  const target=(u.classAvg&&u.classAvg[t]!==undefined)
    ? base*0.68+u.classAvg[t]*0.32     // recent classes feed the pipeline
    : base;
  const leaving=[], arriving=[];
  const roster=u.roster[t];
  if(roster.length<POS.length*2){          // older save: give it a two-deep
    POS.forEach((_,i)=>{
      if(!roster[BK(i)]){
        const b=makePlayer(rng,target-rng.range(6,17),rng.int(3),i);
        b.r=Math.min(b.r,roster[i].r); roster[BK(i)]=b;
      }
    });
  }
  const newcomer=(i)=>{
    const cls=rng.r()<0.62?0:1;
    const bonus=(!focus.pos||focus.pos.indexOf(POS[i%POS.length].p)>=0)?focus.r:0;
    const np=makePlayer(rng,target-rng.range(4,14)+(coach.q*0.045)+bonus
      +(coach.rec||0)*0.5+(bud?bud.recruitBonus:0),cls,i%POS.length);
    if(focus.pot)np.pot=Math.min(99,np.pot+focus.pot);
    if(focus.dev)np.up=focus.dev;
    if(cls===0)np.rec=true;
    return np;
  };
  for(let i=0;i<roster.length;i++){
    const pl=roster[i];
    if(!pl)continue;
    if(pl.c>=3){                                   // senior graduates
      leaving.push({n:pl.n,p:pl.p,r:pl.r,starter:i<POS.length,
                    car:pl.car||null, from:pl.from||null, peak:pl.peak||pl.r,
                    idx:i%POS.length});
      if(i<POS.length){
        // the backup steps up, and a new man arrives behind him
        roster[i]=roster[BK(i)];
        roster[BK(i)]=newcomer(i);
        arriving.push(roster[BK(i)]);
      }else{
        roster[i]=newcomer(i); arriving.push(roster[i]);
      }
    }else{
      // development: biggest jumps early, capped by potential, nudged by coaching
      const base=[6.2,4.0,2.2][pl.c];
      const feat=(featured!==undefined&&featured!==null&&featured===i)?3.8:0;
      const side=(i%POS.length)<5 ? (staff?staff.oc:0) : (staff?staff.dc:0);
      let g=rng.gauss(base+coach.q*0.035+devMod+(pl.up||0)+feat+(side||0),3.0);
      pl.r=Math.round(Math.max(30,Math.min(pl.pot,pl.r+g)));
      pl.peak=Math.max(pl.peak||0,pl.r);
      pl.c++;
      // stars leave early for the draft
      let keepOdds=bud?Math.max(0,1-bud.retention):1;
      if(featured!==undefined&&featured!==null&&featured===i)keepOdds*=0.34;
      if(pl.c>=2 && pl.r>=76 && rng.r() < ((pl.r-74)/34)*keepOdds){
        const wasFeatured=(featured!==undefined&&featured!==null&&featured===i);
        leaving.push({n:pl.n,p:pl.p,r:pl.r,early:true,featured:wasFeatured,
                      starter:i<POS.length, car:pl.car||null, from:pl.from||null,
                      peak:pl.peak||pl.r, idx:i%POS.length});
        if(wasFeatured)u.pipeline=(u.pipeline||0)+1;
        if(i<POS.length){
          roster[i]=roster[BK(i)];
          roster[BK(i)]=newcomer(i);
          arriving.push(roster[BK(i)]);
        }else{ roster[i]=newcomer(i); arriving.push(roster[i]) }
      }
    }
  }
  POS.forEach((_,i)=>{
    const s=roster[i], b=roster[BK(i)];
    if(s&&b&&b.r>s.r+2){roster[i]=b;roster[BK(i)]=s}   // clear upgrade wins the job
  });
  return {leaving:leaving,arriving:arriving};
}

function classLabel(rank,total){
  const pct=rank/total;
  if(rank<=10)return "Top-10 class";
  if(pct<=0.20)return "Top-25 class";
  if(pct<=0.45)return "Above average";
  if(pct<=0.75)return "Middling";
  return "Thin class";
}

/* ============ box scores ============ */
/* Stat lines are derived from rating, game flow and scoring, so the numbers a
   player puts up are consistent with how good he is and how the game went. */

const STAT_KEYS={
  QB  :["cmp","att","pyd","ptd","int"],
  RB  :["car","ryd","rtd"],
  WR  :["rec","cyd","ctd"],
  WR2 :["rec","cyd","ctd"],
  OT  :["pan","ska"],
  EDGE:["tkl","sck","tfl"],
  DT  :["tkl","sck","tfl"],
  LB  :["tkl","tfl","pd"],
  CB  :["tkl","pd","ints"],
  S   :["tkl","pd","ints"]
};

function blankStats(pos){
  const o={g:0};
  (STAT_KEYS[pos]||[]).forEach(k=>o[k]=0);
  return o;
}

/* One game's production for one starter. */
function gameStats(rng,pl,posIdx,forPts,oppPts,won){
  const pos=POS[posIdx].p;
  const q=(pl.r-58)/22;                 // roughly -1.3 (poor) .. +1.8 (elite)
  const s={};
  const R=(a,b)=>a+rng.r()*(b-a);
  const pass=forPts*0.60, run=forPts*0.40;

  if(pos==="QB"){
    s.att=Math.max(8,Math.round(R(24,38)+(won?-2:4)));
    const pct=Math.max(0.38,Math.min(0.78,0.545+q*0.055+rng.gauss(0,0.05)));
    s.cmp=Math.round(s.att*pct);
    s.pyd=Math.max(0,Math.round(s.cmp*(10.4+q*1.5+rng.gauss(0,1.4))));
    s.ptd=Math.max(0,Math.round(pass/7*R(0.55,1.0)+ (q>1?rng.r():0)));
    s.int=Math.max(0,Math.round(R(0,1.9)-q*0.55+(won?-0.2:0.35)));
  } else if(pos==="RB"){
    s.car=Math.max(4,Math.round(R(13,23)+(won?4:-3)));
    s.ryd=Math.max(-5,Math.round(s.car*(3.9+q*0.85+rng.gauss(0,0.9))));
    s.rtd=Math.max(0,Math.round(run/7*R(0.45,0.95)));
  } else if(pos==="WR"||pos==="WR2"){
    const share=pos==="WR"?R(0.26,0.38):R(0.15,0.24);
    s.rec=Math.max(0,Math.round(R(3,9)*(0.8+q*0.22)));
    s.cyd=Math.max(0,Math.round(s.rec*(12.8+q*2.4+rng.gauss(0,2))));
    s.ctd=Math.max(0,Math.round(pass/7*share*R(0.8,1.6)));
  } else if(pos==="OT"){
    s.pan=Math.max(0,Math.round(R(2,7)+q*2));
    s.ska=Math.max(0,Math.round(R(0,2.2)-q*0.6));
  } else if(pos==="EDGE"){
    s.tkl=Math.max(0,Math.round(R(2,5.5)+q*0.7));
    s.sck=(rng.r()<0.34+q*0.15?1:0)+(rng.r()<0.09+q*0.06?1:0);
    s.tfl=s.sck+(rng.r()<0.30+q*0.12?1:0);
  } else if(pos==="DT"){
    s.tkl=Math.max(0,Math.round(R(2,5)+q*0.6));
    s.sck=(rng.r()<0.20+q*0.09?1:0);
    s.tfl=s.sck+(rng.r()<0.24+q*0.10?1:0);
  } else if(pos==="LB"){
    s.tkl=Math.max(1,Math.round(R(5,11)+q*1.3));
    s.tfl=(rng.r()<0.42+q*0.15?1:0)+(rng.r()<0.10+q*0.05?1:0);
    s.pd=(rng.r()<0.28+q*0.09?1:0);
  } else {                                   // CB, S
    s.tkl=Math.max(0,Math.round(R(2,6)+q*0.6));
    s.pd=(rng.r()<0.42+q*0.14?1:0)+(rng.r()<0.14+q*0.07?1:0);
    s.ints=(rng.r()<0.155+q*0.055?1:0);
  }
  return s;
}

function addStats(dst,src){
  dst.g=(dst.g||0)+1;
  Object.keys(src).forEach(k=>dst[k]=(dst[k]||0)+src[k]);
}

/* Human-readable season line. */
function statLine(pos,s){
  if(!s||!s.g)return "";
  const n=x=>x.toLocaleString();
  if(pos==="QB")return `${n(s.pyd)} yds, ${s.ptd} TD, ${s.int} INT (${s.cmp}/${s.att})`;
  if(pos==="RB")return `${n(s.ryd)} yds, ${s.rtd} TD (${s.car} car)`;
  if(pos==="WR"||pos==="WR2")return `${s.rec} rec, ${n(s.cyd)} yds, ${s.ctd} TD`;
  if(pos==="OT")return `${s.pan} pancakes, ${s.ska} sacks allowed`;
  if(pos==="EDGE"||pos==="DT")return `${s.tkl} tkl, ${s.sck} sacks, ${s.tfl} TFL`;
  if(pos==="LB")return `${s.tkl} tkl, ${s.tfl} TFL, ${s.pd} PD`;
  return `${s.tkl} tkl, ${s.ints} INT, ${s.pd} PD`;
}

/* Heisman weight, now built from what a player actually did. */
function statProd(pos,s){
  if(!s||!s.g)return 0;
  if(pos==="QB")  return s.pyd*0.042 + s.ptd*4.4 - s.int*3.0;
  if(pos==="RB")  return s.ryd*0.062 + s.rtd*4.6;
  if(pos==="WR")  return s.cyd*0.060 + s.ctd*4.6 + s.rec*0.32;
  if(pos==="WR2") return s.cyd*0.046 + s.ctd*3.4;
  if(pos==="OT")  return s.pan*0.55 - s.ska*0.9;
  if(pos==="EDGE")return s.sck*5.2 + s.tfl*1.9 + s.tkl*0.30;
  if(pos==="DT")  return s.sck*4.6 + s.tfl*1.7 + s.tkl*0.28;
  if(pos==="LB")  return s.tkl*0.55 + s.tfl*2.1 + s.pd*1.1;
  return s.ints*7.2 + s.pd*1.7 + s.tkl*0.38;
}

