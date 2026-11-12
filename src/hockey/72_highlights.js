/* Hockey's highlights (round 51, core 97_highlights): a goal or a big save from the engine's event, played out on a
   rink by twelve dots and a puck. The commentary's words pick the move where they say how ("tips in a point shot",
   "finishes a two-on-one", "jams a loose puck home at the crease"); the event's draw picks it otherwise. The scorer
   is the man the log names. As on the scoreboard's rink, the home side attacks to the left. */
const HL_SPORT=(function(){
  const PADX=0.03, PADY=0.06;
  // attack frame: 0 the side's own goal end, 1 the end it attacks. G, D, D, C, LW, RW
  const ATT=[[0.08,0.5],[0.63,0.3],[0.63,0.7],[0.8,0.5],[0.84,0.2],[0.84,0.8]];
  const DEF=[[0.92,0.5],[0.86,0.38],[0.86,0.62],[0.8,0.5],[0.72,0.25],[0.72,0.75]];
  const UNIT={C:3,LW:4,RW:5,D:1,D2:2}, GOAL=0.91, net=[0.47,0.53];
  const unitOf=u=>{ const x=u%100; return x<30?"C":x<52?"LW":x<74?"RW":x<88?"D":"D2" };
  const HL_CM=(typeof window!=="undefined"&&window.HLCM)||1;
  function clips(L,d,mode){
    const ev=(d.ev||[]).filter(e=>e.k==="goal"||e.k==="save").sort((a,b)=>a.m-b.m);
    let rows=[]; try{ rows=rowsOf(L.g,L.drives) }catch(e){}
    const out=[]; let chance=0; let sh=d.sh-(d.h||0), sa=d.sa-(d.a||0);
    ev.forEach(e=>{
      if(e.k==="goal"){ out.push(mk(L,e,"goal",rows)); if(e.side==="home")sh++; else sa++; return }
      if(mode==="key"&&chance<2&&Math.abs(sh-sa)<=2&&((e.u||0)%HL_CM===0)){ chance++; out.push(mk(L,e,"save",rows)) } });
    return out.slice(0,3);
  }
  function mk(L,e,kind,rows){
    const g=L.g, attSide=kind==="goal"?e.side:(e.side==="home"?"away":"home"), tm=attSide==="home"?g.home:g.away, u=e.u||0;
    const r=mulberry32(((e.m||0)*7919+u*131+(attSide==="home"?17:29))>>>0);
    const shooter=kind==="goal"?hkGoalNames(tm,e).n:hkSkater(tm,u), unit=unitOf(u);
    const row=rows.find(x=>x.m===e.m+"'"&&(kind==="goal"?/GOAL|EMPTY/.test(x.tag):!x.tag&&/save|robs|denied|gloves|stretches/i.test(x.text)));
    const text=row?row.text:"", T=text.toLowerCase();
    let plan=e.en?"en":e.pp?"pp":/tips|point/.test(T)?"point":/two-on-one|walks in alone/.test(T)?"rush":/jams|crease|loose puck|bats|skate/.test(T)?"cycle":/one-times|circle/.test(T)?"pp"
      :["rush","cycle","point","pp"][Math.floor(r()*4)];
    const s=r()<0.5?0:1, sy=s?0.72:0.28;
    let W;
    if(plan==="rush")W=[[0.42,0.5],[0.66,s?0.32:0.68],[0.8,0.5+(s?0.08:-0.08)]];
    else if(plan==="cycle")W=[[0.7,sy],[0.95,s?0.8:0.2],[0.96,0.4+r()*0.2],[0.86,0.5+(r()-0.5)*0.08]];
    else if(plan==="point")W=[[0.74,s?0.85:0.15],[0.65,s?0.68:0.32],[0.84,0.5]];
    else if(plan==="pp")W=[[0.65,0.5],[0.78,s?0.82:0.18],[0.82,s?0.7:0.3]];
    else W=[[0.35,0.5],[0.55,0.5+(r()-0.5)*0.3]];   // empty net: from anywhere
    const sIdx=UNIT[unit]||3;
    const rec=W.map((w,i)=>{ if(i===W.length-1)return sIdx; let b=3,bd=9; for(let k=1;k<6;k++){ if(k===sIdx)continue; const p=ATT[k], dd=Math.hypot(p[0]-w[0],p[1]-w[1]); if(dd<bd){bd=dd;b=k} } return b });
    const end=kind==="goal"?[GOAL+0.012,net[0]+r()*(net[1]-net[0])]:[GOAL-0.012,0.5+(r()-0.5)*0.05];
    const inks=hlKits(g.home,g.away).map(k=>k.fill); const gks=hlFar(["#111318","#E8F56B","#C9A0FF","#FF9F43"],inks);
    const nm=shooter?String(shooter).split(" ").slice(-1)[0]:"";
    return {kind,e,tm,home:attSide==="home",W,rec,end,nm,text,plan,m:e.m,base:3200,inks,gk:gks,en:!!e.en,pp:!!e.pp};
  }
  // the home side attacks left: flip the attack frame for it
  const P=(W,H,c,a,y)=>{ const X=c.home?1-a:a, Y=c.home?1-y:y; return [W*PADX+X*W*(1-2*PADX), H*PADY+Y*H*(1-2*PADY)] };
  function pitch(x,W,H){
    // the arena in the dark, the boards, then the ice: a cold sheen, skate marks, the lines and circles under it
    const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#151A24"); bg.addColorStop(1,"#0D1118"); x.fillStyle=bg; x.fillRect(0,0,W,H);
    const L=W*PADX, T=H*PADY, w=W*(1-2*PADX), h=H*(1-2*PADY), rr=h*0.28;
    const rink=(o)=>{ const l=L-o, t=T-o, ww=w+2*o, hh=h+2*o, r=rr+o; x.beginPath(); x.moveTo(l+r,t); x.lineTo(l+ww-r,t); x.quadraticCurveTo(l+ww,t,l+ww,t+r); x.lineTo(l+ww,t+hh-r);
      x.quadraticCurveTo(l+ww,t+hh,l+ww-r,t+hh); x.lineTo(l+r,t+hh); x.quadraticCurveTo(l,t+hh,l,t+hh-r); x.lineTo(l,t+r); x.quadraticCurveTo(l,t,l+r,t); x.closePath() };
    rink(Math.max(3,W/160)); x.fillStyle="#D9E1E8"; x.fill(); x.strokeStyle="#5F6B78"; x.lineWidth=1; x.stroke();
    x.save(); rink(0); x.clip();
    const ice=x.createRadialGradient(L+w/2,T+h/2,h*0.1,L+w/2,T+h/2,w*0.62); ice.addColorStop(0,"#F7FBFE"); ice.addColorStop(1,"#DCE8F1"); x.fillStyle=ice; x.fillRect(L,T,w,h);
    // skate marks: long faint arcs, from a seed
    { const r=mulberry32(5); x.lineWidth=0.5; for(let k=0;k<70;k++){ const cx=L+r()*w, cy=T+r()*h, R=h*(0.2+r()*0.8), a=r()*Math.PI*2;
      x.beginPath(); x.arc(cx,cy,R,a,a+0.25+r()*0.5); x.strokeStyle=`rgba(120,140,160,${0.05+r()*0.08})`; x.stroke() } }
    hlSpeckle(x,L,T,w,h,Math.round(w*h/60),9,0.04);
    const vl=(fx,col,lw)=>{ x.fillStyle=col; x.fillRect(L+fx*w-lw/2,T,lw,h) };
    const lw=Math.max(2.5,w/110);
    vl(0.35,"rgba(36,92,170,.88)",lw); vl(0.65,"rgba(36,92,170,.88)",lw); vl(0.5,"rgba(200,30,45,.85)",lw);
    // the centre line's notches, as the NHL paints it
    x.fillStyle="rgba(255,255,255,.7)"; for(let yy=T;yy<T+h;yy+=lw*2.4)x.fillRect(L+w/2-lw*0.12,yy,lw*0.24,lw*1.1);
    vl(GOAL,"rgba(200,30,45,.8)",Math.max(1,lw*0.35)); vl(1-GOAL,"rgba(200,30,45,.8)",Math.max(1,lw*0.35));
    const ring=(cx,cy,R,col)=>{ x.beginPath(); x.arc(cx,cy,R,0,Math.PI*2); x.strokeStyle=col; x.lineWidth=Math.max(1,lw*0.35); x.stroke() };
    const dot=(cx,cy,R,col)=>{ x.beginPath(); x.arc(cx,cy,R,0,Math.PI*2); x.fillStyle=col; x.fill() };
    ring(L+w/2,T+h/2,h*0.13,"rgba(36,92,170,.85)"); dot(L+w/2,T+h/2,lw*0.5,"rgba(36,92,170,.9)");
    // the end-zone circles with their hash marks, and the neutral-zone dots
    [0.19,0.81].forEach(fx=>[0.24,0.76].forEach(fy=>{ const cx=L+fx*w, cy=T+fy*h, R=h*0.17; ring(cx,cy,R,"rgba(200,30,45,.75)"); dot(cx,cy,lw*0.7,"rgba(200,30,45,.85)");
      x.strokeStyle="rgba(200,30,45,.75)"; [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{ x.beginPath(); x.moveTo(cx+sx*R*0.28,cy+sy*R*0.92); x.lineTo(cx+sx*R*0.28,cy+sy*R*1.15); x.stroke() }) }));
    [0.39,0.61].forEach(fx=>[0.24,0.76].forEach(fy=>dot(L+fx*w,T+fy*h,lw*0.6,"rgba(200,30,45,.85)")));
    // the creases and the nets
    [[GOAL,1],[1-GOAL,-1]].forEach(([gx,sd])=>{ const cx=L+gx*w, cy=T+h/2;
      x.beginPath(); x.moveTo(cx,cy-h*0.07); x.arc(cx,cy,h*0.07,sd>0?-Math.PI/2:Math.PI/2,sd>0?Math.PI/2:Math.PI*1.5,true); x.closePath();
      x.fillStyle="rgba(110,175,230,.55)"; x.fill(); x.strokeStyle="rgba(200,30,45,.8)"; x.lineWidth=1; x.stroke();
      hlNet(x,cx,T+h*net[0],T+h*net[1],w*0.018,sd); x.strokeStyle="#D7263D"; x.lineWidth=2; x.beginPath(); x.moveTo(cx,T+h*net[0]); x.lineTo(cx+w*0.018*sd,T+h*net[0]); x.lineTo(cx+w*0.018*sd,T+h*net[1]); x.lineTo(cx,T+h*net[1]); x.stroke() });
    // the glass's shadow on the ice along the boards
    const sg=x.createLinearGradient(0,T,0,T+h*0.06); sg.addColorStop(0,"rgba(30,40,55,.18)"); sg.addColorStop(1,"rgba(30,40,55,0)"); x.fillStyle=sg; x.fillRect(L,T,w,h*0.06);
    x.restore();
    rink(0); x.strokeStyle="#F5C342"; x.lineWidth=Math.max(1.5,W/400); x.stroke();   // the kick plate
  }
  function idle(x,W,H){ hlCaption(x,W,H,"Highlights: goals and big saves play here",null) }
  function frame(x,W,H,c,t){
    const n=c.W.length, tb=0.72, ts=0.86;
    let bx,by;
    if(t<tb){ const f=t/tb*(n-1); const k=Math.min(n-2,Math.floor(f)), s=hlEase(f-k), a=c.W[k], b=c.W[k+1]; bx=hlLerp(a[0],b[0],s); by=hlLerp(a[1],b[1],s) }
    else if(t<ts){ const s=(t-tb)/(ts-tb), a=c.W[n-1]; bx=hlLerp(a[0],c.end[0],s); by=hlLerp(a[1],c.end[1],s) }
    else{ bx=c.end[0]; by=c.end[1] }
    const prog=Math.min(1,t/tb);
    const att=ATT.map((p,i)=>{ if(i===0)return c.en?[0.5,0.5]:[0.08,0.5]; let a=hlLerp(p[0]-0.25,p[0],prog), y=p[1]+(by-0.5)*0.15;
      const j=c.rec.indexOf(i); if(j>=0){ const w=c.W[j], near=t<tb?Math.max(0,1-Math.abs(t/tb*(n-1)-j)):j===n-1?1:0; a=hlLerp(a,w[0],hlEase(Math.min(1,near*1.4))); y=hlLerp(y,w[1],hlEase(Math.min(1,near*1.4))) }
      if(i===c.rec[n-1]&&t>=tb){ a=c.W[n-1][0]; y=c.W[n-1][1] }
      return [a,y] });
    const def=DEF.map((p,i)=>{ if(i===0){ if(c.en)return null; let y=0.5+(by-0.5)*0.3; if(t>=tb&&c.kind!=="goal")y=hlLerp(y,c.end[1],hlEase((t-tb)/(ts-tb))); return [GOAL-0.015,Math.max(0.45,Math.min(0.55,y))] }
      if(c.pp&&i===5)return null;   // a man short
      return [hlLerp(p[0]-0.1,p[0],prog),p[1]+(by-0.5)*0.25] });
    let nr=[]; def.forEach((p,i)=>{ if(p&&i)nr.push([Math.hypot(p[0]-bx,p[1]-by),i]) }); nr.sort((a,b)=>a[0]-b[0]);
    nr.slice(0,1).forEach(([d,i])=>{ const p=def[i]; def[i]=[hlLerp(p[0],bx,0.5),hlLerp(p[1],by,0.5)] });
    const r=Math.max(5,W/80), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    def.forEach((p,i)=>{ if(!p)return; const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,i?dink:c.gk[1],"rgba(0,0,0,.6)") });
    att.forEach((p,i)=>{ if(i===0&&c.en)return; const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,i?ink:c.gk[0],"rgba(0,0,0,.6)",i===c.rec[n-1]&&t>=ts?c.nm:"") });
    const [qx,qy]=P(W,H,c,bx,by);
    const pos=tt=>{ tt=Math.max(0,tt); if(tt<tb){ const f=tt/tb*(n-1), k=Math.min(n-2,Math.floor(f)), s=hlEase(f-k), a=c.W[k], b=c.W[k+1]; return P(W,H,c,hlLerp(a[0],b[0],s),hlLerp(a[1],b[1],s)) }
      if(tt<ts){ const s=(tt-tb)/(ts-tb), a=c.W[n-1]; return P(W,H,c,hlLerp(a[0],c.end[0],s),hlLerp(a[1],c.end[1],s)) } return P(W,H,c,c.end[0],c.end[1]) };
    const tr=[]; for(let q=8;q>=1;q--)tr.push(pos(t-q*0.012));
    hlBall(x,qx,qy,r*0.55,0,t>0.1?tr:null,{kind:"puck"});
    const top=`${c.m}'${c.pp?" power play":""}`;   // round 66: whose chance it is waits for the outcome
    const end=t>=ts?(c.kind==="goal"?(c.en?`EMPTY NET! ${c.nm}`:`GOAL! ${c.nm}`):"Saved!"):null;
    hlCaption(x,W,H,t>=ts&&c.text?`${c.m}' ${c.text}`:top,end,c.kind==="goal"?ink:null);
  }
  return {aspect:0.5, clips, pitch, idle, frame};
})();
