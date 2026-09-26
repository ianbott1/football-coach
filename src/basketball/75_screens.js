/* ============ game screens: basketball ============ */
/* The scoreboard, the run of play in five-minute segments, the call screen
   with the staff's advice, and the replay view. */
function segLabel(d){ return d.seg==="last"?"Last shot":segClock(d.seg) }
function driveWord(d){
  if(d.seg==="last")return d.made?(d.choice==="three"?"the three is GOOD":"the two is good, overtime"):"the shot won't go";
  if(d.h===d.a)return "an even stretch, "+d.h+" apiece";
  return (d.h>d.a?"home":"away")+" run, "+Math.max(d.h,d.a)+"-"+Math.min(d.h,d.a);
}
/* a segment in words, with names from the rosters */
function driveScript(g,drives){
  const rng=new RNG(watchSeed(g));
  const RH=SEA.roster?SEA.roster[g.home]:null, RA=SEA.roster?SEA.roster[g.away]:null;
  const nm=(R,i)=>R&&R[i]?R[i].n:"a guard";
  return drives.map(d=>{
    if(d.seg==="last"){
      const tm=d.side==="home"?g.home:g.away, R=d.side==="home"?RH:RA;
      return {seg:d.seg,clock:"0:02",team:tm,pts:d.made?(d.choice==="three"?3:2):0,outcome:d.made?"GOOD":"MISS",
        text:`${nm(R,rng.int(3))} ${d.choice==="three"?"pulls up from three":"drives for two"}: ${d.made?"good!":"no good."}`,h:d.sh,a:d.sa};
    }
    const homeRun=d.h>=d.a, tm=homeRun?g.home:g.away, R=homeRun?RH:RA, big=Math.max(d.h,d.a), small=Math.min(d.h,d.a);
    const who=nm(R,rng.int(5)), pts=Math.max(2,Math.round(big*rng.range(0.3,0.6)));
    const text=big-small>=8?`${tm} goes on a ${big}-${small} run, ${who} with ${pts}`
      :big===small?`back and forth, ${big} apiece`
      :rng.r()<0.5?`${tm} edges the stretch ${big}-${small}`:`${who} keeps ${tm} going, ${big}-${small} over five minutes`;
    return {seg:d.seg,clock:segClock(d.seg),team:tm,pts:big,outcome:big-small>=8?"RUN":"",text:text,h:d.sh,a:d.sa};
  });
}
function liveScoreboard(){
  const g=live.g, my=S.myTeam, H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const tip=!live.drives.length;
  return `<div class="wtop">
    <div class="wlabel"><span class="live"></span>${tip?"TIP-OFF":esc(segLabel(last))}
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
    <div class="fpos">${last?esc(segLabel(last))+" &middot; "+esc(venue):"Tip-off at "+esc(venue)}</div>
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>Waiting for the tip&hellip;</span></div>`}</div>
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
        :tip?`<span class="live"></span>TIP-OFF &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
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
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the tip&hellip;</span></div>`}</div>
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
