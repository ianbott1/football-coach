/* ============ game screens: hockey ============ */
/* The scoreboard (visitors first, as on any rink's clock), the run of play in
   five-minute spells with names, the evidence each call is made from, the
   call screen with the staff's advice, and the replay view. */

/* ---- names ---- */
const HK_UNIT={C:0,LW:1,RW:2,D:3,D2:4,G:5};
function hkPlayer(team,unit,u){
  const R=SEA.roster&&SEA.roster[team]; if(!R)return null;
  const i=HK_UNIT[unit], hurt=new Set(SEA.talent?SEA.talent.active(team).map(x=>x.idx):[]);
  const p=hurt.has(i)?null:R[i], b=hurt.has(BK(i))?null:R[BK(i)];   // an injured player is not on the ice (Grokbot: "out 91+ game days" took a penalty)
  const pick=(b&&(u%10)<3)||!p?b:p; return pick?pick.n:null;
}
// a surname shared on the ice or pitch gets its initial ("Sissoko scored on Sissoko": Instinct)
const surname=n=>{ if(!n)return ""; const L=n.split(" ").slice(-1)[0]; try{ const g=typeof live!=="undefined"&&live&&live.g; if(g&&typeof surnameIn==="function")return surnameIn(n,g) }catch(e){} return L };
function hkSkater(team,u){
  const x=u%100, unit=x<30?"C":x<52?"LW":x<74?"RW":x<88?"D":"D2";
  return hkPlayer(team,unit,u)||"a forward";
}
/* who scored a goal and who set it up, from the event: the log says it and the box score credits it */
function hkGoalNames(tm,e){ const u=e.u||0, n=hkSkater(tm,u), a=hkSkater(tm,(u*7+3)%100);
  return {n:n, a:(e.en||e.extra||!a||a===n||a==="a forward")?null:a} }
/* a played game's goals and assists by name, for one side (core: Season._resolve credits them) */
function hkLogCredit(tm,side,drives){
  const C={}, add=(nm,k)=>{ if(!nm||nm==="a forward")return; (C[nm]=C[nm]||{goals:0,ast:0})[k]++ };
  (drives||[]).forEach(d=>(d.ev||[]).forEach(e=>{ if(e.k!=="goal"||e.side!==side)return; const N=hkGoalNames(tm,e); add(N.n,"goals"); add(N.a,"ast") }));
  return C;
}
function hkGoalie(team,backup){ const R=SEA.roster&&SEA.roster[team]; if(!R)return "the goalie";
  const p=backup?R[BK(5)]:R[5]; return p?p.n:"the goalie" }
const HK_FINISH=["snaps one in off the post","jams a loose puck home at the crease","tips in a point shot","wires one over the glove","walks in alone and finishes","one-times it from the circle",
  "pounces on the loose puck","goes five-hole","finishes a two-on-one","bats it in out of mid-air","picks the top corner","banks it in off a skate"];
/* the words around a goal or save: no template twice in a game until the pool runs out (Grokbot: the
   same phrases over and over; 5.4 repeats a game, measured Nov 2026) */
const HK_AFTER=["No chance for {g}.","Nothing {g} could do.","{g} never saw it.","{g} was screened on it.","",""];
const HK_SOFT=["A soft one: {g} should have had it.","That one squeezed through {g}.","Soft goal. {g} looked lost.","{g} will want that one back."];
const HK_SAVE=["Big save by {g} on {s}","{g} robs {s}","{s} denied by {g}'s pad","{g} gloves down a {s} shot","{g} stretches across to stop {s}"];
function pickFresh(a,u,key,used){
  if(!used)return a[u%a.length];
  const S=used[key]=used[key]||new Set(); if(S.size>=a.length)S.clear();
  for(let k=0;k<a.length;k++){ const i=(u+k)%a.length; if(!S.has(i)){ S.add(i); return a[i] } }
  return a[u%a.length];
}
const HK_PENS=["hooking","tripping","holding","high-sticking","slashing","interference","roughing"];
const HK_CUE={
  forecheck:["{t} two men in deep on the forecheck again; we can't get it out","{t} hem us in our own end: another giveaway","{t} pressure the puck carrier behind our net","{t} on our D before he can turn: iced it again"],
  trap:["{t} sit back in a 1-3-1; we can't get through the middle","Another failed zone entry against {t}'s trap","{t} clog up the neutral zone and wait","We dump it in again; {t} won't let us carry it"],
  cycle:["{t} cycle it low below our goal line for a whole shift","{t} grind down the boards and won't give it up","{t} work it low-to-high and get it to the point","{t} win another battle along the wall and keep it in"]
};
function pickOf(a,u){return a[u%a.length]}
function hkEventText(g,e,swapped,used){
  const surname=n=>surnameIn(n,g);   // an initial when both sides have the surname
  const tm=e.side==="home"?g.home:g.away, opp=e.side==="home"?g.away:g.home, u=e.u||0, w=e.w!==undefined?e.w:u;
  if(e.k==="goal"){
    // the scorer and assist come from the event alone (hkGoalNames), so the box score can credit the same men;
    // a re-worded goal changes the words (w), never the scorer (Muse: a two-goal scorer at 0-0-0)
    const N=hkGoalNames(tm,e), n=N.n, a1=N.a, gk=hkGoalie(opp,swapped&&swapped[e.side==="home"?"away":"home"]);
    if(e.en)return {team:tm,tag:"EMPTY NET",text:`${n} into the empty net`};
    if(e.extra)return {team:tm,tag:"GOAL",text:`${n} scores with the extra attacker`};
    const how=pickFresh(HK_FINISH,w>>2,"fin",used), ast=a1?` (from ${surname(a1)})`:"";
    const after=(e.soft?pickFresh(HK_SOFT,w,"soft",used):pickFresh(HK_AFTER,w,"after",used)).replace("{g}",surname(gk));
    return {team:tm,tag:e.pp?"PP GOAL":"GOAL",text:`${n} ${how}${ast}.${after?" "+after:""}`};
  }
  if(e.k==="pen"){ const n=hkSkater(tm,u); return {team:tm,tag:"PENALTY",text:`${n} two minutes for ${pickOf(HK_PENS,u>>2)}`} }
  if(e.k==="save"){ const gk=hkGoalie(tm,swapped&&swapped[e.side]); return {team:tm,tag:"",text:pickFresh(HK_SAVE,u,"save",used).replace("{g}",surname(gk)).replace("{s}",surname(hkSkater(opp,u)))} }
  if(e.k==="pull")return {team:tm,tag:"",text:`pull the goalie for an extra attacker`};
  if(e.k==="cue")return {team:tm,tag:"",text:pickFresh(HK_CUE[e.cue],u,"cue"+e.cue,used).replace("{t}",tm),cue:true};
  if(e.k==="swap"){ return {team:tm,tag:"",text:`${hkGoalie(tm,true)} comes in for ${surname(hkGoalie(tm,false))}`} }
  return {team:tm,tag:"",text:""};
}
const shown=e=>e.k!=="cue"||((e.u||0)%3===0);
function segLabel(d){ return d.seg>=SEGS?(d.so?"Shootout":"Overtime"):segClock(d.seg) }
function rowsOf(g,drives){
  const b0=(drives[0]&&drives[0].bk)||{}, rows=[], sw={home:!!b0.home,away:!!b0.away}, used={}; let last=null; const said=new Set();
  drives.forEach(d=>{
    let sh=d.sh-(d.h||0), sa=d.sa-(d.a||0);
    if(d.seg>=SEGS){ (d.ev||[]).forEach(e=>{ const t=hkEventText(g,e,sw,used); rows.push({m:d.so?"SO":"OT",team:t.team,tag:"OT GOAL",text:t.text,h:d.sh,a:d.sa,goal:true}) });
      if(d.so)rows.push({m:"SO",team:d.sh>d.sa?g.home:g.away,tag:"SHOOTOUT",text:"win it in the shootout",h:d.sh,a:d.sa,goal:true});
      return }
    (d.ev||[]).filter(shown).forEach(e=>{
      if(e.k==="goal"){ if(e.side==="home")sh++; else sa++ }
      if(e.k==="swap"){ const t=hkEventText(g,e,sw); sw[e.side]=true; rows.push({m:e.m+"'",team:t.team,tag:"",text:t.text,h:sh,a:sa}); return }
      let t=hkEventText(g,e,sw,used);
      // two goals by one side in the same minute read as one goal twice (Grokbot: the same scorer at
      // 42', near-identical text): the second gets another scorer and finish (names are words only)
      // ...and no goal reads word for word like an earlier one in the game (Grokbot saw it again, at
      // other minutes: each goal's words come from a number 0-99, so two can match)
      const sameAs=x=>(last&&last.m===e.m&&last.side===e.side&&x.text.slice(0,12)===last.text.slice(0,12))||said.has(x.text);
      if(e.k==="goal"&&sameAs(t))
        for(let k=1;k<8;k++){
          const t2=hkEventText(g,Object.assign({},e,{w:((e.u||0)+37*k)%100}),sw);
          if(!sameAs(t2)){ t=t2; break } }
      if(e.k==="goal"){ last={m:e.m,side:e.side,text:t.text}; said.add(t.text) }
      rows.push({m:e.m+"'",team:t.team,tag:t.tag,text:t.text,h:sh,a:sa,cue:t.cue,goal:e.k==="goal"}) });
  });
  return rows;
}
function driveScript(g,drives){
  const rows=rowsOf(g,drives);
  return rows.length?rows.map(r=>({clock:r.m,team:r.team,outcome:r.tag,text:r.text,h:r.h,a:r.a,cue:r.cue}))
    :[{clock:"60'",team:"",outcome:"",text:"",h:0,a:0}];
}
/* a computer game: twelve spells whose goals add up to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), out=[];
  const reg=g.ot?Math.min(g.hp,g.ap):null;
  const split=(tot)=>{const v=Array.from({length:SEGS},()=>0); for(let i=0;i<tot;i++)v[rng.int(SEGS)]++; return v};
  const hs=split(reg!==null?reg:g.hp), as=split(reg!==null?reg:g.ap); let sh=0,sa=0;
  for(let s=0;s<SEGS;s++){ sh+=hs[s]; sa+=as[s]; const ev=[];
    for(let i=0;i<hs[s];i++)ev.push({m:s*5+rng.int(5),side:"home",k:"goal",u:rng.int(100)});
    for(let i=0;i<as[s];i++)ev.push({m:s*5+rng.int(5),side:"away",k:"goal",u:rng.int(100)});
    if(rng.r()<0.25)ev.push({m:s*5+rng.int(5),side:rng.r()<0.5?"home":"away",k:rng.r()<0.6?"save":"pen",u:rng.int(100)});
    ev.sort((x,y)=>x.m-y.m);
    out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa,ev:ev}) }
  if(reg!==null)out.push({seg:SEGS,sh:g.hp,sa:g.ap,ot:1,so:!!g.so,h:g.hp-reg,a:g.ap-reg,
    ev:g.so?[]:[{m:61,side:g.hp>g.ap?"home":"away",k:"goal",u:rng.int(100)}]});
  return driveScript(g,out);
}
function liveGapFor(L,mult){
  const d=L.drives[L.drives.length-1];
  const n=d&&d.ev?d.ev.filter(shown).length:0;
  return Math.max(110,Math.round((n?1300+n*350:520)*0.52/mult));
}

/* ---- the scoreboard: visitors first ---- */
function scoreTop(g,H,A,label,cls,extra){
  return `<div class="wtop ${cls||""}">
    <div class="wlabel">${label}</div>
    <div class="wscore">
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span><span class="wn">${A}</span></div>
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span><span class="wn">${H}</span></div>
    </div>${extra||""}</div>`;
}
function shotBars(g,drives){
  const segs=drives.filter(d=>d.shots&&d.seg<SEGS), W=300, H=44, mid=H/2, bw=W/SEGS;
  const hc=teamInk(g.home), ac=teamInk(g.away);
  const bars=segs.map((d,i)=>{ const a=d.shots[1], h=d.shots[0], ha=Math.min(mid-2,a*3), hh=Math.min(mid-2,h*3);
    const ga=d.ev&&d.ev.some(e=>e.k==="goal"&&e.side==="away"), gh=d.ev&&d.ev.some(e=>e.k==="goal"&&e.side==="home");
    return `<rect x="${(i*bw+2).toFixed(1)}" y="${(mid-ha).toFixed(1)}" width="${(bw-4).toFixed(1)}" height="${ha.toFixed(1)}" rx="1.5" fill="${ac}"/>
      <rect x="${(i*bw+2).toFixed(1)}" y="${mid}" width="${(bw-4).toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" fill="${hc}"/>`+
      (ga?`<circle cx="${(i*bw+bw/2).toFixed(1)}" cy="3.5" r="3" fill="var(--sodium)"/>`:"")+
      (gh?`<circle cx="${(i*bw+bw/2).toFixed(1)}" cy="${H-3.5}" r="3" fill="var(--sodium)"/>`:"")}).join("");
  const sog=drives.length&&drives[drives.length-1].sog?drives[drives.length-1].sog:null;
  return `<div class="mom"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Shots by five minutes">
    <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="var(--line)"/>
    ${[1,2].map(k=>`<line x1="${k*W/3}" y1="2" x2="${k*W/3}" y2="${H-2}" stroke="var(--line)" stroke-dasharray="2 3"/>`).join("")}${bars}</svg>
    <div class="momkey"><span style="color:${ac}">${esc(g.away)}${sog?" "+sog[1]:""}</span><span>shots</span><span style="color:${hc}">${sog?sog[0]+" ":""}${esc(g.home)}</span></div></div>`;
}
function liveScoreboard(){
  const g=live.g, my=S.myTeam, H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const lab=`<span class="live"></span>${!live.drives.length?"PUCK DROP":esc(segLabel(last))}
      ${g.label?" &middot; "+esc(g.label):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}`;
  return scoreTop(g,H,A,lab,"",shotBars(g,live.drives));
}

/* ---- the evidence ---- */
function evidenceHTML(g,my,d,dp){
  const opp=g.home===my?"away":"home";
  // who's in goal: the two goalies, and what a back-to-back costs (round 44)
  if(dp.k==="gstart"&&dp.gk){ const G=dp.gk;
    return `<div class="evid"><div class="evh">Your goalies</div>
      ${G.s?`<div class="evr"><span class="evk">${esc(G.s.n)} (played last night)</span><span class="evv">${G.s.r}</span></div>`:""}
      ${G.b?`<div class="evr"><span class="evk">${esc(G.b.n)} (fresh)</span><span class="evv">${G.b.r}</span></div>`:""}
      <div class="evn">A starter on the second night of a back-to-back plays below his rating; most benches start the backup. ${G.gap!==undefined?(G.gap>=18?"The gap between these two is big.":G.gap<=8?"These two are close.":"The gap between them is middling."):""}</div></div>` }
  if(dp.k==="prep"){ const R=dp.report, n=dp.n||6;
    const e=live&&live.eng&&live.eng.gap!==undefined?(opp==="home"?live.eng.gap:-live.eng.gap):0;
    const tilt=e>60?`${esc(g[opp])} are the stronger side tonight: sides like that forecheck more often than usual.`
      :e<-60?`${esc(g[opp])} are the weaker side tonight: sides like that trap more often than usual.`
      :`An even game on paper: they're likeliest to play their usual way.`;
    return `<div class="evid"><div class="evh">${esc(g[opp])}: their last ${n} games</div>
      ${SYSTEM_KEYS.map(k=>`<div class="evr"><span class="evk">${esc(SYSTEM[k].l)}</span><span class="evv">${R[k]} of ${n}</span></div>`).join("")}
      <div class="evn">Most teams have a usual system, but not every night. ${tilt} Get it right and the work you did in practice shows; get it wrong and you're a step behind until you change it.</div>${splitNote(R)}</div>`; }
  if(dp.k==="read"&&d&&d.T){ const T=d.T[opp], n=Math.max(1,T.n), per=x=>(x/n*4).toFixed(1);
    const rows=[["Giveaways they force in our zone",per(T.to),T.to/n>=1.2],["Our zone entries they kill",per(T.fe),T.fe/n>=1.2],["Shifts they cycle below our goal line",per(T.cy),T.cy/n>=1.2]];
    return `<div class="evid"><div class="evh">How ${esc(g[opp])} are playing us <span>per period</span></div>
      ${rows.map(r=>`<div class="evr ${r[2]?'hi':''}"><span class="evk">${r[0]}</span><span class="evv">${r[1]}</span></div>`).join("")}
      ${firstReadTip()}<div class="evn">League average: 2.8 of each a period. The system they play leaves one of these well above it.</div></div>`; }
  if(dp.k==="third"&&dp.tell3){ const T=dp.tell, D=dp.tell3, n=Math.max(1,T.n), per=x=>(x/n*4).toFixed(1);
    const rows=[["Giveaways they force in our zone","to"],["Our zone entries they kill","fe"],["Shifts they cycle below our goal line","cy"]];
    return `<div class="evid"><div class="evh">How ${esc(g[opp])} are playing us <span>per period | last ${D.n*5} min</span></div>
      ${rows.map(r=>`<div class="evr ${D.n&&D[r[1]]/D.n>=1.4?'hi':''}"><span class="evk">${r[0]}</span><span class="evv">${per(T[r[1]])} | ${D[r[1]]}</span></div>`).join("")}
      <div class="evn">Left: the whole game, per period. Right: counts since the second intermission. League average: 2.8 of each a period, about 1.4 in ten minutes. Some clubs change system for the third, more often when they're behind. Ten minutes is a small sample: a hint, not proof.</div></div>`; }
  // the pull: who's in goal and how his night has gone (round 47, Muse: "put his night on the pull card")
  if(dp.k==="pull"&&dp.gn){ const N=dp.gn, sv=N.sa?((N.sa-N.ga)/N.sa).toFixed(3).replace(/^0/,""):"-";
    const R=SEA&&SEA.roster&&SEA.roster[my], G=R&&R.filter(p=>p&&p.p==="G")[N.bk?1:0];
    return `<div class="evid"><div class="evh">${G?esc(G.n):"Your goalie"} tonight${N.bk?" (the backup, in since the change)":""}</div>
      <div class="evr"><span class="evk">Goals against</span><span class="evv">${N.ga} on ${N.sa} shots (${sv})</span></div>
      <div class="evr"><span class="evk">Expected from those shots</span><span class="evv">${N.xga.toFixed(1)}</span></div>
      <div class="evn">Pulled, he isn't stopping anything. ${N.sa&&N.ga<N.xga-1?"He's been better than his shots tonight.":N.sa&&N.ga>N.xga+1?"He's let in more than his shots were worth.":"About what his shots were worth."} Early means more time six-on-five, and more time with the net empty.</div></div>` }
  if(dp.k==="goalie"){
    return `<div class="evid"><div class="evh">Your goalie tonight</div>
      <div class="evr"><span class="evk">Goals against</span><span class="evv">${dp.ga} on ${dp.sa} shots</span></div>
      <div class="evr ${dp.sa&&(dp.sa-dp.ga)/dp.sa<0.85?'hi':''}"><span class="evk">Save % tonight (league .900)</span><span class="evv">${dp.sa?((dp.sa-dp.ga)/dp.sa).toFixed(3).replace(/^0/,""):"-"}</span></div>
      <div class="evr ${dp.ga-dp.xga>=1.5&&dp.soft>=2?'hi':''}"><span class="evk">Expected from those shots</span><span class="evv">${dp.xga.toFixed(1)}</span></div>
      <div class="evr ${dp.soft>=2?'hi':''}"><span class="evk">Goals called soft</span><span class="evv">${dp.soft} of ${dp.ga}</span></div>
      <div class="evn">Some nights a goalie is genuinely off. More often he's just been unlucky, and his backup is a step down. Goals over the expected number can be bad luck on their own: it's soft goals that tell you he's off.</div></div>`; }
  return "";
}

/* ---- the run of play ---- */
function playsHTML(drives,my,g,limit){
  let rows=rowsOf(g,drives); if(limit)rows=rows.slice(-limit);
  return rows.slice().reverse().map(r=>`<div class="play ${r.team===my?'mine':''} ${r.goal?'goalrow':''} ${r.cue?'cue':''}">
      <span class="pq">${esc(r.m)}</span>
      <div class="ptxt">${r.cue?"":`<b>${esc(r.team)}</b> `}${esc(r.text)}${r.tag?` <span class="dtag ${/GOAL|SHOOT|EMPTY/.test(r.tag)?'sc':'yl'}">${esc(r.tag)}</span>`:""}</div>
      <span class="pscore">${r.a}&ndash;${r.h}</span></div>`).join("");
}
function liveView(){
  const g=live.g, my=S.myTeam;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${typeof hlBox==="function"?hlBox():""}
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>Puck drop at ${esc(venue)}&hellip;</span></div>`}</div>
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
  const desc=o=>(dp.k==="read"||dp.k==="prep"||dp.k==="third")&&ANSWERS[o]?ANSWERS[o].d:"";
  return `<div class="watchwrap">
    ${liveScoreboard()}
    <div class="callbox">
      <div class="wlabel">${whose}</div>
      <div class="calltitle">${esc(dp.h)}</div>
      <div class="callscore">${esc(my)} ${mine} &middot; ${esc(g.home===my?g.away:g.home)} ${theirs}</div>
      <div class="callsub">${esc(dp.q||"")}</div>
    </div>
    ${evidenceHTML(g,my,last,dp)}
    <div class="grouphead staffhead">The staff room</div>
    <div class="staffroom">${staffAdvice(dp,{mine:mine,theirs:theirs,q:live.drives.length}).map(s=>
      `<div class="say"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`).join("")}</div>
    <div class="callopts">${dp.opts.map(o=>
      `<button class="advance callbtn" data-call="${esc(o[0])}">${esc(o[1])}${desc(o[0])?`<small>${esc(desc(o[0]))}</small>`:""}</button>`).join("")}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g,5)}</div>
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
  const lab=done?`FINAL${g.ot?(g.so?" / SO":" / OT"):""} &middot; ${mine>theirs?"WIN":"LOSS"}`
        :tip?`<span class="live"></span>PUCK DROP &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>${esc(cur.clock)}`;
  const rows=upto.filter(e=>e.text);
  return `<div class="watchwrap">
    ${scoreTop(g,H,A,lab,done?(mine>theirs?'win':'loss'):'')}
    <div class="grouphead">Run of play</div>
    <div class="plays">${rows.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''} ${/GOAL|SHOOT|EMPTY/.test(e.outcome||"")?'goalrow':''} ${e.cue?'cue':''}">
      <span class="pq">${esc(e.clock)}</span>
      <div class="ptxt">${e.cue?"":`<b>${esc(e.team)}</b> `}${esc(e.text)}${e.outcome?` <span class="dtag ${/GOAL|SHOOT|EMPTY/.test(e.outcome)?'sc':'yl'}">${esc(e.outcome)}</span>`:""}</div>
      <span class="pscore">${e.a}&ndash;${e.h}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the puck drop&hellip;</span></div>`}</div>
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
  if(e.k==="read"&&e.evid&&e.evid!==e.truth&&SYSTEM[e.evid])
    return e.right?` The numbers pointed to ${SYSTEM[e.evid].l}; your read was better than they were.`
      :` The numbers at the time pointed to ${SYSTEM[e.evid].l}: a short stretch can mislead.`;
  if(e.k==="prep"&&e.split){ const by=typeof e.split==="string"?" "+e.split:"";   // "3-3": their last games, by system
    return ` The report was split${by}, a coin flip, so it isn't graded either way.` }
  return "";
}
/* what you chose, for the start of the card's line: one line said "First read and second read: ... the answer was
   'Go long'" when that was the pre-match pick and the cross was for a later one (Grokbot) */
function readPickLabel(e){ if(e.waited)return "Wait and see"; const o=ANSWERS[e.pick]; return o?o.l:e.k==="goalie"?(e.pick==="swap"?"Put in the backup":"Keep him in"):"" }
function readText(e){ return readTextBase(e)+readNote(e) }
function readTextBase(e){
  if(e.waited)return e.unclear?`You waited and saw: the report was split, so there was nothing to set up for. They came out playing ${SYSTEM[e.truth].l}.`:e.right?`You waited, and it paid: the report pointed to ${SYSTEM[e.fav].l}, and they came out playing ${SYSTEM[e.truth].l}.`:`You waited, and it cost you: the report was right, they came out playing ${SYSTEM[e.truth].l}.`;
  if(e.k==="read")return e.right?`Your read was right: they were playing ${SYSTEM[e.truth].l}.`
    :`They were playing ${SYSTEM[e.truth].l}: the answer was "${ANSWERS[SYSTEM[e.truth].counter].l}".`;
  if(e.k==="prep")return e.right?`Your preparation was right: they came out playing ${SYSTEM[e.truth].l}.`
    :`You prepared for the wrong system: they came out playing ${SYSTEM[e.truth].l}.`;
  if(e.k==="third")return e.right?`Right in the third: they were playing ${SYSTEM[e.truth].l}.`
    :`In the third they were playing ${SYSTEM[e.truth].l}: the answer was "${ANSWERS[SYSTEM[e.truth].counter].l}".`;
  if(e.k==="goalie")return e.truth==="off"?(e.right?"Right call: your goalie really was having a bad night.":"Your goalie really was off tonight: pulling him was right.")
    :(e.right?"Right call: he'd been unlucky, not bad.":"He'd just been unlucky: the backup was a step down.");
  return "";
}
