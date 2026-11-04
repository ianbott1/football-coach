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
  // "How to play" on the title screen, skipped or read to the end, never touches slot 1
  // (Grokbot: its Skip and its last Next saved with no career open, an empty one over slot 1)
  for(const f of ['football-coach.html','football-coach-pro.html','basketball-coach.html','basketball-coach-pro.html','hockey-coach-pro.html','soccer-coach.html']){
    const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss());
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    const url='file://'+path.join(DIST,f); await p.goto(url); await p.waitForTimeout(600);
    if(!(await p.$('#qstart'))){ ok(false,`${f}: no quick start (missing build?)`); await ctx.close(); continue }
    await p.click('#qstart'); await p.waitForTimeout(900);
    const key=await p.evaluate(()=>KEYFOR(1)), team=await p.evaluate(()=>S.myTeam);
    for(const how of ['skip','next']){
      await p.goto(url); await p.waitForTimeout(700);
      const th=await p.$('#thow'); ok(!!th,`${f}: no How to play on the title screen`); if(!th)break;
      await th.click(); await p.waitForTimeout(250);
      if(how==='skip') await p.click('#iskip');
      else for(let i=0;i<20&&(await p.$('#inext'));i++){ await p.click('#inext'); await p.waitForTimeout(120) }
      await p.waitForTimeout(500);
      await p.goto(url); await p.waitForTimeout(700);
      const has=await p.evaluate(k=>!!localStorage.getItem(k),key); ok(has,`${f}: How to play (${how}) erased slot 1`);
      if(has){ await p.click('[data-slot="1"]'); await p.waitForTimeout(1200);
        ok(await p.evaluate(()=>S.myTeam)===team,`${f}: after How to play (${how}), slot 1 opens as ${await p.evaluate(()=>S.myTeam)} not ${team}`) }
    }
    ok(!errs.length,`${f}: page errors around How to play: ${errs[0]}`);
    await ctx.close();
  }
  // the same season builds the same schedule every time, once the page has been playing a while
  // (the draw was inside a sort comparator: about one build in four differed in pro basketball,
  // and a reload replayed the season on another schedule)
  for(const f of ['basketball-coach-pro.html','hockey-coach-pro.html']){
    const ctx=await b.newContext(); const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss());
    await p.goto('file://'+path.join(DIST,f)); await p.waitForTimeout(500); await p.click('#qstart'); await p.waitForTimeout(900);
    const r=await p.evaluate(async()=>{ S.watchMode="never"; for(let k=0;k<20;k++){ simAdvance(); await new Promise(r=>setTimeout(r,20)) }
      const one=()=>{ const u=snap(S.uStart); syncConf(u); u.userTeam=S.myTeam; u.year=u.year+1;   // a later season: not the real 2026 one
        const rng=new RNG(S.seasonSeed); SCHED_V=u.schedV||1; return JSON.stringify(LEAGUE.buildSchedule(rng,u.perceived,u.year)) };
      // with the browser's sort, then with another correct sort (a plain merge sort): a schedule
      // that hangs on how the sort goes about its comparisons comes out differently
      const a=one(), nat=Array.prototype.sort;
      Array.prototype.sort=function(cmp){ cmp=cmp||((x,y)=>String(x)<String(y)?-1:String(x)>String(y)?1:0);
        const ms=v=>{ if(v.length<2)return v; const m=v.length>>1, L=ms(v.slice(0,m)), R=ms(v.slice(m)), o=[]; let i=0,j=0;
          while(i<L.length&&j<R.length)o.push(cmp(R[j],L[i])<0?R[j++]:L[i++]); return o.concat(L.slice(i),R.slice(j)) };
        const out=ms(nat.call(this.slice(),()=>0)); for(let i=0;i<out.length;i++)this[i]=out[i]; return this };
      let b2; try{ b2=one() } finally { Array.prototype.sort=nat }
      rebuild(); return a===b2?0:1 });
    ok(r===0,`${f}: the season's schedule depends on how the browser sorts`);
    await ctx.close();
  }
  // featuring someone new in the offseason doesn't replay last season with him on reload
  // (Grokbot: the final card went 54-28 to 53-29; it moved hockey by 13 wins)
  for(const f of ['basketball-coach-pro.html','hockey-coach-pro.html']){
    const ctx=await b.newContext(); const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss());
    const url='file://'+path.join(DIST,f); await p.goto(url); await p.waitForTimeout(500); await p.click('#qstart'); await p.waitForTimeout(900);
    const before=await p.evaluate(async()=>{ S.watchMode="never"; let g=0; while(SEA.phase!=="done"&&g++<400)simAdvance();
      await new Promise(r=>setTimeout(r,300)); const rec=recStr(S.myTeam); openOffseason();
      const was=S.featured; S.featured=(S.featured===3?4:3); noteChoice("f",was,S.featured); SEA.featured=S.featured; await save(); return rec });
    await p.waitForTimeout(400); await p.goto(url); await p.waitForTimeout(700); await p.click('[data-slot="1"]'); await p.waitForTimeout(2500);
    const after=await p.evaluate(()=>recStr(S.myTeam));
    ok(after===before,`${f}: featuring in the offseason rewrote last season on reload (${before} became ${after})`);
    await ctx.close();
  }
  await b.close();
  console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: two-tap confirms work in a browser`);
  process.exit(bad?1:0);
})();
