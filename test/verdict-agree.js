/* The graded call ("X and Y won about as often") and the post-game line ("your call wins more often")
   weigh the same call with the same replays, so they never disagree in words (Grokbot, three reports:
   5 of 20 calls disagreed on the build before). node test/verdict-agree.js [file.html]  MATCH or MISMATCH */
const {load}=require('./harness.js');
const file=process.argv[2]||require("path").join(__dirname,"..","dist","football-coach-pro.html"); let pairs=0,bad=0,ex=[];
for(const seed of [1,2,3,4]){ const A=load({file,expose:['S','SEA','newDynasty','doAdvance','live','liveTick','answerLive']}); A.newDynasty('Denver',seed,'T');
  for(let w=0;w<10;w++){ A.doAdvance(); let n=0; while(A.live&&!A.live.done&&n++<800){ const L=A.live; if(L.ask){ const o=L.ask.dp.opts; A.answerLive(o[(n+w)%o.length][0]) } else A.liveTick() } }
  for(const k in (A.S.played||{})) for(const p of A.S.played[k]){ if(!p.impact||!p.reads)continue;
    for(const c of p.impact){ const v=p.reads.find(x=>x.k==='call'&&x.h===c.h); if(!v)continue; let rp,rd;
      if(v.rk){rp=v.rk[c.pk];rd=v.rk[c.dk]} else { const L=(l,x)=>l&&l.split(':')[0]===x; rp=L(v.mine,c.pick)?v.pr:undefined; rd=L(v.best,c.def)?v.br:L(v.other,c.def)?v.or:undefined }
      if(rp===undefined||rd===undefined)continue; pairs++;
      const d=rp-rd, readSame=Math.abs(d)<=3, impSame=Math.abs(c.worth)<=0.03;
      if(readSame!==impSame){bad++; if(ex.length<3)ex.push(`${c.h}: read ${rp} vs ${rd}, impact worth ${c.worth}`)} } } }
console.log((bad||pairs<10?'MISMATCH ':'MATCH ')+`${pairs} calls weighed both ways, ${bad} disagree in words`+(ex.length?': '+ex.join(' | '):'')); process.exit(bad||pairs<10?1:0);
