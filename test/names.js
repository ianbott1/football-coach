/* Round 49: surnames. A new league's rosters share no surname (six rosters in ten did, college football's nearly all,
   on 55-61 surnames a sport), and a pure computer season is the same game for game whatever the names: names are read
   through a wider list by hash, never by a draw.  node test/names.js   last line: MATCH or MISMATCH */
const {load}=require('./harness.js'), path=require('path'); let bad=0; const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++ };
for(const f of ['football-coach','football-coach-pro','basketball-coach','basketball-coach-pro','hockey-coach-pro','soccer-coach']){
  const A=load({file:path.join(__dirname,'..','dist',f+'.html'),expose:['SEA','NAMES','newDynasty','WIDE_LAST']});
  let rosters=0,shared=0,pool=new Set();
  for(const seed of [1,2]){ A.newDynasty(A.NAMES[seed],seed,'T');
    A.NAMES.forEach(t=>{ const R=(A.SEA.roster[t]||[]).filter(Boolean), s=R.map(p=>p.n.slice(p.n.indexOf(' ')+1)); rosters++; s.forEach(x=>pool.add(x)); if(new Set(s).size<s.length)shared++ }) }
  ok(shared===0&&pool.size>150,`${f}: ${rosters} new rosters, ${shared} with a shared surname; ${pool.size} surnames in use`) }
console.log(bad?`MISMATCH ${bad}`:'MATCH new rosters share no surname'); process.exit(bad?1:0);
