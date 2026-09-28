/* Pro hockey: every screen draws through two seasons (every step, every
   call, all tabs mid-season and at the end, every Dynasty page, the offseason
   screen, every team page), and none of them speaks football.
     node test/bb-screens.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
(async()=>{
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','hockey-coach-pro.html'); const api=m.exports.load(file);
// the title screen, before a career starts: it must be basketball's
const title=api.titleHTML();
if(!/wm-a">Hockey</.test(title)||/football/i.test(title.replace(/<[^>]+>/g,' '))){console.log('MISMATCH the title screen is not basketball\'s: '+title.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,120));process.exit(1)}
api.newDynasty(process.env.TEAM||'Boston',5,'T');
const pages=[['title',title]]; const grab=(lab)=>pages.push([lab,(global.__nodes.app?global.__nodes.app.innerHTML:'')]);
for(let y=0;y<2;y++){let g=0;while(api.SEA.phase!=='done'&&g++<600){api.doAdvance();grab('step '+api.SEA.phase);
  if(api.SEA.phase==='open'&&!api.live&&!pages.some(p=>p[0]==='selection sunday '+api.SEA.year)){pages.push(['selection sunday '+api.SEA.year,api.view('scores')]); if(!/You're in|So close|Not this year/.test(pages[pages.length-1][1]))pages.push(['selection sunday','CRASH-MARK: no reveal'])}let n=0;while(api.live&&!api.live.done&&n++<400){if(api.live.ask){grab('call');api.answerLive(api.live.ask.dp.opts[0][0])}else{api.liveTick()}}
  if(api.SEA.step===12){['team','scores','poll','stand'].forEach(v=>pages.push(['view '+v,api.view(v)]));['program','teams','coaches','shared'].forEach(d=>pages.push(['dyn '+d,api.view('dyn',d)]))}
  await new Promise(r=>setImmediate(r))}
 ['team','scores','poll','stand'].forEach(v=>pages.push(['end '+v,api.view(v)]));
 api.openOffseason();grab('offseason');
 // always check the assistant-hire section (it only appears when one leaves)
 if(api.S.off){const SC=api.S.off.staff=api.S.off.staff||{}; ['oc','dc'].forEach(k=>{if(!SC[k])SC[k]=[{n:'Test Assistant',q:10,s:'Motion offense',grade:'solid'}]});
   pages.push(['offseason, assistants leaving',api.view('team')]); delete api.S.off.staff}api.commitOffseason();grab('after offseason');}
pages.push(['team pages',api.teamPages().join('')]);
// after two seasons the record book has basketball leaders and career lines
{ const prog=api.view('dyn','program').replace(/<[^>]+>/g,' ');
  if(!/Points/.test(prog)||!/\d[\d,]* points/.test(prog)){console.log('MISMATCH the record book has no basketball leaders or career lines');process.exit(1)} }
const W=/\b(?<!slow it )(?<!Slow it )(touchdowns?|yards?|quarterbacks?|QB|bowls?|Heisman|field goals?|punts?|kickoffs?|end zone|gridiron|CFP|trenches|linemen|offensive line|defensive line|tailback|receivers?|sacks?|interceptions?|fumbles?|Saturdays?|NFL|scrimmage|down and|coordinators?|side of the ball|Super Bowl|baskets?|rebounds?|dribbl\w*|tip-?off|court|NBA|play-in|three-pointers?|free throws?|layups?|point guards?)\b/gi;   // ("Slow it down and" is basketball)
const hits={};pages.forEach(([lab,h])=>{const t=h.replace(/<[^>]+>/g,' ');let mm;while((mm=W.exec(t))){const k=mm[0].toLowerCase();const ctx=t.slice(Math.max(0,mm.index-50),mm.index+40).replace(/\s+/g,' ');(hits[k]=hits[k]||[]).push(lab+': ...'+ctx+'...')}});
Object.keys(hits).forEach(k=>{console.log(k,'x'+hits[k].length);[...new Set(hits[k])].slice(0,2).forEach(x=>console.log('    ',x.slice(0,150)))});
if(pages.some(p=>p[1]==='CRASH-MARK: no reveal')){console.log('MISMATCH the Selection Sunday reveal is missing');process.exit(1)}
const n=Object.keys(hits).length;
console.log(n?`MISMATCH football wording on ${n} kind(s) of word`:`MATCH ${pages.length} screens drew, none speaks football or basketball`); process.exit(n?1:0);})().catch(e=>{console.log('MISMATCH a screen crashed: '+e.message);process.exit(1)});
