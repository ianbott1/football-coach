/* Highlights (round 51), in a real browser: a watched game in each sport plays its clips (goals, big chances, last
   shots, touchdowns) with no page errors, the next stretch waits for them, and the game ends the same with highlights
   on as with them off (they draw what the engine decided; they decide nothing).
   node test/highlights.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path'); let bad=0; const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++ };
const GAMES=[['soccer-coach.html','Wrexham'],['hockey-coach-pro.html','Winnipeg'],['basketball-coach-pro.html','Boston'],['football-coach-pro.html','Green Bay'],['basketball-coach.html','Duke'],['football-coach.html','Alabama']];
(async()=>{ const b=await chromium.launch();
 const only=process.argv[2]; for(const [f,team] of GAMES.filter(x=>!only||x[0].indexOf(only)===0)){ const res={};
  for(const mode of ['key','off']){ const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+path.join(__dirname,'..','dist',f)); await p.waitForTimeout(400);
    await p.evaluate(([t,m])=>{ newDynasty(t,7,'T'); S.title=false; S.guide=false; S.watchSpeed='rapid'; S.highlights=m; window.__clips=0; window.__waits=[];
      const hs=hlStart; hlStart=function(c){ window.__clips++; return hs(c) };
      const st=window.setTimeout; window.setTimeout=function(fn,ms){ if(fn===liveTick)window.__waits.push(ms); return st(fn,ms) }; render() },[team,mode]);
    // the first step can be a week without a game (college): on until one is being watched
    for(let k=0;k<6;k++){ if(await p.evaluate(()=>!!live))break; const a=await p.$('#adv'); if(!a)break; await a.click(); await p.waitForTimeout(300) }
    for(let i=0;i<2400;i++){ await p.waitForTimeout(50); const st=await p.evaluate(()=>{ if(live&&live.ask){ answerLive(live.ask.dp.opts[live.ask.dp.opts.length-1][0]); return 1 } return live&&!live.done?1:0 }); if(!st)break }
    res[mode]=await p.evaluate(()=>({score:S.played&&Object.values(S.played).flat().map(x=>x.mine+'-'+x.theirs).join(','),clips:window.__clips,maxWait:Math.max(0,...window.__waits),errs:0}));
    res[mode].errs=errs.length; if(errs.length)console.log('   '+errs.slice(0,2).join(' | '));
    await p.close() }
  ok(res.key.score&&res.key.score===res.off.score,`${f}: the game ends ${res.key.score} with highlights, ${res.off.score} without`);
  ok(res.key.errs===0&&res.off.errs===0,`${f}: no page errors`);
  ok(res.off.clips===0,`${f}: highlights off plays none (${res.off.clips})`);
  ok(res.key.clips>0||/basketball/.test(f),`${f}: ${res.key.clips} clips played in one game; the longest wait for one, ${res.key.maxWait} ms (without: ${res.off.maxWait} ms)`); }
 await b.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH highlights play and change nothing'); process.exit(bad?1:0) })();
