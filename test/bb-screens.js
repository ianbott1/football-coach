/* College basketball: every screen draws through two seasons (every step, every
   call, all tabs mid-season and at the end, every Dynasty page, the offseason
   screen, every team page), and none of them speaks football.
     node test/bb-screens.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
(async()=>{const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','basketball-coach.html'); const api=m.exports.load(file);api.newDynasty('Gonzaga',5,'T');
const pages=[]; const grab=(lab)=>pages.push([lab,(global.__nodes.app?global.__nodes.app.innerHTML:'')]);
for(let y=0;y<2;y++){let g=0;while(api.SEA.phase!=='done'&&g++<80){api.doAdvance();grab('step '+api.SEA.phase);let n=0;while(api.live&&!api.live.done&&n++<400){if(api.live.ask){grab('call');api.answerLive(api.live.ask.dp.opts[0][0])}else{api.liveTick()}}
  if(api.SEA.step===12){['team','scores','poll','stand'].forEach(v=>pages.push(['view '+v,api.view(v)]));['program','teams','coaches','shared'].forEach(d=>pages.push(['dyn '+d,api.view('dyn',d)]))}
  await new Promise(r=>setImmediate(r))}
 ['team','scores','poll','stand'].forEach(v=>pages.push(['end '+v,api.view(v)]));
 api.openOffseason();grab('offseason');api.commitOffseason();grab('after offseason');}
pages.push(['team pages',api.teamPages().join('')]);
const W=/\b(?<!slow it )(?<!Slow it )(touchdowns?|yards?|quarterbacks?|QB|bowls?|Heisman|field goals?|punts?|kickoffs?|end zone|gridiron|playoff|CFP|trenches|linemen|offensive line|defensive line|tailback|receivers?|sacks?|interceptions?|fumbles?|Saturdays?|NFL|scrimmage|down and)\b/gi;   // ("Slow it down and" is basketball)
const hits={};pages.forEach(([lab,h])=>{const t=h.replace(/<[^>]+>/g,' ');let mm;while((mm=W.exec(t))){const k=mm[0].toLowerCase();const ctx=t.slice(Math.max(0,mm.index-50),mm.index+40).replace(/\s+/g,' ');(hits[k]=hits[k]||[]).push(lab+': ...'+ctx+'...')}});
Object.keys(hits).forEach(k=>{console.log(k,'x'+hits[k].length);[...new Set(hits[k])].slice(0,2).forEach(x=>console.log('    ',x.slice(0,150)))});
const n=Object.keys(hits).length;
console.log(n?`MISMATCH football wording on ${n} kind(s) of word`:`MATCH ${pages.length} screens drew, none speaks football`); process.exit(n?1:0);})().catch(e=>{console.log('MISMATCH a screen crashed: '+e.message);process.exit(1)});
