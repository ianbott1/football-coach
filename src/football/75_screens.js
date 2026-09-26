/* ============ game screens: football ============ */
/* How a football game looks while you watch it: the scoreboard, the drive
   log and drive script, the call screen with the staff's advice, and the
   field view. The core runs the live game (start, tick, answer, finish);
   the sport supplies these, by these names:
     liveScoreboard, driveWord, driveScript, liveView, liveCallView,
     watchView, startWatch */

function startWatch(g){
  if(!g||!SEA.roster)return;
  const drives=(g.drives&&g.drives.length)?g.drives:null;
  watch={g:g, script:drives?driveScript(g,drives):gameScript(g,SEA.roster[g.home],SEA.roster[g.away],watchSeed(g)),
         i:-1, paused:(S.watchStep===true)};
  reveal=null;
  tickWatch();
}

/* Turn the real drives into readable lines, using the actual rosters. */
function driveScript(g,drives){
  const rng=new RNG(watchSeed(g));
  const RH=SEA.roster[g.home], RA=SEA.roster[g.away];
  const OUTTXT={PUNT:["three and out","forced to punt","stalls out, punt","goes backwards, punt"],
                DOWNS:["turned over on downs"],MISS:["the kick is no good"],
                INT:["intercepted"],FUM:["fumble, recovered by the defence"]};
  return drives.map(d=>{
    const off=d.home?RH:RA, def=d.home?RA:RH;
    const nm=i=>off&&off[i]?off[i].n:"the offence";
    const dn=i=>def&&def[i]?def[i].n:"the defence";
    let text;
    if(d.kind==="TD"){
      const y=Math.round(rng.range(2,64));
      text = rng.r()<0.56 ? `${nm(0)} ${y}-yd TD pass to ${nm(rng.r()<0.62?2:3)}`
           : rng.r()<0.8  ? `${nm(1)} ${y}-yd TD run`
                          : `${nm(0)} ${Math.round(rng.range(1,12))}-yd TD run`;
    } else if(d.kind==="FG"){ text=`${Math.round(rng.range(19,52))}-yd field goal`; }
    else if(d.kind==="INT"){ text=`intercepted by ${dn(8)}`; }
    else if(d.kind==="FUM"){ text=`fumble, recovered by ${dn(7)}`; }
    else if(d.kind==="MISS"){ text=`${Math.round(rng.range(38,56))}-yd attempt is no good`; }
    else { text=rng.pick(OUTTXT[d.kind]||["punt"]); }
    const sec=Math.max(5,Math.round(890-((d.n-1)%6+1)*140-rng.range(0,50)));
    return {n:d.n,q:d.q,clock:Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0"),
      team:d.home?g.home:g.away, pts:d.pts, outcome:d.kind, text:text,
      start:d.start, end:d.pts>0?100:Math.min(95,d.start+20),
      yards:d.pts>0?100-d.start:Math.max(0,20),
      ball: d.home ? 100-(d.pts>0?100:d.start+18) : (d.pts>0?100:d.start+18),
      h:d.h, a:d.a};
  });
}

function watchView(){
  const g=watch.g, my=S.myTeam;
  const upto=watch.script.slice(0,Math.max(0,Math.min(watch.i+1,watch.script.length)));
  const cur=upto[upto.length-1]||null;
  const H=cur?cur.h:0, A=cur?cur.a:0;
  const done=watch.i>=watch.script.length;
  const kick=watch.i<0;
  const mine=(g.home===my)?H:A, theirs=(g.home===my)?A:H;
  const q=cur?cur.q:1;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  const OUT={TD:"TD",FG:"FG",SAF:"SAFETY",PUNT:"PUNT",DOWNS:"DOWNS",MISS:"NO GOOD",
             INT:"INT",FUM:"FUMBLE",HALF:"HALF",END:"END"};
  return `<div class="watchwrap">
    <div class="wtop ${done?(mine>theirs?'win':'loss'):''}">
      <div class="wlabel">${done?`FINAL &middot; ${mine>theirs?"WIN":"LOSS"}`
        :kick?`<span class="live"></span>KICKOFF &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>Q${q} ${esc(cur.clock)} &middot; drive ${cur.n}`}</div>
      <div class="wscore">
        <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span>
          <span class="wn">${A}</span></div>
        <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span>
          <span class="wn">${H}</span></div>
      </div>
    </div>
    ${fieldSVG(g,cur,teamColor(g.home),teamColor(g.away),venue)}
    ${cur?`<div class="fpos">${esc(cur.team)} ball &middot; started own ${cur.start}
      &middot; ${cur.yards} yards</div>`
      :`<div class="fpos">Ready for kickoff at ${esc(venue)}</div>`}
    <div class="grouphead">Drive chart</div>
    <div class="plays">${upto.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''}">
      <span class="pq">Q${e.q} ${e.clock}</span>
      <div class="ptxt"><b>${esc(e.team)}</b> ${esc(e.text)}
        <span class="dtag ${e.pts?'sc':''}">${OUT[e.outcome]||e.outcome}</span></div>
      <span class="pscore">${e.a}&ndash;${e.h}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the opening drive&hellip;</span></div>`}</div>
    <div class="actionbar">
      ${done?`<button class="advance" id="wdone">Back to the season</button>`
      :`<div class="wspeed">${SPEEDS.map(s=>
          `<button class="spbtn" data-speed="${s[0]}"
            aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
        <div class="wctl">
          <button class="wbtn" id="wpause">${watch.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
          <button class="wbtn ${watch.paused?'hot':''}" id="wstep">Next drive &rarr;</button>
          <button class="wbtn" id="wskip">Skip</button>
        </div>
        <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>`}
    </div></div>`;
}

function liveScoreboard(){
  const g=live.g, my=S.myTeam;
  const H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const q=last?last.q:1;
  const kick=!live.drives.length;
  return `<div class="wtop">
    <div class="wlabel"><span class="live"></span>${kick?"KICKOFF":"Q"+q+" &middot; drive "+live.drives.length}
      ${g.label?" &middot; "+esc(g.label):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}</div>
    <div class="wscore">
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span>
        <span class="wn">${A}</span></div>
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span>
        <span class="wn">${H}</span></div>
    </div></div>`;
}

function liveView(){
  const g=live.g, my=S.myTeam;
  const last=live.drives[live.drives.length-1]||null;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  const OUT={TD:"TD",FG:"FG",PUNT:"PUNT",DOWNS:"DOWNS",MISS:"NO GOOD",INT:"INT",FUM:"FUMBLE"};
  const ballOf=d=>{const end=d.pts>0?100:Math.min(95,d.start+18);
    return d.home?100-end:end};
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${fieldSVG(g,last?{ball:ballOf(last)}:null,teamColor(g.home),teamColor(g.away),venue)}
    ${last?`<div class="fpos">${esc(last.home?g.home:g.away)} ball &middot; started own ${last.start}</div>`
          :`<div class="fpos">Ready for kickoff at ${esc(venue)}</div>`}
    <div class="grouphead">Drive chart</div>
    <div class="plays">${live.drives.slice().reverse().map(d=>{
      const tm=d.home?g.home:g.away;
      return `<div class="play ${tm===my?'mine':''}">
        <span class="pq">Q${d.q} &middot; ${d.n}</span>
        <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}
          <span class="dtag ${d.pts?'sc':''}">${OUT[d.kind]||d.kind}</span></div>
        <span class="pscore">${d.a}&ndash;${d.h}</span></div>`}).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the opening drive&hellip;</span></div>`}</div>
    <div class="actionbar">
      <div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
        aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
      <div class="wctl">
        <button class="wbtn" id="wpause">${live.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
        <button class="wbtn ${live.paused?'hot':''}" id="wstep">Next drive &rarr;</button>
        <button class="wbtn" id="wskip">Skip</button>
      </div>
      <div class="whint">Space to pause &middot; arrows to step &middot; 1&ndash;4 sets speed</div>
    </div></div>`;
}

function driveWord(d){
  if(d.note)return d.note;
  if(d.kind==="TD")return "touchdown";
  if(d.kind==="FG")return "field goal";
  if(d.kind==="INT")return "intercepted";
  if(d.kind==="FUM")return "lost the ball";
  if(d.kind==="MISS")return "the kick is no good";
  if(d.kind==="DOWNS")return "turned over on downs";
  return "forced to punt";
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
    <div class="grouphead">Drive chart</div>
    <div class="plays">${live.drives.slice().reverse().slice(0,6).map(d=>{
      const tm=d.home?g.home:g.away;
      return `<div class="play ${tm===my?'mine':''}">
        <span class="pq">Q${d.q} &middot; ${d.n}</span>
        <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}</div>
        <span class="pscore">${d.a}&ndash;${d.h}</span></div>`}).join("")}</div>
  </div>`;
}

