/* Basketball calls, measured: each call replayed from the same moment of the
   same game with every answer. A report.  node test/bb-calls.js [games] */
const fs=require('fs');
const core=fs.readFileSync('src/core/20_engine.js','utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const G=new Function(rngSrc+fs.readFileSync('src/basketball/50_game.js','utf8')+'\nreturn {RNG,makeLiveGame};')();
const N=+(process.argv[2]||4000), gaps=[-150,0,150];
function play(seed,gap,kind,ans){
  const e=G.makeLiveGame(new G.RNG(seed),1500+gap,1500,'balanced','balanced',true);
  let asked=null,sit=null,g=0;
  while(g++<300){const r=e.next(); if(r.done)return {asked,win:r.h>r.a,sit};
    if(r.ask){const o=r.ask.opts.map(x=>x[0]); let pick;
      if(r.ask.k===kind&&!asked){asked=o.join('/'); sit=r.mine-r.theirs; pick=o.indexOf(ans)>=0?ans:o[o.length-1]}
      else pick=o[o.length-1];                                   // everything else: the default
      e.reply(pick)}}
  return {asked,win:false,sit};
}
const out={};
for(const kind of (process.env.KINDS||'half,chase,protect,last').split(',')) gaps.forEach(gap=>{
  for(let s=1;s<=N;s++){const base=play(s,gap,kind,'__'); if(!base.asked)continue;
    let grp=kind+' ['+base.asked+']'; if(kind==='chase')grp+=' down '+(-base.sit<=3?'1-3':-base.sit<=6?'4-6':'7-9'); if(kind==='protect')grp+=' up '+(base.sit<=3?'1-3':base.sit<=6?'4-6':'7-9');
    const G2=out[grp]=out[grp]||{};
    base.asked.split('/').forEach(a=>{const r=play(s,gap,kind,a); const c=(G2[a]=G2[a]||{}); const q=(c[gap]=c[gap]||{w:0,n:0}); q.n++; if(r.win)q.w++});}});
console.log('win % by answer (you at home), same moment replayed; columns = your rating minus theirs');
Object.keys(out).sort().forEach(grp=>{console.log('  '+grp);Object.entries(out[grp]).forEach(([a,bg])=>console.log('     '+a.padEnd(7)+gaps.map(g=>{const r=bg[g];return r&&r.n?((100*r.w/r.n).toFixed(1)+' ('+r.n+')').padStart(13):'            -'}).join('')))});
