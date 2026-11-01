/* The transfer market (Soccer Coach): a bid inside the kitty and the wage
   budget brings the player in and takes him from his club; one beyond the
   kitty fails, with the reason; a player won't drop a division; selling
   adds the fee to the kitty, and the buyer gets the player; half of what's
   left carries over. Then what the market looks like from each division.
     node test/transfers.js */
const path=require('path');const {load}=require('./harness.js');
const F=path.join(__dirname,'..','dist','soccer-coach.html');
let bad=0,checks=0; const ok=(c,msg)=>{checks++; if(!c){bad++; console.log('  FAIL '+msg)}};
const EXP=['S','SEA','U','NAMES','CONF','newDynasty','openOffseason','commitOffseason','tMarket','tKitty','tOffers','tWilling','tFee','nflPlannedPay','tKey','tNextConf'];
const season=A=>{ let g=0; while(A.SEA.phase!=='done'&&g++<200)A.SEA.advance(); A.openOffseason() };
const finish=A=>{ for(let c=0;c<4;c++){const S=A.S; if(!S.off)break; if(S.off.act.userOpen&&S.off.move===null)S.off.move=S.myTeam; A.commitOffseason()} };
const onRoster=(A,t,n)=>A.U.roster[t].some(p=>p&&p.n===n);
const tier={PL:1,CH:2,L1:3,L2:4,NL:5,NN:6,NS:6};
// a full window: buy what fits, sell one if offered
for(const [team,seed] of [['Brentford',3],['Coventry City',4],['Bradford City',5]]){
  const A=load({file:F,expose:EXP}); A.newDynasty(team,seed,'T'); season(A);
  if(A.S.myTeam!==team)continue;                                 // sacked: not this test
  const my=team, pay=A.nflPlannedPay(), kitty=A.S.off.picks.kitty, mkt=A.tMarket(A.U,my,[]);
  const nc=t=>tier[A.tNextConf(t)];
  ok(mkt.every(x=>x.willing===(nc(my)<nc(x.team)||(nc(my)===nc(x.team)&&A.U.program[my]>=A.U.program[x.team]-50))),`${my}: a "would he come" that breaks the rule`);
  const can=mkt.filter(x=>x.willing&&x.fee<=kitty*0.6).slice(0,1), cant=mkt.filter(x=>x.willing&&x.fee>kitty*1.5).slice(0,1);
  const offers=A.tOffers(A.U,my,[]), sell=offers[0];
  A.S.off.picks.bids=can.concat(cant).map(x=>x.key);
  if(sell)A.S.off.picks.sales=[{key:sell.key,team:sell.team,fee:sell.fee}];
  const carryBefore=(A.U.kitty&&A.U.kitty[my])||0;
  finish(A);
  const L=A.S.history[A.S.history.length-1].league.transfers||[];
  can.forEach(x=>{ const r=L.find(e=>e.n===x.n&&!e.out);
    ok(r&&(r.done||/retired/.test(r.why)),`${my}: an affordable bid for ${x.n} (${x.fee}M of ${kitty.toFixed(1)}M) didn't go through${r?": "+r.why:""}`);
    if(r&&r.done){ ok(onRoster(A,my,x.n),`${my}: ${x.n} bought but not in the squad`); ok(!onRoster(A,x.team,x.n),`${my}: ${x.n} still at ${x.team}`) } });
  cant.forEach(x=>{ const r=L.find(e=>e.n===x.n&&!e.out); ok(r&&!r.done&&/more than you had/.test(r.why),`${my}: a bid beyond the kitty for ${x.n} went through or gave no reason`) });
  if(sell){ const r=L.find(e=>e.out&&e.n===sell.n); ok(r&&r.done,`${my}: the sale of ${sell.n} didn't go through`);
    ok(!onRoster(A,my,sell.n)&&onRoster(A,sell.team,sell.n),`${my}: ${sell.n} wasn't sold to ${sell.team}`) }
  const left=A.S.history[A.S.history.length-1].league.kittyLeft;
  ok(Math.abs(((A.U.kitty&&A.U.kitty[my])||0)-Math.round(left*0.5*10)/10)<0.11,`${my}: carried ${A.U.kitty&&A.U.kitty[my]} of ${left} left (want half)`);
  const W=mkt.filter(x=>x.willing&&x.starter), fees=W.map(x=>x.fee).sort((a,b)=>a-b), gain=W.filter(x=>x.fee<=kitty).map(x=>x.r-A.U.roster[my][x.i].r);
  console.log(`  ${my.padEnd(14)} kitty ${kitty.toFixed(1)}M, ${W.length} willing starter upgrades (median fee ${(fees[fees.length>>1]||0).toFixed(1)}M), ${W.filter(x=>x.fee<=kitty).length} affordable, best affordable gain +${Math.max(0,...gain)}; offers ${offers.length}; bought ${L.filter(e=>e.done&&!e.out).length}, sold ${L.filter(e=>e.done&&e.out).length}; carried ${(A.U.kitty&&A.U.kitty[my])||0}M`);
}
// nobody drops a division
{ const A=load({file:F,expose:EXP}); A.newDynasty('Bradford City',8,'T');
  const pl=A.NAMES.find(t=>A.CONF[t]==='PL');
  ok(!A.tWilling(A.U,'Bradford City',pl).ok,'a Premier League player would drop to Bradford');
  ok(A.tWilling(A.U,pl,'Bradford City').ok,'a Bradford player would turn down the Premier League'); }
console.log(bad?`MISMATCH ${bad} of ${checks} checks failed`:`MATCH ${checks} checks: the transfer window works`);
process.exit(bad?1:0);
