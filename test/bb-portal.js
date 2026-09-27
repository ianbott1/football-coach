/* College basketball, the transfer portal: entrants every offseason, never
   seniors; nobody who enters stays or lands on two teams; rosters stay at
   ten with no duplicates; computer programs take two transfers at most;
   your targets are signed (and on your roster) or reported with a reason.
     node test/bb-portal.js [offseasons=4]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const N=+(process.argv.find(a=>/^\d+$/.test(a))||4);
const api=m.exports.load(path.join(__dirname,'..','dist','basketball-coach.html'));
let bad=0,checks=0,moves=0,got=0,asked=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=8)console.log('  FAIL '+msg)}};
api.newDynasty('Houston',12,'T');
for(let y=0;y<N;y++){
  const E=api.SEA; let g=0; while(E.phase!=='done'&&g++<80)E.advance();
  api.openOffseason(); const S=api.S, my=S.myTeam;
  const pre=api.portalPreview();
  ok(pre.length>0, `${E.year}: nobody likely to enter the portal`);
  ok(pre.every(e=>e.c<=2), `${E.year}: a senior in the portal`);
  const want=pre.filter(e=>e.from!==my).slice(0,3).map(e=>e.key); S.off.picks.portal=want.slice(); asked+=want.length;
  if(S.off.act.userOpen)S.off.move=my;
  api.commitOffseason();
  const h=api.S.history.slice(-1)[0], P=(h.league&&h.league.portal)||{};
  // the same player (the same record, not just the same name: names repeat
  // across 3,650 players) is never on two rosters
  const U=api.U, where=new Map();
  api.NAMES.forEach(t=>{const R=U.roster[t]; ok(R.length===10&&R.every(Boolean), `${E.year} ${t}: roster of ${R.filter(Boolean).length}`);
    R.forEach(p=>{ if(where.has(p)&&where.get(p)!==t)ok(false, `${E.year}: ${p.n} on ${where.get(p)} and ${t}`); where.set(p,t)})});
  const T=(P.targets||{})[my]||[];
  ok(T.length===want.length, `${E.year}: ${T.length} of ${want.length} targets reported`);
  T.forEach(x=>{ if(x.got){got++; ok(U.roster[my].some(p=>p.n===x.n), `${E.year}: signed ${x.n} but he isn't on your roster`)} else ok(!!x.why, `${E.year}: missed ${x.n} with no reason`)});
  moves+=Object.values(api.portalLast?api.portalLast():{}).length;
  const inAll=api.portalIn?api.portalIn():null;
  if(inAll)Object.keys(inAll).forEach(t=>{ if(t!==my)ok(inAll[t].length<=2, `${E.year} ${t}: ${inAll[t].length} transfers in`); moves+=inAll[t].length});
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks (${N} offseasons; ${moves} transfers; ${got} of ${asked} of your targets signed)`);
process.exit(bad?1:0);
