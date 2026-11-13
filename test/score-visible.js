/* The score stays in sight (round 72, Instinct: "keep the score visible"): at a call, scrolled to the options, and
   after answering, the scoreboard or the strip that copies it is on screen; the strip's numbers are the scoreboard's.
     node test/score-visible.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path');
const dir=process.env.DIST||path.join(__dirname,'..','dist');
(async()=>{ const b=await chromium.launch(); let bad=0;
 for(const [w,h] of [[390,844],[1265,720]]) for(const [f,t] of [['soccer-coach.html','Arsenal'],['hockey-coach-pro.html','Winnipeg'],['basketball-coach-pro.html','Orlando'],['football-coach-pro.html','San Francisco']]){
  const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage(); await p.goto('file://'+path.join(dir,f)); await p.waitForTimeout(300);
  await p.evaluate(t=>{ newDynasty(t,7,'T'); S.title=false; S.guide=false; S.watchSpeed='rapid'; S.highlights='off'; render() },t);
  for(let k=0;k<6;k++){ if(await p.evaluate(()=>!!live))break; await p.evaluate(()=>doAdvance()); await p.waitForTimeout(300) }
  let calls=0, offAtCall=0, offAfter=0, disagree=0;
  for(let i=0;i<4000&&calls<6;i++){ await p.waitForTimeout(30);
    const st=await p.evaluate(()=>{ if(!live||live.done)return 'done'; return live.ask?'ask':'run' }); if(st==='done')break;
    if(st==='ask'){ calls++; await p.waitForTimeout(800);   // the player reads the call where it put him: at the options
      await p.evaluate(()=>{ document.documentElement.style.scrollBehavior='auto'; const o=document.querySelector('.callopts,.callbox'); if(o){ const R=o.getBoundingClientRect(); window.scrollTo(0,scrollY+R.top-80) } }); await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{ const sc=document.querySelector('.wscore'); const st=document.querySelector('.stick'), sb=st?Math.max(0,st.getBoundingClientRect().bottom):0; const R=sc?sc.getBoundingClientRect():null; const m=document.getElementById('minibar'); const mv=m&&m.classList.contains('on')&&getComputedStyle(m).display!=='none'; const nums=sc?[...sc.querySelectorAll('.wn')].map(x=>x.innerText.trim()).join('-'):''; const mn=m?(m.querySelector('.mn')||{}).innerText||'':''; return {v:(R?(R.bottom>sb&&R.top<innerHeight):false)||mv, agree:!mv||mn.replace(/\u2013/,'-')===nums} }); if(!r.v){ offAtCall++; if(offAtCall===1&&process.env.DBG)console.log('    dbg',JSON.stringify(await p.evaluate(()=>{ const m=document.getElementById('minibar'); return {sy:scrollY,ph:document.body.scrollHeight,cls:m&&m.className,disp:m&&getComputedStyle(m).display,wt:(document.querySelector('.wtop')||{getBoundingClientRect:()=>({})}).getBoundingClientRect().bottom} }))) } if(!r.agree)disagree++;
      await p.evaluate(()=>answerLive(live.ask.dp.opts[0][0])); await p.waitForTimeout(400);
      const r2=await p.evaluate(()=>{ const sc=document.querySelector('.wscore'); const st=document.querySelector('.stick'), sb=st?Math.max(0,st.getBoundingClientRect().bottom):0; const R=sc?sc.getBoundingClientRect():null; const m=document.getElementById('minibar'); const mv=m&&m.classList.contains('on')&&getComputedStyle(m).display!=='none'; const nums=sc?[...sc.querySelectorAll('.wn')].map(x=>x.innerText.trim()).join('-'):''; const mn=m?(m.querySelector('.mn')||{}).innerText||'':''; return {v:(R?(R.bottom>sb&&R.top<innerHeight):false)||mv, agree:!mv||mn.replace(/\u2013/,'-')===nums} }); if(!r2.v)offAfter++; if(!r2.agree)disagree++ } }
  if(offAtCall||offAfter||disagree)bad++;
  console.log(`${offAtCall||offAfter||disagree?'  FAIL':'  ok  '} ${w}x${h} ${f}: ${calls} calls; score out of sight while reading the options ${offAtCall}, after answering ${offAfter}; strip disagreeing with the scoreboard ${disagree}`); await p.close() }
 await b.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH the score is in view at every call and after it'); process.exit(bad?1:0) })();
