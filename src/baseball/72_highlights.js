/* Baseball's highlights (round 52, core 97_highlights): the home runs, and in "key" mode the inning's biggest hit when
   it scores runs in a close game, drawn on a diamond: the pitch, the swing, the ball's flight to where it lands, the
   runners coming round. The man the commentary names hits it. Shown only while a clip plays (the line score is the
   live screen's own picture). */
const HL_SPORT=(function(){
  const HOME=[0.5,0.9];
  function clips(L,d,mode){
    const out=[]; const close=Math.abs(d.sh-d.sa)<=4;
    (d.ev||[]).forEach(e=>{
      if(e.k==="hr"&&(mode!=="goals"||close||e.n>=3))out.push(mk(L,e,d));
      else if(mode==="key"&&e.k==="rbi"&&e.hit>=2&&close&&out.length<1)out.push(mk(L,e,d)) });
    return out.slice(0,2);
  }
  function mk(L,e,d){
    const g=L.g, tm=e.side==="home"?g.home:g.away, u=e.u||0;
    const r=mulberry32((u*7919+(d.seg||0)*131+(e.side==="home"?17:29))>>>0);
    let nm=e.nm||""; if(!nm)try{ nm=bsBatter(tm,e.slot!==undefined?e.slot:u%9,u)||"" }catch(er){}
    const ang=(-0.75+r()*1.5)*0.72, hr=e.k==="hr";
    const dist=hr?1.08+r()*0.15:e.hit===3?0.92:e.hit===2?0.82:0.55;
    const land=[HOME[0]+Math.sin(ang)*dist*0.62, HOME[1]-Math.cos(ang)*dist*0.78];
    const runners=Math.max(0,(e.n||1)-(hr?1:0));
    // round 61: each one its own flight (a high fly or a line drive) and its distance (Instinct)
    const arc=hr?0.07+r()*0.11:0.03+r()*0.04, ft=hr&&typeof hrFeet==="function"?hrFeet(e):0;
    return {e,tm,nm:nm?String(nm).split(" ").slice(-1)[0]:"",hr,land,runners,n:e.n||1,inn:d.seg+1,base:hr?3400:2600,inks:hlKits(g.home,g.away).map(k=>k.fill),side:e.side,text:"",arc,ft};
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
  function idle(x,W,H){ hlCaption(x,W,H,"Highlights: home runs and big hits play here",null) }
  function frame(x,W,H,c,t){
    const P=(a,b)=>[a*W,b*H], ink=c.inks[c.side==="home"?0:1], dink=c.inks[c.side==="home"?1:0], r=Math.max(5,W/85);
    // the fielders: nine of them in their places, the pitcher on the mound
    const F=[[0.5,0.72],[0.5,0.95],[0.6,0.66],[0.56,0.6],[0.44,0.6],[0.4,0.66],[0.25,0.38],[0.5,0.25],[0.75,0.38]];
    const tp=0.18, tl=0.72;
    let bx,by,z=0;
    if(t<tp){ const s=t/tp; bx=0.5; by=hlLerp(0.72,0.9,s) }
    else if(t<tl){ const s=(t-tp)/(tl-tp); bx=hlLerp(HOME[0],c.land[0],s); by=hlLerp(HOME[1],c.land[1],s); z=Math.sin(s*Math.PI)*(c.arc||(c.hr?0.12:0.05)) }
    else { bx=c.land[0]; by=c.land[1] }
    // an outfielder chases the ball
    const chase=t>tp?Math.min(1,(t-tp)/(tl-tp)):0;
    const fi=c.land[0]<0.4?6:c.land[0]>0.6?8:7;
    F.forEach((p,i)=>{ let q=p; if(i===fi){ q=[hlLerp(p[0],Math.max(0.08,Math.min(0.92,c.land[0])),chase*0.8),hlLerp(p[1],Math.max(0.06,c.land[1]),chase*0.8)] }
      const [px,py]=P(q[0],q[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)") });
    // the batter, then running; runners coming round
    const bases=[[0.5,0.9],[0.62,0.72],[0.5,0.54],[0.38,0.72],[0.5,0.9]];
    const along=(k)=>{ const f=Math.max(0,Math.min(4,k)), i=Math.min(3,Math.floor(f)), s=f-i; return [hlLerp(bases[i][0],bases[i+1][0],s),hlLerp(bases[i][1],bases[i+1][1],s)] };
    const run=Math.max(0,(t-tp)/(1-tp))*(c.hr?4:Math.min(3,c.e.hit||1));
    const [bxp,byp]=P(...along(run)); hlDot(x,bxp,byp,r,ink,"rgba(0,0,0,.6)",c.nm);
    for(let k=0;k<Math.min(3,c.runners);k++){ const start=3-k; const [rx,ry]=P(...along(Math.min(4,start+run))); if(start+run<4)hlDot(x,rx,ry,r,ink,"rgba(0,0,0,.6)") }
    const bpos=tt=>{ if(tt<tp){ const s=Math.max(0,tt)/tp; return [0.5,hlLerp(0.72,0.9,s),0] } if(tt<tl){ const s=(tt-tp)/(tl-tp); return [hlLerp(HOME[0],c.land[0],s),hlLerp(HOME[1],c.land[1],s),Math.sin(s*Math.PI)*(c.arc||(c.hr?0.12:0.05))] } return [c.land[0],c.land[1],0] };
    const tr=[]; for(let q=8;q>=1;q--){ const b=bpos(t-q*0.012); const pp=P(b[0],b[1]); tr.push([pp[0],pp[1]-b[2]*H]) }
    const [qx,qy]=P(bx,by); hlBall(x,qx,qy,r*0.55,z*H,t>tp?tr:null,{ring:"#C8102E"});
    const top=`${ordw(c.inn)} · ${c.tm}`;
    const end=t>=tl?(c.hr?(c.n===4?`GRAND SLAM! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`:`HOME RUN! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`):`${c.nm}: ${["","single","double","triple"][c.e.hit||1]}, ${c.n} in`):null;
    hlCaption(x,W,H,top,end,ink);
  }
  return {collapseIdle:true, aspect:0.62, clips, pitch, idle, frame};
})();
