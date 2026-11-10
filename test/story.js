/* The season story (round 41): a season of live games in each listed game, then checks that the Film Room keeps only
   graded situation calls (never a read, which its card judges right or wrong), the season's comeback and collapse
   reach its history entry, the head-to-head with coaches counts real games, and title night renders.
     node test/story.js     last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path'); let bad=0, checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; console.log('  FAIL '+m)}};
for(const [f,team] of [['basketball-coach-pro.html','Oklahoma City'],['hockey-coach-pro.html','Colorado'],['football-coach-pro.html','Kansas City'],['soccer-coach.html','Arsenal'],['baseball-coach-pro.html','Seattle']]){
  const A=load({file:path.join(__dirname,'..','dist',f),expose:['S','SEA','U','NAMES','newDynasty','doAdvance','live','liveTick','answerLive','openOffseason','commitOffseason','filmRoomHTML','titleNightHTML','rivalLine','READ_KINDS']});
  A.newDynasty(team,5,'T'); let g=0, readK={}, games=0;
  while(A.SEA.phase!=='done'&&g++<900){ A.doAdvance(); let n=0,was=false; while(A.live&&!A.live.done&&n++<1500){ was=true; const L=A.live; if(L.ask){ A.answerLive(L.ask.dp.opts[(n+g)%L.ask.dp.opts.length][0]) } else A.liveTick() }
    if(was)games++; }
  Object.values(A.S.played||{}).flat().forEach(p=>(p.reads||[]).forEach(r=>readK[r.k]=1));
  const F=A.S.film||[]; ok(F.every(x=>Math.abs(x.w)>=4),`${f}: a film entry under 4 points`); ok(F.every(x=>!x.k||!readK[x.k]),`${f}: a read in the Film Room (${(F.find(x=>x.k&&readK[x.k])||{}).k})`);
  const yr=A.SEA.year, st0=A.S.storyYr&&A.S.storyYr[yr], st=st0&&(st0.cb||st0.cl)?st0:null;
  A.openOffseason(); for(let c=0;c<8&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
  const h=A.S.history.find(x=>x.year===yr); ok(!st||(h&&JSON.stringify(h.story)===JSON.stringify(st)),`${f}: the season's story didn't reach its history entry`);
  const R=A.S.rivals||{}, met=Object.values(R).reduce((a,r)=>a+r.w+r.l+r.d,0); ok(met>0,`${f}: no head-to-head with any coach`);
  const seasonGames=A.S.history.find(x=>x.year===yr); ok(met<=200,`${f}: ${met} meetings in one season`);
  const html=A.filmRoomHTML(); ok(/Film Room/.test(html)||!F.length,`${f}: no Film Room with ${F.length} entries`); ok(!/undefined|NaN|null/.test(html),`${f}: the Film Room reads "${html.replace(/<[^>]+>/g,' ').slice(0,120)}"`);
  const tn=A.titleNightHTML(A.S.myTeam); ok(/Champions/.test(tn)&&!/undefined|NaN/.test(tn),`${f}: title night reads "${tn.replace(/<[^>]+>/g,' ').slice(0,120)}"`);
  console.log(`${f.padEnd(26)} ${games} live games | film ${F.length} | story ${JSON.stringify(st||{}).length>2?'yes':'none'} | coaches met ${Object.keys(R).length} (${met} games)`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks`:`MATCH ${checks} checks: the season story keeps what it should`); process.exit(bad?1:0);
