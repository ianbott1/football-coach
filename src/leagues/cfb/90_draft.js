/* ============ draft night and the record book ============ */
/* Four years of development should end somewhere. Players who leave get a
   permanent entry in the program's record book, and the good ones get drafted
   in front of everybody. */


const DRAFT_ROUNDS=7, PICKS_PER_ROUND=32;

/* How good a prospect looks: what he is, plus what he did. */
function prospectScore(d, rng){
  const prod = d.car ? statProd(d.p, d.car) : 0;
  const yrs  = (d.car && d.car.yrs) ? d.car.yrs : 1;
  const perYr = prod / Math.max(1, yrs);
  const early = d.early ? 6 : 0;              // leaving early signals confidence
  const start = d.starter ? 4 : 0;
  return (d.peak||d.r)*0.82 + perYr*0.16 + early + start + rng.gauss(0,9.5);
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
    if(cap.length>40){
      cap.sort((a,b)=>{
        const ad=a.draft?a.draft.overall:9999, bd=b.draft?b.draft.overall:9999;
        return ad-bd || b.peak-a.peak;
      });
      cap.length=40;                         // the 40 most notable stay for good
    }
  });
}

/* A one-line career summary from the accumulated stat line. */
function alumniLine(a){
  if(a.line)return a.line;
  const c=a.car; if(!c)return `${a.yrs} season${a.yrs===1?"":"s"}`;
  const P=a.p, n=x=>(x||0).toLocaleString();
  if(P==="QB")   return `${n(c.pyd)} yds, ${c.ptd||0} TD, ${c.int||0} INT`;
  if(P==="RB")   return `${n(c.ryd)} rush yds, ${c.rtd||0} TD`;
  if(P==="WR"||P==="WR2") return `${c.rec||0} catches, ${n(c.cyd)} yds, ${c.ctd||0} TD`;
  if(P==="EDGE"||P==="DT") return `${c.sck||0} sacks, ${c.tkl||0} tackles`;
  if(P==="LB")   return `${c.tkl||0} tackles, ${c.tfl||0} for loss`;
  if(P==="CB"||P==="S") return `${c.ints||0} INT, ${c.pd||0} passes defended`;
  if(P==="OT")   return `${c.ska||0} sacks allowed in ${a.yrs} season${a.yrs===1?"":"s"}`;
  return `${a.yrs} season${a.yrs===1?"":"s"}`;
}

function draftLabel(d){
  if(!d)return "Undrafted";
  if(d.overall===1)return `No. 1 overall, ${d.nfl}`;
  return `Round ${d.round}, pick ${d.pick} \u2014 ${d.nfl}`;
}

/* Career leaders in the categories people actually argue about. */
const LEADER_CATS=[
  {k:"pyd", label:"Passing yards",   pos:["QB"]},
  {k:"ptd", label:"Passing TD",      pos:["QB"]},
  {k:"ryd", label:"Rushing yards",   pos:["RB"]},
  {k:"rtd", label:"Rushing TD",      pos:["RB"]},
  {k:"cyd", label:"Receiving yards", pos:["WR","WR2"]},
  {k:"rec", label:"Receptions",      pos:["WR","WR2"]},
  {k:"tkl", label:"Tackles",         pos:["EDGE","DT","LB","CB","S"]},
  {k:"sck", label:"Sacks",           pos:["EDGE","DT"]},
  {k:"ints",label:"Interceptions",   pos:["CB","S"]}
];

/* Alumni only keep a finished sentence, so the numbers are parsed back out of
   it. Cheap, and it keeps the save small. */
function leaderValue(a, cat){
  if(!a.line)return 0;
  const L=a.line;
  const grab=re=>{const m=L.match(re); return m?+m[1].replace(/,/g,""):0};
  switch(cat.k){
    case "pyd": return grab(/([\d,]+) yds,/);
    case "ptd": return grab(/([\d,]+) TD/);
    case "ryd": return grab(/([\d,]+) rush yds/);
    case "rtd": return grab(/rush yds, ([\d,]+) TD/);
    case "cyd": return grab(/catches, ([\d,]+) yds/);
    case "rec": return grab(/([\d,]+) catches/);
    case "tkl": return grab(/([\d,]+) tackles/);
    case "sck": return grab(/([\d,]+) sacks/);
    case "ints":return grab(/([\d,]+) INT/);
  }
  return 0;
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
