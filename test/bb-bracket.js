/* College basketball: the NCAA tournament follows the 2027 rules, every
   season. 76 teams, one automatic bid per conference (its tournament
   champion, or the next eligible team if the champion is transitioning),
   44 at-large, nobody ineligible; the Opening Round is exactly the 12
   lowest-seeded at-large teams (on the 11 and 12 lines) and the 12
   lowest-seeded automatic qualifiers (15 and 16); every region's first
   round is 1-16, 8-9, 5-12, 4-13, 6-11, 3-14, 7-10, 2-15; winners and only
   winners advance; the champion won the final.
     node test/bb-bracket.js [seasons=25] [file.html]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'golden.js'),'utf8');
const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const args=process.argv.slice(2), N=+(args.find(a=>/^\d+$/.test(a))||25);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','basketball-coach.html');
const api=m.exports.load(file);
let bad=0, checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; if(bad<=10)console.log('  FAIL '+msg)}};
const PAIRS=[[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]];
for(let s=0;s<N;s++){
  api.newDynasty(api.NAMES[(s*53)%api.NAMES.length],500+s,'T');
  const E=api.SEA, CONF=api.CONF; let g=0; while(E.phase!=='done'&&g++<80)E.advance();
  const y=E.year, F=E.field, inel=['Le Moyne','Mercyhurst','New Haven','West Georgia'];
  ok(F.length===76&&new Set(F).size===76, `${y}: field of ${F.length} (${new Set(F).size} distinct)`);
  ok(F.every(t=>inel.indexOf(t)<0), `${y}: an ineligible team is in the field`);
  const confs=[...new Set(api.NAMES.map(t=>CONF[t]))];
  const aq=F.filter(t=>/champion$/.test(E.notes[t]||''));
  ok(aq.length===32&&new Set(aq.map(t=>CONF[t])).size===32, `${y}: ${aq.length} automatic bids from ${new Set(aq.map(t=>CONF[t])).size} conferences`);
  confs.forEach(c=>{const ch=E.champs[c]; if(ch&&inel.indexOf(ch)<0)ok(F.indexOf(ch)>=0, `${y}: ${c} champion ${ch} not in the field`)});
  // the Opening Round
  const al=F.filter(t=>aq.indexOf(t)<0), og=E.openGames||[];
  const lowAL=al.slice(-12), lowAQ=aq.slice().sort((a,b)=>E.overall[a]-E.overall[b]).slice(-12);
  const inOpen=new Set([].concat(...og.map(o=>[o.a,o.b])));
  ok(og.length===12, `${y}: ${og.length} Opening Round games`);
  ok(lowAL.every(t=>inOpen.has(t))&&lowAQ.every(t=>inOpen.has(t))&&inOpen.size===24, `${y}: the Opening Round isn't the 12 lowest of each kind`);
  og.forEach(o=>{const isAL=al.indexOf(o.a)>=0;
    ok(isAL===(al.indexOf(o.b)>=0), `${y}: an Opening Round game mixes an at-large and an automatic qualifier`);
    ok(isAL?(o.line===11||o.line===12):(o.line===15||o.line===16), `${y}: Opening Round game on the ${o.line} line`)});
  ok(og.filter(o=>o.line===11).length===2&&og.filter(o=>o.line===12).length===4&&og.filter(o=>o.line===15).length===2&&og.filter(o=>o.line===16).length===4,
     `${y}: Opening Round lines ${og.map(o=>o.line).sort((a,b)=>a-b).join(',')}`);
  // the first round, region by region
  const r64=E.rounds.r64||[];
  ok(r64.length===32, `${y}: ${r64.length} first-round games`);
  ['East','South','Midwest','West'].forEach(r=>{
    const gs=r64.filter(x=>x.region===r);
    PAIRS.forEach(([a,b])=>ok(gs.some(x=>Math.min(x.hseed,x.aseed)===a&&Math.max(x.hseed,x.aseed)===b), `${y} ${r}: no ${a} v ${b}`));
    const teams=[].concat(...gs.map(x=>[x.home,x.away]));
    ok(new Set(teams).size===16&&teams.every(t=>E.region[t]===r), `${y} ${r}: not 16 distinct teams of this region`);
  });
  // winners and only winners advance
  const chain=[['open','r64'],['r64','r32'],['r32','s16'],['s16','e8'],['e8','f4'],['f4','final']];
  chain.forEach(([a,b])=>{
    const W=new Set((E.rounds[a]||[]).map(x=>x.winner)), L=new Set((E.rounds[a]||[]).map(x=>x.loser));
    const next=[].concat(...(E.rounds[b]||[]).map(x=>[x.home,x.away]));
    ok(next.every(t=>!L.has(t)), `${y}: a ${a} loser plays in the ${b}`);
    if(a!=='open')ok([...W].every(t=>next.indexOf(t)>=0), `${y}: a ${a} winner missing from the ${b}`);
  });
  ok((E.rounds.final||[]).length===1&&E.champion===E.rounds.final[0].winner, `${y}: the champion isn't the final's winner`);
  // conference tournaments: a fixed bracket, one champion each
  confs.forEach(c=>{
    const T=E.ct[c], n=T.seeds.length, gs=E.ctGames[c], R=T.res;
    const fin=R.ct4&&R.ct4[0]; const champ=fin&&fin.winner!==undefined?fin.winner:fin;
    ok(!!champ&&E.champs[c]===champ, `${y} ${c}: champion isn't the final's winner`);
    ['ct1','ct2','ct3','ct4'].forEach(r=>{const ts=[].concat(...(R[r]||[]).filter(g=>g&&g.home).map(g=>[g.home,g.away]));
      ok(new Set(ts).size===ts.length, `${y} ${c} ${r}: a team plays twice`)});
    const cap={'ACC':15,'Big Ten':15,'Ivy League':4}[c], all=api.NAMES.filter(x=>CONF[x]===c).length;
    ok(n===(cap?Math.min(cap,all):all), `${y} ${c}: ${n} of ${all} teams in the tournament`);
    ok((R.ct1||[]).filter(g=>g&&g.home).every(g=>g.hseed+g.aseed===17), `${y} ${c}: a first-round game that isn't k v 17-k`);
    ok((R.ct1||[]).filter(g=>g&&g.home).length===Math.max(0,n-8), `${y} ${c}: ${(R.ct1||[]).filter(g=>g&&g.home).length} first-round games for ${n} teams`);
    const seen=new Set([].concat(...gs.map(g=>[g.home,g.away])));
    const byes=Math.max(0,16-n); [...Array(Math.min(byes,n)).keys()].forEach(i=>ok(!(R.ct1||[]).some(g=>g&&(g.home===T.seeds[i]||g.away===T.seeds[i])), `${y} ${c}: the ${i+1} seed played in the first round`));
    // only winners go on
    [['ct1','ct2'],['ct2','ct3'],['ct3','ct4']].forEach(([a,b])=>{
      const losers=new Set((R[a]||[]).filter(g=>g&&g.loser).map(g=>g.loser));
      const next=[].concat(...(R[b]||[]).filter(g=>g&&g.home).map(g=>[g.home,g.away]));
      ok(next.every(t=>!losers.has(t)), `${y} ${c}: a ${a} loser plays in ${b}`)});
  });
}
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed (${N} seasons)`:`MATCH all ${checks} checks (${N} seasons)`);
process.exit(bad?1:0);
