/* Golden master: plays full seeded careers headlessly and fingerprints
   everything the simulation produces. A refactor that is meant to change
   no behaviour must leave every fingerprint unchanged.

     node test/golden.js [file.html] [--write | --check]  (default: print) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

function load(file) {
  let js = fs.readFileSync(file, 'utf8')
    .split('<script>')[1].split('</script>')[0]
    .replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/, '');
  const mem = {};
  global.setTimeout = () => 0; global.clearTimeout = () => {};   // no async ticks
  global.window = {
    storage: { get: async k => mem[k] !== undefined ? {key:k, value:mem[k]} : null,
               set: async (k,v) => { mem[k]=v; return {}; },
               delete: async k => { delete mem[k]; return {}; },
               list: async () => ({keys:Object.keys(mem)}) },
    addEventListener: () => {}, innerWidth: 390, matchMedia: () => ({matches:false})
  };
  const nodes = {};
  const mk = () => ({ innerHTML:'', onclick:null, oninput:null, value:'1', dataset:{},
    setAttribute(){}, scrollIntoView(){}, classList:{toggle(){},add(){},remove(){}},
    focus(){}, setSelectionRange(){} });
  const node = id => (typeof id === 'string' ? (nodes[id] = nodes[id] || mk()) : mk());
  global.__nodes = nodes;
  global.document = { getElementById: node, querySelector: node, querySelectorAll: () => [],
    createElement: () => mk(), body:{classList:{toggle(){}}}, addEventListener(){} };
  // live getters: U, SEA, S, live are reassigned with `let`, so capture by closure
  return new Function(js + `
    return { newDynasty, doAdvance, liveTick, answerLive, openOffseason, commitOffseason,
      get S(){return S}, get SEA(){return SEA}, get U(){return U}, get live(){return live},
      NAMES,
      schedule(seed){ const u=newUniverse(seed*7919+13); syncConf(u);
        return new Season(u,(seed*2654435761)>>>0).sched.map(g=>[g.week,g.home,g.away,!!g.neutral,g.site||'']); } };`)();
}

const h = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0,16);

function career(file, team, seed, seasons) {
  const api = load(file);
  api.newDynasty(team, seed, 'Test Coach');
  const out = []; const screens = [];
  const grab = () => screens.push(global.__nodes.app ? global.__nodes.app.innerHTML : '');
  for (let y = 0; y < seasons; y++) {
    let guard = 0;
    while (api.SEA.phase !== 'done' && guard++ < 80) {
      api.doAdvance(); grab();
      let g = 0;
      while (api.live && !api.live.done && g++ < 800) {
        const L = api.live;
        if (L.ask) api.answerLive(L.ask.dp.opts[(y + g) % L.ask.dp.opts.length][0]);
        else api.liveTick();
      }
    }
    const SEA = api.SEA;
    const games = [].concat(...SEA.weeks.map(w => w.games)).map(g => [g.home,g.away,g.hp,g.ap]);
    const post = [].concat(SEA.bowls, SEA.rounds.r1, SEA.rounds.qf, SEA.rounds.sf, SEA.rounds.fin)
      .map(g => [g.home,g.away,g.hp,g.ap,g.title||'']);
    const season = {
      year: SEA.year, games: h(games), post: h(post), champion: SEA.champion,
      rec: h(SEA.rec), poll: h(SEA.poll.order()), heis: h(((SEA.mvpRace||SEA.heisman).call(SEA,10)||[]).map(x=>[x.n,x.t,x.p])),
    };
    api.openOffseason();
    const S = api.S;
    if (S.off && S.off.act.userOpen && S.off.move === null)
      S.off.move = (S.off.jobs[0] && S.off.jobs[0].team) || S.myTeam;
    api.commitOffseason();
    season.history = h(S.history[S.history.length-1]);
    season.universe = h(api.S.uStart);
    grab(); season.screens = h(screens.splice(0));
    out.push(season);
  }
  return out;
}

const args = process.argv.slice(2);
const file = args.find(a => a.endsWith('.html')) || path.join(__dirname,'..','dist','football-coach.html');
const CASES = [['Alabama',1,4],['Rice',2024,4],['Oregon',777,3],['Kent State',31337,3]];
const result = {};
for (const [t,s,n] of CASES) result[t+'#'+s] = career(file, t, s, n);
// Schedules for many 2026 universes. Careers alone only see four opening
// seasons, which missed the double-booking bug entirely.
{ const api = load(file);
  const sch = [];
  for (let s = 1; s <= 60; s++) {
    const pull = api.schedule(s);
    sch.push(h(pull));
  }
  result['schedules#60'] = [{ all: h(sch) }];
}
const fp = h(result);
const GOLD = path.join(__dirname, 'golden.json');
if (args.includes('--write')) {
  // every re-record says why: node test/golden.js --write --note "reason"
  const ni = args.indexOf('--note'), note = ni >= 0 ? args[ni+1] : null;
  if (!note) { console.log('refusing to re-record without --note "why behaviour changed"'); process.exit(1); }
  const prev = fs.existsSync(GOLD) ? JSON.parse(fs.readFileSync(GOLD,'utf8')) : {};
  const log = (prev.log || (prev.fp ? [{fp:prev.fp, note:'recorded from the published build (cf06b22)'}] : []))
    .concat([{fp, from: prev.fp || null, note}]);
  fs.writeFileSync(GOLD, JSON.stringify({fp, log, result}, null, 1)); console.log('wrote', fp);
}
else if (args.includes('--check')) {
  const g = JSON.parse(fs.readFileSync(GOLD,'utf8'));
  if (g.fp === fp) { console.log('MATCH', fp); }
  else {
    console.log('MISMATCH', g.fp, '->', fp);
    for (const k in result) result[k].forEach((s,i) => { for (const f in s)
      if (JSON.stringify(s[f]) !== JSON.stringify(g.result[k][i][f])) console.log(' ', k, 'season', i+1, f); });
    process.exit(1);
  }
} else console.log(fp, JSON.stringify(result, null, 1).slice(0, 1500));
