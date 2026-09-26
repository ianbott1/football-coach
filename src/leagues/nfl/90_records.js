/* ============ the franchise record book: pro football ============ */
/* Everyone who leaves a franchise, by retirement, release or free agency,
   is written into its book. Greats are ranked by peak rating. */
function nflCareerLine(a){
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
const NFL_LEADERS=[
  {k:"pyd",label:"Passing yards",pos:["QB"],re:/([\d,]+) yds,/},
  {k:"ptd",label:"Passing TD",pos:["QB"],re:/([\d,]+) TD/},
  {k:"ryd",label:"Rushing yards",pos:["RB"],re:/([\d,]+) rush yds/},
  {k:"cyd",label:"Receiving yards",pos:["WR","WR2"],re:/catches, ([\d,]+) yds/},
  {k:"sck",label:"Sacks",pos:["EDGE","DT"],re:/([\d,]+) sacks/},
  {k:"ints",label:"Interceptions",pos:["CB","S"],re:/([\d,]+) INT/}
];
function nflLeaders(u,team){
  const list=(u.alumni&&u.alumni[team])||[], out=[];
  NFL_LEADERS.forEach(cat=>{
    const pool=list.filter(a=>cat.pos.indexOf(a.p)>=0&&a.line)
      .map(a=>{const m=a.line.match(cat.re);return {a:a,v:m?+m[1].replace(/,/g,""):0}})
      .filter(x=>x.v>0).sort((x,y)=>y.v-x.v);
    if(pool.length)out.push({label:cat.label,top:pool.slice(0,3)});
  });
  return out;
}
function nflBook(u,team){
  return ((u.alumni&&u.alumni[team])||[]).slice().sort((a,b)=>b.peak-a.peak);
}
LEAGUE.records={book:nflBook, leaders:nflLeaders, alumniLine:nflCareerLine};
