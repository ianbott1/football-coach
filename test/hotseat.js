/* Hot seat: two coaches share a save for three seasons. Fingerprints every
   coach's history book so a refactor can be compared against a baseline.
     node test/hotseat.js [file.html] */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}}; new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const h=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0,16);
const file=process.argv[2]||path.join(__dirname,'..','dist','football-coach.html');
const api=m.exports.load(file);
api.newDynasty('Alabama',99,'A',[{team:'Alabama',name:'Coach A'},{team:'Rice',name:'Coach B'}]);
const out=[];
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
  const S=api.S;
  out.push({year:api.SEA.year-1, coaches:S.coaches.map(c=>({team:c.myTeam,
    last:c.history&&c.history.length?{rec:c.history[c.history.length-1].rec,result:c.history[c.history.length-1].result,grade:c.history[c.history.length-1].grade}:null,
    book:h(c.history)}))});
}
console.log(h(out)); out.forEach(o=>console.log(' ',o.year,o.coaches.map(c=>c.team+' '+(c.last?c.last.rec+' "'+c.last.result+'" '+c.last.grade:'-')).join(' | ')));
