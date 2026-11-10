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
      const k=Math.min(1,Math.max(ga,gb)/(LEAGUE.schedule.games*0.35));   // record counts fully after a third of the season (the NFL's six of 17)
      const sa=k*this.pct(a)*400+this.form(a), sb=k*this.pct(b)*400+this.form(b);
      return sb-sa;
    });
  }
  rankMap(){const o=this.order(),m={};o.forEach((t,i)=>m[t]=i+1);return m}
  /* how good a team looks: its rating, smoothed over its last few games. One night moved a team
     several places (Grokbot: #3 at 0-0 to #14 at 4-6; #8, #9, #4 inside a playoff round; measured
     7% of weekly moves were 8+ places, against about 2 for a published power ranking) */
  form(t){ return this.sm&&this.sm[t]!==undefined?this.sm[t]:this.elo[t] }
  update(res,elo){
    this.sm=this.sm||Object.assign({},this.elo);
    res.forEach(r=>{this.w[r.winner]++; this.l[r.loser]++;
      [r.winner,r.loser].forEach(t=>{ this.sm[t]+=0.3*(elo[t]-this.sm[t]) }) });
    NAMES.forEach(t=>{this.elo[t]=elo[t]});
    return this.rankMap();
  }
}
LEAGUE.Ranking=PowerRank;
