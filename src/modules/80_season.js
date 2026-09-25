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
    this.poll=new Poll(Object.assign({},u.perceived));
    this.sched=buildSchedule(this.rng,u.perceived,u.year);
    this.rec={};this.confrec={};
    NAMES.forEach(t=>{this.rec[t]=[0,0];this.confrec[t]=[0,0]});
    this.step=0; this.weeks=[]; this.champs={}; this.titles=[];
    this.field=[]; this.seeds={}; this.selRec={}; this.notes={};
    this.rounds={r1:[],qf:[],sf:[],fin:[]}; this.champion=null; this.firstOut=[];
    this.bowls=[]; this.bowlPairs=null; this.userTeam=null; this.featured=null;
    this.hfa={}; NAMES.forEach(t=>this.hfa[t]=homeField(u,t));
    // staff apply during the season, so a mid-year change actually does something
    this.staffAdj={}; NAMES.forEach(t=>this.staffAdj[t]=staffElo(u,t));
    this.oc=u.oc?JSON.parse(JSON.stringify(u.oc)):null;
    this.dc=u.dc?JSON.parse(JSON.stringify(u.dc)):null;
    this.midFired={}; this._u=u; this.plan="balanced"; this.planLog={};
  }
  get phase(){
    if(this.step<LEAGUE.weeks)return "week";
    if(this.step===LEAGUE.weeks)return "titles";
    if(this.step===LEAGUE.weeks+1)return "selection";
    if(this.step===LEAGUE.weeks+2)return "bowls";
    if(this.step===LEAGUE.weeks+3)return "r1";
    if(this.step===LEAGUE.weeks+4)return "qf";
    if(this.step===LEAGUE.weeks+5)return "sf";
    if(this.step===LEAGUE.weeks+6)return "final";
    return "done";
  }
  buttonLabel(){
    switch(this.phase){
      case "week":return `Play Week ${this.step+1}`;
      case "titles":return "Play Conference Championships";
      case "selection":return "Selection Show";
      case "bowls":return "Play Bowl Season";
      case "r1":return "Play First Round";
      case "qf":return "Play Quarterfinals";
      case "sf":return "Play Semifinals";
      case "final":return "Play National Championship";
      default:return "Enter the offseason";
    }
  }
  rankMap(){return this.poll.rankMap()}
  /* The exact home/away pairing for the user's next postseason game, matching
     how each round actually resolves, so it can be played out live. */
  postMatchup(team){
    const p=this.phase;
    if(p==="titles"){
      const c=CONF[team]; if(c==="IND")return null;
      const rank=(x,y)=>{
        const px=this.confrec[x][0]/Math.max(1,this.confrec[x][0]+this.confrec[x][1]);
        const py=this.confrec[y][0]/Math.max(1,this.confrec[y][0]+this.confrec[y][1]);
        return py-px||this.confrec[y][0]-this.confrec[x][0]||this.elo[y]-this.elo[x];
      };
      const mem=this.titleField(c,rank);
      if(mem[0]!==team&&mem[1]!==team)return null;
      return {home:mem[0],away:mem[1],neutral:true,label:LEAGUE.conf.names[c]+" Championship"};
    }
    if(p==="bowls"){
      const pr=(this.bowlPairs||[]).find(x=>x.a===team||x.b===team);
      if(!pr)return null;
      return {home:pr.a,away:pr.b,neutral:true,label:pr.name};
    }
    if(p==="r1"){
      const sd=this.seeds[team]; if(!sd||sd<=4)return null;
      const pair=[[5,12],[6,11],[7,10],[8,9]].find(x=>x[0]===sd||x[1]===sd);
      if(!pair)return null;
      return {home:this.field[pair[0]-1],away:this.field[pair[1]-1],neutral:false,
              label:"First Round"};
    }
    if(p==="qf"){
      const w={}; this.rounds.r1.forEach(g=>{w[Math.min(g.hseed,g.aseed)]=g.winner});
      const map=[["Rose Bowl",1,8],["Sugar Bowl",2,7],["Fiesta Bowl",3,6],["Peach Bowl",4,5]];
      for(const m of map){
        const h=this.field[m[1]-1], a=w[m[2]];
        if(h===team||a===team)return {home:h,away:a,neutral:true,label:m[0]};
      }
      return null;
    }
    if(p==="sf"){
      const q=this.rounds.qf.map(g=>g.winner);
      if(q.indexOf(team)<0)return null;
      const o=q.slice().sort((a,b)=>this.seeds[a]-this.seeds[b]);
      if(team===o[0]||team===o[3])return {home:o[0],away:o[3],neutral:true,label:"Cotton Bowl"};
      return {home:o[1],away:o[2],neutral:true,label:"Orange Bowl"};
    }
    if(p==="final"){
      const f=this.rounds.sf.map(g=>g.winner).sort((a,b)=>this.seeds[a]-this.seeds[b]);
      if(f.indexOf(team)<0)return null;
      return {home:f[0],away:f[1],neutral:true,label:"National Championship"};
    }
    return null;
  }

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
  /* Who plays for a conference title: division winners where divisions exist,
     otherwise the top two in the table. */
  titleField(c,rank){
    const all=NAMES.filter(t=>CONF[t]===c);
    if(hasDivisions(c)){
      const names=divisionNames(c);
      const winners=names.map(dn=>
        all.filter(t=>divisionOf(this._u||null,t)===dn).sort(rank)[0]).filter(Boolean);
      if(winners.length>=2)return winners.slice(0,2);
    }
    return all.slice().sort(rank);
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
    else if(p==="titles")this._titles();
    else if(p==="selection")this._select();
    else if(p==="bowls")this._bowls();
    else if(p==="r1")this._r1();
    else if(p==="qf")this._qf();
    else if(p==="sf")this._sf();
    else if(p==="final")this._final();
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
    this._award(w,out);
    this.talent.advance(w+1);
    out.sort((a,b)=>Math.min(a.hrank,a.arank)-Math.min(b.hrank,b.arank));
    this.weeks.push({label:`Week ${w+1}`,date:LEAGUE.dates[w],games:out,
      poll:this.top25(prev),standings:this.standings(prev)});
  }
  _titles(){
    const prev=this.rankMap();
    LEAGUE.conf.order.forEach(c=>{
      const rank=(x,y)=>{
        const px=this.confrec[x][0]/Math.max(1,this.confrec[x][0]+this.confrec[x][1]);
        const py=this.confrec[y][0]/Math.max(1,this.confrec[y][0]+this.confrec[y][1]);
        return py-px || this.confrec[y][0]-this.confrec[x][0] || this.elo[y]-this.elo[x];
      };
      const mem=this.titleField(c,rank);
      const r=this._resolve(mem[0],mem[1],true,{conf:true,title:LEAGUE.conf.names[c]+" Championship"});
      r.hrank=prev[mem[0]];r.arank=prev[mem[1]];
      r.hrec=this.rec[mem[0]][0]+"-"+this.rec[mem[0]][1];
      r.arec=this.rec[mem[1]][0]+"-"+this.rec[mem[1]][1];
      this.champs[c]=r.winner; this.titles.push(r);
    });
    this.poll.update(this.titles,this.elo);
    this.weeks.push({label:"Championship Week",date:"Dec 5",games:this.titles,
      poll:this.top25(prev),standings:this.weeks[this.weeks.length-1].standings});
  }
  allConfAll(){
    const out={};
    LEAGUE.conf.order.forEach(c=>{out[c]=this.allConference(c)});
    return out;
  }
  _select(){
    const order=this.poll.order(), rk={};order.forEach((t,i)=>rk[t]=i+1);
    const f=[];
    LEAGUE.playoff.autoBids.forEach(c=>{f.push(this.champs[c]);
      this.notes[this.champs[c]]=LEAGUE.conf.names[c]+" champion"});
    const g6=LEAGUE.conf.autoBidPool.map(c=>this.champs[c]).sort((a,b)=>rk[a]-rk[b])[0];
    f.push(g6); this.notes[g6]=LEAGUE.conf.names[CONF[g6]]+" champion";
    const ind=LEAGUE.playoff.independent;
    if(rk[ind.team]<=ind.withinRank&&f.indexOf(ind.team)<0){
      f.push(ind.team);this.notes[ind.team]=ind.note}
    for(const t of order){if(f.length>=LEAGUE.playoff.size)break;
      if(f.indexOf(t)<0){f.push(t);if(!this.notes[t])this.notes[t]="At-large"}}
    f.sort((a,b)=>rk[a]-rk[b]);
    this.field=f; f.forEach((t,i)=>this.seeds[t]=i+1);
    this.cfpRank=rk;
    NAMES.forEach(t=>this.selRec[t]=this.rec[t][0]+"-"+this.rec[t][1]);
    this.firstOut=order.filter(t=>f.indexOf(t)<0).slice(0,4);
    this.pairBowls();
  }
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
  }
  heisman(n){
    if(!this.roster)return [];
    const all=[];
    NAMES.forEach(t=>this.roster[t].forEach((pl,i)=>{
      if(pl&&(pl.st||0)>=6)all.push({t:t,n:pl.n,p:pl.p,r:pl.r,c:pl.c,
        prod:pl.prod||0,line:statLine(pl.p,pl.st2),
        rec:this.rec[t][0]+"-"+this.rec[t][1]});
    }));
    all.sort((a,b)=>b.prod-a.prod);
    return all.slice(0,n||10);
  }
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
  /* Matchups are announced on Selection Day; the games come later. */
  pairBowls(){
    const rk=this.poll.rankMap();
    const pool=NAMES.filter(t=>this.rec[t][0]>=6 && this.field.indexOf(t)<0)
                    .sort((a,b)=>rk[a]-rk[b]);
    const pairs=[]; let bi=0;
    while(pool.length>=2 && bi<LEAGUE.bowls.length){
      const a=pool.shift();
      let j=0;
      for(let k=0;k<Math.min(6,pool.length);k++){
        if(CONF[pool[k]]!==CONF[a]){j=k;break}
      }
      const b=pool.splice(j,1)[0];
      pairs.push({name:LEAGUE.bowls[bi++],a:a,b:b,
                  ra:this.rec[a][0]+"-"+this.rec[a][1],
                  rb:this.rec[b][0]+"-"+this.rec[b][1],
                  rka:rk[a],rkb:rk[b]});
    }
    this.bowlPairs=pairs;
    this.snubbed=pool.slice();
  }

  _bowls(){
    (this.bowlPairs||[]).forEach(p=>{
      const g=this._resolve(p.a,p.b,true,{title:p.name,bowl:true});
      g.hrank=p.rka;g.arank=p.rkb;g.hrec=p.ra;g.arec=p.rb;
      this.bowls.push(g);
    });
    this.poll.update(this.bowls,this.elo);
  }

  myBowl(team){return this.bowls.find(g=>g.home===team||g.away===team)||null}
  /* What the user's team faces next once the regular season is over.
     Every one of these is determined the moment the previous round ends. */
  postNext(team){
    const p=this.phase;
    if(p==="titles"){
      const c=CONF[team]; if(c==="IND")return null;
      const rk2=(x,y)=>{
        const px=this.confrec[x][0]/Math.max(1,this.confrec[x][0]+this.confrec[x][1]);
        const py=this.confrec[y][0]/Math.max(1,this.confrec[y][0]+this.confrec[y][1]);
        return py-px||this.confrec[y][0]-this.confrec[x][0]||this.elo[y]-this.elo[x];
      };
      const mem=this.titleField(c,rk2);
      if(mem[0]===team||mem[1]===team)
        return {label:LEAGUE.conf.names[c]+" Championship",
                opp:mem[0]===team?mem[1]:mem[0],neutral:true};
      return null;
    }
    if(p==="bowls"){
      const pr=(this.bowlPairs||[]).find(x=>x.a===team||x.b===team);
      if(!pr)return null;
      return {label:pr.name,opp:pr.a===team?pr.b:pr.a,neutral:true};
    }
    const sd=this.seeds[team];
    if(!sd)return null;
    if(p==="r1"){
      if(sd<=4)return null;
      const opp={5:12,12:5,6:11,11:6,7:10,10:7,8:9,9:8}[sd];
      return {label:"First Round",opp:this.field[opp-1],
              neutral:false,home:sd<opp};
    }
    if(p==="qf"){
      const w={}; this.rounds.r1.forEach(g=>w[Math.min(g.hseed,g.aseed)]=g.winner);
      const map=[[1,8,"Rose Bowl"],[2,7,"Sugar Bowl"],[3,6,"Fiesta Bowl"],[4,5,"Peach Bowl"]];
      for(const m of map){
        const a=this.field[m[0]-1], b=w[m[1]];
        if(a===team&&b)return {label:m[2],opp:b,neutral:true};
        if(b===team)return {label:m[2],opp:a,neutral:true};
      }
      return null;
    }
    if(p==="sf"){
      const q=this.rounds.qf.map(g=>g.winner);
      if(q.indexOf(team)<0)return null;
      const o=q.slice().sort((a,b)=>this.seeds[a]-this.seeds[b]);
      if(team===o[0])return {label:"Cotton Bowl",opp:o[3],neutral:true};
      if(team===o[3])return {label:"Cotton Bowl",opp:o[0],neutral:true};
      if(team===o[1])return {label:"Orange Bowl",opp:o[2],neutral:true};
      if(team===o[2])return {label:"Orange Bowl",opp:o[1],neutral:true};
      return null;
    }
    if(p==="final"){
      const f=this.rounds.sf.map(g=>g.winner);
      if(f.indexOf(team)<0)return null;
      return {label:"National Championship",opp:f.find(x=>x!==team),neutral:true};
    }
    return null;
  }
  _br(a,b,neutral,site){
    const r=this._resolve(a,b,neutral,{site:site});
    r.hseed=this.seeds[a];r.aseed=this.seeds[b];
    r.hrec=this.rec[a][0]+"-"+this.rec[a][1];
    r.arec=this.rec[b][0]+"-"+this.rec[b][1];
    return r;
  }
  _r1(){
    [[5,12],[6,11],[7,10],[8,9]].forEach(([h,l])=>
      this.rounds.r1.push(this._br(this.field[h-1],this.field[l-1],false,
        "at "+this.field[h-1])));
    this.poll.update(this.rounds.r1,this.elo);
  }
  _qf(){
    const w={};this.rounds.r1.forEach(g=>{w[Math.min(g.hseed,g.aseed)]=g.winner});
    [["Rose Bowl",1,8],["Sugar Bowl",2,7],["Fiesta Bowl",3,6],["Peach Bowl",4,5]]
      .forEach(([bowl,top,key])=>{
        this.rounds.qf.push(this._br(this.field[top-1],w[key],true,bowl))});
    this.poll.update(this.rounds.qf,this.elo);
  }
  _sf(){
    const q=this.rounds.qf.map(g=>g.winner);
    const s=q.slice().sort((a,b)=>this.seeds[a]-this.seeds[b]);
    this.rounds.sf.push(this._br(s[0],s[3],true,"Cotton Bowl"));
    this.rounds.sf.push(this._br(s[1],s[2],true,"Orange Bowl"));
    this.poll.update(this.rounds.sf,this.elo);
  }
  _final(){
    const f=this.rounds.sf.map(g=>g.winner)
      .sort((a,b)=>this.seeds[a]-this.seeds[b]);
    const g=this._br(f[0],f[1],true,"Allegiant Stadium, Las Vegas");
    this.rounds.fin.push(g); this.champion=g.winner;
    this.poll.update([g],this.elo);
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

