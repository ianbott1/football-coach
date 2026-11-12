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
  /* ---- how they move (round 65) ----
     Attack: the side keeps its 4-4-2 shape, pushed up the pitch with the ball and shifted toward its side. The man who
     takes each pass starts his run before it's played and curves into space; on a move down the wing the full back
     overlaps outside the winger; as the cross or shot comes, the forwards attack the near post, the far post and the
     penalty spot, a midfielder arrives late at the edge of the box. After a goal the scorer wheels away to the corner
     and the nearest team-mates chase him. Defence: a flat back four that holds a line and slides across with the
     ball, a midfield four a step in front, two strikers loitering; the nearest man presses the ball, the next covers;
     in the box each defender picks up the nearest attacker, goal side. The keeper narrows the angle off his line and
     dives at the shot. */
  const BOX=[[0.94,0.43],[0.93,0.6],[0.89,0.5],[0.83,0.46],[0.81,0.32]];   // near post, far post, spot, edge, late
  function attAt(c,t){
    const n=c.W.length, tb=0.7, ts=0.85, b=ballAt(c,t), bx=b.bx, by=b.by, prog=c.plan==="corner"?1:Math.min(1,t/tb), fin=c.plan==="corner"?1:Math.max(0,Math.min(1,(t-tb*0.75)/(tb*0.3)));
    const wingSide=c.plan==="wing"?(c.W[2]&&c.W[2][1]>0.5?1:0):-1;
    const push=Math.min(0.42,Math.max(0,bx-0.35))*0.9+0.1*prog;
    const pos=BASE.map((p,i)=>{ if(i===0)return [0.05+0.1*prog,0.5+(by-0.5)*0.1];
      const depth=i<5?0.55:i<9?0.8:0.9, a=p[0]+push*depth+0.04*prog, y=0.5+(p[1]-0.5)*(i<5?0.9:1.0)+(by-0.5)*(i<5?0.12:0.22);
      return [a,y] });
    // the full back's overlap down the wing being used
    if(wingSide>=0){ const fb=wingSide?4:1, wg=wingSide?8:5, o=Math.max(0,Math.min(1,(prog-0.2)/0.6));
      pos[fb]=[hlLerp(pos[fb][0],Math.min(0.86,bx+0.12),hlEase(o)),hlLerp(pos[fb][1],wingSide?0.93:0.07,hlEase(o))];
      pos[wg]=[pos[wg][0],hlLerp(pos[wg][1],wingSide?0.78:0.22,hlEase(o))] }
    // the box: forwards and a late midfielder attack it as the final ball comes
    if(c.plan==="corner"){ [2,3].forEach((i,q)=>{ pos[i]=[0.52,0.38+q*0.24] }); [1,4].forEach((i,q)=>{ pos[i]=[0.7,0.2+q*0.6] }) }
    if(c.plan!=="pen"){ const crash=[9,10,6,7,c.plan==="wing"?(wingSide?5:8):5].filter(i=>i!==c.rec[n-1]);
      crash.forEach((i,q)=>{ const tg=BOX[q%BOX.length]; const y=c.plan==="wing"&&wingSide===0?1-tg[1]:tg[1]; pos[i]=[hlLerp(pos[i][0],tg[0],hlEase(fin)*(q<3?1:0.7)),hlLerp(pos[i][1],y,hlEase(fin)*(q<3?1:0.7))] }) }
    else pos.forEach((p,i)=>{ if(i&&i!==c.rec[n-1])pos[i]=i<5?[0.55+((i*7)%3)*0.03,0.25+((i*3)%4)*0.17]:[0.79-((i*7)%3)*0.012,0.2+((i*7)%10)*0.064] });   // a penalty: everyone back outside the box
    // each receiver: starts his run a beat before the pass, curving into the space it's played to
    c.rec.forEach((ri,j)=>{ if(!ri)return; const w=c.W[j], f=t<tb?t/tb*(n-1):n-1, lead=j-f;
      if(lead<=-0.15&&j<n-1){ return }
      const s=Math.max(0,Math.min(1,1-(lead-0.05)/1.1)), e=hlEase(s), from=pos[ri], bend=(j%2?1:-1)*0.05*Math.sin(e*Math.PI);
      pos[ri]=[hlLerp(from[0],w[0],e)+bend*0.3,hlLerp(from[1],w[1],e)+bend] });
    if(t>=tb){ const w=c.W[n-1]; pos[c.rec[n-1]]=[w[0],w[1]] }
    // the celebration: the scorer to the corner flag, team-mates after him
    if(c.kind==="goal"&&t>ts){ const s=hlEase((t-ts)/(1-ts)), cy=by<0.5?0.03:0.97, sc=c.rec[n-1];
      pos[sc]=[hlLerp(c.W[n-1][0],0.96,s),hlLerp(c.W[n-1][1],cy,s)];
      pos.map((p,i)=>[Math.hypot(p[0]-pos[sc][0],p[1]-pos[sc][1]),i]).filter(([d,i])=>i&&i!==sc).sort((a,b2)=>a[0]-b2[0]).slice(0,3)
        .forEach(([d,i],q)=>{ pos[i]=[hlLerp(pos[i][0],0.93-q*0.02,s*0.8),hlLerp(pos[i][1],cy+(cy<0.5?1:-1)*(0.04+q*0.03),s*0.8)] }) }
    return pos.map(p=>[Math.max(0.02,Math.min(0.97,p[0])),Math.max(0.02,Math.min(0.98,p[1]))]) }
  function defAt(c,t,att){
    const n=c.W.length, tb=0.7, ts=0.85, b=ballAt(c,t), bx=b.bx, by=b.by, fin=c.plan==="corner"?1:Math.max(0,Math.min(1,(t-tb*0.75)/(tb*0.3)));
    const line=Math.min(0.9,Math.max(0.62,bx+0.12)), mid=line-0.15, top=line-0.3, sy=0.5+(by-0.5)*0.42, wid=0.36;
    const pos=[null,
      [line,sy-wid*0.82],[line+0.005,sy-wid*0.27],[line+0.005,sy+wid*0.27],[line,sy+wid*0.82],
      [mid,sy-wid*0.9],[mid-0.01,sy-wid*0.3],[mid-0.01,sy+wid*0.3],[mid,sy+wid*0.9],
      [top,sy-0.12],[top,sy+0.12]];
    // in the box at the end: each defender goes goal side of the nearest attacker in it
    if(fin>0){ const inBox=(att||[]).map((p,i)=>p&&i&&p[0]>0.8?i:-1).filter(i=>i>=0), used={};
      [2,3,1,4,6,7].forEach(d=>{ let best=-1,bd=9; inBox.forEach(a=>{ if(used[a])return; const dd=Math.hypot(att[a][0]-pos[d][0],att[a][1]-pos[d][1]); if(dd<bd){bd=dd;best=a} });
        if(best<0)return; used[best]=1; const m=att[best]; pos[d]=[hlLerp(pos[d][0],Math.min(0.97,m[0]+0.025),hlEase(fin)),hlLerp(pos[d][1],hlLerp(m[1],0.5,0.2),hlEase(fin))] }) }
    if(c.plan==="pen"){ for(let i=1;i<11;i++)pos[i]=i<9?[0.805+((i*5)%3)*0.01,0.23+((i*3)%10)*0.064]:[0.6,0.4+(i-9)*0.2]; pos[0]=[0.99,0.5]; const dv=keeperDive(c,t); if(dv)pos[0]=[0.99,hlLerp(0.5,dv.y,dv.k)];
      return pos.map(p=>p&&[Math.max(0.03,Math.min(0.99,p[0])),Math.max(0.02,Math.min(0.98,p[1]))]) }
    // the press: the nearest outfield man to the ball closes it, the next drops in behind him
    const nr=pos.map((p,i)=>p&&i?[Math.hypot(p[0]-bx,p[1]-by),i]:null).filter(Boolean).sort((a,b2)=>a[0]-b2[0]);
    if(nr[0]){ const i=nr[0][1]; pos[i]=[hlLerp(pos[i][0],bx+0.02,0.7),hlLerp(pos[i][1],by,0.7)] }
    if(nr[1]){ const i=nr[1][1]; pos[i]=[hlLerp(pos[i][0],Math.min(0.95,bx+0.07),0.4),hlLerp(pos[i][1],hlLerp(by,0.5,0.4),0.4)] }
    // the keeper: off his line on the angle between ball and goal
    const ang=Math.atan2(by-0.5,1-bx), off=Math.min(0.03,Math.max(0.008,0.03*(1-Math.hypot(1-bx,by-0.5)/0.6)));
    let gx=0.99-off*Math.cos(ang), gy=0.5+Math.max(-0.045,Math.min(0.045,(by-0.5)*0.25));
    const dv=keeperDive(c,t); if(dv){ gy=hlLerp(gy,dv.y,dv.k); gx=Math.min(0.99,gx+0.004*dv.k) }
    pos[0]=[gx,gy];
    return pos.map(p=>p&&[Math.max(0.03,Math.min(0.99,p[0])),Math.max(0.02,Math.min(0.98,p[1]))]) }
  /* the dive: from the moment the shot is struck. Saves are reached; goals are dived at a beat late, or the wrong way
     when it goes in the other half of the goal from where he started */
  function keeperDive(c,t){
    const tb=0.7, ts=0.85; if(t<tb+0.04||c.plan==="pen"&&t<tb)return null;
    if(c.how==="over"||c.how==="wide")return null;
    const s=Math.min(1,(t-tb-0.04)/(ts-tb)), k=hlEase(s);
    let y=c.end[1]; if(c.kind==="goal"){ const wrong=((c.e&&c.e.u)||0)%3===0; y=wrong?0.5-(c.end[1]-0.5)*0.9:hlLerp(0.5,c.end[1],0.7) }
    const dir=y>0.5?1:-1; return {y:Math.max(0.44,Math.min(0.56,y)),k:k*(c.kind==="goal"?0.9:1),dir:dir} }
  function frame(x,W,H,c,t){
    const n=c.W.length, tb=0.7, ts=0.85;
    const {bx,by,z}=ballAt(c,t);
    const prog=Math.min(1,t/tb);   // how far the attack has come
    const kA=c.kits[c.home?0:1], kD=c.kits[c.home?1:0];
    // positions are where each player is heading, averaged over the last moments: players accelerate and settle
    // rather than snap (a stateless lag, so a frame is the same however it's reached)
    const lag=(fn)=>{ const S=[0,0.02,0.04,0.06], out=[]; S.forEach((dt,q)=>{ const P2=fn(Math.max(0,t-dt)); P2.forEach((p,i)=>{ if(!out[i])out[i]=[0,0,0]; if(!p)return; const wgt=4-q; out[i][0]+=p[0]*wgt; out[i][1]+=p[1]*wgt; out[i][2]+=wgt }) });
      return out.map(o=>o[2]?[o[0]/o[2],o[1]/o[2]]:null) };
    const att=lag(tt=>attAt(c,tt)), def=lag(tt=>defAt(c,tt,att));
    const kick=t>=tb&&t<ts+0.02, sIdx=c.rec[n-1];
    const r=Math.max(5,W/80), [qx,qy]=P(W,H,c,Math.min(1.03,bx),by);
    // the move so far, faint, and the shot once it's struck
    const done=[]; for(let q=0;q<=Math.min(n-1,Math.floor(prog*(n-1)));q++)done.push(P(W,H,c,c.W[q][0],c.W[q][1]));
    if(done.length){ done.push(t<tb?[qx,qy]:P(W,H,c,c.W[n-1][0],c.W[n-1][1])); hlPath(x,done,"rgba(255,255,255,.35)",[4,5],1.3) }
    if(t>=tb){ const a=P(W,H,c,c.W[n-1][0],c.W[n-1][1]); hlPath(x,[a,[qx,qy]],c.kind==="goal"?"rgba(255,226,92,.85)":"rgba(255,255,255,.6)",null,1.8) }
    const face=(px,py)=>Math.atan2(qy-py,qx-px);
    const dv=keeperDive(c,t);
    def.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]);
      if(i===0&&dv){ const ang=(c.home?1:-1)*(dv.dir>0?Math.PI/2:-Math.PI/2); hlPlayer(x,px,py,r,hlKit("",c.gk[1]),{dive:{ang:ang,k:dv.k}}); return }
      hlPlayer(x,px,py,r,i?kD:hlKit("",c.gk[1]),{num:NUM[i],dir:face(px,py)}) });
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
