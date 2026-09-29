/* ============ the table and the play-offs: English football ============ */
/* Tables by points, then goal difference, then goals scored (the leagues'
   own order). The Premier League's champions top its table; its bottom three
   go down. The Championship's top two go up, and the play-offs (third to
   eighth, from 2026-27) decide the third: eliminators 5 v 8 and 6 v 7, then
   third against the lower-seeded winner and fourth against the higher, then
   the final at Wembley. Knockout games level after ninety minutes go to extra
   time and penalties. (The real semi-finals are two legs: here, one game at
   the better seed's ground.) */
LEAGUE.standingsCompare=(sea,x,y)=>sea._tb(x,y);
const ROUND_NAME={po1:"Play-off eliminator",po2:"Play-off semi-final",po3:"Play-off final"};
LEAGUE.post={
  phases:["po1","po2","po3"],
  run:{po1:"_playoff",po2:"_playoff",po3:"_playoff"},
  init(sea){ sea.champs={}; sea.seeds={}; sea.field=[]; sea.po={}; sea.rounds={po1:[],po2:[],po3:[]} }
};
extendSeason({
  buttonLabel(){
    const p=this.phase;
    if(p==="week")return `Play ${LEAGUE.dates[this.step]}`;
    if(p==="done")return "Enter the summer";
    return "Play the "+ROUND_NAME[p].toLowerCase();
  },
  pts(t){return LEAGUE.points(t,this)},
  /* goals for and against, league games only */
  gfga(t){
    if(this._gAt!==this.step){ this._gg={}; NAMES.forEach(x=>this._gg[x]=[0,0]);
      this.weeks.slice(0,LEAGUE.weeks).forEach(w=>w.games.forEach(g=>{
        this._gg[g.home][0]+=g.hp; this._gg[g.home][1]+=g.ap; this._gg[g.away][0]+=g.ap; this._gg[g.away][1]+=g.hp }));
      this._gAt=this.step }
    return this._gg[t];
  },
  _tb(x,y){ const X=this.gfga(x), Y=this.gfga(y);
    return this.pts(y)-this.pts(x)||(Y[0]-Y[1])-(X[0]-X[1])||Y[0]-X[0]||this.elo[y]-this.elo[x] },
  sideOf(t){return CONF[t]==="PL"?"Premier League":"Championship"},
  table(d){return NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))},
  seedsNow(){return {"Premier League":this.table("PL"),"Championship":this.table("CH")}},
  _seed(){
    if(this.po.seeds)return;
    const pl=this.table("PL"), ch=this.table("CH");
    this.champs.PL=pl[0]; this.champs.CH=ch[0];
    this.po.seeds=ch.slice(2,8);                        // third to eighth
    this.po.seeds.forEach((t,i)=>{this.seeds[t]=i+3; this.field.push(t)});
    this.po.up=[ch[0],ch[1]]; this.po.down=pl.slice(-3);
  },
  _g(h,a,title,neutral){ const g=this._resolve(h,a,!!neutral,{title:title}); g.hseed=this.seeds[h]; g.aseed=this.seeds[a]; return g },
  _pairs(p){
    const S=this.po.seeds, R=this.rounds;
    if(p==="po1")return [[S[2],S[5],"5 v 8"],[S[3],S[4],"6 v 7"]];
    if(p==="po2"){ const w=R.po1.map(g=>g.winner), lo=this.seeds[w[0]]>this.seeds[w[1]]?w[0]:w[1], hi=lo===w[0]?w[1]:w[0];
      return [[S[0],lo,"3 v the lower-seeded eliminator winner"],[S[1],hi,"4 v the higher-seeded"]] }
    if(p==="po3"){ const w=R.po2.map(g=>g.winner); return [[w[0],w[1],"at Wembley"]] }
    return [];
  },
  _playoff(){
    const p=this.phase; if(p==="po1")this._seed();
    const games=[];
    this._pairs(p).forEach(([h,a,what])=>{ const g=this._g(h,a,ROUND_NAME[p]+" \u00b7 "+what,p==="po3"); games.push(g); this.rounds[p].push(g) });
    if(p==="po3"){ this.champion=this.champs.PL; this.po.winner=games[0].winner; this.po.up.push(games[0].winner) }
    this.poll.update(games,this.elo);
  },
  /* knockout games go to extra time and penalties */
  get knockout(){return this.phase!=="week"},
  _nextFor(team){
    const p=this.phase; if(p==="week"||p==="done")return null;
    if(p==="po1")this._seed();
    const pr=this._pairs(p).find(x=>x[0]===team||x[1]===team);
    return pr?{home:pr[0],away:pr[1],neutral:p==="po3",label:ROUND_NAME[p]+" \u00b7 "+pr[2]}:null;
  },
  postMatchup(team){return this._nextFor(team)},
  postNext(team){const m=this._nextFor(team); if(!m)return null; return {label:m.label,opp:m.home===team?m.away:m.home,neutral:m.neutral}},
  mySeries(){return null},
  /* a club's season, frozen once the season is over: promotion and relegation
     move clubs between divisions before the history is written */
  seasonResult(my){
    if(this._res&&this._res[my])return this._res[my];
    const r=this._result(my);
    if(this.phase==="done")(this._res=this._res||{})[my]=r;
    return r;
  },
  _result(my){
    this._seed();
    const d=CONF[my], tb=this.table(d), pos=tb.indexOf(my)+1, ord=n=>n+(n%100>10&&n%100<14?"th":["th","st","nd","rd"][n%10]||"th");
    if(d==="PL"){ if(pos===1)return "PREMIER LEAGUE CHAMPIONS"; if(pos>=18)return `Relegated (${ord(pos)})`; return `Finished ${ord(pos)} in the Premier League` }
    if(pos<=2)return pos===1?"CHAMPIONSHIP WINNERS, promoted":"Promoted (2nd)";
    if(this.po.winner===my)return "Promoted through the play-offs";
    if((this.rounds.po3||[]).some(g=>g.loser===my))return "Lost the play-off final";
    if(this.seeds[my])return `Lost in the play-offs (${ord(pos)})`;
    return `Finished ${ord(pos)} in the Championship`;
  },
  postRecord(){
    const post={}, pnote={}; const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    ["po1","po2","po3"].forEach(r=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false);pnote[g.loser]="Play-offs"}));
    if(this.po.winner)pnote[this.po.winner]="Promoted through the play-offs";
    return {confChamps:this.champs,post:post,pnote:pnote,cfpOf:{}};
  },
  postPools(){return [this.rounds.po3,this.rounds.po2,this.rounds.po1]},
  postGamesFor(team){const out=[]; ["po1","po2","po3"].forEach(r=>this.rounds[r].forEach(g=>{if(g.home===team||g.away===team)out.push([g,g.title])})); return out},
  honours(team){ return {natl:this.champs.PL===team, playoff:!!this.seeds[team], conf:this.champs.CH===team} },
  confChampions(){return this.champs},
  clinch(){ return {} }
});
