/* Two-tap confirms in a real browser (Chromium), where dialogs are dismissed:
   Erase on the title screen and Start over in a career ask on the first tap
   and act on the second; an armed Erase never loads the career instead.
   Muse saw both do nothing in hockey and college football (on a stale build).
     node test/confirm-taps.js [distDir]      last line: MATCH or MISMATCH */
const {chromium}=require('playwright'); const path=require('path');
const DIST=process.argv[2]||path.join(__dirname,'..','dist');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; console.log('  FAIL '+m)}};
const keys=p=>p.evaluate(()=>Object.keys(localStorage).filter(k=>/slot\d$/.test(k)).sort().join(','));
(async()=>{
  const b=await chromium.launch();
  for(const f of ['hockey-coach-pro.html','football-coach.html','soccer-coach.html']){
    const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.dismiss());
    const url='file://'+path.join(DIST,f);
    await p.goto(url); await p.waitForTimeout(600);
    await p.click('#qstart'); await p.waitForTimeout(800);
    const k0=await keys(p); ok(k0.length>0,`${f}: quick start saved nothing`);
    // Start over, in the career
    const rst=await p.$('#rst'); ok(!!rst,`${f}: no Start over button`);
    if(rst){ await rst.click(); await p.waitForTimeout(200);
      ok(await keys(p)===k0,`${f}: one tap of Start over deleted the career`);
      ok(/Tap again/.test(await rst.innerText()),`${f}: Start over didn't ask on the first tap ("${(await rst.innerText()).trim()}")`);
      await rst.click(); await p.waitForTimeout(500);
      ok(await keys(p)==='',`${f}: two taps of Start over left the save (${await keys(p)})`); }
    // Erase, on the title screen
    await p.goto(url); await p.waitForTimeout(500); await p.click('#qstart'); await p.waitForTimeout(800);
    await p.goto(url); await p.waitForTimeout(700);
    const del=await p.$('[data-del]'); ok(!!del,`${f}: no Erase on the title screen`);
    if(del){ const before=await keys(p); await del.click(); await p.waitForTimeout(200);
      ok(await keys(p)===before,`${f}: one tap of Erase deleted the career`);
      ok(!!(await p.$('[data-del]')),`${f}: one tap of Erase left the title screen (it loaded the career?)`);
      const d2=await p.$('[data-del]'); if(d2){ await d2.click(); await p.waitForTimeout(500) }
      ok(await keys(p)==='',`${f}: two taps of Erase left the save (${await keys(p)})`);
      ok(!(await p.$('#rst')),`${f}: the second tap of Erase loaded the career`); }
    ok(!errs.length,`${f}: page errors: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: two-tap confirms work in a browser`);
  process.exit(bad?1:0);
})();
