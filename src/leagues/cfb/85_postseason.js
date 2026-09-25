/* ============ postseason: college football ============ */
/* Conference championship week, the selection show, bowl season and a
   twelve-team playoff. The core Season plays the regular season and hands
   every later step to the phase named here. */
LEAGUE.post={
  phases:["titles","selection","bowls","r1","qf","sf","final"],
  run:{titles:"_titles",selection:"_select",bowls:"_bowls",
       r1:"_r1",qf:"_qf",sf:"_sf",final:"_final"},
  init(sea){
    sea.champs={}; sea.titles=[];
    sea.field=[]; sea.seeds={}; sea.selRec={}; sea.notes={};
    sea.rounds={r1:[],qf:[],sf:[],fin:[]}; sea.firstOut=[];
    sea.bowls=[]; sea.bowlPairs=null;
  }
};

extendSeason({
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
  _bowls(){
    (this.bowlPairs||[]).forEach(p=>{
      const g=this._resolve(p.a,p.b,true,{title:p.name,bowl:true});
      g.hrank=p.rka;g.arank=p.rkb;g.hrec=p.ra;g.arec=p.rb;
      this.bowls.push(g);
    });
    this.poll.update(this.bowls,this.elo);
  },
  myBowl(team){return this.bowls.find(g=>g.home===team||g.away===team)||null},
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
  },
  _br(a,b,neutral,site){
    const r=this._resolve(a,b,neutral,{site:site});
    r.hseed=this.seeds[a];r.aseed=this.seeds[b];
    r.hrec=this.rec[a][0]+"-"+this.rec[a][1];
    r.arec=this.rec[b][0]+"-"+this.rec[b][1];
    return r;
  },
  _r1(){
    [[5,12],[6,11],[7,10],[8,9]].forEach(([h,l])=>
      this.rounds.r1.push(this._br(this.field[h-1],this.field[l-1],false,
        "at "+this.field[h-1])));
    this.poll.update(this.rounds.r1,this.elo);
  },
  _qf(){
    const w={};this.rounds.r1.forEach(g=>{w[Math.min(g.hseed,g.aseed)]=g.winner});
    [["Rose Bowl",1,8],["Sugar Bowl",2,7],["Fiesta Bowl",3,6],["Peach Bowl",4,5]]
      .forEach(([bowl,top,key])=>{
        this.rounds.qf.push(this._br(this.field[top-1],w[key],true,bowl))});
    this.poll.update(this.rounds.qf,this.elo);
  },
  _sf(){
    const q=this.rounds.qf.map(g=>g.winner);
    const s=q.slice().sort((a,b)=>this.seeds[a]-this.seeds[b]);
    this.rounds.sf.push(this._br(s[0],s[3],true,"Cotton Bowl"));
    this.rounds.sf.push(this._br(s[1],s[2],true,"Orange Bowl"));
    this.poll.update(this.rounds.sf,this.elo);
  },
  _final(){
    const f=this.rounds.sf.map(g=>g.winner)
      .sort((a,b)=>this.seeds[a]-this.seeds[b]);
    const g=this._br(f[0],f[1],true,"Allegiant Stadium, Las Vegas");
    this.rounds.fin.push(g); this.champion=g.winner;
    this.poll.update([g],this.elo);
  },
  /* How the season ended for one team, in a line. */
  seasonResult(my){
    const made=this.field.indexOf(my)>=0;
    let result="Missed the playoff";
    const bowl=this.myBowl(my);
    if(bowl)result=(bowl.winner===my?"Won the ":"Lost the ")+bowl.title;
    else if(this.field.indexOf(my)<0)result=this.rec[my][0]>=6?"Bowl snub":"No bowl game";
    if(this.champion===my)result="NATIONAL CHAMPIONS";
    else if(made){
      const lost=[].concat(this.rounds.fin,this.rounds.sf,this.rounds.qf,this.rounds.r1)
        .find(g=>g.loser===my);
      result=lost?("Eliminated in the "+(this.rounds.fin.indexOf(lost)>=0?"national title game":
        this.rounds.sf.indexOf(lost)>=0?"semifinals":
        this.rounds.qf.indexOf(lost)>=0?"quarterfinals":"first round")):"Made the playoff";
    }
    return result;
  },
  /* The postseason, flattened for the history book. */
  postRecord(){
    const confChamps={}; Object.keys(this.champs).forEach(c=>confChamps[c]=this.champs[c]);
    const bowlOf={}; this.bowls.forEach(g=>{
      bowlOf[g.winner]=["W",g.title]; bowlOf[g.loser]=["L",g.title]});
    const post={}, pnote={};
    const bump=(t,won)=>{post[t]=post[t]||[0,0]; post[t][won?0:1]++};
    this.bowls.forEach(g=>{
      bump(g.winner,true); bump(g.loser,false);
      pnote[g.winner]="Won the "+g.title; pnote[g.loser]="Lost the "+g.title;});
    [["first round",this.rounds.r1],["quarterfinals",this.rounds.qf],
     ["semifinals",this.rounds.sf],["national title game",this.rounds.fin]]
     .forEach(([nm,gs])=>gs.forEach(g=>{
       bump(g.winner,true); bump(g.loser,false);
       pnote[g.loser]="Playoff \u2014 lost in the "+nm;}));
    if(this.champion)pnote[this.champion]="National champions";
    const cfpOf={}; this.field.forEach(t=>cfpOf[t]=this.seeds[t]);
    return {confChamps,bowlOf,post,pnote,cfpOf};
  }
});
