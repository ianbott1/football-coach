/* ============ postseason: pro hockey ============ */
/* Standings by points (two a win, one an overtime loss). The top three in
   each division make the playoffs, plus two wild cards in each conference.
   The division winner with more points plays the second wild card, the
   other the first; second and third in each division meet. The bracket stays
   in the division through the second round, then the conference final and
   the Stanley Cup Final: best of seven, 2-2-1-1-1, home ice to more points. */
LEAGUE.standingsCompare=(sea,x,y)=>sea._tb(x,y);
const NBA_ROUNDS=["r1","r2","r3","r4"];
const ROUND_NAME={pi:"",r1:"First Round",r2:"Second Round",r3:"Conference Final",r4:"Stanley Cup Final"};
const GAME_PHASES=[].concat(...NBA_ROUNDS.map(r=>[1,2,3,4,5,6,7].map(k=>r+"g"+k)));
const HOME_HI=[true,true,false,false,true,false,true];       // 2-2-1-1-1
LEAGUE.post={
  phases:GAME_PHASES.slice(),
  run:Object.fromEntries(GAME_PHASES.map(p=>[p,"_seriesGame"])),
  init(sea){
    sea.champs={}; sea.seeds={}; sea.field=[]; sea.side={}; sea.playIn={}; sea.series={}; sea.bracket={};
    sea.rounds={pi:[],r1:[],r2:[],r3:[],r4:[]};
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
  /* tiebreaks: win %, then division record, then rating */
  _tb(x,y){ const P=t=>LEAGUE.points(t,this);
    const R=this.regRec||this.rec, E=this.regElo||this.elo;              // fixed once the playoffs begin
    return P(y)-P(x)||R[y][0]-R[x][0]||E[y]-E[x] },
  pts(t){return LEAGUE.points(t,this)},
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
    if(!this.regRec)this.regRec=JSON.parse(JSON.stringify(this.rec));      // the standings stop here
    if(!this.regElo)this.regElo=Object.assign({},this.elo);
    Object.keys(LEAGUE.conf.sides).forEach(sd=>{
      const divs=LEAGUE.conf.sides[sd], top={}, inTop=new Set();
      divs.forEach(d=>{top[d]=NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b)).slice(0,3); top[d].forEach(t=>inTop.add(t)); this.champs[d]=top[d][0]});
      const wc=NAMES.filter(t=>this.sideOf(t)===sd&&!inTop.has(t)).sort((a,b)=>this._tb(a,b)).slice(0,2);
      const dw=divs.slice().sort((a,b)=>this._tb(top[a][0],top[b][0]));      // the better division winner first
      this.bracket[sd]=[[top[dw[0]][0],wc[1]],[top[dw[0]][1],top[dw[0]][2]],[top[dw[1]][0],wc[0]],[top[dw[1]][1],top[dw[1]][2]]];
      const q=[].concat(...this.bracket[sd]); this.side[sd]=q;
      q.slice().sort((a,b)=>this._tb(a,b)).forEach((t,i)=>{this.seeds[t]=i+1; this.field.push(t)});
      this.wild=(this.wild||[]).concat(wc);
    });
  },
  _g(h,a,title){const g=this._resolve(h,a,false,{title:title}); g.hseed=this.seeds[h]||this.piSeed(h); g.aseed=this.seeds[a]||this.piSeed(a); return g},
  piSeed(t){return null},
  /* the series of a round: made when its first game comes round */
  _makeSeries(r){
    const S=[];
    // home court: the better seed
    // home ice: more points
    const mk=(a,b)=>{const hi=this._tb(a,b)<=0?a:b;
      return {hi:hi,lo:hi===a?b:a,w:{[a]:0,[b]:0},games:[],winner:null}};
    if(r==="r1"){ this._seed(); Object.keys(LEAGUE.conf.sides).forEach(sd=>
      this.bracket[sd].forEach(([x,y])=>S.push(Object.assign(mk(x,y),{side:sd})))) }
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
    if(this.champion===my)return "STANLEY CUP CHAMPIONS";
    for(const [r,l] of [["r4","Lost in the Stanley Cup Final"],["r3","Lost in the conference final"],["r2","Lost in the second round"],["r1","Lost in the first round"]])
      if((this.series[r]||[]).some(x=>x.loser===my))return l;
    if(this.seeds[my])return "Made the playoffs";
    return this.rec[my][0]>this.rec[my][1]?"Missed the playoffs":"Losing season";
  },
  postRecord(){
    const post={}, pnote={};
    const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    ["pi"].concat(NBA_ROUNDS).forEach(r=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false)}));
    NBA_ROUNDS.forEach(r=>(this.series[r]||[]).forEach(x=>{if(x.loser)pnote[x.loser]=r==="r4"?"Lost the Stanley Cup Final":"Playoffs \u2014 lost in the "+ROUND_NAME[r].toLowerCase()}));
    if(this.champion)pnote[this.champion]="Stanley Cup champions";
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
  /* Clinch marks, never wrong (they can come a little later than the
     league's): z the conference's most points, y the division, x a playoff
     place (at most three conference rivals can still reach you), e
     eliminated (three division rivals and eight conference teams already
     out of reach). */
  clinch(){
    if(this._clinchAt===this.step&&this._clinch)return this._clinch;
    const out={};
    if(this.step>=LEAGUE.weeks){ this._seed();
      NAMES.forEach(t=>{out[t]=!this.seeds[t]?"e":this.seeds[t]===1?"z":Object.values(this.champs).indexOf(t)>=0?"y":"x"});
    }else{
      const rem={}; NAMES.forEach(t=>rem[t]=0);
      this.sched.forEach(g=>{if(g.week>=this.step){rem[g.home]++;rem[g.away]++}});
      const p=t=>this.pts(t), mx=t=>p(t)+2*rem[t];
      Object.keys(LEAGUE.conf.sides).forEach(sd=>{
        const teams=NAMES.filter(t=>this.sideOf(t)===sd);
        teams.forEach(T=>{
          const others=teams.filter(t=>t!==T), div=others.filter(t=>CONF[t]===CONF[T]);
          const can=others.filter(t=>mx(t)>=p(T)).length;
          const aheadDiv=div.filter(t=>p(t)>mx(T)).length, ahead=others.filter(t=>p(t)>mx(T)).length;
          out[T]=can===0?"z":div.every(t=>mx(t)<p(T))?"y":can<=3?"x":(aheadDiv>=3&&ahead>=8)?"e":"";
        });
      });
    }
    this._clinch=out; this._clinchAt=this.step; return out;
  }
});
