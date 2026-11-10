/* Saves you can trust (round 42: Muse lost six careers to a full store; round 46: saves moved to IndexedDB).
   In a real browser:
   1. Six careers, one per game, each padded past 1.5 MB (9 MB between them, beyond the old shared 5 MB): every one
      saves, and every one is there after a reload, record intact.
   2. An old career in localStorage, with localStorage full: the title screen shows it, it plays, it saves (into the
      database), and after a reload it's there with the games just played.
   3. An erased career stays erased after a reload (the old localStorage copy can't bring it back).
   4. Where the database can't open (taken away before the page loads), the old path holds: with localStorage full a
      save that fits lands, one that can't says so, and the last good save survives a reload.
   node test/storage-full.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path'); let bad=0, n=0; const ok=(c,m)=>{n++; if(!c){bad++; console.log('  FAIL '+m)}};
const GAMES=['football-coach.html','football-coach-pro.html','basketball-coach.html','basketball-coach-pro.html','hockey-coach-pro.html','soccer-coach.html'];
const url=f=>'file://'+path.join(__dirname,'..','dist',f);
const pad=`(()=>{ let q=7, t=""; for(let i=0;i<1600000;i++){ q=(q*1103515245+12345)&0x7fffffff; t+=String.fromCharCode(33+(q>>16)%90) } return t })()`;
const fillLS=async p=>p.evaluate(()=>{ for(const s of [50000,5000,500,50,5,1]){ const blk='y'.repeat(s); for(let i=0;i<4000;i++){ try{ localStorage.setItem('__o'+s+'_'+i,blk) }catch(e){ break } } } });
const slotText=async p=>p.evaluate(()=>{ const e=document.querySelector('[data-slot]'); return e?e.innerText.replace(/\s+/g,' '):'' });
(async()=>{ const b=await chromium.launch();
 // 1. six big careers, one browser profile (one origin: file://)
 { const ctx=await b.newContext(); const rec={};
   for(const f of GAMES){ const p=await ctx.newPage(); await p.goto(url(f)); await p.waitForTimeout(400); await p.click('#qstart'); await p.waitForTimeout(900);
     const r=await p.evaluate(async P=>{ for(let k=0;k<6;k++){ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ } S.__pad=eval(P); const x=await save(); return {x, team:S.myTeam, step:SEA.step, kind:store.kind()} },pad);
     rec[f]=r; ok(r.x===true&&r.kind==='database',`${f}: a 1.6 MB career with five others saved: ${JSON.stringify(r)}`); await p.close() }
   for(const f of GAMES){ const p=await ctx.newPage(); await p.goto(url(f)); await p.waitForTimeout(900); const sl=await slotText(p);
     ok(sl.toUpperCase().indexOf(rec[f].team.toUpperCase())>=0,`${f}: after reload, slot 1 reads "${sl.slice(0,60)}" (career ${rec[f].team})`);
     await p.click('[data-slot]'); await p.waitForTimeout(900); const st=await p.evaluate(()=>({team:S.myTeam, step:SEA.step, pad:(S.__pad||'').length}));
     ok(st.team===rec[f].team&&st.step===rec[f].step&&st.pad===1600000,`${f}: reloaded career ${JSON.stringify(st)} vs saved ${JSON.stringify(rec[f])}`); await p.close() }
   console.log(`six careers of 1.6 MB each: ${GAMES.every(f=>rec[f].x)?'all saved':'NOT ALL SAVED'} and reloaded`); await ctx.close() }
 // 2. an old localStorage career, localStorage full
 for(const f of ['hockey-coach-pro.html','soccer-coach.html']){ const ctx=await b.newContext(); const p=await ctx.newPage();
   await p.goto(url(f)); await p.waitForTimeout(400); await p.click('#qstart'); await p.waitForTimeout(900);
   const old=await p.evaluate(async()=>{ for(let k=0;k<10;k++){ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ } await save();
     // make it an old save: the value into localStorage, out of the database
     const ks=(await store.list('')).keys; for(const k of ks){ const v=(await store.get(k)).value; localStorage.setItem(k,v); await idb.del(k) }
     return {team:S.myTeam, step:SEA.step, keys:ks.length} });
   await fillLS(p);
   await p.reload(); await p.waitForTimeout(900); const sl=await slotText(p);
   ok(sl.toUpperCase().indexOf(old.team.toUpperCase())>=0,`${f}: an old career, localStorage full: slot reads "${sl.slice(0,50)}"`);
   await p.click('[data-slot]'); await p.waitForTimeout(900);
   const r=await p.evaluate(async()=>{ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++; SEA.userTeam=S.myTeam; SEA.advance(); S.steps++; const x=await save(); render(); return {x, step:SEA.step, fail:!!document.querySelector('#savefail'), stale:staleTab} });
   ok(r.x===true&&!r.fail&&!r.stale&&r.step>old.step,`${f}: played on and saved with localStorage full: ${JSON.stringify(r)}`);
   await p.reload(); await p.waitForTimeout(900); await p.click('[data-slot]'); await p.waitForTimeout(900);
   const st=await p.evaluate(()=>SEA.step); ok(st===r.step,`${f}: after reload the career is at step ${st}, saved at ${r.step}`);
   // 3. erase it: gone after a reload, though localStorage held the old copy
   await p.evaluate(async()=>{ await store.delete(KEYFOR(1)); await bumpRev(1) });
   await p.reload(); await p.waitForTimeout(900); const gone=await p.evaluate(async()=>!(await store.get(KEYFOR(1)))&&!localStorage.getItem(KEYFOR(1)));
   ok(gone,`${f}: an erased career came back`);
   console.log(`${f}: old career found with localStorage full, played, saved, reloaded at step ${st}; erased stays erased: ${gone}`); await ctx.close() }
 // 5. round 50: an old copy of the game (a cached tab) played on after the new one: its localStorage save is further
 //    along than the database's. Muse lost three pro football games and a season's ending. The further copy loads;
 //    and the other way round, an old localStorage copy never pulls a newer database save back.
 for(const f of ['football-coach-pro.html','basketball-coach-pro.html']){ const ctx=await b.newContext(); const p=await ctx.newPage();
   await p.goto(url(f)); await p.waitForTimeout(400); await p.click('#qstart'); await p.waitForTimeout(900);
   const r=await p.evaluate(async()=>{ for(let k=0;k<3;k++){ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ } await save(); const early=SEA.step, A=(await idb.get(KEYFOR(1))).val, rA=(await idb.get(REVKEY(1))).val;
     for(let k=0;k<4;k++){ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ } S.league=LEAGUE.id; const B=lzwPack(saveText(S)), late=SEA.step;
     localStorage.setItem(KEYFOR(1),B); localStorage.setItem(REVKEY(1),String(+rA+3)); await idb.set(KEYFOR(1),A); return {early,late} });
   await p.reload(); await p.waitForTimeout(900); await p.click('[data-slot]'); await p.waitForTimeout(900);
   const st=await p.evaluate(()=>SEA.step); ok(st===r.late,`${f}: the old tab's further save (step ${r.late}) loads, not the database's (step ${r.early}): got ${st}`);
   const r2=await p.evaluate(async()=>{ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++; const x=await save(); return {x,step:SEA.step,stale:staleTab} });
   ok(r2.x===true&&!r2.stale,`${f}: plays on and saves after the old tab's copy won: ${JSON.stringify(r2)}`);
   // now localStorage holds the older copy (step late), the database the newer: reload keeps the newer
   await p.reload(); await p.waitForTimeout(900); await p.click('[data-slot]'); await p.waitForTimeout(900);
   const st2=await p.evaluate(()=>SEA.step); ok(st2===r2.step,`${f}: an older localStorage copy never pulls a newer database save back: step ${st2}, saved ${r2.step}`);
   console.log(`${f}: old tab further along: loads step ${st} (database had ${r.early}); newer database kept: ${st2===r2.step}`); await ctx.close() }
 // 4. no database: the localStorage path
 for(const f of ['hockey-coach-pro.html']){ const ctx=await b.newContext(); await ctx.addInitScript(()=>{ try{ Object.defineProperty(window,'indexedDB',{value:undefined}) }catch(e){} });
   const p=await ctx.newPage(); await p.goto(url(f)); await p.waitForTimeout(400); await p.click('#qstart'); await p.waitForTimeout(900);
   await p.evaluate(()=>{ for(let k=0;k<20;k++){ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ } }); await p.evaluate(()=>save()); await p.waitForTimeout(300);
   const team=await p.evaluate(()=>S.myTeam), kind=await p.evaluate(()=>store.kind());
   await fillLS(p); await p.evaluate(()=>{ localStorage.removeItem('__o5000_0'); localStorage.removeItem('__o5000_1') });
   await p.evaluate(()=>{ SEA.userTeam=S.myTeam; SEA.advance(); S.steps++ }); const r1=await p.evaluate(async()=>{ const x=await save(); render(); return {x, stale:staleTab, fail:!!document.querySelector('#savefail')} });
   ok(kind==='browser'&&r1.x===true&&!r1.stale&&!r1.fail,`${f} (no database, ${kind}): a save that fits: ${JSON.stringify(r1)}`);
   const r2=await p.evaluate(async()=>{ let q=7, t=""; for(let i=0;i<300000;i++){ q=(q*1103515245+12345)&0x7fffffff; t+=String.fromCharCode(33+(q>>16)%90) } S.__pad=t; const x=await save(); render(); delete S.__pad; return {x, stale:staleTab, fail:!!document.querySelector('#savefail')} });
   ok(r2.x===false&&!r2.stale&&r2.fail,`${f} (no database): a save that can't fit isn't said: ${JSON.stringify(r2)}`);
   await p.reload(); await p.waitForTimeout(900); const sl=await slotText(p);
   ok(sl.toUpperCase().indexOf(team.toUpperCase())>=0,`${f} (no database): after a reload slot 1 reads "${sl}"`);
   console.log(`${f} without a database: storage full, save that fits ${r1.x?'lands':'FAILS'}; too big ${r2.fail?'warned':'SILENT'}`); await ctx.close() }
 await b.close(); console.log(bad?`MISMATCH ${bad} of ${n}`:`MATCH ${n} checks: saves survive, in the database and without it`); process.exit(bad?1:0) })();
