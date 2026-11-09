/* A page the browser served from its cache says so (round 48). Serves the site over http, then: the current
   version.json, no banner; a version.json naming a newer build, the banner, with a reload that asks for it.
     node test/version.js     last line: MATCH or MISMATCH */
const {chromium}=require('playwright'), http=require('http'), fs=require('fs'), path=require('path');
const DIR=path.join(__dirname,'..','dist','site'); let fake=null, bad=0; const ok=(c,m)=>{ if(!c){bad++;console.log('  FAIL '+m)} };
const srv=http.createServer((q,r)=>{ const u=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if(u==='version.json'&&fake){ r.writeHead(200,{'content-type':'application/json'}); r.end(JSON.stringify(fake)); return }
  const f=path.join(DIR,u); if(!fs.existsSync(f)){ r.writeHead(404); r.end(); return }
  r.writeHead(200,{'content-type':u.endsWith('.json')?'application/json':'text/html'}); r.end(fs.readFileSync(f)) }).listen(0);
(async()=>{ const port=srv.address().port, b=await chromium.launch(), V=JSON.parse(fs.readFileSync(path.join(DIR,'version.json'),'utf8'));
  for(const g of ['hockey-coach-pro.html','soccer-coach.html']){
    for(const stale of [false,true]){ fake=stale?Object.assign({},V,{[g]:'f00dfee'}):null;
      const p=await (await b.newContext()).newPage(); await p.goto(`http://127.0.0.1:${port}/${g}`); await p.waitForTimeout(1500);
      const t=await p.evaluate(()=>document.body.innerText);
      ok(stale===/A newer version of this game is out/.test(t),`${g}: ${stale?'an old copy said nothing':'the current copy claimed to be old'}`);
      if(stale){ await p.click('text=Load the new one'); await p.waitForTimeout(800); ok(/\?v=f00dfee/.test(p.url()),`${g}: the reload asked for ${p.url()}`) }
      await p.close() } }
  await b.close(); srv.close(); console.log(bad?`MISMATCH ${bad}`:'MATCH an old copy says so, the current one doesn\'t'); process.exit(bad?1:0) })();
