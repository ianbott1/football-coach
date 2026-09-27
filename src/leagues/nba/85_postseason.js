/* ============ postseason: pro basketball ============ */
/* Seeds by record in each conference. The top six go straight to the
   playoffs; 7-10 play in: 7 v 8 (the winner is the 7 seed), 9 v 10, then the
   loser of 7 v 8 against the winner of 9 v 10 for the 8 seed. Then four
   best-of-seven rounds, 1-8, 4-5, 3-6, 2-7 in each conference, home court
   2-2-1-1-1 to the better seed (in the Finals, the better record). Each game
   of a round is a phase; a series that's over skips the rest. */
LEAGUE.standingsCompare=(sea,x,y)=>sea._tb(x,y);
const NBA_ROUNDS=["r1","r2","r3","r4"];
const ROUND_NAME={pi:"Play-in",r1:"First Round",r2:"Conference Semifinals",r3:"Conference Finals",r4:"NBA Finals"};
const GAME_PHASES=[].concat(...NBA_ROUNDS.map(r=>[1,2,3,4,5,6,7].map(k=>r+"g"+k)));
const HOME_HI=[true,true,false,false,true,false,true];       // 2-2-1-1-1
LEAGUE.post={
  phases:["pi1","pi2"].concat(GAME_PHASES),
  run:Object.assign({pi1:"_playIn",pi2:"_playIn"},Object.fromEntries(GAME_PHASES.map(p=>[p,"_seriesGame"]))),
  init(sea){
    sea.champs={}; sea.seeds={}; sea.field=[]; sea.side={}; sea.playIn={}; sea.series={};
    sea.rounds={pi:[],r1:[],r2:[],r3:[],r4:[]};
  }
};
extendSeason({
  buttonLabel(){
    const p=this.phase;
    if(p==="week")return `Play ${LEAGUE.dates[this.step]}`;
    if(p==="pi1"||p==="pi2")return "Play the play-in";
    if(p==="done")return "Enter the offseason";
    const r=p.slice(0,2), k=+p.slice(3);
    return `${ROUND_NAME[r]}: game ${k}`;
  },
  /* tiebreaks: win %, then division record, then rating */
  _tb(x,y){
    const p=t=>this.rec[t][0]/Math.max(1,this.rec[t][0]+this.rec[t][1]);
    const d=t=>this.confrec[t][0]/Math.max(1,this.confrec[t][0]+this.confrec[t][1]);
    return p(y)-p(x)||d(y)-d(x)||this.elo[y]-this.elo[x];
  },
  sideOf(t){return Object.keys(LEAGUE.conf.sides).find(s=>LEAGUE.conf.sides[s].indexOf(CONF[t])>=0)},
  /* each conference in order, as it stands (mid-season a projection) */
  seedsNow(){
    const out={};
    Object.keys(LEAGUE.conf.sides).forEach(sd=>{
      out[sd]=NAMES.filter(t=>this.sideOf(t)===sd).sort((a,b)=>this._tb(a,b));
    });
    return out;
  },
  _seed(){
    if(this.side.East)return;
    const f=this.seedsNow();
    Object.keys(f).forEach(sd=>{
      this.side[sd]=f[sd].slice(0,10);
      f[sd].slice(0,6).forEach((t,i)=>{this.seeds[t]=i+1; this.field.push(t)});
      this.playIn[sd]={s:f[sd].slice(6,10)};
      LEAGUE.conf.sides[sd].forEach(d=>{this.champs[d]=NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))[0]});
    });
  },
  _g(h,a,title){const g=this._resolve(h,a,false,{title:title}); g.hseed=this.seeds[h]||this.piSeed(h); g.aseed=this.seeds[a]||this.piSeed(a); return g},
  piSeed(t){for(const sd in this.playIn){const i=this.playIn[sd].s.indexOf(t); if(i>=0)return i+7} return null},
  /* the play-in's pairings in this phase: [home, away, what it decides] */
  _piPairs(phase,sd){
    const P=this.playIn[sd]; if(!P)return [];
    if(phase==="pi1")return [[P.s[0],P.s[1],"7 v 8"],[P.s[2],P.s[3],"9 v 10"]];
    if(!P.g78||!P.g910)return [];
    return [[P.g78.loser,P.g910.winner,"for the 8 seed"]];
  },
  _playIn(){
    const phase=this.phase; if(phase==="pi1")this._seed();
    const games=[];
    Object.keys(this.playIn).forEach(sd=>{
      const P=this.playIn[sd];
      this._piPairs(phase,sd).forEach(([h,a,what])=>{
        const g=this._g(h,a,sd+" play-in \u00b7 "+what); games.push(g); this.rounds.pi.push(g);
        if(phase==="pi1"){ if(what==="7 v 8")P.g78=g; else P.g910=g }
        else P.g8=g;
      });
      if(phase==="pi2"){
        this.seeds[P.g78.winner]=7; this.seeds[P.g8.winner]=8;
        this.field.push(P.g78.winner,P.g8.winner);
        this.side[sd]=this.side[sd].slice(0,6).concat([P.g78.winner,P.g8.winner]);
      }
    });
    this.poll.update(games,this.elo);
  },
  /* the series of a round: made when its first game comes round */
  _makeSeries(r){
    const S=[];
    // home court: the better seed
    const mk=(a,b)=>{const hi=this.seeds[a]<this.seeds[b]?a:b;
      return {hi:hi,lo:hi===a?b:a,w:{[a]:0,[b]:0},games:[],winner:null}};
    if(r==="r1")Object.keys(LEAGUE.conf.sides).forEach(sd=>{const s=this.side[sd];
      [[0,7],[3,4],[2,5],[1,6]].forEach(([x,y])=>S.push(Object.assign(mk(s[x],s[y]),{side:sd})))});
    else if(r==="r2"||r==="r3"){
      const prev=this.series[r==="r2"?"r1":"r2"];
      Object.keys(LEAGUE.conf.sides).forEach(sd=>{const w=prev.filter(x=>x.side===sd).map(x=>x.winner);
        for(let i=0;i<w.length;i+=2)S.push(Object.assign(mk(w[i],w[i+1]),{side:sd}))});
    } else {                                            // the Finals: home court to the better record
      const w=this.series.r3.map(x=>x.winner), a=w[0], b=w[1], hi=this._tb(a,b)<=0?a:b;
      S.push({hi:hi,lo:hi===a?b:a,w:{[a]:0,[b]:0},games:[],winner:null,side:"Finals"});
    }
    this.series[r]=S;
  },
  _seriesGame(){
    const p=this.phase, r=p.slice(0,2), k=+p.slice(3);
    if(k===1)this._makeSeries(r);
    const games=[];
    this.series[r].forEach(x=>{
      if(x.winner)return;
      const home=HOME_HI[k-1]?x.hi:x.lo, away=home===x.hi?x.lo:x.hi;
      const g=this._g(home,away,`${x.side==="Finals"?"":x.side+" \u00b7 "}${ROUND_NAME[r]}, game ${k}`);
      g.series=r; g.gameNo=k; x.games.push(g); x.w[g.winner]++; games.push(g); this.rounds[r].push(g);
      if(x.w[g.winner]===4){x.winner=g.winner; x.loser=g.loser; if(r==="r3")this.champs[x.side+" champions"]=g.winner; if(r==="r4")this.champion=g.winner}
    });
    this.poll.update(games,this.elo);
  },
  /* your next game, exactly as it will be played */
  _nextFor(team){
    const p=this.phase;
    if(p==="pi1"||p==="pi2"){
      if(p==="pi1")this._seed();
      for(const sd in this.playIn){const pr=this._piPairs(p,sd).find(x=>x[0]===team||x[1]===team);
        if(pr)return {home:pr[0],away:pr[1],neutral:false,label:sd+" play-in \u00b7 "+pr[2]}}
      return null;
    }
    if(p==="done"||p==="week")return null;
    const r=p.slice(0,2), k=+p.slice(3);
    let S=this.series[r];
    if(k===1&&!S){ const save=this.series[r]; this._makeSeries(r); S=this.series[r]; if(save===undefined)delete this.series[r] }
    const x=(S||[]).find(x=>!x.winner&&(x.hi===team||x.lo===team)); if(!x)return null;
    const home=HOME_HI[k-1]?x.hi:x.lo;
    return {home:home,away:home===x.hi?x.lo:x.hi,neutral:false,
      label:`${ROUND_NAME[r]}, game ${k} \u00b7 series ${x.w[x.hi]}-${x.w[x.lo]}`};
  },
  postMatchup(team){return this._nextFor(team)},
  postNext(team){const m=this._nextFor(team); if(!m)return null; return {label:m.label,opp:m.home===team?m.away:m.home,neutral:false}},
  mySeries(team){                                        // the series a team is in now, for the views
    for(const r of NBA_ROUNDS.slice().reverse()){const x=(this.series[r]||[]).find(x=>x.hi===team||x.lo===team); if(x)return Object.assign({round:r},x)}
    return null;
  },
  seasonResult(my){
    if(this.champion===my)return "NBA CHAMPIONS";
    for(const [r,l] of [["r4","Lost in the NBA Finals"],["r3","Lost in the conference finals"],["r2","Lost in the conference semifinals"],["r1","Lost in the first round"]])
      if((this.series[r]||[]).some(x=>x.loser===my))return l;
    if(Object.values(this.playIn).some(P=>P.s&&P.s.indexOf(my)>=0)&&!this.seeds[my])return "Lost in the play-in";
    if(this.seeds[my])return "Made the playoffs";
    return this.rec[my][0]>this.rec[my][1]?"Missed the playoffs":"Losing season";
  },
  postRecord(){
    const post={}, pnote={};
    const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    ["pi"].concat(NBA_ROUNDS).forEach(r=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false)}));
    NBA_ROUNDS.forEach(r=>(this.series[r]||[]).forEach(x=>{if(x.loser)pnote[x.loser]=r==="r4"?"Lost the NBA Finals":"Playoffs \u2014 lost in the "+ROUND_NAME[r].toLowerCase()}));
    if(this.champion)pnote[this.champion]="NBA champions";
    const cfpOf={}; this.field.forEach(t=>cfpOf[t]=this.seeds[t]);
    return {confChamps:this.champs,post:post,pnote:pnote,cfpOf:cfpOf};
  },
  postPools(){return [this.rounds.r4,this.rounds.r3,this.rounds.r2,this.rounds.r1,this.rounds.pi]},
  postGamesFor(team){
    const out=[];
    ["pi"].concat(NBA_ROUNDS).forEach(r=>this.rounds[r].forEach(g=>{if(g.home===team||g.away===team)out.push([g,g.title])}));
    return out;
  },
  honours(team){ return {natl:this.champion===team,playoff:!!this.seeds[team],
    conf:Object.keys(this.champs).some(d=>this.champs[d]===team)} },
  confChampions(){return this.champs},
  /* Clinch marks (never wrong; can come a little later than the league's):
     z the conference's top seed, y the division, x a top-six place,
     p at least the play-in, e eliminated from the top ten. */
  clinch(){
    if(this._clinchAt===this.step&&this._clinch)return this._clinch;
    const out={};
    if(this.step>=LEAGUE.weeks){ this._seed();
      NAMES.forEach(t=>{const s=this.seeds[t]||this.piSeed(t); out[t]=!s?"e":s===1?"z":s<=6?"x":"p"});
    }else{
      const rem={}; NAMES.forEach(t=>rem[t]=0);
      this.sched.forEach(g=>{if(g.week>=this.step){rem[g.home]++;rem[g.away]++}});
      const w=t=>this.rec[t][0], mx=t=>w(t)+rem[t];
      Object.keys(LEAGUE.conf.sides).forEach(sd=>{
        const teams=NAMES.filter(t=>this.sideOf(t)===sd);
        teams.forEach(T=>{
          const others=teams.filter(t=>t!==T), can=others.filter(t=>mx(t)>=w(T)).length;
          const past=others.filter(t=>w(t)>mx(T)).length;
          const y=others.filter(t=>CONF[t]===CONF[T]).every(t=>mx(t)<w(T));
          out[T]=can===0?"z":y?"y":can<=5?"x":can<=9?"p":past>=10?"e":"";
        });
      });
    }
    this._clinch=out; this._clinchAt=this.step; return out;
  }
});
