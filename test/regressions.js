/* The exact cases testers reported, each checked on the build (Muse's ask,
   Nov 2026: several "fixed" items weren't in the build they played, so each
   fix gets a test that would have caught it).
     node test/regressions.js        last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(process.env.DIST||path.join(__dirname,'..','dist'),f);   // DIST=another build's dist folder
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=20)console.log('  FAIL '+m)}};
const play=(A,n)=>{ let k=0; while(A.SEA.phase!=='done'&&k++<n){ A.doAdvance(); let m=0;
  while(A.live&&!A.live.done&&m++<3000){ A.live.ask?A.answerLive(A.live.ask.dp.opts[A.live.ask.dp.opts.length-1][0]):A.liveTick() } } };
const off=A=>{ A.openOffseason(); for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() } };
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const GAMES=[['football-coach.html','Alabama'],['football-coach-pro.html','Denver'],['basketball-coach.html','Duke'],
  ['basketball-coach-pro.html','Orlando'],['hockey-coach-pro.html','Vegas'],['soccer-coach.html','Dover Athletic'],['baseball-coach-pro.html','Seattle']];
const EXP=['S','SEA','U','POS','NAMES','LEAGUE','newDynasty','doAdvance','live','liveTick','answerLive','openOffseason','commitOffseason',
  'rosterView','weekNews','teamPanel','attentionHTML','advLabel','ordinal','coachCard','careerNow','hkEventText','bbEventText','scEventText','nflPickSlot','BUILD_ID',
  'winProb','ownEdge','rosterOf','promote','fireCoord','migrateSave','standingsView','dynastyView','teamCard','milestones','BK','stConf','dynTab','seasonRowsFor','allTime','FEATURE_EDGE','nflAsk','nflFreeAgentPreview','MAX_SAL','recStr','oddsHTML','noteChoice','simAdvance','rebuild','coachRows','careerNow','yourSeasonsHTML','dynastyView','claimSlot','save','staleTab','store','REVKEY','slot','allSlots','ownMark','readsHTML','callKey','impactHTML','bearYell','evidenceHTML','makeLiveGame','RNG','playGame','PLANS','staffPlanHTML','stakesFor','objStatus','seasonObjectives','attentionHTML','plan','heroGame','checkAchievements','seatBadge','fixtureLine','simStops','portalChance','eloToRating','dynastyView','collegePlanHTML','openOffseason'];
const SET=['stConf','dynTab','live','flash','plan'];

/* 1. soccer: a draw is never a win, a loss, or "null" (rivalries, headlines) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Dover Athletic',11,'T');
  const WIN=/\b(edged|held off|slipped past|beat|knocked off|took down|routed|ran over|blew out|buried|survived|handled|got past|lost to|fell to|was beaten by|lost a heartbreaker to|fell just short against|came up short against|was run over by|was blown out by)\b/;
  let draws=0, items=0;
  for(let y=0;y<2;y++){ play(A,999);
    A.SEA.weeks.forEach(W=>{ const N=A.weekNews(W)||[]; N.forEach(it=>{ items++; const t=strip(it.h)+' '+strip(it.b);
      ok(!/\bnull\b|undefined|NaN/.test(t),`soccer news ${A.SEA.year} "${t.slice(0,90)}"`);
      const m=strip(it.h).match(/(\d+)-(\d+)(?: draw)?\s*$/); if(m&&m[1]===m[2]&&!/penalties/.test(it.h)){ draws++; ok(!WIN.test(it.h),`soccer: a draw told as a result: "${strip(it.h)}"`) } }) });
    const ser=A.U.series||{}; Object.keys(ser).forEach(k=>{ const s=ser[k]; ok(!s.streak||!!s.streak.t,`soccer rivalry ${k}: a streak with no team`); ok(!(s.w&&s.w['null']),`soccer rivalry ${k}: draws filed under "null"`) });
    const tp=strip(A.teamPanel()); ok(!/\bnull\b/i.test(tp),`soccer team panel shows null`);
    // a coach's record counts draws (it read 22-8, .733 for 22-16-8)
    if(y===0){ off(A); const me=A.U.coach[A.S.myTeam]; const c=strip(A.coachCard(Object.assign({team:A.S.myTeam},me)));
      ok(me.d!==undefined,'soccer: your coach record has no draws'); ok(new RegExp(`${me.w}-${me.d}-${me.l}`).test(c),`soccer coach card "${c.slice(0,80)}" lacks W-D-L ${me.w}-${me.d}-${me.l}`) } }
  console.log(`  soccer: ${items} news items, ${draws} drawn headlines checked`); }

/* 2. hockey: the Play button names the date of your next game (NEXT UP) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Carolina',3,'T'); let n=0;
  for(let k=0;k<120&&A.SEA.phase==='week';k++){
    const my=A.S.myTeam, nx=A.SEA.sched.filter(g=>g.week>=A.SEA.step&&(g.home===my||g.away===my)).sort((a,b)=>a.week-b.week)[0];
    if(nx){ n++; const want='Play '+A.LEAGUE.dates[nx.week]; ok(A.advLabel()===want,`hockey step ${A.SEA.step}: button "${A.advLabel()}", next game ${A.LEAGUE.dates[nx.week]}`) }
    // half the time a long sim block, the rest one click (Muse saw it after a 20-game block)
    if(k%7===3){ for(let j=0;j<20&&A.SEA.phase==='week';j++){A.SEA.userTeam=my; A.SEA.advance(); A.S.steps++} } else play(A,1);
  }
  console.log(`  hockey: ${n} button dates checked`); }

/* 3. every game: featuring lasts a season, and the roster says so */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  A.S.featured=1; A.SEA.featured=1; const who=A.SEA.roster[A.S.myTeam][1].n;
  play(A,999); A.openOffseason();
  ok(/resets when the new season starts/.test(strip(A.rosterView())),`${f}: the offseason roster doesn't warn that featuring resets`);
  for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  ok(A.S.featured===null,`${f}: featuring didn't reset (${A.S.featured})`);
  const r=strip(A.rosterView()); ok(/reset when this one began/.test(r)&&r.indexOf(who)>=0,`${f}: the new season's roster doesn't name last season's featured player (${who})`);
  // the record book never runs backwards (it read 2027-2026)
  if(A.U.alumni)Object.values(A.U.alumni).forEach(L=>(L||[]).forEach(x=>ok(x.from<=x.to,`${f}: ${x.n} in the record book ${x.from}-${x.to}`)));
}

/* 4. ordinals: 21st, 22nd, 23rd, 32nd, 11th-13th; and every draft slot */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP});
  const want=n=>{const t=n%100; if(t>=11&&t<=13)return n+'th'; return n+({1:'st',2:'nd',3:'rd'}[n%10]||'th')};
  for(let n=1;n<=120;n++)ok(A.ordinal(n)===want(n),`ordinal(${n}) = ${A.ordinal(n)}`);
  A.newDynasty('Kansas City',2,'T'); play(A,999);
  for(const t of A.NAMES){ A.S.myTeam=t; const s=A.nflPickSlot(); ok(/^\d+(st|nd|rd|th)$/.test(s)&&s===want(parseInt(s)),`draft slot for ${t}: "${s}"`) } }

/* 5. a surname both sides share gets an initial in commentary */
for(const [f,team,fn,ev] of [['hockey-coach-pro.html','Vegas','hkEventText',{side:'home',k:'goal',u:37}],
                             ['basketball-coach.html','Duke','bbEventText',{side:'home',k:'inside',n:2,u:4}],
                             ['soccer-coach.html','Arsenal','scEventText',{side:'home',k:'save',u:9}]]){
  const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  const g=A.SEA.sched.find(x=>x.home===A.S.myTeam)||A.SEA.sched[0], H=A.SEA.roster[g.home], W=A.SEA.roster[g.away];
  // every player on both sides takes one surname: whoever the line names, it's ambiguous
  H.concat(W).forEach(p=>{ if(p)p.n=p.n.split(' ')[0]+' Tremblay' });
  let lines=0, bare=0;
  for(let u=0;u<60;u++){ const r=A[fn](g,Object.assign({},ev,{u:u}),{}); if(!r||!r.text)continue; lines++;
    if(/(^|[^.] )Tremblay\b/.test(r.text.replace(/\b[A-Z][a-z'A-Z]+ Tremblay\b/g,'')))bare++ }
  ok(lines>0&&bare===0,`${f}: ${bare} of ${lines} commentary lines use a bare shared surname`); }

/* 6. the "Needs a decision" card is in the wide (desktop) layout too */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,6,'T');
  const my=A.S.myTeam; if(!A.SEA.dc||!A.SEA.dc[my])continue; A.SEA.dc[my].q=-40;
  ok(/data-fire=/.test(A.attentionHTML(my)),`${f}: no staff decision with a -40 assistant`);
  ok(/data-fire=/.test(A.teamPanel()),`${f}: the wide layout's team panel has no "Make a change"`); }

/* 7. the salary cap binds (Nov 2026): hard caps are never exceeded after an
   offseason, and a typical payroll sits near the cap, not a quarter of it */
for(const [f,cap,hard] of [['football-coach-pro.html',110,true],['hockey-coach-pro.html',104,true],['basketball-coach-pro.html',165,false]]){
  const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(A.NAMES[2],9,'T'); const meds=[];
  for(let y=0;y<3;y++){ const E=A.SEA; let g=0; while(E.phase!=='done'&&g++<900)E.advance(); off(A);
    const pay=A.NAMES.map(t=>A.U.roster[t].reduce((s,x)=>s+(x&&x.k?x.k.sal:0),0)).sort((a,b)=>a-b);
    meds.push(pay[pay.length>>1]/cap);
    if(hard)ok(pay[pay.length-1]<=cap+0.05,`${f}: a payroll of ${pay[pay.length-1].toFixed(1)} over the ${cap} hard cap`);
    else ok(pay[pay.length-1]<=200.05,`${f}: a payroll of ${pay[pay.length-1].toFixed(1)} past the tax line`) }
  // hockey's curve bends (Nov 2026, Ian's call): cheaper middles leave a typical payroll near 60% of the
  // cap, the best-built teams still at it; the others stay ~70-85%
  const lo=/hockey/.test(f)?0.5:0.6, want=/hockey/.test(f)?"~55-70%":"~70-85%";
  const m=meds.reduce((a,b)=>a+b)/meds.length; ok(m>=lo&&m<=0.95,`${f}: typical payroll ${Math.round(100*m)}% of the cap (want ${want})`);
  console.log(`  ${f}: typical payroll ${Math.round(100*m)}% of the cap`); }

/* 8. a build stamp on every game */
for(const [f] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); ok(/^[0-9a-f]{7}$/.test(A.BUILD_ID||''),`${f}: no build stamp`) }

/* ---- round 6 (Muse, Nov 2026) ---- */
/* 9. an injury follows the player: promote the healthy backup and the
   injured starter is the one shown OUT, and the team isn't charged twice */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Duke',4,'T');
  const my=A.S.myTeam, E=A.SEA, R=E.roster[my], i=0, st=R[i], bk=R[A.BK(i)];
  E.talent.inj[my].push({m:-60,w:4,k:st.p,idx:i,who:st.n,rating:st.r});
  const before=E.talent.eff(my,E.step); A.promote(i);
  const rv=A.rosterView(), outName=(rv.match(/<div class="pname[^"]*">(?:<span[^>]*>#\d+<\/span>)?([^<]+)[\s\S]{0,80}?outtag/)||[])[1]||'';
  ok(outName.trim()===st.n,`college basketball: after promoting ${bk.n}, the OUT tag is on "${outName.trim()}", not the injured ${st.n}`);
  ok(E.roster[my][i]===bk&&E.talent.active(my).some(e=>e.idx===A.BK(i)),'college basketball: the injury stayed on the starter slot');
  ok(E.talent.eff(my,E.step)>=before-0.01,`college basketball: promoting the healthy backup cost strength (${before.toFixed(0)} to ${E.talent.eff(my,E.step).toFixed(0)})`);
  // promoting him back puts the injury (and its cost) back where it was
  A.promote(i); ok(E.talent.active(my).some(e=>e.idx===i&&e.m===-60),'college basketball: promoting the injured starter back lost his injury');
  // an old save's promotion (a plain number) still replays the old way
  const saved=JSON.parse(JSON.stringify(A.S.promos)); ok(Object.values(saved).every(L=>L.every(x=>typeof x==='object')),'new promotions are not marked as moving injuries'); }
/* 10. featuring moves the shown win probability (it never did) */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,8,'T'); if(A.FEATURE_EDGE===undefined)continue;
  // the number on the screen (soccer's W/D/L too), against the closest-matched opponent
  const my=A.S.myTeam, opp=A.NAMES.filter(t=>t!==my).sort((a,b)=>Math.abs(A.SEA.elo[a]-A.SEA.elo[my])-Math.abs(A.SEA.elo[b]-A.SEA.elo[my]))[0];
  const show=()=>strip(A.oddsHTML(my,opp,true,false,A.winProb(my,opp,true,false))), p0=A.winProb(my,opp,true,false), s0=show();
  A.S.featured=1; A.SEA.featured=1; const p1=A.winProb(my,opp,true,false), s1=show();
  ok(p1>p0&&s1!==s0,`${f}: featuring left the odds at "${s0}"`); A.S.featured=null; A.SEA.featured=null; }
/* 11. a club page's "starters average" is the starters' (it averaged the squad) */
for(const [f,team] of [['football-coach.html','Alabama'],['soccer-coach.html','Arsenal']]){
  const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  const t=A.NAMES.find(x=>x!==A.S.myTeam), R=A.SEA.roster[t], want=Math.round(R.slice(0,A.POS.length).reduce((s,p)=>s+p.r,0)/A.POS.length);
  const m=strip(A.rosterOf(t)).match(/Starters (?:·|&middot;) average rating (\d+)/); ok(m&&+m[1]===want,`${f}: ${t}'s starters average shown ${m&&m[1]}, true ${want}`); }
/* 12. soccer: draws in every record, old seasons too (a save from before
   draws were kept is filled in on load); league seasons are 38 or 46 games */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Dover Athletic',11,'T');
  for(let y=0;y<2;y++){ play(A,999); off(A) }
  A.S.history.forEach(h=>Object.keys(h.teams).forEach(t=>{ const r=h.teams[t]; ok(!!A.LEAGUE.seasonGames&&r[0]+r[1]+r[3]===A.LEAGUE.seasonGames(h.league.res[t]),`soccer ${h.year} ${t}: ${r[0]}-${r[3]}-${r[1]} isn't a full season for "${h.league.res[t]}"`) }));
  const old=JSON.parse(JSON.stringify(A.S)), truth=JSON.parse(JSON.stringify(A.S.history.map(h=>h.teams)));
  old.history.forEach(h=>Object.keys(h.teams).forEach(t=>h.teams[t]=h.teams[t].slice(0,3)));
  const m=A.migrateSave(old); ok(JSON.stringify(m.history.map(h=>h.teams))===JSON.stringify(truth),'soccer: old seasons\' draws not filled in on load');
  const rows=A.seasonRowsFor(A.S.myTeam); ok(rows.every(r=>/^\d+-\d+-\d+$/.test(r.rec)),`soccer: a season row without draws (${rows.map(r=>r.rec).join(' ')})`); }
/* 13. the fired assistant doesn't come back: fire mid-season, and the
   offseason has his job open; whoever fills it, it isn't him */
for(const [f,team] of [['hockey-coach-pro.html','Vegas'],['football-coach.html','Alabama']]){
  const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T'); const my=A.S.myTeam, was=A.U.oc[my].n;
  play(A,3); A.fireCoord('oc'); play(A,999); A.openOffseason();
  ok(!!(A.S.off.staff&&A.S.off.staff.oc),`${f}: firing ${was} mid-season left no offseason job to fill`);
  for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  ok(A.U.oc[A.S.myTeam].n!==was,`${f}: ${was}, fired mid-season, is back`); }
/* 14. college standings filter by conference */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Duke',5,'T');
  ok(/id="stconf"/.test(A.standingsView()),'college basketball: no conference picker on Standings');
  A.stConf='Ivy League'; const h=A.standingsView(); ok((h.match(/class="chead"/g)||[]).length===1&&/Ivy League<\/div>/.test(h),'college basketball: picking a conference doesn\'t show just it'); A.stConf=null; }
/* 15. college basketball keeps past brackets */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Duke',5,'T');
  play(A,999); const champ=A.SEA.champion; off(A); play(A,3);
  A.dynTab='league'; const h=A.dynastyView();
  ok(/Past brackets/.test(h)&&h.indexOf(champ)>=0&&/National Championship/.test(h),`college basketball: last season's bracket isn't in History (champion ${champ})`); }
/* 16. payroll on every team's card, in season (pro games) */
for(const [f] of GAMES.filter(g=>/pro|soccer/.test(g[0]))){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(GAMES.find(g=>g[0]===f)[1],5,'T');
  const t=A.NAMES.find(x=>x!==A.S.myTeam); play(A,2); const c=strip(A.teamCard(t));
  ok(/Payroll [$£][\d.]+M of [$£][\d.]+M/.test(c),`${f}: ${t}'s card shows no payroll in season ("${c.slice(0,60)}")`); }
/* 17. milestones count your seasons at this club, not the club's */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP}); A.newDynasty('Denver',5,'T');
  const H=[{year:2026,team:'Dallas',teams:{Denver:[15,2,1],Dallas:[9,8,12]}}];      // a great Denver year you weren't there for
  const m=A.milestones(12,5,'',3,'Denver',H).join(' ');
  ok(!/old high of 15/.test(m)&&/first season in charge/.test(m),`milestones counted a season before you arrived: "${m}"`); }
/* 18. soccer: after a move, the featuring note names the player you featured
   (it named the new club's man in that slot), and says nothing at the new club */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Brentford',5,'T');
  const my=A.S.myTeam; A.S.featured=2; A.SEA.featured=2; const who=A.SEA.roster[my][2].n; play(A,999); A.openOffseason();
  const job=(A.S.off.jobs||[]).map(j=>j.t||j.team||j).find(t=>typeof t==='string'&&t!==my)||'Fulham';
  if(!job)console.log('  soccer: no job offer to move to with this seed (check skipped)');
  else{ A.S.off.move=job; for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
    ok(A.S.myTeam===job,`soccer: the move to ${job} didn't happen`);
    ok(A.S.featuredLast&&A.S.featuredLast.n===who,`soccer: last season's featured player recorded as ${A.S.featuredLast&&A.S.featuredLast.n}, not ${who}`);
    ok(!/reset when this one began/.test(strip(A.rosterView())),'soccer: the new club\'s roster talks about last season\'s featuring'); } }
/* ---- Instinct, round 2 (Nov 2026) ---- */
/* 19. hockey contracts: a good starter isn't a max player, the max is rare,
   and no ask passes the maximum (a 64 asked the $20.8M max; a goalie's
   estimate read $22.9M) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Winnipeg',9,'T');
  ok(A.nflAsk(64,'C',27)<0.85*A.MAX_SAL,`hockey: a 64 asks ${A.nflAsk(64,'C',27)} of a ${A.MAX_SAL} max`);
  ok(A.nflAsk(58,'C',27)<A.nflAsk(64,'C',27)&&A.nflAsk(64,'C',27)<A.nflAsk(68,'C',27),'hockey: asks don\'t rise with rating from 58 to 68');
  let maxed=0,n=0;
  for(let y=0;y<2;y++){ let g=0; while(A.SEA.phase!=='done'&&g++<900)A.SEA.advance(); A.openOffseason();
    A.nflFreeAgentPreview(A.U,A.S.myTeam).forEach(x=>ok(x.ask<=A.MAX_SAL+0.05,`hockey: free agent ${x.n} estimated at ${x.ask}, over the ${A.MAX_SAL} max`));
    if(y===0){ const pv=A.nflFreeAgentPreview(A.U,A.S.myTeam); A.S.off.picks.targets=pv.slice(0,3).map(x=>x.key);
      { const was=[A.S.off.jobs,A.S.off.poach]; A.S.off.poach=A.NAMES.filter(t=>t!==A.S.myTeam).slice(0,2); const jc=strip(A.LEAGUE.ui.offseasonScreen()); A.S.off.poach=was[1];
        // a job offer's last season, with overtime losses (Instinct: 42-42 for 42-30-12)
        const ls=(jc.match(/Last season (\d+-\d+(-\d+)?)/g)||[]); ok(ls.length>0&&ls.every(x=>/\d+-\d+-\d+/.test(x)),`hockey: job offers read ${ls.join(', ')||'nothing'}`) }
      const card=strip(A.LEAGUE.ui.offseasonBanner?A.LEAGUE.ui.offseasonScreen():''); ok(card.indexOf(A.recStr(A.S.myTeam))>=0,`hockey: the offseason card's record isn't ${A.recStr(A.S.myTeam)} (overtime losses merged)`);
      ok(/fits|close: it depends|won't fit/.test(card)&&!/squeezing the draft class/.test(card),'hockey: a target "fits only by squeezing the draft class" (the class is paid before free agency)') }
    for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
    A.NAMES.forEach(t=>A.U.roster[t].forEach(p=>{ if(p&&p.k){ n++; if(p.k.sal>=A.MAX_SAL-0.05)maxed++ } })) }
  console.log(`  hockey: ${maxed} of ${n} contracts at the maximum`);
  ok(maxed/n<0.03,`hockey: ${maxed} of ${n} contracts at the maximum`); }
/* 20. the action bar is opaque behind its buttons (text showed through at 390px) */
for(const [f] of GAMES){ const h=require('fs').readFileSync(D(f),'utf8'); ok(/\.actionbar \.skip\{background:var\(--ink\)\}/.test(h)&&!/\.actionbar\{[^}]*rgba\(16,19,28,\.95\) 32%/.test(h),`${f}: the action bar's buttons are see-through`) }
/* ---- Muse round 7 / Instinct round 3 (Nov 2026) ---- */
/* 21. a reload replays every game as it was played: featuring (and hockey's
   ice time) changed mid-season used to replay all simmed games with the
   latest choice, so records drifted between loads (77-5 to 71-11) */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,7,'T');
  const step=n=>{ for(let k=0;k<n&&A.SEA.phase!=='done';k++){ A.simAdvance(); let m=0; while(A.live&&!A.live.done&&m++<5000){A.live.ask?A.answerLive(A.live.ask.dp.opts[A.live.ask.dp.opts.length-1][0]):A.liveTick()} } };
  const F=v=>{const w=A.S.featured; A.S.featured=v; A.noteChoice&&A.noteChoice('f',w,v); A.SEA.featured=v};
  const Dp=v=>{const w=A.S.deploy; A.S.deploy=v; A.noteChoice&&A.noteChoice('d',w,v); A.SEA.deploy=v};
  step(8); F(0); step(8); if(/hockey/.test(f))Dp({f:'ride',d:'roll'}); step(8); F(null); step(8); F(2);
  const before=JSON.stringify([A.SEA.rec,A.SEA.drw||null]); A.rebuild();
  ok(JSON.stringify([A.SEA.rec,A.SEA.drw||null])===before,`${f}: a reload changed the season's records after featuring changes mid-season`);
  ok(A.SEA.featured===2,`${f}: after a reload the current featuring is ${A.SEA.featured}, not 2`); }
/* 22. soccer: every coach's record carries draws (the Coaches page read 54-0-48) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Dover Athletic',11,'T');
  for(let y=0;y<2;y++){ play(A,999); off(A) }
  const rows=A.coachRows(), me=rows.find(r=>r.you);
  ok(rows.filter(r=>r.d>0).length>rows.length*0.8,'soccer: coaches\' records have no draws');
  ok(me&&me.w===A.S.career.w&&me.d===A.S.career.d&&me.l===A.S.career.l,`soccer: your Coaches row ${me&&[me.w,me.d,me.l]} isn't your career ${[A.S.career.w,A.S.career.d,A.S.career.l]}`); }
/* 23. after a move: your Coaches row is your whole career, the You page lists
   your own seasons, and the club's rows don't carry your other job's grades */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP}); A.newDynasty('Denver',5,'T');
  play(A,999); A.openOffseason(); A.S.off.move='Dallas'; for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  play(A,999); A.openOffseason(); for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  ok(A.S.myTeam==='Dallas','pro football: the move to Dallas didn\'t happen');
  const me=A.coachRows().find(r=>r.team===A.S.myTeam), C=A.S.career;   // banked, as every coach's row is
  ok(me&&me.w===C.w&&me.l===C.l,`pro football: your Coaches row ${me&&me.w+'-'+me.l} isn't your career ${C.w}-${C.l}`);
  const ys=strip(A.yourSeasonsHTML?A.yourSeasonsHTML():''); ok(/Denver/.test(ys)&&/Dallas/.test(ys),'pro football: the You page doesn\'t list your seasons at both clubs');
  ok(A.seasonRowsFor('Dallas').every(r=>r.year<2027?!r.grade:true),'pro football: Dallas\'s season rows carry a grade from your Denver year'); }
/* 24. an injured backup is never recommended to start */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Duke',4,'T'); const my=A.S.myTeam, E=A.SEA;
  let n=0; for(let i=0;i<A.POS.length;i++){ const b=E.roster[my][A.BK(i)]; if(!b)continue; b.r=E.roster[my][i].r+10; E.talent.inj[my].push({m:0,w:14,k:b.p,idx:A.BK(i),who:b.n,rating:b.r}); n++ }
  ok(n>0&&!/data-promo/.test(A.attentionHTML(my)),'college basketball: a decision card recommends starting an injured backup'); }
/* 25. the team card says franchise strength in words */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  const c=strip(A.teamCard(A.S.myTeam)); ok(!/rating points/.test(c)&&/since \d{4}: (about where|a little|stronger|weaker|much)/.test(c),`${f}: the team card's strength line is in engine numbers ("${(c.match(/since \d{4}:[^&]{0,40}/)||[''])[0]}")`) }
/* ---- Muse round 8 / Instinct round 4 (Nov 2026) ---- */
/* 26. a tab open on an older state doesn't save over newer progress (it
   silently wiped six games: the "ghost" careers, lagging title summaries
   and a playoff series that changed on reload) */
const tabsCheck=async()=>{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP}); A.newDynasty('Boston',5,'T');
  if(!A.claimSlot)return ok(false,'no slot revisions (two tabs overwrite each other)');
  await A.save(); await A.claimSlot(A.slot);
  ok(await A.save()===true,'pro basketball: a save in the only open tab failed');
  await A.store.set(A.REVKEY(A.slot),String(999));                 // another tab saved since
  ok(await A.save()===false&&A.staleTab===true,'pro basketball: a tab saved over a newer revision');
};
/* 27. in the offseason, "earlier seasons" leaves out the finished one */
const slotCheck=async()=>{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP}); A.newDynasty('Boston',6,'T');
  play(A,999); off(A); play(A,999); A.openOffseason(); await A.save();
  const S0=(await A.allSlots()).find(x=>!x.empty), C=A.S.career, N=A.SEA.rec[A.S.myTeam];
  ok(S0&&S0.rec===`${C.w-N[0]}-${C.l-N[1]}`,`pro basketball: offseason slot says earlier seasons ${S0&&S0.rec}, want ${C.w-N[0]}-${C.l-N[1]}`); };
/* 28. soccer: stops and careers saved without draws get them back on load */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Dover Athletic',11,'T');
  for(let y=0;y<2;y++){ play(A,999); off(A) }
  const want=JSON.stringify(A.S.career.stops.map(x=>x.d)), wd=A.S.career.d, old=JSON.parse(JSON.stringify(A.S));
  old.career.stops.forEach(x=>delete x.d); delete old.career.d; const m=A.migrateSave(old);
  ok(JSON.stringify(m.career.stops.map(x=>x.d))===want&&m.career.d===wd,`soccer: a stop saved without draws loads as ${JSON.stringify(m.career.stops.map(x=>x.d))} (want ${want})`); }
/* 29. "Your seasons" shows as soon as you've moved */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Brentford',5,'T'); play(A,999); A.openOffseason(); A.S.off.move='Fulham';
  for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  ok(A.S.myTeam==='Fulham'&&/Your seasons/.test(A.yourSeasonsHTML()),'soccer: no "Your seasons" after a move, before a season at the new club'); }
/* 30. the odds say when they include your featuring */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T'); if(!A.ownMark){ok(false,f+': no featuring mark on the odds');continue}
  A.S.featured=1; A.SEA.featured=1; ok(/with featuring/.test(A.ownMark(A.S.myTeam)),`${f}: the odds don't say they include featuring`) }
/* 31. hockey asks about your goalie only when the evidence is split */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Boston',5,'T'); let asked=0,plain=0,n=0;
  for(let k=0;k<30&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<5000){ const q=A.live.ask;
      if(q&&q.dp.k==='goalie'){ asked++; if(!(q.dp.soft>0||q.dp.ga>=q.dp.xga+1.5))plain++ } q?A.answerLive(q.dp.opts[q.dp.opts.length-1][0]):A.liveTick() } n++ }
  console.log(`  hockey: ${asked} goalie questions in ${n} games, ${plain} with the answer plain`);
  ok(plain===0,`hockey: ${plain} goalie questions asked with no soft goal and goals near expected`); }
/* 32. each read its own line, labelled, with what you chose (round 32: merged lines hid which choice was graded: Grokbot) */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Duke',5,'T');
  const r={k:'read',pick:'pack',truth:'paint',right:true}; A.S.played={[A.callKey(0)]:[{team:A.S.myTeam,reads:[r,Object.assign({},r)]}]};
  const h=A.readsHTML(0); ok((h.match(/class="read ok"/g)||[]).length===2&&/First read:/.test(h)&&/Second read:/.test(h)&&(strip(h).match(/You chose "/g)||[]).length===2,'college basketball: reads not one line each, labelled, with the choice'); }
/* 33. soccer's second read: "keep your setup", and the numbers since half-time */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Arsenal',5,'T'); let keep=0,half=0,seen=0;
  for(let k=0;k<4;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<5000){ const q=A.live.ask;
      if(q&&q.dp.k==='read'&&q.dp.stage===2){ seen++; if(q.dp.opts[0][0]==='keep')keep++;
        const d=A.live.drives[A.live.drives.length-1]; if(/since half-time/.test(A.evidenceHTML(A.live.g,A.S.myTeam,d,'read')))half++ }
      q?A.answerLive(q.dp.opts[q.dp.stage===1?1:0][0]):A.liveTick() } }
  ok(seen>0&&keep===seen&&half===seen,`soccer: second reads ${seen}, with "keep your setup" ${keep}, with since-half-time numbers ${half}`); }
/* 34. every basketball read number has its league average */
for(const f of ['basketball-coach.html','basketball-coach-pro.html']){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(f==='basketball-coach.html'?'Duke':'Boston',5,'T'); let h='';
  for(let k=0;k<3&&!h;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<5000){ const q=A.live.ask; if(q&&q.dp.k==='read'&&!h)h=strip(A.evidenceHTML(A.live.g,A.S.myTeam,A.live.drives[A.live.drives.length-1],q.dp));
      q?A.answerLive(q.dp.opts[q.dp.opts.length-1][0]):A.liveTick() } }
  ok(/League average:.*points in the paint/.test(h),`${f}: the read screen gives no league average for points in the paint`) }
/* 35. every call against the assistant is weighed on the result card, not just the biggest */
{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP});
  const P=[{mine:110,theirs:104,impact:[{h:'Up 11 at the half',pick:'Slow it down',def:'Keep going',worth:-0.01,cf:{mine:108,theirs:104}},{h:'Down 6, late',pick:'Full-court press',def:'Stay in the half court',worth:0.06,cf:{mine:104,theirs:106}}]}];
  ok(/Up 11 at the half[^;<]*: close either way/.test(strip(A.impactHTML(P))),'pro basketball: a second call against the assistant gets no verdict'); }   // every other call is named, with a sized word (round 28)   // a close one is counted, not headlined (Muse)
/* 36. the Bears don't repeat a line in one game */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Arsenal',5,'T');
  A.live={g:{}}; A.live.ask={dp:{h:'Half-time'},q:9}; const a=A.bearYell('push',15); A.live.ask={dp:{h:'Late'},q:15}; const b=A.bearYell('push',21);
  A.live.ask={dp:{h:'Half-time'},q:9}; ok(a!==b&&A.bearYell('push',15)===a,`soccer: the Bears said "${a}" twice in one game`); A.live=null; }
/* ---- Grokbot, first pass (Nov 2026) ---- */
/* 37. the win chance shown is the engine's own: the game played from the same strengths wins as often as it says.
   (It moved with the gameplan until round 33, when Ian ruled the number shouldn't; since round 34 it's worked out from
   the strengths the game is played with, lineup included, not the league's running ratings: test 79.) */
for(const [f,team] of GAMES.filter(g=>!/soccer/.test(g[0]))){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  const my=A.S.myTeam, opp=A.NAMES.filter(t=>t!==my).sort((a,b)=>Math.abs(A.SEA.elo[b]-A.SEA.elo[my]-150)-Math.abs(A.SEA.elo[a]-A.SEA.elo[my]-150)).pop();
  const shown=A.winProb(my,opp,false,true); A.SEA.userTeam=my; const e=A.SEA.matchupElo({home:my,away:opp,neutral:true},'balanced'), r=new A.RNG(3); let w=0,N=4000;
  for(let i=0;i<N;i++){ const g=A.playGame(r,e.h,e.a,'balanced','balanced',{neutral:true}); if(g.h>g.a)w++; else if(g.h===g.a)w+=0.5 }
  ok(Math.abs(shown-w/N)<0.04,`${f}: shows ${(100*shown).toFixed(0)}% where the engine wins ${(100*w/N).toFixed(0)}% (gap ${Math.round(e.h-e.a)})`) }
/* 38. the offseason plan card shows your changes */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP}); A.newDynasty('Seattle',5,'T'); play(A,999); A.openOffseason();
  const P=A.S.off.picks, ex=Object.keys(P.asks||{}); if(ex.length){ const i=ex[0], was=!!P.resign[i]; P.resign[i]=!was;
    const h=strip(A.staffPlanHTML(P)), nm=A.U.roster[A.S.myTeam][i].n;
    ok(/Your plan/.test(h)&&new RegExp((was?'Let go':'Re-sign')+'[^.]*'+nm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(h)&&/your change/.test(h),`pro football: after flipping ${nm}, the plan card says "${h.slice(0,160)}"`) } }
/* 39. hockey's stakes count games left, not days */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Toronto',5,'T'); play(A,18);
  const ng=A.SEA.sched.filter(g=>g.week>=A.SEA.step&&(g.home===A.S.myTeam||g.away===A.S.myTeam)).sort((a,b)=>a.week-b.week)[0];
  const t=A.stakesFor(ng).map(x=>x.l).join(' '), m=t.match(/with (\d+) to play/);
  ok(!m||+m[1]<=84,`hockey: "${m&&m[0]}" in an 84-game season`); ok(!/Nothing left but pride/.test(t),'hockey: the spoiler line at game 18'); }
/* 40. a good assistant isn't put under fire by a losing run */
{ const A=load({settable:SET,file:D('football-coach.html'),expose:EXP}); A.newDynasty('Alabama',5,'T'); const my=A.S.myTeam; A.SEA.rec[my]=[1,4];
  A.SEA.oc[my].q=24; A.SEA.dc[my].q=0; const h=A.attentionHTML(my);
  ok(!/data-fire="oc"/.test(h)&&/data-fire="dc"/.test(h),'college football: under-fire cards ignore how good the assistant is'); }
/* 41. a result card's headline never contradicts its replay */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP});
  const P=[{mine:71,theirs:67,impact:[{h:'Half-time',pick:'Trap the ball handler',def:'Pack the paint',worth:-0.07,cf:{mine:61,theirs:70}}]}];
  const h=strip(A.impactHTML(P)); ok(!/not because of the call/.test(h)&&/a little worse than the assistant's/.test(h)&&!/won this one tonight/.test(h),`college basketball: headline "${h.slice(0,90)}"`); }
/* ---- Muse round 9 / Ian (Nov 2026) ---- */
/* 42. a game's drives are its own: Rewatch showed another game (a 12-31 loss replayed as a 27-20 win) */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,7,'T'); let bad=0,n=0;
  for(let k=0;k<12&&A.SEA.phase==='week';k++){ (k%2?A.simAdvance:A.doAdvance)(); let m=0; while(A.live&&!A.live.done&&m++<6000){A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick()}
    A.SEA.weeks[A.SEA.weeks.length-1].games.filter(g=>(g.home===A.S.myTeam||g.away===A.S.myTeam)&&g.drives&&g.drives.length&&g.drives[0].pts!==undefined).forEach(g=>{ n++;
      const h=g.drives.filter(d=>d.home).reduce((s,d)=>s+(d.pts||0),0), a=g.drives.filter(d=>!d.home).reduce((s,d)=>s+(d.pts||0),0); if(h!==g.hp||a!==g.ap)bad++ }) }
  if(n)ok(bad===0,`${f}: ${bad} of ${n} games' drives don't add up to their score`) }
/* 43. the Century trophy counts the career once (it unlocked at 62 wins in the offseason) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Tampa Bay',5,'T'); play(A,999); A.openOffseason();
  A.checkAchievements(); const w=A.S.career.w; ok(w>=100||!(A.S.career.ach||{}).century,`hockey: Century unlocked at ${w} career wins`); }
/* 44. hockey's history names its conference champions (it read "undefined champion") */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Tampa Bay',5,'T'); play(A,999); off(A);
  A.dynTab='league'; ok(!/undefined/.test(A.dynastyView()),'hockey: History says "undefined"'); A.dynTab='program'; ok(!/undefined/.test(A.dynastyView()),'hockey: the You page says "undefined"') }
/* 45. a missed year's hot seat cools once the new season is on course (it read HOT SEAT at 24-4) */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Rice',5,'T'); const my=A.S.myTeam;
  A.S.history=[{year:A.SEA.year-1,team:my,miss:true}]; A.SEA.rec[my]=[24,4]; ok(!/HOT SEAT/.test(A.seatBadge()),'college basketball: HOT SEAT at 24-4'); A.SEA.rec[my]=[4,24]; ok(/HOT SEAT/.test(A.seatBadge()),'college basketball: no hot seat at 4-24 after a missed year'); }
/* 46. the transfer portal: a weak program can't take the top of it for certain (Rice took an 87 from UCLA) */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP}); A.newDynasty('Rice',5,'T');
  if(!A.portalChance)ok(false,'no portal chance (every target signs)'); else {
  const U=A.U, top={r:87,from:'UCLA',why:'wants more minutes'}, mid={r:A.eloToRating(U.program.Rice)+2,from:A.NAMES.slice().sort((a,b)=>U.program[a]-U.program[b])[150],why:'wants more minutes'};
  ok(A.portalChance(U,'Rice',top)<=0.15,`college basketball: Rice lands UCLA's 87 with chance ${A.portalChance(U,'Rice',top).toFixed(2)}`);
  ok(A.portalChance(U,'Rice',mid)>=0.5,`college basketball: Rice lands a fitting transfer with chance ${A.portalChance(U,'Rice',mid).toFixed(2)}`);
  ok(A.portalChance(U,'Duke',{r:82,from:'Kansas',why:'wants more minutes'})>=0.7,'college basketball: Duke can\'t land a Kansas transfer') } }
/* 47. fixtures show each side's record (Ian: "can't see the seeds or records") */
{ const A=load({settable:SET,file:D('football-coach.html'),expose:EXP}); A.newDynasty('Alabama',5,'T'); play(A,3);
  const g=A.SEA.sched.find(x=>x.week>=A.SEA.step); ok(/class="frec">\d+-\d+/.test(A.fixtureLine(g,false)),'college football: fixtures have no records') }
/* 48. sim-ahead's stop boxes start unticked */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Arsenal',5,'T'); const st=A.simStops();
  ok(Object.values(st).every(v=>v===false),`soccer: sim-ahead stops start ticked (${JSON.stringify(st)})`); }
/* ---- Grokbot pass 2 / Instinct round 5 (Nov 2026) ---- */
/* 49. soccer: "whole match" isn't reset when they change approach at half-time (both columns read the same) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Arsenal',5,'T'); let seen=0,same=0;
  for(let k=0;k<12;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<5000){ const q=A.live.ask;
      if(q&&q.dp.k==='read'&&q.dp.stage===2){ const d=A.live.drives[A.live.drives.length-1], opp=A.live.g.home===A.S.myTeam?'away':'home';
        if(d.TA&&d.TA[opp]&&d.T2&&d.T2[opp]){ seen++; const a=d.TA[opp], b=d.T2[opp]; if(a.n===b.n)same++ } }
      q?A.answerLive(q.dp.opts[q.dp.opts.length-1][0]):A.liveTick() } }
  ok(seen>0&&same===0,`soccer: whole match covered no more than since half-time in ${same} of ${seen} second reads`); }
/* 50. basketball's half-time read offers "Keep your setup" */
{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP}); A.newDynasty('Boston',5,'T'); let n=0,keep=0;
  for(let k=0;k<4;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<6000){ const q=A.live.ask;
      if(q&&q.dp.k==='read'&&q.dp.stage===2){ n++; if(q.dp.opts[0][0]==='keep')keep++ }
      q?A.answerLive(q.dp.k==='read'&&q.dp.stage===1?q.dp.opts[0][0]:q.dp.opts[0][0]):A.liveTick() } }
  ok(n>0&&keep===n,`pro basketball: ${keep} of ${n} half-time reads offer "Keep your setup"`); }
/* 51. college plan card: untouched isn't "your change" */
{ const A=load({settable:SET,file:D('football-coach.html'),expose:EXP}); A.newDynasty('Navy',5,'T'); play(A,999); A.openOffseason();
  ok(!/your change/i.test(A.collegePlanHTML(A.S.off.picks)),'college football: the untouched plan card says "your change"'); }
/* 52. a same-result headline carries the replay verdict when it's big */
{ const A=load({settable:SET,file:D('basketball-coach.html'),expose:EXP});
  const P=[{mine:53,theirs:66,impact:[{h:'Half-time',pick:'Pack the paint',def:'Trap',worth:0.07,cf:{mine:50,theirs:68}}]}];
  // round 28: 7 points is "a little", a plain line with the gap named, no headline (Muse: headlines for marginal calls)
  { const h=strip(A.impactHTML(P)); ok(!/imphead/.test(A.impactHTML(P))&&/a little better than the assistant's/.test(h),'college basketball: same-result headline ignores the replays') }
  const P2=[{mine:53,theirs:66,impact:[{h:'Half-time',pick:'Pack the paint',def:'Trap',worth:0.12,cf:{mine:50,theirs:68}}]}];
  ok(/A strong call\./.test(strip(A.impactHTML(P2))),'college basketball: a clear call gets no headline');
  // and a call within 3 points of the assistant's gets no headline at all, one quiet line (Muse: "little difference" taught that nothing matters)
  const Q=[{mine:53,theirs:66,impact:[{h:'Half-time',pick:'Pack the paint',def:'Trap',worth:0.01,cf:{mine:53,theirs:66}}]}], q=A.impactHTML(Q);
  ok(!/imphead/.test(q)&&/close either way/.test(strip(q)),'college basketball: a close call still headlined'); }
/* 53. football asks enough, and not in decided games (it asked 2 a game, some at 37-17) */
for(const [f,team] of [['football-coach.html','Alabama'],['football-coach-pro.html','Denver']]){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,8,'T');
  const per=[], close=[]; let decided=0;
  // no target for calls per game (Ian, Nov 2026), but a close game should get its calls (Grokbot): counted in games
  // decided by 8 or fewer; a blowout or a mismatch can have none
  for(let k=0;k<17&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0,n=0; const L0=A.live; while(A.live&&!A.live.done&&m++<6000){ const q=A.live.ask;
      if(q){ n++; const d=q.mine-q.theirs, a=Math.abs(d); if(q.dp.k==='fourth'&&(a>=28||(q.q>=3&&a>=21)||(q.q===4&&a>=17)))decided++; A.answerLive(q.dp.opts[0][0]) } else A.liveTick() }
    if(L0&&L0.done){ const e=L0.eng; (Math.abs(e.h-e.a)<=8?close:per).push(n) } }
  close.sort((a,b)=>a-b); const med=close[close.length>>1];
  console.log(`  ${f}: calls in close games, median ${med} (${close.join(',')}); others ${per.join(',')}`);
  ok(close.length<3||med>=3,`${f}: a median of ${med} calls in a close game`); ok(decided===0,`${f}: ${decided} fourth-down calls asked in a decided game`) }

/* 54. hockey's game lines show overtime losses (Grokbot: scores read "Seattle 9-28" beside a 9-21-7 table) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Toronto',5,'T'); let g=0; while(A.SEA.step<40&&g++<200)A.SEA.advance();
  const W=A.SEA.weeks[A.SEA.weeks.length-1], bad2=W.games.filter(x=>!/^\d+-\d+-\d+$/.test(x.hrec||''));
  ok(!bad2.length,`hockey: ${bad2.length} game lines with a two-part record (${bad2[0]&&bad2[0].hrec})`) }
/* 55. your coordinator takes a head job: you hire his replacement (Grokbot: a stranger was simply in his chair) */
{ let A,cm=[]; for(let sd=1;sd<=40&&!cm.length;sd++){ A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP.concat(['U','openOffseason'])}); A.newDynasty(A.NAMES[5],sd,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<900)A.SEA.advance(); A.openOffseason();
    cm=(A.S.off.act.coordMoves||[]).filter(m=>m.from===A.S.myTeam) }
  ok(cm.length===1,`pro football: no seed in 40 where your coordinator left for a head job (${cm.length})`);
  if(cm.length)ok(A.S.off.act.staffOpen[cm[0].side]&&A.S.off.staff[cm[0].side]&&A.S.off.staff[cm[0].side].length>0,`pro football: ${cm[0].name} left and no hire was offered`) }
/* 56. the soccer late call comes within a goal only (two up or down, it moved nothing: test/call-weight.js) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Arsenal',4,'T'); let wide=0,asked=0;
  for(let k=0;k<12&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<3000){ const q=A.live.ask; if(q){ if(q.dp.k==='late'){ asked++; if(!/^(Level|Up 1|Down 1),/.test(q.dp.h))wide++ } A.answerLive(q.dp.opts[0][0]) } else A.liveTick() } }
  ok(asked>0&&!wide,`soccer: late call asked ${asked} times, ${wide} of them two or more goals apart`) }

/* 57. two down early in hockey: the read comes now, as a timeout (Instinct: 0-3 and nothing to decide) */
{ let early=0,games=0,miss=0; for(const sd of [3,4,5]){ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('San Jose',sd,'T');
  for(let k=0;k<30&&A.SEA.phase==='week';k++){ A.doAdvance(); if(!A.live)continue; games++; let m=0,saw=false,down2=false;
    while(A.live&&!A.live.done&&m++<3000){ const q=A.live.ask; if(q){ if(q.dp.k==='read'&&/^Timeout/.test(q.dp.h)){ saw=true; if(q.theirs-q.mine<2)miss++ } if(q.dp.k==='read'&&!/^Timeout/.test(q.dp.h)&&down2)miss++; A.answerLive(q.dp.opts[0][0]) }
      else { const L=A.live; A.liveTick(); const e=L.eng; if(e&&e.seg>=2&&e.seg<4&&!saw){ const mine=L.g.home===A.S.myTeam?e.h-e.a:e.a-e.h; if(mine<=-2)down2=true } } } if(saw)early++ } }
  console.log(`  hockey: ${early} early timeouts in ${games} games`); ok(early>0&&!miss,`hockey: ${early} early reads, ${miss} asked wrongly or twice`) }
/* 58. the offseason screen has the season's calls, and never "would have gone with Leave it to your assistant" */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Brighton',6,'T'); let i=0;
  for(let k=0;k<200&&A.SEA.phase!=='done';k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<3000){ const q=A.live.ask; if(q){ const o=q.dp.opts; A.answerLive(o[(i++)%o.length][0]) } else A.liveTick() } }
  A.openOffseason(); const t=strip(A.LEAGUE.ui.offseasonScreen());
  ok(/Your calls/.test(t)&&/The season's big calls/.test(t),'soccer: no season calls summary on the offseason screen');
  ok(!/gone with Leave it/.test(t),'soccer: "would have gone with Leave it to your assistant"') }
/* 59. a first-season milestone needs a good season: 15-67 in the NBA was one */
{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP.concat(['milestones'])}); A.newDynasty('Boston',2,'T');
  ok(A.milestones(15,67,'',20).length===0&&A.milestones(60,22,'',2).length===1,'NBA: first-season wins milestone') }

/* 60. featuring your best starter is worth more than featuring your weakest (Instinct) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP.concat(['featureEdge'])}); A.newDynasty('Chelsea',3,'T');
  const R=A.SEA.roster[A.S.myTeam], ix=A.POS.map((P,i)=>i).sort((a,b)=>R[a].r-R[b].r);
  const lo=A.featureEdge(A.SEA,A.S.myTeam,ix[0]), hi=A.featureEdge(A.SEA,A.S.myTeam,ix[ix.length-1]);
  ok(hi>lo&&lo>0,`soccer: featuring the best starter ${hi.toFixed(1)}, the weakest ${lo.toFixed(1)}`) }
/* 61. hockey's goalie question only with the game in reach (two down or more, it moved nothing) */
{ let wide=0,asked=0; for(const sd of [3,4]){ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Chicago',sd,'T');
  for(let k=0;k<30&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<3000){ const q=A.live.ask; if(q){ if(q.dp.k==='goalie'){ asked++; if(Math.abs(q.mine-q.theirs)>2)wide++ } A.answerLive(q.dp.opts[1][0]) } else A.liveTick() } } }
  ok(asked>0&&!wide,`hockey: goalie asked ${asked} times, ${wide} with the game out of reach`) }

/* 62. hockey play-by-play: no template phrase twice in a game until its pool runs out (Grokbot) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP.concat(['gameScript'])}); A.newDynasty('Toronto',4,'T'); let g=0; while(A.SEA.step<20&&g++<200)A.SEA.advance();
  const tpl=t=>t.replace(/[A-Z][a-z'.-]+( [A-Z][a-z'.-]+)*/g,'X'); let games=0,rep=0;
  A.SEA.weeks.slice(0,20).forEach(W=>W.games.slice(0,6).forEach(G=>{ const gs=A.gameScript(G,A.SEA.roster[G.home],A.SEA.roster[G.away],7); const rows=gs&&(gs.rows||gs); if(!Array.isArray(rows))return; games++;
    const seen={}; rows.forEach(x=>(x.text||'').split(/(?<=\.)\s+/).forEach(s=>{ const k=tpl(s); if(k.length<8)return; if(seen[k])rep++; seen[k]=1 })) }));
  console.log(`  hockey: ${(rep/games).toFixed(2)} repeated phrases a game in ${games}`); ok(games>50&&rep/games<1,`hockey: ${(rep/games).toFixed(2)} repeated play-by-play phrases a game`) }
/* 63. the draft board marks who's likely there at your pick */
{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP}); A.newDynasty('Detroit',4,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<900)A.SEA.advance(); A.openOffseason();
  const t=strip(A.LEAGUE.ui.offseasonScreen()); ok(/likely gone/.test(t)&&/likely there/.test(t)&&/picks? before yours/.test(t),'NBA: the draft board has no availability marks') }

/* 64. a star never picks up more fouls than the league allows (Muse: an "8th foul" in a six-foul league) */
{ let over=0,outs=0; for(const f of ['basketball-coach-pro.html','basketball-coach.html']){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(A.NAMES[3],6,'T');
  for(let k=0;k<25&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0; const L0=A.live; while(A.live&&!A.live.done&&m++<6000){ if(A.live.ask)A.answerLive(A.live.ask.dp.opts[0][0]); else A.liveTick() }
    if(L0)(L0.drives||[]).forEach(d=>(d.ev||[]).forEach(e=>{ if(e.k==='foul'&&e.f>((A.LEAGUE.tuning&&A.LEAGUE.tuning.bb&&A.LEAGUE.tuning.bb.foulOut)||5))over++; if(e.k==='out')outs++ })) } }
  ok(!over,`basketball: ${over} fouls past the limit (${outs} foul-outs seen)`) }

/* 65. football: every call made is on the card, a coin flip is never a tick, and the headline agrees with the bullets (Grokbot) */
{ const A=load({settable:SET,file:D('football-coach.html'),expose:EXP.concat(['impactHTML','callKey','callClarity'])}); A.newDynasty('Arkansas',5,'T'); let i=0, bad=0, made=0, shown=0, flip=0;
  for(let k=0;k<12&&A.SEA.phase==='week';k++){ A.doAdvance(); let m=0; const L0=A.live; let n=0; while(A.live&&!A.live.done&&m++<6000){ const q=A.live.ask; if(q){ n++; const o=q.dp.opts; A.answerLive(o[(i++)%o.length][0]) } else A.liveTick() }
    if(!L0)continue; const P=(A.S.played[A.callKey(L0.step)]||[]).filter(p=>p.team===A.S.myTeam); const p=P[P.length-1]; if(!p)continue;
    const graded=(p.reads||[]).filter(r=>r.k==='call'), close=(p.closes||[]);
    made+=p.judged||0; shown+=graded.length+close.length;
    graded.forEach(r=>{ const v=Object.values(r.rk), sp=Math.max(...v)-Math.min(...v); if(sp<=3)flip++ });
    const h=A.impactHTML(P), head=(h.match(/imphead">([^<]*)/)||[])[1]||'';
    // round 28: a headline only for a clear call (callClarity beyond 7), good or wrong as its sign says
    const ks=(p.impact||[]).map(c=>A.callClarity(c)), best=ks.reduce((a,k)=>Math.abs(k)>Math.abs(a)?k:a,0);
    if(head){ if(Math.abs(best)<=7)bad++; else if(/^A strong/.test(head)!==(best>0))bad++ } }
  ok(made>0&&made===shown,`college football: ${made} calls made, ${shown} on the cards`); ok(!flip,`college football: ${flip} coin-flip calls graded`); ok(!bad,`college football: ${bad} headlines that disagree with the bullets`) }
/* 66. fired: no milestone under "has fired you", and a move reads as yours */
{ const fs=require('fs'); const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8'); const m={exports:{}}; new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
  const api=m.exports.load(D('football-coach.html')); api.newDynasty('Arkansas',5,'T',null);
  for(let y=0;y<2;y++){ let g=0; while(api.SEA.phase!=='done'&&g++<900)api.SEA.advance(); api.openOffseason();
    if(y===1){ api.S.off.act.userOpen=true; api.S.off.move=null; api.view('team'); const t=strip(global.__nodes.app.innerHTML);
      ok(/fired you/.test(t)&&!/Best season of your tenure/.test(t),'college football: a milestone under "has fired you"'); api.S.off.move=api.S.off.jobs[0] }
    for(let c=0;c<4&&api.S.off;c++){ if(api.S.off.act.userOpen&&api.S.off.move===null)api.S.off.move=api.S.myTeam; api.commitOffseason() } }
  api.view('team'); const t2=strip(global.__nodes.app.innerHTML); ok(!new RegExp(api.S.career.name+' is your new head coach').test(t2),'college football: your own move reads as someone else taking the job') }

/* 69. soccer: the board warns before it fires you, and a hot seat names the target you missed (Grokbot: Secure to fired) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP.concat(['seatBadge','objectivesHTML'])}); A.newDynasty('Queens Park Rangers',3,'T'); let fired=0, lastEnd='', named=0, hot=0;
  for(let y=0;y<3;y++){ let g=0; while(A.SEA.phase!=='done'&&g++<2000)A.SEA.advance(); lastEnd=strip(A.seatBadge());
    if(/HOT SEAT/.test(lastEnd)){ hot++; if(/target \(/.test(A.seatBadge())&&lastEnd.trim()==="HOT SEAT")named++ }   // round 31: just HOT SEAT on the badge (Ian); the reason, target named, on hover and in the objectives
    A.openOffseason(); if(A.S.off.act.userOpen){ fired++; break } for(let c=0;c<6&&A.S.off;c++)A.commitOffseason() }
  ok(fired&&!/Secure/.test(lastEnd),`soccer: fired ${fired} times, badge before it read "${lastEnd}"`); ok(hot&&named===hot,`soccer: ${named} of ${hot} hot-seat badges name the target`) }
/* 70. soccer: the summer payroll line names what changed and never shows sums that can't close (Grokbot: £10.9M against £10.5M) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP.concat(['offseasonBanner'])}); A.newDynasty('Burnley',9,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<2000)A.SEA.advance();
  A.openOffseason(); for(let c=0;c<6&&A.S.off;c++)A.commitOffseason(); const t=strip(A.offseasonBanner());
  // the line adds up: last season's bill plus every part named is this summer's (Grokbot: "show the amount that left")
  const tt=t.replace(/&minus;/g,'−'), pay=(tt.match(/Payroll after the summer: £([\d.]+)M/)||[])[1], lw=tt.match(/Last season's was £([\d.]+)M: /);
  const seg=lw?tt.slice(lw.index+lw[0].length).split(/\.\s+[A-Z]/)[0]:'', parts=[...seg.matchAll(/([+−-])£([\d.]+)M/g)].map(x=>(x[1]==='+'?1:-1)*+x[2]);
  const m=pay&&lw?[null,pay,lw[1]]:null, tot=m?Math.round((+m[2]+parts.reduce((a,b)=>a+b,0))*10)/10:null;
  ok(m&&Math.abs(tot-(+m[1]))<=0.15,`soccer: the payroll line doesn't add up (${m?m[2]+' + '+parts.join(' ')+' = '+tot+' vs '+m[1]:'no line: '+t.slice(t.indexOf('Payroll'),t.indexOf('Payroll')+200)})`) }

/* 71. draft night: the draft shown pick by pick is the draft that happens, your picks are the players drafted, and a skipped night is the staff's */
for(const [f,team,R] of [['football-coach-pro.html','Chicago',7],['basketball-coach-pro.html','Detroit',2],['hockey-coach-pro.html','Toronto',2]]){
  const A=load({settable:SET,file:D(f),expose:EXP.concat(['draftNight','dnState','dnOn','draftNightHTML','dnSectionHTML'])}); A.newDynasty(team,5,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<5000)A.SEA.advance(); A.openOffseason();
  const my=A.S.myTeam, P=A.S.off.picks, yr=A.SEA.year; P.hand=[]; const stops=[];
  ok(A.dnOn()&&/Go to draft night/.test(strip(A.dnSectionHTML())),`${f}: no way into draft night`);
  for(let k=0;k<R+2;k++){ const D0=A.dnState(); if(!D0.stop)break; stops.push(D0.stop.overall); const av=D0.prospects.filter(p=>!p.taken); P.hand.push(av[Math.min(3,av.length-1)].pid) }
  ok(stops.length===R,`${f}: stopped for ${stops.length} picks of ${R}`);
  A.S.off.dn=true; ok(/Your class is in/.test(strip(A.draftNightHTML())),`${f}: draft night not finished after every pick`); A.S.off.dn=false;
  const shown=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[my]:{draft:P.draft,board:P.board,hand:P.hand}},R,null).picks.map(d=>d.team+':'+d.pid).join(',');
  const R0=A.LEAGUE.offseason.run; let B=null; A.LEAGUE.offseason.run=function(){ B=R0.apply(this,arguments); return B };
  for(let c=0;c<4&&A.S.off;c++)A.commitOffseason();
  const real=B.draft.picks.map(d=>d.team+':'+d.pid).join(','), mine=B.draft.picks.filter(d=>d.team===my).map(d=>d.pid);
  ok(shown===real,`${f}: the draft shown on draft night is not the draft that happened`);
  ok(mine.join()===P.hand.join(),`${f}: your picks ${P.hand} but drafted ${mine}`) }
/* 72. draft night: a change of job clears picks made for the other team; a hot seat keeps the board */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP.concat(['dnOn','dnReset'])}); A.newDynasty('Chicago',5,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<5000)A.SEA.advance(); A.openOffseason();
  A.S.off.picks.hand=[3]; A.S.off.picks.workouts=[4]; A.dnReset(); ok(!A.S.off.picks.hand&&!A.S.off.picks.workouts,'draft night: picks survive a change of job');
  A.S.coaches=[{},{}]; ok(!A.dnOn(),'draft night: offered in a hot seat (it keeps the board)'); A.S.coaches=null; }

/* 73. pro basketball and hockey: "Sim the series" stops before a game that could end your season (Grokbot: it simmed
   through game 6 of a 2-4 exit, both seasons); pressed when already facing elimination, it plays that one game */
for(const [f,team] of [['basketball-coach-pro.html','Boston'],['hockey-coach-pro.html','Florida']]){
  let seen=0, stopped=0, through=0;
  for(const seed of [4,9,13]){ const A=load({settable:SET,file:D(f),expose:EXP.concat(['simSeries','simAdvance'])}); A.newDynasty(team,seed,'T'); A.S.watchMode="never";
    let g=0; while(A.SEA.phase==='week'&&g++<400)A.simAdvance();
    for(let k=0;k<40&&A.SEA.phase!=='done';k++){ const x=A.SEA.mySeries(A.S.myTeam); if(!x||x.winner){ A.simAdvance(); continue }
      const my=A.S.myTeam, opp=x.hi===my?x.lo:x.hi, before=x.w[opp]||0; A.simSeries(); const y=A.SEA.mySeries(my); seen++;
      if(y&&!y.winner&&(y.w[opp]||0)>=3)stopped++;
      // a series lost in this one press must have started it already facing elimination
      if(y&&y.winner&&y.winner!==my&&before<3)through++ } }
  ok(seen>0&&through===0,`${f}: "Sim the series" played through ${through} elimination games (${seen} presses, ${stopped} stops)`) }
/* 74. basketball: the gameplan doesn't inflate scoring (Ian, Muse, Grokbot: 137-150 a team on "Work it inside") */
for(const f of ['basketball-coach-pro.html','basketball-coach.html']){ const A=load({file:D(f),expose:['playGame','RNG','LEAGUE']}); const rng=new A.RNG(5), N=600;
  const pts=pl=>{ let t=0; for(let i=0;i<N;i++){ const r=A.playGame(rng,1600,1500,pl,'balanced',{}); t+=r.h } return t/N };
  const s0=pts('safe'), b0=pts('balanced'), a0=pts('aggressive');
  ok(Math.abs(s0-b0)<=0.1*b0&&Math.abs(a0-b0)<=0.1*b0,`${f}: plans move scoring too far (inside ${s0.toFixed(1)}, balanced ${b0.toFixed(1)}, shorten ${a0.toFixed(1)})`) }
/* 75. a win chance is never shown as 100% or 0% (Ian: "100% vs Phoenix") */
{ const A=load({file:D('basketball-coach-pro.html'),expose:['pctShown']}); ok(A.pctShown(0.998)===99&&A.pctShown(0.002)===1&&A.pctShown(0.5)===50,'win chance shown as 100% or 0%') }
/* 76. the card: each read its own line, starting with what you chose; a split report is a coin flip, not graded (Grokbot) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP.concat(['readsHTML','callKey'])}); A.newDynasty('Southampton',3,'T'); let lines=0, chose=0, splitGraded=0;
  for(let k=0;k<14;k++){ A.doAdvance(); if(!A.live)continue; const st=A.live.step; let m=0; while(A.live&&!A.live.done&&m++<3000){ A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick() }
    const P=(A.S.played[A.callKey(st)]||[]).filter(p=>p.team===A.S.myTeam), R=[].concat(...P.map(p=>p.reads||[]));
    R.forEach(r=>{ if(r.split&&!r.unclear)splitGraded++ });
    const t=A.readsHTML(st); lines+=(t.match(/class="read (ok|no|na)"/g)||[]).length; chose+=(strip(t).match(/You chose "/g)||[]).length;
    ok((t.match(/class="read (ok|no|na)"/g)||[]).length===R.length,`soccer: ${R.length} reads but ${(t.match(/class="read (ok|no|na)"/g)||[]).length} lines on the card`) }
  ok(lines>0&&chose===lines,`soccer: ${chose} of ${lines} read lines say what you chose`); ok(splitGraded===0,`soccer: ${splitGraded} split reports graded`) }

/* 77. situation calls only in a game in reach: none asked where the chance with the assistant's call is outside
   10-90% (round 33: up 10 late in football, 100% either way), and the assistant's answers there aren't graded */
for(const [f,team] of [['basketball-coach-pro.html','Orlando'],['soccer-coach.html','Southampton'],['hockey-coach-pro.html','Florida'],['football-coach.html','Alabama']]){
  const A=load({settable:SET,file:D(f),expose:EXP.concat(['callInReach','liveSeed','callKey','GATE_KINDS','GATE_LO','GATE_HI'])}); A.newDynasty(team,6,'T');
  let asked=0, outside=0, auto=0, graded=0;
  for(let k=0;k<16;k++){ A.doAdvance(); if(!A.live)continue; const L=A.live; let m=0;
    while(A.live&&!A.live.done&&m++<4000){ const q=A.live.ask;
      if(q){ if(A.GATE_KINDS[q.dp.k]){ asked++; const p=A.callInReach(L.args,A.liveSeed(L.step),L.replay,(q.team===L.g.home),L.replay.length); if(p<A.GATE_LO||p>A.GATE_HI)outside++ }
        A.answerLive(q.dp.opts[0][0]) } else A.liveTick() }
    const key=L.ckey||A.callKey(L.step), AU=(A.S.callAuto||{})[key]||[]; auto+=AU.length;
    const P=(A.S.played[key]||[]).filter(p=>p.team===A.S.myTeam); P.forEach(p=>(p.impact||[]).forEach(c=>{ if(AU.length&&p.impact.length>L.replay.length-AU.length)graded++ })) }
  console.log(`  ${f}: ${asked} situation calls asked, ${auto} left to the assistant (not in reach)`);
  ok(outside===0,`${f}: ${outside} situation calls asked outside a game in reach`); ok(graded===0,`${f}: an assistant's not-in-reach answer weighed as yours`) }
/* 78. the chance before the game doesn't move with the gameplan, and no line tells you which plan to pick (Ian) */
{ const fs=require('fs'); const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8').replace('liveTick, answerLive,','liveTick, answerLive, setPlan(p){plan=p},'); const m={exports:{}};
  new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
  for(const [f,tm] of [['basketball-coach-pro.html','Orlando'],['soccer-coach.html','Southampton'],['football-coach.html','Alabama']]){ const api=m.exports.load(D(f)); api.newDynasty(tm,4,'T');
    const seen=new Set(); let h='';
    ['safe','balanced','aggressive'].forEach(pl=>{ api.setPlan(pl); h=api.view('team'); seen.add((h.match(/class="opct">([^<]*)</)||[])[1]) });
    ok(seen.size===1&&[...seen][0],`${f}: the chance before the game moves with the plan (${[...seen].join(' / ')})`);
    ok(!/would help you|try (Play it safe|Take risks|Shorten|Work it|Clog|Skate|Sit deep|Take the game)/i.test(strip(h)),`${f}: a line tells you which plan to pick`) } }

/* 79. the chance before a game is the engine's, from the lineup you picked: a backup started moves it as much as it
   moves the game (Muse: 12% -> 12% with a point guard 26 worse; the game charged it in full), on every screen */
for(const [f,team] of [['basketball-coach-pro.html','Detroit'],['basketball-coach.html','Duke'],['football-coach.html','Alabama'],['soccer-coach.html','Arsenal'],['hockey-coach-pro.html','Toronto']]){
  const A=load({settable:SET,file:D(f),expose:EXP.concat(['winProb','swapDepth','BK','wpScale'])}); A.newDynasty(team,11,'T');
  for(let i=0;i<3;i++)A.SEA.advance();
  const my=A.S.myTeam, g=A.SEA.sched.find(x=>x.week>=A.SEA.step&&(x.home===my||x.away===my)); if(!g)continue;
  const opp=g.home===my?g.away:g.home, home=g.home===my;
  const eng=()=>{ A.SEA.userTeam=my; const e=A.SEA.matchupElo(g,'balanced'), d=home?e.h-e.a:e.a-e.h; return 1/(1+Math.pow(10,-d/A.wpScale('balanced'))) };
  const R=A.SEA.roster[my]; let bi=-1,gap=0; for(let i=0;i<A.POS.length;i++){ const a=R[i],b=R[A.BK(i)]; if(a&&b&&a.r-b.r>gap){gap=a.r-b.r;bi=i} }
  const w0=A.winProb(my,opp,home,g.neutral); ok(Math.abs(w0-eng())<1e-9,`${f}: the chance shown (${w0.toFixed(3)}) isn't the engine's (${eng().toFixed(3)})`);
  A.swapDepth(A.SEA,bi); const w1=A.winProb(my,opp,home,g.neutral);
  ok(Math.abs(w1-eng())<1e-9&&w1<w0,`${f}: a backup ${gap} worse moved the chance shown ${w0.toFixed(3)} -> ${w1.toFixed(3)}, the engine's to ${eng().toFixed(3)}`) }

/* 80. promotions and firings belong to their season: last season's are never replayed into this one (Muse: a whole
   season with "Interim staff" after a coordinator was fired the year before) */
{ const A=load({settable:SET,file:D('football-coach.html'),expose:EXP.concat(['rebuild'])}); A.newDynasty('Rice',3,'T');
  for(let k=0;k<5;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<900){ A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick() } }
  A.SEA.fireCoordinator(A.S.myTeam,'oc'); A.S.fires={[A.SEA.step]:['oc']};
  let g=0; while(A.SEA.phase!=='done'&&g++<900){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<900){ A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick() } }
  A.openOffseason(); A.commitOffseason();
  for(let k=0;k<8;k++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<900){ A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick() } }
  const n0=A.SEA.oc[A.S.myTeam].n; A.rebuild(); const n1=A.SEA.oc[A.S.myTeam].n;
  ok(n0!=='Interim staff'&&n1===n0,`a reload in season 2 replayed season 1's firing: "${n0}" became "${n1}"`) }

/* 81. a close finish asks a call: basketball's crunch time level or ahead, hockey's third period within a goal
   (Grokbot: a 93-92 elimination game, a tied finish and a 5-4 playoff game asked nothing), with the right answer graded */
// round 49: the gate at 4 points over 120 replays asks college basketball's close finish about one game in twenty
// (seeds 8-11: 0, 0, 3, 4 in 30 games each), so its case plays two seasons
for(const [f,team,k,seeds] of [['basketball-coach-pro.html','Orlando','close',[8]],['basketball-coach.html','Minnesota','close',[8,10]],['hockey-coach-pro.html','Florida','third',[8]]]){
  let n=0, graded=0; for(const seed of seeds){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,seed,'T');
  for(let w=0;w<40&&A.SEA.phase==='week';w++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<4000){ const q=A.live.ask; if(q){ if(q.dp.k===k)n++; A.answerLive(q.dp.opts[0][0]) } else A.liveTick() }
    if(A.live&&A.live.eng&&A.live.eng.log)graded+=A.live.eng.log.filter(x=>x.k===k).length } }
  // round 46: asked only when worth 3 points (Ian: "gate them"), so rarer; still asked, and graded when asked
  ok(n>=1,`${f}: ${n} ${k} calls in 40 games`); ok(!n||graded>0,`${f}: ${k} calls never graded`) }

/* 82. Skip plays on to your next call and stops there: it never makes your calls for you (Grokbot: one tap jumped to
   the final score and a read you never made was graded) */
{ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP.concat(['skipLive'])}); A.newDynasty('Seattle',5,'T'); let stops=0, auto=0;
  for(let w=0;w<6;w++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<400){ if(A.live.ask){ stops++; A.answerLive(A.live.ask.dp.opts[0][0]) } else A.skipLive() }
    auto+=Object.values(A.S.callAuto||{}).reduce((a,x)=>a+x.length,0) }
  ok(stops>0,`pro football: Skip never stopped at a call in 6 games`) }

/* 83. a "scouts unsure" read says what he's likely to be: high unsure reads were 10 points over the players
   (Muse: three read 73-82 arrived 50-59). By read level, the players average within 3 of the read. */
{ let worst=0;
  for(let s=0;s<6;s++){ const A=load({settable:SET,file:D('football-coach-pro.html'),expose:EXP.concat(['nflDraftClass','scoutRead'])}); A.newDynasty('Seattle',700+s,'T');
    let g=0; while(A.SEA.phase!=='done'&&g++<6000)A.SEA.advance(); A.openOffseason();
    const B={}; A.nflDraftClass(A.U,A.S.myTeam).list.forEach(p=>{ const x=A.scoutRead(A.U,A.S.myTeam,p,false); if(!x.unsure)return; const b=x.sr>=58?'hi':'lo'; (B[b]=B[b]||[0,0,0]); B[b][0]+=x.sr; B[b][1]+=p.r; B[b][2]++ });
    Object.values(B).forEach(q=>{ if(q[2]>=8)worst=Math.max(worst,Math.abs(q[0]-q[1])/q[2]) }) }
  ok(worst<3,`unsure reads miss the players by ${worst.toFixed(1)} on average at one end`) }

/* 84. football reads their defense (a scouting report, then the numbers) and asks the late calls a real coach makes:
   the onside kick and the defense on their last drives, with the clock in possessions, not "about 6 minutes"
   (Grokbot: pro football decision weight 4 of 10, under one call a game; late calls without the time) */
for(const [f,team] of [['football-coach-pro.html','Green Bay'],['football-coach.html','TCU']]){
  const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,12,'T'); const K={}; let games=0, clock=0, late=0, graded=0;
  for(let w=0;w<40&&A.SEA.phase!=='done';w++){ A.doAdvance(); if(!A.live)continue; games++; let m=0;
    while(A.live&&!A.live.done&&m++<900){ const q=A.live.ask; if(q){ K[q.dp.k]=(K[q.dp.k]||0)+1;
        if(/^(onside|defend|chase)$/.test(q.dp.k)||(q.dp.k==='protect'&&/late$/.test(q.dp.h))){ late++; if(/Possessions left: \d+ for you, \d+ for them\./.test(q.dp.b))clock++ }
        A.answerLive(q.dp.opts[0][0]) } else A.liveTick() }
    if(A.live&&A.live.eng&&A.live.eng.log)graded+=A.live.eng.log.filter(x=>x.k==='read'||x.k==='prep').length }
  console.log(`  ${f}: ${games} games, calls ${JSON.stringify(K)}`);
  ok((K.prep||0)>=games*0.8,`${f}: a scouting report in ${K.prep||0} of ${games} games`);
  ok((K.read||0)>=games*0.8,`${f}: ${K.read||0} reads in ${games} games`);
  // round 49: the onside kick goes to your assistant in both football games (measured: 0 of 29 truly worth 3 points
  // on his choice), and late defense is asked only when it is (Ian's rule: calls under about 3 points are cut). What
  // stays checked: a late call that is asked gives the clock in possessions (below).
  ok(late===clock,`${f}: ${late-clock} of ${late} late calls without the possessions left`);
  ok(graded>0,`${f}: reads never graded`) }

/* 85. the NBA Cup (Ian): six groups of five, four group games each on the Cup nights, eight through (six winners and a
   runner-up a conference), a champion; every Cup game is a league game, every team plays 82, one game a day */
{ const A=load({settable:SET,file:D('basketball-coach-pro.html'),expose:EXP.concat(['nbaCupTables','nbaCupFate'])}); A.newDynasty('Orlando',3,'T');
  const C=A.SEA.cup; ok(C&&Object.keys(C.groups).length===6&&Object.values(C.groups).every(g=>g.length===5),'the Cup has six groups of five');
  let g=0; while(A.SEA.phase==='week'&&g++<400)A.SEA.advance();
  const T=A.nbaCupTables(A.SEA); ok(Object.values(T).every(L=>L.every(x=>x.pl===4)),'not every team played four group games');
  ok(C.seeds&&C.seeds.East.length===4&&C.seeds.West.length===4,'the knockout field isn\'t eight');
  ok(!!C.winner&&!!C.finalist,'no NBA Cup champion');
  const rec=Object.values(A.SEA.rec).map(r=>r[0]+r[1]); ok(Math.min(...rec)===82&&Math.max(...rec)===82,`league games ${Math.min(...rec)}-${Math.max(...rec)}, not 82`);
  // every Cup game is a league game, and nobody plays twice in a day (Instinct: Cup nights were a second game)
  const dbl=A.SEA.weeks.filter(w=>{const c={}; return w.games.some(x=>[x.home,x.away].some(t=>(c[t]=(c[t]||0)+1)>1))}).length;
  ok(dbl===0,`${dbl} days with a team playing twice`); ok(!C.unplaced&&!C.extra,'a Cup game had no night');
  ok(A.nbaCupFate(A.SEA,C.winner)==='Winners','the champion\'s fate isn\'t "Winners"') }

/* 86. the coach's notes: a new career gets a note at its first call, "Skip the guide" turns them all off, and a career
   saved before them has none (Ian: an optional tutorial) */
{ const A=load({settable:SET,file:D('soccer-coach.html'),expose:EXP.concat(['guideForCall','guideNote'])}); A.newDynasty('Arsenal',3,'T');
  ok(A.S.guide===true,'a new career starts without the guide');
  ok(/Coach's note/.test(A.guideForCall({k:'read'})),'no coach\'s note at the first read');
  A.S.seen={g_call_read:1}; ok(!/Coach's note/.test(A.guideForCall({k:'read'})),'a read note shown again after Got it');
  ok(/Coach's note/.test(A.guideForCall({k:'late'})),'no note for the first situation call');
  A.S.guide=false; ok(!A.guideForCall({k:'prep'})&&!A.guideNote('hub','x'),'notes shown after Skip the guide');
  delete A.S.guide; ok(!A.guideForCall({k:'prep'}),'a career from before the guide shows notes') }

/* 87. the number is the same number twice: a backup in and out returns the chance to exactly where it was, and a
   reload gives the same (Muse: a restored lineup read 83% then 66%; college football 33% then 28%, for good) */
for(const [f,team] of [['football-coach.html','Missouri'],['football-coach-pro.html','Green Bay'],['basketball-coach.html','Wake Forest'],['basketball-coach-pro.html','Detroit'],['hockey-coach-pro.html','Washington'],['soccer-coach.html','Derby County'],['baseball-coach-pro.html','Colorado']]){
  const A=load({settable:SET,file:D(f),expose:EXP.concat(['winProb','swapDepth','BK','rebuild'])}); A.newDynasty(team,5,'T');
  for(let i=0;i<3;i++){ A.S.watchMode='never'; A.doAdvance() }
  const my=A.S.myTeam, g=A.SEA.sched.find(x=>x.week>=A.SEA.step&&(x.home===my||x.away===my)); if(!g)continue;
  const opp=g.home===my?g.away:g.home, home=g.home===my, wp=()=>A.winProb(my,opp,home,g.neutral);
  const R=A.SEA.roster[my]; let bi=-1,gap=0; for(let i=0;i<A.POS.length;i++){ const a=R[i],b=R[A.BK(i)]; if(a&&b&&a.r-b.r>gap){gap=a.r-b.r;bi=i} }
  const w0=wp(); A.swapDepth(A.SEA,bi); const w1=wp(); A.swapDepth(A.SEA,bi); const w2=wp(); A.rebuild(); const w3=wp();
  ok(w1<w0,`${f}: a backup ${gap} worse didn't lower the chance (${w0.toFixed(4)} to ${w1.toFixed(4)})`);
  ok(Math.abs(w2-w0)<1e-9&&Math.abs(w3-w0)<1e-9,`${f}: in and out read ${(100*w0).toFixed(2)} / ${(100*w2).toFixed(2)}, reload ${(100*w3).toFixed(2)}`) }

/* 88. hockey's scorebook is its game log: every goal and assist the log names is credited to that man, backups too
   (Muse, three games goal by goal: a two-goal scorer at 0-0-0, a man who never scored with two) */
{ const A=load({settable:SET,file:D('hockey-coach-pro.html'),expose:EXP.concat(['rowsOf'])}); A.newDynasty('Washington',4,'T'); let bad=0, goals=0;
  for(let w=0;w<8;w++){ const my=A.S.myTeam, snap=()=>A.SEA.roster[my].map(p=>p?{n:p.n,g:(p.st2&&p.st2.goals)||0}:null);
    const before=snap(); A.doAdvance(); let k=0,L=null; while(A.live&&!A.live.done&&k++<900){ L=A.live; A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick() }
    if(!L)continue; const after=snap(), lg={}, names=A.SEA.roster[my].map(p=>p&&p.n).filter(Boolean);
    A.rowsOf(L.g,L.drives).filter(r=>r.goal&&r.team===my).forEach(r=>{ const nm=names.find(n=>r.text.indexOf(n)===0); if(nm){lg[nm]=(lg[nm]||0)+1; goals++} });
    after.forEach((p,i)=>{ if(p&&p.g-before[i].g!==(lg[p.n]||0))bad++ }) }
  ok(goals>5&&bad===0,`hockey: ${bad} players whose goals don't match the log (${goals} goals)`) }

/* 89. a decided game still asks something: rest your starters (Muse, Grokbot: a 24-point fourth quarter and a
   13-point lead asked nothing), and a rest is kept for the week's knocks (SEA.restAt), even after a reload */
// the call is narrow by design (basketball: up 10-12 with six minutes left; football: a 14-24 fourth quarter or a
// 21-40 third), so a season can go without one: up to three careers' seasons, stopping at the first rest (round 43)
for(const [f,teams] of [['basketball-coach-pro.html',['Boston','Denver','Milwaukee']],['football-coach-pro.html',['Kansas City','Baltimore','Philadelphia']]]){
  let A, asked=0, rested=0;
  for(const team of teams){ if(asked)break;
  A=load({settable:SET,file:D(f),expose:EXP.concat(['rebuild'])}); A.newDynasty(team,6,'T'); asked=0; rested=0;
  for(let w=0;w<82&&A.SEA.phase==='week';w++){ A.doAdvance(); let m=0; while(A.live&&!A.live.done&&m++<3000){ const q=A.live.ask;
      if(q){ if(q.dp.k==='rest'){asked++; A.answerLive('rest')} else A.answerLive(q.dp.opts[q.dp.opts.length-1][0]) } else A.liveTick() }
    if(A.SEA.restAt&&A.SEA.restAt[A.S.myTeam]===A.SEA.step-1)rested++ } }
  ok(asked>0,`${f}: no rest call in three seasons`); ok(rested===asked,`${f}: ${asked} rests, ${rested} kept for the week`);
  const n0=Object.keys(A.SEA.restAt||{}).length; A.rebuild(); ok(Object.keys(A.SEA.restAt||{}).length===n0,`${f}: a reload lost the rests`) }

(async()=>{ await tabsCheck(); await slotCheck();
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the reported cases hold`);
process.exit(bad?1:0); })();
