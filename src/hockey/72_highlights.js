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
  function clips(L,d,mode){
    const ev=(d.ev||[]).filter(e=>e.k==="goal"||e.k==="save").sort((a,b)=>a.m-b.m);
    let rows=[]; try{ rows=rowsOf(L.g,L.drives) }catch(e){}
    const out=[]; let chance=null; let sh=d.sh-(d.h||0), sa=d.sa-(d.a||0);
    ev.forEach(e=>{
      if(e.k==="goal"){ out.push(mk(L,e,"goal",rows)); if(e.side==="home")sh++; else sa++; return }
      if(mode==="key"&&!chance&&Math.abs(sh-sa)<=1&&((e.u||0)%3===0)){ chance=mk(L,e,"save",rows); out.push(chance) } });
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
    const inks=hlInks(g.home,g.away); const gks=hlFar(["#111318","#E8F56B","#C9A0FF","#FF9F43"],inks);
    const nm=shooter?String(shooter).split(" ").slice(-1)[0]:"";
    return {kind,e,tm,home:attSide==="home",W,rec,end,nm,text,plan,m:e.m,base:kind==="goal"?3400:2600,inks,gk:gks,en:!!e.en,pp:!!e.pp};
  }
  // the home side attacks left: flip the attack frame for it
  const P=(W,H,c,a,y)=>{ const X=c.home?1-a:a, Y=c.home?1-y:y; return [W*PADX+X*W*(1-2*PADX), H*PADY+Y*H*(1-2*PADY)] };
  function pitch(x,W,H){
    x.fillStyle="#1B2230"; x.fillRect(0,0,W,H);
    const L=W*PADX, T=H*PADY, w=W*(1-2*PADX), h=H*(1-2*PADY), rr=h*0.28;
    x.beginPath(); x.moveTo(L+rr,T); x.lineTo(L+w-rr,T); x.quadraticCurveTo(L+w,T,L+w,T+rr); x.lineTo(L+w,T+h-rr); x.quadraticCurveTo(L+w,T+h,L+w-rr,T+h);
    x.lineTo(L+rr,T+h); x.quadraticCurveTo(L,T+h,L,T+h-rr); x.lineTo(L,T+rr); x.quadraticCurveTo(L,T,L+rr,T); x.closePath();
    x.fillStyle="#EEF4F8"; x.fill(); x.lineWidth=2; x.strokeStyle="#9FB3C4"; x.stroke();
    const vl=(fx,col,lw)=>{ x.beginPath(); x.moveTo(L+fx*w,T+2); x.lineTo(L+fx*w,T+h-2); x.strokeStyle=col; x.lineWidth=lw; x.stroke() };
    vl(0.5,"#D7263D",3); vl(0.35,"#2F6FB5",3); vl(0.65,"#2F6FB5",3); vl(1-GOAL,"#D7263D",1.2); vl(GOAL,"#D7263D",1.2);
    x.beginPath(); x.arc(L+w/2,T+h/2,h*0.13,0,Math.PI*2); x.strokeStyle="#2F6FB5"; x.lineWidth=1.5; x.stroke();
    [[1-GOAL,1],[GOAL,-1]].forEach(([gx,s])=>{ x.beginPath(); x.arc(L+gx*w,T+h/2,h*0.07,s>0?-Math.PI/2:Math.PI/2,s>0?Math.PI/2:Math.PI*1.5); x.fillStyle="#9CC9EC"; x.fill();
      x.fillStyle="#D7263D"; x.fillRect(L+gx*w+(s>0?-w*0.012:0),T+h*net[0],w*0.012,h*(net[1]-net[0])) });
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
    const r=Math.max(3.4,W/90), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    def.forEach((p,i)=>{ if(!p)return; const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,i?dink:c.gk[1],"rgba(0,0,0,.6)") });
    att.forEach((p,i)=>{ if(i===0&&c.en)return; const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,i?ink:c.gk[0],"rgba(0,0,0,.6)",i===c.rec[n-1]&&t>=tb-0.12?c.nm:"") });
    const [qx,qy]=P(W,H,c,bx,by); x.beginPath(); x.arc(qx,qy,r*0.5,0,Math.PI*2); x.fillStyle="#0B0D12"; x.fill();
    const top=`${c.m}' ${c.tm}${c.pp?" power play":""}${t<ts?" attack":""}`;
    const end=t>=ts?(c.kind==="goal"?(c.en?`EMPTY NET! ${c.nm}`:`GOAL! ${c.nm}`):"Saved!"):null;
    hlCaption(x,W,H,t>=ts&&c.text?`${c.m}' ${c.text}`:top,end,c.kind==="goal"?ink:null);
  }
  return {aspect:0.5, clips, pitch, idle, frame};
})();
