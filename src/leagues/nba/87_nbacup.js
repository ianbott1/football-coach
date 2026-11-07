/* ============ the NBA Cup ============ */
/* The in-season tournament, as the real one (Ian: "the NBA has something called the NBA Cup"). Six groups of five,
   three a conference, drawn each season; every team plays its four group rivals once on the November Cup nights
   (Nov 11 to Nov 28). The six group winners and the best runner-up in each conference go through: quarter-finals
   at the better seed (Dec 9), semi-finals and the championship in Las Vegas (Dec 14 and 16).
   One difference from the real thing, said where it shows: the Cup games are extra games and don't count in the
   standings (in the real NBA all but the championship do), so every team still plays its 82: the schedule has no
   room to make the group games league games. The draw and the Cup games use their own dice, so no other game's
   result moves; only the teams that play them carry their tiredness and knocks on. */
const NBACUP_NIGHTS=[10,12,14,17,19];               // Nov 11, 15, 19, 24, 28: five nights, each team plays four
// a round robin of five over five nights: [a,b] index pairs, one team resting each night
const NBACUP_RR=[[[0,1],[2,3]],[[0,2],[1,4]],[[0,3],[2,4]],[[1,3],[0,4]],[[1,2],[3,4]]];
const NBACUP_ROUNDS=[
  {k:"qf",name:"quarter-final",short:"QF",   week:23},
  {k:"sf",name:"semi-final",   short:"SF",   week:25, neutral:true},
  {k:"f", name:"championship", short:"Final",week:26, neutral:true}
];
const NBACUP_WEEKS={}; NBACUP_ROUNDS.forEach((r,i)=>NBACUP_WEEKS[r.week]=i);
const NBACUP_ON=!(typeof process!=="undefined"&&process.env&&process.env.NBA_CUP==="0");   // a control build turns it off
function nbaCupTitle(i){ return "NBA Cup "+NBACUP_ROUNDS[i].name }
const _nbaInit=LEAGUE.post.init;
LEAGUE.post.init=function(sea){
  _nbaInit(sea);
  if(!NBACUP_ON)return;
  const rng=new RNG((sea.year*104729+0xB0C)>>>0);
  const C=sea.cup={rng:rng, gr:new RNG((sea.year*7919+0xCAB)>>>0), groups:{}, gof:{}, games:[], draws:{}, played:{}, out:{}, winner:null, finalist:null, next:0, lastGroup:0, seeds:null};
  ["East","West"].forEach(sd=>{
    const teams=rng.shuffle(NAMES.filter(t=>LEAGUE.conf.sides[sd].indexOf(CONF[t])>=0));
    ["A","B","C"].forEach((k,j)=>{ const id=sd+" "+k, mem=teams.slice(j*5,j*5+5); C.groups[id]=mem; mem.forEach(t=>C.gof[t]=id) }) });
  // the group nights: home and away alternate by the draw
  Object.keys(C.groups).forEach(id=>{ const mem=C.groups[id];
    NBACUP_RR.forEach((night,n)=>night.forEach(([a,b],k)=>{ const h=(n+k)%2?mem[b]:mem[a], aw=h===mem[a]?mem[b]:mem[a];
      const g={week:NBACUP_NIGHTS[n],home:h,away:aw,cup:true,round:-1,group:id,conf:false,title:"NBA Cup group game"};
      sea.sched.push(g); C.games.push({week:g.week,home:h,away:aw}) })) });
  C.lastGroup=NBACUP_NIGHTS[NBACUP_NIGHTS.length-1];
};
/* a group game, from the schedule entry or a played result */
function nbaCupGroupGame(sea,g){ const C=sea&&sea.cup; if(!C||!C.games)return false;
  return C.games.some(x=>x.week===(g.week!==undefined?g.week:x.week)&&x.home===g.home&&x.away===g.away) }
/* the group tables: wins, then head to head, then points for and against in group games */
function nbaCupTables(sea){
  const C=sea.cup, T={};
  Object.keys(C.groups).forEach(id=>C.groups[id].forEach(t=>T[t]={t:t,g:id,w:0,l:0,pd:0,pl:0,beat:{}}));
  C.games.forEach(x=>{ const W=sea.weeks[x.week]; const r=W&&W.games.find(g=>g.home===x.home&&g.away===x.away&&g.cup); if(!r||r.winner===undefined)return;
    const H=T[x.home], A=T[x.away]; H.pl++; A.pl++; H.pd+=r.hp-r.ap; A.pd+=r.ap-r.hp;
    if(r.winner===x.home){H.w++;A.l++;H.beat[x.away]=1}else{A.w++;H.l++;A.beat[x.home]=1} });
  const out={}; Object.keys(C.groups).forEach(id=>{ out[id]=C.groups[id].map(t=>T[t]).sort((a,b)=>b.w-a.w||(a.beat[b.t]?-1:b.beat[a.t]?1:0)||b.pd-a.pd||(a.t<b.t?-1:1)) });
  return out;
}
function nbaCupDraw(sea,i,pairs){
  const C=sea.cup, R=NBACUP_ROUNDS[i];
  C.draws[i]=pairs.map(p=>[p[0],p[1]]);
  pairs.forEach(p=>{ const g={week:R.week,home:p[0],away:p[1],cup:true,round:i,conf:false,neutral:!!R.neutral,title:nbaCupTitle(i)};
    if(R.neutral)g.site="Las Vegas"; sea.sched.push(g) });
  C.next=i;
}
const _nbaAfter=LEAGUE.afterWeek;
LEAGUE.afterWeek=function(sea,w){
  if(_nbaAfter)_nbaAfter(sea,w);
  const C=sea.cup; if(!C||!C.groups)return;
  if(w===C.lastGroup&&!C.seeds){
    // the knockout field: the group winners by record, then the best runner-up, in each conference
    const tb=nbaCupTables(sea); C.tables=tb; C.seeds={};
    ["East","West"].forEach(sd=>{ const ids=Object.keys(tb).filter(id=>id.indexOf(sd)===0), by=(a,b)=>b.w-a.w||b.pd-a.pd||(a.t<b.t?-1:1);
      const win=ids.map(id=>tb[id][0]).sort(by), wild=ids.map(id=>tb[id][1]).sort(by)[0];
      C.seeds[sd]=win.map(x=>x.t).concat([wild.t]) });
    const pairs=[]; ["East","West"].forEach(sd=>{ const s=C.seeds[sd]; pairs.push([s[0],s[3]],[s[1],s[2]]) });
    nbaCupDraw(sea,0,pairs); return }
  const i=NBACUP_WEEKS[w]; if(i===undefined||!C.draws[i])return;
  const games=(sea.weeks[w]&&sea.weeks[w].games||[]).filter(g=>g.cup);
  C.played[i]=games; games.forEach(g=>{ C.out[g.loser]=i });
  const win=C.draws[i].map(p=>{ const g=games.find(x=>x.home===p[0]&&x.away===p[1]); return g?g.winner:p[0] });
  if(i===NBACUP_ROUNDS.length-1){ C.winner=win[0]||null; C.finalist=games[0]?games[0].loser:null; return }
  if(i===0)nbaCupDraw(sea,1,[[win[0],win[1]],[win[2],win[3]]]);                 // East, West: in Las Vegas
  else nbaCupDraw(sea,2,[[win[0],win[1]]]);
};
function nbaCupFate(sea,t){
  const C=sea&&sea.cup; if(!C||!C.groups)return null;
  if(C.winner===t)return "Winners";
  if(C.out[t]!==undefined)return C.out[t]===2?"Runners-up":"Out in the "+NBACUP_ROUNDS[C.out[t]].name;
  if(C.seeds&&!["East","West"].some(sd=>C.seeds[sd].indexOf(t)>=0))return "Out in the group stage";
  return null;
}
function nbaCupStake(my,opp,g){
  if(g.round===-1){ const C=SEA.cup, T=nbaCupTables(SEA)[C.gof[my]]||[], me=T.find(x=>x.t===my), pos=T.indexOf(me)+1;
    return `A group game: you're ${me?me.w+"-"+me.l:"0-0"} in ${esc(C.gof[my].replace(/ /," Group "))}, ${pos===1?"top":(["","","second","third","fourth","fifth"][pos]||pos+"th")}. Win the group, or be the best runner-up in your conference, for the quarter-finals.` }
  const R=NBACUP_ROUNDS[g.round];
  if(R.k==="f")return "The NBA Cup championship, in Las Vegas.";
  if(R.k==="sf")return "An NBA Cup semi-final in Las Vegas. Win and you play for the Cup.";
  return "An NBA Cup quarter-final. Lose and you're out; win and it's Las Vegas.";
}
/* the result card's line for a Cup game */
function nbaCupResult(g,my){
  if(g.round!==-1)return null;
  const C=SEA.cup, T=nbaCupTables(SEA)[C.gof[my]]||[], me=T.find(x=>x.t===my), won=g.winner===my;
  return `<div class="hmove ${won?'up':'dn'}">NBA Cup group game: ${won?"won":"lost"} &middot; ${me?me.w+"-"+me.l:""} in ${esc(C.gof[my].replace(/ /," Group "))}</div><button class="rewatch seedraw" data-cupview="1">See the Cup</button>`;
}
LEAGUE.cup=NBACUP_ON?{name:"NBA Cup", tag:"NBA CUP", rule:"Tied after regulation: overtime.", noRecord:"Cup games don't count in the standings here (in the real NBA all but the championship do).",
  rounds:NBACUP_ROUNDS, weeks:NBACUP_WEEKS, fate:nbaCupFate, date:w=>(LEAGUE.dates[w]||"")+", Cup night", stake:nbaCupStake, result:nbaCupResult, groups:true}:undefined;
if(NBACUP_ON){
  LEAGUE.splitCup=true;
  LEAGUE.trophyNow=(sea,t)=>sea&&sea.cup&&sea.cup.winner===t?{key:"nbacup",line:"NBA Cup winners"}:null;
  LEAGUE.cardLine=(h,team)=>{ const c=h&&h.league&&h.league.cup; if(!c||!c.mine)return null;
    return c.mine==="Winners"?"NBA CUP WINNERS":c.mine==="Runners-up"?"NBA Cup finalists":null };
  const _he=LEAGUE.historyExtras;
  LEAGUE.historyExtras=function(sea,off,my){ const o=_he(sea,off,my); o.cup={mine:nbaCupFate(sea,my),winner:sea.cup&&sea.cup.winner||null,finalist:sea.cup&&sea.cup.finalist||null}; return o };
}
/* one knockout game in the bracket */
function cgame(g,a,b){
  const slot=(t,pts,win)=>`<div class="bslot ${win?'bwin':''} ${t&&t===S.myTeam?'bmine':''}" style="--tc:${t?teamInk(t):'transparent'}">
    <span class="bseed"></span><span class="bteam">${t?esc(t):'<span class="btbd">to be decided</span>'}</span><span class="bpts">${pts===undefined||pts===null?"":pts}</span></div>`;
  if(g)return `<div class="bgame">${slot(g.home,g.hp,g.winner===g.home)}${slot(g.away,g.ap,g.winner===g.away)}</div>`;
  return `<div class="bgame">${slot(a)}${slot(b)}</div>`;
}
/* the Cup page: your group, the other groups, and the knockout bracket */
function nbaCupView(){
  const C=SEA.cup, my=S.myTeam; if(!C||!C.groups)return `<div class="note">No NBA Cup this season.</div>`;
  const tb=C.tables||nbaCupTables(SEA), fate=nbaCupFate(SEA,my), mine=C.gof[my];
  let h=`<div class="note">${fate?`<b>${esc(fate==="Winners"?"NBA Cup winners.":fate+".")}</b> `:""}Six groups of five, each team playing its four group rivals on the November Cup nights. Group winners and the best runner-up in each conference reach the quarter-finals; the semi-finals and the championship are in Las Vegas. ${esc(LEAGUE.cup.noRecord)}</div>`;
  if(C.winner)h+=`<div class="note"><b>${esc(C.winner)}</b> win the NBA Cup${C.finalist?", beating "+esc(C.finalist)+" in the championship":""}.</div>`;
  const grp=id=>`<div class="grouphead">${esc(id.replace(/ /," Group "))}</div>`+tb[id].map((x,k)=>`<div class="frow ${x.t===my?'mine':''}">
      <span class="sd">${k+1}</span><span class="dot" style="background:${teamColor(x.t)}"></span>
      <div class="fmain"><div class="fname">${TL(x.t)}</div><div class="fnote">${x.pl} of 4 played${C.seeds&&(C.seeds.East.concat(C.seeds.West)).indexOf(x.t)>=0?" &middot; through":""}</div></div>
      <span class="fcfp">${x.w}-${x.l} &middot; ${x.pd>=0?"+":""}${x.pd}</span></div>`).join("");
  if(mine)h+=grp(mine);
  if(C.draws[0]){ const tie=(i,p)=>C.played[i]?C.played[i].find(x=>x.home===p[0]&&x.away===p[1]):null;
    const col=(i,n)=>{ const D=C.draws[i]||[], out=[]; for(let k=0;k<n;k++){ const p=D[k], g=p?tie(i,p):null; out.push(g?cgame(g):p?cgame(null,p[0],p[1]):cgame(null)) }
      return `<div class="bcol"><div class="bhead">${esc(NBACUP_ROUNDS[i].name.replace(/^./,c=>c.toUpperCase()))}</div><div class="bgames">${out.join("")}</div></div>` };
    h+=`<div class="grouphead">The knockout rounds</div><div class="bracket">${col(0,4)}${col(1,2)}${col(2,1)}</div>`; }
  Object.keys(tb).filter(id=>id!==mine).forEach(id=>h+=grp(id));
  return h;
}
