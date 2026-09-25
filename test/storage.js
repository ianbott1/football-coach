/* Saving outside Claude's artifact viewer, the way the published site runs:
   no window.storage, only the browser's localStorage. Plays three weeks,
   presses the title-screen button, checks the slot is listed and loads back
   to the same season; checks "Start over" really deletes the save; checks a
   browser with storage blocked reports the save failed instead of hiding it.
     node test/storage.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const h=o=>crypto.createHash('md5').update(JSON.stringify(o)).digest('hex');
function boot(LS,blocked){
  let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
  global.setTimeout=()=>0; global.clearTimeout=()=>{};
  const ls={getItem:k=>k in LS?LS[k]:null, setItem:(k,v)=>{if(blocked)throw new Error('QuotaExceededError');LS[k]=String(v)},
    removeItem:k=>{delete LS[k]}, key:i=>Object.keys(LS)[i], get length(){return Object.keys(LS).length}};
  global.localStorage=ls;
  global.window={addEventListener(){},innerWidth:390,matchMedia:()=>({matches:false}),localStorage:ls,scrollTo(){}};
  const nodes={}; const mk=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},onclick:null});
  global.document={getElementById:id=>nodes[id]=nodes[id]||mk(),querySelector:()=>mk(),querySelectorAll:()=>[],createElement:mk,body:{classList:{toggle(){}}},addEventListener(){}};
  global.confirm=()=>true;
  const api=new Function(js+`return {render,newDynasty,postSeason,get leagueMsg(){return leagueMsg},doAdvance,liveTick,answerLive,loadSlot,allSlots,rebuild,
    get S(){return S}, set S(v){S=v}, get SEA(){return SEA}, get live(){return live},
    get saveOK(){return typeof saveOK==="undefined"?undefined:saveOK}, setSlot(n){slot=n}};`)();
  api.nodes=nodes; return api;
}
const tick=()=>new Promise(r=>setImmediate(r));
const play=async(api,weeks)=>{for(let i=0;i<weeks;i++){api.doAdvance();let n=0;
  while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}} await tick()};
const season=api=>h({g:api.SEA.weeks.map(w=>w.games.map(g=>[g.home,g.away,g.hp,g.ap])),r:api.SEA.rec,step:api.SEA.step});
(async()=>{
  let bad=0; const ok=(c,msg)=>{console.log((c?'  ok   ':'  FAIL ')+msg); if(!c)bad++};
  // 1. save, quit to title, resume
  const LS={}; const A=boot(LS); A.newDynasty('Alabama',1,'T'); await play(A,3);
  const played=season(A);
  ok(Object.keys(LS).some(k=>/slot1$/.test(k)), 'three weeks in, slot 1 is written to localStorage');
  ok(A.saveOK===true, 'the game knows the save landed');
  if(A.nodes.ttl.onclick) await A.nodes.ttl.onclick(); await tick();
  const slots=await A.allSlots();
  ok(slots[0]&&slots[0].team==='Alabama', 'title screen lists slot 1: '+JSON.stringify(slots.map(s=>s.empty?'empty':s.team)));
  const B=boot(LS); const d=await B.loadSlot(1);                      // a fresh page load
  ok(!!d, 'slot 1 loads on a fresh page');
  if(!d){console.log('MISMATCH (nothing to load)');process.exit(1)}
  if(d){B.S=d; B.rebuild(); ok(season(B)===played, 'and it is the same season, week '+B.SEA.step)}
  // 2. start over deletes the save
  const C=boot(LS); C.S=await C.loadSlot(1); C.rebuild(); C.setSlot(1); C.render();
  ok(!!(C.nodes.rst&&C.nodes.rst.onclick), '"Start over" button is on screen');
  if(C.nodes.rst&&C.nodes.rst.onclick){await C.nodes.rst.onclick(); await tick()}
  ok(!Object.keys(LS).some(k=>/slot1$/.test(k)), '"Start over" deletes slot 1');
  // 2b. the shared table says it is unavailable rather than claiming a post
  { const E=boot(LS); E.newDynasty('Iowa',3,'T'); await play(E,1);
    E.S.history=[{year:2026,rec:'1-0',rank:5,result:'x',grade:'B'}];
    await E.postSeason(); await tick();
    ok(!/^Posted/.test(E.leagueMsg), 'shared table outside Claude: "'+E.leagueMsg+'"'); }
  // 3. storage blocked: the failure is reported, not swallowed
  const D=boot({},true); D.newDynasty('Rice',2,'T'); await play(D,1);
  ok(D.saveOK===false, 'with storage blocked, the game knows the save failed');
  console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH all checks');
  process.exit(bad?1:0);
})();
