/* Long pro hockey careers for calibration: every playoff from season 4 on
   (champion's seed, first-round series by seed, series lengths, win % spread).
     node test/nba-longrun.js <seed> <seasons> <out.json> */
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const [seed,Y,out]=process.argv.slice(2); const api=m.exports.load(path.join(__dirname,'..','dist','hockey-coach-pro.html'));
api.newDynasty(api.NAMES[(+seed*7)%32],+seed,'T'); const rec=[]; const t0=Date.now();
for(let y=1;y<=+Y&&Date.now()-t0<270000;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<200)E.advance();
  if(y>=4){ const pct=api.NAMES.map(t=>E.rec[t][0]/(E.rec[t][0]+E.rec[t][1]));
    rec.push({champ:E.seeds[E.champion], pts:api.NAMES.map(t=>E.pts(t)), r1:E.series.r1.map(x=>[E.seeds[x.hi],E.seeds[x.lo],x.winner===x.hi?1:0,x.games.length]),
      fin:E.series.r4.map(x=>x.games.length), margin:(()=>{let m=0,n=0;E.weeks.slice(0,90).forEach(w=>w.games.forEach(q=>{m+=q.margin;n++}));return m/n})(), wins:api.NAMES.map(t=>E.weeks.slice(0,90).reduce((s,w)=>s+w.games.filter(q=>q.winner===t).length,0))}) }
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=api.S.myTeam; api.commitOffseason();
}
fs.writeFileSync(out,JSON.stringify(rec)); console.log('seed',seed,':',rec.length,'seasons recorded in',Math.round((Date.now()-t0)/1000),'s');
