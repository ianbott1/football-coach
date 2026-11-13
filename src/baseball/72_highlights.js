/* Baseball's highlights (round 52, core 97_highlights): the home runs, and in "key" mode the inning's biggest hit when
   it scores runs in a close game, drawn on a diamond: the pitch, the swing, the ball's flight to where it lands, the
   runners coming round. The man the commentary names hits it. Shown only while a clip plays (the line score is the
   live screen's own picture). */
const HL_SPORT=(function(){
  const HOME=[0.5,0.9];
  /* round 67: not only home runs (Ian: "it shouldn't say home run first"; show doubles, triples, balls caught at the
     wall, double plays, the big moments). From what the engine logs: home runs; hits that score runs (singles,
     doubles, triples); sacrifice flies, drawn as the deep fly caught at the wall with the runner tagging; double plays;
     strikeouts with two or more on; runners caught stealing. Two at most an inning, the biggest first. */
  function clips(L,d,mode){
    // round 68: "every chance" (all, and the full match) drops the closeness rule and keeps three an inning
    const all=mode==="all"||mode==="full", close=all||Math.abs(d.sh-d.sa)<=3, late=all||(d.seg||0)>=5, C=[];
    (d.ev||[]).forEach(e=>{
      if(e.k==="hr"){ if(mode!=="goals"||close||e.n>=3)C.push([9+e.n,e]); return }
      if(mode==="goals")return;
      if(e.k==="rbi"&&e.hit>=1&&close)C.push([e.hit+e.n+(late?1:0),e]);
      else if(e.k==="rbi"&&e.hit===0&&close)C.push([3+(late?1:0),e]);          // a sacrifice fly
      else if(e.k==="dp"&&close&&late)C.push([4,e]);
      else if(e.k==="kk"&&close&&(e.on||0)>=2)C.push([3+(late?1:0),e]);
      else if(e.k==="cs"&&close&&late)C.push([2,e]); });
    C.sort((a,b)=>b[0]-a[0]); const pick=C.slice(0,all?3:2).map(x=>x[1]);
    // the score after each run-scoring play, so the page ticks up clip by clip (round 70)
    const di=(L.drives||[]).indexOf(d), pv=di>0?L.drives[di-1]:null; let sh=pv?pv.sh||0:0, sa=pv?pv.sa||0:0; const after=new Map();   // the inning keeps only its end score
    (d.ev||[]).forEach(e=>{ if((e.k==="hr"||e.k==="rbi")&&e.n){ if(e.side==="home")sh+=e.n; else sa+=e.n } after.set(e,[sh,sa]) });
    const out=(d.ev||[]).filter(e=>pick.indexOf(e)>=0).map(e=>{ const c=mk(L,e,d); if((e.k==="hr"||e.k==="rbi")&&e.n)c.after=after.get(e); return c });
    // round 70: the out that ends a close game, the tying run at the plate or on base (Ian: "down 1 in the 9th, the game
    // just ended")
    const E=d.last; if(E&&mode!=="goals"){ const gap=Math.abs(d.sh-d.sa), on=(E.r||[]).filter(Boolean).length; if(all||gap<=1||on+1>=gap)out.push(mk(L,E,d)) }
    return out;
  }
  function mk(L,e,d){
    const g=L.g, fieldEv=e.k==="dp"||e.k==="kk"||e.k==="cs", bat=e.k==="end"?e.bat:fieldEv?(e.side==="home"?"away":"home"):e.side, tm=bat==="home"?g.home:g.away, u=e.u||0;
    const kind=e.k==="end"?"end":e.k==="hr"?"hr":e.k==="rbi"&&e.hit===0?"sf":e.k==="rbi"?"hit":e.k;
    const r=mulberry32((u*7919+(d.seg||0)*131+(e.side==="home"?17:29))>>>0);
    let nm=e.nm||""; if(!nm)try{ nm=bsBatter(tm,e.slot!==undefined?e.slot:u%9,u)||"" }catch(er){}
    const ang=(-0.75+r()*1.5)*0.72, hr=e.k==="hr", how=kind==="end"?e.how:null;
    const dist=hr?1.08+r()*0.15:kind==="sf"?0.93+r()*0.04:how==="fly"?0.7+r()*0.2:e.hit===3?0.92:e.hit===2?0.82:0.55;
    const land=[HOME[0]+Math.sin(ang)*dist*0.62, HOME[1]-Math.cos(ang)*dist*0.78];
    const runners=kind==="sf"?1:kind==="kk"?Math.min(3,e.on||2):kind==="dp"||kind==="cs"?1:Math.max(0,(e.n||1)-(hr?1:0));
    // who was on (round 70: the engine now says, by base), and the men at the plate and on the mound for the panels
    const sur=n=>n?String(n).split(" ").slice(-1)[0]:"", on=(e.r||[]).map(sur), fteam=bat==="home"?g.away:g.home;
    const FR=(SEA.roster&&SEA.roster[fteam])||[], pn=e.p==="closer"?(FR[BS_CL]&&FR[BS_CL].n):e.p, pit=pn&&pn!=="bullpen"?bsPlayer(fteam,pn):null, bp=nm?bsPlayer(tm,nm):null, bl=bp&&bp.st2, pl=pit&&pit.st2;
    const panels={bat:{nm:sur(nm),team:tm,line:bl&&bl.ab?`${(bl.h/bl.ab).toFixed(3).replace(/^0/,"")} \u00b7 ${bl.hr||0} HR \u00b7 ${bl.rbi||0} RBI`:"No at-bats yet this season"},
      pit:{nm:pit?sur(pit.n):e.p==="bullpen"?"Bullpen":"",team:fteam,line:pl&&pl.ip?(e.p==="closer"?`${pl.sv||0} SV \u00b7 ${(pl.er*27/pl.ip).toFixed(2)} ERA \u00b7 ${pl.k||0} K`:`${(pl.er*27/pl.ip).toFixed(2)} ERA \u00b7 ${pl.w||0}-${pl.l||0} \u00b7 ${pl.k||0} K`):pit?"No innings yet this season":"In relief"}};
    // round 61: each one its own flight (a high fly or a line drive) and its distance (Instinct). A deep fly that's
    // caught climbs like a home run: you find out at the wall (round 67)
    const arc=hr||kind==="sf"?0.07+r()*0.11:0.03+r()*0.04, ft=hr&&typeof hrFeet==="function"?hrFeet(e):0;
    // round 67: the fielders by number (P, C, 1B, 2B, SS, 3B, LF, CF, RF are roster places 9, 0, 1, 2, 4, 3, 5, 6, 7), the batter
    // by his; a key under the diamond
    const fld=bat==="home"?g.away:g.home, K=hlKits(g.home,g.away), fn=hlNamed(fld,(H=>[9,0,1,2,4,3,5,6,7].map(i=>i!==9&&H.has(i)?BK(i):i))((()=>{ try{ return hurtSet(fld) }catch(e){ return new Set() } })()));   // round 71: the man playing, not the one hurt (Muse: injured Haddad at short)
    const BR=(SEA.roster&&SEA.roster[tm])||[], bi=BR.findIndex(p=>p&&nm&&p.n===nm), bno=bi>=0?shirtNo(tm,bi):null;
    const legend=[{team:fld,kit:K[bat==="home"?1:0],list:fn.filter(Boolean)},{team:tm,kit:K[bat==="home"?0:1],list:bno!=null?[[bno,String(nm).split(" ").slice(-1)[0]]]:[]}];
    // the man on the mound is the day's pitcher (the starter, the closer, or a reliever with no name), not the roster's first starter
    if(e.p){ const pi=pit?FR.indexOf(pit):-1; fn[0]=pi>=0?[shirtNo(fteam,pi),sur(pit.n)]:null; legend[0].list=fn.filter(Boolean) }
    const rv=kind==="end"?(how==="k"?0.62:how==="dp"?0.7:0.66):kind==="kk"?0.62:kind==="dp"?0.7:kind==="cs"?0.56:0.72;
    return {kind,how,on,panels,outs:e.outs,half:bat==="home"?"Bottom":"Top",gap:Math.abs(d.sh-d.sa),reveal:rv,dpTo:r()<0.5?4:3,fn,bno,legend,e,tm,nm:nm?String(nm).split(" ").slice(-1)[0]:"",hr,land,runners,n:e.n||1,inn:d.seg+1,base:3200,inks:hlKits(g.home,g.away).map(k=>k.fill),side:bat,text:"",arc,ft};
  }
  function pitch(x,W,H){
    const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#121722"); bg.addColorStop(1,"#0D1118"); x.fillStyle=bg; x.fillRect(0,0,W,H);
    const P=(a,b)=>[a*W,b*H], [hx,hy]=P(HOME[0],HOME[1]), R=H*0.86, a0=-Math.PI/2-0.82, a1=-Math.PI/2+0.82;
    const fan=(rad)=>{ x.beginPath(); x.moveTo(hx,hy); x.arc(hx,hy,rad,a0,a1); x.closePath() };
    // the stands' edge, the warning track, the outfield grass mown in a checkerboard
    fan(R*1.035); x.fillStyle="#1E2A36"; x.fill();
    fan(R); x.fillStyle="#A9784C"; x.fill();
    x.save(); fan(R*0.955); x.clip(); hlGrass(x,0,0,W,H,{bands:16,base:"#2C7A37",alt:"#33873F",seed:31});
    { const n=16; for(let i=0;i<n;i++){ if(i%2)continue; x.fillStyle="rgba(0,0,0,.05)"; x.fillRect(0,i*H/n,W,H/n) } } x.restore();
    // the outfield wall, padded, with the distances
    x.beginPath(); x.arc(hx,hy,R,a0,a1); x.strokeStyle="#16324A"; x.lineWidth=Math.max(3,W/180); x.stroke();
    x.beginPath(); x.arc(hx,hy,R*1.0,a0,a1); x.strokeStyle="#F2C14E"; x.lineWidth=1; x.stroke();
    x.font=`700 ${Math.max(8,Math.round(W/60))}px 'Barlow Condensed',Impact,sans-serif`; x.fillStyle="rgba(246,250,242,.75)"; x.textAlign="center"; x.textBaseline="middle";
    [[a0+0.06,"330"],[-Math.PI/2-0.42,"375"],[-Math.PI/2,"400"],[-Math.PI/2+0.42,"375"],[a1-0.06,"330"]].forEach(([a,tx])=>x.fillText(tx,hx+Math.cos(a)*R*1.018,hy+Math.sin(a)*R*1.018));
    // the infield dirt: the arc behind the bases, then the grass diamond inside it
    const base=[[0.5,0.9],[0.62,0.72],[0.5,0.54],[0.38,0.72]].map(([a,b])=>P(a,b));
    x.save(); x.beginPath(); x.moveTo(hx,hy); x.arc(hx,hy,H*0.37,-Math.PI/2-0.82,-Math.PI/2+0.82); x.closePath(); x.clip();
    x.fillStyle="#B98656"; x.fillRect(0,0,W,H); hlSpeckle(x,0,0,W,H,Math.round(W*H/30),41,0.12); x.restore();
    const sq=0.065; x.beginPath(); [[0.5,0.9-sq],[0.62-sq,0.72],[0.5,0.54+sq],[0.38+sq,0.72]].map(([a,b])=>P(a,b)).forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py)); x.closePath();
    x.save(); x.clip(); hlGrass(x,0,0,W,H,{bands:8,vertical:false,base:"#2E7E39",alt:"#358B41",seed:33}); x.restore();
    // the cut-outs round the bases, the mound, the plate's circle
    base.forEach(([px,py],i)=>{ if(i===0)return; x.beginPath(); x.arc(px,py,H*0.045,0,Math.PI*2); x.fillStyle="#B98656"; x.fill() });
    const [mx,my]=P(0.5,0.72); x.beginPath(); x.arc(mx,my,H*0.035,0,Math.PI*2); x.fillStyle="#C08E5E"; x.fill(); x.fillStyle="#F4F1E8"; x.fillRect(mx-3,my-0.8,6,1.6);
    x.beginPath(); x.arc(hx,hy,H*0.045,0,Math.PI*2); x.fillStyle="#B98656"; x.fill();
    // the foul lines and the boxes at the plate
    hlLines(x,Math.max(1,W/500),()=>{ [a0,a1].forEach(a=>{ x.beginPath(); x.moveTo(hx,hy); x.lineTo(hx+Math.cos(a)*R,hy+Math.sin(a)*R); x.stroke() });
      x.strokeRect(hx-H*0.035,hy-H*0.02,H*0.022,H*0.04); x.strokeRect(hx+H*0.013,hy-H*0.02,H*0.022,H*0.04) });
    // bases and the plate
    base.forEach(([px,py],i)=>{ x.save(); x.translate(px,py); x.rotate(Math.PI/4); x.fillStyle="#F4F1E8"; const b=i?4:3.4; x.fillRect(-b,-b,2*b,2*b); x.restore() });
    // the dugouts along the lines
    [[0.2,0.94],[0.8,0.94]].forEach(([a,b])=>{ const [px,py]=P(a,b); x.fillStyle="#1C2733"; x.fillRect(px-W*0.06,py-H*0.015,W*0.12,H*0.03) });
  }
  function idle(x,W,H){}   // round 67: nothing to say until something happens (Ian)
  function frame(x,W,H,c,t){
    const P=(a,b)=>[a*W,b*H], ink=c.inks[c.side==="home"?0:1], dink=c.inks[c.side==="home"?1:0], r=Math.max(5,W/85);
    // the fielders: nine of them in their places, the pitcher on the mound
    const F=[[0.5,0.72],[0.5,0.95],[0.6,0.66],[0.56,0.6],[0.44,0.6],[0.4,0.66],[0.25,0.38],[0.5,0.25],[0.75,0.38]];
    const bases=[[0.5,0.9],[0.62,0.72],[0.5,0.54],[0.38,0.72],[0.5,0.9]];
    const along=(k)=>{ const f=Math.max(0,Math.min(4,k)), i=Math.min(3,Math.floor(f)), s=f-i; return [hlLerp(bases[i][0],bases[i+1][0],s),hlLerp(bases[i][1],bases[i+1][1],s)] };
    const tp=0.18, tl=c.reveal;
    // the game's last out plays as the out it was: a strikeout, a fly caught, a grounder thrown to first, a double play
    const K=c.kind==="end"?({k:"kk",dp:"dp",fly:"fo",gb:"go"}[c.how]||"go"):c.kind;
    const flight=K==="hr"||K==="hit"||K==="sf"||K==="fo";
    const fi=c.land[0]<0.4?6:c.land[0]>0.6?8:7, gbTo=c.land[0]<0.45?(c.land[0]<0.4?5:4):3;
    // round 70: the fielder runs the ball down and throws it in (Ian: "they keep running to the ball and throw it")
    const tGet=K==="hit"?tl+0.07:tl, roll=K==="hit"?[c.land[0]+(c.land[0]-HOME[0])*0.06,c.land[1]+(c.land[1]-HOME[1])*0.06]:c.land;
    const wallAt=[HOME[0]+(c.land[0]-HOME[0])*0.86,HOME[1]+(c.land[1]-HOME[1])*0.86];
    const throwTo=K==="sf"?[0.5,0.89]:bases[2];
    const ballAt=tt=>{ tt=Math.max(0,tt); const mound=[0.5,0.72], plate=[0.5,0.905], mitt=[0.5,0.93];
      if(tt<tp)return [mound[0],hlLerp(mound[1],plate[1],tt/tp),0];
      if(flight){ if(tt<tl){ const s=(tt-tp)/(tl-tp); return [hlLerp(HOME[0],c.land[0],s),hlLerp(HOME[1],c.land[1],s),Math.sin(s*Math.PI)*(c.arc||0.05)] }
        if(K==="hr")return [c.land[0],c.land[1],0];
        if(tt<tGet){ const s=(tt-tl)/(tGet-tl); return [hlLerp(c.land[0],roll[0],s),hlLerp(c.land[1],roll[1],s),Math.abs(Math.sin(s*Math.PI*2))*0.008*(1-s)] }
        const s=Math.min(1,(tt-tGet-0.03)/0.16); if(s<=0)return [roll[0],roll[1],0];
        return [hlLerp(roll[0],throwTo[0],s),hlLerp(roll[1],throwTo[1],s),Math.sin(s*Math.PI)*0.03] }
      if(K==="kk"){ const s=Math.min(1,(tt-tp)/(tl-tp)); return [0.5,hlLerp(plate[1],mitt[1],s),0] }
      if(K==="cs"){ if(tt<tp+0.08)return [0.5,hlLerp(plate[1],mitt[1],(tt-tp)/0.08),0]; const s=Math.min(1,(tt-tp-0.08)/(tl-tp-0.08)); return [hlLerp(0.5,bases[2][0],s),hlLerp(mitt[1],bases[2][1],s),Math.sin(s*Math.PI)*0.02] }
      if(K==="go"){ const fd=F[gbTo], g1=0.42; if(tt<g1){ const s=(tt-tp)/(g1-tp); return [hlLerp(HOME[0],fd[0],s),hlLerp(HOME[1],fd[1],s),0] }
        const s=Math.min(1,(tt-g1-0.03)/(tl-g1-0.03)); if(s<=0)return [fd[0],fd[1],0]; return [hlLerp(fd[0],bases[1][0],s),hlLerp(fd[1],bases[1][1],s),Math.sin(s*Math.PI)*0.015] }
      // a double play: the grounder, the flip to second, the throw to first
      const fd=F[c.dpTo], g1=0.4, g2=0.53;
      if(tt<g1){ const s=(tt-tp)/(g1-tp); return [hlLerp(HOME[0],fd[0],s),hlLerp(HOME[1],fd[1],s),0] }
      if(tt<g2){ const s=(tt-g1)/(g2-g1); return [hlLerp(fd[0],bases[2][0],s),hlLerp(fd[1],bases[2][1],s),0] }
      const s=Math.min(1,(tt-g2)/(tl-g2)); return [hlLerp(bases[2][0],bases[1][0],s),hlLerp(bases[2][1],bases[1][1],s),Math.sin(s*Math.PI)*0.015] };
    const [bx,by,z]=ballAt(t);
    // the fielders
    const goal=K==="hr"?wallAt:K==="hit"?roll:[Math.max(0.08,Math.min(0.92,c.land[0])),Math.max(0.06,c.land[1])];
    const chase=flight&&t>tp?Math.min(1,(t-tp)/((K==="hit"?tGet:tl)-tp)):0;
    F.forEach((p,i)=>{ let q=p;
      if(flight&&i===fi)q=[hlLerp(p[0],goal[0],hlEase(chase)),hlLerp(p[1],goal[1],hlEase(chase))];
      if((K==="dp"&&i===(c.dpTo===4?3:4))||(K==="cs"&&i===4)||(flight&&K!=="hr"&&i===(c.land[0]<0.5?4:3))){ const s=Math.min(1,Math.max(0,(t-tp)/0.25)); q=[hlLerp(p[0],bases[2][0],s),hlLerp(p[1],bases[2][1]+0.01,s)] }
      if((K==="dp"||K==="go")&&i===2){ const s=Math.min(1,Math.max(0,(t-tp)/0.3)); q=[hlLerp(p[0],bases[1][0]-0.01,s),hlLerp(p[1],bases[1][1],s)] }
      if(K==="go"&&i===gbTo){ const s=Math.min(1,Math.max(0,(t-tp)/(0.42-tp))); q=[hlLerp(p[0],p[0]+(HOME[0]-p[0])*0.12,s),hlLerp(p[1],p[1]+(HOME[1]-p[1])*0.12,s)] }
      if(K==="sf"&&i===1&&t>tl)q=[0.5,hlLerp(0.95,0.91,Math.min(1,(t-tl)/0.1))];
      const [px,py]=P(q[0],q[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)","",c.fn&&c.fn[i]?{num:c.fn[i][0],sub:c.fn[i][1]}:null) });
    // the batter and the runners, by name (round 70)
    const after=Math.max(0,(t-tp)/(1-tp)), hitN=c.e.hit||1;
    let bRun=K==="hr"?after*4:K==="hit"?after*Math.min(3,hitN):K==="sf"||K==="fo"?Math.min(0.7,after*1.4):K==="dp"||K==="go"?Math.min(0.95,after*1.3):0;
    const [bxp,byp]=P(...along(bRun)); hlDot(x,bxp,byp,r,ink,"rgba(0,0,0,.6)",t>=tl&&c.kind!=="end"?c.nm:"",c.bno!=null?{num:c.bno,sub:c.nm}:{sub:c.nm});
    const runAt=(start,k,nm)=>{ const v=Math.min(4,start+k); if(v>=4)return; const [rx,ry]=P(...along(v)); hlDot(x,rx,ry,r,ink,"rgba(0,0,0,.6)","",nm?{sub:nm}:null) };
    const on=c.on&&c.on.length===3?c.on:null;
    if(on){ // the men who were on: the leading ones score, the rest move up behind them
      const occ=[2,1,0].filter(i=>on[i]), scoring=K==="hr"?occ.length:K==="hit"?Math.min(occ.length,c.n):K==="sf"?1:0;
      let cap=K==="hit"?Math.min(3,hitN)-1:3;   // the batter's base, a runner stays ahead of it
      occ.forEach((i,k)=>{ const st=i+1; let fin=st;
        if(k<scoring)fin=4; else if(K==="hit"){ fin=Math.min(3,st+hitN); cap=Math.max(cap,0) }
        else if(K==="dp"&&i===0)fin=1.95; else if(K==="cs"&&i===0)fin=2;
        const sp=K==="cs"?Math.min(1,Math.max(0,(t-tp+0.05)/(tl-tp+0.03))):K==="sf"?(t<tl?0:Math.min(1,(t-tl)/(1-tl)*1.1)):Math.min(1,after*1.3);
        const lead=K==="kk"||K==="go"||K==="fo"?0.06:0;
        runAt(st,(fin-st)*sp+lead,on[i]) }) }
    else if(K==="hr"||K==="hit")for(let k=0;k<Math.min(3,c.runners);k++)runAt(3-k,bRun,"");
    else if(K==="sf")runAt(3,t<tl?0.08:Math.min(1,(t-tl)/(1-tl)*1.1),"");
    else if(K==="kk")for(let k=0;k<c.runners;k++)runAt(1+k,0.06,"");
    else if(K==="dp")runAt(1,Math.min(0.95,after*1.2),"");
    else if(K==="cs")runAt(1,Math.min(1,Math.max(0,(t-tp+0.05)/(tl-tp+0.03))),"");
    const tr=[]; for(let q=8;q>=1;q--){ const b=ballAt(t-q*0.012); const pp=P(b[0],b[1]); tr.push([pp[0],pp[1]-b[2]*H]) }
    const [qx,qy]=P(bx,by); hlBall(x,qx,qy,r*0.55,z*H,t>tp?tr:null,{ring:"#C8102E"});
    // the man at the plate and the man on the mound, low down either side (round 70: Ian)
    if(c.panels){ const pw=Math.min(W*0.28,170), fs=Math.max(9,Math.round(pw/12)), ph=fs*3.3, py=H*0.66;
      const card=(l,cap,o,col)=>{ if(!o||!o.nm)return; x.save(); x.fillStyle="rgba(10,12,18,.84)"; hlRound(x,l,py,pw,ph,5); x.fill(); x.fillStyle=col; x.fillRect(l,py,3,ph);
        x.textAlign="left"; x.textBaseline="top"; x.fillStyle="rgba(255,255,255,.55)"; x.font=`600 ${Math.round(fs*0.8)}px 'Barlow Condensed',Impact,sans-serif`; x.fillText(cap,l+9,py+fs*0.35);
        x.fillStyle="#fff"; x.font=`700 ${Math.round(fs*1.15)}px 'Barlow Condensed',Impact,sans-serif`; x.fillText(o.nm,l+9,py+fs*1.15,pw-14);
        x.fillStyle="rgba(255,226,92,.95)"; x.font=`500 ${Math.round(fs*0.85)}px 'IBM Plex Mono',monospace`; x.fillText(o.line,l+9,py+fs*2.35,pw-14); x.restore() };
      card(8,"AT BAT",c.panels.bat,ink); card(W-8-pw,"PITCHING",c.panels.pit,dink) }
    // the inning only, until it's done: the result waits for the ball (round 67)
    const onTxt=on?(()=>{ const b=[0,1,2].filter(i=>on[i]).map(i=>["1st","2nd","3rd"][i]); return !b.length?"bases empty":b.length===3?"bases loaded":(b.length===1?"runner on ":"runners on ")+b.join(" and ") })():"";
    const top=c.kind==="end"?`${c.half} ${ordw(c.inn)} · ${c.outs} out · ${onTxt}${c.gap?` · down ${c.gap}`:" · tied"}`
      :`${ordw(c.inn)}${K==="kk"?" · runners on":""}`;
    const HITS=["","single","double","triple"];
    const end=t<tl?null:c.kind==="end"?(K==="kk"?"STRIKE THREE! Ballgame":K==="fo"?"CAUGHT! Ballgame":K==="dp"?"DOUBLE PLAY! Ballgame":"OUT AT FIRST! Ballgame")
      :K==="hr"?(c.n===4?`GRAND SLAM! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`:`HOME RUN! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`)
      :K==="hit"?`${c.nm}: ${HITS[c.e.hit||1]}, ${c.n} in`:K==="sf"?"Caught at the wall! The run scores"
      :K==="kk"?`STRIKE THREE! ${c.runners} left on`:K==="dp"?"DOUBLE PLAY!":K==="cs"?"CAUGHT STEALING!":null;
    hlCaption(x,W,H,top,end,K==="dp"||K==="kk"||K==="cs"||c.kind==="end"?dink:ink);
  }
  /* the crowd at the moment the run crosses (round 70: Ian, a celebration for your home runs, a smaller one for a run) */
  function sound(c){ if(!c.after||typeof sfx!=="function")return false; const mine=(c.side==="home")===(live&&live.g.home===S.myTeam);
    sfx(mine?(c.kind==="hr"?"hr":"run"):"against"); return true }

  // round 72: the header says the inning a clip shows ("After the 1st" stayed up through the 2nd's home run)
  const headClock=c=>c&&c.inn&&c.half?`${c.half} of the ${ordw(c.inn)}`:null;
  return {reveal:0.72, collapseIdle:true, aspect:0.62, clips, pitch, idle, frame, sound, headClock, goalsLabel:"Big home runs"};
})();
