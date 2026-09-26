/* Pro offseason, free-agent targets: the screen lists likely free agents;
   every target you mark ends up either signed (on your roster, at the
   recorded salary, under the cap) or reported with a reason; and targets
   really do get signed.
     node test/fatargets.js [pro build]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach-pro.html');
let bad=0, signed=0, marked=0; const ok=(c,m)=>{if(!c){bad++;console.log('  FAIL '+m)}};
(async()=>{
  for(const [team,seed] of [['Detroit',3],['Tennessee',8],['Seattle',21],['NY Jets',5],['Carolina',9]]){
    const api=mk()(file); api.newDynasty(team,seed,'T');
    let g=0; while(api.SEA.phase!=='done'&&g++<80){api.doAdvance();let n=0;while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}await new Promise(r=>setImmediate(r))}
    api.openOffseason(); const S=api.S, screen=global.__nodes.app.innerHTML;
    ok(/Free agents you want/.test(screen)&&/data-fatadd=/.test(screen), `${team}: the screen lists likely free agents`);
    const pre=api.faPreview(); const want=pre.slice(0,4).map(x=>x.key); S.off.picks.targets=want.slice(); marked+=want.length;
    if(S.off.act.userOpen)S.off.move=S.myTeam;
    api.commitOffseason(); await new Promise(r=>setImmediate(r));
    const h=api.S.history.slice(-1)[0], T=h.league.targets||[], R=api.U.roster[team];
    ok(T.length===want.length, `${team}: ${T.length} of ${want.length} targets reported`);
    T.forEach(x=>{
      if(x.got){signed++; const p=R.find(q=>q&&q.n===x.n&&q.p===x.p);
        ok(!!p, `${team}: signed ${x.n} but he isn't on the roster`);
        if(p)ok(Math.abs(p.k.sal-x.sal)<0.05, `${team}: ${x.n} signed at $${x.sal}M, roster says $${p.k.sal}M`);}
      else ok(!!x.why, `${team}: missed ${x.n} with no reason`);
    });
    const pay=R.reduce((s,p)=>s+(p&&p.k?p.k.sal:0),0);
    ok(pay<=api.LEAGUE_CAP()+0.05, `${team}: payroll $${pay.toFixed(1)}M over the cap`);
    console.log(`  ${team}: ${T.map(x=>x.got?`signed ${x.n} $${x.sal}M`:`missed ${x.n} (${x.why})`).join('; ')}`);
  }
  ok(signed>0, `no target was signed in any of the five offseasons (${marked} marked)`);
  console.log(bad?`MISMATCH ${bad} check(s) failed`:`MATCH all checks (${signed} of ${marked} targets signed)`);
  process.exit(bad?1:0);
})();
