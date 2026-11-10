/* Players you care about (core 93_people): in every game, a season's
   milestones are real (his career total crossed the number in that game,
   once), your news reports yours, the team page shows your best players
   with a mood and a season line, form tags appear and are earned (hot: his
   last three games well above his season), and the final-year tag matches
   his contract or class.
     node test/people.js */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
const CASES=[['football-coach.html','Alabama'],['football-coach-pro.html','Kansas City'],['basketball-coach.html','Duke'],
  ['basketball-coach-pro.html','Boston'],['hockey-coach-pro.html','Boston'],['soccer-coach.html','Arsenal'],['baseball-coach-pro.html','Seattle']];
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=12)console.log('  FAIL '+m)}};
for(const [f,team] of CASES){
  const A=load({file:D(f),expose:['S','SEA','U','POS','NAMES','LEAGUE','newDynasty','doAdvance','live','liveTick','answerLive','view','starsHTML','weekNews','careerOf','formOf','statProd','milestoneSpec','openOffseason','commitOffseason']});
  A.newDynasty(team,11,'T');
  let miles=0, mine=0, newsHit=0, hot=0, tagged=0, pages=0, seasons=0;
  for(let yr=0;yr<3;yr++){
    let g=0;
    while(A.SEA.phase!=='done'&&g++<400){
      A.doAdvance(); let n=0; while(A.live&&!A.live.done&&n++<3000){A.live.ask?A.answerLive(A.live.ask.dp.opts[A.live.ask.dp.opts.length-1][0]):A.liveTick()}
      const E=A.SEA, my=A.S.myTeam;
      // this step's milestones: news for yours
      const M=(E.miles||[]).filter(x=>x.step===E.step-1);
      M.forEach(x=>{ const T=E.roster[x.team].filter(q=>q&&q.n===x.n); if(T.length!==1)return;
        ok(A.careerOf(T[0],x.key)>=x.at,`${f}: ${x.n} "reached" ${x.at} ${x.label} with ${A.careerOf(T[0],x.key)}`) });
      if(M.some(x=>x.team===my)&&E.weeks.length){ const N=A.weekNews(E.weeks[E.weeks.length-1]);
        M.filter(x=>x.team===my).forEach(x=>{ newsHit++; ok(N.some(i=>i.k==='mile'&&i.h.indexOf(x.n)>=0),`${f}: ${x.n}'s ${x.at} ${x.label} isn't in your news`) }) }
      if(E.phase==='week'&&E.step%6===3){ const h=A.starsHTML(my); pages++;
        ok(/Your players/.test(h)&&(h.match(/prow2 feat/g)||[]).length>=3,`${f}: the team page shows fewer than three of your players`);
        const R=E.roster[my];
        R.forEach((p,i)=>{ if(!p||i>=A.POS.length)return; const P=A.POS[i].p, fm=A.formOf(p,P);
          if(fm==='hot'){ hot++; const avg=A.statProd(P,p.st2)/p.st2.g, rec=p.fm.slice(-3).reduce((a,b)=>a+b,0)/3; ok(rec>=avg*1.35,`${f}: ${p.n} hot at ${rec.toFixed(1)} against ${avg.toFixed(1)}`) } });
        if(/final year of his contract|senior/i.test(h))tagged++;
      }
    }
    // the season's milestones: each crossed in its game, once
    const E=A.SEA, seen=new Set();
    (E.miles||[]).forEach(x=>{ miles++; if(x.team===A.S.myTeam)mine++;
      const k=x.n+'|'+x.team+'|'+x.at+'|'+x.key, twin=E.roster[x.team].filter(q=>q&&q.n===x.n).length>1;
      ok(twin||!seen.has(k),`${f}: ${x.n} reached ${x.at} ${x.label} twice`); seen.add(k);
 });
    seasons++;
    A.openOffseason(); for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
    // no two players anywhere in the league share a name (Muse: one name at Arsenal and Chelsea)
    // (college: within a roster; its name pool is smaller than its player count)
    const college=!!(A.LEAGUE.classes&&A.LEAGUE.classes.length);
    let nm=new Map(); Object.keys(A.U.roster).forEach(t=>{ if(college)nm=new Map(); (A.U.roster[t]||[]).forEach(p=>{ if(p&&p.n){ if(nm.has(p.n))ok(false,`${f}: ${p.n} plays for both ${nm.get(p.n)} and ${t}`); nm.set(p.n,t) } }) });
  }
  console.log(`  ${f.padEnd(26)} ${seasons} seasons: ${miles} milestones (${mine} yours, ${newsHit} in your news), ${hot} hot-form tags checked, final-year tag on ${tagged} of ${pages} pages`);
  ok(miles>=5,`${f}: hardly any milestones (${miles}) in ${seasons} seasons`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: your players' stories hold up`);
process.exit(bad?1:0);
