/* Pro offseason, trades: put a player on the block, see offers, accept one.
   Offers: from computer teams, fair by value, players under contract past
   this season, both teams under the cap, the same after a reload. An
   accepted trade swaps the two players when the offseason runs (or is
   reported if one retired), and the cap holds.
     node test/trades.js [pro build]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv.slice(2).find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach-pro.html');
let bad=0, offersSeen=0, done=0; const ok=(c,m)=>{if(!c){bad++;console.log('  FAIL '+m)}};
(async()=>{
  for(const [team,seed] of [['Detroit',3],['Tennessee',8],['Seattle',21],['NY Jets',5],['Carolina',9],['Denver',14]]){
    const api=mk()(file); api.newDynasty(team,seed,'T');
    let g=0; while(api.SEA.phase!=='done'&&g++<80){api.doAdvance();let n=0;while(api.live&&!api.live.done&&n++<800){api.live.ask?api.answerLive(api.live.ask.dp.opts[0][0]):api.liveTick()}await new Promise(r=>setImmediate(r))}
    api.openOffseason(); const S=api.S, U=api.U, R=U.roster[team];
    // shop the best tradeable players until someone gets offers
    const cand=R.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.k.yrs>=2).sort((a,b)=>b.p.r-a.p.r);
    let pick=null, offers=[];
    for(const c of cand){offers=api.tradeOffers(c.i); if(offers.length){pick=c;break}}
    if(!pick){console.log(`  ${team}: no offers for anyone`);continue}
    offersSeen+=offers.length;
    const gv=api.tradeValue(pick.p);
    offers.forEach(o=>{
      const [tt,qn,qp]=o.get.split('|'), q=U.roster[tt].find(x=>x&&x.n===qn&&x.p===qp);
      ok(tt!==team, `${team}: an offer from itself`);
      ok(!!q&&q.k.yrs>=2, `${team}: offered ${qn} isn't under contract past this season`);
      if(q){const qv=api.tradeValue(q); ok(qv>=gv*0.88-1e-9&&qv<=gv*1.08+1e-9, `${team}: ${qn} worth ${qv.toFixed(1)} for ${pick.p.n} worth ${gv.toFixed(1)}`);
        const pay=t=>U.roster[t].reduce((s,p)=>s+(p?p.k.sal:0),0);
        ok(pay(team)-pick.p.k.sal+q.k.sal<=api.LEAGUE_CAP()+1e-9&&pay(tt)-q.k.sal+pick.p.k.sal<=api.LEAGUE_CAP()+1e-9, `${team}: trade with ${tt} breaks the cap`);}
    });
    // the same offers after a reload
    const js=JSON.stringify(api.S), L=mk()(file); await L.loadSave(js); L.openOffseason();
    ok(JSON.stringify(L.tradeOffers(pick.i).map(o=>o.get))===JSON.stringify(offers.map(o=>o.get)), `${team}: different offers after a reload`);
    // accept the first
    const o=offers[0]; S.off.picks.trade=Object.assign({},o,{giveName:pick.p.n,giveSal:pick.p.k.sal});
    if(S.off.act.userOpen)S.off.move=S.myTeam;
    api.commitOffseason(); await new Promise(r=>setImmediate(r));
    const h=api.S.history.slice(-1)[0], T=h.league.trade, U2=api.U, tt=o.team;
    ok(!!T, `${team}: no trade recorded`);
    if(T&&T.done){done++;
      ok(U2.roster[team].some(p=>p&&p.n===o.n&&p.p===o.p), `${team}: ${o.n} isn't on your roster`);
      ok(U2.roster[tt].some(p=>p&&p.n===pick.p.n&&p.p===pick.p.p), `${team}: ${pick.p.n} isn't on ${tt}'s roster`);
      ok(!U2.roster[team].some(p=>p&&p.n===pick.p.n&&p.p===pick.p.p), `${team}: ${pick.p.n} is still on your roster`);
    } else if(T) ok(!!T.why, `${team}: trade called off with no reason`);
    [team,tt].forEach(t=>{const pay=U2.roster[t].reduce((s,p)=>s+(p?p.k.sal:0),0); ok(pay<=api.LEAGUE_CAP()+0.05, `${t}: payroll $${pay.toFixed(1)}M over the cap`)});
    console.log(`  ${team}: shopped ${pick.p.n} (${pick.p.p} ${pick.p.r}); ${offers.length} offer(s); ${T&&T.done?`traded for ${o.n} (${o.p} ${o.r}) from ${tt}`:'not done: '+(T&&T.why)}`);
  }
  ok(offersSeen>0&&done>0, 'no offers or no completed trades at all');
  console.log(bad?`MISMATCH ${bad} check(s) failed`:`MATCH all checks (${done} trades done)`);
  process.exit(bad?1:0);
})();
