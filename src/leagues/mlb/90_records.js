/* ============ the franchise record book: pro baseball ============ */
/* Everyone who leaves a franchise, by retirement, release or free agency,
   is written into its book. Greats are ranked by peak rating; the leaders
   by career totals with the franchise. */
function nflCareerLine(a){
  if(a.line)return a.line;
  const c=a.car, yrs=`${a.yrs} season${a.yrs===1?"":"s"}`;
  if(!c)return yrs;
  const n=x=>(x||0).toLocaleString();
  if(a.p==="CL")return c.sv?`${nOf(n(c.sv),"save")} in ${yrs}`:yrs;
  if(isPitcher(a.p))return c.w||c.k?`${n(c.w)}-${n(c.l)}, ${n(c.k)} strikeouts in ${yrs}`:yrs;
  return c.h?`${nOf(n(c.h),"hit")}, ${nOf(n(c.hr),"home run")}, ${n(c.rbi)} RBI in ${yrs}`:yrs;
}
const NFL_LEADERS=[
  {k:"h",label:"Hits"},{k:"hr",label:"Home runs"},{k:"rbi",label:"RBI"},
  {k:"w",label:"Wins"},{k:"k",label:"Strikeouts"},{k:"sv",label:"Saves"}
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
