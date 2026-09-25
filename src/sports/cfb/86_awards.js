/* ============ awards: college football ============ */
/* The Heisman race and the all-conference teams. The core calls _award after
   every week's games; mvpRace(n) is the award race, best first. */
extendSeason({
  allConfAll(){
    const out={};
    LEAGUE.conf.order.forEach(c=>{out[c]=this.allConference(c)});
    return out;
  },
  _award(w,games){
    if(!this.roster)return;
    const won={};
    games.forEach(g=>{won[g.winner]=1;won[g.loser]=0});
    NAMES.forEach(t=>{
      if(won[t]===undefined)return;                    // bye week
      const wp=this.rec[t][0]/Math.max(1,this.rec[t][0]+this.rec[t][1]);
      this.roster[t].forEach((pl,i)=>{
        if(!pl||!pl.st2||!pl.st2.g)return;
        const P=POS[i%POS.length];
        pl.st=pl.st2.g;
        // voters reward production, and reward it more on a winning team
        pl.prod=statProd(P.p,pl.st2)*P.aw*(0.72+wp*0.52);
      });
    });
  },
  mvpRace(n){
    if(!this.roster)return [];
    const all=[];
    NAMES.forEach(t=>this.roster[t].forEach((pl,i)=>{
      if(pl&&(pl.st||0)>=6)all.push({t:t,n:pl.n,p:pl.p,r:pl.r,c:pl.c,
        prod:pl.prod||0,line:statLine(pl.p,pl.st2),
        rec:this.rec[t][0]+"-"+this.rec[t][1]});
    }));
    all.sort((a,b)=>b.prod-a.prod);
    return all.slice(0,n||10);
  },
  allConference(conf){
    if(!this.roster)return [];
    const out=[];
    POS.forEach((P,i)=>{
      const best=NAMES.filter(t=>CONF[t]===conf)
        .map(t=>({t:t,pl:this.roster[t][i]}))
        .sort((a,b)=>(b.pl.prod||0)-(a.pl.prod||0))[0];
      if(best)out.push({pos:P.p,team:best.t,n:best.pl.n,r:best.pl.r,c:best.pl.c});
    });
    return out;
  }
});
