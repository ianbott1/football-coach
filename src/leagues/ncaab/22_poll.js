/* ============ poll: college football ============ */
/* The league's ranking. The core asks any ranking for order(), rankMap() and
   update(results, elo); college football's is a voters' poll. */
const INERTIA=0.82,ELO_PULL=0.18,L_UNR=-52,L_RNK=-22,L_T10=-9,
      W_T10=48,W_RNK=26,W_UNR=4,BLOWOUT=10,IDLE=-3;
/* Losses are the first thing voters sort on. A two-loss team has to be a great
   deal better regarded to stay ahead of an unbeaten one. */
const LOSS_TIER=100;
class Poll{
  constructor(pre){this.s=Object.assign({},pre);this.L={};NAMES.forEach(t=>this.L[t]=0)}
  eff(t){return this.s[t]-(this.L[t]||0)*LOSS_TIER}
  order(){return NAMES.slice().sort((a,b)=>this.eff(b)-this.eff(a))}
  rankMap(){const o=this.order(),m={};o.forEach((t,i)=>m[t]=i+1);return m}
  update(res,elo){
    const prev=this.rankMap(), played=new Set(), d={};
    NAMES.forEach(t=>d[t]=0);
    res.forEach(r=>{
      const w=r.winner,l=r.loser,m=r.margin;
      this.L[l]=(this.L[l]||0)+1;
      played.add(w);played.add(l);
      const lr=prev[l]||999, wr=prev[w]||999;
      if(wr<=25||lr<=25){
        d[w]+= lr<=10?W_T10 : lr<=25?W_RNK : W_UNR;
        if(m>=21&&lr<=25)d[w]+=BLOWOUT;
      } else d[w]+=W_UNR;
      d[l]+= wr<=10?L_T10 : wr<=25?L_RNK : L_UNR;
      if(m>=21)d[l]-=8;
    });
    NAMES.forEach(t=>{
      this.s[t]=this.s[t]*INERTIA+(1-INERTIA)*this.s[t]
                +ELO_PULL*(elo[t]-this.s[t])+d[t]+(played.has(t)?0:IDLE);
    });
    const winners=new Set(res.map(r=>r.winner));
    const nr=this.rankMap();
    winners.forEach(t=>{
      if((prev[t]||999)<=25 && (nr[t]||999)>prev[t]){
        const o=this.order(), ref=o[prev[t]-1];
        if(ref&&ref!==t)this.s[t]=this.eff(ref)+(this.L[t]||0)*LOSS_TIER+0.5;
      }
    });
    return this.rankMap();
  }
}
LEAGUE.Ranking=Poll;
