/* ============ poll: college basketball ============ */
/* The league's ranking. The core asks any ranking for order(), rankMap() and
   update(results, elo); college football's is a voters' poll. */
/* Basketball voters weigh losses less than football's: the best teams lose
   five to eight times over thirty games. Each game date moves the poll less. */
const INERTIA=0.82,ELO_PULL=0.10,L_UNR=-30,L_RNK=-12,L_T10=-5,
      W_T10=28,W_RNK=15,W_UNR=2,BLOWOUT=6,IDLE=0;
const LOSS_TIER=22;
class Poll{
  constructor(pre){this.s=Object.assign({},pre);this.L={};NAMES.forEach(t=>this.L[t]=0)}
  eff(t){return this.s[t]-(this.L[t]||0)*LOSS_TIER}
  /* 365 teams: the order is sorted once and kept until the poll changes */
  order(){
    if(!this._ord){const e={}; NAMES.forEach(t=>e[t]=this.eff(t)); this._ord=NAMES.slice().sort((a,b)=>e[b]-e[a])}
    return this._ord.slice();
  }
  rankMap(){
    if(!this._rm){const m={}; this.order().forEach((t,i)=>m[t]=i+1); this._rm=m}
    return Object.assign({},this._rm);
  }
  _dirty(){this._ord=null;this._rm=null}
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
    this._dirty();
    // a ranked team that won doesn't drop: it keeps at least its old spot
    const winners=new Set(res.map(r=>r.winner));
    const nr=this.rankMap(), o=this.order();
    winners.forEach(t=>{
      if((prev[t]||999)<=25 && (nr[t]||999)>prev[t]){
        const ref=o[prev[t]-1];
        if(ref&&ref!==t)this.s[t]=this.eff(ref)+(this.L[t]||0)*LOSS_TIER+0.5;
      }
    });
    this._dirty();
    return this.rankMap();
  }
}
LEAGUE.Ranking=Poll;
