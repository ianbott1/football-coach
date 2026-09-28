/* ============ power ranking: pro football ============ */
/* No poll. Teams are ranked the way people actually rank them in the pros:
   record first, then how good they look. The core asks any ranking for
   order(), rankMap() and update(results, elo). */
class PowerRank{
  constructor(pre){
    this.elo=Object.assign({},pre); this.w={}; this.l={};
    NAMES.forEach(t=>{this.w[t]=0;this.l[t]=0});
  }
  pct(t){const g=this.w[t]+this.l[t]; return g?this.w[t]/g:0.5}
  order(){
    return NAMES.slice().sort((a,b)=>{
      const ga=this.w[a]+this.l[a], gb=this.w[b]+this.l[b];
      // early on, how good a team is outweighs a 1-0 start
      const k=Math.min(1,Math.max(ga,gb)/6);
      const sa=k*this.pct(a)*400+this.elo[a], sb=k*this.pct(b)*400+this.elo[b];
      return sb-sa;
    });
  }
  rankMap(){const o=this.order(),m={};o.forEach((t,i)=>m[t]=i+1);return m}
  update(res,elo){
    res.forEach(r=>{this.w[r.winner]++; this.l[r.loser]++});
    NAMES.forEach(t=>{this.elo[t]=elo[t]});
    return this.rankMap();
  }
}
LEAGUE.Ranking=PowerRank;
