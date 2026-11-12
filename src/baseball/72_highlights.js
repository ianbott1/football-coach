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
    return {e,tm,nm:nm?String(nm).split(" ").slice(-1)[0]:"",hr,land,runners,n:e.n||1,inn:d.seg+1,base:hr?3400:2600,inks:hlInks(g.home,g.away),side:e.side,text:"",arc,ft};
  }
  function pitch(x,W,H){
    x.fillStyle="#1B2230"; x.fillRect(0,0,W,H);
    const P=(a,b)=>[a*W,b*H];
    x.beginPath(); const [hx,hy]=P(HOME[0],HOME[1]); x.moveTo(hx,hy); x.arc(hx,hy,H*0.86,-Math.PI/2-0.82,-Math.PI/2+0.82); x.closePath(); x.fillStyle="#2F7A3B"; x.fill();
    x.strokeStyle="rgba(240,246,236,.7)"; x.lineWidth=2; x.beginPath(); x.arc(hx,hy,H*0.86,-Math.PI/2-0.82,-Math.PI/2+0.82); x.stroke();
    const base=[[0.5,0.9],[0.62,0.72],[0.5,0.54],[0.38,0.72]].map(([a,b])=>P(a,b));
    x.beginPath(); base.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py)); x.closePath(); x.fillStyle="#B9875A"; x.fill();
    x.beginPath(); const s=0.065; [[0.5,0.9-s],[0.62-s,0.72],[0.5,0.54+s],[0.38+s,0.72]].map(([a,b])=>P(a,b)).forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py)); x.closePath(); x.fillStyle="#348442"; x.fill();
    base.forEach(([px,py])=>{ x.fillStyle="#F4F1E8"; x.fillRect(px-3,py-3,6,6) });
  }
  function idle(x,W,H){ hlCaption(x,W,H,"Highlights: home runs and big hits play here",null) }
  function frame(x,W,H,c,t){
    const P=(a,b)=>[a*W,b*H], ink=c.inks[c.side==="home"?0:1], dink=c.inks[c.side==="home"?1:0], r=Math.max(3.2,W/95);
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
    const [qx,qy]=P(bx,by); x.beginPath(); x.arc(qx,qy-z*H,r*0.55,0,Math.PI*2); x.fillStyle="#fff"; x.fill(); x.lineWidth=1; x.strokeStyle="#C8102E"; x.stroke();
    const top=`${ordw(c.inn)} · ${c.tm}`;
    const end=t>=tl?(c.hr?(c.n===4?`GRAND SLAM! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`:`HOME RUN! ${c.nm}${c.ft?` · ${c.ft} ft`:""}`):`${c.nm}: ${["","single","double","triple"][c.e.hit||1]}, ${c.n} in`):null;
    hlCaption(x,W,H,top,end,ink);
  }
  return {collapseIdle:true, aspect:0.62, clips, pitch, idle, frame};
})();
