/* ============ the transfer market: English football ============ */
/* Players under contract cost a fee as well as wages. A fee is set by what
   he earns (the pyramid's one wage scale), how young he is, how long his
   contract runs, and whether he's the selling club's starter. Players move
   up the pyramid, not down: one won't join a club in a lower division, and
   in the same division he wants a club of at least his own club's stature.
   Your transfer kitty is a share of what the club pays its squad and a little
   of what it earns, plus what you sell for, plus half of whatever you didn't
   spend last summer. Bigger
   clubs bid for your best players; you can take the money or keep them.
   Only your bids and sales move players between clubs: the computer's clubs
   rebuild through the academy and free transfers, as before, so the league
   behaves as it did. */
const KITTY_PAY=+((typeof process!=="undefined"&&process.env&&process.env.KP)||0.15);   // the kitty: a share of what the club pays its squad...
const KITTY_REV=+((typeof process!=="undefined"&&process.env&&process.env.KR)||0.015);   // ...and a little of what it earns
const KITTY_CARRY=0.5;         // of what's left at the end of the window
/* next season's division: during the summer, before the window runs, the
   season's promotions and relegations already decide it (as nflRun applies them) */
function tNextConf(t){
  if(typeof SEA==="undefined"||!SEA||SEA.phase!=="done"||!SEA.po||!SEA.po.PL||(U&&U.moved&&U.moved.year===SEA.year))return CONF[t];
  const P=SEA.po;
  if(P.PL.down.indexOf(t)>=0)return "CH";
  for(const [hi,lo] of [["CH","L1"],["L1","L2"],["L2","NL"]]){ if(P[hi].down.indexOf(t)>=0)return lo; if(P[lo].up.indexOf(t)>=0)return hi }
  if(P.CH.up.indexOf(t)>=0)return "PL";
  if(P.NN.up.indexOf(t)>=0||P.NS.up.indexOf(t)>=0)return "NL";
  if(P.NL.down.indexOf(t)>=0)return LEAGUE.region[t]==="S"?"NS":"NN";
  return CONF[t];
}
const tierOfClub=t=>DIVS[tNextConf(t)].tier;
function tFee(p,starter){
  const w=nflAsk(p.r,p.p,p.age), young=Math.max(0,26-p.age)*0.12;
  const yrs=Math.min(4,Math.max(1,p.k?p.k.yrs:2));
  let f=w*(2.4+young)*(0.6+0.2*yrs)*(starter?1.25:1);
  return Math.max(0.05,Math.round(f*10)/10);
}
const money=x=>"£"+(x>=10?Math.round(x):x>=1?x.toFixed(1):x.toFixed(2))+"M";
/* would he join you? */
function tWilling(u,buyer,seller,prog){
  prog=prog||u.program;
  const tb=tierOfClub(buyer), ts=tierOfClub(seller);
  if(tb<ts)return {ok:true};
  if(tb>ts)return {ok:false,why:"won't drop a division"};
  if((prog[buyer]||1500)>=(prog[seller]||1500)-50)return {ok:true};
  return {ok:false,why:"won't leave for a smaller club"};
}
/* the kitty: set when the summer opens, from the season just played's wage bill
   (so re-signing or letting players go doesn't move it) */
function tKitty(u,t,pay){ return Math.round((pay*KITTY_PAY+budgetOf(u,t)*KITTY_REV)*10)/10+((u.kitty&&u.kitty[t])||0) }
const tKey=(t,p)=>t+"|"+p.n+"|"+p.p;
/* players who'd improve you, by position: under contract beyond this
   season, better than your starter (or, for a weak backup, than him) */
function tMarket(u,my,humans){
  const R=u.roster[my], out=[];
  NAMES.forEach(t=>{
    if(t===my||(humans&&humans.indexOf(t)>=0))return;
    const T=u.roster[t], W=tWilling(u,my,t);
    T.forEach((p,j)=>{
      if(!p||!p.k||p.k.yrs<=1)return;                          // out of contract: a free transfer instead
      const i=j%POS.length, s=R[i], b=R[BK(i)];
      const better=s?p.r>=s.r+2:true, depth=b?p.r>=b.r+6&&p.r>=(s?s.r-3:0):false;
      if(!better&&!depth)return;
      out.push({key:tKey(t,p),n:p.n,p:p.p,i:i,team:t,age:p.age,r:p.r,pot:p.pot,
        fee:tFee(p,j<POS.length), wage:nflAsk(p.r,p.p,p.age), willing:W.ok, why:W.why||"", starter:better});
    });
  });
  return out.sort((a,b)=>(b.r-a.r)||(a.fee-b.fee));
}
/* bids for your players: the biggest club he'd start for, at a premium */
function tOffers(u,my,humans){
  const R=u.roster[my], offers=[];
  R.forEach((p,j)=>{
    if(!p||!p.k||p.k.yrs<=1||p.r<55)return;
    const i=j%POS.length; let best=null;
    NAMES.forEach(t=>{
      if(t===my||(humans&&humans.indexOf(t)>=0))return;
      if(!tWilling(u,t,my).ok)return;
      const T=u.roster[t]; if(!(T[i]&&p.r>=T[i].r+3))return;
      const wage=nflAsk(p.r,p.p,p.age); if(payroll(T)+wage>budgetOf(u,t))return;
      if(!best||(u.program[t]||0)>(u.program[best]||0))best=t;
    });
    if(best)offers.push({key:tKey(my,p),n:p.n,p:p.p,r:p.r,age:p.age,team:best,fee:Math.round(tFee(p,j<POS.length)*1.1*10)/10,starter:j<POS.length});
  });
  return offers.sort((a,b)=>b.fee-a.fee).slice(0,3);
}
/* carry out the window for one club (called in the offseason run, after
   contracts, ageing, retirements and trades): sales first, then bids, in
   your order, while the money and the wage budget last */
function tWindow(u,t,ch,rep,pool,leave,prog){
  const R=u.roster[t]; let kitty=ch.kitty!=null?ch.kitty:tKitty(u,t,payroll(R));
  const log=rep.transfers[t]=rep.transfers[t]||[];
  (ch.sales||[]).forEach(o=>{
    const j=R.findIndex(p=>p&&tKey(t,p)===o.key), [,n,pos]=o.key.split("|");
    if(j<0){log.push({out:true,n:n,p:pos,to:o.team,done:false,why:"retired before the deal"});return}
    const p=R[j]; R[j]=null; kitty+=o.fee;
    p.yrsHere=0; p.joined=u.year+1; p.k={sal:nflAsk(p.r,p.p,p.age),yrs:nflYears(p.age,p.p)};
    const B=u.roster[o.team], gone=nflPlace(B,p);
    if(gone){ if(gone.r>=58){gone.from=o.team;pool.push(gone)} else leave(o.team,gone,"released") }
    leave(t,p,"sold to "+o.team);
    log.push({out:true,n:p.n,p:p.p,r:p.r,to:o.team,fee:o.fee,done:true});
  });
  POS.forEach((_,i)=>{if(!R[i]&&R[BK(i)]){R[i]=R[BK(i)];R[BK(i)]=null}});
  (ch.bids||[]).forEach(key=>{
    const [st,n,pos]=key.split("|"), S2=u.roster[st]; const j=S2?S2.findIndex(p=>p&&tKey(st,p)===key):-1;
    if(j<0){log.push({n:n,p:pos,from:st,done:false,why:"retired or moved on before the window"});return}
    const p=S2[j], W=tWilling(u,t,st,prog);
    if(!W.ok){log.push({n:n,p:pos,from:st,done:false,why:W.why});return}
    const T=(ch.bidTerms||{})[key], fee=T?T.fee:tFee(p,j<POS.length), wage=T?T.wage:nflAsk(p.r,p.p,p.age);
    if(fee>kitty){log.push({n:n,p:pos,from:st,done:false,why:`${money(fee)} was more than you had left (${money(kitty)})`});return}
    if(payroll(R)+wage>budgetOf(u,t)){log.push({n:n,p:pos,from:st,done:false,why:`his ${money(wage)} a year wouldn't fit the wage budget`});return}
    S2[j]=null; if(j<POS.length&&S2[BK(j)]){S2[j]=S2[BK(j)];S2[BK(j)]=null}
    kitty-=fee; p.k={sal:wage,yrs:nflYears(p.age,p.p)}; p.yrsHere=0; p.joined=u.year+1; p.keep=true;
    const out=nflPlace(R,p);
    if(out){ rep.released[t].push({n:out.n,p:out.p,r:out.r}); if(out.r>=58){out.from=t;pool.push(out)} else leave(t,out,"released") }
    log.push({n:p.n,p:p.p,r:p.r,from:st,fee:fee,wage:wage,done:true});
  });
  u.kitty=u.kitty||{}; u.kitty[t]=Math.round(kitty*KITTY_CARRY*10)/10;
  rep.kittyLeft=rep.kittyLeft||{}; rep.kittyLeft[t]=Math.round(kitty*10)/10;
}
