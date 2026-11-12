/* Reloading in a real browser gives back the season you played (round 59). The node reload test passed while a
   browser rebuilt baseball's schedule differently on each load (a random comparator inside sort(): Muse's 53-40 came
   back 41-51, then 52-41). Each game is played in Chromium through the page's own functions: days advanced, some
   watched with calls answered, sims ahead, the gameplan and the featured player changed as the buttons change them;
   saved; the page reloaded and the slot opened from the title screen; every game of the season compared.
     node test/reload-browser.js [game ...]      last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path');
const GAMES={'football-coach.html':14,'football-coach-pro.html':16,'basketball-coach.html':40,'basketball-coach-pro.html':60,
  'hockey-coach-pro.html':60,'soccer-coach.html':30,'baseball-coach-pro.html':110};
const pick=process.argv.slice(2).map(f=>f.endsWith('.html')?f:f+'.html').filter(f=>GAMES[f]);
(async()=>{ const b=await chromium.launch(); let bad=0, n=0;
  for(const [f,days] of Object.entries(GAMES)){ if(pick.length&&pick.indexOf(f)<0)continue;
    const ctx=await b.newContext(), p=await ctx.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+path.join(__dirname,'..','dist',f)); await p.waitForTimeout(500);
    if(process.env.RB_TEAM){ await p.evaluate(([t,sd])=>{ newDynasty(t,+sd,'T'); save(); render() },[process.env.RB_TEAM,process.env.RB_SEED||1]) }   // a fixed career, to chase one down
    else await p.click('#qstart');
    await p.waitForTimeout(800);
    const snap=()=>p.evaluate(()=>({team:S.myTeam,seed:S.seasonSeed,rec:SEA.rec[S.myTeam],step:SEA.step,steps:S.steps,g:JSON.stringify(SEA.weeks.map(w=>(w.games||[]).map(g=>[g.home,g.away,g.hp,g.ap])))}));
    let k=0;
    while(k++<400){ const st=await p.evaluate(()=>SEA.phase==='week'?SEA.step:9999); if(st>=days)break;
      await p.evaluate(async(k)=>{ const r=(Math.imul(k,2654435761)>>>0)%100;
        if(r<12)plan=['aggressive','safe','balanced'][k%3];
        if(r>=12&&r<18&&typeof noteChoice==='function'){ const was=S.featured; S.featured=k%5; noteChoice("f",was,S.featured) }
        if(r>=18&&r<26&&typeof simTargets==='function'){ const T=simTargets(); if(T.length>1){ simRun(T[1].to); return } }
        S.watchMode=(r>=26&&r<50)?'always':'never'; doAdvance(); let m=0;
        while(live&&!live.done&&m++<4000){ if(live.ask)answerLive(live.ask.dp.opts[(m+k)%live.ask.dp.opts.length][0]); else liveTick() }
        await save(); render() },k) }
    // the last save lands before the reload (a sim ahead saves without waiting; reloading within a millisecond of it isn't a player)
    await p.evaluate(async()=>{ await save() }); await p.waitForTimeout(400);
    const a=await snap(); await p.reload(); await p.waitForTimeout(800);
    const slot=await p.$$('[data-slot],[data-load],.slotcard'); if(slot.length){ await slot[0].click(); await p.waitForTimeout(2000) }
    const c=await snap().catch(e=>({err:e.message})); n++;
    let first=-1; try{ const A=JSON.parse(a.g), C=JSON.parse(c.g); for(let i=0;i<Math.max(A.length,C.length);i++)if(JSON.stringify(A[i])!==JSON.stringify(C[i])){first=i;break} }catch(e){ first=-2 }
    const ok=first===-1&&a.steps===c.steps&&!errs.length;
    if(!ok)bad++;
    console.log(`${ok?'  ok  ':'  FAIL'} ${f} (${a.team}): ${a.steps} days played, ${JSON.stringify(a.rec)}; after a reload ${JSON.stringify(c.rec||c.err)}${first>=0?`, first different on day ${first+1}`:first===-2?' (no season after the reload)':''}${errs.length?'; page errors: '+errs.slice(0,2).join(' | '):''}`);
    await ctx.close() }
  await b.close(); console.log(bad?`MISMATCH ${bad} of ${n} games came back different`:`MATCH all ${n} games came back as played`); process.exit(bad?1:0) })();
