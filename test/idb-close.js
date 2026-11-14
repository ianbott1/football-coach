/* Round 71 (Muse: "This career isn't saving ... InvalidStateError", and careers loading a week or a season behind until a
   reload). The browser can close the game's database connection on its own (a page put away in the back-forward cache
   and brought back). The game kept the closed connection: every save after it failed, and every read fell back to the
   localStorage copy left from before the move to the database. Here, in each game, served over http so the database
   opens: a career saves, an older copy sits in localStorage, the connection is closed, and the career must still save
   and load as it is now. */
const {chromium}=require('playwright'), http=require('http'), fs=require('fs'), path=require('path');
const DIST=path.join(__dirname,'..','dist');
const G=[['basketball-coach-pro.html','Boston'],['football-coach.html','Auburn'],['football-coach-pro.html','Green Bay'],['basketball-coach.html','Kentucky'],
  ['hockey-coach-pro.html','Winnipeg'],['soccer-coach.html','Arsenal'],['baseball-coach-pro.html','Houston']];
const srv=http.createServer((q,r)=>{ fs.readFile(path.join(DIST,path.basename(decodeURIComponent(q.url.split('?')[0]))),(e,d)=>{ if(e){r.writeHead(404);r.end();return} r.writeHead(200,{'content-type':'text/html'}); r.end(d) }) });
srv.listen(0,async()=>{ const port=srv.address().port, b=await chromium.launch(); let bad=0;
  for(const [f,t] of G){ const ctx=await b.newContext(), p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(`http://localhost:${port}/${f}`); await p.waitForTimeout(600);
    const r=await p.evaluate(async(t)=>{ const o={kind:store.kind()};
      newDynasty(t,5,'T'); S.title=false; for(let i=0;i<2;i++)doAdvance(); await save();
      const k=KEYFOR(slot), r0=await store.get(k); localStorage.setItem(k,r0.value);
      for(let i=0;i<4;i++)doAdvance(); await save();
      (await idb.open()).close();
      for(let i=0;i<2;i++)doAdvance(); o.saved=await save(); o.steps=S.steps; o.banner=saveFail||staleTab;
      const d=await loadSlot(slot); o.loadedSteps=d&&d.steps; return o },t);
    const ok=r.kind==="database"&&r.saved===true&&!r.banner&&r.loadedSteps===r.steps&&!errs.length;
    if(!ok)bad++; console.log(`  ${ok?"ok ":"BAD"} ${f}: ${JSON.stringify(r)}${errs.length?" errors: "+errs[0]:""}`); await ctx.close() }
  await b.close(); srv.close(); console.log(bad?`MISMATCH ${bad} game(s) lost a save after the connection closed`:"MATCH every game saves and loads as it is after the browser closes the connection"); process.exit(bad?1:0) });
