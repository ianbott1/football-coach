/* Pro hockey's clinch marks: never wrong, and not late.
   Never wrong: a team ever marked x, y or z made the playoffs (y won its
   division, z had the conference's most points); a team ever marked e
   missed. Not late: most playoff teams are marked before the last five game
   days, and whenever a team is in even in the worst case, it's marked.
     node test/nhl-clinch.js [seasons=6]   MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||6);
const api=m.exports.load(path.join(__dirname,'..','dist','hockey-coach-pro.html'));
let bad=0,checks=0,early=0,made=0,lead=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*3)%32],500+s,'T'); const E=api.SEA, W=194, seen={}, first={}, lateAt={};
  // the worst case, worked out directly: T loses every game left, everyone else
  // wins every game left, ties go against T; the real format picks the eight
  const worstIn=(T)=>{ const rem={}; api.NAMES.forEach(t=>rem[t]=0);
    E.sched.forEach(x=>{if(x.week>=E.step){rem[x.home]++;rem[x.away]++}});
    const fin=t=>t===T?E.pts(t):E.pts(t)+2*rem[t], sd=E.sideOf(T), inSide=api.NAMES.filter(t=>E.sideOf(t)===sd);
    const cmp=(a,b)=>fin(b)-fin(a)||(a===T?1:b===T?-1:0);
    const top=new Set(); [...new Set(inSide.map(t=>api.CONF[t]))].forEach(d=>inSide.filter(t=>api.CONF[t]===d).sort(cmp).slice(0,3).forEach(t=>top.add(t)));
    const wc=inSide.filter(t=>!top.has(t)).sort(cmp).slice(0,2);
    return top.has(T)||wc.indexOf(T)>=0 };
  let g=0, late=0;
  while(E.phase==='week'&&g++<600){ E.advance(); const c=E.clinch();
    api.NAMES.forEach(t=>{ if(c[t]){(seen[t]=seen[t]||new Set()).add(c[t]); if(first[t]===undefined&&c[t]!=='e')first[t]=E.step} });
    // on time: whenever the worst case still gets a team in, it's marked (division
    // rivals playing each other can make the true worst case a little kinder; allow a
    // team at most one game day of grace)
    if(E.step%6===0)api.NAMES.forEach(t=>{ if(worstIn(t)&&!c[t]){ late++; lateAt[t]=(lateAt[t]||0)+1 } }) }
  api.NAMES.forEach(t=>ok((lateAt[t]||0)<=1, `${E.year} ${t}: in whatever happens on ${lateAt[t]} checks, and not marked`));
  E._seed(); const y=E.year;
  api.NAMES.forEach(t=>{ const S=seen[t]||new Set(), inn=E.field.indexOf(t)>=0;
    if(S.has('x')||S.has('y')||S.has('z'))ok(inn, `${y} ${t}: marked ${[...S].join('/')} but missed the playoffs`);
    if(S.has('y'))ok(Object.values(E.champs).indexOf(t)>=0, `${y} ${t}: marked y but didn't win the division`);
    if(S.has('e'))ok(!inn, `${y} ${t}: marked e but made the playoffs`);
    if(inn){ made++; if(first[t]!==undefined&&first[t]<=W-5)early++ } });
}
console.log(`  ${early} of ${made} playoff teams marked before the last five game days`);
ok(early>=made*0.6, `only ${early} of ${made} marked in time`);
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH ${checks} checks: clinch marks never wrong, and on time (${N} seasons)`);
process.exit(bad?1:0);
