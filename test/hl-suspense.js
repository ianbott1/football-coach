/* Highlights keep the suspense (round 66, Ian: the page said "goal" before the ball went in). A soccer match watched in
   Chromium at a fast speed with highlights on; while a goal clip plays and the ball hasn't arrived, the page must still
   show the score from before the move (live.hold), and once the clips are over it must show the new one.
     node test/hl-suspense.js      last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path');
(async()=>{ const b=await chromium.launch(), p=await b.newPage({viewport:{width:420,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'..','dist','soccer-coach.html')); await p.waitForTimeout(500);
  await p.evaluate(()=>{ newDynasty('Arsenal',3,'T'); S.watchMode='always'; S.watchSpeed='fast'; S.highlights='key'; S.guide=false; for(let i=0;i<8&&!live;i++)doAdvance(); render() });
  const read=()=>p.evaluate(()=>{ if(!live)return {nolive:1}; if(live.ask){ answerLive(live.ask.dp.opts[0][0]); return {ask:1} }
    const txt=(document.getElementById('app')||{}).innerText||'', g=live.g, m=txt.indexOf(g.home), h=txt.slice(m).match(/\n\s*(\d+)\s*\n[\s\S]*?\n\s*(\d+)\s*\n/);
    return {cur:HL.cur?HL.cur.kind:null,t:HL.cur?(Date.now()-HL.t0)/HL.cur.dur:null,shown:h?[+h[1],+h[2]]:null,hold:live.hold?[live.hold.h,live.hold.a]:null,eng:[live.eng.h,live.eng.a],done:!!live.done} });
  let goalSamples=0, leaks=0, released=0, stale=0, prev=null; const t0=Date.now();
  while(Date.now()-t0<170000){ const s=await read(); if(s.done||s.nolive)break;
    if(s.cur==='goal'&&s.t<0.8){ goalSamples++; if(!s.hold||(s.shown&&s.shown.join()===s.eng.join()))leaks++ }
    if(prev&&prev.cur==='goal'&&!s.cur&&!s.ask){ released++; if(s.hold||(s.shown&&s.shown.join()!==s.eng.join()))stale++ }
    prev=s; await p.waitForTimeout(110) }
  await b.close();
  let bad=0; const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++ };
  ok(goalSamples>=10,`goal clips watched (${goalSamples} moments before the ball arrived)`);
  ok(leaks===0,`the page kept the old score while the ball travelled (${leaks} of ${goalSamples} showed the goal early)`);
  ok(released>0&&stale===0,`the new score showed once the clip was over (${released} clips, ${stale} stale)`);
  ok(!errs.length,`no page errors${errs.length?': '+errs.slice(0,2).join(' | '):''}`);
  console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH the highlights keep the suspense'); process.exit(bad?1:0) })();
