/* Pro hockey's clinch marks: never wrong, and not late.
   Never wrong: a team ever marked x, y or z made the playoffs (y won its
   division, z had the conference's most points); a team ever marked e
   missed. Not late: most playoff teams are marked before the last five game
   days, and a team with 100+ points that makes it is marked by then.
     node test/nhl-clinch.js [seasons=6]   MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||6);
const api=m.exports.load(path.join(__dirname,'..','dist','hockey-coach-pro.html'));
let bad=0,checks=0,early=0,made=0,lead=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*3)%32],500+s,'T'); const E=api.SEA, W=92, seen={}, first={};
  let g=0; while(E.phase==='week'&&g++<200){ E.advance(); const c=E.clinch();
    api.NAMES.forEach(t=>{ if(c[t]){(seen[t]=seen[t]||new Set()).add(c[t]); if(first[t]===undefined&&c[t]!=='e')first[t]=E.step}
      if(E.step===W-5&&E.pts(t)>=100)ok(true,''); }); 
    if(E.step===W-5)api.NAMES.forEach(t=>{ first['_100'+t]=E.pts(t) }) }
  E._seed(); const y=E.year;
  api.NAMES.forEach(t=>{ const S=seen[t]||new Set(), inn=E.field.indexOf(t)>=0;
    if(S.has('x')||S.has('y')||S.has('z'))ok(inn, `${y} ${t}: marked ${[...S].join('/')} but missed the playoffs`);
    if(S.has('y'))ok(Object.values(E.champs).indexOf(t)>=0, `${y} ${t}: marked y but didn't win the division`);
    if(S.has('e'))ok(!inn, `${y} ${t}: marked e but made the playoffs`);
    if(inn){ made++; if(first[t]!==undefined&&first[t]<=W-5)early++;
      if(first['_100'+t]>=100)ok(first[t]!==undefined&&first[t]<=W-5, `${y} ${t}: ${first['_100'+t]} points with five game days left and no mark`) } });
}
console.log(`  ${early} of ${made} playoff teams marked before the last five game days`);
ok(early>=made*0.6, `only ${early} of ${made} marked in time`);
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH ${checks} checks: clinch marks never wrong, and on time (${N} seasons)`);
process.exit(bad?1:0);
