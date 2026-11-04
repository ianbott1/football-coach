/* Two-tap confirms in a real browser (Chromium), where dialogs are dismissed:
   Erase on the title screen and Start over in a career ask on the first tap
   and act on the second; an armed Erase never loads the career instead.
   Muse saw both do nothing in hockey and college football (on a stale build),
   and Erase pressed as a control loaded the career (it was text inside the
   slot's button; now its own button, checked here by role and name).
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
      ok(await keys(p)==='',`${f}: two taps of Start over left the save (${await keys(p)})`);
      // and a new career starts without a reload (it went to a team picker with no setup, and a pick threw)
      ok(!!(await p.$('[data-slot]')),`${f}: Start over didn't return to the title screen`);
      const sl=await p.$('[data-slot]'); if(sl){ await sl.click(); await p.waitForTimeout(400) }
      const cg=await p.$('#cgo'); if(cg){ await cg.click(); await p.waitForTimeout(400) }
      const pk=(await p.$$('.pick'))[4]; if(pk){ await pk.click(); await p.waitForTimeout(900) }
      ok(!!(await p.$('#rst')),`${f}: after Start over, a new career didn't begin (${errs[0]||'no error'})`);
      ok(!errs.length,`${f}: page errors after Start over: ${errs[0]}`);
      await p.evaluate(()=>localStorage.clear()); }
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
    // Erase as a control (by role and name, as a keyboard, a screen reader or a test agent reaches it):
    // it was text inside the slot's button, so pressing it pressed the slot and loaded the career
    await p.goto(url); await p.waitForTimeout(500); await p.click('#qstart'); await p.waitForTimeout(800);
    await p.goto(url); await p.waitForTimeout(700);
    { const er=p.getByRole('button',{name:/^Erase/}); const n=await er.count(); ok(n===1,`${f}: ${n} buttons named Erase on the title screen`);
      if(n===1){ await er.click(); await p.waitForTimeout(250);
        ok(!(await p.$('#rst'))&&(await keys(p))!=='',`${f}: pressing the Erase button loaded or erased the career at once`);
        await p.getByRole('button',{name:/Tap again to erase|^Erase/}).click(); await p.waitForTimeout(600);
        ok(await keys(p)===''&&!(await p.$('#rst')),`${f}: pressing Erase twice didn't erase (saves ${await keys(p)}, career loaded ${!!(await p.$('#rst'))})`) } }
    ok(!errs.length,`${f}: page errors: ${errs[0]}`);
    await ctx.close();
  }
  // a save that won't open is never shown as empty, and the last career opened can be brought back
  // (Muse: two careers gone from slots that read Empty)
  { const ctx=await b.newContext({viewport:{width:390,height:844}}); const url='file://'+path.join(DIST,'hockey-coach-pro.html');
    const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss()); await p.goto(url); await p.waitForTimeout(600); await p.click('#qstart'); await p.waitForTimeout(900);
    await p.goto(url); await p.waitForTimeout(800); await p.click('[data-slot="1"]'); await p.waitForTimeout(1200);   // open it: a copy is kept
    const key=await p.evaluate(()=>KEYFOR(1)), team=await p.evaluate(()=>S.myTeam);
    await p.evaluate(k=>localStorage.setItem(k,'LZW1:garbage'),key);                                         // damaged
    await p.goto(url); await p.waitForTimeout(900);
    const txt=await p.evaluate(()=>document.body.innerText);
    ok(/won't open/i.test(txt)&&!/Empty/i.test(txt.split(/slot 2/i)[0].split(/slot 1/i).pop()),'a damaged save showed as Empty');
    ok(!(await p.$('.slot.broken[data-slot]')),'a damaged save can be clicked into a new career');
    await p.evaluate(k=>localStorage.removeItem(k),key); await p.goto(url); await p.waitForTimeout(900);      // gone
    const cb=await p.$('[data-copyback="1"]'); ok(!!cb,'no offer to bring back the last career opened');
    if(cb){ await cb.click(); await p.waitForTimeout(200); await (await p.$('[data-copyback="1"]')).click(); await p.waitForTimeout(800);
      await p.click('[data-slot="1"]'); await p.waitForTimeout(1200); ok(await p.evaluate(()=>S.myTeam)===team,'the brought-back career didn\'t open') }
    await ctx.close(); }
  // two tabs on one career: the one left behind stops saving instead of wiping the newer progress
  // (it wiped six games: Muse's "ghost" careers and lagging title summaries)
  { const ctx=await b.newContext({viewport:{width:390,height:844}}); const url='file://'+path.join(DIST,'basketball-coach-pro.html');
    const A=await ctx.newPage(); A.on('dialog',d=>d.dismiss()); await A.goto(url); await A.waitForTimeout(600); await A.click('#qstart'); await A.waitForTimeout(900);
    const B=await ctx.newPage(); await B.goto(url); await B.waitForTimeout(800); await B.click('[data-slot="1"]'); await B.waitForTimeout(1200);
    for(let i=0;i<6;i++)await B.evaluate(()=>simAdvance()); await B.waitForTimeout(400);
    const want=await B.evaluate(()=>S.steps);
    await A.evaluate(()=>{ S.featured=1; save() }); await A.waitForTimeout(500);
    const C=await ctx.newPage(); await C.goto(url); await C.waitForTimeout(900); await C.click('[data-slot="1"]'); await C.waitForTimeout(1200);
    const got=await C.evaluate(()=>S.steps);
    ok(got===want,`two tabs: the older tab's save wiped the newer one (${got} steps saved, ${want} played)`);
    ok(await A.evaluate(()=>!!document.getElementById('staletab')),'two tabs: the older tab doesn\'t say it has stopped saving');
    await ctx.close(); }
  await b.close();
  console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: two-tap confirms work in a browser`);
  process.exit(bad?1:0);
})();
