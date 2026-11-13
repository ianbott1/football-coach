/* ============ game screens: soccer ============ */
/* The scoreboard (home side first), the run of play in five-minute spells with
   names, the evidence panel the calls are made from, the call screen with the
   staff's advice, and the replay view. */

/* ---- names ---- */
const SC_UNIT={GK:0,CB:1,FB:2,CM:3,W:4,ST:5};
function scPlayer(team,unit,u){
  const R=SEA.roster&&SEA.roster[team]; if(!R)return null;
  const i=SC_UNIT[unit]; const p=R[i]; const b=R[BK(i)];
  // the bench gets a game now and then (rotation, a knock)
  const pick=(b&&(u%10)<2)?b:p; return pick?pick.n:null;
}
// a surname shared on the ice or pitch gets its initial ("Sissoko scored on Sissoko": Instinct)
const surname=n=>{ if(!n)return ""; const L=n.split(" ").slice(-1)[0]; try{ const g=typeof live!=="undefined"&&live&&live.g; if(g&&typeof surnameIn==="function")return surnameIn(n,g) }catch(e){} return L };
function scScorer(team,u){
  // who scores: strikers most, then wingers, midfield, defenders off set pieces
  const x=u%100, unit=x<38?"ST":x<64?"W":x<84?"CM":x<92?"CB":"FB";
  return {n:scPlayer(team,unit,u)||"a forward", unit:unit};
}
/* a game you watched: the goals go to the men the commentary named (core 80_season) */
function scLogCredit(tm,side,drives){
  const C={}; (drives||[]).forEach(d=>(d.ev||[]).forEach(e=>{ if(e.k!=="goal"||e.side!==side)return; const s=scScorer(tm,e.u||0); if(!s.n||s.n==="a forward")return; (C[s.n]=C[s.n]||{goals:0}).goals++ }));
  return C;
}
const FINISH={
  ST:["slots it under the keeper","finishes first time from close range","turns and fires into the bottom corner","heads in at the near post","rounds the keeper and rolls it in"],
  W:["cuts inside and curls it into the far corner","arrives at the back post to tap in","beats his man and drills it low past the keeper"],
  CM:["hits one from distance that flies in","arrives late in the box and side-foots it home","scores from the penalty spot"],
  CB:["heads home from a corner","bundles it in from a set piece"],
  FB:["overlaps and finds the far corner","steers in a deflected effort"]
};
const CUE={
  // third person, naming the other side: "we can't play out from the back" was said of Stoke when Stoke were the
  // ones pressing (Instinct): the cue's side can be yours
  press:["{t} press high again; {o} can't play out from the back","Turnover high up the pitch for {t}","{t} hunt in packs: the ball's won back in {o}'s half again"],
  block:["{t} have ten men behind the ball","Another spell of sideways passing in front of {t}'s block","{t} happy to let {o} have it and sit in two banks of four"],
  wing:["Another cross from the {s} for {t}","{t} doubling up out wide on the {s}","{t} get in behind on the {s} again"],
  direct:["Long ball forward from {t}'s keeper, flicked on","{t} going route one, straight to the big man","{t} skip midfield entirely: ball over the top"]
};
const MISS=["drags it wide from close range","heads over from a corner","hits the post","blazes over with only the keeper to beat","sees a shot blocked on the line"];
const SAVE=["saves well from","tips over a header from","gets down to keep out","spreads himself to deny"];
function pickOf(a,u){return a[u%a.length]}
/* who is booked: once per player per match. The engine books a unit (a centre-back on a yellow can see red; any other
   booking is someone else's), and the names were drawn per event, so one man was booked at 7' and 11' and stayed on
   (Muse, round 50). Each booking is named once and remembered; a second yellow goes to someone not yet booked, and
   the red to the booked centre-back. */
const CARD_NAMES=typeof WeakMap!=="undefined"?new WeakMap():null;
function cardName(g,e,tm,u){
  if(CARD_NAMES&&CARD_NAMES.has(e))return CARD_NAMES.get(e);
  const B=(g.__bk=g.__bk||{}), bk=(B[tm]=B[tm]||{names:[],cb:null});
  let n;
  if(e.k==="red")n=bk.cb||scPlayer(tm,"CB",1);
  else{ const order=e.def?["CB","FB","CM","W","ST"]:[pickOf(["CM","FB","W","ST"],u),"CM","FB","W","ST","CB"];
    for(const unit of order){ const c=scPlayer(tm,unit,u); if(c&&bk.names.indexOf(c)<0){ n=c; break } }
    if(!n)n=scPlayer(tm,"CM",u);
    if(n){ bk.names.push(n); if(e.def&&!bk.cb&&n===scPlayer(tm,"CB",u))bk.cb=n } }
  if(CARD_NAMES)CARD_NAMES.set(e,n); return n }
/* one event as a line of commentary */
/* round 72: a scorer's goals in one match each get their own words ("cuts inside and curls it into the far corner"
   three times for one hat-trick: Instinct). used: per scorer, the finishes already said in this match, in order */
function scFinish(s,u,used){ const L=FINISH[s.unit]; if(!used)return pickOf(L,u>>2);
  const k=s.unit+"|"+s.n, S=used[k]=used[k]||new Set(); if(S.size>=L.length)S.clear();
  const n=L.length, i0=((u>>2)%n+n)%n; for(let j=0;j<n;j++){ const i=(i0+j)%n; if(!S.has(i)){ S.add(i); return L[i] } } return L[i0] }
/* the words for one event as the match has them so far: every earlier goal counted, so a row and its clip agree */
function scEventTextIn(g,drives,e){ const used={}; for(const d of drives||[])for(const x of d.ev||[]){ if(x===e)return scEventText(g,x,used); if(x.k==="goal")scEventText(g,x,used) }
  return scEventText(g,e) }
function scEventText(g,e,used){
  const surname=n=>surnameIn(n,g);   // an initial when both sides have the surname
  const tm=e.side==="home"?g.home:g.away, opp=e.side==="home"?g.away:g.home, u=e.u||0;
  if(e.k==="goal"){ const s=scScorer(tm,u); return {team:tm,tag:"GOAL",text:`${s.n} ${scFinish(s,u,used)}`} }
  if(e.k==="save"){ const s=scScorer(tm,u), gk=scPlayer(opp,"GK",u)||"the keeper";
    // round 72: the row is the keeper's, as its sentence is: "Fulham Orozco gets down to keep out Faulkner" put
    // Sunderland's keeper under Fulham (Instinct); every other row names the team of the man it starts with, as hockey's saves do
    return {team:opp,tag:"",text:`${surname(gk)} ${pickOf(SAVE,u>>3)} ${surname(s.n)}`} }
  if(e.k==="miss"){ const s=scScorer(tm,u); return {team:tm,tag:"",text:`${s.n} ${pickOf(MISS,u>>3)}`} }
  if(e.k==="yellow"){ const n=cardName(g,e,tm,u);
    return {team:tm,tag:"YELLOW",text:`${n||"a defender"} booked${e.def&&n===scPlayer(tm,"CB",u)?" (centre-back)":""}`} }
  if(e.k==="red"){ const n=cardName(g,e,tm,u); return {team:tm,tag:"RED",text:`${n||"The centre-back"} sees a second yellow. Down to ten.`} }
  if(e.k==="cue"){ const line=pickOf(CUE[e.cue],u).replace("{t}",tm).replace("{o}",opp).replace("{s}",u%2?"left":"right");
    return {team:tm,tag:"",text:line,cue:true} }
  return {team:tm,tag:"",text:""};
}
function segLabel(d){ return d.seg>=SEGS?(d.so?"Penalties":"Extra time"):segClock(d.seg) }
/* the replay script: one row per event, a quiet row for a quiet spell */
function driveScript(g,drives){
  const out=[], used={};
  drives.forEach(d=>{
    if(d.seg>=SEGS){ const hw=d.pens?d.pens==="home":d.sh>d.sa, tm=hw?g.home:g.away;
      (d.ev||[]).forEach(e=>{const t=scEventText(g,e,used); out.push({seg:d.seg,clock:e.m+"'",team:t.team,outcome:t.tag,text:t.text,h:d.sh,a:d.sa})});
      out.push({seg:d.seg,clock:d.so?"PENS":"ET",team:tm,outcome:d.so?"PENALTIES":"",text:d.so?`win it on penalties`:`win it in extra time`,h:d.sh,a:d.sa});
      return }
    let sh=d.sh-d.h, sa=d.sa-d.a;
    const ev=(d.ev||[]).filter(e=>e.k!=="cue"||((e.u||0)%3===0));
    if(!ev.length){ out.push({seg:d.seg,clock:segClock(d.seg),team:"",outcome:"",text:"",h:sh,a:sa,quiet:true}); return }
    ev.forEach(e=>{ if(e.k==="goal"){ if(e.side==="home")sh++; else sa++ }
      const t=scEventText(g,e,used); out.push({seg:d.seg,clock:e.m+"'",team:t.team,outcome:t.tag,text:t.text,h:sh,a:sa,cue:t.cue}) });
  });
  return out;
}
/* a computer game: eighteen spells whose goals add up to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), out=[];
  const reg=g.ot?Math.min(g.hp,g.ap):null;
  const split=(tot)=>{const v=Array.from({length:SEGS},()=>0); for(let i=0;i<tot;i++)v[rng.int(SEGS)]++; return v};
  const hs=split(reg!==null?reg:g.hp), as=split(reg!==null?reg:g.ap); let sh=0,sa=0;
  for(let s=0;s<SEGS;s++){ sh+=hs[s]; sa+=as[s]; const ev=[];
    for(let i=0;i<hs[s];i++)ev.push({m:s*5+1+rng.int(5),side:"home",k:"goal",u:rng.int(100)});
    for(let i=0;i<as[s];i++)ev.push({m:s*5+1+rng.int(5),side:"away",k:"goal",u:rng.int(100)});
    if(rng.r()<0.25)ev.push({m:s*5+1+rng.int(5),side:rng.r()<0.5?"home":"away",k:rng.r()<0.5?"save":"miss",u:rng.int(100)});
    ev.sort((x,y)=>x.m-y.m);
    out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa,ev:ev}) }
  if(reg!==null)out.push({seg:SEGS,sh:g.hp,sa:g.ap,ot:1,so:!!g.so,pens:g.pens?(g.pens===g.home?"home":"away"):null,h:g.hp-reg,a:g.ap-reg,ev:[]});
  return driveScript(g,out);
}
function liveGapFor(L,mult){
  const d=L.drives[L.drives.length-1];
  const n=d&&d.ev?d.ev.filter(e=>e.k!=="cue"||((e.u||0)%3===0)).length:0;
  const base=n?1300+n*350:520;
  return Math.max(110,Math.round(base*0.52/mult));
}

/* ---- the scoreboard ---- */
function scoreTop(g,H,A,label,cls){
  return `<div class="wtop ${cls||""}">
    <div class="wlabel">${label}</div>
    <div class="wscore">
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span><span class="wn">${H}</span></div>
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span><span class="wn">${A}</span></div>
    </div>`;
}
function liveScoreboard(){
  const g=live.g, my=S.myTeam, H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const lab=`<span class="live"></span>${live.hold&&!live.ask&&live.hold.clock?esc(live.hold.clock):!live.drives.length?"KICK-OFF":esc(segLabel(last))}
      ${g.label?" &middot; "+esc(g.label):g.title?" &middot; "+esc(g.title)+(g.neutral?"":(g.home===my?", at home":", away")):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}`;
  return scoreTop(g,H,A,lab)+momentumHTML(g,live.drives)+`</div>`;
}
/* the momentum bar: a bar for each five minutes, above the line for the home
   side when it was on top, below for the away side; the size is how much */
function momentumHTML(g,drives){
  const segs=drives.filter(d=>typeof d.mom==="number");
  const hc=teamInk(g.home), ac=teamInk(g.away), W=300, H=44, mid=H/2, bw=W/SEGS;
  const bars=segs.map((d,i)=>{ const v=d.mom-0.5, h=Math.min(mid-2,Math.abs(v)*2*(mid-2)+1.5);
    const goal=d.ev&&d.ev.find(e=>e.k==="goal");
    return `<rect x="${(i*bw+1.5).toFixed(1)}" y="${(v>=0?mid-h:mid).toFixed(1)}" width="${(bw-3).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${v>=0?hc:ac}"/>`+
      (goal?`<circle cx="${(i*bw+bw/2).toFixed(1)}" cy="${goal.side==="home"?3.5:H-3.5}" r="3" fill="var(--sodium)"/>`:"")}).join("");
  return `<div class="mom"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Momentum">
    <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="var(--line)" stroke-width="1"/>
    <line x1="${W/2}" y1="2" x2="${W/2}" y2="${H-2}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 3"/>${bars}</svg>
    <div class="momkey"><span style="color:${hc}">${esc(g.home)}</span><span>momentum</span><span style="color:${ac}">${esc(g.away)}</span></div></div>`;
}

/* ---- the evidence ---- */
/* how the other side is playing, in numbers: what each approach leaves behind */
function tellRows(T){
  const n=Math.max(1,T.n), per=x=>(x/n*9).toFixed(1);   // per forty-five minutes
  const pos=Math.round(50+T.pos/n);
  return [["Possession",pos+"%","Low: sitting deep (a block) or going direct. High: pressing.",pos<=42?"lo":pos>=56?"hi":""],
    ["Turnovers forced in our half",per(T.to),"A high press wins it back near our goal.",T.to/n>=1.15?"hi":""],
    ["Crosses",per(T.cr),"Lots: they're overloading the flanks.",T.cr/n>=1.05?"hi":""],
    ["Long balls",per(T.lb),"Lots: they're going direct.",T.lb/n>=1.3?"hi":""]];
}
/* the scouting report: how they set up in their last few games, and how the
   game in front of you tilts it (a stronger side presses or goes wide more,
   a weaker one sits deeper or goes direct) */
function reportHTML(dp,g,my){
  const opp=g.home===my?"away":"home", oppName=g[opp], R=dp.report, n=dp.n||6;
  const e=live&&live.eng&&live.eng.gap!==undefined?(opp==="home"?live.eng.gap:-live.eng.gap):0;
  const tilt=e>60?`${esc(oppName)} are the stronger side today: sides like that press or go wide more often than usual.`
    :e<-60?`${esc(oppName)} are the weaker side today: sides like that sit deeper or go direct more often than usual.`
    :`An even game on paper: they're likeliest to play their usual way.`;
  return `<div class="evid"><div class="evh">${esc(oppName)}: their last ${n} games</div>
    ${APPROACH_KEYS.map(k=>`<div class="evr"><span class="evk">${esc(APPROACH[k].l)}</span><span class="evv">${R[k]} of ${n}</span></div>`).join("")}
    <div class="evn">Most clubs have a usual way of playing, but not every week. ${tilt} Get it right and the work you did all week shows; get it wrong and you're out of shape until you change it.</div>${splitNote(R)}</div>`;
}
function evidenceHTML(g,my,d,kind){
  if(!d||!d.T)return "";
  const opp=g.home===my?"away":"home", me=g.home===my?"home":"away", oppName=g[opp];
  if(kind==="flank"){
    const F=live.eng.S[me].fl;
    return `<div class="evid"><div class="evh">Where our attacks got through, first half</div>
      <div class="flankbar"><span>Left <b>${F[0]}</b></span><i style="--l:${(100*F[0]/Math.max(1,F[0]+F[1])).toFixed(0)}%"></i><span><b>${F[1]}</b> Right</span></div>
      <div class="evn">A full-back having a hard day shows up here. It's a count, so a small gap can be luck.</div></div>`;
  }
  const T2=d.T2&&d.T2[opp], rows2=T2&&T2.n>0?tellRows(T2):null, rows=tellRows(rows2&&d.TA&&d.TA[opp]?d.TA[opp]:d.T[opp]);
  // in the second half: since half-time beside the whole match, so a change shows (a small sample, said so)
  // since half-time as plain counts: ten minutes scaled to 45 printed "36.0 turnovers", and its few possible
  // values made two matches' panels look identical (Grokbot)
  const cnt2=rows2?[rows2[0][1],T2.to,T2.cr,T2.lb]:null;
  return `<div class="evid"><div class="evh">How ${esc(oppName)} are playing it <span>${rows2?`per 45 | last ${T2.n*5} min`:"per 45 minutes"}</span></div>
    ${rows.map((r,i)=>`<div class="evr ${r[3]}"><span class="evk">${r[0]}</span><span class="evv">${r[1]}${rows2?` | ${cnt2[i]}`:""}</span></div>`).join("")}
    ${rows2?`<div class="evn">Left: the whole match, per 45 minutes. Right: counts since half-time, only ${T2.n*5} minutes: a hint, not proof.</div>`:""}
    ${firstReadTip()}<div class="evn">League average: possession 50%, turnovers 6.3, crosses 5.4, long balls 6.3.</div></div>`;
}
/* the change behind a final-ten-minutes call, by name (round 44): who comes on, who comes off */
function finalSub(my,o){
  const R=SEA&&SEA.roster&&SEA.roster[my]; if(!R)return "";
  const nm=i=>R[i]&&R[i].n?surname(R[i].n):null, P=p=>POS.findIndex(x=>x.p===p);
  const sw={push:[BK(P("ST")),P("CB")], sit:[BK(P("CB")),P("ST")], win:[BK(P("W")),P("CM")]}[o]; if(!sw)return "";
  const on=nm(sw[0]), off=nm(sw[1]); return on&&off?`${on} on, ${off} off`:"";
}
/* the table, beside the late calls (round 44): a point against three, in places. A league game in the season only. */
function tableStakesHTML(g,my){
  if(!SEA||SEA.phase!=="week"||g.cup||typeof LEAGUE.points!=="function"||!CONF[my])return "";
  const div=NAMES.filter(t=>CONF[t]===CONF[my]), P=t=>LEAGUE.points(t,SEA), me=P(my);
  const left=SEA.sched.filter(x=>x.week>SEA.step&&!x.cup&&(x.home===my||x.away===my)).length;
  const place=pts=>1+div.filter(t=>t!==my&&P(t)>pts).length, tied=pts=>div.filter(t=>t!==my&&P(t)===pts);
  const say=pts=>{ const T=tied(pts); return `${ordinal(place(pts))}${T.length?`, level with ${esc(T[0])}${T.length>1?` and ${T.length-1} more`:""}`:""}` };
  return `<div class="evid"><div class="evh">What it means in the table <span>before tonight's other results</span></div>
    <div class="evr"><span class="evk">Now</span><span class="evv">${say(me)} on ${me} point${me===1?"":"s"}</span></div>
    <div class="evr"><span class="evk">A win (three)</span><span class="evv">${me+3} points: ${say(me+3)}</span></div>
    <div class="evr"><span class="evk">A draw (one)</span><span class="evv">${me+1} point${me+1===1?"":"s"}: ${say(me+1)}</span></div>
    <div class="evn">${left} league game${left===1?"":"s"} left after this one. A draw is a point; a win is three.</div></div>`;
}
function statStrip(g,d){
  if(!d||!d.st)return "";
  const H=d.st.home, A=d.st.away;
  return `<div class="sstrip"><span>${H[0]} <i>shots</i> ${A[0]}</span><span>${H[1]} <i>on target</i> ${A[1]}</span></div>`;
}

/* ---- the run of play ---- */
function playsHTML(list,my,g){
  const rows=[], used={};
  list.forEach(d=>{
    const ev=(d.ev||[]).filter(e=>e.k!=="cue"||((e.u||0)%3===0));
    let sh=d.sh-d.h, sa=d.sa-d.a;
    ev.forEach(e=>{ if(e.k==="goal"){ if(e.side==="home")sh++; else sa++ }
      const t=scEventText(g,e,used); rows.push({m:e.m,team:t.team,tag:t.tag,text:t.text,h:sh,a:sa,cue:t.cue,goal:e.k==="goal",card:e.k==="red"||e.k==="yellow"}) });
  });
  return rows.slice().reverse().map(r=>`<div class="play ${r.team===my?'mine':''} ${r.goal?'goalrow':''} ${r.cue?'cue':''}">
      <span class="pq">${r.m}'</span>
      <div class="ptxt">${r.cue?"":`<b>${esc(r.team)}</b> `}${esc(r.text)}${r.tag?` <span class="dtag ${r.tag==="GOAL"?'sc':r.tag==="RED"?'rd':'yl'}">${esc(r.tag)}</span>`:""}</div>
      <span class="pscore">${r.h}&ndash;${r.a}</span></div>`).join("");
}
function liveView(){
  const g=live.g, my=S.myTeam, last=live.drives[live.drives.length-1]||null;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${typeof hlBox==="function"?hlBox():""}
    ${statStrip(g,last)}
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>Kick-off at ${esc(venue)}&hellip;</span></div>`}</div>
    <div class="actionbar">
      <div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
        aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
      <div class="wctl">
        <button class="wbtn" id="wpause">${live.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
        <button class="wbtn ${live.paused?'hot':''}" id="wstep">Next five minutes &rarr;</button>
        <button class="wbtn" id="wskip" title="Plays on at once and stops at your next call">Skip to next call</button>
      </div>
      <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>
    </div></div>`;
}
function liveCallView(){
  const dp=live.ask.dp, g=live.g, my=live.ask.team||S.myTeam;
  const mine=live.ask.mine, theirs=live.ask.theirs, last=live.drives[live.drives.length-1]||null;
  const whose=!live.h2h?"Your call"
    :esc((my===S.myTeam?S.career.name:S.coaches[live.h2h.coach].career.name)+"'s call · "+my);
  const desc=o=>(dp.k==="read"||dp.k==="prep")&&COUNTERS[o]?COUNTERS[o].d:(dp.k==="final"?finalSub(my,o):"");
  return `<div class="watchwrap">
    ${liveScoreboard()}
    <div class="callbox">
      <div class="wlabel">${whose}</div>
      <div class="calltitle">${esc(dp.h)}</div>
      <div class="callscore">${esc(my)} ${mine} &middot; ${esc(g.home===my?g.away:g.home)} ${theirs}</div>
      <div class="callsub">${esc(dp.q||"")}</div>
    </div>
    ${dp.k==="prep"?reportHTML(dp,g,my):dp.k==="read"||dp.k==="flank"?evidenceHTML(g,my,last,dp.k):dp.k==="late"||dp.k==="final"?tableStakesHTML(g,my):""}
    <div class="grouphead staffhead">The staff room</div>
    <div class="staffroom">${staffAdvice(dp,{mine:mine,theirs:theirs,q:live.drives.length,g:g,my:my}).map(s=>
      `<div class="say"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`).join("")}</div>
    <div class="callopts">${dp.opts.map(o=>
      `<button class="advance callbtn" data-call="${esc(o[0])}">${esc(o[1])}${desc(o[0])?`<small>${esc(desc(o[0]))}</small>`:""}</button>`).join("")}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives.slice(-4),my,g)}</div>
  </div>`;
}

/* ---- replays ---- */
function startWatch(g){
  if(!g||!SEA.roster)return;
  const drives=(g.drives&&g.drives.length)?g.drives:null;
  watch={g:g, script:drives?driveScript(g,drives):gameScript(g,SEA.roster[g.home],SEA.roster[g.away],watchSeed(g)),
         i:-1, paused:(S.watchStep===true)};
  reveal=null;
  tickWatch();
}
function watchView(){
  const g=watch.g, my=S.myTeam;
  const upto=watch.script.slice(0,Math.max(0,Math.min(watch.i+1,watch.script.length)));
  const cur=upto[upto.length-1]||null;
  const H=cur?cur.h:0, A=cur?cur.a:0, done=watch.i>=watch.script.length, tip=watch.i<0;
  const mine=(g.home===my)?H:A, theirs=(g.home===my)?A:H;
  const pens=g.pens?(g.pens===my||(g.pens==="home"&&g.home===my)||(g.pens==="away"&&g.away===my)):null;
  const res=done?(mine>theirs||(mine===theirs&&pens===true)?"WIN":mine===theirs&&pens===null?"DRAW":"LOSS"):"";
  const lab=done?`FINAL &middot; ${res}`
        :tip?`<span class="live"></span>KICK-OFF &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>${esc(cur.clock)}`;
  const rows=upto.filter(e=>!e.quiet);
  return `<div class="watchwrap">
    ${scoreTop(g,H,A,lab,done?(res==="WIN"?'win':res==="LOSS"?'loss':''):'')}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${rows.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''} ${e.outcome==="GOAL"?'goalrow':''} ${e.cue?'cue':''}">
      <span class="pq">${esc(e.clock)}</span>
      <div class="ptxt">${e.cue?"":`<b>${esc(e.team)}</b> `}${esc(e.text)}${e.outcome?` <span class="dtag ${e.outcome==="GOAL"?'sc':e.outcome==="RED"?'rd':e.outcome==="YELLOW"?'yl':'sc'}">${esc(e.outcome)}</span>`:""}</div>
      <span class="pscore">${e.h}&ndash;${e.a}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for kick-off&hellip;</span></div>`}</div>
    <div class="actionbar">
      ${done?`<button class="advance" id="wdone">Back to the season</button>`
      :`<div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
          aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
        <div class="wctl">
          <button class="wbtn" id="wpause">${watch.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
          <button class="wbtn ${watch.paused?'hot':''}" id="wstep">Next &rarr;</button>
          <button class="wbtn" id="wskip">Skip</button>
        </div>
        <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>`}
    </div></div>`;
}

/* ---- after the game: were your reads right? ---- */
/* what the evidence said, when it pointed the other way: a read the numbers
   got wrong is a noisy sample, not a coin flip, and the verdict says so */
function readNote(e){
  if(e.k==="flank"&&e.unclear)return " The count was nearly level, a coin flip, so it isn't graded either way.";
  if(e.k==="read"&&e.evid&&e.evid!==e.truth&&APPROACH[e.evid])
    return e.right?` The numbers pointed to ${APPROACH[e.evid].l}; your read was better than they were.`
      :` The numbers at the time pointed to ${APPROACH[e.evid].l}: a short stretch can mislead.`;
  if(e.k==="prep"&&e.split){ const by=typeof e.split==="string"?" "+e.split:"";   // "3-3": their last games, by system
    return ` The report was split${by}, a coin flip, so it isn't graded either way.` }
  return "";
}
/* what you chose, for the start of the card's line: one line said "First read and second read: ... the answer was
   'Go long'" when that was the pre-match pick and the cross was for a later one (Grokbot) */
function readPickLabel(e){ if(e.waited)return "Wait and see"; const o=COUNTERS[e.pick]; return o?o.l:e.k==="flank"?`Overload the ${e.pick}`:"" }
function readText(e){ return readTextBase(e)+readNote(e) }
function readTextBase(e){
  if(e.waited)return e.unclear?`You waited and saw: the report was split, so there was nothing to set up for. They came out ${APPROACH[e.truth].l}.`:e.right?`You waited, and it paid: the report pointed to ${APPROACH[e.fav].l}, and they came out ${APPROACH[e.truth].l}.`:`You waited, and it cost you: the report was right, they came out ${APPROACH[e.truth].l}.`;
  if(e.k==="read")return e.right?`Your read was right: they were ${APPROACH[e.truth].l}.`
    :`They were ${APPROACH[e.truth].l}: the answer was "${COUNTERS[APPROACH[e.truth].counter].l}".`;
  if(e.k==="prep")return e.right?`Your preparation was right: they came out ${APPROACH[e.truth].l}.`
    :`You set up for the wrong thing: they came out ${APPROACH[e.truth].l}.`;
  // "Right flank:" meant "correct" and read as the right-hand flank, naming the wrong side beside a tick (Muse)
  if(e.k==="flank")return e.right?`You read it correctly: the ${e.truth} flank was their weak one.`
    :`Their weak side was the ${e.truth} flank, not the ${e.pick}.`;
  return "";
}
