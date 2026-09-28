/* ============ game screens: hockey ============ */
/* The scoreboard, the run of play in ten-minute segments, the call screen
   with the staff's advice, and the replay view. */
function segLabel(d){ return d.seg>=SEGS?(d.so?"Shootout":"Overtime"):segClock(d.seg) }
function driveWord(d){
  if(d.seg>=SEGS)return d.so?"decided in a shootout":"overtime winner";
  if(!d.h&&!d.a)return "no goals";
  return d.h===d.a?d.h+" goal"+(d.h>1?"s":"")+" apiece":(d.h>d.a?"home":"away")+" "+Math.max(d.h,d.a)+"-"+Math.min(d.h,d.a);
}
/* a segment in words, with names from the rosters */
function driveScript(g,drives){
  const rng=new RNG(watchSeed(g));
  const RH=SEA.roster?SEA.roster[g.home]:null, RA=SEA.roster?SEA.roster[g.away]:null;
  const skater=R=>{ if(!R)return "a forward"; const pool=[0,1,2,0,1,2,3,4,6,7,8]; const p=R[pool[rng.int(pool.length)]]; return p?p.n:"a forward" };
  return drives.map(d=>{
    if(d.seg>=SEGS){ const hw=d.sh>d.sa, tm=hw?g.home:g.away, R=hw?RH:RA;
      return {seg:d.seg,clock:d.so?"SO":"OT",team:tm,pts:1,outcome:d.so?"SHOOTOUT":"OT GOAL",
        text:d.so?`${tm} win it in the shootout, ${skater(R)} with the decider`:`${skater(R)} ends it in overtime for ${tm}`,h:d.sh,a:d.sa} }
    const parts=[];
    const say=(n,R,tm,side)=>{ for(let k=0;k<n;k++){ const pp=d.pp&&d.pp[side]&&k===0&&rng.r()<0.5;
      parts.push(`${skater(R)} scores for ${tm}${pp?" on the power play":""}`) } };
    say(d.h,RH,g.home,0); say(d.a,RA,g.away,1);
    if(d.en)parts.push(d.en.kind==="empty"?`into the empty net for ${d.en.side==="home"?g.home:g.away}`:`the extra attacker pays off for ${d.en.side==="home"?g.home:g.away}`);
    const sh=d.shots||[0,0];
    const text=parts.length?parts.slice(0,3).join("; ")+(parts.length>3?`, and ${parts.length-3} more`:"")
      :`no goals${sh[0]+sh[1]?`, shots ${sh[1]}-${sh[0]}`:""}`;
    const big=Math.max(d.h,d.a), tm=d.h>=d.a?g.home:g.away;
    return {seg:d.seg,clock:segClock(d.seg),team:tm,pts:big,outcome:d.en?(d.en.kind==="empty"?"EMPTY NET":"EXTRA ATTACKER"):(d.h+d.a?"GOAL":""),text:text,h:d.sh,a:d.sa};
  });
}
function liveScoreboard(){
  const g=live.g, my=S.myTeam, H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const tip=!live.drives.length;
  return `<div class="wtop">
    <div class="wlabel"><span class="live"></span>${tip?"PUCK DROP":esc(segLabel(last))}
      ${g.label?" &middot; "+esc(g.label):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}</div>
    <div class="wscore">
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span><span class="wn">${A}</span></div>
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span><span class="wn">${H}</span></div>
    </div></div>`;
}
function playsHTML(list,my,g){
  return list.slice().reverse().map(d=>{
    const tm=d.seg==="last"?(d.side==="home"?g.home:g.away):(d.h>=d.a?g.home:g.away);
    return `<div class="play ${tm===my?'mine':''}">
      <span class="pq">${esc(segLabel(d))}</span>
      <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}</div>
      <span class="pscore">${d.sa}&ndash;${d.sh}</span></div>`}).join("");
}
function liveView(){
  const g=live.g, my=S.myTeam, last=live.drives[live.drives.length-1]||null;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${fieldSVG(g,last,teamColor(g.home),teamColor(g.away),venue)}
    <div class="fpos">${last?esc(segLabel(last))+" &middot; "+esc(venue):"Puck drop at "+esc(venue)}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>Waiting for the puck drop&hellip;</span></div>`}</div>
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
  const mine=live.ask.mine, theirs=live.ask.theirs;
  const whose=!live.h2h?"Your call"
    :esc((my===S.myTeam?S.career.name:S.coaches[live.h2h.coach].career.name)+"'s call \u00b7 "+my);
  return `<div class="watchwrap">
    ${liveScoreboard()}
    <div class="callbox">
      <div class="wlabel">${whose}</div>
      <div class="calltitle">${esc(dp.h)}</div>
      <div class="callscore">${esc(my)} ${mine} &middot; ${esc(g.home===my?g.away:g.home)} ${theirs}</div>
      <div class="callsub">${esc(dp.b)}</div>
    </div>
    <div class="grouphead staffhead">The staff room</div>
    <div class="staffroom">${staffTake(dp,{mine:mine,theirs:theirs,q:live.drives.length}).map(s=>
      `<div class="say"><span class="facewrap ${s.who}">${staffFace(s.who)}</span>
        <div class="saybody"><span class="sayname">${esc(STAFF[s.who].name)}</span>
        <span class="saytext">${esc(s.line)}</span></div></div>`).join("")}</div>
    <div class="callopts">${dp.opts.map(o=>
      `<button class="advance callbtn" data-call="${esc(o[0])}">${esc(o[1])}</button>`).join("")}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives.slice(-6),my,g)}</div>
  </div>`;
}
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
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  return `<div class="watchwrap">
    <div class="wtop ${done?(mine>theirs?'win':'loss'):''}">
      <div class="wlabel">${done?`FINAL &middot; ${mine>theirs?"WIN":"LOSS"}`
        :tip?`<span class="live"></span>PUCK DROP &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>${esc(cur.clock)}`}</div>
      <div class="wscore">
        <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span><span class="wn">${A}</span></div>
        <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span><span class="wn">${H}</span></div>
      </div>
    </div>
    ${fieldSVG(g,cur,teamColor(g.home),teamColor(g.away),venue)}
    <div class="grouphead">Run of play</div>
    <div class="plays">${upto.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''}">
      <span class="pq">${esc(e.clock)}</span>
      <div class="ptxt"><b>${esc(e.team)}</b> ${esc(e.text)}${e.outcome?` <span class="dtag sc">${esc(e.outcome)}</span>`:""}</div>
      <span class="pscore">${e.a}&ndash;${e.h}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the puck drop&hellip;</span></div>`}</div>
    <div class="actionbar">
      ${done?`<button class="advance" id="wdone">Back to the season</button>`
      :`<div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
          aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
        <div class="wctl">
          <button class="wbtn" id="wpause">${watch.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
          <button class="wbtn ${watch.paused?'hot':''}" id="wstep">Next five minutes &rarr;</button>
          <button class="wbtn" id="wskip">Skip</button>
        </div>
        <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>`}
    </div></div>`;
}
