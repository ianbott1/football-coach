/* Hot seat: two coaches share a save for three seasons. Fingerprints every
   coach's history book so a refactor can be compared against a baseline.
     node test/hotseat.js [file.html] */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}}; new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const h=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0,16);
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const api=m.exports.load(file);
const LG=api.leagueId(), [TA,TB]=LG==='cfb'?['Alabama','Rice']:['Kansas City','Tennessee'];
api.newDynasty(TA,99,'A',[{team:TA,name:'Coach A'},{team:TB,name:'Coach B'}]);
const out=[], crashes=[];
for(let y=0;y<3;y++){
  let guard=0;
  while(api.SEA.phase!=='done'&&guard++<200){
    api.doAdvance(); let g=0;
    while(api.live&&!api.live.done&&g++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}
  }
  api.openOffseason();
  for(let c=0;c<2;c++){
    const S=api.S; if(!S.off)break;
    if(S.off.act.userOpen&&S.off.move===null)S.off.move=(S.off.jobs[0]&&S.off.jobs[0].team)||S.myTeam;
    api.commitOffseason();
  }
  // every coach's Dynasty tabs and every team page must draw
  for(let i=0;i<api.S.coaches.length;i++){
    api.stashCoach(); api.loadCoach(i);
    for(const d of ['program','teams','coaches','shared']){try{api.view('dyn',d)}catch(e){crashes.push(`year ${api.SEA.year-1}, coach ${i+1}, Dynasty/${d}: ${e.message}`)}}
    try{api.teamPages()}catch(e){crashes.push(`year ${api.SEA.year-1}, coach ${i+1}, team pages: ${e.message}`)}
  }
  api.stashCoach(); api.loadCoach(api.S.coaches.length-1);
  const S=api.S;
  out.push({year:api.SEA.year-1, coaches:S.coaches.map(c=>({team:c.myTeam,
    last:c.history&&c.history.length?{rec:c.history[c.history.length-1].rec,result:c.history[c.history.length-1].result,grade:c.history[c.history.length-1].grade}:null,
    book:h(c.history)}))});
}
out.forEach(o=>console.log(' ',o.year,o.coaches.map(c=>c.team+' '+(c.last?c.last.rec+' "'+c.last.result+'" '+c.last.grade:'-')).join(' | ')));
if(crashes.length){crashes.slice(0,4).forEach(c=>console.log('  CRASH '+c)); console.log(`MISMATCH ${crashes.length} screen(s) crashed`); process.exit(1)}
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
