/* The fixed bar never hides a control (round 72, Instinct: at 1265x720 the bar covered the plan and highlights rows
   while the match ran). Laptop and phone sizes, five sports, a few stretches in, scrolled to the end.
     node test/bar-cover.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path'); let bad=0;
const dir=process.env.DIST||path.join(__dirname,'..','dist');
(async()=>{ const b=await chromium.launch();
 for(const [w,h] of [[1265,720],[390,844]]) for(const [f,t] of [['soccer-coach.html','Arsenal'],['hockey-coach-pro.html','Winnipeg'],['basketball-coach-pro.html','Orlando'],['football-coach-pro.html','San Francisco'],['baseball-coach-pro.html','Houston']]){
  const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage(); await p.goto('file://'+path.join(dir,f)); await p.waitForTimeout(300);
  await p.evaluate(t=>{ newDynasty(t,7,'T'); S.title=false; S.guide=false; S.watchSpeed='slow'; render() },t);
  for(let k=0;k<6;k++){ if(await p.evaluate(()=>!!live))break; await p.evaluate(()=>doAdvance()); await p.waitForTimeout(300) }
  // a few stretches in, paused, scrolled to the bottom
  for(let i=0;i<300;i++){ await p.waitForTimeout(30); const n=await p.evaluate(()=>{ if(live&&live.ask){ answerLive(live.ask.dp.opts[0][0]); return 0 } return live?live.drives.length:99 }); if(n>=3)break }
  await p.evaluate(()=>{ live.paused=true; if(live.timer)clearTimeout(live.timer); render(); window.scrollTo(0,document.body.scrollHeight) }); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const bar=[...document.querySelectorAll('*')].find(e=>{ const s=getComputedStyle(e); return s.position==='fixed'&&e.getBoundingClientRect().bottom>=innerHeight-2&&e.getBoundingClientRect().height>30&&e.getBoundingClientRect().height<innerHeight/2 });
    const B=bar?bar.getBoundingClientRect():null; const rows=[...document.querySelectorAll('.spbtn,.planbtn,[data-midplan],[data-hl],.wbtn')];
    const hid=rows.filter(e=>{ const R=e.getBoundingClientRect(); if(!R.height||bar&&bar.contains(e))return false; return B&&R.bottom>B.top+2&&R.top<B.bottom });
    return {bar:bar?bar.className+' h'+Math.round(B.height):'none', covered:hid.length, total:rows.length, ex:hid.slice(0,2).map(e=>e.innerText.trim().slice(0,20)) } });
  if(r.covered)bad++;
  console.log(`${r.covered?'  FAIL':'  ok  '} ${w}x${h} ${f}: fixed bottom bar ${r.bar}; controls under it after scrolling to the end: ${r.covered} of ${r.total} ${r.ex.join(', ')}`); await p.close() }
 await b.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH no control under the fixed bar'); process.exit(bad?1:0) })();
