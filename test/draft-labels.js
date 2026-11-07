/* Draft labels against what happens (node test/draft-labels.js [careers] [game]):
   the board's "likely gone / might be there / likely there" at your first pick, and draft night's
   "by your next pick", for the players the screens list (top 30 / top 25 by your scouts), against the real draft.
   Bands: likely gone 75%+ gone, might be there 25-75%, likely there under 25%. Last line MATCH or MISMATCH.
   DRAFT_MOCK=x tries another spread. */
const {load}=require('./harness.js'), path=require('path');
const N=+(process.argv[2]||16), ONLY=process.argv[3];
const D=f=>path.join(__dirname,'..','dist',f);
const games=[['football-coach-pro.html',['Chicago','Dallas','Denver','Miami','Seattle','Tennessee']],
  ['basketball-coach-pro.html',['Detroit','Boston','Utah','Phoenix','Orlando','Houston']],
  ['hockey-coach-pro.html',['Toronto','Calgary','Dallas','Seattle','Florida','Boston']]].filter(g=>!ONLY||g[0].indexOf(ONLY)===0);
let bad=0;
for(const [f,teams] of games){
  const T={board:{gone:[0,0],maybe:[0,0],there:[0,0]},night:{gone:[0,0],maybe:[0,0],there:[0,0]}};
  for(let s=0;s<N;s++){
    const A=load({file:D(f),expose:['S','SEA','U','newDynasty','openOffseason','draftNight','dnMock','dnRead','dnVal','dnTeam','dnOrder','dnTeamsBetween','nflDraftClass','LEAGUE']});
    A.newDynasty(teams[s%teams.length],300+s,'T'); let g=0; while(A.SEA.phase!=='done'&&g++<6000)A.SEA.advance(); A.openOffseason();
    if(A.S.off.act.userOpen){ A.S.off.act.userOpen=false; A.S.off.move=null }
    const t=A.dnTeam(), R=A.LEAGUE.offseason.draftRounds, C=A.nflDraftClass(A.U,t), val=p=>A.dnVal(A.dnRead(p.pid,t));
    const full=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:A.S.off.picks.draft,board:[]}},R,null);
    const overallOf={}; full.picks.forEach(d=>overallOf[d.pid]=d.overall);
    const kind=g=>g>0.75?'gone':g>0.25?'maybe':'there';
    // the board, at your first pick
    const ahead=A.dnOrder().indexOf(t), first=ahead+1;
    if(ahead>0){ const gone=A.dnMock(C.list.map(p=>{ const x=A.dnRead(p.pid,t); return Object.assign({},p,{v:val(p),sr:x.sr,spot:x.spot}) }),ahead,((A.U.seed||0)*2246822519)^(A.SEA.year*31337),A.dnOrder());
      C.list.slice().sort((a,b)=>val(b)-val(a)).slice(0,30).forEach(p=>{ const k=kind(gone[p.pid]||0), o=overallOf[p.pid]; T.board[k][1]++; if(o&&o<first)T.board[k][0]++ }) }
    // draft night, at every one of your picks (Muse: the same names stamped "likely gone" round after round, and
    // only 2 of 16 gone; this checked the first pick only): who's gone by your next. The real draft each time is
    // the one with your picks as made so far (the staff's suggestion).
    const hand=[];
    for(let k=0;k<R+1;k++){ const D0=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:A.S.off.picks.draft,board:[],hand:hand.slice()}},R,t), st=D0.stop;
      if(!st)break;
      if(st.next){ const real=A.draftNight(A.U,A.SEA.rec,A.SEA.elo,{[t]:{draft:A.S.off.picks.draft,board:[],hand:hand.concat([st.suggest])}},R,null), ov={}; real.picks.forEach(d=>ov[d.pid]=d.overall);
        const av=D0.prospects.filter(p=>!p.taken).map(p=>{ const x=A.dnRead(p.pid,t); return Object.assign({},p,{v:val(p),sr:x.sr,spot:x.spot}) }).sort((a,b)=>b.v-a.v);
        const gone=A.dnMock(av,st.next-st.overall-1,((A.U.seed||0)*2246822519)^(A.SEA.year*31337)^st.overall,A.dnTeamsBetween(D0.order,st.overall,st.next));
        av.filter(p=>p.pid!==st.suggest).slice(0,24).forEach(p=>{ const kk=kind(gone[p.pid]||0), o=ov[p.pid]; T.night[kk][1]++; if(o&&o>st.overall&&o<st.next)T.night[kk][0]++ }) }
      hand.push(st.suggest) }
  }
  console.log(f.replace('.html',''),`(${N} drafts)`);
  for(const w of ['board','night']){ const row=[];
    for(const k of ['gone','maybe','there']){ const [a,n]=T[w][k], r=n?a/n:null; row.push(`${k} ${n?Math.round(100*r)+'%':'-'} of ${n}`);
      const lo=k==='gone'?0.75:k==='maybe'?0.25:0, hi=k==='gone'?1:k==='maybe'?0.75:0.25, se=n?Math.sqrt(0.25/n):1;
      if(n>=15&&(r<lo-2*se||r>hi+2*se)){ bad++; row[row.length-1]+=' (OUT)' } }
    console.log(`  ${w==='board'?'board, at your first pick':'draft night, by your next pick'}: `+row.join(' | ')) }
}
console.log(bad?`MISMATCH ${bad} labels outside their band`:`MATCH every label holds its band`);
process.exit(bad?1:0);
