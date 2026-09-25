/* ============ Season state machine ============ */
class Season{
  constructor(u,seed){
    this.rng=new RNG(seed);
    this.year=u.year;
    this.elo=Object.assign({},u.perceived);
    this.preseason=Object.assign({},u.perceived);
    this.roster=u.roster?JSON.parse(JSON.stringify(u.roster)):null;
    const ph=(u.phil&&PHILOSOPHY[u.phil])?PHILOSOPHY[u.phil].elo:0;
    const tb=Object.assign({},u.trueBase);
    NAMES.forEach(t=>{tb[t]=(tb[t]||0)});   // staff already folded in at the offseason
    if(u.userTeam&&ph)tb[u.userTeam]=(tb[u.userTeam]||0)+ph;
    this.featCost=0;
    this.talent=new Talent(this.rng,tb,this.roster);
    this.poll=new LEAGUE.Ranking(Object.assign({},u.perceived));
    this.sched=buildSchedule(this.rng,u.perceived,u.year);
    this.rec={};this.confrec={};
    NAMES.forEach(t=>{this.rec[t]=[0,0];this.confrec[t]=[0,0]});
    this.step=0; this.weeks=[]; this.champion=null;
    LEAGUE.post.init(this);                // the league's postseason state
    this.userTeam=null; this.featured=null;
    this.hfa={}; NAMES.forEach(t=>this.hfa[t]=homeField(u,t));
    // staff apply during the season, so a mid-year change actually does something
    this.staffAdj={}; NAMES.forEach(t=>this.staffAdj[t]=staffElo(u,t));
    this.oc=u.oc?JSON.parse(JSON.stringify(u.oc)):null;
    this.dc=u.dc?JSON.parse(JSON.stringify(u.dc)):null;
    this.midFired={}; this._u=u; this.plan="balanced"; this.planLog={};
  }
  /* The regular season is the core's; everything after it is the league's,
     one phase per step, in the order LEAGUE.post.phases gives. */
  get phase(){
    if(this.step<LEAGUE.weeks)return "week";
    return LEAGUE.post.phases[this.step-LEAGUE.weeks]||"done";
  }
  rankMap(){return this.poll.rankMap()}
  /* The two effective ratings for a scheduled game, so it can be played live. */
  matchupElo(g,plan){
    const a=g.home,b=g.away,neutral=g.neutral;
    const w=Math.min(this.step,LEAGUE.weeks);
    const P=PLANS[plan]||PLANS.balanced;
    let edge=0;
    if(this.userTeam===a||this.userTeam===b)
      edge=(this.userTeam===a?1:-1)*P.edge;
    if(this.featured!==null&&this.featured!==undefined&&this.roster){
      const pl=this.roster[this.userTeam]&&this.roster[this.userTeam][this.featured];
      const hurt=this.talent.active(this.userTeam).some(x=>x.idx===this.featured);
      if(pl&&!hurt)edge+=(this.userTeam===a?1:-1)*FEATURE_EDGE;
    }
    const venue=neutral?0:((this.hfa&&this.hfa[a])||LEAGUE.tuning.hfa)-LEAGUE.tuning.hfa;
    return {
      h:this.talent.eff(a,w)+(this.staffAdj[a]||0)+(neutral?0:LEAGUE.tuning.hfa)+venue+edge,
      a:this.talent.eff(b,w)+(this.staffAdj[b]||0)
    };
  }
  /* Make a change now: the interim is worse, and you hire properly in the offseason. */
  fireCoordinator(team,side){
    const st=side==="oc"?this.oc:this.dc;
    if(!st||!st[team]||this.midFired[side])return false;
    const old=st[team];
    // an interim is replacement level: a step down from anyone decent,
    // a genuine upgrade on someone who is drowning
    st[team]={n:"Interim staff", q:INTERIM_Q, t:0, s:old.s, interim:true, was:old.n};
    this.staffAdj[team]=(this.oc&&this.dc&&this.oc[team]&&this.dc[team])
      ? (this.oc[team].q*OFF_SHARE+this.dc[team].q*DEF_SHARE)*STAFF_ELO
      : this.staffAdj[team];
    this.midFired[side]=true;
    return true;
  }
  _resolve(a,b,neutral,extra){
    let sd=1, edge=0;
    if(this.userTeam===a||this.userTeam===b){
      const P=PLANS[this.plan]||PLANS.balanced;
      sd=P.sd;
      edge=(this.userTeam===a?1:-1)*P.edge;
      this.planLog[this.step]=this.plan;
      // a featured player gets the ball more, and it shows on Saturdays
      if(this.featured!==null&&this.featured!==undefined&&this.roster){
        const pl=this.roster[this.userTeam][this.featured];
        const hurt=this.talent.active(this.userTeam).some(x=>x.idx===this.featured);
        if(pl&&!hurt)edge+=(this.userTeam===a?1:-1)*FEATURE_EDGE;
      }
    }
    const venue=neutral?0:((this.hfa&&this.hfa[a])||LEAGUE.tuning.hfa)-LEAGUE.tuning.hfa;
    const w=Math.min(this.step,LEAGUE.weeks);
    const eloH=this.talent.eff(a,w)+(this.staffAdj[a]||0)+(neutral?0:LEAGUE.tuning.hfa)+venue+edge;
    const eloA=this.talent.eff(b,w)+(this.staffAdj[b]||0);
    const isUser=(this.userTeam===a||this.userTeam===b);
    const plan=PLANS[this.plan]?this.plan:"balanced";
    // a game already played out live: match on the user's team so the ordering
    // a round happens to use can never lose the result
    const list=this.forcedList||(this.forced?[this.forced]:[]);
    const fi=list.findIndex(F=>(a===F.team||b===F.team)&&(a===F.other||b===F.other));
    if(fi>=0){
      const F=list[fi];
      list.splice(fi,1);
      this.forcedList=list; this.forced=null;
      const userScore = F.mine, oppScore = F.theirs;
      let fh = (a===F.team)?userScore:oppScore;
      let fa = (a===F.team)?oppScore:userScore;
      let fm = fh-fa;
      if(fm===0){ if(this.rng.r()<0.5)fh+=3; else fa+=3; fm=fh-fa; }  // should never fire
      const win=fm>0?a:b, lose=fm>0?b:a;
      const sh=eloUpdate(this.elo[win],this.elo[lose],Math.abs(fm),(win===a)&&!neutral,neutral);
      this.elo[win]+=sh; this.elo[lose]-=sh;
      this.rec[win][0]++; this.rec[lose][1]++;
      if(this.roster){
        [[a,fh,fa],[b,fa,fh]].forEach(pair=>{
          const tm=pair[0],pf=pair[1],pa2=pair[2];
          const hurt=new Set(this.talent.active(tm).map(x=>x.idx));
          POS.forEach((P,i)=>{
            const pl=hurt.has(i)?this.roster[tm][BK(i)]:this.roster[tm][i];
            if(!pl)return;
            if(!pl.st2)pl.st2=blankStats(P.p);
            const line=gameStats(this.rng,pl,i,pf,pa2,pf>pa2);
            addStats(pl.st2,line);
            pl.last={line:line,pos:P.p,week:this.step,team:tm};
          });
        });
      }
      const hf=(x,o)=>Math.max(0,Math.min(x,Math.round(x*(0.38+((x*7+o*3+fh+fa)%11)/34))));
      return Object.assign({home:a,away:b,hp:fh,ap:fa,hh:hf(fh,fa),ah:hf(fa,fh),
        neutral:neutral,winner:win,loser:lose,margin:Math.abs(fm),
        shift:Math.round(sh),drives:F.drives},extra||{});
    }
    const gs=playGame(this.rng,eloH,eloA,
      this.userTeam===a?plan:"balanced",
      this.userTeam===b?plan:"balanced",
      isUser&&this.decideHook?{decide:this.decideHook,userIsHome:this.userTeam===a}:null);
    let hp=gs.h, ap=gs.a, m=hp-ap;
    if(m===0){ if(this.rng.r()<0.5)hp+=3; else ap+=3; m=hp-ap; }   // safety net only
    this.lastDrives=gs.drives;
    if(isUser)this._userDrives=gs.drives;
    const win=m>0?a:b, lose=m>0?b:a;
    const sh=eloUpdate(this.elo[win],this.elo[lose],Math.abs(m),(win===a)&&!neutral,neutral);
    this.elo[win]+=sh;this.elo[lose]-=sh;
    this.rec[win][0]++;this.rec[lose][1]++;
    if(this.roster){
      [[a,hp,ap],[b,ap,hp]].forEach(pair=>{
        const tm=pair[0], pf=pair[1], pa=pair[2];
        const hurt=new Set(this.talent.active(tm).map(x=>x.idx));
        POS.forEach((P,i)=>{
          // an injured starter's snaps go to his backup
          const pl=hurt.has(i)?this.roster[tm][BK(i)]:this.roster[tm][i];
          if(!pl)return;
          if(!pl.st2)pl.st2=blankStats(P.p);
          const line=gameStats(this.rng,pl,i,pf,pa,pf>pa);
          addStats(pl.st2,line);
          pl.last={line:line,pos:P.p,week:this.step,team:tm};
        });
      });
    }
    const hf=(x,o)=>Math.max(0,Math.min(x,Math.round(x*(0.38+((x*7+o*3+hp+ap)%11)/34))));
    return Object.assign({home:a,away:b,hp:hp,ap:ap,
      hh:hf(hp,ap),ah:hf(ap,hp),neutral:neutral,
      winner:win,loser:lose,margin:Math.abs(m),shift:Math.round(sh)},extra||{});
  }
  advance(){
    this.prevRank=this.rankMap();
    const p=this.phase;
    if(p==="week")this._week();
    else if(p!=="done")this[LEAGUE.post.run[p]]();
    this.step++;
  }
  _week(){
    const w=this.step, prev=this.rankMap(), out=[];
    this.sched.filter(g=>g.week===w).forEach(g=>{
      const r=this._resolve(g.home,g.away,g.neutral,{conf:g.conf});
      if(g.conf){this.confrec[r.winner][0]++;this.confrec[r.loser][1]++}
      r.hrank=prev[g.home];r.arank=prev[g.away];
      r.hrec=this.rec[g.home][0]+"-"+this.rec[g.home][1];
      r.arec=this.rec[g.away][0]+"-"+this.rec[g.away][1];
      if(this.userTeam===g.home||this.userTeam===g.away)r.drives=this._userDrives;
      out.push(r);
    });
    this.poll.update(out,this.elo);
    this._award(w,out);                   // the league's awards
    this.talent.advance(w+1);
    out.sort((a,b)=>Math.min(a.hrank,a.arank)-Math.min(b.hrank,b.arank));
    this.weeks.push({label:`Week ${w+1}`,date:LEAGUE.dates[w],games:out,
      poll:this.top25(prev),standings:this.standings(prev)});
  }
  top25(prev){
    return this.poll.order().slice(0,25).map((t,i)=>({
      rank:i+1,team:t,conf:CONF[t],rec:this.rec[t][0]+"-"+this.rec[t][1],
      prev:prev?prev[t]:0,delta:prev&&prev[t]?prev[t]-(i+1):null}));
  }
  standings(prev){
    const out={};
    LEAGUE.conf.order.forEach(c=>{
      out[c]=NAMES.filter(t=>CONF[t]===c).sort((x,y)=>{
        const px=this.confrec[x][0]/Math.max(1,this.confrec[x][0]+this.confrec[x][1]);
        const py=this.confrec[y][0]/Math.max(1,this.confrec[y][0]+this.confrec[y][1]);
        return py-px||this.confrec[y][0]-this.confrec[x][0]||this.elo[y]-this.elo[x];
      }).map(t=>({team:t,cr:this.confrec[t][0]+"-"+this.confrec[t][1],
                  rec:this.rec[t][0]+"-"+this.rec[t][1],rank:prev?prev[t]:0}));
    });
    return out;
  }
  /* Fold this season's numbers into every player's career line. */
  bankCareers(u){
    // the season's box scores live on this Season's roster copy; the careers
    // they feed belong to the universe's roster, so read one and write the other
    if(!u.roster||!this.roster)return;
    NAMES.forEach(t=>{
      const live=this.roster[t]||[], keep=u.roster[t]||[];
      keep.forEach((pl,i)=>{
        if(!pl)return;
        if(pl.from===undefined||pl.from===null)pl.from=this.year-(pl.c||0);
        pl.peak=Math.max(pl.peak||0,pl.r||0);
        const src=live[i];
        if(!src||!src.st2||src.n!==pl.n)return;      // same man, same slot
        if(!pl.car){pl.car=blankStats(POS[i%POS.length].p); pl.car.yrs=0}
        addStats(pl.car,src.st2);
        pl.car.yrs=(pl.car.yrs||0)+1;
      });
    });
  }
  healthy(){const h={};NAMES.forEach(t=>h[t]=this.talent.base[t]+this.talent.slope[t]*LEAGUE.weeks);return h}
  myGame(team,wk){
    const W=this.weeks[wk]; if(!W)return null;
    return W.games.find(g=>g.home===team||g.away===team)||null;
  }
  nextGame(team){
    const g=this.sched.find(g=>g.week===this.step&&(g.home===team||g.away===team));
    return g||null;
  }
}

/* A league adds its postseason (and anything else it needs) to Season here.
   Non-enumerable, like the methods the class defines itself. */
function extendSeason(methods){
  Object.getOwnPropertyNames(methods).forEach(k=>Object.defineProperty(
    Season.prototype,k,{value:methods[k],writable:true,configurable:true,enumerable:false}));
}
