/* The pro league: rules every season must obey, and how it plays against
   real NFL numbers. Plays long careers (CPU league, one user team on
   default choices) and many single seasons.
     node test/nfl.js [file.html] [careers=4] [years=12]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const args=process.argv.slice(2);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach-pro.html');
const nums=args.filter(a=>/^\d+$/.test(a)).map(Number); const CAREERS=nums[0]||4, YEARS=nums[1]||12;
let bad=0; const broke=(msg)=>{bad++; if(bad<=12)console.log('  FAIL '+msg)};
const M={games:0,fav:0,favN:0,margin:0,pts:0,homeW:0,homeG:0,unbeaten:0,winless:0,w13:0,seasons:0,
  mvp:{},champs:[],repeat:0,payroll:[],overCap:0,ageSum:0,ageN:0,rSum:0,rN:0,starterR:[],yearsR:{},topR:[]};
const views=['team','scores','poll','stand','dyn'];
(async()=>{
for(let c=0;c<CAREERS;c++){
  const api=mk()(file); const team=['Kansas City','Detroit','Tennessee','NY Giants','Seattle','Miami'][c%6];
  api.newDynasty(team,1000+c*77,'T'); let prevChamp=null;
  for(let y=0;y<YEARS;y++){
    let g=0; while(api.SEA.phase!=='done'&&g++<60){api.doAdvance();let n=0;
      while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
      await new Promise(r=>setImmediate(r));}          // let saves finish, as a browser does between clicks
    const E=api.SEA, U=api.U, NAMES=api.NAMES, yr=E.year;
    // --- rules ---
    const cnt={}, wk={}; NAMES.forEach(t=>{cnt[t]=0;wk[t]=new Set()});
    E.weeks.forEach((W,i)=>W.games.forEach(x=>{[x.home,x.away].forEach(t=>{cnt[t]++; if(wk[t].has(i))broke(`${yr} ${t} twice in week ${i+1}`); wk[t].add(i)})}));
    NAMES.forEach(t=>{if(cnt[t]!==17)broke(`${yr} ${t} played ${cnt[t]} games`);
      if(E.rec[t][0]+E.rec[t][1]!==17)broke(`${yr} ${t} record ${E.rec[t]} is not 17 games`)});
    if(E.field.length!==14)broke(`${yr} playoff field of ${E.field.length}`);
    const pg=E.postPools().reduce((s,p)=>s+p.length,0); if(pg!==13)broke(`${yr} ${pg} playoff games`);
    if(!E.champion)broke(`${yr} no champion`);
    ['AFC','NFC'].forEach(sd=>{const f=E.side[sd]; if(!f||f.length!==7)broke(`${yr} ${sd} has ${f&&f.length} seeds`);
      else{const divs=new Set(f.slice(0,4).map(t=>api.CONF?0:0));}});
    views.forEach(v=>{try{api.view(v)}catch(e){broke(`${yr} view ${v} throws: ${e.message}`)}});
    // --- measure the season ---
    M.seasons++; if(process.env.TRACE)console.error('career',c,'year',yr,'save KB',(JSON.stringify(api.S).length/1024)|0);
    // favourite: higher preseason public rating plus home field
    const H=api.LEAGUE_HFA();
    E.weeks.forEach(W=>W.games.forEach(x=>{const eh=E.preseason[x.home]+(x.neutral?0:H), ea=E.preseason[x.away];
      if(eh!==ea){M.favN++; if((eh>ea)===(x.winner===x.home))M.fav++}}));
    E.weeks.forEach(W=>W.games.forEach(x=>{M.games++; M.pts+=x.hp+x.ap; M.margin+=Math.abs(x.hp-x.ap);
      if(!x.neutral){M.homeG++; if(x.winner===x.home)M.homeW++}}));
    NAMES.forEach(t=>{const w=E.rec[t][0]; if(w===17)M.unbeaten++; if(w===0)M.winless++; if(w>=13)M.w13++});
    const mv=E.mvpRace(1)[0]; if(mv)M.mvp[mv.p]=(M.mvp[mv.p]||0)+1;
    if(E.champion===prevChamp)M.repeat++; prevChamp=E.champion; M.champs.push(E.champion);
    // --- offseason ---
    api.openOffseason(); const S=api.S;
    if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||S.myTeam;
    if(api.offseasonBlock()!==null)broke(`${yr} the default offseason choices are blocked: ${api.offseasonBlock()}`);
    const yBefore=api.SEA.year;
    try{api.commitOffseason()}catch(e){broke(`${yr} offseason throws: ${e.message}`);break}
    if(api.SEA.year!==yBefore+1){broke(`${yr} the offseason did not advance`);break}
    try{api.view('team')}catch(e){broke(`${yr} offseason banner throws: ${e.message}`)}
    const U2=api.U; let yrR=0;
    NAMES.forEach(t=>{const R=U2.roster[t];
      if(!R||R.length!==20||R.some(p=>!p))broke(`${yr+1} ${t} roster has ${R?R.filter(Boolean).length:0} players`);
      const pay=R.reduce((s,p)=>s+(p&&p.k?p.k.sal:0),0); M.payroll.push(pay); if(pay>api.LEAGUE_CAP()+0.05){M.overCap++;broke(`${yr+1} ${t} payroll ${pay.toFixed(1)} over the cap`)}
      R.forEach((p,i)=>{if(!p)return; M.ageSum+=p.age; M.ageN++; if(i<10){M.rSum+=p.r; M.rN++; yrR+=p.r}
        if(p.age<20||p.age>40)broke(`${t} has a ${p.age}-year-old`); if(!(p.k&&p.k.yrs>=1))broke(`${t} ${p.n} has no contract`)});
      if(R[0])M.topR.push(R[0].r);
    });
    M.yearsR[yr+1]=(yrR/(NAMES.length*10)).toFixed(1);
  }
}
const pct=x=>(100*x).toFixed(1)+'%';
const pays=M.payroll.slice().sort((a,b)=>a-b), q=f=>pays[Math.floor(f*(pays.length-1))];
console.log(`${M.seasons} seasons, ${M.games} regular-season games`);
console.log(`favourite win rate   ${(M.fav/M.favN).toFixed(3)}        (NFL ~0.63-0.66, by preseason rating)`);
console.log(`home win rate        ${pct(M.homeW/M.homeG)}        (NFL ~55%)`);
console.log(`mean margin          ${(M.margin/M.games).toFixed(1)}          (NFL ~10-11)`);
console.log(`points per game      ${(M.pts/M.games).toFixed(1)}          (NFL ~44-46)`);
console.log(`13+ win teams/season ${(M.w13/M.seasons).toFixed(2)}         (NFL ~2-4)`);
console.log(`17-0 / 0-17 per 100  ${(100*M.unbeaten/M.seasons).toFixed(1)} / ${(100*M.winless/M.seasons).toFixed(1)}   (NFL ~0 / ~1)`);
console.log(`repeat champions     ${pct(M.repeat/Math.max(1,M.seasons-CAREERS))}        (NFL ~10%)`);
console.log(`MVP by position      ${Object.entries(M.mvp).sort((a,b)=>b[1]-a[1]).map(([p,n])=>p+' '+pct(n/M.seasons)).join(' / ')}   (NFL QB ~85-90%)`);
console.log(`payroll $M           min ${q(0).toFixed(0)} / median ${q(0.5).toFixed(0)} / max ${q(1).toFixed(0)} of cap ${mk()(file).LEAGUE_CAP()}; over cap ${M.overCap}`);
console.log(`players              mean age ${(M.ageSum/M.ageN).toFixed(1)}; starters mean rating by year ${Object.values(M.yearsR).join(' ')}`);
console.log(bad?`MISMATCH ${bad} rule violation(s)`:'MATCH every rule held');
process.exit(bad?1:0);
})();
