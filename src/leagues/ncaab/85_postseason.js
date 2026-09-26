/* ============ postseason: college basketball ============ */
/* Conference tournaments (up to twelve teams by conference record; the top
   four have byes to the quarterfinals), then Selection Sunday and the 76-team
   NCAA tournament: 32 automatic bids (conference tournament champions),
   44 at-large; the Opening Round (the 12 lowest-seeded at-large teams for
   the 11 and 12 lines, the 12 lowest-seeded automatic qualifiers for the 15
   and 16 lines), then four regions of sixteen to a champion in Detroit. */
const REGIONS=["East","South","Midwest","West"];
const R64_PAIRS=[[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]];
const CT_ROUNDS=["ct1","ct2","ct3","ct4"];
const NCAA_ROUNDS=["open","r64","r32","s16","e8","f4","final"];
const ROUND_NAME={ct1:"First Round",ct2:"Quarterfinals",ct3:"Semifinals",ct4:"Championship",
  open:"Opening Round",r64:"First Round",r32:"Second Round",s16:"Sweet 16",e8:"Elite Eight",f4:"Final Four",final:"National Championship"};
LEAGUE.post={
  phases:CT_ROUNDS.concat(["selection"],NCAA_ROUNDS),
  run:{ct1:"_ct",ct2:"_ct",ct3:"_ct",ct4:"_ct",selection:"_select",
       open:"_open",r64:"_ncaa",r32:"_ncaa",s16:"_ncaa",e8:"_ncaa",f4:"_ncaa",final:"_ncaa"},
  init(sea){
    sea.champs={}; sea.titles=[]; sea.ctGames={}; sea.ct={};           // conference tournaments
    sea.field=[]; sea.seeds={}; sea.region={}; sea.notes={}; sea.selRec={}; sea.firstOut=[];
    sea.bracket=null; sea.rounds={}; NCAA_ROUNDS.forEach(r=>sea.rounds[r]=[]); sea.bowls=[];
  }
};
extendSeason({
  buttonLabel(){
    const p=this.phase;
    if(p==="week")return `Play ${LEAGUE.dates[this.step]||"game "+(this.step+1)}`;
    if(p==="selection")return "Selection Sunday";
    if(p==="done")return "Enter the offseason";
    return (CT_ROUNDS.indexOf(p)>=0?"Conference tournaments: ":"")+"Play the "+ROUND_NAME[p];
  },
  /* a résumé as the committee sees it: strength, wins, the losses, a title */
  resume(t){
    const r=this.rec[t], g=Math.max(1,r[0]+r[1]);
    return this.elo[t]+ (r[0]-r[1])*4 + (this.champs[CONF[t]]===t?25:0);
  },
  confRank(c){
    const cr=this.confrec;
    return NAMES.filter(t=>CONF[t]===c).sort((x,y)=>{
      const px=cr[x][0]/Math.max(1,cr[x][0]+cr[x][1]), py=cr[y][0]/Math.max(1,cr[y][0]+cr[y][1]);
      return py-px||cr[y][0]-cr[x][0]||this.elo[y]-this.elo[x]});
  },
  /* the conference tournament brackets, set when the regular season ends:
     seeds by conference record; 12 teams at most; the top 4 wait a round */
  _ctSetup(){
    LEAGUE.conf.order.forEach(c=>{
      const s=this.confRank(c).slice(0,12);
      this.ct[c]={seeds:s, alive:s.slice()};
      this.ctGames[c]=[];
    });
  },
  /* who plays whom in this conference-tournament round */
  _ctPairs(c,round){
    const T=this.ct[c], s=T.seeds, n=s.length, idx=t=>s.indexOf(t);
    if(round==="ct1"){
      if(n<=8)return [];                           // eight or fewer: straight to the quarterfinals
      const extra=n-8, out=[];                     // seeds 9..n play seeds 8-extra+1..8
      for(let k=0;k<extra;k++)out.push([s[7-k],s[8+k]]);
      return out;
    }
    const alive=T.alive.slice().sort((a,b)=>idx(a)-idx(b));
    if(alive.length<2)return [];
    const out=[]; for(let i=0;i<Math.floor(alive.length/2);i++)out.push([alive[i],alive[alive.length-1-i]]);
    return out;
  },
  _ct(){
    const round=this.phase;
    if(round==="ct1")this._ctSetup();
    const games=[];
    LEAGUE.conf.order.forEach(c=>{
      this._ctPairs(c,round).forEach(([h,a])=>{
        const g=this._resolve(h,a,true,{title:c+" Tournament "+ROUND_NAME[round],ct:c});
        g.hseed=this.ct[c].seeds.indexOf(h)+1; g.aseed=this.ct[c].seeds.indexOf(a)+1;
        this.ct[c].alive=this.ct[c].alive.filter(t=>t!==g.loser);
        this.ctGames[c].push(g); games.push(g);
        if(round==="ct4")this.champs[c]=g.winner;
      });
      // a conference whose tournament is already down to one (tiny conferences)
      if(round==="ct4"&&!this.champs[c]&&this.ct[c].alive.length===1)this.champs[c]=this.ct[c].alive[0];
    });
    if(round==="ct4")this.titles=LEAGUE.conf.order.map(c=>this.ctGames[c].slice(-1)[0]).filter(Boolean);
    this.poll.update(games,this.elo);
    this.weeks.push({label:"Conference tournaments \u00b7 "+ROUND_NAME[round],date:["Mar 7","Mar 9","Mar 11","Mar 13"][CT_ROUNDS.indexOf(round)],
      games:games,poll:this.top25(this.rankMap()),standings:this.weeks[this.weeks.length-1].standings});
  },
  /* Selection Sunday: 32 automatic bids, 44 at-large, seeded 1-76 */
  _select(){
    const inel=LEAGUE.playoff.ineligible, ok=t=>inel.indexOf(t)<0;
    const byRes=NAMES.slice().sort((a,b)=>this.resume(b)-this.resume(a));
    const aq=[];
    LEAGUE.conf.order.forEach(c=>{
      let t=this.champs[c];
      if(!t||!ok(t)){ t=this.confRank(c).find(ok); }        // an ineligible champion: the bid goes down the table
      aq.push(t); this.notes[t]=c+" champion";
    });
    const al=byRes.filter(t=>ok(t)&&aq.indexOf(t)<0).slice(0,LEAGUE.playoff.atLarge);
    al.forEach(t=>this.notes[t]=this.notes[t]||"At-large");
    this.firstOut=byRes.filter(t=>ok(t)&&aq.indexOf(t)<0&&al.indexOf(t)<0).slice(0,4);
    const field=aq.concat(al).sort((a,b)=>this.resume(b)-this.resume(a));
    this.field=field; this.overall={}; field.forEach((t,i)=>this.overall[t]=i+1);   // the committee's 1-76
    // the Opening Round: the 12 lowest at-large, the 12 lowest automatic qualifiers
    const lowAL=field.filter(t=>al.indexOf(t)>=0).slice(-12), lowAQ=field.filter(t=>aq.indexOf(t)>=0).slice(-12);
    const direct=field.filter(t=>lowAL.indexOf(t)<0&&lowAQ.indexOf(t)<0);            // 52
    // the 64 slots by seed line: 1-10 full, 11 has two direct, 12 none, 13-14 full, 15 two, 16 none
    const direct_lines=[1,2,3,4,5,6,7,8,9,10,11,13,14,15], perLine={11:2,15:2};
    const bracket={}; REGIONS.forEach(r=>bracket[r]={});
    let di=0;
    direct_lines.forEach(line=>{
      const n=perLine[line]||4;
      // an s-curve: odd lines left to right, even lines back again
      const regs=(line%2?REGIONS:REGIONS.slice().reverse()).slice(0,n);
      regs.forEach(r=>{const t=direct[di++]; bracket[r][line]=t; this.seeds[t]=line; this.region[t]=r});
    });
    // Opening Round pairings: best v worst within each group, into the open slots
    const pairUp=(grp)=>{const g=grp.slice(), out=[]; while(g.length>=2)out.push([g.shift(),g.pop()]); return out};
    const openSlots=[];
    REGIONS.forEach(r=>{ if(!bracket[r][11])openSlots.push({region:r,line:11,group:"al"}) });
    REGIONS.forEach(r=>openSlots.push({region:r,line:12,group:"al"}));
    REGIONS.forEach(r=>{ if(!bracket[r][15])openSlots.push({region:r,line:15,group:"aq"}) });
    REGIONS.forEach(r=>openSlots.push({region:r,line:16,group:"aq"}));
    const alPairs=pairUp(lowAL), aqPairs=pairUp(lowAQ);
    this.openGames=[];
    openSlots.forEach(sl=>{
      const pr=(sl.group==="al"?alPairs:aqPairs).shift(); if(!pr)return;
      pr.forEach(t=>{this.seeds[t]=sl.line; this.region[t]=sl.region});
      this.openGames.push({region:sl.region,line:sl.line,a:pr[0],b:pr[1]});
    });
    this.bracket=bracket;
    NAMES.forEach(t=>this.selRec[t]=this.rec[t][0]+"-"+this.rec[t][1]);
    this.cfpRank={}; field.forEach((t,i)=>this.cfpRank[t]=i+1);
  },
  _open(){
    const games=this.openGames.map(o=>{
      const g=this._resolve(o.a,o.b,true,{site:o.line<=12?"Dayton":"Opening Round",title:"Opening Round"});
      g.hseed=o.line; g.aseed=o.line; g.region=o.region;
      this.bracket[o.region][o.line]=g.winner; return g});
    this.rounds.open=games;
    this.poll.update(games,this.elo);
  },
  /* the games of an NCAA round, as pairs [home, away] with their region */
  _ncaaPairs(round){
    const out=[];
    if(round==="r64"){
      REGIONS.forEach(r=>R64_PAIRS.forEach(([x,y])=>out.push({h:this.bracket[r][x],a:this.bracket[r][y],region:r})));
    } else if(round==="f4"){
      const champ=r=>(this.rounds.e8.find(g=>g.region===r)||{}).winner;
      out.push({h:champ("East"),a:champ("South"),region:"Final Four"});
      out.push({h:champ("Midwest"),a:champ("West"),region:"Final Four"});
    } else if(round==="final"){
      const w=this.rounds.f4.map(g=>g.winner); out.push({h:w[0],a:w[1],region:"Final"});
    } else {
      const prev={r32:"r64",s16:"r32",e8:"s16"}[round];
      REGIONS.forEach(r=>{
        const ws=this.rounds[prev].filter(g=>g.region===r).map(g=>g.winner);   // in bracket order
        for(let i=0;i<ws.length;i+=2)out.push({h:ws[i],a:ws[i+1],region:r});
      });
    }
    // the better seed is listed first ("home"); every game is at a neutral site
    return out.map(p=>(this.seeds[p.a]<this.seeds[p.h]||(this.seeds[p.a]===this.seeds[p.h]&&this.resume(p.a)>this.resume(p.h)))?{h:p.a,a:p.h,region:p.region}:p);
  },
  _ncaa(){
    const round=this.phase;
    const site={f4:"Ford Field, Detroit",final:"Ford Field, Detroit"}[round]||null;
    const games=this._ncaaPairs(round).map(p=>{
      const g=this._resolve(p.h,p.a,true,{site:site,title:(p.region&&REGIONS.indexOf(p.region)>=0?p.region+" \u00b7 ":"")+ROUND_NAME[round]});
      g.hseed=this.seeds[p.h]; g.aseed=this.seeds[p.a]; g.region=p.region; return g});
    this.rounds[round]=games;
    if(round==="final")this.champion=games[0].winner;
    this.poll.update(games,this.elo);
  },
  /* what a team faces next in the postseason, and the exact live pairing */
  _nextFor(team){
    const p=this.phase;
    if(CT_ROUNDS.indexOf(p)>=0){
      const c=CONF[team];
      const T=this.ct[c]||(()=>{const s=this.confRank(c).slice(0,12);return {seeds:s,alive:s.slice()}})();
      const save=this.ct[c]; this.ct[c]=T;
      const pr=this._ctPairs(c,p).find(x=>x[0]===team||x[1]===team);
      this.ct[c]=save;
      return pr?{home:pr[0],away:pr[1],neutral:true,label:c+" Tournament "+ROUND_NAME[p]}:null;
    }
    if(p==="open"){const o=(this.openGames||[]).find(o=>o.a===team||o.b===team);
      return o?{home:o.a,away:o.b,neutral:true,label:"Opening Round"}:null}
    if(NCAA_ROUNDS.indexOf(p)>0&&this.bracket){
      const pr=this._ncaaPairs(p).find(x=>x.h===team||x.a===team);
      return pr?{home:pr.h,away:pr.a,neutral:true,label:(REGIONS.indexOf(pr.region)>=0?pr.region+" \u00b7 ":"")+ROUND_NAME[p]}:null;
    }
    return null;
  },
  postMatchup(team){return this._nextFor(team)},
  postNext(team){const m=this._nextFor(team); if(!m)return null;
    return {label:m.label,opp:m.home===team?m.away:m.home,neutral:true}},
  titleField(c){return this.confRank(c)},
  myBowl(){return null},
  seasonResult(my){
    if(this.champion===my)return "NATIONAL CHAMPIONS";
    if(this.field.indexOf(my)<0){
      return this.champs[CONF[my]]===my?"Won the "+CONF[my]+" Tournament":"Missed the NCAA tournament";
    }
    for(const r of NCAA_ROUNDS.slice().reverse()){
      const g=(this.rounds[r]||[]).find(g=>g.loser===my);
      if(g)return r==="final"?"Lost the national championship":r==="open"?"Lost in the Opening Round":"Lost in the "+ROUND_NAME[r];
    }
    return "Made the NCAA tournament";
  },
  postRecord(){
    const confChamps=Object.assign({},this.champs), post={}, pnote={}, cfpOf={};
    const bump=(t,won)=>{post[t]=post[t]||[0,0]; post[t][won?0:1]++};
    NCAA_ROUNDS.forEach(r=>(this.rounds[r]||[]).forEach(g=>{bump(g.winner,true); bump(g.loser,false);
      pnote[g.loser]="NCAA tournament \u2014 lost in the "+(r==="final"?"national championship":ROUND_NAME[r])}));
    if(this.champion)pnote[this.champion]="National champions";
    this.field.forEach(t=>cfpOf[t]=this.seeds[t]);
    return {confChamps,bowlOf:{},post,pnote,cfpOf};
  },
  postPools(){
    const ct=[]; Object.keys(this.ctGames||{}).forEach(c=>ct.push(...this.ctGames[c]));
    return NCAA_ROUNDS.slice().reverse().map(r=>this.rounds[r]||[]).concat([ct]);
  },
  postGamesFor(team){
    const out=[];
    (this.ctGames[CONF[team]]||[]).forEach(g=>{if(g.home===team||g.away===team)out.push([g,g.title])});
    NCAA_ROUNDS.forEach(r=>(this.rounds[r]||[]).forEach(g=>{if(g.home===team||g.away===team)out.push([g,"NCAA "+ROUND_NAME[r]])}));
    return out;
  },
  honours(team){return {natl:this.champion===team,playoff:this.field.indexOf(team)>=0,
    conf:Object.keys(this.champs).some(c=>this.champs[c]===team)}},
  confChampions(){return this.champs}
});
