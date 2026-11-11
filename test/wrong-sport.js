/* Words from the wrong sport (round 55). Each game was built by copying another, and what the copy left behind
   showed on screen: "won the Stanley Cup" in baseball, hockey's 84-game grades, football's strength range. A season
   in every game, every tab and sub-tab drawn several times, the live game screens, the offseason screens, team pages
   and season cards; the text of each is searched for words that belong to another sport (or another league of the
   same sport: no Super Bowl in college football, no March Madness in the NBA).
     node test/wrong-sport.js [games...]     last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const D=f=>path.join(__dirname,'..','dist',f);
// words that belong to one sport only
const SPORT_WORDS={
  football:["touchdowns?","quarterbacks?","field goals?","end zone","two-point","fourth downs?","first downs?","interceptions?","yards?","punts?","punter","kickoffs?","gridiron","linebackers?","wide receivers?","All-Pro"],
  basketball:["three-pointers?","free throws?","rebounds?","dunks?","tip-off","shot clock","buzzer-beater","point guards?","paint"],
  hockey:["Stanley Cup","goalies?","power plays?","pucks?","face-?offs?","penalty kill","ice time","on the ice","blue line","Zamboni","skaters?","defencem[ae]n","defensem[ae]n"],
  soccer:["Premier League","FA Cup","relegat\\w*","clean sheets?","Champions League","strikers?","goalkeepers?","kick-off","stoppage time","Football League"],
  baseball:["home runs?","World Series","innings?","strikeouts?","pitchers?","bullpen","RBIs?","at-bats?","grand slam","shortstops?","the pennant","batting"]
};
// words that belong to one league of a sport
const LEAGUE_WORDS={
  cfb:["Heisman","College Football Playoff","bowl games?","\\bCFP\\b","recruiting class"],
  nfl:["Super Bowl","\\bNFL\\b","\\bAFC\\b","\\bNFC\\b"],
  ncaab:["March Madness","Final Four","Sweet Sixteen","Elite Eight","NCAA tournament"],
  nba:["\\bNBA\\b","play-in","NBA Finals"],
  nhl:["\\bNHL\\b"], epl:[], mlb:["\\bMLB\\b"]
};
// words wrong in one league only (round 56: baseball's offseason is the winter, "the start of summer": Instinct)
const OWN_WRONG={mlb:["summers?"]};
// where a word is right in another league: the pros draft college players, so college talks of the pros
const ALLOW={cfb:["\\bNFL\\b"],ncaab:["\\bNBA\\b"]};
// club names that happen to hold another sport's word (AFC Wimbledon, Accrington Stanley + "Cup third round")
const NAMES_OK={epl:/\bAFC [A-Z][a-z]+|Accrington Stanley/g};
const GAMES={'football-coach.html':['football','cfb','Alabama'],'football-coach-pro.html':['football','nfl','Kansas City'],
  'basketball-coach.html':['basketball','ncaab','Duke'],'basketball-coach-pro.html':['basketball','nba','Boston'],
  'hockey-coach-pro.html':['hockey','nhl','Boston'],'soccer-coach.html':['soccer','epl','Arsenal'],'baseball-coach-pro.html':['baseball','mlb','Seattle']};
const pick=process.argv.slice(2).filter(f=>GAMES[f]||GAMES[f+'.html']).map(f=>GAMES[f]?f:f+'.html');
const strip=h=>String(h||'').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&mdash;|&#8212;/g,'\u2014').replace(/&[a-z]+;|&#\d+;/g,' ').replace(/\s+/g,' ');
let bad=0;
for(const [file,[sport,lg,team]] of Object.entries(GAMES)){ if(pick.length&&pick.indexOf(file)<0)continue;
  const words=[].concat(...Object.keys(SPORT_WORDS).filter(s=>s!==sport).map(s=>SPORT_WORDS[s].map(w=>[w,s])),
    ...Object.keys(LEAGUE_WORDS).filter(l=>l!==lg).map(l=>LEAGUE_WORDS[l].map(w=>[w,l])),(OWN_WRONG[lg]||[]).map(w=>[w,lg+' (wrong here)']));
  const allow=(ALLOW[lg]||[]).map(w=>new RegExp(w,'i'));
  const RX=words.filter(([w])=>!allow.some(a=>a.source===new RegExp(w,'i').source)).map(([w,s])=>[new RegExp('\\b'+w.replace(/^\\b|\\b$/g,'')+'\\b','i'),w,s]);
  // first the source: every string in this game's own layers (its sport's and its league's), shown this run or not.
  // Template expressions (${d.nfl}) and bare identifiers ("nfl") are code, not words.
  { const R=path.join(__dirname,'..','src'), dirs=[path.join(R,sport),path.join(R,'leagues',lg)];
    dirs.forEach(d=>fs.readdirSync(d).filter(f=>/\.js$/.test(f)).forEach(f=>{
      const s=fs.readFileSync(path.join(d,f),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:"'`\\])\/\/.*$/gm,'$1');
      (s.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)||[]).forEach(x=>{
        if(/^["'`][A-Za-z_$][\w$]*["'`]$/.test(x))return;
        let t=x.replace(/\$\{[^}]*\}/g,' ').replace(/(["'])[A-Za-z_$][\w$]*\1/g,' '); if(NAMES_OK[lg])t=t.replace(NAMES_OK[lg],' ');
        RX.forEach(([rx,w,o])=>{ if(rx.test(t)){ bad++; console.log(`  FAIL source ${path.relative(R,path.join(d,f))}: ${w} (${o}) in ${x.replace(/\s+/g,' ').slice(0,120)}`) } }) }) })) }
  const hits={}; let screens=0, chars=0;
  const scan=(h,where)=>{ let t=strip(h); if(NAMES_OK[lg])t=t.replace(NAMES_OK[lg],' '); screens++; chars+=t.length;
    RX.forEach(([rx,w,s])=>{ const m=rx.exec(t); if(m){ const k=w+' ('+s+')'; if(!hits[k])hits[k]={n:0,where,ex:t.slice(Math.max(0,m.index-70),m.index+70)}; hits[k].n++ } }) };
  const api=mk()(D(file)); global.window.scrollTo=()=>{}; global.window.innerWidth=390; api.newDynasty(team,6,'T');
  const app=()=>global.__nodes.app?global.__nodes.app.innerHTML:'';
  const tabs=when=>{ try{ (lg==='cfb'?api.allViews():['team','scores','poll','stand'].map(v=>api.view(v)).concat(['program','teams','coaches','shared'].map(d=>api.view('dyn',d)))).forEach(h=>scan(h,when)) }catch(e){ console.log(`  FAIL ${file}: drawing the tabs ${when}: ${e.message}`); bad++ }
    try{ scan(api.view('dyn','history'),when+' history') }catch(e){} };
  tabs('at the start');
  for(let year=0;year<2;year++){
    let g=0, lives=0;
    while(api.SEA.phase!=='done'&&g++<700){ api.doAdvance(); let n=0;
      if(api.live)lives++;
      while(api.live&&!api.live.done&&n++<1200){ if(lives%3===1&&n%4===0){ api.render(); scan(app(),'a live game') }
        api.live.ask?api.answerLive(api.live.ask.dp.opts[n%api.live.ask.dp.opts.length][0]):api.liveTick() }
      if(api.live){ api.render(); scan(app(),'after a game') }
      if(g%15===0)tabs(`in ${api.SEA.phase} ${api.SEA.step}`) }
    tabs('at the end of the season');
    try{ api.teamPages().forEach(h=>scan(h,'a team page')); api.cards().forEach(([t,s])=>{ scan(t,'a season card'); scan(s,'a season card picture') }) }catch(e){}
    try{ api.openOffseason(); for(let c=0;c<6&&api.S.off;c++){ api.render(); scan(app(),'the offseason, step '+c);
        if(api.S.off.act&&api.S.off.act.userOpen&&api.S.off.move===null)api.S.off.move=api.S.myTeam; api.commitOffseason() }
      api.render(); scan(app(),'after the offseason') }catch(e){ console.log(`  FAIL ${file}: the offseason: ${e.message}`); bad++ }
  }
  const ks=Object.keys(hits);
  console.log(`${file.padEnd(26)} ${screens} screens, ${(chars/1e6).toFixed(1)}M characters: ${ks.length?ks.length+' wrong-sport words':'clean'}`);
  ks.forEach(k=>{ bad++; console.log(`  FAIL ${k} x${hits[k].n}, first ${hits[k].where}: "...${hits[k].ex}..."`) });
}
console.log(bad?`MISMATCH ${bad} wrong-sport words on screen`:'MATCH every game speaks its own sport'); process.exit(bad?1:0);
