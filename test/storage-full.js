/* Full browser storage (round 42: Muse lost six careers). Every career in all six games shares one allowance. When it
   filled, the storage probe's test write failed, every read came back empty: a false "changed in another tab"
   banner, then three empty slots over careers still there. Checks, in a real browser:
     with storage full, a save that fits still lands, no false banner, and the career loads after a reload;
     a save that can't fit says so at once, and the last good save survives a reload.
   node test/storage-full.js   last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), path=require('path'); let bad=0, n=0; const ok=(c,m)=>{n++; if(!c){bad++; console.log('  FAIL '+m)}};
(async()=>{ const b=await chromium.launch();
 for(const f of ['hockey-coach-pro.html','soccer-coach.html']){ const p=await (await b.newContext()).newPage();
  await p.goto('file://'+path.join(__dirname,'..','dist',f)); await p.waitForTimeout(400); await p.click('#qstart'); await p.waitForTimeout(900);
  await p.evaluate(()=>{ for(let k=0;k<20;k++){ SEA.userTeam=S.myTeam; SEA.advance() } }); await p.evaluate(()=>save()); await p.waitForTimeout(300);
  const team=await p.evaluate(()=>S.myTeam);
  await p.evaluate(()=>{ for(const s of [50000,5000,500,50,5,1]){ const blk='y'.repeat(s); for(let i=0;i<4000;i++){ try{ localStorage.setItem('__o'+s+'_'+i,blk) }catch(e){ break } } } });
  await p.evaluate(()=>{ localStorage.removeItem('__o5000_0'); localStorage.removeItem('__o5000_1') });   // a little room: nearly full, as a long career would leave it
  await p.evaluate(()=>{ SEA.userTeam=S.myTeam; SEA.advance() }); const r1=await p.evaluate(async()=>{ const x=await save(); render(); return {x, stale:staleTab, fail:!!document.querySelector('#savefail')} });
  ok(r1.x===true&&!r1.stale&&!r1.fail,`${f}: a save that fits, storage full: ${JSON.stringify(r1)}`);
  const r2=await p.evaluate(async()=>{ let q=7, t=""; for(let i=0;i<300000;i++){ q=(q*1103515245+12345)&0x7fffffff; t+=String.fromCharCode(33+(q>>16)%90) } S.__pad=t;   /* random: the save compresses, and a run of one letter fit */ const x=await save(); render(); delete S.__pad; return {x, stale:staleTab, fail:!!document.querySelector('#savefail')} });
  ok(r2.x===false&&!r2.stale&&r2.fail,`${f}: a save that can't fit isn't said: ${JSON.stringify(r2)}`);
  await p.reload(); await p.waitForTimeout(900);
  const sl=await p.evaluate(()=>document.querySelector('[data-slot]').innerText.replace(/\s+/g,' '));
  ok(sl.toUpperCase().indexOf(team.toUpperCase())>=0,`${f}: after a reload with storage full, slot 1 reads "${sl}" (career ${team})`);
  console.log(`${f}: storage full, save that fits ${r1.x?'lands':'FAILS'}; too big ${r2.fail?'warned':'SILENT'}; reload shows "${sl.slice(0,40)}"`) }
 await b.close(); console.log(bad?`MISMATCH ${bad} of ${n}`:`MATCH ${n} checks: full storage never hides or loses a career`); process.exit(bad?1:0) })();
