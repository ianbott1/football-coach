/* Football's highlights (round 51, core 97_highlights): a touchdown, played out from the snap. The engine plays whole
   drives, not plays, and names no scorer on the drive chart, so the scoring play is drawn by position, not name: a
   pass to a receiver or a run, from a distance the drive's draw picks, ending in the end zone the way the drive did.
   In "goals" mode, only touchdowns in the fourth quarter of a one-score game. The home side drives to the left, as
   the drive chart's field has it. */
const HL_SPORT=(function(){
  const PADX=0.02, PADY=0.06, Y=v=>(v+10)/120;   // yards (0 own goal line .. 100 the one attacked) to the field's length with end zones
  // offense at the snap, relative to the line of scrimmage (yards back, across 0..1): QB, RB, WR, WR, TE, slot, then five linemen
  const OFF=[[-5,0.5],[-7,0.5],[-0.5,0.08],[-0.5,0.92],[-0.8,0.66],[-1,0.2],[-0.5,0.4],[-0.5,0.45],[-0.5,0.5],[-0.5,0.55],[-0.5,0.6]];
  const DEF=[[1,0.42],[1,0.47],[1,0.53],[1,0.58],[4.5,0.35],[4.5,0.5],[4.5,0.65],[6,0.1],[6,0.9],[12,0.32],[12,0.68]];
  function clips(L,d,mode){
    if(d.kind!=="TD"||d.q===5&&!d.pts)return [];
    const close=Math.abs((d.h||0)-(d.a||0))<=8;
    if(mode==="goals"&&!(d.q>=4&&close))return [];
    return [mk(L,d)];
  }
  function mk(L,d){
    const g=L.g, tm=d.home?g.home:g.away;
    const r=mulberry32(((d.n||1)*7919+(d.h||0)*131+(d.a||0)*37+(d.home?17:29))>>>0);
    const pass=r()<0.56, len=pass?Math.round(4+r()*45):Math.round(1+r()*30);
    const los=100-len, rcv=pass?(r()<0.62?2:3):1;
    const catchY=pass?Math.min(104,100+Math.round(r()*6)):104, lane=pass?(rcv===2?0.15:0.85)+(r()-0.5)*0.1:0.4+r()*0.2;
    const inks=hlKits(g.home,g.away).map(k=>k.fill);
    return {d,tm,home:!!d.home,pass,len,los,rcv,catchY,lane,q:d.q,inks,base:3400,ot:d.q>=5};
  }
  const P=(W,H,c,yd,y)=>{ const f=Y(yd), X=c.home?1-f:f, YY=c.home?1-y:y; return [W*PADX+X*W*(1-2*PADX), H*PADY+YY*H*(1-2*PADY)] };
  function pitch(x,W,H){
    const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#161B26"); bg.addColorStop(1,"#0E121A"); x.fillStyle=bg; x.fillRect(0,0,W,H);
    const L=W*PADX, T=H*PADY, w=W*(1-2*PADX), h=H*(1-2*PADY);
    // the sideline apron, then turf mown in five-yard bands
    x.fillStyle="#24602E"; x.fillRect(L-W*0.008,T-H*0.03,w+W*0.016,h+H*0.06);
    hlGrass(x,L,T,w,h,{bands:24,base:"#2B7536",alt:"#32823E",seed:21});
    // the end zones: painted, with the diagonal stripes
    [0,110].forEach(y0=>{ const ex=L+w*y0/120, ew=w*10/120; x.fillStyle="rgba(20,40,90,.55)"; x.fillRect(ex,T,ew,h);
      x.save(); x.beginPath(); x.rect(ex,T,ew,h); x.clip(); x.strokeStyle="rgba(255,255,255,.08)"; x.lineWidth=ew*0.12;
      for(let k=-h;k<ew+h;k+=ew*0.35){ x.beginPath(); x.moveTo(ex+k,T); x.lineTo(ex+k-h,T+h); x.stroke() } x.restore() });
    const lw=Math.max(1,W/700);
    hlLines(x,lw,()=>{
      x.strokeRect(L,T,w,h);
      for(let yd=0;yd<=100;yd+=5){ const px=L+w*Y(yd); x.lineWidth=yd===0||yd===100?lw*2.2:yd%10?lw*0.8:lw; x.beginPath(); x.moveTo(px,T); x.lineTo(px,T+h); x.stroke() }
      // the hash marks, every yard, at the sidelines and between the hashes
      x.lineWidth=lw*0.7; for(let yd=1;yd<100;yd++){ if(yd%5===0)continue; const px=L+w*Y(yd);
        [[T,T+h*0.025],[T+h-h*0.025,T+h],[T+h*0.4,T+h*0.415],[T+h*0.585,T+h*0.6]].forEach(([a,b])=>{ x.beginPath(); x.moveTo(px,a); x.lineTo(px,b); x.stroke() }) }
    });
    // the numbers, with their direction arrows, as painted on the field
    const fs=Math.max(8,Math.round(h/13)); x.font=`700 ${fs}px 'Barlow Condensed',Impact,sans-serif`; x.textAlign="center"; x.textBaseline="middle";
    [10,20,30,40,50,60,70,80,90].forEach(yd=>{ const v=Math.min(yd,100-yd), px=L+w*Y(yd);
      [[T+h*0.15,0],[T+h*0.85,Math.PI]].forEach(([py,rot])=>{ x.save(); x.translate(px,py); x.rotate(rot); x.fillStyle="rgba(246,250,242,.8)"; x.fillText(String(v),0,0);
        if(yd!==50){ const sd=yd<50?-1:1, ax=sd*(x.measureText(String(v)).width/2+fs*0.3)*(rot?-1:1); x.beginPath(); x.moveTo(ax+sd*fs*0.22*(rot?-1:1),-fs*0.3); x.lineTo(ax,-fs*0.42); x.lineTo(ax,-fs*0.18); x.closePath(); x.fill() }
        x.restore() }) });
    // the goalposts, seen from above
    [L,L+w].forEach((gx,k)=>{ const sd=k?1:-1; x.strokeStyle="#F2D24B"; x.lineWidth=2.4; x.beginPath(); x.moveTo(gx+sd*w*0.006,T+h*0.45); x.lineTo(gx+sd*w*0.006,T+h*0.55); x.stroke();
      x.beginPath(); x.moveTo(gx,T+h*0.5); x.lineTo(gx+sd*w*0.006,T+h*0.5); x.stroke() });
  }
  function idle(x,W,H){ hlCaption(x,W,H,"Highlights: touchdowns play here",null) }
  function frame(x,W,H,c,t){
    const snap=0.18, throwT=0.5, tEnd=0.86;
    // the ball: snapped, then a drop and a throw, or a handoff and a run
    let bx,by,z=0;
    const qb=[c.los-5-(t>snap?Math.min(1,(t-snap)/(throwT-snap))*2:0),0.5];
    const carrierAt=s=>{ if(c.pass){ return [hlLerp(c.los-0.5,c.catchY,hlEase(s)),hlLerp(c.rcv===2?0.08:0.92,c.lane,hlEase(Math.min(1,s*1.4)))] }
      return [hlLerp(c.los-7,c.catchY,hlEase(s)),hlLerp(0.5,c.lane,hlEase(Math.min(1,s*2)))] };
    const runS=Math.max(0,Math.min(1,(t-snap)/(tEnd-snap)));
    if(t<snap){ bx=c.los; by=0.5 }
    else if(c.pass){ if(t<throwT){ bx=qb[0]; by=0.5 } else { const s=Math.min(1,(t-throwT)/(tEnd-throwT-0.08)); const tg=carrierAt(Math.min(1,runS+0.05)); bx=hlLerp(qb[0],tg[0],s); by=hlLerp(0.5,tg[1],s); z=Math.sin(Math.min(1,s)*Math.PI)*0.05 } }
    else{ const p=carrierAt(runS); bx=p[0]; by=p[1] }
    const off=OFF.map((p,i)=>{ let yd=c.los+p[0], y=p[1];
      if(t>snap){ if(i===0)return qb; if(c.pass&&i===c.rcv){ const q=carrierAt(runS); return q }
        if(!c.pass&&i===1){ return carrierAt(runS) }
        if(i>=6){ yd+=runS*1.5 } else if(i>=2){ yd+=runS*Math.min(18,c.len*0.7); y=hlLerp(y,0.5,runS*0.2) } }
      return [yd,y] });
    const def=DEF.map((p,i)=>{ let yd=c.los+p[0], y=p[1]; if(t>snap){ const k=i<4?0.15:0.45*runS; yd=hlLerp(yd,bx,k*0.6); y=hlLerp(y,by,k) } return [yd,y] });
    const r=Math.max(4.5,W/100), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    const tag=i=>t>snap&&((c.pass&&i===c.rcv)||(!c.pass&&i===1)||(c.pass&&i===0&&t<throwT))?["QB","RB","WR","WR"][i]:"";
    def.forEach(p=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)") });
    off.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)",tag(i)) });
    const [qx,qy]=P(W,H,c,bx,by); hlBall(x,qx,qy,r*0.55,z*W,null,{kind:"oval",fill:"#8A5428",ring:"#2a1406"});
    const top=`${c.ot?"Overtime":"Q"+c.q} \u00b7 ${c.tm}, ${c.len} yard${c.len===1?"":"s"} out`;
    const end=t>=tEnd?`TOUCHDOWN! ${c.len}-yard ${c.pass?"pass":"run"}`:null;
    hlCaption(x,W,H,top,end,ink);
  }
  return {collapseIdle:true, aspect:0.46, clips, pitch, idle, frame};
})();
