/* Long careers for calibration: records every NCAA tournament from season 4 on.
     node test/bb-longrun.js <seed> <seasons> <out.json>   (then pool the files) */
// one long career: record every tournament from season 4 on (champion seed, Final Four seeds, first-round results)
const fs=require('fs');const src=fs.readFileSync('test/golden.js','utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const [seed,Y,out]=process.argv.slice(2); const api=m.exports.load('dist/basketball-coach.html');
api.newDynasty(api.NAMES[(+seed*61)%api.NAMES.length],+seed,'T');
const rec=[]; const t0=Date.now();
for(let y=1;y<=+Y&&Date.now()-t0<270000;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<80)E.advance();
  if(y>=4)rec.push({champ:E.seeds[E.champion], ff:(E.rounds.f4||[]).flatMap(x=>[E.seeds[x.home],E.seeds[x.away]]),
    r64:(E.rounds.r64||[]).map(x=>[Math.min(x.hseed,x.aseed),Math.max(x.hseed,x.aseed),E.seeds[x.winner]===Math.min(x.hseed,x.aseed)?1:0])});
  api.openOffseason(); const O=api.S.off; if(O&&O.act.userOpen)O.move=O.jobs[0]||api.S.myTeam; api.commitOffseason();
}
fs.writeFileSync(out,JSON.stringify(rec)); console.log('seed',seed,':',rec.length,'tournaments recorded in',Math.round((Date.now()-t0)/1000),'s');
