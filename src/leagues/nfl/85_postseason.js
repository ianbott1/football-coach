/* ============ postseason: pro football ============ */
/* Seven teams a conference: four division winners seeded 1-4 by record,
   three wild cards 5-7. The 1 seed sits out the wild card round; the others
   play 2v7, 3v6, 4v5 at the higher seed. Rounds re-seed: the best seed left
   hosts the worst. Conference champions meet at a neutral site. A team's
   record stays its regular-season record, as the league reports it. */
LEAGUE.post={
  phases:["wildcard","divisional","conference","superbowl"],
  run:{wildcard:"_wildcard",divisional:"_divisional",conference:"_confGame",superbowl:"_superbowl"},
  init(sea){
    sea.champs={}; sea.seeds={}; sea.field=[]; sea.side={};
    sea.rounds={wc:[],div:[],conf:[],sb:[]};
  }
};
const SB_NUM=y=>{const n=y-1965;                     // the 2026 season ends in Super Bowl LXI
  const R=[[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s="",x=n; R.forEach(([v,r])=>{while(x>=v){s+=r;x-=v}}); return s};
const ROUND_NAME={wc:"Wild Card",div:"Divisional Round",conf:"Championship",sb:"Super Bowl"};

extendSeason({
  buttonLabel(){
    switch(this.phase){
      case "week":return `Play Week ${this.step+1}`;
      case "wildcard":return "Play Wild Card Weekend";
      case "divisional":return "Play the Divisional Round";
      case "conference":return "Play the Conference Championships";
      case "superbowl":return "Play the Super Bowl";
      default:return "Enter the offseason";
    }
  },
  /* tiebreaks: win %, then division record, then rating */
  _tb(x,y){
    const p=t=>this.rec[t][0]/Math.max(1,this.rec[t][0]+this.rec[t][1]);
    const d=t=>this.confrec[t][0]/Math.max(1,this.confrec[t][0]+this.confrec[t][1]);
    return p(y)-p(x)||d(y)-d(x)||this.elo[y]-this.elo[x];
  },
  sideOf(t){return Object.keys(LEAGUE.conf.sides).find(s=>LEAGUE.conf.sides[s].indexOf(CONF[t])>=0)},
  /* the field as it stands: works mid-season (projection) and at the end */
  seedsNow(){
    const out={};
    Object.keys(LEAGUE.conf.sides).forEach(sd=>{
      const divs=LEAGUE.conf.sides[sd];
      const winners=divs.map(d=>NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))[0]);
      winners.sort((a,b)=>this._tb(a,b));
      const rest=NAMES.filter(t=>divs.indexOf(CONF[t])>=0&&winners.indexOf(t)<0).sort((a,b)=>this._tb(a,b));
      out[sd]=winners.concat(rest.slice(0,LEAGUE.playoff.perSide-4));
    });
    return out;
  },
  _seed(){
    if(this.field.length)return;
    const f=this.seedsNow();
    Object.keys(f).forEach(sd=>{this.side[sd]=f[sd];
      f[sd].forEach((t,i)=>{this.seeds[t]=i+1;this.field.push(t)});
      LEAGUE.conf.sides[sd].forEach(d=>{
        this.champs[d]=NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))[0]});
    });
  },
  _br(h,a,neutral,round,label){
    const r=this._resolve(h,a,neutral,{title:label,round:round});
    // playoff games don't change a team's record
    this.rec[r.winner][0]--; this.rec[r.loser][1]--;
    r.hseed=this.seeds[h]; r.aseed=this.seeds[a];
    r.hrec=this.rec[h][0]+"-"+this.rec[h][1]; r.arec=this.rec[a][0]+"-"+this.rec[a][1];
    return r;
  },
  /* the games a round will play, [home, away, neutral, label] */
  _pairs(round){
    this._seed();
    const out=[];
    Object.keys(this.side).forEach(sd=>{
      const f=this.side[sd];
      if(round==="wc"){[[2,7],[3,6],[4,5]].forEach(([h,a])=>out.push([f[h-1],f[a-1],false,sd+" Wild Card"]))}
      else{
        const alive=round==="div"
          ? [f[0]].concat(this.rounds.wc.filter(g=>this.sideOf(g.winner)===sd).map(g=>g.winner))
          : this.rounds.div.filter(g=>this.sideOf(g.winner)===sd).map(g=>g.winner);
        alive.sort((a,b)=>this.seeds[a]-this.seeds[b]);
        if(round==="div"){out.push([alive[0],alive[3],false,sd+" Divisional"]);out.push([alive[1],alive[2],false,sd+" Divisional"])}
        if(round==="conf")out.push([alive[0],alive[1],false,sd+" Championship"]);
      }
    });
    if(round==="sb"){
      const c=this.rounds.conf.map(g=>g.winner);
      out.push([c[0],c[1],true,"Super Bowl "+SB_NUM(this.year+1)]);
    }
    return out;
  },
  _play(round){
    const games=this._pairs(round).map(([h,a,n,l])=>this._br(h,a,n,round,l));
    this.rounds[round]=games;
    this.poll.update(games,this.elo);          // the regular season stays in this.weeks
    if(round==="sb")this.champion=games[0].winner;
  },
  _wildcard(){this._play("wc")},
  _divisional(){this._play("div")},
  _confGame(){this._play("conf")},
  _superbowl(){this._play("sb")},
  roundOfPhase(p){return {wildcard:"wc",divisional:"div",conference:"conf",superbowl:"sb"}[p]},
  postMatchup(team){
    const r=this.roundOfPhase(this.phase); if(!r)return null;
    const p=this._pairs(r).find(([h,a])=>h===team||a===team);
    return p?{home:p[0],away:p[1],neutral:p[2],label:p[3]}:null;
  },
  postNext(team){
    const m=this.postMatchup(team); if(!m)return null;
    return {label:m.label,opp:m.home===team?m.away:m.home,neutral:m.neutral,home:m.home===team};
  },
  seasonResult(my){
    if(this.champion===my)return "SUPER BOWL CHAMPIONS";
    const lost=[["sb","Lost the Super Bowl"],["conf","Lost the conference championship"],
      ["div","Lost in the divisional round"],["wc","Lost in the wild card round"]]
      .find(([r])=>this.rounds[r].some(g=>g.loser===my));
    if(lost)return lost[1];
    if(this.seeds[my])return "Made the playoffs";
    return this.rec[my][0]>this.rec[my][1]?"Missed the playoffs":"Losing season";
  },
  postRecord(){
    const post={}, pnote={};
    const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    [["wc","wild card round"],["div","divisional round"],["conf","conference championship"],["sb","Super Bowl"]]
      .forEach(([r,nm])=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false);
        pnote[g.loser]=r==="sb"?"Lost the Super Bowl":"Playoffs \u2014 lost in the "+nm}));
    if(this.champion)pnote[this.champion]="Super Bowl champions";
    const cfpOf={}; this.field.forEach(t=>cfpOf[t]=this.seeds[t]);
    return {confChamps:this.champs,post:post,pnote:pnote,cfpOf:cfpOf};
  },
  postPools(){return [this.rounds.sb,this.rounds.conf,this.rounds.div,this.rounds.wc]},
  postGamesFor(team){
    const out=[];
    ["wc","div","conf","sb"].forEach(r=>this.rounds[r].forEach(g=>{
      if(g.home===team||g.away===team)out.push([g,r==="sb"?g.title:ROUND_NAME[r]])}));
    return out;
  },
  honours(team){
    return {natl:this.champion===team,playoff:!!this.seeds[team],
            conf:Object.keys(this.champs).some(d=>this.champs[d]===team)};
  },
  confChampions(){return this.champs}
});
