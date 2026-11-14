/* ============ the NBA Cup ============ */
/* The in-season tournament, as the real one (Ian: "the NBA has something called the NBA Cup"). Six groups of five,
   three a conference, drawn each season; every team plays its four group rivals once on the Cup nights (Nov 11 to
   Dec 3), and those games are league games: they count in the standings. The six group winners and the best runner-up in each conference go through: quarter-finals
   at the better seed (Dec 9), semi-finals and the championship in Las Vegas (Dec 14 and 16).
   Every Cup game is a league game, the championship too (in the real NBA it isn't): said on the Cup page. */
const NBACUP_WINDOW=[10,20];                         // the Cup nights: Nov 11 to Dec 3
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
  const C=sea.cup={rng:rng, groups:{}, gof:{}, games:[], draws:{}, played:{}, out:{}, winner:null, finalist:null, next:0, lastGroup:0, seeds:null};
  ["East","West"].forEach(sd=>{
    const teams=rng.shuffle(NAMES.filter(t=>LEAGUE.conf.sides[sd].indexOf(CONF[t])>=0));
    ["A","B","C"].forEach((k,j)=>{ const id=sd+" "+k, mem=teams.slice(j*5,j*5+5); C.groups[id]=mem; mem.forEach(t=>C.gof[t]=id) }) });
  // The group games are league games, as in the real Cup: each one takes the place of a game already on a Cup night.
  // Both teams playing that night: their two opponents meet instead (every team keeps its 82, one game a day).
  // Both free: the pair's next meeting moves up to it. Instinct: Cup nights had been a second game on a day you
  // already played, and the season ran to 86.
  const on=new Map(), at=(w,t)=>sea.sched.find(g=>g.week===w&&!g.cup&&(g.home===t||g.away===t));
  const pairs=[]; Object.keys(C.groups).forEach(id=>{ const m=C.groups[id]; for(let a=0;a<5;a++)for(let b=a+1;b<5;b++)pairs.push([id,m[a],m[b]]) });
  const used={}; NAMES.forEach(t=>used[t]=new Set());   // Cup nights a team already has
  const nights=[]; for(let w=NBACUP_WINDOW[0];w<=NBACUP_WINDOW[1];w++)nights.push(w);
  rng.shuffle(pairs).forEach(([id,a,b])=>{
    for(const w of rng.shuffle(nights.slice())){
      if(used[a].has(w)||used[b].has(w))continue;
      const ga=at(w,a), gb=at(w,b);
      if(ga&&gb&&ga!==gb){ const x=ga.home===a?ga.away:ga.home, y=gb.home===b?gb.away:gb.home;
        if(x===b||y===a||x===y||used[x].has(w)||used[y].has(w))continue;
        const h=ga.home===a?a:b, aw=h===a?b:a;
        ga.home=h; ga.away=aw; ga.cupG=id; ga.conf=CONF[a]===CONF[b];
        gb.home=x; gb.away=y; gb.conf=CONF[x]===CONF[y];
        used[a].add(w); used[b].add(w); C.games.push({week:w,home:h,away:aw}); return }
      if(!ga&&!gb){ const later=sea.sched.filter(g=>!g.cup&&!g.cupG&&g.week>w&&((g.home===a&&g.away===b)||(g.home===b&&g.away===a))).sort((p,q)=>q.week-p.week)[0];
        if(!later)continue;
        later.week=w; later.cupG=id; used[a].add(w); used[b].add(w); C.games.push({week:w,home:later.home,away:later.away}); return }
    }
    C.unplaced=(C.unplaced||0)+1;   // no night found: counted, so a test can say so
  });
  sea.sched.sort((p,q)=>p.week-q.week);
  if(SCHED_V>=3)nbaHomeBalance(sea.sched);
  C.lastGroup=C.games.reduce((m,x)=>Math.max(m,x.week),0);
};
/* round 71: the Cup's group nights hand games to new pairs, and the hosts went with them: 27 of 30 clubs ended away
   from 41 at home, up to 45-37 (measured). Afterwards each club over 41 passes a home game along a chain of league
   games (not the Cup's) to one under 41, as the schedule builder does. No draws. */
function nbaHomeBalance(sched){
  const home={}; NAMES.forEach(t=>home[t]=0); sched.forEach(g=>{ if(!g.neutral)home[g.home]++ });
  const free=sched.filter(g=>!g.cupG&&!g.cup&&!g.cupK&&!g.neutral);
  for(let pass=0;pass<300;pass++){
    const over=NAMES.filter(t=>home[t]>41).sort()[0]; if(!over)break;
    const prev=new Map([[over,null]]), q=[over]; let end=null;
    while(q.length&&!end){ const t=q.shift();
      for(const g of free){ if(g.home!==t||prev.has(g.away))continue; prev.set(g.away,g); if(home[g.away]<41){end=g.away;break} q.push(g.away) } }
    if(!end)break;
    for(let t=end;prev.get(t);){ const g=prev.get(t), from=g.home; home[from]--; home[g.away]++; g.home=g.away; g.away=from; t=from }
  }
}
/* a group game, from the schedule entry or a played result */
function nbaCupGroupGame(sea,g){ const C=sea&&sea.cup; if(!C||!C.games)return false;
  return C.games.some(x=>x.week===(g.week!==undefined?g.week:x.week)&&x.home===g.home&&x.away===g.away) }
/* the group tables: wins, then head to head, then points for and against in group games */
function nbaCupTables(sea){
  const C=sea.cup, T={};
  Object.keys(C.groups).forEach(id=>C.groups[id].forEach(t=>T[t]={t:t,g:id,w:0,l:0,pd:0,pl:0,beat:{}}));
  C.games.forEach(x=>{ const W=sea.weeks[x.week]; const r=W&&W.games.find(g=>g.home===x.home&&g.away===x.away&&!g.cup); if(!r||r.winner===undefined)return;
    const H=T[x.home], A=T[x.away]; H.pl++; A.pl++; H.pd+=r.hp-r.ap; A.pd+=r.ap-r.hp;
    if(r.winner===x.home){H.w++;A.l++;H.beat[x.away]=1}else{A.w++;H.l++;A.beat[x.home]=1} });
  const out={}; Object.keys(C.groups).forEach(id=>{ out[id]=C.groups[id].map(t=>T[t]).sort((a,b)=>b.w-a.w||(a.beat[b.t]?-1:b.beat[a.t]?1:0)||b.pd-a.pd||(a.t<b.t?-1:1)) });
  return out;
}
function nbaCupDraw(sea,i,pairs){
  const C=sea.cup, R=NBACUP_ROUNDS[i];
  C.draws[i]=pairs.map(p=>[p[0],p[1]]);
  // Knockout games are league games too, taking the place of each team's game that night; their old opponents meet
  // each other instead, so everyone keeps 82 and nobody plays twice in a day (Instinct: a knockout game was a second
  // game on a day you already played). The night: the first from the round's date when all its teams have a game.
  const ts=[].concat(...pairs), kt=new Set(ts), dayOf=w=>sea.sched.filter(g=>g.week===w&&!g.cup&&(kt.has(g.home)||kt.has(g.away)));
  const playing=w=>{ const on=new Set(); dayOf(w).forEach(g=>{on.add(g.home);on.add(g.away)}); return ts.every(t=>on.has(t)) };
  const start=Math.max(R.week,(C.roundWeek&&C.roundWeek[i-1]!==undefined?C.roundWeek[i-1]+1:0));
  let wk=start; while(!playing(wk)&&wk<start+8)wk++;
  if(!playing(wk)){ wk=start; C.extra=(C.extra||0)+1 }   // never seen in testing: an extra game, counted so a test says so
  (C.roundWeek=C.roundWeek||{})[i]=wk;
  const L=dayOf(wk), out=[];
  L.forEach(g=>{ const x=kt.has(g.home)?(kt.has(g.away)?null:g.away):g.home; if(x)out.push(x); sea.sched.splice(sea.sched.indexOf(g),1) });
  pairs.forEach(p=>{ const g={week:wk,home:p[0],away:p[1],cupK:i,round:i,conf:CONF[p[0]]===CONF[p[1]],neutral:!!R.neutral,title:nbaCupTitle(i)};
    if(R.neutral)g.site="Las Vegas"; sea.sched.push(g) });
  C.rng.shuffle(out);
  // round 71 (schedV 3): the stand-in game goes to whichever club has fewer home games on its schedule
  const hc=t=>sea.sched.filter(g=>g.home===t&&!g.neutral).length;
  for(let k=0;k+1<out.length;k+=2){ let h=out[k], a=out[k+1]; if(SCHED_V>=3&&hc(a)<hc(h)){ const z=h; h=a; a=z } sea.sched.push({week:wk,home:h,away:a,conf:CONF[h]===CONF[a]}) }
  sea.sched.sort((p,q)=>p.week-q.week);
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
  const i=C.roundWeek?Object.keys(C.roundWeek).map(Number).find(k=>C.roundWeek[k]===w):undefined; if(i===undefined||!C.draws[i]||C.played[i])return;
  const games=(sea.weeks[w]&&sea.weeks[w].games||[]).filter(g=>C.draws[i].some(p=>p[0]===g.home&&p[1]===g.away));
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
/* a group game (a league game on a Cup night): what it's for, on the next-up card */
function nbaCupKnock(sea,g){ const C=sea&&sea.cup; if(!C||!C.roundWeek)return -1;
  for(const k of Object.keys(C.roundWeek))if(C.roundWeek[k]===g.week&&C.draws[k]&&C.draws[k].some(p=>p[0]===g.home&&p[1]===g.away))return +k;
  return -1 }
function nbaCupGroupLine(g){
  const C=SEA.cup, my=S.myTeam; if(!C||!C.gof)return "";
  const k=nbaCupKnock(SEA,g); if(k>=0)return nbaCupStake(my,null,{round:k})+" It counts in the standings too.";
  if(!nbaCupGroupGame(SEA,g))return "";
  return nbaCupStake(my,null,{round:-1}).replace(/^A group game/,"An NBA Cup group game, and a league game too");
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
  const k=SEA.cup?nbaCupKnock(SEA,g):-1;
  if(k>=0){ const won=g.winner===my, last=k===NBACUP_ROUNDS.length-1;
    return `<div class="hmove ${won?'up':'dn'}">${won?(last?"NBA CUP WINNERS":"Through to the NBA Cup "+NBACUP_ROUNDS[k+1].name+(NBACUP_ROUNDS[k+1].neutral?", in Las Vegas":"")):(last?"Beaten in the NBA Cup championship":"Out of the NBA Cup in the "+NBACUP_ROUNDS[k].name)}</div><button class="rewatch seedraw" data-cupview="1">See the Cup</button>` }
  if(g.round!==-1&&!(SEA.cup&&nbaCupGroupGame(SEA,g)))return null;
  const C=SEA.cup, T=nbaCupTables(SEA)[C.gof[my]]||[], me=T.find(x=>x.t===my), won=g.winner===my;
  return `<div class="hmove ${won?'up':'dn'}">NBA Cup group game: ${won?"won":"lost"} &middot; ${me?me.w+"-"+me.l:""} in ${esc(C.gof[my].replace(/ /," Group "))}</div><button class="rewatch seedraw" data-cupview="1">See the Cup</button>`;
}
LEAGUE.cup=NBACUP_ON?{name:"NBA Cup", tag:"NBA CUP", rule:"Tied after regulation: overtime.", noRecord:"Every Cup game is a league game and counts in the standings, the championship too (in the real NBA it doesn't), so everyone plays exactly 82.",
  rounds:NBACUP_ROUNDS, weeks:NBACUP_WEEKS, fate:nbaCupFate, date:w=>(LEAGUE.dates[w]||"")+", Cup night", stake:nbaCupStake, result:nbaCupResult, groupLine:nbaCupGroupLine, groups:true}:undefined;
if(NBACUP_ON){
  // (no split days: every Cup game is a league game)
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
