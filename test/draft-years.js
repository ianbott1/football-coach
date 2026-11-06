/* Draft night over years (report; node test/draft-years.js [seeds] [seasons]):
   the same career, drafted every summer by one policy, played on; compare the teams after several drafts.
   Policies as in draft-night.js: staff (no picks made), scouts, oracle (true numbers: the ceiling).
   Measured at the end: your starters' mean rating, and wins in the last two seasons. */
const {load}=require('./harness.js'), path=require('path');
const D=f=>path.join(__dirname,'..','dist',f);
const SEEDS=+(process.argv[2]||16), YRS=+(process.argv[3]||5), ONLY=process.argv[4];
const games=[['football-coach-pro.html',['Chicago','Dallas','Denver','Miami']],['basketball-coach-pro.html',['Detroit','Boston','Utah','Phoenix']],['hockey-coach-pro.html',['Toronto','Calgary','Dallas','Seattle']]].filter(g=>!ONLY||g[0].indexOf(ONLY)===0);
for(const [f,teams] of games){
  const pols=(process.env.POLS||'staff,scouts,smart,oracle').split(','), res={}; pols.forEach(k=>res[k]={st:0,w:0,n:0});
  for(let s=0;s<SEEDS;s++){
    const out={};
    for(const pol of pols){
      const A=load({file:D(f),expose:['S','SEA','U','newDynasty','openOffseason','commitOffseason','draftNight','dnRead','dnVal','dnTeam','LEAGUE','POS','dnWorkouts']});
      A.newDynasty(teams[s%teams.length],200+s,'T'); let wins=0, ok=true;
      for(let y=0;y<YRS;y++){
        let g=0; while(A.SEA.phase!=='done'&&g++<6000)A.SEA.advance();
        if(y>=YRS-2)wins+=A.SEA.rec[A.S.myTeam][0];
        if(y===YRS-1)break;
        A.openOffseason(); if(A.S.off.act.userOpen){ A.S.off.act.userOpen=false; A.S.off.move=null }   // kept in the job: the comparison is about the draft, not the firing
        const t=A.dnTeam(), P=A.S.off.picks, R=A.LEAGUE.offseason.draftRounds; const hand=[];
        P.workouts=[];
        if(pol!=='staff')for(let k=0;k<R;k++){
          const st=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:P.draft,board:[],hand:hand,workouts:P.workouts}},R,t); if(!st.stop)break;
          const av=st.prospects.filter(p=>!p.taken), worth=p=>p.r+(p.pot-p.r)*0.45, sv=p=>A.dnVal(A.dnRead(p.pid,t));
          // smart: the three workouts on the top three by your scouts at your first pick, then the best read
          // smart: at each pick while workouts last, work out the best "unsure" read among your top eight, then take the best read
          if(pol==='smart'&&P.workouts.length<A.dnWorkouts()){ const c=av.slice().sort((a,b)=>sv(b)-sv(a)).slice(0,8).find(p=>A.dnRead(p.pid,t).unsure); if(c)P.workouts.push(c.pid) }
          hand.push((pol==='oracle'?av.sort((a,b)=>worth(b)-worth(a)):av.sort((a,b)=>sv(b)-sv(a)))[0].pid) }
        P.hand=pol==='staff'?null:hand;
        for(let c=0;c<4&&A.S.off;c++)A.commitOffseason();
      }
      if(!ok){ out[pol]=null; continue }
      const Ro=A.U.roster[A.S.myTeam].slice(0,A.POS.length).filter(Boolean);
      out[pol]={st:Ro.reduce((a,p)=>a+p.r,0)/Ro.length,w:wins/2};
    }
    if(pols.some(k=>!out[k]))continue;                    // fired in one of them: skip the career for all
    pols.forEach(k=>{res[k].st+=out[k].st;res[k].w+=out[k].w;res[k].n++});
  }
  console.log(f.replace('.html',''),`(${res.staff.n} careers, ${YRS} seasons, ${YRS-1} drafts)`);
  pols.forEach(k=>console.log(`  ${k.padEnd(7)} starters ${(res[k].st/res[k].n).toFixed(2)} (${((res[k].st-res.staff.st)/res[k].n>=0?'+':'')}${((res[k].st-res.staff.st)/res[k].n).toFixed(2)}), wins a season over the last two ${(res[k].w/res[k].n).toFixed(1)} (${((res[k].w-res.staff.w)/res[k].n>=0?'+':'')}${((res[k].w-res.staff.w)/res[k].n).toFixed(1)})`));
}
