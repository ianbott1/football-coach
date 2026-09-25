/* Calibration: simulates many CPU-only seasons and measures the targets in
   ARCHITECTURE.md.   node test/calibrate.js [file.html] [nSeasons=200] */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const file = args.find(a => a.endsWith('.html')) || path.join(__dirname,'..','dist','football-coach.html');
const N = +(args.find(a => /^\d+$/.test(a)) || 200);
let js = fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0]
  .replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/, '');
global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},innerWidth:390,matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G = new Function(js + `
  const LOG=[]; const _pg=playGame;
  playGame=function(rng,eH,eA,pH,pA,o){const r=_pg(rng,eH,eA,pH,pA,o);LOG.push([eH,eA,r.h,r.a]);return r};
  return {newUniverse,syncConf,Season,NAMES,NW:(typeof LEAGUE!=='undefined'?LEAGUE.weeks:NW),LOG,get CONF(){return CONF}};`)();

const m = {fav:0,games:0,margin:0,pts:0,homeW:0,homeG:0,undef:0,swing:0,injSwing:0,teamSeasons:0,heis:{},sched:{twice:0,self:0,dupPair:0,short:0,long:0}};
for (let s = 1; s <= N; s++) {
  const u = G.newUniverse(s*7919+13); G.syncConf(u);
  const sea = new G.Season(u, (s*2654435761)>>>0);
  // schedule integrity: team twice in a week, self-games, repeated regular-season pairs, game counts
  const byWk = {}, pairs = {}, cnt = {};
  sea.sched.forEach(g => {
    const k=g.week; byWk[k]=byWk[k]||{};
    [g.home,g.away].forEach(t=>{ if(byWk[k][t]) m.sched.twice++; byWk[k][t]=1; cnt[t]=(cnt[t]||0)+1; });
    if (g.home===g.away) m.sched.self++;
    const p=[g.home,g.away].sort().join('~'); if(pairs[p]) m.sched.dupPair++; pairs[p]=1;
  });
  G.NAMES.forEach(t => { const c=cnt[t]||0; if(c<11) m.sched.short++; if(c>12) m.sched.long++; });
  const lo = G.LOG.length;
  // talent swing: per team, highest minus lowest effective rating over the
  // regular season (sampled at each week, as the game engine reads it),
  // averaged league-wide. Also the injury-only part of that rating.
  const hi={}, lo2={}, ihi={}, ilo={};
  const inj = t => sea.talent.inj[t].reduce((a,e)=>a+(e.w>0?e.m:0),0);
  while (sea.step < G.NW) {
    const w = Math.min(sea.step, G.NW);
    G.NAMES.forEach(t => { const e = sea.talent.eff(t,w), i = inj(t);
      hi[t]=Math.max(hi[t]??-1e9,e); lo2[t]=Math.min(lo2[t]??1e9,e);
      ihi[t]=Math.max(ihi[t]??-1e9,i); ilo[t]=Math.min(ilo[t]??1e9,i); });
    sea.advance();
  }
  G.NAMES.forEach(t => { m.swing += hi[t]-lo2[t]; m.injSwing += ihi[t]-ilo[t]; m.teamSeasons++; });
  m.undef += G.NAMES.filter(t => sea.rec[t][1]===0).length;   // end of regular season
  while (sea.phase !== 'done') sea.advance();
  [].concat(...sea.weeks.map(w=>w.games), sea.bowls, sea.rounds.r1, sea.rounds.qf, sea.rounds.sf, sea.rounds.fin)
    .forEach(g => { if(!g.neutral){ m.homeG++; if(g.winner===g.home) m.homeW++; } });
  G.LOG.slice(lo).forEach(([eH,eA,h,a]) => {
    m.games++; m.pts += h+a; m.margin += Math.abs(h-a);
    if (eH!==eA && ((eH>eA)===(h>a))) m.fav++;
  });
  const hz = sea.heisman(1)[0]; if (hz) m.heis[hz.p]=(m.heis[hz.p]||0)+1;
}
const pct = x => (100*x).toFixed(1)+'%';
console.log(`seasons ${N}, games ${m.games}`);
console.log(`favourite win rate  ${(m.fav/m.games).toFixed(3)}   (target ~0.70)`);
console.log(`mean margin         ${(m.margin/m.games).toFixed(1)}     (target ~15)`);
console.log(`undefeated (reg sea)${(m.undef/N).toFixed(2)}    (target ~1)`);
console.log(`home win rate       ${pct(m.homeW/m.homeG)}   (target 57-59%)`);
console.log(`points per game     ${(m.pts/m.games).toFixed(1)}     (target ~54)`);
console.log(`schedule integrity  ${JSON.stringify(m.sched)}  (target all zeros)`);
const hs = Object.values(m.heis).reduce((a,b)=>a+b,0);
console.log(`Heisman split       ${Object.entries(m.heis).sort((a,b)=>b[1]-a[1]).map(([p,c])=>p+' '+pct(c/hs)).join(' / ')}  (target QB 60-70 / WR 20-30 / RB 10-20)`);
console.log(`talent swing        ${(m.swing/m.teamSeasons).toFixed(1)} Elo   (target ~110)  [injuries alone: ${(m.injSwing/m.teamSeasons).toFixed(1)}]`);
