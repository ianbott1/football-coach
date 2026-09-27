/* The in-game calls, measured: each call is replayed with every answer from
   the same moment of the same game, so the difference is the call alone.
   Grouped by the options offered and the situation (deficit, lead, yards to
   go). A report, not a pass/fail test.
     node test/calls.js <file.html> [games=1500]   KINDS=chase,fourth to narrow */
const fs=require('fs');
const file=process.argv[2], N=+(process.argv[3]||1500);
let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
global.setTimeout=()=>0;global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G=new Function(js+'return {makeLiveGame,RNG,LEAGUE,AGGR};')();
// try other mode settings without rebuilding: AGGR='{"sit":{"to":-0.1}}'
if(process.env.AGGR){const o=JSON.parse(process.env.AGGR);Object.keys(o).forEach(k=>Object.assign(G.AGGR[k],o[k]))}
if(process.env.FORCE)Object.assign(G.AGGR.force,JSON.parse(process.env.FORCE));
const gaps=G.LEAGUE.id==='nfl'?[-60,0,60]:[-150,0,150];
// base answers: the "stay the course" option of each call
const BASE={chase:'normal',protect:'keep',half:'normal',fourth:null,two:'kick'};
function play(seed,gap,kind,ans){
  const e=G.makeLiveGame(new G.RNG(seed),1700+gap,1700,'balanced','balanced',true);
  let asked=null, guard=0, sit=null, togo=null;
  while(guard++<400){const r=e.next(); if(r.done)return {asked,win:r.h>r.a,sit,togo};
    if(r.ask){const k=r.ask.k, o=r.ask.opts.map(x=>x[0]);
      let pick = k===kind ? (o.indexOf(ans)>=0?ans:null) : (k==='fourth' ? (o.indexOf('punt')>=0?'punt':'kick') : BASE[k]);
      if(k===kind&&!asked){asked=o.join('/'); sit=r.mine-r.theirs; togo=(r.ask.h.match(/Fourth and (\d+)/)||[])[1]}
      if(!pick)pick=o[0];
      e.reply(pick);
    }}
  return {asked,win:false};
}
const out={};
for(const kind of (process.env.KINDS||'chase,protect,half,fourth,two').split(',')){
  gaps.forEach(gap=>{
    for(let s=1;s<=N;s++){
      const base=play(s,gap,kind,'__none__'); if(!base.asked)continue;
      let group=kind+' ['+base.asked+']'; if(kind==='half')group+=base.sit<0?' behind':' ahead';
      if(kind==='fourth')group+=' '+(+base.togo<=2?'1-2 to go':+base.togo<=5?'3-5 to go':'6+ to go');
      if(kind==='chase')group+=' down '+(-base.sit<=2?'1-2':-base.sit===3?'3':'4-8');
      if(kind==='protect')group+=' up '+(base.sit<=3?'1-3':base.sit<=8?'4-8':'9+');
      const G2=out[group]=out[group]||{}; 
      base.asked.split('/').forEach(a=>{const r=play(s,gap,kind,a); const c=(G2[a]=G2[a]||{}); const q=(c[gap]=c[gap]||{w:0,n:0}); q.n++; if(r.win)q.w++});
    }});
}
console.log(file.split('/').pop()+' — win % by answer, only games where the call came up; columns = your rating minus theirs');
Object.entries(out).sort().forEach(([grp,byAns])=>{ console.log('  '+grp);
  Object.entries(byAns).forEach(([a,byGap])=>console.log('     '+a.padEnd(8)+gaps.map(g=>{const r=byGap[g];return r&&r.n?((100*r.w/r.n).toFixed(1)+' ('+r.n+')').padStart(13):'            -'}).join('')))});
