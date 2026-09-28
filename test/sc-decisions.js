/* Soccer decisions, measured: gameplans for favourites and underdogs, and the
   calls at half-time and with twenty minutes left.   node test/sc-decisions.js */
const fs=require('fs'),path=require('path');
const core=fs.readFileSync(path.join(__dirname,'..','src','core','20_engine.js'),'utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const eng=fs.readFileSync(path.join(__dirname,'..','src','soccer','50_game.js'),'utf8');
const G=new Function(rngSrc+'function blankTeamLine(){return {sog:0,pp:0,ppg:0,pim:0}}\nconst LEAGUE={tuning:{}};\n'+eng+';return {RNG,playGame};')();
const N=40000, rng=new G.RNG(11);
// expected points a game (3 a win, 1 a draw): what a league table rewards
const winPct=(gap,plan,decide)=>{let p=0;for(let i=0;i<N;i++){const r=G.playGame(rng,1500+gap,1500,plan,'balanced',decide?{decide:decide,userIsHome:true}:{});p+=r.h>r.a?3:r.h===r.a?1:0}return p/N};
console.log('points a game (you at home, the other side balanced):');
for(const gap of [200,-200]){console.log(`  ${gap>0?'favourite':'underdog '} (${gap>0?'+':''}${gap})`, ['safe','balanced','aggressive'].map(p=>`${p==='safe'?'take the game to them':p==='aggressive'?'sit deep and counter':'balanced'} ${winPct(gap,p).toFixed(3)}`).join(' | '))}
// the calls: always answer one way, even teams
const by=v=>(dp)=>{const o=dp.opts.map(x=>x[0]); return o.indexOf(v)>=0?v:o[o.length-1]};
console.log('the calls, even teams (points a game when that call is always made; other calls neutral):');
for(const [name,v] of [['neutral everywhere','normal'],['chase / all-out when behind','push'],['sit on it / park the bus when ahead','sit'],['level late: go for the win','win'],['level late: take the point','point']])
  console.log('  '+name.padEnd(40),winPct(0,'balanced',by(v)).toFixed(3));
