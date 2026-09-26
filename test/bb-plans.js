/* Basketball gameplans on their own: win % by plan across rating gaps. node test/bb-plans.js */
const fs=require('fs');
const core=fs.readFileSync('src/core/20_engine.js','utf8');
const rngSrc=core.slice(core.indexOf('function mulberry32'),core.indexOf('\n}\n',core.indexOf('class RNG'))+3);
const G=new Function(rngSrc+fs.readFileSync('src/basketball/50_game.js','utf8')+'\nreturn {RNG,playGame,AGGR};')();
if(process.env.AG){const o=JSON.parse(process.env.AG);Object.keys(o).forEach(k=>Object.assign(G.AGGR[k],o[k]))}
const gaps=[-250,-125,0,125,250], N=+(process.env.N||6000);
console.log('your win % by plan (neutral court, opponent balanced); columns = your rating minus theirs');
console.log('            '+gaps.map(g=>String(g).padStart(7)).join(''));
['safe','balanced','aggressive'].forEach(p=>console.log('  '+p.padEnd(10)+gaps.map((gap,i)=>{const rng=new G.RNG(7+i);let w=0,n=gap===0?4*N:N;for(let k=0;k<n;k++){const r=G.playGame(rng,1500+gap,1500,p,'balanced',{});if(r.h>r.a)w++}return (100*w/n).toFixed(1).padStart(7)}).join('')));
