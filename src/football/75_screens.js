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
                INT:["intercepted"],FUM:["fumble, recovered by the defense"]};
  return drives.map(d=>{
    const off=d.home?RH:RA, def=d.home?RA:RH;
    const nm=i=>off&&off[i]?off[i].n:"the offense";
    const dn=i=>def&&def[i]?def[i].n:"the defense";
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
  if(d.kind==="FUM")return "fumbled, recovered by the defense";
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
    ${dp.k==="fourth"?`<div class="callnote">The percentages are the chance this play works. After the game, the call is graded on what wins the game: a likely conversion can still be the wrong choice, and a long kick the right one.</div>`:""}
    <div class="grouphead">Drive chart</div>
    <div class="plays">${live.drives.slice().reverse().slice(0,6).map(d=>{
      const tm=d.home?g.home:g.away;
      return `<div class="play ${tm===my?'mine':''}">
        <span class="pq">Q${d.q} &middot; ${d.n}</span>
        <div class="ptxt"><b>${esc(tm)}</b> ${esc(driveWord(d))}</div>
        <span class="pscore">${d.a}&ndash;${d.h}</span></div>`}).join("")}</div>
  </div>`;
}


/* ---- after the game: were your calls the better percentage play? ----
   Each call (fourth down, two-point try, the late and half-time calls) is
   replayed from the moment you made it, with every answer, over the same
   stretch of luck many times, every later call left to the usual choice.
   The verdict: whether your answer won as often as the best one. */
let VERDICT_RUNS=1200;          // replays per answer
const VERDICT_SLACK=0.03;        // within this of the best answer: a good call (it's close)
const VERDICT_BASE={chase:"normal",protect:"keep",half:"normal",two:"kick"};
const TALLY_LABEL="The better call this season";
const TALLY_NOTE="Only calls where the choice moved your chance of winning by 2 points or more are graded; the rest made no real difference.";
function verdictDefault(dp){ const o=dp.opts.map(x=>x[0]);
  if(dp.k==="fourth")return o.indexOf("punt")>=0?"punt":"kick";
  return o.indexOf(VERDICT_BASE[dp.k])>=0?VERDICT_BASE[dp.k]:o[o.length-1] }
function callVerdicts(args,seed,answers,meHome){
  const KINDS={fourth:1,two:1,chase:1,protect:1,half:1};
  // the game as played: which asks were which
  const asks=[]; { const e=makeLiveGame(new RNG(seed),...args); let i=0,g=0;
    while(g++<2000){ const r=e.next(); if(r.done)break;
      if(r.ask){ asks.push({dp:r.ask,mine:r.mine,theirs:r.theirs}); e.reply(answers[i]!==undefined?answers[i]:verdictDefault(r.ask)); i++ } } }
  const out=[]; let judged=0;
  asks.forEach((A,j)=>{
    if(!KINDS[A.dp.k]||answers[j]===undefined)return;
    judged++;
    const opts=A.dp.opts.map(x=>x[0]), rate={};
    opts.forEach(o=>{ let w=0;
      for(let m=0;m<VERDICT_RUNS;m++){
        const rng=new RNG(seed), e=makeLiveGame(rng,...args); let i=0,g=0,r;
        while(g++<2000){ r=e.next(); if(r.done)break;
          if(r.ask){ let v;
            if(i<j)v=answers[i];
            else if(i===j){ rng.f=mulberry32((seed^Math.imul(m+1,0x9E3779B1))>>>0); rng.sp=null; v=o }
            else v=verdictDefault(r.ask);
            e.reply(v); i++ } }
        const mine=meHome?r.h:r.a, theirs=meHome?r.a:r.h; w+=mine>theirs?1:mine===theirs?0.5:0 }
      rate[o]=w/VERDICT_RUNS });
    const pick=answers[j], best=opts.reduce((a,o)=>rate[o]>rate[a]?o:a,opts[0]);
    const lab=o=>(A.dp.opts.find(x=>x[0]===o)||[o,o])[1].split(" · ")[0];
    const spread=rate[best]-Math.min(...opts.map(o=>rate[o]));
    if(spread<0.02){                       // it made no real difference: not graded, but kept for the debrief
      if(!out.close||spread>out.close.spread)out.close={h:A.dp.h,spread:spread,pick:lab(pick),
        opts:opts.map(o=>[lab(o),Math.round(rate[o]*100)])};
      return }
    // the runner-up, so a right call still shows what it beat
    const alt=opts.filter(o=>o!==pick).reduce((a,o)=>a===null||rate[o]>rate[a]?o:a,null);
    out.push({k:"call",pick:pick,truth:best,right:rate[pick]>=rate[best]-VERDICT_SLACK,
      other:alt!==null?lab(alt):undefined, or:alt!==null?Math.round(rate[alt]*100):undefined,
      h:A.dp.h, mine:lab(pick), best:lab(best), pr:Math.round(rate[pick]*100), br:Math.round(rate[best]*100)});
  });
  out.judged=judged;
  if(out.close)delete out.close.spread;                       // calls you made that could be graded, whether or not any were
  return out;
}
function readText(e){
  if(e.k!=="call")return "";
  // inside the margin the replays can't separate, both ways read the same:
  // a point either side isn't "the better call"
  const slack=Math.round(VERDICT_SLACK*100);
  if(e.right){ const o=e.pick===e.truth?e.other:e.best, or=e.pick===e.truth?e.or:e.br;
    if(o!==undefined&&Math.abs(e.pr-or)<=slack)
      return `${e.h}: "${e.mine}" and "${o}" won about as often (${e.pr}% and ${or}% of replays): either was a good call.`;
    return `${e.h}: "${e.mine}" was the better call: ${e.pr}% of replays won, against ${or!==undefined?or:"?"}% for "${o||"the other"}".` }
  return `${e.h}: "${e.best}" was the better call, ${e.br}% against your ${e.pr}%.`;
}
