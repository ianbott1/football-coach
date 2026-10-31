/* ============ game screens: hockey ============ */
/* The scoreboard (visitors first, as on any rink's clock), the run of play in
   five-minute spells with names, the evidence each call is made from, the
   call screen with the staff's advice, and the replay view. */

/* ---- names ---- */
const HK_UNIT={C:0,LW:1,RW:2,D:3,D2:4,G:5};
function hkPlayer(team,unit,u){
  const R=SEA.roster&&SEA.roster[team]; if(!R)return null;
  const i=HK_UNIT[unit]; const p=R[i], b=R[BK(i)];
  const pick=(b&&(u%10)<3)?b:p; return pick?pick.n:null;
}
const surname=n=>n?n.split(" ").slice(-1)[0]:"";
function hkSkater(team,u){
  const x=u%100, unit=x<30?"C":x<52?"LW":x<74?"RW":x<88?"D":"D2";
  return hkPlayer(team,unit,u)||"a forward";
}
function hkGoalie(team,backup){ const R=SEA.roster&&SEA.roster[team]; if(!R)return "the goalie";
  const p=backup?R[BK(5)]:R[5]; return p?p.n:"the goalie" }
const HK_FINISH=["snaps one in off the post","jams a loose puck home at the crease","tips in a point shot","wires one over the glove","walks in alone and finishes","one-times it from the circle"];
const HK_PENS=["hooking","tripping","holding","high-sticking","slashing","interference","roughing"];
const HK_CUE={
  forecheck:["{t} two men in deep on the forecheck again; we can't get it out","{t} hem us in our own end: another giveaway","{t} pressure the puck carrier behind our net"],
  trap:["{t} sit back in a 1-3-1; we can't get through the middle","Another failed zone entry against {t}'s trap","{t} clog up the neutral zone and wait"],
  cycle:["{t} cycle it low below our goal line for a whole shift","{t} grind down the boards and won't give it up","{t} work it low-to-high and get it to the point"]
};
function pickOf(a,u){return a[u%a.length]}
function hkEventText(g,e,swapped){
  const tm=e.side==="home"?g.home:g.away, opp=e.side==="home"?g.away:g.home, u=e.u||0;
  if(e.k==="goal"){
    const n=hkSkater(tm,u), a1=hkSkater(tm,(u*7+3)%100), gk=hkGoalie(opp,swapped&&swapped[e.side==="home"?"away":"home"]);
    if(e.en)return {team:tm,tag:"EMPTY NET",text:`${n} into the empty net`};
    if(e.extra)return {team:tm,tag:"GOAL",text:`${n} scores with the extra attacker`};
    const how=pickOf(HK_FINISH,u>>2), ast=a1&&a1!==n?` (from ${surname(a1)})`:"";
    const soft=e.soft?` ${pickOf(["A soft one: "+surname(gk)+" should have had it.","That one squeezed through "+surname(gk)+".","Soft goal. "+surname(gk)+" looked lost."],u)}`
                     :` ${pickOf(["No chance for "+surname(gk)+".","Nothing "+surname(gk)+" could do.",""],u)}`;
    return {team:tm,tag:e.pp?"PP GOAL":"GOAL",text:`${n} ${how}${ast}.${soft}`};
  }
  if(e.k==="pen"){ const n=hkSkater(tm,u); return {team:tm,tag:"PENALTY",text:`${n} two minutes for ${pickOf(HK_PENS,u>>2)}`} }
  if(e.k==="save"){ const gk=hkGoalie(tm,swapped&&swapped[e.side]); return {team:tm,tag:"",text:`Big save by ${surname(gk)} on ${surname(hkSkater(opp,u))}`} }
  if(e.k==="pull")return {team:tm,tag:"",text:`pull the goalie for an extra attacker`};
  if(e.k==="cue")return {team:tm,tag:"",text:pickOf(HK_CUE[e.cue],u).replace("{t}",tm),cue:true};
  if(e.k==="swap"){ return {team:tm,tag:"",text:`${hkGoalie(tm,true)} comes in for ${surname(hkGoalie(tm,false))}`} }
  return {team:tm,tag:"",text:""};
}
const shown=e=>e.k!=="cue"||((e.u||0)%3===0);
function segLabel(d){ return d.seg>=SEGS?(d.so?"Shootout":"Overtime"):segClock(d.seg) }
function rowsOf(g,drives){
  const rows=[], sw={home:false,away:false};
  drives.forEach(d=>{
    let sh=d.sh-(d.h||0), sa=d.sa-(d.a||0);
    if(d.seg>=SEGS){ (d.ev||[]).forEach(e=>{ const t=hkEventText(g,e,sw); rows.push({m:d.so?"SO":"OT",team:t.team,tag:"OT GOAL",text:t.text,h:d.sh,a:d.sa,goal:true}) });
      if(d.so)rows.push({m:"SO",team:d.sh>d.sa?g.home:g.away,tag:"SHOOTOUT",text:"win it in the shootout",h:d.sh,a:d.sa,goal:true});
      return }
    (d.ev||[]).filter(shown).forEach(e=>{
      if(e.k==="goal"){ if(e.side==="home")sh++; else sa++ }
      if(e.k==="swap"){ const t=hkEventText(g,e,sw); sw[e.side]=true; rows.push({m:e.m+"'",team:t.team,tag:"",text:t.text,h:sh,a:sa}); return }
      const t=hkEventText(g,e,sw); rows.push({m:e.m+"'",team:t.team,tag:t.tag,text:t.text,h:sh,a:sa,cue:t.cue,goal:e.k==="goal"}) });
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
  if(dp.k==="read"&&d&&d.T){ const T=d.T[opp], n=Math.max(1,T.n), per=x=>(x/n*4).toFixed(1);
    const rows=[["Giveaways they force in our zone",per(T.to),T.to/n>=1.2],["Our zone entries they kill",per(T.fe),T.fe/n>=1.2],["Shifts they cycle below our goal line",per(T.cy),T.cy/n>=1.2]];
    return `<div class="evid"><div class="evh">How ${esc(g[opp])} are playing us <span>per period</span></div>
      ${rows.map(r=>`<div class="evr ${r[2]?'hi':''}"><span class="evk">${r[0]}</span><span class="evv">${r[1]}</span></div>`).join("")}
      <div class="evn">League average: 2.8 of each a period. The system they play leaves one of these well above it.</div></div>`; }
  if(dp.k==="goalie"){
    return `<div class="evid"><div class="evh">Your goalie tonight</div>
      <div class="evr"><span class="evk">Goals against</span><span class="evv">${dp.ga} on ${dp.sa} shots</span></div>
      <div class="evr ${dp.ga-dp.xga>=1.5?'hi':''}"><span class="evk">Expected from those shots</span><span class="evv">${dp.xga.toFixed(1)}</span></div>
      <div class="evr ${dp.soft>=2?'hi':''}"><span class="evk">Goals called soft</span><span class="evv">${dp.soft} of ${dp.ga}</span></div>
      <div class="evn">Some nights a goalie is genuinely off. More often he's just been unlucky, and his backup is a step down.</div></div>`; }
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
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>Puck drop at ${esc(venue)}&hellip;</span></div>`}</div>
    <div class="actionbar">
      <div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
        aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
      <div class="wctl">
        <button class="wbtn" id="wpause">${live.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
        <button class="wbtn ${live.paused?'hot':''}" id="wstep">Next five minutes &rarr;</button>
        <button class="wbtn" id="wskip">Skip</button>
      </div>
      <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>
    </div></div>`;
}
function liveCallView(){
  const dp=live.ask.dp, g=live.g, my=live.ask.team||S.myTeam;
  const mine=live.ask.mine, theirs=live.ask.theirs, last=live.drives[live.drives.length-1]||null;
  const whose=!live.h2h?"Your call"
    :esc((my===S.myTeam?S.career.name:S.coaches[live.h2h.coach].career.name)+"'s call · "+my);
  const desc=o=>dp.k==="read"&&ANSWERS[o]?ANSWERS[o].d:"";
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
    <div class="staffroom">${staffTake(dp,{mine:mine,theirs:theirs,q:live.drives.length}).map(s=>
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
