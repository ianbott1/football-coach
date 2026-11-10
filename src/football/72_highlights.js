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
    const inks=hlInks(g.home,g.away);
    return {d,tm,home:!!d.home,pass,len,los,rcv,catchY,lane,q:d.q,inks,base:3400,ot:d.q>=5};
  }
  const P=(W,H,c,yd,y)=>{ const f=Y(yd), X=c.home?1-f:f, YY=c.home?1-y:y; return [W*PADX+X*W*(1-2*PADX), H*PADY+YY*H*(1-2*PADY)] };
  function pitch(x,W,H){
    x.fillStyle="#1B2230"; x.fillRect(0,0,W,H);
    const L=W*PADX, T=H*PADY, w=W*(1-2*PADX), h=H*(1-2*PADY);
    x.fillStyle="#2F7A3B"; x.fillRect(L,T,w,h);
    x.fillStyle="rgba(0,0,0,.18)"; x.fillRect(L,T,w*10/120,h); x.fillRect(L+w*110/120,T,w*10/120,h);
    x.strokeStyle="rgba(240,246,236,.8)"; x.lineWidth=1; x.strokeRect(L,T,w,h);
    for(let yd=0;yd<=100;yd+=10){ const px=L+w*Y(yd); x.beginPath(); x.moveTo(px,T); x.lineTo(px,T+h); x.lineWidth=yd===0||yd===100?2:1; x.stroke() }
    x.fillStyle="rgba(240,246,236,.35)"; x.font=`600 ${Math.max(8,Math.round(w/50))}px var(--mono),monospace`; x.textAlign="center"; x.textBaseline="middle";
    [10,20,30,40,50,60,70,80,90].forEach(yd=>{ x.fillText(String(Math.min(yd,100-yd)),L+w*Y(yd),T+h*0.12); x.fillText(String(Math.min(yd,100-yd)),L+w*Y(yd),T+h*0.88) });
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
    const r=Math.max(2.8,W/120), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    const tag=i=>t>snap&&((c.pass&&i===c.rcv)||(!c.pass&&i===1)||(c.pass&&i===0&&t<throwT))?["QB","RB","WR","WR"][i]:"";
    def.forEach(p=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)") });
    off.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)",tag(i)) });
    const [qx,qy]=P(W,H,c,bx,by); x.beginPath(); x.ellipse(qx,qy-z*W,r*0.75,r*0.48,0,0,Math.PI*2); x.fillStyle="#7A4A22"; x.fill(); x.lineWidth=1; x.strokeStyle="#fff"; x.stroke();
    const top=`${c.ot?"Overtime":"Q"+c.q} \u00b7 ${c.tm}, ${c.len} yard${c.len===1?"":"s"} out`;
    const end=t>=tEnd?`TOUCHDOWN! ${c.len}-yard ${c.pass?"pass":"run"}`:null;
    hlCaption(x,W,H,top,end,ink);
  }
  return {collapseIdle:true, aspect:0.46, clips, pitch, idle, frame};
})();
