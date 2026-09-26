/* College basketball calibration: whole seasons straight through the
   simulation (no screens, no saves), against real Division I and NCAA
   tournament history.
     node test/bb-calibrate.js [seasons=40] [file.html]    a report */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const args=process.argv.slice(2), N=+(args.find(a=>/^\d+$/.test(a))||40);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','basketball-coach.html');
const api=m.exports.load(file);
const pair={}, champSeed={}, ff={}, e8seeds={};
let games=0,fav=0,favN=0,home=0,homeN=0,margin=0,pts=0,upset1216=0;
const t0=Date.now();
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*37)%api.NAMES.length],1000+s,'T');
  const E=api.SEA, pre={}; api.NAMES.forEach(t=>pre[t]=E.elo[t]);
  let guard=0; while(E.phase!=='done'&&guard++<80)E.advance();
  // regular season
  E.weeks.slice(0,30).forEach(w=>w.games.forEach(g=>{games++; margin+=g.margin; pts+=g.hp+g.ap;
    if(!g.neutral){homeN++; if(g.winner===g.home)home++}
    const d=(E.eloAt?0:0); }));
  // tournament: first round by seed pairing
  (E.rounds.r64||[]).forEach(g=>{const hi=Math.min(g.hseed,g.aseed), lo=Math.max(g.hseed,g.aseed);
    const k=hi+'v'+lo; const p=pair[k]=pair[k]||[0,0]; p[1]++; if(E.seeds[g.winner]===hi&&g.hseed!==g.aseed)p[0]++});
  const cs=E.seeds[E.champion]; champSeed[cs]=(champSeed[cs]||0)+1;
  (E.rounds.f4||[]).forEach(g=>[g.home,g.away].forEach(t=>ff[E.seeds[t]]=(ff[E.seeds[t]]||0)+1));
}
const real={"1v16":98.8,"2v15":92.9,"3v14":85.2,"4v13":79.0,"5v12":64.4,"6v11":61.5,"7v10":60.6,"8v9":48.8};
console.log(`${N} seasons in ${((Date.now()-t0)/1000).toFixed(0)} s. Regular season: points/team ${(pts/games/2).toFixed(1)} (~72), mean margin ${(margin/games).toFixed(1)} (11-12), home wins ${(100*home/homeN).toFixed(1)}% (real ~60-65%, but schedules are built for the home side to win)`);
console.log('First round, higher seed wins (real 1985-2025):');
Object.keys(real).forEach(k=>{const p=pair[k]||[0,0]; console.log(`  ${k.padEnd(5)} ${p[1]?(100*p[0]/p[1]).toFixed(1).padStart(5):'   -'}%  (${p[1]} games)   real ${real[k]}%`)});
const tot=Object.values(champSeed).reduce((a,b)=>a+b,0);
console.log('Champion by seed: '+Object.keys(champSeed).sort((a,b)=>a-b).map(s=>s+': '+(100*champSeed[s]/tot).toFixed(0)+'%').join(', ')+'   (real: 1 seeds ~64%, 2s ~13%, 3s ~10%, 4+ ~13%)');
const ft=Object.values(ff).reduce((a,b)=>a+b,0);
console.log('Final Four by seed: '+Object.keys(ff).sort((a,b)=>a-b).map(s=>s+': '+(100*ff[s]/ft).toFixed(0)+'%').join(', ')+'   (real: 1s ~40%, 2s ~20%, 3s ~12%, 4s ~9%, 5+ ~19%)');
// ---- pass/fail: tolerances about two standard errors wide at 60 seasons ----
{
  let bad=0; const chk=(c,msg)=>{if(!c){bad++;console.log('  FAIL '+msg)}};
  const pct=k=>{const p=pair[k]||[0,1];return 100*p[0]/p[1]};
  chk(pct('1v16')>=92, `1 v 16 ${pct('1v16').toFixed(1)}% (want >= 92)`);
  chk(pct('2v15')>=85, `2 v 15 ${pct('2v15').toFixed(1)}% (want >= 85)`);
  chk(pct('5v12')>=52&&pct('5v12')<=76, `5 v 12 ${pct('5v12').toFixed(1)}% (want 52-76)`);
  chk(pct('8v9')>=38&&pct('8v9')<=62, `8 v 9 ${pct('8v9').toFixed(1)}% (want 38-62)`);
  const f1=100*(ff[1]||0)/Math.max(1,ft); chk(f1>=28&&f1<=52, `1 seeds are ${f1.toFixed(0)}% of the Final Four (want 28-52)`);
  const mm=margin/games, pp=pts/games/2, hh=100*home/homeN;
  chk(mm>=10.5&&mm<=14, `mean margin ${mm.toFixed(1)} (want 10.5-14)`);
  chk(pp>=69&&pp<=76, `points ${pp.toFixed(1)} a team (want 69-76)`);
  chk(hh>=56&&hh<=66, `home teams win ${hh.toFixed(1)}% (want 56-66)`);
  console.log(bad?`MISMATCH ${bad} calibration check(s) failed`:'MATCH calibration within tolerance (title share by seed is reported, not yet checked)');
  process.exit(bad?1:0);
}
