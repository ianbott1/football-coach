/* The win chance on a call screen (round 72, Ian: yes to Muse): every call screen in a game in progress shows it, as
   one number (soccer's three), the same reading as the screen before the call; soccer's three add to 100.
     node test/callwp.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path');
const dir=process.env.DIST||path.join(__dirname,'..','dist'); let bad=0;
const GAMES=[['soccer-coach.html','Arsenal'],['hockey-coach-pro.html','Winnipeg'],['basketball-coach-pro.html','Orlando'],['basketball-coach.html','Duke'],['football-coach-pro.html','San Francisco'],['football-coach.html','Auburn'],['baseball-coach-pro.html','Houston']];
(async()=>{ const b=await chromium.launch();
 for(const [f,t] of GAMES){ const p=await (await b.newContext({viewport:{width:1265,height:900}})).newPage(); await p.goto('file://'+path.join(dir,f)); await p.waitForTimeout(300);
  await p.evaluate(t=>{ newDynasty(t,7,'T'); S.title=false; S.guide=false; S.watchSpeed='rapid'; S.highlights='off'; render() },t);
  for(let k=0;k<6;k++){ if(await p.evaluate(()=>!!live))break; await p.evaluate(()=>doAdvance()); await p.waitForTimeout(300) }
  let calls=0, shown=0, same=0, sum100=0, sums=0, prev=null; const ex=[];
  for(let i=0;i<5000;i++){ await p.waitForTimeout(25);
    const s=await p.evaluate(()=>{ if(!live||live.done)return {done:1}; const w=document.querySelector('.livewp .lwpct'); return {ask:!!live.ask, txt:w?w.innerText:'', n:live.drives.length} });
    if(s.done)break;
    if(!s.ask){ if(s.txt)prev=s; continue }
    if(s.n>0){ calls++; if(s.txt){ shown++; if(prev&&prev.txt===s.txt)same++; else if(ex.length<2)ex.push(`before "${prev&&prev.txt}" call "${s.txt}"`) }
      const m=s.txt.match(/W (\d+)%.*D (\d+)%.*L (\d+)%/); if(m){ sums++; if(+m[1]+ +m[2]+ +m[3]===100)sum100++ } }
    await p.evaluate(()=>answerLive(live.ask.dp.opts[0][0])); await p.waitForTimeout(60) }
  const ok=calls>0&&shown===calls&&sum100===sums; if(!ok)bad++;
  console.log(`${ok?'  ok  ':'  FAIL'} ${f}: ${calls} calls in play; win chance on ${shown}; same as the screen before ${same}${sums?`; W/D/L adding to 100 ${sum100} of ${sums}`:''}${ex.length?' | '+ex.join(' | '):''}`); await p.close() }
 await b.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH every call screen shows the chance as it stands'); process.exit(bad?1:0) })();
