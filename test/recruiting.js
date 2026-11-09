/* The recruiting board (core 92_recruiting), in both college games, over
   first offseasons for several programs:
   - every other program's roster is the same with or without your board;
   - each signed recruit is on your roster (or went on to the transfer
     portal), and the report knows the newcomer he replaced;
   - the board helps you aim without being a free upgrade: each strategy's
     gain per open spot, measured against the newcomer each signing replaced;
   - the board section and the banner line draw cleanly.
     node test/recruiting.js      last line: MATCH or MISMATCH */
const path=require('path');const {load}=require('./harness.js');
const D=f=>path.join(__dirname,'..','dist',f);
let bad=0,checks=0; const ok=(c,m)=>{checks++; if(!c){bad++; if(bad<=15)console.log('  FAIL '+m)}};
const EXP=['S','SEA','U','NAMES','newDynasty','openOffseason','commitOffseason','rbPool','rbChance','offseasonBanner','recruitBoardHTML'];
const PICK={none:()=>[], best:(A,p)=>p.slice(), smart:(A,p)=>p.filter(x=>A.rbChance(x)>=0.4), likely:(A,p)=>p.filter(x=>A.rbChance(x)>=0.7)};
function offseason(f,team,seed,strategy){
  const A=load({file:D(f),expose:EXP}); A.newDynasty(team,seed,'T');
  const E=A.SEA; let g=0; while(E.phase!=='done'&&g++<900){E.userTeam=A.S.myTeam; E.advance()}
  A.openOffseason(); const O=A.S.off, my=A.S.myTeam, pool=A.rbPool(my,O.picks);
  O.picks.rboard=PICK[strategy](A,pool).sort((a,b)=>b.r-a.r).map(x=>x.key);
  const html=A.recruitBoardHTML(O.picks,"3");
  for(let c=0;c<5&&A.S.off;c++){ if(A.S.off.act&&A.S.off.act.userOpen&&A.S.off.move===null)A.S.off.move=my; A.commitOffseason() }
  const L=A.S.history[A.S.history.length-1].league, cls=(L.classes&&L.classes[my])||{}, B=cls.board||[];
  const out=((L.portal&&L.portal.out&&L.portal.out[my])||[]).map(x=>x.n);
  return {A,my,html,B,out,
    others:A.NAMES.filter(t=>t!==my).map(t=>A.U.roster[t].map(p=>p?p.n+':'+p.r:'-').join(',')).join('|'),
    banner:String(A.offseasonBanner?A.offseasonBanner():"")};
}
// eight basketball programs (round 49): with three, chasing the best read +4.8 a spot by luck after surnames changed the
// commit dice; eight read +2.3 (the round-48 build +1.8)
// six football programs: with three, a sensible board's edge (~+1.5 a spot over nine) read -0.9 or +0.1 by luck (Nov 2026)
for(const [f,teams] of [['football-coach.html',['Iowa State','Alabama','Toledo','Rice','Oregon','Kansas']],['basketball-coach.html',['Butler','Duke','Drake','Kansas','Vermont','Iowa State','Creighton','Villanova']]]){
  const gain={best:[0,0],smart:[0,0],likely:[0,0]};
  for(const team of teams)for(const seed of [3,11]){
    const base=offseason(f,team,seed,'none');
    ok(/Recruiting board/.test(base.html)&&/data-rbadd/.test(base.html)&&!/undefined|NaN/.test(base.html),`${f} ${team}: the board section doesn't draw`);
    for(const st of ['best','smart','likely']){
      const r=offseason(f,team,seed,st);
      ok(r.others===base.others,`${f} ${team} ${st}: your board changed another program's roster`);
      r.B.forEach(b=>{ gain[st][1]++;
        if(!b.got)return;
        ok(typeof b.was==='number',`${f} ${team}: ${b.n} signed with no newcomer recorded as replaced`);
        ok(r.A.U.roster[r.my].some(p=>p&&p.n===b.n&&p.board)||r.out.indexOf(b.n)>=0,`${f} ${team}: ${b.n} signed but isn't on the roster`);
        gain[st][0]+=b.r-b.was });
      if(r.B.length)ok(/Your board:/.test(r.banner)&&!/undefined|null|NaN/.test(r.banner.replace(/<[^>]+>/g,'')),`${f}: the banner's board line is missing or broken`);
    } }
  const per=st=>gain[st][0]/Math.max(1,gain[st][1]), sg=x=>(x>=0?'+':'')+x.toFixed(1);
  console.log(`  ${f.padEnd(22)} per open spot, against the newcomer it replaced: chase the best ${sg(per('best'))} | best of the battles ${sg(per('smart'))} | only the likely ${sg(per('likely'))}`);
  ok(per('best')<=2.5,`${f}: chasing the best is a free upgrade (${sg(per('best'))} a spot)`);
  ok(per('smart')>=0,`${f}: a sensible board makes your class worse (${sg(per('smart'))} a spot)`);
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the recruiting board works and is fair`);
process.exit(bad?1:0);
