/* Soccer's highlights (round 51, core 97_highlights): a goal, a save or a miss from the engine's event, played out on
   a pitch by twenty-two dots. The event says who attacked, when, and how it ended; its draw (e.u) picks the move
   (a cross from the wing, a ball through the middle, a shot from distance, a corner) and the man the commentary names
   takes the shot. The home side attacks to the right all match, as the pitch on the scoreboard has it. */
const HL_SPORT=(function(){
  const PAD=0.035;
  // a 4-4-2, in the attacking side's frame: 0 its own goal line, 1 the goal it attacks; y across the pitch
  const BASE=[[0.04,0.5],[0.2,0.14],[0.18,0.38],[0.18,0.62],[0.2,0.86],[0.44,0.12],[0.42,0.38],[0.42,0.62],[0.44,0.88],[0.64,0.4],[0.64,0.6]];
  const UNIT_IDX={ST:[9,10],W:[5,8],CM:[6,7],CB:[2,3],FB:[1,4]};
  const goalW=0.108, post=[0.5-goalW/2,0.5+goalW/2];
  function clips(L,d,mode){
    const ev=(d.ev||[]).filter(e=>e.k==="goal"||e.k==="save"||e.k==="miss").sort((a,b)=>a.m-b.m);
    const out=[]; let chance=null;
    const sh0=d.sh-(d.h||0), sa0=d.sa-(d.a||0); let sh=sh0, sa=sa0;
    ev.forEach(e=>{
      if(e.k==="goal"){ out.push(mk(L,e,"goal",sh,sa)); if(e.side==="home")sh++; else sa++; return }
      // a big chance: one a stretch at most, in a game still within a goal, when asked for
      if(mode==="key"&&!chance&&Math.abs(sh-sa)<=1&&((e.u||0)%2===0)){ chance=mk(L,e,e.k,sh,sa); out.push(chance) } });
    return out.slice(0,3);
  }
  function mk(L,e,kind,sh,sa){
    const g=L.g, tm=e.side==="home"?g.home:g.away, opp=e.side==="home"?g.away:g.home, u=e.u||0;
    const r=mulberry32(((e.m||0)*7919+u*131+(e.side==="home"?17:29))>>>0);
    const shooter=kind==="goal"||kind==="miss"?scScorer(tm,u):scScorer(tm,u);
    let text=""; try{ text=scEventText(g,e).text }catch(er){}
    // the move follows the commentary's words where they say how ("heads in at the near post", "from the penalty spot",
    // "blazes over"), else the event's draw
    const T=text.toLowerCase();
    let plan=/penalty/.test(T)?"pen":/corner|set piece/.test(T)?"corner":/distance|deflected/.test(T)?"distance":/head|back post|tip/.test(T)?"wing"
      :/rounds|first time|slots|cuts inside|drills|overlaps/.test(T)?"through":["wing","through","distance"][Math.floor(r()*3)];
    const how=kind==="miss"?(/post/.test(T)?"post":/over/.test(T)?"over":/line/.test(T)?"blocked":"wide"):kind;
    const side=r()<0.5?0:1;   // which flank
    // the move: waypoints for the ball in the attacking frame, and which attacker receives each
    let W=[];
    const start=[0.28+r()*0.12, 0.3+r()*0.4];
    if(plan==="wing"){ const wy=side?0.9:0.1; W=[start,[0.5+r()*0.08,0.5+(side?0.15:-0.15)],[0.74+r()*0.06,wy],[0.86+r()*0.04,0.42+r()*0.16]] }
    else if(plan==="through"){ W=[start,[0.52+r()*0.06,0.35+r()*0.3],[0.68+r()*0.05,0.4+r()*0.2],[0.84+r()*0.04,0.44+r()*0.12]] }
    else if(plan==="distance"){ W=[start,[0.5+r()*0.08,0.25+r()*0.5],[0.66+r()*0.06,0.38+r()*0.24],[0.72+r()*0.04,0.4+r()*0.2]] }
    else if(plan==="pen"){ W=[[0.84,0.5],[0.895,0.5]] }
    else { const cy=side?0.995:0.005; W=[[0.995,cy],[0.9+r()*0.04,0.42+r()*0.16]] }
    // the receivers: the nearest attacker to each spot (the last is the man who shoots: the named one when we know him)
    const sIdx=(UNIT_IDX[shooter.unit]||[9,10])[Math.floor(r()*2)];
    const rec=W.map((w,i)=>{ if(i===W.length-1||plan==="pen")return sIdx; let b=1,bd=9; for(let k=1;k<11;k++){ const p=BASE[k], dd=Math.hypot(p[0]+0.18-w[0],p[1]-w[1]); if(dd<bd&&k!==sIdx){bd=dd;b=k} } return b });
    // the end of the shot
    let end, kept=false, postHit=false;
    if(kind==="goal")end=[1.012,0.5+(r()-0.5)*goalW*0.8];
    else if(kind==="save"){ end=[0.975,0.5+(r()-0.5)*goalW*0.7]; kept=true }
    else if(how==="post"){ postHit=true; end=[1.0,r()<0.5?post[0]:post[1]] }
    else if(how==="blocked"){ end=[0.99,0.5+(r()-0.5)*goalW*0.6]; kept=true }
    else if(how==="over"){ end=[1.03,0.5+(r()-0.5)*goalW*0.9] }
    else end=[1.03,r()<0.5?post[0]-0.03-r()*0.06:post[1]+0.03+r()*0.06];
    const nm=shooter.n?String(shooter.n).split(" ").slice(-1)[0]:"";
    const inks=hlInks(g.home,g.away), kits=hlKits(g.home,g.away);
    // keepers in a colour neither side wears
    const gks=hlFar(["#E8F56B","#C9A0FF","#F2F2F2","#FF9F43","#7CF2D0","#111318"],[kits[0].fill,kits[1].fill]);
    return {kind,how,e,tm,opp,home:e.side==="home",W,rec,end,kept,postHit,nm,text,plan,sh,sa,m:e.m,base:kind==="goal"?3800:2900,inks,kits,gk:[gks[0],gks[1]],home0:g.home,away0:g.away};
  }
  // pitch coordinates (attack frame -> screen)
  const P=(W,H,c,a,y)=>{ const X=c.home?a:1-a, Y=c.home?y:1-y; return [W*PAD+X*W*(1-2*PAD), H*PAD+Y*H*(1-2*PAD)] };
  function pitch(x,W,H){
    x.fillStyle="#1E5E2A"; x.fillRect(0,0,W,H);
    const L=W*PAD, T=H*PAD, R=W*(1-PAD), B=H*(1-PAD), w=R-L, h=B-T;
    hlGrass(x,0,0,W,H,{bands:14,base:"#2C7A37",alt:"#33873F",seed:11});
    const lw=Math.max(1.2,W/520), pa=w*0.157, ga=w*0.052, cr=h*0.135;
    hlLines(x,lw,()=>{
      x.strokeRect(L,T,w,h);
      x.beginPath(); x.moveTo(L+w/2,T); x.lineTo(L+w/2,B); x.stroke();
      x.beginPath(); x.arc(L+w/2,T+h/2,cr,0,Math.PI*2); x.stroke();
      [[L,1],[R,-1]].forEach(([gx,sd])=>{
        x.strokeRect(sd>0?gx:gx-pa,T+h*0.2,pa,h*0.6); x.strokeRect(sd>0?gx:gx-ga,T+h*0.37,ga,h*0.26);
        // the penalty arc ("the D"): the part of a 9.15m circle round the spot outside the box
        const spx=gx+sd*w*0.105, a=Math.acos(Math.min(1,(pa-w*0.105)/cr)); x.beginPath();
        x.arc(spx,T+h/2,cr,sd>0?-a:Math.PI-a,sd>0?a:Math.PI+a); x.stroke() });
      // corner arcs
      [[L,T,0],[R,T,Math.PI/2],[R,B,Math.PI],[L,B,Math.PI*1.5]].forEach(([cx,cy,a0])=>{ x.beginPath(); x.arc(cx,cy,w*0.009,a0,a0+Math.PI/2); x.stroke() });
    });
    x.fillStyle="rgba(246,250,242,.92)";
    [[L+w/2,T+h/2],[L+w*0.105,T+h/2],[R-w*0.105,T+h/2]].forEach(([px,py])=>{ x.beginPath(); x.arc(px,py,lw*1.4,0,Math.PI*2); x.fill() });
    [[L,-1],[R,1]].forEach(([gx,sd])=>hlNet(x,gx,T+h*post[0],T+h*post[1],w*0.022,sd));
    // corner flags
    [[L,T],[R,T],[R,B],[L,B]].forEach(([cx,cy])=>{ x.fillStyle="#F2C14E"; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+(cx<W/2?-1:1)*5,cy-3); x.lineTo(cx,cy-6); x.closePath(); x.fill() });
  }
  function idle(x,W,H){ hlTicker(x,W,H,"Highlights: goals and big chances play here",8) }
  const NUM=[1,2,5,6,3,7,4,8,11,9,10];
  function ballAt(c,t){
    const n=c.W.length, tb=0.7, ts=0.85; let bx,by,z=0, carrier=-1, k=0;
    if(t<tb){ const f=Math.max(0,t)/tb*(n-1); k=Math.min(n-2,Math.floor(f)); const s=hlEase(f-k); const a=c.W[k], b=c.W[k+1];
      bx=hlLerp(a[0],b[0],s); by=hlLerp(a[1],b[1],s); z=Math.sin(s*Math.PI)*(c.plan==="wing"&&k===n-2?0.05:c.plan==="corner"?0.06:0.012); carrier=s<0.15?c.rec[k]:s>0.85?c.rec[k+1]:-1 }
    else if(t<ts){ const s=(t-tb)/(ts-tb), a=c.W[n-1]; const e=c.end;
      bx=hlLerp(a[0],e[0],s); by=hlLerp(a[1],e[1],s); z=Math.sin(s*Math.PI)*(c.how==="over"?0.05:0.02) }
    else{ const s=(t-ts)/(1-ts); bx=c.end[0]; by=c.end[1];
      if(c.postHit){ bx=1-s*0.12; by=c.end[1]+(c.end[1]<0.5?-1:1)*s*0.08 }
      if(c.kind==="goal"){ bx=Math.min(1.02,c.end[0]+s*0.006) }
      if(c.kept&&c.kind==="save"){ bx=c.end[0]-s*0.01 } }
    return {bx,by,z,carrier,k} }
  function frame(x,W,H,c,t){
    const n=c.W.length, tb=0.7, ts=0.85;
    const {bx,by,z}=ballAt(c,t);
    const prog=Math.min(1,t/tb);   // how far the attack has come
    const kA=c.kits[c.home?0:1], kD=c.kits[c.home?1:0];
    // the attacking side: pushed up as the move goes on, the back line holding a little deeper; the receiver of the
    // next ball runs to meet it; the others drift with the ball's side of the pitch
    const att=BASE.map((p,i)=>{ const line=i===0?0:i<5?0.10:i<9?0.18:0.2;
      let a=p[0]+(i?line+line*prog:0.06*prog), y=p[1]+(by-0.5)*(i<5?0.08:0.16)*(i?1:0);
      const j=c.rec.indexOf(i); if(j>=0&&i){ const w=c.W[Math.max(0,j)], near=t<tb?Math.max(0,1-Math.abs(t/tb*(n-1)-j)):j===n-1?1:0; a=hlLerp(a,w[0],hlEase(Math.min(1,near*1.3))); y=hlLerp(y,w[1],hlEase(Math.min(1,near*1.3))) }
      if(i===c.rec[n-1]&&t>=tb){ const w=c.W[n-1]; a=w[0]; y=w[1] }
      return [Math.min(0.97,a),y] });
    // the defending side: a compact block between ball and goal, squeezing toward the ball; two go to it; the keeper
    // on his line, toward the shot
    const def=BASE.map((p,i)=>{ let a=1-p[0]*(0.78-0.18*prog), y=0.5+(p[1]-0.5)*(0.8-0.22*prog)+(by-0.5)*0.32;
      if(i===0){ a=0.985; y=0.5+(by-0.5)*0.25; if(t>=tb){ const s=Math.min(1,(t-tb)/(ts-tb)); const ty=c.kept?c.end[1]:c.kind==="goal"?0.5+(0.5-c.end[1])*0.4:0.5; y=hlLerp(y,ty,hlEase(s)) } }
      return [Math.max(0.5,a),Math.min(0.97,Math.max(0.03,y))] });
    let near=[]; def.forEach((p,i)=>{ if(i)near.push([Math.hypot(p[0]-bx,p[1]-by),i]) }); near.sort((a,b)=>a[0]-b[0]);
    near.slice(0,2).forEach(([d,i],q)=>{ const p=def[i]; def[i]=[hlLerp(p[0],bx,0.55-q*0.2),hlLerp(p[1],by,0.55-q*0.2)] });
    const r=Math.max(5,W/80), [qx,qy]=P(W,H,c,Math.min(1.03,bx),by);
    // the move so far, faint, and the shot once it's struck
    const done=[]; for(let q=0;q<=Math.min(n-1,Math.floor(prog*(n-1)));q++)done.push(P(W,H,c,c.W[q][0],c.W[q][1]));
    if(done.length){ done.push(t<tb?[qx,qy]:P(W,H,c,c.W[n-1][0],c.W[n-1][1])); hlPath(x,done,"rgba(255,255,255,.35)",[4,5],1.3) }
    if(t>=tb){ const a=P(W,H,c,c.W[n-1][0],c.W[n-1][1]); hlPath(x,[a,[qx,qy]],c.kind==="goal"?"rgba(255,226,92,.85)":"rgba(255,255,255,.6)",null,1.8) }
    const face=(px,py)=>Math.atan2(qy-py,qx-px);
    const sIdx=c.rec[n-1];
    def.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlPlayer(x,px,py,r,i?kD:hlKit("",c.gk[1]),{num:NUM[i],dir:face(px,py)}) });
    att.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); const hot=i===sIdx&&t>=tb-0.12; hlPlayer(x,px,py,r,i?kA:hlKit("",c.gk[0]),{num:NUM[i],dir:face(px,py),hot:hot,label:hot?c.nm:""}) });
    // the ball and the last few moments of its path
    const tr=[]; for(let q=8;q>=1;q--){ const b=ballAt(c,t-q*0.012); const pp=P(W,H,c,Math.min(1.03,b.bx),b.by); tr.push([pp[0],pp[1]-b.z*W]) }
    hlBall(x,qx,qy,r*0.55,z*W,t>0.1?tr:null);
    // the score bug, the commentary, and what happened
    const scored=c.kind==="goal"&&t>=ts, hs=c.sh+(scored&&c.home?1:0), as=c.sa+(scored&&!c.home?1:0);
    hlBug(x,W,H,{home:c.home0,away:c.away0,hs:hs,as:as,hk:c.kits[0],ak:c.kits[1],clock:c.m+"'"});
    if(t>=ts&&c.text)hlTicker(x,W,H,c.text,8+Math.max(10,Math.round(W/44))*1.7+6);
    const end=t>=ts?({goal:`GOAL! ${c.nm}`,save:"Saved!",post:"Off the post!",over:"Over the bar!",blocked:"Cleared off the line!",wide:"Wide!"})[c.how]||"":null;
    if(end)hlBanner(x,W,H,end,c.kind==="goal"?kA:null,(t-ts)/(1-ts));
  }
  return {aspect:0.62, clips, pitch, idle, frame};
})();
