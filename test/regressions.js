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
  'rosterView','weekNews','teamPanel','attentionHTML','advLabel','ordinal','coachCard','careerNow','hkEventText','bbEventText','scEventText','nflPickSlot','BUILD_ID'];

/* 1. soccer: a draw is never a win, a loss, or "null" (rivalries, headlines) */
{ const A=load({file:D('soccer-coach.html'),expose:EXP}); A.newDynasty('Dover Athletic',11,'T');
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
{ const A=load({file:D('hockey-coach-pro.html'),expose:EXP}); A.newDynasty('Carolina',3,'T'); let n=0;
  for(let k=0;k<120&&A.SEA.phase==='week';k++){
    const my=A.S.myTeam, nx=A.SEA.sched.filter(g=>g.week>=A.SEA.step&&(g.home===my||g.away===my)).sort((a,b)=>a.week-b.week)[0];
    if(nx){ n++; const want='Play '+A.LEAGUE.dates[nx.week]; ok(A.advLabel()===want,`hockey step ${A.SEA.step}: button "${A.advLabel()}", next game ${A.LEAGUE.dates[nx.week]}`) }
    // half the time a long sim block, the rest one click (Muse saw it after a 20-game block)
    if(k%7===3){ for(let j=0;j<20&&A.SEA.phase==='week';j++){A.SEA.userTeam=my; A.SEA.advance(); A.S.steps++} } else play(A,1);
  }
  console.log(`  hockey: ${n} button dates checked`); }

/* 3. every game: featuring lasts a season, and the roster says so */
for(const [f,team] of GAMES){ const A=load({file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
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
{ const A=load({file:D('football-coach-pro.html'),expose:EXP});
  const want=n=>{const t=n%100; if(t>=11&&t<=13)return n+'th'; return n+({1:'st',2:'nd',3:'rd'}[n%10]||'th')};
  for(let n=1;n<=120;n++)ok(A.ordinal(n)===want(n),`ordinal(${n}) = ${A.ordinal(n)}`);
  A.newDynasty('Kansas City',2,'T'); play(A,999);
  for(const t of A.NAMES){ A.S.myTeam=t; const s=A.nflPickSlot(); ok(/^\d+(st|nd|rd|th)$/.test(s)&&s===want(parseInt(s)),`draft slot for ${t}: "${s}"`) } }

/* 5. a surname both sides share gets an initial in commentary */
for(const [f,team,fn,ev] of [['hockey-coach-pro.html','Vegas','hkEventText',{side:'home',k:'goal',u:37}],
                             ['basketball-coach.html','Duke','bbEventText',{side:'home',k:'inside',n:2,u:4}],
                             ['soccer-coach.html','Arsenal','scEventText',{side:'home',k:'save',u:9}]]){
  const A=load({file:D(f),expose:EXP}); A.newDynasty(team,5,'T');
  const g=A.SEA.sched.find(x=>x.home===A.S.myTeam)||A.SEA.sched[0], H=A.SEA.roster[g.home], W=A.SEA.roster[g.away];
  // every player on both sides takes one surname: whoever the line names, it's ambiguous
  H.concat(W).forEach(p=>{ if(p)p.n=p.n.split(' ')[0]+' Tremblay' });
  let lines=0, bare=0;
  for(let u=0;u<60;u++){ const r=A[fn](g,Object.assign({},ev,{u:u}),{}); if(!r||!r.text)continue; lines++;
    if(/(^|[^.] )Tremblay\b/.test(r.text.replace(/\b[A-Z][a-z'A-Z]+ Tremblay\b/g,'')))bare++ }
  ok(lines>0&&bare===0,`${f}: ${bare} of ${lines} commentary lines use a bare shared surname`); }

/* 6. the "Needs a decision" card is in the wide (desktop) layout too */
for(const [f,team] of GAMES){ const A=load({file:D(f),expose:EXP}); A.newDynasty(team,6,'T');
  const my=A.S.myTeam; if(!A.SEA.dc||!A.SEA.dc[my])continue; A.SEA.dc[my].q=-40;
  ok(/data-fire=/.test(A.attentionHTML(my)),`${f}: no staff decision with a -40 assistant`);
  ok(/data-fire=/.test(A.teamPanel()),`${f}: the wide layout's team panel has no "Make a change"`); }

/* 7. the salary cap binds (Nov 2026): hard caps are never exceeded after an
   offseason, and a typical payroll sits near the cap, not a quarter of it */
for(const [f,cap,hard] of [['football-coach-pro.html',110,true],['hockey-coach-pro.html',104,true],['basketball-coach-pro.html',165,false]]){
  const A=load({file:D(f),expose:EXP}); A.newDynasty(A.NAMES[2],9,'T'); const meds=[];
  for(let y=0;y<3;y++){ const E=A.SEA; let g=0; while(E.phase!=='done'&&g++<900)E.advance(); off(A);
    const pay=A.NAMES.map(t=>A.U.roster[t].reduce((s,x)=>s+(x&&x.k?x.k.sal:0),0)).sort((a,b)=>a-b);
    meds.push(pay[pay.length>>1]/cap);
    if(hard)ok(pay[pay.length-1]<=cap+0.05,`${f}: a payroll of ${pay[pay.length-1].toFixed(1)} over the ${cap} hard cap`);
    else ok(pay[pay.length-1]<=200.05,`${f}: a payroll of ${pay[pay.length-1].toFixed(1)} past the tax line`) }
  const m=meds.reduce((a,b)=>a+b)/meds.length; ok(m>=0.6&&m<=0.95,`${f}: typical payroll ${Math.round(100*m)}% of the cap (want ~70-85%)`);
  console.log(`  ${f}: typical payroll ${Math.round(100*m)}% of the cap`); }

/* 8. a build stamp on every game */
for(const [f] of GAMES){ const A=load({file:D(f),expose:EXP}); ok(/^[0-9a-f]{7}$/.test(A.BUILD_ID||''),`${f}: no build stamp`) }

console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the reported cases hold`);
process.exit(bad?1:0);
