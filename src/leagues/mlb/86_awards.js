/* ============ awards: pro football ============ */
/* The MVP race, and one All-Pro team across the whole league. */
extendSeason({
  _award(w,games){
    if(!this.roster)return;
    const played={}; games.forEach(g=>{played[g.winner]=1;played[g.loser]=1});
    NAMES.forEach(t=>{
      if(!played[t])return;                            // bye week
      const wp=this.rec[t][0]/Math.max(1,this.rec[t][0]+this.rec[t][1]);
      this.roster[t].forEach((pl,i)=>{
        if(!pl||!pl.st2||!pl.st2.g)return;
        const P=POS[i%POS.length];
        pl.st=pl.st2.g;
        // MVP voters want production on a winning team even more than Heisman voters
        pl.prod=statProd(P.p,pl.st2)*LEAGUE.awards.weights[P.p]*(0.55+wp*0.9);
      });
    });
  },
  mvpRace(n){
    if(!this.roster)return [];
    const all=[];
    NAMES.forEach(t=>this.roster[t].forEach((pl,i)=>{
      if(pl&&(pl.st||0)>=8)all.push({t:t,n:pl.n,p:pl.p,r:pl.r,c:pl.c,
        prod:pl.prod||0,line:statLine(pl.p,pl.st2),rec:this.rec[t][0]+"-"+this.rec[t][1]});
    }));
    // measured against the position: production over the typical production
    // of that position's best eight, then the voters' premium for the
    // position (LEAGUE.awards.premium). By raw production a quarterback won
    // every year (passing yards dwarf everything); real voters pick one about
    // nine years in ten.
    const scale={}, P=LEAGUE.awards.premium||{};
    [...new Set(all.map(x=>x.p))].forEach(p=>{const top=all.filter(x=>x.p===p).map(x=>x.prod).sort((a,b)=>b-a).slice(0,8);
      scale[p]=top.length?top.reduce((a,b)=>a+b,0)/top.length:1});
    all.forEach(x=>x.score=x.prod/Math.max(1e-9,scale[x.p])*(P[x.p]||1));
    all.sort((a,b)=>b.score-a.score);
    return all.slice(0,n||10);
  },
  allConference(){
    if(!this.roster)return [];
    return POS.map((P,i)=>{
      const best=NAMES.map(t=>({t:t,pl:this.roster[t][i]}))
        .sort((a,b)=>(b.pl.prod||0)-(a.pl.prod||0))[0];
      return {pos:P.p,team:best.t,n:best.pl.n,r:best.pl.r,c:best.pl.c};
    });
  },
  allConfAll(){return {ALL:this.allConference()}},
  awardTeam(my){return {group:"ALL",list:this.allConference()}}
});
LEAGUE.awards.teamLabel=()=>"All-Pro";
