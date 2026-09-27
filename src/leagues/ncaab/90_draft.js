/* ============ draft night and the record book ============ */
/* Four years of development should end somewhere. Players who leave get a
   permanent entry in the program's record book, and the good ones get drafted
   in front of everybody. */


const DRAFT_ROUNDS=2, PICKS_PER_ROUND=30;     // the NBA draft

/* How good a prospect looks: what he is, plus what he did. */
function prospectScore(d, rng){
  const prod = d.car ? statProd(d.p, d.car) : 0;
  const yrs  = (d.car && d.car.yrs) ? d.car.yrs : 1;
  const perYr = prod / Math.max(1, yrs);
  const early = d.early ? 6 : 0;              // leaving early signals confidence
  const start = d.starter ? 4 : 0;
  // the NBA drafts ceilings and youth: a freshman's upside beats a senior's résumé
  const upside=0.45*(d.peak||d.r)+0.55*Math.max(d.r,d.pot||d.r);
  const youth=[7,4,1.5,0][d.c===undefined?3:Math.max(0,Math.min(3,d.c))];
  return upside + youth + perYr*0.08 + early*0.5 + start*0.5 + rng.gauss(0,6);
}

/* Run the draft across every departing player in the country. */
function runDraft(u, rng, year, leavers){
  const pool=[];
  Object.keys(leavers).forEach(team=>{
    leavers[team].forEach(d=>pool.push(Object.assign({team:team},d)));
  });
  pool.forEach(d=>{d.score=prospectScore(d,rng)});
  pool.sort((a,b)=>b.score-a.score);

  const order=rng.shuffle(LEAGUE.draftTeams.slice());
  const picks=[];
  const total=DRAFT_ROUNDS*PICKS_PER_ROUND;
  for(let i=0;i<Math.min(total,pool.length);i++){
    const d=pool[i];
    const round=Math.floor(i/PICKS_PER_ROUND)+1;
    const inRound=(i%PICKS_PER_ROUND)+1;
    d.draft={round:round, pick:inRound, overall:i+1,
             nfl:order[(i+round)%order.length], year:year};
    picks.push(d);
  }
  pool.slice(total).forEach(d=>{d.draft=null});
  return {picks:picks, pool:pool};
}

/* Everyone who left, drafted or not, goes into the record book for good. */
function recordAlumni(u, year, pool){
  u.alumni=u.alumni||{};
  pool.forEach(d=>{
    const t=d.team;
    if(!t)return;
    const rec={
      n:d.n, p:d.p, from:d.from!==null&&d.from!==undefined?d.from:(year-((d.car&&d.car.yrs)||1)),
      to:year, peak:d.peak||d.r, yrs:(d.car&&d.car.yrs)||1,
      early:!!d.early, featured:!!d.featured, draft:d.draft||null
    };
    // keep the finished sentence rather than the whole stat object: a record
    // book of 132 programs over 40 seasons has to stay small enough to save
    rec.line=alumniLine({p:d.p,car:d.car,yrs:rec.yrs});
    // career totals for the program leaders (six numbers)
    if(d.car)rec.car={pts:d.car.pts||0,reb:d.car.reb||0,ast:d.car.ast||0,tpm:d.car.tpm||0,blk:d.car.blk||0,stl:d.car.stl||0};
    u.alumni[t]=u.alumni[t]||[];
    // over decades the name generator repeats itself; a program that produces
    // two Brock Guillorys gets a second-generation one rather than a duplicate
    let suffix=0;
    while(u.alumni[t].some(x=>x.n===rec.n)){
      suffix++;
      rec.n = d.n + (suffix===1?" II":suffix===2?" III":" "+(suffix+1));
    }
    u.alumni[t].push(rec);
    const cap=u.alumni[t];
    if(cap.length>25){                       // 365 programs: 25 each (the record book shows 12)
      cap.sort((a,b)=>{
        const ad=a.draft?a.draft.overall:9999, bd=b.draft?b.draft.overall:9999;
        return ad-bd || b.peak-a.peak;
      });
      cap.length=25;                         // the 25 most notable stay for good
    }
  });
}

/* A one-line career summary from the accumulated stat line. */
function alumniLine(a){
  if(a.line)return a.line;
  const c=a.car, yrs=`${a.yrs} season${a.yrs===1?"":"s"}`;
  if(!c||!c.pts)return yrs;
  const n=x=>(x||0).toLocaleString();
  const second=(a.p==="PG")?`${n(c.ast)} assists`:(a.p==="PF"||a.p==="C")?`${n(c.reb)} rebounds`:`${n(c.tpm)} threes`;
  return `${n(c.pts)} points, ${second} in ${yrs}`;
}

function draftLabel(d){
  if(!d)return "Undrafted";
  if(d.overall===1)return `No. 1 overall, ${d.nfl}`;
  return `Round ${d.round}, pick ${d.pick} \u2014 ${d.nfl}`;
}

/* Career leaders in the categories people actually argue about. */
/* program leaders: career totals, every position */
const ALL_POS=["PG","SG","SF","PF","C"];
const LEADER_CATS=[
  {k:"pts", label:"Points",       pos:ALL_POS},
  {k:"reb", label:"Rebounds",     pos:ALL_POS},
  {k:"ast", label:"Assists",      pos:ALL_POS},
  {k:"tpm", label:"Three-pointers",pos:ALL_POS},
  {k:"blk", label:"Blocks",       pos:ALL_POS},
  {k:"stl", label:"Steals",       pos:ALL_POS}
];

/* Alumni only keep a finished sentence, so the numbers are parsed back out of
   it. Cheap, and it keeps the save small. */
function leaderValue(a, cat){
  return a.car&&a.car[cat.k]?a.car[cat.k]:0;     // career totals, as recorded
}

function programLeaders(u, team){
  const list=(u.alumni&&u.alumni[team])?u.alumni[team]:[];
  const out=[];
  LEADER_CATS.forEach(cat=>{
    const pool=list.filter(a=>cat.pos.indexOf(a.p)>=0)
      .map(a=>({a:a, v:leaderValue(a,cat)}))
      .filter(x=>x.v>0)
      .sort((x,y)=>y.v-x.v);
    if(pool.length)out.push({label:cat.label, top:pool.slice(0,3)});
  });
  return out;
}

/* The best players a program has ever produced. */
function recordBook(u, team){
  const list=(u.alumni&&u.alumni[team])?u.alumni[team].slice():[];
  list.sort((a,b)=>{
    const ad=a.draft?a.draft.overall:9999, bd=b.draft?b.draft.overall:9999;
    return ad-bd || b.peak-a.peak;
  });
  return list;
}

/* The program record book, as the core's team pages read it. */
LEAGUE.records={book:recordBook, leaders:programLeaders, alumniLine:alumniLine};
