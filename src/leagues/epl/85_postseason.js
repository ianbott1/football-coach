/* ============ the tables and the play-offs: English football ============ */
/* Tables by points, then goal difference, then goals scored. Each division's
   2026-27 rules (data/england_2026_27.py): who goes up automatically, who
   plays off for the last place, who goes down. Two play-off formats: four
   clubs (semis 1 v 4 and 2 v 3, then the final) and six (eliminators 3 v 6
   and 4 v 5 within the six, then the top two seeds against the winners, the
   lower-seeded winner meeting the top seed; then the final). Finals at a
   neutral ground; knockout games level after ninety minutes go to extra time
   and penalties. (The real semi-finals are two legs: here, one game.) The
   bottom of tier 6 isn't relegated: there's no tier 7 in the game. */
const DIVS={
  PL:{up:0, po:null,  down:3, tier:1},
  CH:{up:2, po:[3,8], down:3, tier:2},
  L1:{up:2, po:[3,6], down:4, tier:3},
  L2:{up:3, po:[4,7], down:2, tier:4},
  NL:{up:1, po:[2,7], down:4, tier:5},
  NN:{up:1, po:[2,7], down:0, tier:6},
  NS:{up:1, po:[2,7], down:0, tier:6}
};
const DIV_ORDER=["PL","CH","L1","L2","NL","NN","NS"];
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
    return "Play the "+ROUND_NAME[p].toLowerCase()+"s";
  },
  pts(t){return LEAGUE.points(t,this)},
  gfga(t){
    if(this._gAt!==this.step){ this._gg={}; NAMES.forEach(x=>this._gg[x]=[0,0]);
      this.weeks.slice(0,LEAGUE.weeks).forEach(w=>w.games.forEach(g=>{ if(g.cup)return;   // the table is league games only
        this._gg[g.home][0]+=g.hp; this._gg[g.home][1]+=g.ap; this._gg[g.away][0]+=g.ap; this._gg[g.away][1]+=g.hp }));
      this._gAt=this.step }
    return this._gg[t];
  },
  _tb(x,y){ const X=this.gfga(x), Y=this.gfga(y), E=this.regElo||this.elo;
    return this.pts(y)-this.pts(x)||(Y[0]-Y[1])-(X[0]-X[1])||Y[0]-X[0]||E[y]-E[x] },
  sideOf(t){return LEAGUE.conf.names[CONF[t]]},
  table(d){return NAMES.filter(t=>CONF[t]===d).sort((a,b)=>this._tb(a,b))},
  seedsNow(){const o={}; DIV_ORDER.forEach(d=>o[LEAGUE.conf.names[d]]=this.table(d)); return o},
  /* when the league season ends: each division's table, frozen, its play-off seeds */
  _seed(){
    if(this._seeded)return; this._seeded=true;
    if(!this.regRec)this.regRec=JSON.parse(JSON.stringify(this.rec));
    if(!this.regElo)this.regElo=Object.assign({},this.elo);
    DIV_ORDER.forEach(d=>{ const R=DIVS[d], T=this.table(d), P={seeds:[],up:T.slice(0,R.up),down:R.down?T.slice(-R.down):[],
        rounds:{po1:[],po2:[],po3:[]},winner:null};
      this.champs[d]=T[0];
      if(R.po){P.seeds=T.slice(R.po[0]-1,R.po[1]); P.seeds.forEach((t,i)=>{this.seeds[t]=R.po[0]+i; this.field.push(t)})}
      this.po[d]=P });
  },
  _g(h,a,title,neutral){ const g=this._resolve(h,a,!!neutral,{title:title}); g.hseed=this.seeds[h]; g.aseed=this.seeds[a]; return g },
  /* a division's pairings in a phase: [home, away, what it is] */
  _pairs(d,p){
    const P=this.po[d]; if(!P||!P.seeds.length)return [];
    const S=P.seeds, R=P.rounds, six=S.length===6;
    if(p==="po1")return six?[[S[2],S[5],"eliminator"],[S[3],S[4],"eliminator"]]:[];
    if(p==="po2"){
      if(!six)return [[S[0],S[3],"semi-final"],[S[1],S[2],"semi-final"]];
      const w=R.po1.map(g=>g.winner), lo=this.seeds[w[0]]>this.seeds[w[1]]?w[0]:w[1], hi=lo===w[0]?w[1]:w[0];
      return [[S[0],lo,"semi-final"],[S[1],hi,"semi-final"]];
    }
    if(p==="po3"){ const w=R.po2.map(g=>g.winner); return w.length===2?[[w[0],w[1],"final"]]:[] }
    return [];
  },
  _playoff(){
    const p=this.phase; if(p==="po1")this._seed();
    const games=[];
    DIV_ORDER.forEach(d=>this._pairs(d,p).forEach(([h,a,what])=>{
      const g=this._g(h,a,LEAGUE.conf.names[d]+" play-off "+what,p==="po3"); g.div=d;
      games.push(g); this.po[d].rounds[p].push(g); this.rounds[p].push(g);
      if(p==="po3"){ this.po[d].winner=g.winner; this.po[d].up.push(g.winner) } }));
    if(p==="po3")this.champion=this.champs.PL;
    this.poll.update(games,this.elo);
  },
  _nextFor(team){
    const p=this.phase; if(p==="week"||p==="done")return null;
    if(p==="po1")this._seed();
    const d=CONF[team], pr=this._pairs(d,p).find(x=>x[0]===team||x[1]===team);
    return pr?{home:pr[0],away:pr[1],neutral:p==="po3",label:LEAGUE.conf.names[d]+" play-off "+pr[2]}:null;
  },
  postMatchup(team){return this._nextFor(team)},
  postNext(team){const m=this._nextFor(team); if(!m)return null; return {label:m.label,opp:m.home===team?m.away:m.home,neutral:m.neutral}},
  mySeries(){return null},
  /* a club's season, frozen once the season is over */
  seasonResult(my){
    if(this._res&&this._res[my])return this._res[my];
    const r=this._result(my);
    if(this.phase==="done")(this._res=this._res||{})[my]=r;
    return r;
  },
  _result(my){
    // "the Championship", "the National League", but "League One"
    const theDiv=k=>{const n=LEAGUE.conf.names[k];return /^League /.test(n)?n:"the "+n};
    this._seed();
    const d=CONF[my], R=DIVS[d], P=this.po[d], name=theDiv(d), N=LEAGUE.conf.names[d], tb=this.table(d), pos=tb.indexOf(my)+1;
    const ord=n=>n+(n%100>10&&n%100<14?"th":["th","st","nd","rd"][n%10]||"th");
    if(d==="PL"){ if(pos===1)return "PREMIER LEAGUE CHAMPIONS"; if(pos>tb.length-R.down)return `Relegated (${ord(pos)})`; return `Finished ${ord(pos)} in the Premier League` }
    if(pos===1)return `${LEAGUE.conf.names[d].toUpperCase()} CHAMPIONS, promoted`;
    if(pos<=R.up)return `Promoted (${ord(pos)} in ${name})`;
    if(P.winner===my)return `Promoted through the ${N} play-offs`;
    if(P.rounds.po3.some(g=>g.loser===my))return `Lost the ${N} play-off final`;
    if(this.seeds[my])return `Lost in the ${N} play-offs (${ord(pos)})`;
    if(R.down&&pos>tb.length-R.down)return `Relegated from ${name} (${ord(pos)})`;
    return `Finished ${ord(pos)} in ${name}`;
  },
  postRecord(){
    const post={}, pnote={}; const bump=(t,w)=>{post[t]=post[t]||[0,0];post[t][w?0:1]++};
    ["po1","po2","po3"].forEach(r=>this.rounds[r].forEach(g=>{bump(g.winner,true);bump(g.loser,false);pnote[g.loser]="Play-offs"}));
    DIV_ORDER.forEach(d=>{const w=this.po[d]&&this.po[d].winner; if(w)pnote[w]="Promoted through the play-offs"});
    return {confChamps:this.champs,post:post,pnote:pnote,cfpOf:{}};
  },
  postPools(){return [this.rounds.po3,this.rounds.po2,this.rounds.po1]},
  postGamesFor(team){const out=[]; ["po1","po2","po3"].forEach(r=>this.rounds[r].forEach(g=>{if(g.home===team||g.away===team)out.push([g,g.title])})); return out},
  honours(team){ return {natl:this.champs.PL===team, playoff:!!this.seeds[team], conf:Object.values(this.champs).indexOf(team)>=0} },
  confChampions(){return this.champs},
  clinch(){ return {} }
});
