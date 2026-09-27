/* ============ the franchise record book: pro basketball ============ */
/* Everyone who leaves a franchise, by retirement, release or free agency,
   is written into its book. Greats are ranked by peak rating; the leaders
   by career totals with the franchise. */
function nflCareerLine(a){
  if(a.line)return a.line;
  const c=a.car, yrs=`${a.yrs} season${a.yrs===1?"":"s"}`;
  if(!c||!c.pts)return yrs;
  const n=x=>(x||0).toLocaleString();
  const second=(a.p==="PG")?`${n(c.ast)} assists`:(a.p==="PF"||a.p==="C")?`${n(c.reb)} rebounds`:`${n(c.tpm)} threes`;
  return `${n(c.pts)} points, ${second} in ${yrs}`;
}
const NFL_LEADERS=[
  {k:"pts",label:"Points"},{k:"reb",label:"Rebounds"},{k:"ast",label:"Assists"},
  {k:"tpm",label:"Three-pointers"},{k:"blk",label:"Blocks"},{k:"stl",label:"Steals"}
];
function nflLeaders(u,team){
  const list=(u.alumni&&u.alumni[team])||[], out=[];
  NFL_LEADERS.forEach(cat=>{
    const pool=list.filter(a=>a.car&&a.car[cat.k]>0).map(a=>({a:a,v:a.car[cat.k]})).sort((x,y)=>y.v-x.v);
    if(pool.length)out.push({label:cat.label,top:pool.slice(0,3)});
  });
  return out;
}
function nflBook(u,team){
  return ((u.alumni&&u.alumni[team])||[]).slice().sort((a,b)=>b.peak-a.peak);
}
LEAGUE.records={book:nflBook, leaders:nflLeaders, alumniLine:nflCareerLine};
