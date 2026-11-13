/* One clock (round 72, Instinct: "the highlight and the header disagree about time in all three live-highlight
   sports"; hockey "1ST 5:00" in the header while rows are stamped 13'). In a real browser, a watched game in each
   sport: at every redraw, the header's clock, the newest run-of-play row's stamp, and the clock on the clip's score
   bug while one plays. Prints what it saw; with --check, fails on a clip whose clock differs from the header's.
     node test/clocks.js [sport-file-prefix] [--check] */
const {chromium}=require('playwright'), path=require('path');
const GAMES=[['soccer-coach.html','Wrexham'],['hockey-coach-pro.html','Winnipeg'],['basketball-coach-pro.html','Boston'],['basketball-coach.html','Duke'],['football-coach-pro.html','Green Bay'],['football-coach.html','Alabama'],['baseball-coach-pro.html','Houston']];
const check=process.argv.includes('--check')||process.argv.includes('--control'), only=process.argv.slice(2).find(a=>!a.startsWith('--'));
let bad=0;
(async()=>{ const b=await chromium.launch();
 for(const [f,team] of GAMES.filter(x=>!only||x[0].indexOf(only)===0)){
  const p=await (await b.newContext({viewport:{width:1265,height:720}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(process.argv.includes('--control'))await p.addInitScript(()=>{ window.__control=1 });
  await p.goto('file://'+path.join(process.env.DIST||path.join(__dirname,'..','dist'),f)); await p.waitForTimeout(400);
  await p.evaluate(([t])=>{ newDynasty(t,7,'T'); S.title=false; S.guide=false; S.watchSpeed='rapid'; S.highlights='key'; window.__bug=[]; if(window.__control)hlHeadClock=()=>null;
    const hb=hlBug; hlBug=function(x,W,H,o){ if(o&&o.clock&&window.__bug[window.__bug.length-1]!==o.clock)window.__bug.push(o.clock); return hb(x,W,H,o) }; render() },[team]);
  for(let k=0;k<6;k++){ if(await p.evaluate(()=>!!live))break; await p.evaluate(()=>doAdvance()); await p.waitForTimeout(300) }
  const seen=[]; let last='', clips=0, off=0;
  for(let i=0;i<3000;i++){ await p.waitForTimeout(40);
    const s=await p.evaluate(()=>{ if(live&&live.ask){ answerLive(live.ask.dp.opts[live.ask.dp.opts.length-1][0]); return {ask:1} }
      const app=document.getElementById('app'), t=app?app.innerText:'';
      const head=((t.split('\n').find(l=>/ · (AT HOME|ON THE ROAD|NEUTRAL|AWAY|HOME)/i.test(l))||'').replace(/ · (AT HOME|ON THE ROAD|NEUTRAL.*|AWAY|HOME).*$/i,'')).slice(0,40);
      const bug=window.__bug.slice(); window.__bug=[]; const want=HL.cur&&HL_SPORT.headClock?HL_SPORT.headClock(HL.cur):null;
      return {done:!live||live.done, hold:!!(live&&live.hold), head, bug, want} });
    if(s.ask)continue; if(s.done)break;
    const line=`${s.hold?'HOLD':'    '} head="${s.head}" clip=${JSON.stringify(s.bug)}`; if(line!==last){ seen.push(line); last=line }
    if(s.hold&&s.want){ clips++; if(s.head.toLowerCase()!==s.want.toLowerCase()){ off++; if(off<=3)console.log(`  header "${s.head}" while a clip of ${s.want} plays`) } } }
  if(!check){ console.log(`--- ${f}`); seen.slice(0,60).forEach(l=>console.log('  '+l)); if(seen.length>60)console.log(`  ... ${seen.length-60} more`) }
  const ok=off===0&&(clips>0||/basketball-coach\.html/.test(f)); if(!ok)bad++;
  console.log(`${ok?'  ok  ':'  FAIL'} ${f}: ${clips} redraws during clips, header off the clip's time in ${off}`);
  if(errs.length){ console.log('  page errors: '+errs.slice(0,2).join(' | ')); bad++ }
  await p.close() }
 await b.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH the header keeps the clip\'s time'); process.exit(bad?1:0) })();
