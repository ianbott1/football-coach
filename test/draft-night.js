/* Draft night: what a pick made by hand is worth against the staff's (report; node test/draft-night.js [seeds])
   Each career plays one season, opens the offseason, and drafts five ways on the same draft:
     staff    no picks made (the board is empty, so the staff decide: a skipped draft night)
     scouts   at each pick, the best available by your scouts' numbers (now + 0.45 of the way to the ceiling)
     workout  the same, with the three workouts spent on the top three by your scouts at your first pick
     fit      the scouts' best among players your scouts say would make the roster
     oracle   the best available by the true numbers (the ceiling: nobody can do this)
   Worth of a pick: the true now + 0.45 x (ceiling - now), the staff's own scale. "Kept": would make the roster as it stands. */
const {load}=require('./harness.js'), path=require('path');
const D=f=>path.join(__dirname,'..','dist',f);
const SEEDS=+(process.argv[2]||12);
const games=[['football-coach-pro.html',['Chicago','Dallas','Denver','Miami']],['basketball-coach-pro.html',['Detroit','Boston','Utah','Phoenix']],['hockey-coach-pro.html',['Toronto','Calgary','Dallas','Seattle']]];
for(const [f,teams] of games){
  const tot={}, kept={}, n={}, gain={}; const pols=['staff','scouts','workout','fit','oracle'];
  pols.forEach(k=>{tot[k]=0;kept[k]=0;n[k]=0;gain[k]=0});
  let wkHit=0, wkN=0, R0=1;
  for(let s=0;s<SEEDS;s++){
    const A=load({file:D(f),expose:['S','SEA','U','newDynasty','openOffseason','draftNight','dnRead','dnVal','dnTeam','nflGain','nflPlace','BK','LEAGUE','dnWorkouts']});
    A.newDynasty(teams[s%teams.length],100+s,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<5000)A.SEA.advance(); A.openOffseason();
    if(A.S.off.act.userOpen)continue;
    const t=A.dnTeam(), P=A.S.off.picks, R=A.LEAGUE.offseason.draftRounds, Ro=A.U.roster[t]; R0=R;
    const worth=p=>p.r+(p.pot-p.r)*0.45;
    const keeps=p=>!Ro[p.i]||!Ro[A.BK(p.i)]||A.nflGain(Ro,p)>0.6;
    const run=(pol)=>{
      P.workouts=[]; const hand=[];
      for(let k=0;k<R;k++){
        const st=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:P.draft,board:[],hand:hand}},R,t);
        if(!st.stop)break;
        const av=st.prospects.filter(p=>!p.taken);
        const sv=p=>A.dnVal(A.dnRead(p.pid,t));
        if(pol==='workout'&&k===0){ av.slice().sort((a,b)=>sv(b)-sv(a)).slice(0,A.dnWorkouts()).forEach(p=>P.workouts.push(p.pid)) }
        let pick;
        if(pol==='staff')pick=st.stop.staff;
        else if(pol==='oracle')pick=av.slice().sort((a,b)=>worth(b)-worth(a))[0].pid;
        else if(pol==='fit'){ const ok=av.filter(p=>{ const x=A.dnRead(p.pid,t); return keeps(Object.assign({},p,{r:x.sr,pot:x.spot})) });
          pick=(ok.length?ok:av).slice().sort((a,b)=>sv(b)-sv(a))[0].pid }
        else pick=av.slice().sort((a,b)=>sv(b)-sv(a))[0].pid;
        hand.push(pick);
      }
      const fin=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:P.draft,board:[],hand:hand}},R,null);
      const Rx=Ro.slice();
      fin.picks.filter(d=>d.team===t).forEach(d=>{ const p=Object.assign({},fin.prospects.find(q=>q.pid===d.pid)); tot[pol]+=worth(p); kept[pol]+=keeps(p)?1:0; n[pol]++;
        // what he adds to the roster as it stands (true numbers, position-weighted: the staff's own measure), placed as the summer would
        const gn=A.nflGain(Rx,p); if(gn>0.6||!Rx[p.i]||!Rx[A.BK(p.i)]){ gain[pol]+=gn; A.nflPlace(Rx,p) } });
      return hand;
    };
    pols.forEach(run);
    // does a workout move the read closer to the truth?
    const C=A.U.draftClass; P.workouts=[]; const base=C.list.slice(0,40).map(p=>Math.abs(A.dnRead(p.pid,t).sr-p.r));
    P.workouts=C.list.slice(0,40).map(p=>p.pid); const sharp=C.list.slice(0,40).map(p=>Math.abs(A.dnRead(p.pid,t).sr-p.r));
    wkHit+=base.reduce((a,b)=>a+b,0)-sharp.reduce((a,b)=>a+b,0); wkN+=40;
  }
  console.log(f.replace('.html',''), `(${n.staff} picks)`);
  pols.forEach(k=>console.log(`  ${k.padEnd(8)} worth ${(tot[k]/n[k]).toFixed(2)} a pick (${(tot[k]/n[k]-tot.staff/n.staff>=0?'+':'')}${(tot[k]/n[k]-tot.staff/n.staff).toFixed(2)} on the staff), kept ${Math.round(100*kept[k]/n[k])}%, roster gain ${(gain[k]/(n[k]/R0)).toFixed(2)} a draft (${(gain[k]/(n[k]/R0)-gain.staff/(n.staff/R0)>=0?'+':'')}${(gain[k]/(n[k]/R0)-gain.staff/(n.staff/R0)).toFixed(2)})`));
  console.log(`  a workout cuts the scouts' error on "now" by ${(wkHit/wkN).toFixed(2)} points a player`);
}
