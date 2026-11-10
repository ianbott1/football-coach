/* Live win probability, honest? (round 46) For each game: live games played to the end with every call left to the
   assistant, the shown chance recorded after every stretch, then sorted into bands: in each band the chance shown
   against how often that side won (a draw counts half where there are draws). Also fits each league's spread
   (LIVE_SIG) by likelihood, to check the constant in the build.
     node test/live-wp.js [games=120] [files...]     last line: MATCH (every band of 40+ states within 10 points at 200 games (the same model reads 2 to 9 by seed)) or MISMATCH */
const {load}=require('./harness.js'), path=require('path');
const NG=+(process.argv[2]||200);
const FILES=process.argv.slice(3).length?process.argv.slice(3):['football-coach.html','football-coach-pro.html','basketball-coach.html','basketball-coach-pro.html','hockey-coach-pro.html','soccer-coach.html','baseball-coach-pro.html'];
let bad=0;
for(const f of FILES){
  const rows=[]; let games=0, tries=0, A=null;
  for(let t=0;games<NG&&t<40;t++){
    A=load({file:path.join(__dirname,'..','dist',f),expose:['S','SEA','NAMES','newDynasty','doAdvance','live','liveTick','answerLive','liveChance','liveTau','liveScore','LEAGUE','LIVE_SIG','LIVE_MU','winProb','withPlan']});
    A.newDynasty(A.NAMES[(t*7+3+(+process.env.SEED||0))%A.NAMES.length],100+t+(+process.env.SEED||0)*1000,'T'); let g=0;
    while(games<NG&&g++<40&&A.SEA.phase==='week'){ A.doAdvance(); const L0=A.live; if(!L0)continue; let n=0;
      const meH=L0.g.home===A.S.myTeam, opp=meH?L0.g.away:L0.g.home;
      const pre=A.LEAGUE.wdl?A.withPlan('balanced',()=>A.LEAGUE.wdl(A.S.myTeam,opp,meH,!!L0.g.neutral)):[A.winProb(A.S.myTeam,opp,meH,!!L0.g.neutral),0];
      const ko=!!(L0.g.cup||L0.g.title||A.SEA.phase!=='week'); const st=[];
      while(A.live&&!A.live.done&&n++<3000){ const L=A.live; if(L.ask){ A.answerLive(L.ask.dp.opts[L.ask.dp.opts.length-1][0]); continue }
        const k=L.drives.length; A.liveTick(); if(A.live&&A.live.drives.length>k&&!A.live.done){ const d=A.live.drives[A.live.drives.length-1], sc=A.liveScore(d); if(sc[0]!==undefined)st.push([meH?sc[0]-sc[1]:sc[1]-sc[0],A.liveTau(d),d.q!==undefined?(d.home===meH?-1:1):0]) } }
      const L=A.live; if(!L||!L.done)continue; const d=L.drives[L.drives.length-1], sc=A.liveScore(d);
      let m=meH?sc[0]-sc[1]:sc[1]-sc[0]; if(L.g.pens||d.pens)m=0;
      const y=m>0?1:m<0?0:0.5; games++; st.forEach(([mm,tau,poss])=>rows.push({m:mm,tau,pre,y,ko,poss})) } }
  const id=A.LEAGUE.id, sig0=A.LIVE_SIG[id];
  if(process.env.PRE){ const G=[]; let last=null; rows.forEach(r=>{ if(r.pre!==last){ G.push(r); last=r.pre } }); [[0,0.3],[0.3,0.5],[0.5,0.7],[0.7,1]].forEach(([lo,hi])=>{ const R=G.filter(r=>r.pre[0]+r.pre[1]/2>=lo&&r.pre[0]+r.pre[1]/2<hi); if(R.length)console.log(`  pre-game ${lo}-${hi}: shown ${(100*R.reduce((s,r)=>s+r.pre[0]+r.pre[1]/2,0)/R.length).toFixed(0)} won ${(100*R.reduce((s,r)=>s+r.y,0)/R.length).toFixed(0)} (${R.length} games)`) }) }
  const val=(r,sig)=>{ const c=A.liveChance(r.m,r.tau,r.pre,sig,r.poss); return c[0]+c[1]/2 };   // the share of a win shown (draws half)
  const ll=sig=>rows.reduce((s,r)=>{ const p=Math.min(0.999,Math.max(0.001,val(r,sig))); return s+(r.y===1?Math.log(p):r.y===0?Math.log(1-p):0.5*Math.log(p)+0.5*Math.log(1-p)) },0);
  let best=sig0, bl=-Infinity; for(let k=0.4;k<=2.0;k+=0.05){ const sg=sig0*k, v=ll(sg); if(v>bl){bl=v;best=sg} }
  // and the pre-game edge's weight with it (LIVE_MU), when asked: FIT=1
  if(process.env.FIT){ const L=A.LIVE_MU; let bk=[1,sig0], bv=-Infinity; for(let lk=0.3;lk<=1.2;lk+=0.05)for(let k=0.6;k<=1.6;k+=0.05){ L[id]=lk; const v=ll(sig0*k); if(v>bv){bv=v;bk=[lk,sig0*k]} } delete L[id]; console.log(`  fit: pre-game edge x${bk[0].toFixed(2)}, sigma ${bk[1].toFixed(2)}`) }
  const bands=[[0,0.1],[0.1,0.3],[0.3,0.5],[0.5,0.7],[0.7,0.9],[0.9,1.01]], out=[]; let worst=0;
  bands.forEach(([lo,hi])=>{ const R=rows.filter(r=>{ const p=val(r,sig0); return p>=lo&&p<hi }); if(!R.length)return;
    const sh=R.reduce((s,r)=>s+val(r,sig0),0)/R.length, won=R.reduce((s,r)=>s+r.y,0)/R.length; if(R.length>=40)worst=Math.max(worst,Math.abs(sh-won));
    out.push(`${Math.round(lo*100)}-${Math.round(Math.min(hi,1)*100)}: shown ${(100*sh).toFixed(0)} won ${(100*won).toFixed(0)} (${R.length})`) });
  if(worst>0.10)bad++;   // states within a game move together: one model, three seeds of 300 pro football games, worst bands 1.8, 8.1 and 9.0
  console.log(`${f.padEnd(26)} ${games} games, ${rows.length} states | sigma ${sig0} (best fit ${best.toFixed(2)}) | worst band ${(100*worst).toFixed(1)} pts\n   ${out.join(' | ')}`);
}
console.log(bad?`MISMATCH ${bad}`:'MATCH the live chance is honest in all six (every band within 10 points)');
