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
    const close=Math.abs(d.sh-d.sa)<=3, late=(d.seg||0)>=5, C=[];
    (d.ev||[]).forEach(e=>{
      if(e.k==="hr"){ if(mode!=="goals"||close||e.n>=3)C.push([9+e.n,e]); return }
      if(mode!=="key")return;
      if(e.k==="rbi"&&e.hit>=1&&close)C.push([e.hit+e.n+(late?1:0),e]);
      else if(e.k==="rbi"&&e.hit===0&&close)C.push([3+(late?1:0),e]);          // a sacrifice fly
      else if(e.k==="dp"&&close&&late)C.push([4,e]);
      else if(e.k==="kk"&&close&&(e.on||0)>=2)C.push([3+(late?1:0),e]);
      else if(e.k==="cs"&&close&&late)C.push([2,e]); });
    C.sort((a,b)=>b[0]-a[0]); const pick=C.slice(0,2).map(x=>x[1]);
    return (d.ev||[]).filter(e=>pick.indexOf(e)>=0).map(e=>mk(L,e,d));
  }
  function mk(L,e,d){
    const g=L.g, fieldEv=e.k==="dp"||e.k==="kk"||e.k==="cs", bat=fieldEv?(e.side==="home"?"away":"home"):e.side, tm=bat==="home"?g.home:g.away, u=e.u||0;
    const kind=e.k==="hr"?"hr":e.k==="rbi"&&e.hit===0?"sf":e.k==="rbi"?"hit":e.k;
    const r=mulberry32((u*7919+(d.seg||0)*131+(e.side==="home"?17:29))>>>0);
    let nm=e.nm||""; if(!nm)try{ nm=bsBatter(tm,e.slot!==undefined?e.slot:u%9,u)||"" }catch(er){}
    const ang=(-0.75+r()*1.5)*0.72, hr=e.k==="hr";
    const dist=hr?1.08+r()*0.15:kind==="sf"?0.93+r()*0.04:e.hit===3?0.92:e.hit===2?0.82:0.55;
    const land=[HOME[0]+Math.sin(ang)*dist*0.62, HOME[1]-Math.cos(ang)*dist*0.78];
    const runners=kind==="sf"?1:kind==="kk"?Math.min(3,e.on||2):kind==="dp"||kind==="cs"?1:Math.max(0,(e.n||1)-(hr?1:0));
    // round 61: each one its own flight (a high fly or a line drive) and its distance (Instinct). A deep fly that's
    // caught climbs like a home run: you find out at the wall (round 67)
    const arc=hr||kind==="sf"?0.07+r()*0.11:0.03+r()*0.04, ft=hr&&typeof hrFeet==="function"?hrFeet(e):0;
    // round 67: the fielders by number (P, C, 1B, 2B, SS, 3B, LF, CF, RF are roster places 9, 0, 1, 2, 4, 3, 5, 6, 7), the batter
    // by his; a key under the diamond
    const fld=bat==="home"?g.away:g.home, K=hlKits(g.home,g.away), fn=hlNamed(fld,[9,0,1,2,4,3,5,6,7]);
    const BR=(SEA.roster&&SEA.roster[tm])||[], bi=BR.findIndex(p=>p&&nm&&p.n===nm), bno=bi>=0?shirtNo(tm,bi):null;
    const legend=[{team:fld,kit:K[bat==="home"?1:0],list:fn.filter(Boolean)},{team:tm,kit:K[bat==="home"?0:1],list:bno!=null?[[bno,String(nm).split(" ").slice(-1)[0]]]:[]}];
    return {kind,reveal:kind==="kk"?0.62:kind==="dp"?0.7:kind==="cs"?0.56:0.72,dpTo:r()<0.5?4:3,fn,bno,legend,e,tm,nm:nm?String(nm).split(" ").slice(-1)[0]:"",hr,land,runners,n:e.n||1,inn:d.seg+1,base:3200,inks:hlKits(g.home,g.away).map(k=>k.fill),side:bat,text:"",arc,ft};
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
    const tp=0.18, K=c.kind, tl=c.reveal;
    const flight=K==="hr"||K==="hit"||K==="sf";
    // where the ball is at a moment, by the kind of play
    const ballAt=tt=>{ tt=Math.max(0,tt); const mound=[0.5,0.72], plate=[0.5,0.905], mitt=[0.5,0.93];
      if(tt<tp)return [mound[0],hlLerp(mound[1],plate[1],tt/tp),0];
      if(flight){ if(tt<tl){ const s=(tt-tp)/(tl-tp); return [hlLerp(HOME[0],c.land[0],s),hlLerp(HOME[1],c.land[1],s),Math.sin(s*Math.PI)*(c.arc||0.05)] }
        if(K==="sf"){ const s=Math.min(1,(tt-tl)/0.2); return [hlLerp(c.land[0],0.5,s*0.5),hlLerp(c.land[1],0.62,s*0.5),0] } return [c.land[0],c.land[1],0] }
      if(K==="kk"){ const s=Math.min(1,(tt-tp)/(tl-tp)); return [0.5,hlLerp(plate[1],mitt[1],s),0] }
      if(K==="cs"){ if(tt<tp+0.08)return [0.5,hlLerp(plate[1],mitt[1],(tt-tp)/0.08),0]; const s=Math.min(1,(tt-tp-0.08)/(tl-tp-0.08)); return [hlLerp(0.5,bases[2][0],s),hlLerp(mitt[1],bases[2][1],s),Math.sin(s*Math.PI)*0.02] }
      // a double play: the grounder, the flip to second, the throw to first
      const fd=F[c.dpTo], g1=0.4, g2=0.53;
      if(tt<g1){ const s=(tt-tp)/(g1-tp); return [hlLerp(HOME[0],fd[0],s),hlLerp(HOME[1],fd[1],s),0] }
      if(tt<g2){ const s=(tt-g1)/(g2-g1); return [hlLerp(fd[0],bases[2][0],s),hlLerp(fd[1],bases[2][1],s),0] }
      const s=Math.min(1,(tt-g2)/(tl-g2)); return [hlLerp(bases[2][0],bases[1][0],s),hlLerp(bases[2][1],bases[1][1],s),Math.sin(s*Math.PI)*0.015] };
    const [bx,by,z]=ballAt(t);
    // the fielders: an outfielder chases a ball in the air (and catches the deep fly); the middle infielders cover second
    const chase=flight&&t>tp?Math.min(1,(t-tp)/(tl-tp)):0, fi=c.land[0]<0.4?6:c.land[0]>0.6?8:7;
    F.forEach((p,i)=>{ let q=p;
      if(flight&&i===fi){ const k=K==="sf"?1:0.8; q=[hlLerp(p[0],Math.max(0.08,Math.min(0.92,c.land[0])),chase*k),hlLerp(p[1],Math.max(0.06,c.land[1]),chase*k)] }
      if((K==="dp"&&i===(c.dpTo===4?3:4))||(K==="cs"&&i===4)){ const s=Math.min(1,Math.max(0,(t-tp)/0.25)); q=[hlLerp(p[0],bases[2][0],s),hlLerp(p[1],bases[2][1]+0.01,s)] }
      if(K==="dp"&&i===2){ const s=Math.min(1,Math.max(0,(t-tp)/0.3)); q=[hlLerp(p[0],bases[1][0]-0.01,s),hlLerp(p[1],bases[1][1],s)] }
      const [px,py]=P(q[0],q[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)","",c.fn&&c.fn[i]?{num:c.fn[i][0]}:null) });
    // the batter and the runners
    const after=Math.max(0,(t-tp)/(1-tp));
    let bRun=K==="hr"?after*4:K==="hit"?after*Math.min(3,c.e.hit||1):K==="sf"?Math.min(0.7,after*1.4):K==="dp"?Math.min(0.95,after*1.3):0;
    const [bxp,byp]=P(...along(bRun)); hlDot(x,bxp,byp,r,ink,"rgba(0,0,0,.6)",t>=tl?c.nm:"",c.bno!=null?{num:c.bno}:null);
    const run=(start,k)=>{ const [rx,ry]=P(...along(Math.min(4,start+k))); if(start+k<4)hlDot(x,rx,ry,r,ink,"rgba(0,0,0,.6)") };
    if(K==="hr"||K==="hit")for(let k=0;k<Math.min(3,c.runners);k++)run(3-k,bRun);
    else if(K==="sf")run(3,t<tl?0.08:Math.min(1,(t-tl)/(1-tl)*1.1));         // tags up, then goes
    else if(K==="kk")for(let k=0;k<c.runners;k++)run(1+k,0.06);
    else if(K==="dp")run(1,Math.min(0.95,after*1.2));
    else if(K==="cs")run(1,Math.min(1,Math.max(0,(t-tp+0.05)/(tl-tp+0.03))));
    const tr=[]; for(let q=8;q>=1;q--){ const b=ballAt(t-q*0.012); const pp=P(b[0],b[1]); tr.push([pp[0],pp[1]-b[2]*H]) }
    const [qx,qy]=P(bx,by); hlBall(x,qx,qy,r*0.55,z*H,t>tp?tr:null,{ring:"#C8102E"});
    // the inning only, until it's done: the result waits for the ball (round 67)
    const top=`${ordw(c.inn)}${K==="kk"?" \u00b7 runners on":""}`;
    const HITS=["","single","double","triple"];
    const end=t<tl?null:K==="hr"?(c.n===4?`GRAND SLAM! ${c.nm}${c.ft?` \u00b7 ${c.ft} ft`:""}`:`HOME RUN! ${c.nm}${c.ft?` \u00b7 ${c.ft} ft`:""}`)
      :K==="hit"?`${c.nm}: ${HITS[c.e.hit||1]}, ${c.n} in`:K==="sf"?"Caught at the wall! The run scores"
      :K==="kk"?`STRIKE THREE! ${c.runners} left on`:K==="dp"?"DOUBLE PLAY!":K==="cs"?"CAUGHT STEALING!":null;
    hlCaption(x,W,H,top,end,K==="dp"||K==="kk"||K==="cs"?dink:ink);
  }

  return {reveal:0.72, collapseIdle:true, aspect:0.62, clips, pitch, idle, frame};
})();
