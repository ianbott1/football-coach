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
      const k=Math.min(1,Math.max(ga,gb)/10);
      const sa=k*this.pct(a)*400+this.elo[a], sb=k*this.pct(b)*400+this.elo[b];
      return sb-sa;
    });
  }
  rankMap(){const o=this.order(),m={};o.forEach((t,i)=>m[t]=i+1);return m}
  update(res,elo){
    res.forEach(r=>{this.w[r.winner]++; this.l[r.loser]++});
    // how good a team looks moves a third of the way each week: #8 to #23 after one one-score loss, then #13,
    // read as noise (Instinct). Week-to-week moves, weeks 1-6: 6.5 5.3 4.8 3.2 2.9 2.7 places a team, now 4.7 3.5 3.4 2.5 2.0 1.9
    NAMES.forEach(t=>{this.elo[t]+=0.35*(elo[t]-this.elo[t])});
    return this.rankMap();
  }
}
LEAGUE.Ranking=PowerRank;
