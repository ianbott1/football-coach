/* ============ game screens: baseball ============ */
/* The line score (visitors first), the run of play an inning at a time with names, the evidence each call is made
   from, the call screen with the staff's advice, and the replay view. */

/* ---- names ---- */
function bsBatter(team,slot,u){
  const R=SEA.roster&&SEA.roster[team]; if(!R)return null;
  const i=BS_HIT[((slot%9)+9)%9], hurt=new Set(SEA.talent?SEA.talent.active(team).map(x=>x.idx):[]);
  const p=hurt.has(i)?null:R[i], b=hurt.has(BK(i))?null:R[BK(i)];
  const pick=(b&&(u%10)<1)||!p?b:p; return pick?pick.n:null;
}
const surname=n=>{ if(!n)return ""; const L=n.split(" ").slice(-1)[0]; try{ const g=typeof live!=="undefined"&&live&&live.g; if(g&&typeof surnameIn==="function")return surnameIn(n,g) }catch(e){} return L };
function bsPitcher(team,step){ const c=typeof spCtx==="function"?spCtx(team,step):null; return c&&c.n?c.n:"the starter" }
const HIT_WORD=["sacrifice fly","single","double","triple"];
const HR_WORD=["a solo home run","a two-run homer","a three-run homer","a grand slam"];
const HR_HOW=["to left","to right","to centre","over the wall in left-centre","into the second deck","just inside the foul pole"];
function pickOf(a,u){return a[u%a.length]}
/* round 61: more ways to say the same things (the log's filler "on loop": Muse), and how far a homer went (Instinct) */
const KK_LINE=[on=>`strike out the side's best chance: ${on}, nothing across`,on=>`leave ${on} stranded with a strikeout`,
  on=>`get the big strikeout with ${on}`,on=>`escape: ${on}, and the inning ends on a swing and a miss`,on=>`strand ${on}; the threat dies on strike three`];
const DP_LINE=["turn the double play to end the threat","get two on one ground ball","turn two, and the inning's over","a 6-4-3 double play kills the rally"];
const QUIET_LINE=["Both sides go quietly","Three up, three down, both ways","The pitchers trade zeroes","A quick inning","Nothing doing"];
function hrFeet(e){ return 355+(strHash("ft|"+(e.u||0)+"|"+(e.nm||"")+"|"+(e.n||1))%11)*10+(e.n===4?10:0) }
/* one event as a line of commentary */
function bsEventText(g,e){
  const tm=e.side==="home"?g.home:g.away, opp=e.side==="home"?g.away:g.home, u=e.u||0;
  const who=e.nm||bsBatter(tm,e.slot!==undefined?e.slot:u%9,u)||"their hitter";   // round 56: the engine names him
  if(e.k==="hr")return {team:tm,tag:e.n===4?"SLAM":"HR",text:`${who}: ${HR_WORD[Math.min(3,(e.n||1)-1)]} ${pickOf(HR_HOW,u>>2)}, ${hrFeet(e)} feet`};
  if(e.k==="rbi"){ if(e.hit<0)return {team:tm,tag:"RUN",text:e.hit===-2?`${who} is hit by a pitch with the bases loaded: a run scores`:`${who} draws a bases-loaded walk: a run scores`};
    return {team:tm,tag:"RUN",text:e.hit?`${who} ${e.n>1?`drives in ${["","one","two","three"][e.n]||e.n} with`:"brings one home with"} a ${HIT_WORD[e.hit]}`:`${who} lifts a sacrifice fly: a run scores`} }
  if(e.k==="kk")return {team:tm,tag:"",text:pickOf(KK_LINE,u)(e.on>=3?"the bases loaded":"two on")};
  if(e.k==="dp")return {team:tm,tag:"",text:pickOf(DP_LINE,u)};
  if(e.k==="sb")return {team:tm,tag:"SB",text:`${who} steals second`};
  if(e.k==="cs")return {team:tm,tag:"CS",text:`${who} is thrown out stealing`};
  if(e.k==="ph")return {team:tm,tag:"",text:e.nm?`${e.nm} pinch-hits${e.was?" for "+e.was:""}`:`send up a pinch hitter`};
  return {team:tm,tag:"",text:""};
}
const shown=e=>true;
function segClock(s){ return s>=SEGS?ordw(s+1)+" (extras)":ordw(s+1) }
function segLabel(d){ return segClock(d.seg) }
function rowsOf(g,drives){
  const rows=[];
  drives.forEach(d=>{
    let sh=d.sh-(d.h||0), sa=d.sa-(d.a||0);
    const lab=segLabel(d);
    (d.ev||[]).forEach(e=>{ const t=bsEventText(g,e); if(!t.text)return;
      if(e.k==="hr"||e.k==="rbi"){ if(e.side==="home")sh+=e.n||1; else sa+=e.n||1 }
      rows.push({m:lab,team:t.team,tag:t.tag,text:t.text,h:Math.min(sh,d.sh),a:Math.min(sa,d.sa),goal:e.k==="hr"}) });
    // a quiet inning says so now and then
    if(!(d.ev||[]).length&&(d.seg%3===1))rows.push({m:lab,team:"",tag:"",text:QUIET_LINE[(strHash((g.home||"")+(g.away||""))+d.seg)%QUIET_LINE.length],h:d.sh,a:d.sa,cue:true});
  });
  return rows;
}
function driveScript(g,drives){
  const rows=rowsOf(g,drives);
  return rows.length?rows.map(r=>({clock:r.m,team:r.team,outcome:r.tag,text:r.text,h:r.h,a:r.a,cue:r.cue}))
    :[{clock:"9th",team:"",outcome:"",text:"",h:0,a:0}];
}
/* a computer game: nine innings (more if it went long) whose runs add up to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), out=[], n=Math.max(SEGS,(g.drives&&g.drives.length)||(g.ot?SEGS+1:SEGS));
  const split=(tot,last)=>{const v=Array.from({length:n},()=>0); for(let i=0;i<tot;i++)v[rng.int(last)]++; return v};
  const hs=split(g.hp,n), as=split(g.ap,n); let sh=0,sa=0;
  for(let s=0;s<n;s++){ sh+=hs[s]; sa+=as[s]; const ev=[];
    const runs=(side,k)=>{ let left=k; while(left>0){ const hr=rng.r()<0.35, m=Math.min(left,hr?1+rng.int(Math.min(3,left)):1+rng.int(Math.min(2,left)));
      ev.push(hr?{k:"hr",side:side,n:m,u:rng.int(100),slot:rng.int(9)}:{k:"rbi",side:side,n:m,hit:1+rng.int(2),u:rng.int(100)}); left-=m } };
    runs("away",as[s]); runs("home",hs[s]);
    out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa,ev:ev}) }
  return driveScript(g,out);
}
function liveGapFor(L,mult){
  const d=L.drives[L.drives.length-1];
  const n=d&&d.ev?d.ev.length:0;
  return Math.max(110,Math.round((n?1300+n*350:700)*0.52/mult));
}
/* ---- the line score: visitors first ---- */
function scoreTop(g,H,A,label,cls,extra){
  return `<div class="wtop ${cls||""}">
    <div class="wlabel">${label}</div>
    <div class="wscore">
      <div class="wside ${A>H?'lead':''}"><span class="wt">${esc(g.away)}</span><span class="wn">${A}</span></div>
      <div class="wside ${H>A?'lead':''}"><span class="wt">${esc(g.home)}</span><span class="wn">${H}</span></div>
    </div>${extra||""}</div>`;
}
/* now: the live score (round 56: at a call in the middle of an inning the big score had the inning's runs and the
   line score didn't, "5TH INNING, DOWN 2" over a line reading 1-0: Instinct, Muse). The inning under way gets its
   runs so far, and R is the score itself. */
function lineScore(g,drives,now){
  const ls=drives.length?drives[drives.length-1]:null, done={h:ls?ls.sh:0,a:ls?ls.sa:0};
  const part=now&&(now.h>done.h||now.a>done.a)?{h:now.h-done.h,a:now.a-done.a}:null;
  const n=Math.max(SEGS,drives.length+(part?1:0)), cell=(v,b)=>`<td${b?' class="b"':''}>${v===null||v===undefined?"":v}</td>`;
  const row=(side,tm)=>`<tr><th>${esc(tm.length>11?tm.slice(0,10)+"\u2026":tm)}</th>${Array.from({length:n},(_,i)=>{ const d=drives[i]; if(!d&&part&&i===drives.length)return cell(part[side]||0); return cell(d?(side==="h"&&d.seg>=SEGS-1&&d.h===0&&d.sh>d.sa&&!(d.ev||[]).some(e=>e.side==="home")&&i===drives.length-1&&live&&live.done?"x":d[side]):null) }).join("")}${cell(now?now[side]:done[side],true)}${cell(drives.length?drives[drives.length-1].hits?drives[drives.length-1].hits[side==="h"?0:1]:"":"")}</tr>`;
  return `<div class="linescore"><table><tr><th></th>${Array.from({length:n},(_,i)=>`<td>${i+1}</td>`).join("")}<td class="b">R</td><td>H</td></tr>${row("a",g.away)}${row("h",g.home)}</table></div>`;
}
function liveScoreboard(){
  const g=live.g, my=S.myTeam, H=live.eng.h, A=live.eng.a;
  const last=live.drives[live.drives.length-1];
  const lab=`<span class="live"></span>${!live.drives.length?"FIRST PITCH":"After the "+esc(segLabel(last))}
      ${g.label?" &middot; "+esc(liveLabel(g)):(g.neutral?"":(g.home===my?" &middot; at home":" &middot; on the road"))}`;
  return scoreTop(g,H,A,lab,"",lineScore(g,live.drives,{h:H,a:A}));
}
/* ---- the evidence ---- */
function firstReadTip(){ return "" }
function evidenceHTML(g,my,d,dp){
  const opp=g.home===my?"away":"home";
  if(dp.k==="prep"){ const R=dp.report, n=6;
    return `<div class="evid"><div class="evh">${esc(g[opp])}: their last ${n} games at the plate</div>
      ${APPROACH_KEYS.map(k=>`<div class="evr"><span class="evk">${esc(APPROACH[k].l)}</span><span class="evv">${R[k]} of ${n}</span></div>`).join("")}
      <div class="evn">Most lineups have a usual approach, but not every day. Get the plan right and your pitchers take something off their bats; get it wrong and they're a step ahead until you change it.</div></div>`; }
  if(dp.k==="read"&&dp.tell){ const T=dp.tell, A=BS_TELL_AVG;
    // each against the league average, marked either way when it's well off it (round 58: only highs were marked: Muse)
    const mark=(v,avg,band)=>v===null?"":v>avg+band?"&#9650;":v<avg-band?"&#9660;":"";
    const plv=T.bip?T.pull/T.bip:null, ppv=T.pa?T.pit/T.pa:null, whv=T.pa?(T.wh||0)/T.pa:null;
    const rows=[["Balls in play pulled",plv===null?"-":Math.round(100*plv)+"%",mark(plv,A[0],0.08)],["Pitches an at-bat",ppv===null?"-":ppv.toFixed(1),mark(ppv,A[1],0.25)],
      ["Swings and misses an at-bat",whv===null?"-":whv.toFixed(2),mark(whv,A[2],0.15)]];
    return `<div class="evid"><div class="evh">How ${esc(g[opp])} are hitting <span>three innings</span></div>
      ${rows.map(r=>`<div class="evr ${r[2]?'lo':''}"><span class="evk">${r[0]}</span><span class="evv">${r[2]?r[2]+" ":""}${r[1]}</span></div>`).join("")}
      <div class="evn">League average: ${Math.round(100*A[0])}% of balls in play pulled, ${A[1].toFixed(1)} pitches an at-bat, ${A[2].toFixed(2)} swings and misses. &#9650; well above it, &#9660; well below. Pull hitters pull it; patient hitters see pitches; contact hitters don't miss. Three innings is a small sample.</div></div>`; }
  if(dp.k==="pull")return `<div class="evid"><div class="evh">Your starter today</div>
      <div class="evr ${dp.bf>=24?'hi':''}"><span class="evk">Batters faced</span><span class="evv">${dp.bf}</span></div>
      <div class="evr ${dp.ra>=3?'hi':''}"><span class="evk">Runs allowed</span><span class="evv">${dp.ra}</span></div>
      <div class="evn">Past about eighteen batters a starter gets a little worse with every one he faces; the bullpen is fresh, and a shade below a good starter. Your assistant goes to the pen when he's spent or hit hard.</div></div>`;
  // round 58: the evidence for both (their season lines; the runner's speed, the catcher's arm)
  if(dp.k==="pinch"){ const line=nm=>{ const P=dp.team?bsPlayer(dp.team,nm):null, L=P&&P.st2; if(!L||!L.ab)return "no at-bats yet";
      return `${(L.h/L.ab).toFixed(3).replace(/^0/,"")}, ${L.hr||0} HR in ${L.ab} at-bats` };
    const due=dp.q.match(/\. (.+?) is up/), who=due?due[1]:null, bench=dp.opts[0][1].replace(/^Pinch-hit:?\s*/,"");
    return `<div class="evid"><div class="evh">The pinch hitter</div>
      ${who?`<div class="evr"><span class="evk">Up: ${esc(who)}</span><span class="evv">${line(who)}</span></div>`:""}
      ${dp.opts[0][1]!=="Pinch-hit"?`<div class="evr"><span class="evk">Bench: ${esc(benchName(dp))}</span><span class="evv">${line(benchName(dp))}</span></div>`:""}
      <div class="evn">A pinch hitter helps by how much better a hitter he is than the man he bats for, and costs you that man for the rest of the game. Your assistant sends one up when the bench bat is the better hitter and you're not ahead.</div></div>` }
  if(dp.k==="steal"){ const P=dp.team&&dp.runner?bsPlayer(dp.team,dp.runner):null, sb=P&&P.st2?P.st2.sb||0:0;
    return `<div class="evid"><div class="evh">Sending the runner</div>
      <div class="evr"><span class="evk">${esc(dp.runner||"The runner")}</span><span class="evv">${esc(dp.speed||"average")}${P?`, ${sb} steal${sb===1?"":"s"} this season`:""}</span></div>
      <div class="evr"><span class="evk">Their catcher${dp.catcher?": "+esc(dp.catcher):""}</span><span class="evv">${esc(dp.arm||"an average arm")}</span></div>
      <div class="evn">An average runner against an average arm makes it about three times in four; speed helps, a strong arm hurts. Made, he's in scoring position; caught, the inning may be over. Your assistant sends him only when he should make it comfortably.</div></div>` }
  return "";
}
/* ---- the run of play ---- */
function playsHTML(drives,my,g,limit){
  let rows=rowsOf(g,drives); if(limit)rows=rows.slice(-limit);
  return rows.slice().reverse().map(r=>`<div class="play ${r.team===my?'mine':''} ${r.goal?'goalrow':''} ${r.cue?'cue':''}">
      <span class="pq">${esc(r.m)}</span>
      <div class="ptxt">${r.cue||!r.team?"":`<b>${esc(r.team)}</b> `}${esc(r.text)}${r.tag?` <span class="dtag ${/HR|SLAM|RUN/.test(r.tag)?'sc':'yl'}">${esc(r.tag)}</span>`:""}</div>
      <span class="pscore">${r.a}&ndash;${r.h}</span></div>`).join("");
}
function liveView(){
  const g=live.g, my=S.myTeam;
  const venue=g.neutral?(g.site||"neutral site"):g.home;
  return `<div class="watchwrap">
    ${liveScoreboard()}
    ${typeof hlBox==="function"?hlBox():""}
    <div class="grouphead">Run of play</div>
    <div class="plays">${playsHTML(live.drives,my,g)||`<div class="empty">${owlMark(40)}<span>First pitch at ${esc(venue)}&hellip;</span></div>`}</div>
    <div class="actionbar">
      <div class="wspeed">${SPEEDS.map(s=>`<button class="spbtn" data-speed="${s[0]}"
        aria-pressed="${(S.watchSpeed||"normal")===s[0]}">${s[2]}</button>`).join("")}</div>
      <div class="wctl">
        <button class="wbtn" id="wpause">${live.paused?"&#9654; Play":"&#10073;&#10073; Pause"}</button>
        <button class="wbtn ${live.paused?'hot':''}" id="wstep">Next inning &rarr;</button>
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
  const desc=o=>(dp.k==="read"||dp.k==="prep")&&ANSWERS[o]?ANSWERS[o].d:"";
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
  const lab=done?`FINAL${g.ot?" / "+(SEGS+g.ot):""} &middot; ${mine>theirs?"WIN":"LOSS"}`
        :tip?`<span class="live"></span>FIRST PITCH &middot; ${esc(g.title||g.site||(g.home===my?"at home":"on the road"))}`
        :`<span class="live"></span>${esc(cur.clock)}`;
  const rows=upto.filter(e=>e.text);
  return `<div class="watchwrap">
    ${scoreTop(g,H,A,lab,done?(mine>theirs?'win':'loss'):'')}
    <div class="grouphead">Run of play</div>
    <div class="plays">${rows.slice().reverse().map(e=>`<div class="play ${e.team===my?'mine':''} ${/HR|SLAM|RUN/.test(e.outcome||"")?'goalrow':''} ${e.cue?'cue':''}">
      <span class="pq">${esc(e.clock)}</span>
      <div class="ptxt">${e.cue?"":`<b>${esc(e.team)}</b> `}${esc(e.text)}${e.outcome?` <span class="dtag ${/HR|SLAM|RUN/.test(e.outcome)?'sc':'yl'}">${esc(e.outcome)}</span>`:""}</div>
      <span class="pscore">${e.a}&ndash;${e.h}</span></div>`).join("")
      ||`<div class="empty">${owlMark(40)}<span>Waiting for the first pitch&hellip;</span></div>`}</div>
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
/* the bench bat named in the call */
function benchName(dp){ const m=dp.q.match(/Pinch-hit with (.+?)\?/); return m?m[1]:"" }
/* which number gives each approach away (round 61, Muse: say which tell predicted the night). From BS_TELL. */
const READ_TELL={pull:"The tell for pull hitters: balls in play pulled. They pull about two in three.",
  patient:"The tell for a patient lineup: pitches an at-bat. They see about four and a half.",
  contact:"The tell for a contact lineup: swings and misses. They miss about half as often as other lineups."};
function readNote(e){ const t=readNote0(e);
  return t+(e.k==="read"&&!e.right&&!e.waited&&READ_TELL[e.truth]?" "+READ_TELL[e.truth]:"") }
function readNote0(e){
  if(e.k==="read"&&e.evid&&e.evid!==e.truth&&APPROACH[e.evid])
    return e.right?` The numbers pointed to ${APPROACH[e.evid].l.toLowerCase()}; your read was better than they were.`
      :` The numbers at the time pointed to ${APPROACH[e.evid].l.toLowerCase()}: three innings can mislead.`;
  if(e.k==="prep"&&e.split){ const by=typeof e.split==="string"?" "+e.split:"";
    return ` The report was split${by}, a coin flip, so it isn't graded either way.` }
  return "";
}
function readPickLabel(e){ if(e.waited)return "Wait and see"; const o=ANSWERS[e.pick]; return o?o.l:"" }
function readText(e){ return readTextBase(e)+readNote(e) }
function readTextBase(e){
  const A=k=>APPROACH[k]?APPROACH[k].l.toLowerCase():k;
  if(e.waited)return e.unclear?`You waited and saw: the report was split. Their hitters were ${A(e.truth)}.`:e.right?`You waited, and it paid: the report pointed to ${A(e.fav)}, and they weren't.`:`The report was right: they were ${A(e.truth)}. Setting up for it would have helped from the first pitch.`;
  if(e.k==="read")return e.right?`Your read was right: their hitters were ${A(e.truth)}.`
    :`Their hitters were ${A(e.truth)}: the plan was "${ANSWERS[APPROACH[e.truth].counter].l}".`;
  if(e.k==="prep")return e.right?`Your plan was right: they came out ${A(e.truth)}.`
    :`You planned for the wrong lineup: they came out ${A(e.truth)}.`;
  return "";
}
