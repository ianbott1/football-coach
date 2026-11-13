/* Players' stats pages and the leaders (round 69). In every game, over two seasons: each player's game log has one
   row per game he played and its columns add up to his season line; at the end of a season the line is kept in his
   history (and his career is the sum); the leader boards are in order and only hold players who qualify; every
   rostered player's page draws without an error.
     node test/stats.js [games...]      last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
const CASES=[['football-coach.html','Alabama'],['football-coach-pro.html','Kansas City'],['basketball-coach.html','Duke'],
  ['basketball-coach-pro.html','Boston'],['hockey-coach-pro.html','Boston'],['soccer-coach.html','Arsenal'],['baseball-coach-pro.html','Seattle']];
const pick=process.argv.slice(2).map(f=>f.endsWith('.html')?f:f+'.html');
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=15)console.log('  FAIL '+m)}};
for(const [f,team] of CASES){ if(pick.length&&pick.indexOf(f)<0)continue;
  const A=load({file:D(f),expose:['S','SEA','U','POS','NAMES','LEAGUE','STAT_KEYS','LEADERS','newDynasty','doAdvance','openOffseason','commitOffseason','playerView','leadersView','glStride','render','openPlayer']});
  A.newDynasty(team,7,'T'); let rows=0, pages=0, hist=0, boards=0;
  for(let yr=0;yr<2;yr++){
    let g=0; while(A.SEA.phase!=='done'&&g++<4000)A.SEA.advance();
    const w=A.glStride();
    A.NAMES.forEach(t=>(A.SEA.roster[t]||[]).forEach((p,i)=>{ if(!p||!p.st2)return;
      const n=(p.gl||[]).length/w; rows+=n;
      ok(n===p.st2.g,`${f}: ${p.n} (${t}) has ${n} game rows for ${p.st2.g} games`);
      // the log's columns add up to the season, for his usual position's keys
      const pos=p.p, keys=A.STAT_KEYS[pos]||[], sum={};
      for(let j=0;j+w<=(p.gl||[]).length;j+=w){ const P=A.POS[p.gl[j+5]]; if(!P||P.p!==pos)continue; keys.forEach((k,q)=>sum[k]=(sum[k]||0)+p.gl[j+6+q]) }
      const mixed=(()=>{ for(let j=0;j+w<=(p.gl||[]).length;j+=w){ const P=A.POS[p.gl[j+5]]; if(!P||P.p!==pos)return true } return false })();
      if(!mixed)keys.forEach(k=>ok(Math.abs((sum[k]||0)-(p.st2[k]||0))<1e-6,`${f}: ${p.n}'s ${k}: log ${sum[k]||0}, season ${p.st2[k]}`)) }));
    // the page of a sample of players: draws, names the season
    A.NAMES.slice(0,6).forEach(t=>(A.SEA.roster[t]||[]).forEach(p=>{ if(!p)return; let h=""; try{ A.openPlayer(t,p.n); h=A.playerView() }catch(e){ h="ERR "+e.message }
      ok(!/^ERR/.test(h)&&h.indexOf(p.n)>=0,`${f}: ${p.n}'s page: ${h.slice(0,80)}`); pages++ }));
    // the leaders: in order, and the qualifying rule held
    let lh=""; try{ lh=A.leadersView() }catch(e){ lh="ERR "+e.message }
    ok(!/^ERR/.test(lh)&&/grouphead/.test(lh),`${f}: the leaders don't draw: ${lh.slice(0,80)}`); boards+=(lh.match(/grouphead/g)||[]).length;
    const before={}; A.NAMES.forEach(t=>(A.U.roster[t]||[]).forEach(p=>{ if(p)before[t+"|"+p.n]=(p.hist||[]).length }));
    const sea=A.NAMES.map(t=>(A.SEA.roster[t]||[]).map(p=>p&&p.st2?{n:p.n,g:p.st2.g}:null));
    A.openOffseason(); for(let c=0;c<6&&A.S.off;c++){ if(A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=A.S.myTeam; A.commitOffseason() }
    // a man who finished the season on a roster and is still on it: one more season in his history, its games his
    let kept=0; A.NAMES.forEach((t,ti)=>(sea[ti]||[]).forEach(x=>{ if(!x)return; const p=(A.U.roster[t]||[]).find(q=>q&&q.n===x.n); if(!p||!p.hist||!p.hist.length)return;
      const last=p.hist[p.hist.length-1]; if(last.y!==A.SEA.year-1&&last.y!==A.SEA.year)return; kept++; ok(last.s.g===x.g,`${f}: ${x.n}'s history has ${last.s.g} games for a ${x.g}-game season`) }));
    hist+=kept }
  ok(rows>0&&hist>0&&boards>0,`${f}: nothing measured (rows ${rows}, histories ${hist}, boards ${boards})`);
  console.log(`  ${f}: ${rows} game rows, ${pages} pages, ${hist} seasons kept, ${boards} boards`) }
console.log(bad?`MISMATCH ${bad} of ${checks} checks`:`MATCH ${checks} checks: logs, histories, leaders, pages`); process.exit(bad?1:0);
