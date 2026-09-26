/* Stress test: long careers with random choices at every decision, hot seat
   included, drawing screens along the way. Reports crashes, broken text
   (undefined, NaN), stuck offseasons and invalid players.
     node test/stress.js <file.html> [careers=6] [years=10] */
const fs=require('fs');const src=fs.readFileSync('test/golden.js','utf8');
const mk=()=>{const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);return m.exports.load};
const file=process.argv[2], CAREERS=+process.argv[3]||6, YEARS=+process.argv[4]||10;
const probs={}; const note=(k,d)=>{probs[k]=probs[k]||{n:0,eg:d};probs[k].n++};
(async()=>{
let seasons=0, t0=Date.now();
for(let c=0;c<CAREERS;c++){
  const api=mk()(file); const N=api.NAMES; let r=c*7919+1; const rnd=n=>{r=(r*1103515245+12345)%2147483648;return r%n};
  const coaches=c%3===2?[{team:N[rnd(N.length)],name:'A'},{team:N[rnd(N.length)],name:'B'}]:null;
  try{api.newDynasty(coaches?coaches[0].team:N[rnd(N.length)],1000+c,'T',coaches)}catch(e){note('newDynasty: '+e.message,'');continue}
  for(let y=0;y<YEARS;y++){
    let g=0;
    while(api.SEA.phase!=='done'&&g++<80){
      api.setPlan(['safe','balanced','aggressive'][rnd(3)]);
      try{api.doAdvance()}catch(e){note('advance: '+e.message,api.SEA.year+' step '+api.SEA.step);break}
      const b=global.__nodes.hgo; if(/handwrap/.test(global.__nodes.app.innerHTML)&&b&&b.onclick){try{b.onclick()}catch(e){note('hand-over (I am ready): '+e.message.slice(0,60),'on the '+(api.viewName?api.viewName():'?')+' tab')}}
      let n=0;while(api.live&&!api.live.done&&n++<800){
        try{ if(api.live.ask){api.render(); const o=api.live.ask.dp.opts; api.answerLive(o[rnd(o.length)][0])} else api.liveTick() }
        catch(e){note('live: '+e.message,'');break}}
      if(rnd(3)===0){try{api.view(['team','scores','poll','stand','dyn'][rnd(5)])}catch(e){note('leaving a tab open: '+e.message.slice(0,50),'')}}
      if(rnd(4)===0)['team','scores','poll','stand','dyn'].forEach(v=>{try{const h=api.view(v); if(/undefined|NaN|\[object Object\]/.test(h.replace(/<[^>]+>/g,''))){const m=h.replace(/<[^>]+>/g,' ').match(/.{0,40}(undefined|NaN|\[object Object\]).{0,20}/);note('bad text on '+v,m&&m[0])}}catch(e){note('view '+v+': '+e.message,'')}});
      await new Promise(r=>setImmediate(r));
    }
    seasons++;
    try{api.openOffseason()}catch(e){note('openOffseason: '+e.message,'');break}
    for(let k=0;k<3;k++){const S=api.S; if(!S.off)break;
      try{ const h=api.view('team'); if(/undefined|NaN/.test(h.replace(/<[^>]+>/g,'')))note('bad text on offseason',h.replace(/<[^>]+>/g,' ').match(/.{0,40}(undefined|NaN).{0,20}/)[0]); }catch(e){note('offseason view: '+e.message,'')}
      if(S.off.act.userOpen&&S.off.move===null)S.off.move=S.off.jobs.length?S.off.jobs[rnd(S.off.jobs.length)]:'retire';
      const P=S.off.picks; if(P.fa)P.fa=['contend','balanced','young'][rnd(3)]; if(P.draft)P.draft=['bpa','need','upside'][rnd(3)];
      if(P.recruit)P.recruit=Object.keys(P.recruit?{balanced:1}:{})[0]||P.recruit;
      if(P.phil)P.phil=['win','balanced','build','develop','now'][rnd(5)]&&P.phil;
      const yb=api.SEA.year; try{api.commitOffseason()}catch(e){note('commit: '+e.message,'');break}
      if(api.SEA.year===yb&&api.S.off&&api.offseasonBlock()!==null){note('stuck offseason: '+api.offseasonBlock(),'');break}
      await new Promise(r=>setImmediate(r));
    }
    if(api.S.retired||!api.S.myTeam)break;
    // data sanity
    const U=api.U;
    N.forEach(t=>{(U.roster[t]||[]).forEach((p,i)=>{if(!p){note('empty roster slot','');return}
      if(!(p.r>=20&&p.r<=99)||isNaN(p.r))note('bad rating',t+' '+p.n+' '+p.r); if(!p.n)note('nameless player',t);
      if(p.pot<p.r)note('ceiling below rating',t+' '+p.n+' r'+p.r+' pot'+p.pot)});
      if(isNaN(U.program[t]))note('NaN program strength',t)});
  }
}
console.log(file.split('/').pop(),`${seasons} seasons in ${((Date.now()-t0)/1000).toFixed(0)}s`);
const ks=Object.keys(probs); if(!ks.length)console.log('  no problems found');
ks.forEach(k=>console.log(`  ${String(probs[k].n).padStart(4)}x  ${k}   e.g. ${probs[k].eg||''}`));
})();
