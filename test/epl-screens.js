/* English football: every screen draws through two seasons (every step, every
   call, all tabs mid-season and at the end, every Dynasty page, the offseason
   screen, every team page), and none of them speaks football.
     node test/bb-screens.js [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
(async()=>{
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','soccer-coach.html'); const api=m.exports.load(file);
// the title screen, before a career starts: it must be English football's
const title=api.titleHTML();
if(!/wm-a">Soccer</.test(title)||/\b(Heisman|NFL|NBA|NHL|Stanley Cup|pucks?|goalies?|baskets?|touchdowns?|quarterbacks?)\b/i.test(title.replace(/<[^>]+>/g,' '))){console.log('MISMATCH the title screen isn\'t football\'s: '+title.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,120));process.exit(1)}
api.newDynasty(process.env.TEAM||'Arsenal',5,'T');
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
  // (only once someone with goals has left: squads turn over slowly)
  const gone=((api.U.alumni||{})[api.S.myTeam]||[]).some(a=>a.car&&a.car.goals>0);
  if(gone&&/Record book/.test(prog)&&(!/Goals/.test(prog)||!/\d[\d,]* goals?/.test(prog))){console.log('MISMATCH the record book has no football leaders or career lines ('+api.S.myTeam+': '+prog.replace(/\s+/g,' ').slice(prog.indexOf('Record book'),prog.indexOf('Record book')+200)+')');process.exit(1)} }
const W=/\b(field goals?|end zone|Heisman|Super Bowl|touchdowns?|quarterbacks?|QB|yards?|NFL|baskets?|rebounds?|dribbl\w*|tip-?off|court|NBA|play-in|three-pointers?|free throws?|layups?|point guards?|pucks?|goalies?|Stanley Cup|wild cards?|power plays?|NHL|OTL|periods?|shootouts?|hat trick|coordinators?|side of the ball|Game day|skate|rinks?|intermissions?|overtime|zamboni|centre ice)\b/gi;   // ("Slow it down and" is basketball)
const hits={};pages.forEach(([lab,h])=>{const t=h.replace(/<[^>]+>/g,' ');let mm;while((mm=W.exec(t))){const k=mm[0].toLowerCase();const ctx=t.slice(Math.max(0,mm.index-50),mm.index+40).replace(/\s+/g,' ');(hits[k]=hits[k]||[]).push(lab+': ...'+ctx+'...')}});
Object.keys(hits).forEach(k=>{console.log(k,'x'+hits[k].length);[...new Set(hits[k])].slice(0,2).forEach(x=>console.log('    ',x.slice(0,150)))});
if(pages.some(p=>p[1]==='CRASH-MARK: no reveal')){console.log('MISMATCH the Selection Sunday reveal is missing');process.exit(1)}
const n=Object.keys(hits).length;
console.log(n?`MISMATCH football wording on ${n} kind(s) of word`:`MATCH ${pages.length} screens drew, none speaks another sport`); process.exit(n?1:0);})().catch(e=>{console.log('MISMATCH a screen crashed: '+e.message);process.exit(1)});
