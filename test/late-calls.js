/* Late calls in close games (round 40: hockey asked nothing in 81% of one-goal finishes, soccer nothing after 65',
   pro football in 4 of 7). node test/late-calls.js [distdir] [games=30]   last line: MATCH or MISMATCH
   For each live game: score at the start of the late window, and whether a call was SHOWN (not answered by the
   assistant) at or after it.  Late window: football 4th quarter; basketball last segment; hockey last 5 minutes
   (and overtime); soccer from 80'. Close: within one score (football 8, basketball 3 and 6, hockey/soccer 1). */
const {load}=require('./harness.js'); const path=require('path');
const dir=process.argv[2]||path.join(__dirname,'..','dist'), NG=+(process.argv[3]||30); let bad=0;
// the most close finishes that may pass with no call, by game (decided ones go to the assistant: callInReach)
const MAXNONE={'football-coach.html':60,'football-coach-pro.html':40,'basketball-coach.html':25,'basketball-coach-pro.html':25,'hockey-coach-pro.html':15,'soccer-coach.html':40};
const SP={'football-coach.html':['fb',d=>d.q>=4,d=>[d.h,d.a],[8]], 'football-coach-pro.html':['fb',d=>d.q>=4,d=>[d.h,d.a],[8]],
  'basketball-coach.html':['bb',null,d=>[d.sh,d.sa],[3,6]], 'basketball-coach-pro.html':['bb',null,d=>[d.sh,d.sa],[3,6]],
  'hockey-coach-pro.html':['hk',d=>d.seg>=11,d=>[d.sh,d.sa],[1]], 'soccer-coach.html':['sc',d=>d.seg>=16,d=>[d.sh,d.sa],[1]]};
for(const [f,[sp,isLate,sc,TH]] of Object.entries(SP)){
  const A=load({file:path.resolve(dir,f),expose:['S','SEA','NAMES','newDynasty','doAdvance','live','liveTick','answerLive','callKey']});
  A.newDynasty(A.NAMES[+(process.env.TEAM||4)],7,'T'); let games=0, guard=0; const rows=[]; const kinds={};
  while(games<+NG&&guard++<400){ if(A.SEA.phase==='done'){ break } A.doAdvance(); if(!A.live)continue;
    const shownAt=[]; let n=0;
    while(A.live&&!A.live.done&&n++<1200){ const L=A.live; if(L.ask){ shownAt.push([L.drives.length,L.ask.dp.k]); A.answerLive(L.ask.dp.opts[n%L.ask.dp.opts.length][0]) } else A.liveTick() }
    const L=A.live; if(!L||!L.done)continue; games++; const D=L.drives;
    const segs=sp==='bb'?Math.max(...D.map(d=>d.seg||0)):0;
    let li=D.findIndex(d=>sp==='bb'?(d.seg>=segs&&!d.ot):isLate(d)); if(li<0)continue;
    const prev=li>0?sc(D[li-1]):[0,0]; const margin=Math.abs(prev[0]-prev[1]);
    const lateShown=shownAt.filter(([i])=>i>=li); lateShown.forEach(([,k])=>kinds[k]=(kinds[k]||0)+1);
    const meHome=L.g.home===A.S.myTeam, fin=sc(D[D.length-1]);
    rows.push({margin, late:lateShown.length, ot:D.some(d=>d.ot), otShown:shownAt.some(([i])=>D[i]&&D[i].ot), po:!!(L.g.po||L.g.round||L.g.cupK)}) }
  // round 46 (Ian: "gate them"): a late call is asked only when it gains 3 points on the assistant, so a close finish
  // can pass with nothing to ask; the round-40 caps on that (MAXNONE) are gone. What's checked now: late calls still
  // happen in close finishes (not one in five or more is the failure).
  { const c=rows.filter(r=>r.margin<=TH[0]), none=c.filter(r=>!r.late).length; if(c.length>=5&&none===c.length){bad++;console.log(`  FAIL ${f}: none of ${c.length} close finishes asked anything`)} }
  const out=TH.map(t=>{ const c=rows.filter(r=>r.margin<=t); const none=c.filter(r=>!r.late).length; return `within ${t}: ${c.length} games, no late call in ${none} (${(100*none/Math.max(1,c.length)).toFixed(0)}%)` });
  const ot=rows.filter(r=>r.ot);
  console.log(`${f.padEnd(26)} ${games} games | ${out.join(' | ')}${ot.length?` | overtime ${ot.length}, a call in OT ${ot.filter(r=>r.otShown).length}`:''} | late kinds ${JSON.stringify(kinds)}`) }

console.log(bad?`MISMATCH ${bad} games with close finishes left empty`:'MATCH every game asks something in its close finishes'); process.exit(bad?1:0);
