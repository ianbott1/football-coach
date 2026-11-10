/* ============ postseason: pro baseball ============ */
/* Standings by record. Each league sends six: the three division winners and the three best of the rest. The two best
   division winners (seeds 1 and 2) skip the wild-card round; 3 plays 6 and 4 plays 5, best of three, every game at the
   higher seed. Then the division series (best of five, 2-2-1), the league championship series and the World Series
   (best of seven, 2-3-2), home field to the better seed (the Series: the better record). */
LEAGUE.standingsCompare=(sea,x,y)=>sea._tb(x,y);
const NBA_ROUNDS=["wc","ds","cs","ws"];
const ROUND_NAME={wc:"Wild Card Series",ds:"Division Series",cs:"Championship Series",ws:"World Series"};
const ROUND_GAMES={wc:3,ds:5,cs:7,ws:7}, ROUND_WIN={wc:2,ds:3,cs:4,ws:4};
const HOME_PAT={wc:[1,1,1],ds:[1,1,0,0,1],cs:[1,1,0,0,0,1,1],ws:[1,1,0,0,0,1,1]};
const GAME_PHASES=[].concat(...NBA_ROUNDS.map(r=>Array.from({length:ROUND_GAMES[r]},(_,k)=>r+"g"+(k+1))));
LEAGUE.post={
  phases:GAME_PHASES.slice(),
  run:Object.fromEntries(GAME_PHASES.map(p=>[p,"_seriesGame"])),
  init(sea){
    sea.champs={}; sea.seeds={}; sea.field=[]; sea.side={}; sea.series={}; sea.bracket={};
    sea.rounds={wc:[],ds:[],cs:[],ws:[]};
  }
};
extendSeason({
  buttonLabel(){
    const p=this.phase;
    if(p==="week")return `Play ${LEAGUE.dates[this.step]}`;
    if(p==="done")return "Enter the offseason";
    const r=p.slice(0,2), k=+p.slice(3);
    return `${ROUND_NAME[r]}: game ${k}`;
  },
  /* tiebreaks: winning percentage, then the regular season's rating */
  _tb(x,y){ const R=this.regRec||this.rec, pc=t=>{ const [w,l]=R[t]; return w+l?w/(w+l):0 }, E=this.regElo||this.elo;
    return pc(y)-pc(x)||R[y][0]-R[x][0]||E[y]-E[x] },
  pts(t){ return (this.regRec||this.rec)[t][0] },
  sideOf(t){return Object.keys(LEAGUE.conf.sides).find(s=>LEAGUE.conf.sides[s].indexOf(CONF[t])>=0)},
  seedsNow(){
    const out={};
    Object.keys(LEAGUE.conf.sides).forEach(sd=>{ out[sd]=NAMES.filter(t=>this.sideOf(t)===sd).sort((a,b)=>this._tb(a,b)) });
    return out;
  },
  _seed(){
    if(this.side.AL)return;
    if(!this.regRec)this.regRec=JSON.parse(JSON.stringify(this.rec));
    if(!this.regElo)this.regElo=Object.assign({},this.elo);
    Object.keys(LEAGUE.conf.sides).forEach(sd=>{
      const divs=LEAGUE.conf.sides[sd];
      const winners=divs.map(d=>{ const w=NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))[0]; this.champs[d]=w; return w }).sort((a,b)=>this._tb(a,b));
      const wc=NAMES.filter(t=>this.sideOf(t)===sd&&winners.indexOf(t)<0).sort((a,b)=>this._tb(a,b)).slice(0,3);
      const order=winners.concat(wc);
      order.forEach((t,i)=>{ this.seeds[t]=i+1; this.field.push(t) });
      this.side[sd]=order; this.bracket[sd]={bye:[order[0],order[1]], wc:[[order[2],order[5]],[order[3],order[4]]]};
      this.wild=(this.wild||[]).concat(wc);
    });
  },
  _g(h,a,title){const g=this._resolve(h,a,false,{title:title}); g.hseed=this.seeds[h]; g.aseed=this.seeds[a]; return g},
  _makeSeries(r){
    const S=[];
    const mk=(a,b,sd)=>{ const hi=(this.seeds[a]||99)<(this.seeds[b]||99)?a:b; return {hi:hi,lo:hi===a?b:a,w:{[a]:0,[b]:0},games:[],winner:null,side:sd} };
    if(r==="wc"){ this._seed(); Object.keys(LEAGUE.conf.sides).forEach(sd=>this.bracket[sd].wc.forEach(([x,y])=>S.push(mk(x,y,sd)))) }
    else if(r==="ds"){ Object.keys(LEAGUE.conf.sides).forEach(sd=>{ const B=this.bracket[sd], W=(this.series.wc||[]).filter(x=>x.side===sd);
        const w36=W.find(x=>x.hi===B.wc[0][0]||x.lo===B.wc[0][0]).winner, w45=W.find(x=>x.hi===B.wc[1][0]||x.lo===B.wc[1][0]).winner;
        S.push(mk(B.bye[0],w45,sd)); S.push(mk(B.bye[1],w36,sd)) }) }
    else if(r==="cs"){ Object.keys(LEAGUE.conf.sides).forEach(sd=>{ const w=this.series.ds.filter(x=>x.side===sd).map(x=>x.winner); S.push(mk(w[0],w[1],sd)) }) }
    else { const w=this.series.cs.map(x=>x.winner), a=w[0], b=w[1], hi=this._tb(a,b)<=0?a:b;
      S.push({hi:hi,lo:hi===a?b:a,w:{[a]:0,[b]:0},games:[],winner:null,side:"Series"}) }
    this.series[r]=S;
  },
  _seriesGame(){
    const p=this.phase, r=p.slice(0,2), k=+p.slice(3);
    if(k===1)this._makeSeries(r);
    const games=[];
    this.series[r].forEach(x=>{
      if(x.winner)return;
      const home=HOME_PAT[r][k-1]?x.hi:x.lo, away=home===x.hi?x.lo:x.hi;
      const g=this._g(home,away,`${x.side==="Series"?"":x.side+" · "}${ROUND_NAME[r]}, game ${k}`);
      g.series=r; g.gameNo=k; x.games.push(g); x.w[g.winner]++; games.push(g); this.rounds[r].push(g);
      if(x.w[g.winner]===ROUND_WIN[r]){ x.winner=g.winner; x.loser=g.loser; if(r==="cs")this.champs[x.side+" champions"]=g.winner; if(r==="ws")this.champion=g.winner }
    });
    this.poll.update(games,this.elo);
  },
  _nextFor(team){
    const p=this.phase;
    if(p==="done"||p==="week")return null;
    const r=p.slice(0,2), k=+p.slice(3);
    let S=this.series[r];
    if(k===1&&!S){ const save=this.series[r]; this._makeSeries(r); S=this.series[r]; if(save===undefined)delete this.series[r] }
    const x=(S||[]).find(x=>!x.winner&&(x.hi===team||x.lo===team)); if(!x)return null;
    const home=HOME_PAT[r][k-1]?x.hi:x.lo;
    return {home:home,away:home===x.hi?x.lo:x.hi,neutral:false,label:`${ROUND_NAME[r]}, game ${k} · ${seriesFrom(x,team)}`};
  },
  postMatchup(team){return this._nextFor(team)},
  postNext(team){const m=this._nextFor(team); if(!m)return null; return {label:m.label,opp:m.home===team?m.away:m.home,neutral:false,home:m.home}},
  mySeries(team){
    for(const r of NBA_ROUNDS.slice().reverse()){const x=(this.series[r]||[]).find(x=>x.hi===team||x.lo===team); if(x)return Object.assign({round:r},x)}
    return null;
  },
  seasonResult(my){
    if(this.champion===my)return "WORLD SERIES CHAMPIONS";
    for(const [r,l] of [["ws","Lost the World Series"],["cs","Lost in the championship series"],["ds","Lost in the division series"],["wc","Lost in the wild-card series"]])
      if((this.series[r]||[]).some(x=>x.loser===my))return l;
    if(this.seeds[my])return "Made the postseason";
    if(this.step<LEAGUE.weeks)return "";
    return this.rec[my][0]>this.rec[my][1]?"Missed the postseason":"Losing season";
  },
  postRecord(){
    const post={}, pnote={};
    const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    NBA_ROUNDS.forEach(r=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false)}));
    NBA_ROUNDS.forEach(r=>(this.series[r]||[]).forEach(x=>{if(x.loser)pnote[x.loser]=r==="ws"?"Lost the World Series":"Postseason — lost in the "+ROUND_NAME[r].toLowerCase()}));
    if(this.champion)pnote[this.champion]="World Series champions";
    const cfpOf={}; this.field.forEach(t=>cfpOf[t]=this.seeds[t]);
    return {confChamps:this.champs,post:post,pnote:pnote,cfpOf:cfpOf};
  },
  postPools(){return [this.rounds.ws,this.rounds.cs,this.rounds.ds,this.rounds.wc]},
  postGamesFor(team){
    const out=[];
    NBA_ROUNDS.forEach(r=>this.rounds[r].forEach(g=>{if(g.home===team||g.away===team)out.push([g,g.title])}));
    return out;
  },
  honours(team){ return {natl:this.champion===team,playoff:!!this.seeds[team],
    conf:Object.keys(this.champs).some(d=>this.champs[d]===team)} },
  confChampions(){return this.champs},
  /* clinch marks, never wrong. y: no division rival can reach your wins. x: at most three teams in your league can
     finish ahead of you (with three wild cards and three division winners, you're in). e: a division rival is already
     out of reach and six teams in your league already are (at least three of them aren't division winners). */
  clinch(){
    if(this._clinchAt===this.step&&this._clinch)return this._clinch;
    const out={};
    if(this.step>=LEAGUE.weeks){ this._seed();
      NAMES.forEach(t=>{out[t]=!this.seeds[t]?"e":Object.values(this.champs).indexOf(t)>=0?"y":"x"});
    }else{
      const rem={}; NAMES.forEach(t=>rem[t]=0);
      this.sched.forEach(g=>{if(g.week>=this.step){rem[g.home]++;rem[g.away]++}});
      const w=t=>this.rec[t][0], mx=t=>w(t)+rem[t];
      Object.keys(LEAGUE.conf.sides).forEach(sd=>{
        const teams=NAMES.filter(t=>this.sideOf(t)===sd);
        teams.forEach(T=>{ const others=teams.filter(t=>t!==T), div=others.filter(t=>CONF[t]===CONF[T]);
          const can=others.filter(t=>mx(t)>=w(T)).length, past=others.filter(t=>w(t)>mx(T)).length;
          out[T]=div.every(t=>mx(t)<w(T))?"y":can<=3?"x":(div.some(t=>w(t)>mx(T))&&past>=6)?"e":"" }) });
    }
    this._clinch=out; this._clinchAt=this.step; return out;
  }
});
function seriesFrom(x,team){
  const o=x.hi===team?x.lo:x.hi, a=x.w[team]||0, b=x.w[o]||0;
  return a===b?(a?`series tied ${a}-${b}`:"series starts"):a>b?`you lead ${a}-${b}`:`you trail ${a}-${b}`;
}
