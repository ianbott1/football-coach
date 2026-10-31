/* The board's objectives, in all six games: three a season (or as many as
   apply), the same after a reload, and set so they mean something: across
   careers (your games left to your assistant) each kind is met somewhere
   between a fifth and four-fifths of the time, half or so overall.
     node test/objectives.js [seasons=3] */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||3);
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; console.log('  FAIL '+msg)}};
const EXP=['S','SEA','seasonObjectives','objStatus','objectivesMet','newDynasty','openOffseason','commitOffseason','NAMES','LEAGUE'];
const all={};
for(const file of ['football-coach.html','football-coach-pro.html','basketball-coach.html','basketball-coach-pro.html','hockey-coach-pro.html','soccer-coach.html']){
  const name=file.replace('.html',''), K={};
  for(const pick of [0.1,0.35,0.6,0.85]){
    const A=load({file:D(file),expose:EXP}); A.newDynasty(A.NAMES[Math.floor(A.NAMES.length*pick)],13,'T');
    for(let y=0;y<N;y++){
      const my=A.S.myTeam, L=A.seasonObjectives(my);
      ok(L.length>=2&&L.length<=3,`${name}: ${L.length} objectives`);
      // the same objectives from scratch (a reload, a hot seat)
      const keep=JSON.stringify(L); A.S.obj=null; ok(JSON.stringify(A.seasonObjectives(my))===keep,`${name}: objectives change when worked out again`);
      let g=0; while(A.SEA.phase!=='done'&&g++<400)A.SEA.advance();
      L.forEach(o=>{ const s=A.objStatus(o,my).s; ok(s==='met'||s==='miss',`${name}: "${o.l}" still open at the end`);
        K[o.k]=K[o.k]||[0,0]; K[o.k][1]++; if(s==='met')K[o.k][0]++ });
      A.openOffseason(); for(let c=0;c<4;c++){const S=A.S; if(!S.off)break; if(S.off.act.userOpen&&S.off.move===null)S.off.move=S.myTeam; A.commitOffseason()}
    }
  }
  const tot=Object.values(K).reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]);
  console.log(`  ${name.padEnd(22)} met ${(100*tot[0]/tot[1]).toFixed(0)}% overall · `+Object.entries(K).map(([k,v])=>`${k} ${v[0]}/${v[1]}`).join(', '));
  Object.entries(K).forEach(([k,v])=>{ all[k]=all[k]||[0,0]; all[k][0]+=v[0]; all[k][1]+=v[1] });
}
Object.entries(all).forEach(([k,v])=>{ const r=v[0]/v[1]; ok(v[1]<8||(r>=0.2&&r<=0.8),`"${k}" objectives met ${(100*r).toFixed(0)}% of the time`) });
const T=Object.values(all).reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]);
console.log(`  all games: met ${(100*T[0]/T[1]).toFixed(0)}% · `+Object.entries(all).map(([k,v])=>`${k} ${(100*v[0]/v[1]).toFixed(0)}%`).join(', '));
ok(T[0]/T[1]>0.35&&T[0]/T[1]<0.65,'overall share met outside 35-65%');
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: objectives are stable and mean something`);
process.exit(bad?1:0);
