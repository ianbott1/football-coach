/* Hot seat: two coaches share a save for three seasons. Fingerprints every
   coach's history book so a refactor can be compared against a baseline.
     node test/hotseat.js [file.html] */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}}; new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const h=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0,16);
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const api=m.exports.load(file);
const LG=api.leagueId(), [TA,TB]=LG==='cfb'?['Alabama','Rice']:LG==='ncaab'?['Duke','North Carolina']:LG==='nba'?['Boston','New York']:['Kansas City','Tennessee'];
api.newDynasty(TA,99,'A',[{team:TA,name:'Coach A'},{team:TB,name:'Coach B'}]);
const out=[], crashes=[];
for(let y=0;y<3;y++){
  let guard=0;
  // every season starts with coach 1, and every game a coached team plays is
  // played live by a person (a head-to-head counts once)
  if((api.S.turn||0)!==0)crashes.push(`season ${api.SEA.year} starts with coach ${(api.S.turn||0)+1}, not coach 1`);
  const liveGames=[];
  while(api.SEA.phase!=='done'&&guard++<400){     // two coaches: two advances a step (an NBA season: 240)
    api.doAdvance(); let g=0;
    if(api.live)liveGames.push(api.live.step+'|'+[api.live.g.home,api.live.g.away].sort().join('~'));
    while(api.live&&!api.live.done&&g++<2000){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
  }
  { const E=api.SEA, coached=api.S.coaches.map((x,i)=>i===(api.S.turn||0)?api.S.myTeam:x.myTeam);
    // college championship week is kept in both the weeks and the postseason: count each game once
    const all=[...new Set([].concat(...E.weeks.map(w=>w.games),...E.postPools()))];
    coached.forEach(t=>{const played=all.filter(x=>x.home===t||x.away===t).length;
      const live=new Set(liveGames.filter(k=>k.split('|')[1].split('~').indexOf(t)>=0)).size;
      if(live<played){const liveOpp=new Set(liveGames.filter(k=>k.split('|')[1].split('~').indexOf(t)>=0).map(k=>k.split('|')[1]));
        const cnt={}; liveGames.filter(k=>k.split('|')[1].split('~').indexOf(t)>=0).forEach(k=>{const p=k.split('|')[1];cnt[p]=(cnt[p]||0)+1});
        const miss=all.filter(x=>x.home===t||x.away===t).filter(x=>{const p=[x.home,x.away].sort().join('~'); if(cnt[p]>0){cnt[p]--;return false} return true})
          .map(x=>(x.title||'regular season')+' '+x.away+' at '+x.home+' '+x.ap+'-'+x.hp);
        crashes.push(`${E.year}: ${t} played ${played} games, only ${live} of them with its coach (without: ${miss.join('; ')})`)}}); }
  // one coaching carousel per offseason, whichever coach's screen shows it
  const humansNow=api.S.coaches.map((x,i)=>i===(api.S.turn||0)?api.S.myTeam:x.myTeam);
  const coachBefore={}; api.NAMES.forEach(t=>coachBefore[t]=api.U.coach&&api.U.coach[t]?api.U.coach[t].n:null);
  const seen=[];
  api.openOffseason();
  for(let c=0;c<2;c++){
    const S=api.S; if(!S.off)break;
    seen.push(S.off.act.fired.slice().sort().join(',')); if(c===0)var poachedN=(S.off.act.poached||[]).length+(S.off.act.coordMoves||[]).length;
    if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||S.myTeam;
    api.commitOffseason();
  }
  if(seen.length===2&&seen[0]!==seen[1])crashes.push(`year ${api.SEA.year-1}: the two coaches saw different carousels`);
  const changed=api.NAMES.filter(t=>humansNow.indexOf(t)<0&&api.U.coach[t]&&coachBefore[t]&&api.U.coach[t].n!==coachBefore[t]).length;
  const firedN=seen[0]?seen[0].split(',').filter(Boolean).length:0;
  // a team changes coach when it fires one, when its job is filled by poaching
  // another team's coach, or when it promotes a coordinator from elsewhere
  if(changed>firedN+poachedN)crashes.push(`year ${api.SEA.year-1}: ${changed} computer-coached teams changed coach, but one carousel accounts for ${firedN+poachedN}`);
  // every coach's Dynasty tabs and every team page must draw
  const activeBefore=api.S.turn||0;
  for(let i=0;i<api.S.coaches.length;i++){
    api.stashCoach(); api.loadCoach(i);
    for(const d of ['program','teams','coaches','shared']){try{api.view('dyn',d)}catch(e){crashes.push(`year ${api.SEA.year-1}, coach ${i+1}, Dynasty/${d} crashed: ${e.message}`)}}
    try{api.teamPages()}catch(e){crashes.push(`year ${api.SEA.year-1}, coach ${i+1}, team pages crashed: ${e.message}`)}
  }
  api.stashCoach(); api.loadCoach(activeBefore);        // put back whoever was active
  const S=api.S;
  out.push({year:api.SEA.year-1, coaches:S.coaches.map(c=>({team:c.myTeam,
    last:c.history&&c.history.length?{rec:c.history[c.history.length-1].rec,result:c.history[c.history.length-1].result,grade:c.history[c.history.length-1].grade}:null,
    book:h(c.history)}))});
}
out.forEach(o=>console.log(' ',o.year,o.coaches.map(c=>c.team+' '+(c.last?c.last.rec+' "'+c.last.result+'" '+c.last.grade:'-')).join(' | ')));
if(crashes.length){crashes.slice(0,4).forEach(c=>console.log('  FAIL '+c)); console.log(`MISMATCH ${crashes.length} problem(s)`); process.exit(1)}
/* Same contract as golden.js: last line is MATCH or MISMATCH. */
const fp=h(out), REC=path.join(__dirname,LG==='cfb'?'hotseat.json':'hotseat-'+LG+'.json'), args=process.argv.slice(2);
if(args.includes('--write')){
  const ni=args.indexOf('--note'), note=ni>=0?args[ni+1]:null;
  if(!note){console.log('refusing to re-record without --note');console.log('MISMATCH (nothing recorded)');process.exit(1)}
  const prev=fs.existsSync(REC)?JSON.parse(fs.readFileSync(REC,'utf8')):{};
  fs.writeFileSync(REC,JSON.stringify({fp,log:(prev.log||[]).concat([{fp,from:prev.fp||null,note}]),out},null,1));
}
if(!fs.existsSync(REC)){console.log('MISMATCH no baseline for this league yet (record with --write --note)');process.exit(1)}
const want=JSON.parse(fs.readFileSync(REC,'utf8')).fp;
if(want===fp)console.log('MATCH '+fp);
else{console.log('MISMATCH '+want+' expected, got '+fp);process.exit(1)}
