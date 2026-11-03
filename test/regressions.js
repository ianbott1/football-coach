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
  ['basketball-coach-pro.html','Orlando'],['hockey-coach-pro.html','Vegas'],['soccer-coach.html','Dover Athletic']];
const EXP=['S','SEA','U','POS','NAMES','LEAGUE','newDynasty','doAdvance','live','liveTick','answerLive','openOffseason','commitOffseason',
  'rosterView','weekNews','teamPanel','attentionHTML','advLabel','ordinal','coachCard','careerNow','hkEventText','bbEventText','scEventText','nflPickSlot','BUILD_ID',
  'winProb','ownEdge','rosterOf','promote','fireCoord','migrateSave','standingsView','dynastyView','teamCard','milestones','BK','stConf','dynTab','seasonRowsFor','allTime','FEATURE_EDGE','nflAsk','nflFreeAgentPreview','MAX_SAL','recStr'];
const SET=['stConf','dynTab'];

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
  const m=meds.reduce((a,b)=>a+b)/meds.length; ok(m>=0.6&&m<=0.95,`${f}: typical payroll ${Math.round(100*m)}% of the cap (want ~70-85%)`);
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
  const rv=A.rosterView(), outName=(rv.match(/<div class="pname[^"]*">([^<]+)[\s\S]{0,80}?outtag/)||[])[1]||'';
  ok(outName.trim()===st.n,`college basketball: after promoting ${bk.n}, the OUT tag is on "${outName.trim()}", not the injured ${st.n}`);
  ok(E.roster[my][i]===bk&&E.talent.active(my).some(e=>e.idx===A.BK(i)),'college basketball: the injury stayed on the starter slot');
  ok(E.talent.eff(my,E.step)>=before-0.01,`college basketball: promoting the healthy backup cost strength (${before.toFixed(0)} to ${E.talent.eff(my,E.step).toFixed(0)})`);
  // promoting him back puts the injury (and its cost) back where it was
  A.promote(i); ok(E.talent.active(my).some(e=>e.idx===i&&e.m===-60),'college basketball: promoting the injured starter back lost his injury');
  // an old save's promotion (a plain number) still replays the old way
  const saved=JSON.parse(JSON.stringify(A.S.promos)); ok(Object.values(saved).every(L=>L.every(x=>typeof x==='object')),'new promotions are not marked as moving injuries'); }
/* 10. featuring moves the shown win probability (it never did) */
for(const [f,team] of GAMES){ const A=load({settable:SET,file:D(f),expose:EXP}); A.newDynasty(team,8,'T'); if(A.FEATURE_EDGE===undefined)continue;
  const my=A.S.myTeam, opp=A.NAMES.find(t=>t!==my), p0=A.winProb(my,opp,true,false);
  A.S.featured=1; A.SEA.featured=1; const p1=A.winProb(my,opp,true,false);
  ok(p1>p0,`${f}: featuring left the win probability at ${(100*p0).toFixed(1)}%`); }
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
    if(y===0){ const pv=A.nflFreeAgentPreview(A.U,A.S.myTeam); A.S.off.picks.targets=pv.slice(0,3).map(x=>x.key); const card=strip(A.LEAGUE.ui.offseasonBanner?A.LEAGUE.ui.offseasonScreen():''); ok(card.indexOf(A.recStr(A.S.myTeam))>=0,`hockey: the offseason card's record isn't ${A.recStr(A.S.myTeam)} (overtime losses merged)`);
      ok(/fits|close: it depends|won't fit/.test(card)&&!/squeezing the draft class/.test(card),'hockey: a target "fits only by squeezing the draft class" (the class is paid before free agency)') }
    for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
    A.NAMES.forEach(t=>A.U.roster[t].forEach(p=>{ if(p&&p.k){ n++; if(p.k.sal>=A.MAX_SAL-0.05)maxed++ } })) }
  console.log(`  hockey: ${maxed} of ${n} contracts at the maximum`);
  ok(maxed/n<0.03,`hockey: ${maxed} of ${n} contracts at the maximum`); }
/* 20. the action bar is opaque behind its buttons (text showed through at 390px) */
for(const [f] of GAMES){ const h=require('fs').readFileSync(D(f),'utf8'); ok(/\.actionbar \.skip\{background:var\(--ink\)\}/.test(h)&&!/\.actionbar\{[^}]*rgba\(16,19,28,\.95\) 32%/.test(h),`${f}: the action bar's buttons are see-through`) }

console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the reported cases hold`);
process.exit(bad?1:0);
