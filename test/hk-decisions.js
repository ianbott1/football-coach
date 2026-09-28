/* Hockey decisions, measured: gameplans for favourites and underdogs, the
   second-intermission call, and when to pull the goalie.   node test/hk-decisions.js */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const eng=fs.readFileSync(path.join(__dirname,'..','src','hockey','50_game.js'),'utf8');
const G=new Function(rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{}};\n'+eng+';return {RNG,playGame};')();
const N=40000, rng=new G.RNG(11);
const winPct=(gap,plan,decide)=>{let w=0;for(let i=0;i<N;i++){const r=G.playGame(rng,1500+gap,1500,plan,'balanced',decide?{decide:decide,userIsHome:true}:{});if(r.h>r.a)w++}return 100*w/N};
console.log('gameplans (you at home, the other side balanced):');
for(const gap of [120,-120]){console.log(`  ${gap>0?'favourite':'underdog '} (${gap>0?'+':''}${gap})`, ['safe','balanced','aggressive'].map(p=>`${p==='safe'?'skate with them':p==='aggressive'?'clog it up':'balanced'} ${winPct(gap,p).toFixed(1)}%`).join(' | '))}
// the calls: always answer one way, even teams
const by=v=>(dp)=>{const o=dp.opts.map(x=>x[0]); return o.indexOf(v)>=0?v:o[o.length-1]};
console.log('the calls, even teams (win % when that call is always made; answers not asked fall back to the neutral option):');
for(const [name,v] of [['pull early','early'],['pull as usual','normal'],['push when behind after two','push'],['lock it down when ahead after two','sit']])
  console.log('  '+name.padEnd(36),winPct(0,'balanced',by(v)).toFixed(2)+'%');
