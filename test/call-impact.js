/* What your calls did (core callImpact): in every game, a live game replayed
   with your answers reproduces the real result exactly (so "the same game with
   the same luck" means it); every call you made against the assistant's choice
   gets a same-luck result and a worth; the season ledger is their sum; the
   post-game line reads cleanly; and it is quick enough to run at the final
   whistle. Also reports whether the worth predicts the same-luck results.
     node test/call-impact.js      last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=15)console.log('  FAIL '+m)}};
const GAMES=[['football-coach.html','Alabama'],['football-coach-pro.html','Denver'],['basketball-coach.html','Duke'],
  ['basketball-coach-pro.html','Orlando'],['hockey-coach-pro.html','Vegas'],['soccer-coach.html','Arsenal']];
for(const [f,team] of GAMES){
  const A=load({file:D(f),expose:['S','SEA','LEAGUE','newDynasty','doAdvance','live','liveTick','answerLive','callImpact','impactHTML','ledgerLine','makeLiveGame','RNG','liveSeed','callKey','impactDefault','callClarity']});
  A.newDynasty(team,8,'T'); A.S.watchMode='all';
  const heads={}; let games=0, calls=0, ms=0, msMax=0, agree=0, sumWorth=0, sumDiff=0, reproduced=0;
  for(let k=0;k<14&&A.SEA.phase==='week';k++){
    A.doAdvance(); let n=0, L=null;
    while(A.live&&!A.live.done&&n++<4000){ L=A.live;
      // a coach who makes calls: the first option, never "leave it to the assistant"
      if(A.live.ask){ const o=A.live.ask.dp.opts; A.answerLive(o[0][0]) } else A.liveTick() }
    if(!L||!L.args)continue; games++;
    const meHome=L.g.home===A.S.myTeam, seed=A.liveSeed(L.step);
    // the replay with your answers is the game you played
    { const e=A.makeLiveGame(new A.RNG(seed),...L.args); let i=0,g=0,r;
      while(g++<4000){ r=e.next(); if(r.done)break; if(r.ask){ e.reply(L.replay[i]!==undefined?L.replay[i]:A.impactDefault(r.ask)); i++ } }
      const real=[L.eng.h,L.eng.a]; ok(r.h===real[0]&&r.a===real[1],`${f}: the replay ends ${r.h}-${r.a}, the game ended ${real[0]}-${real[1]}`);
      if(r.h===real[0]&&r.a===real[1])reproduced++ }
    const t0=Date.now(); A.callImpact(L.args,seed,L.replay,meHome); const dt=Date.now()-t0; ms+=dt; msMax=Math.max(msMax,dt);
    const P=(A.S.played[A.callKey(L.step)]||[]).filter(p=>p.team===A.S.myTeam).slice(-1)[0];
    const I=(P&&P.impact)||[];
    I.forEach(c=>{ calls++; sumWorth+=c.worth;
      ok(c.cf&&Number.isFinite(c.cf.mine)&&Number.isFinite(c.worth)&&c.worth>=-1&&c.worth<=1,`${f}: a call's impact is malformed ${JSON.stringify(c)}`);
      const s=x=>x.mine>x.theirs?1:x.mine===x.theirs?0.5:0; const d=s({mine:P.mine,theirs:P.theirs})-s(c.cf); sumDiff+=d;
      if((d>0&&c.worth>0)||(d<0&&c.worth<0))agree++ });
    // round 39: a read is judged in the reads only; the top line covers the situation calls (one verdict per call)
    const RK={}; (P&&P.reads||[]).forEach(r=>{ RK[r.k]=1 }); const IS=I.filter(x=>!(x.k&&RK[x.k]));
    if(IS.length){ const h=A.impactHTML([P]); ok(/class="impact( quiet)?"/.test(h)&&!/undefined|null|NaN/.test(h),`${f}: the post-game line reads "${h.replace(/<[^>]+>/g,' ').slice(0,140)}"`);
      const head=(h.match(/class="imphead">([^<]*)</)||[])[1]||'?'; heads[head]=(heads[head]||0)+1;
      // the headline credits or blames the call only when the average agrees
      const c=IS.reduce((a,x)=>Math.abs(x.worth)>Math.abs(a.worth)?x:a,IS[0]);
      // the decision leads (Muse): "good"/"strong" only for a call that wins more often, "wrong"/"not quite" only for one that loses more
      // a call graded against every option (football) is judged as its bullets are: q points behind the best, sp the spread
      // round 28: the clearest call leads, and only beyond 7 points (callClarity) does it get a headline
      const ks=IS.map(x=>A.callClarity(x)), k=ks.reduce((a,x)=>Math.abs(x)>Math.abs(a)?x:a,0), crossed=(P.reads||[]).some(r=>r.right===false);
      if(/^A strong call/.test(head))ok(k>7,`${f}: "${head}" with the clearest call at ${k}`);
      if(/^The wrong call/.test(head))ok(k<-7,`${f}: "${head}" with the clearest call at ${k}`);
      if(head==='?')ok(Math.abs(k)<=7||(k>0&&crossed),`${f}: no headline with the clearest call at ${k}`) }
  }
  const Y=A.S.callLedger&&A.S.callLedger[A.SEA.year];
  ok(calls>0,`${f}: no call ever got an impact (${games} live games)`);
  if(Y)ok(Math.abs(Y.worth-sumWorth)<0.01&&Y.n===calls,`${f}: the ledger (${Y.n}, ${Y.worth}) isn't the sum of the calls (${calls}, ${sumWorth.toFixed(3)})`);
  ok(!/undefined|NaN/.test(A.ledgerLine()),`${f}: ledger line "${A.ledgerLine()}"`);
  ok(msMax<4000,`${f}: the replays took ${msMax} ms after one game`);
  console.log(`  ${f.padEnd(26)} ${games} games replayed exactly ${reproduced}, ${calls} calls; replays ${Math.round(ms/Math.max(1,games))} ms a game (max ${msMax}); same-luck result moved ${sumDiff.toFixed(1)} games vs worth ${sumWorth.toFixed(1)} | "${A.ledgerLine()}"`);
  console.log('     headlines: '+Object.entries(heads).map(([k,v])=>k+' '+v).join(' | '));
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: your calls' impact is replayed and adds up`);
process.exit(bad?1:0);
