/* Every test with a verdict, in every game, in one command.
     node test/run-all.js           the full suite (the long-run history checks too)
     node test/run-all.js --quick   everything but the long-run history checks
   Builds all five games first. Prints a table and the failures' last lines;
   exits 1 if anything failed. (Measurement reports - calibrate, advisors,
   calls, the engine harnesses, the long-run recorders - aren't verdicts, so
   they're run by hand.) */
const {spawn,execFileSync}=require('child_process'), path=require('path'), fs=require('fs');
const ROOT=path.join(__dirname,'..'), D=f=>path.join(ROOT,'dist',f);
const quick=process.argv.includes('--quick');
const G={cfb:'football-coach.html', nfl:'football-coach-pro.html', ncaab:'basketball-coach.html',
         nba:'basketball-coach-pro.html', nhl:'hockey-coach-pro.html'};
const T=[];
const add=(name,args,opt={})=>T.push(Object.assign({name,args,timeout:600000},opt));   // one CPU, four at a time
// in every game
for(const [lg,f] of Object.entries(G)){
  add(`golden ${lg}`,['golden.js',D(f)]);
  add(`hotseat ${lg}`,['hotseat.js',D(f)]);
  add(`storage ${lg}`,['storage.js',D(f)]);
  add(`reload ${lg}`,['reload.js',D(f)]);
}
// across games
add('saves (all five)',['saves.js']); add('layouts (all five)',['layouts.js']);
add('sim and skip (all five)',['sim-and-skip.js']); add('goals and seat badge',['goals.js']);
add('migrate old saves (college football)',['migrate.js']);
// college football
add('h2h (cfb)',['h2h.js',D(G.cfb)]); add('moves (cfb)',['moves.js',D(G.cfb)]);
add('firing (cfb)',['firing.js',D(G.cfb)]); add('clinch marks (nfl)',['clinch.js',D(G.nfl),'120']);
add('plans (cfb)',['plans.js',D(G.cfb)]);
// pro football
add('rules (nfl)',['nfl.js',D(G.nfl),'3','8']); add('draft board (nfl)',['draftboard.js',D(G.nfl)]);
add('free-agent targets (nfl)',['fatargets.js',D(G.nfl)]); add('trades (nfl)',['trades.js',D(G.nfl)]);
// college basketball
add('bracket (ncaab)',['bb-bracket.js','12']); add('screens (ncaab)',['bb-screens.js']);
add('transfer portal (ncaab)',['bb-portal.js','4']);
add('March vs history (ncaab)',['bb-march.js','2','100'],{long:true});
// pro basketball
add('playoffs (nba)',['nba-playoffs.js','4']); add('screens (nba)',['nba-screens.js']);
add('NBA history (nba)',['nba-history.js','2','100'],{long:true});
// pro hockey
add('playoffs (nhl)',['nhl-playoffs.js','3']); add('clinch marks (nhl)',['nhl-clinch.js','4']);
add('screens (nhl)',['nhl-screens.js']); add('NHL history (nhl)',['nhl-history.js','2','60'],{long:true});

(async()=>{
  const t0=Date.now();
  process.stdout.write('building all five games... ');
  for(const lg of Object.keys(G))execFileSync('python3',['build.py',lg],{cwd:ROOT,stdio:'ignore'});
  console.log('done');
  const todo=T.filter(t=>!(quick&&t.long)), results=[];
  let next=0;
  const run=t=>new Promise(res=>{
    const s=Date.now(), p=spawn('node',t.args.map((a,i)=>i===0?path.join(__dirname,a):a),{cwd:ROOT,env:Object.assign({},process.env,{TEAM:''})});
    let out=''; p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>out+=d);
    const kill=setTimeout(()=>{p.kill('SIGKILL'); out+='\nTIMEOUT'},t.timeout);
    p.on('close',()=>{clearTimeout(kill);
      const lines=out.trim().split('\n'), last=lines[lines.length-1]||'';
      const ok=/^(MATCH|AGREE)/.test(last)&&!/TIMEOUT/.test(out);
      results.push({name:t.name,ok,last,secs:Math.round((Date.now()-s)/1000),tail:lines.slice(-6).join('\n')}); res()});
  });
  const worker=async()=>{while(next<todo.length){const t=todo[next++]; await run(t);
    const r=results[results.length-1]; console.log(`${r.ok?'  ok  ':'  FAIL'} ${r.name} (${r.secs}s)`)}};
  await Promise.all([worker(),worker(),worker(),worker()]);
  const bad=results.filter(r=>!r.ok);
  console.log(`\n${results.length-bad.length} of ${results.length} passed${quick?' (quick: long-run history checks skipped)':''}, ${Math.round((Date.now()-t0)/1000)}s`);
  bad.forEach(r=>console.log(`\n--- ${r.name}\n${r.tail}`));
  console.log(bad.length?'MISMATCH '+bad.length+' failed':'MATCH everything passed');
  process.exit(bad.length?1:0);
})();
