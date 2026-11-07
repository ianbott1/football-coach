/* The result card names only choices you made (Grokbot: picked "Trap the ball handler", the card graded "Pack the
   paint"; not reproduced, round 38). A browser plays six live games of each basketball game at Very fast, tapping
   every call, and checks each "You chose ..." on the card against the buttons tapped.  Last line: MATCH or MISMATCH */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); let bad=0, said=0;
  for(const F of ['basketball-coach.html','basketball-coach-pro.html']){
    const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+require('path').join(__dirname,'..','dist',F)); await p.waitForTimeout(500); await p.click('#qstart'); await p.waitForTimeout(900);
    await p.evaluate(()=>{S.watchSpeed='rapid'; S.guide=false}); let k=0;
    for(let g=0;g<6;g++){ await p.click('#adv').catch(()=>{}); await p.waitForTimeout(200); const chosen=[];
      for(let i=0;i<400;i++){ const s=await p.evaluate(()=>({on:!!(live&&!live.done),k:live&&live.ask?live.ask.dp.k:null}));
        if(!s.on)break; if(s.k){ await p.waitForTimeout(760); const bs=await p.$$('[data-call]'); const pick=bs[(k++)%bs.length]; chosen.push((await pick.innerText()).split('\n')[0].trim().toLowerCase()); await pick.click(); await p.waitForTimeout(120); continue }
        await p.waitForTimeout(60) }
      await p.waitForTimeout(400);
      const m=[...(await p.evaluate(()=>document.body.innerText)).matchAll(/[Yy]ou chose "([^"]+)"/g)].map(x=>x[1].toLowerCase()); said+=m.length;
      m.forEach(x=>{ if(!chosen.some(c=>c.indexOf(x)>=0||x.indexOf(c.replace(/^keep (your setup|it): /,''))>=0)){ bad++; console.log(`  FAIL ${F} game ${g+1}: the card says "${x}", tapped ${JSON.stringify(chosen)}`) } });
      await p.evaluate(()=>{flash=null; render()}); await p.waitForTimeout(150) }
    if(errs.length){ bad++; console.log('  FAIL page errors',errs.slice(0,2)) } }
  await b.close();
  console.log(bad?`MISMATCH ${bad} cards named a choice not made`:`MATCH ${said} choices on the cards, every one tapped`); process.exit(bad?1:0) })();
