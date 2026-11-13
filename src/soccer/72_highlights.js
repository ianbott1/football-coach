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
  const HL_CM=(typeof window!=="undefined"&&window.HLCM)||1;
  function clips(L,d,mode){
    const ev=(d.ev||[]).filter(e=>e.k==="goal"||e.k==="save"||e.k==="miss"||e.k==="red").sort((a,b)=>a.m-b.m);
    const out=[]; let chance=null;
    const sh0=d.sh-(d.h||0), sa0=d.sa-(d.a||0); let sh=sh0, sa=sa0;
    ev.forEach(e=>{
      if(e.k==="goal"){ const c=mk(L,e,"goal",sh,sa); if(e.side==="home")sh++; else sa++; c.after=[sh,sa]; out.push(c); return }
      if(e.k==="red"){ if(mode!=="goals")out.push(mk(L,e,"red",sh,sa)); return }   // round 66: a sending-off is a moment too
      // a big chance: one a stretch at most, in a game still within a goal, when asked for
      if(mode==="key"&&!chance&&Math.abs(sh-sa)<=2&&((e.u||0)%HL_CM===0)){ chance=mk(L,e,e.k,sh,sa); out.push(chance) }
      else if((mode==="all"||mode==="full")&&out.filter(c=>c.kind!=="goal").length<3)out.push(mk(L,e,e.k,sh,sa)) });   // round 68: every chance
    return hlTrim(out,mode==="all"||mode==="full"?5:3);
  }
  function mk(L,e,kind,sh,sa){
    const g=L.g, red=kind==="red", aside=red?(e.side==="home"?"away":"home"):e.side, tm=aside==="home"?g.home:g.away, opp=aside==="home"?g.away:g.home, u=e.u||((e.m||0)*37)%100;
    const r=mulberry32(((e.m||0)*7919+u*131+(e.side==="home"?17:29))>>>0);
    const shooter=kind==="goal"||kind==="miss"?scScorer(tm,u):scScorer(tm,u);
    let text=""; try{ text=scEventText(g,e).text }catch(er){}
    // the move follows the commentary's words where they say how ("heads in at the near post", "from the penalty spot",
    // "blazes over"), else the event's draw
    const T=text.toLowerCase();
    let plan=red?"through":/penalty/.test(T)?"pen":/corner|set piece/.test(T)?"corner":/distance|deflected/.test(T)?"distance":/head|back post|tip/.test(T)?"wing"
      :/rounds|first time|slots|cuts inside|drills|overlaps/.test(T)?"through":["wing","through","distance"][Math.floor(r()*3)];
    const how=kind==="miss"?(/post/.test(T)?"post":/over/.test(T)?"over":/line/.test(T)?"blocked":"wide"):kind;
    const side=r()<0.5?0:1;   // which flank
    // the move: waypoints for the ball in the attacking frame, and which attacker receives each
    let W=[];
    const start=[0.28+r()*0.12, 0.3+r()*0.4];
    if(plan==="wing"){ const wy=side?0.9:0.1; W=[start,[0.5+r()*0.08,0.5+(side?0.15:-0.15)],[0.74+r()*0.06,wy],[0.86+r()*0.04,0.42+r()*0.16]] }
    else if(plan==="through"){ W=[start,[0.52+r()*0.06,0.35+r()*0.3],[0.68+r()*0.05,0.4+r()*0.2],[0.84+r()*0.04,0.44+r()*0.12]] }
    else if(plan==="distance"){ W=[start,[0.5+r()*0.08,0.25+r()*0.5],[0.66+r()*0.06,0.38+r()*0.24],[0.72+r()*0.04,0.4+r()*0.2]] }
    // a penalty: the move that won it, ending with the foul in the box (round 66: Ian, the build-up, not just the kick)
    else if(plan==="pen"){ W=[start,[0.6+r()*0.06,0.3+r()*0.4],[0.88+r()*0.03,0.36+r()*0.28]] }
    else { const cy=side?0.995:0.005; W=[[0.995,cy],[0.9+r()*0.04,0.42+r()*0.16]] }
    // the receivers: the nearest attacker to each spot (the last is the man who shoots: the named one when we know him)
    const sIdx=(UNIT_IDX[shooter.unit]||[9,10])[Math.floor(r()*2)];
    const rec=W.map((w,i)=>{ if(i===W.length-1)return sIdx; let b=1,bd=9; for(let k=1;k<11;k++){ const p=BASE[k], dd=Math.hypot(p[0]+0.18-w[0],p[1]-w[1]); if(dd<bd&&k!==sIdx){bd=dd;b=k} } return b });
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
    if(red){ W=[start,[0.5+r()*0.06,0.3+r()*0.4],[0.64+r()*0.08,0.3+r()*0.4]]; for(let i=0;i<W.length;i++){ let b=1,bd=9; for(let k=1;k<11;k++){ const p=BASE[k], dd=Math.hypot(p[0]+0.18-W[i][0],p[1]-W[i][1]); if(dd<bd){bd=dd;b=k} } rec[i]=b } rec.length=W.length }
    let off=""; if(red){ const m2=/^(.*?) sees/.exec(text); off=m2?String(m2[1]).split(" ").slice(-1)[0]:"" }
    const from=plan==="pen"?[0.895,0.5]:W[W.length-1], pre=plan==="pen"?0.42:red?0.6:0;
    // round 67: shirt numbers. Each unit's named player wears his own on one dot (the scorer's dot carries the scorer);
    // the other dots take free numbers. A key under the pitch says who's who.
    const SLOT={GK:0,FB:1,CB:2,CM:6,W:5,ST:9};
    const sideNums=(team,isAtt)=>{ const R=(SEA.roster&&SEA.roster[team])||[], nums=[1,2,5,6,3,7,4,8,11,9,10], used={}, list=[];
      Object.keys(SLOT).forEach(u=>{ let slot=SLOT[u], i=typeof SC_UNIT!=="undefined"?SC_UNIT[u]:-1;
        if(isAtt&&!red&&u===shooter.unit){ slot=sIdx; const j=R.findIndex(p=>p&&p.n===shooter.n); if(j>=0)i=j }
        if(i<0||!R[i])return; const no=shirtNo(team,i); nums[slot]=no; used[no]=slot; list.push([no,String(R[i].n).split(" ").slice(-1)[0]]) });
      let f=2; nums.forEach((v,k)=>{ if(used[v]!==undefined&&used[v]!==k){ while(used[f]!==undefined||nums.indexOf(f)>=0)f++; nums[k]=f; used[f]=k } else used[v]=k });
      return {nums,list} };
    const SA=sideNums(tm,true), SD=sideNums(opp,false);
    // each shot its own flight (round 70, Ian: "all of the shots have a curve"): a low drive, a rising strike, a chip,
    // or one bent in from the side
    const shot=r(), lift=how==="over"?0.05:shot<0.35?0.003:shot<0.65?0.012:shot<0.82?0.028:0.008, bend=shot>=0.82?(r()<0.5?-1:1)*(0.03+r()*0.03):0;
    const cl={lift,bend,lr:(aside==="home")!==((e.m||0)>45),numsA:SA.nums,numsD:SD.nums,legend:[{team:tm,kit:kits[aside==="home"?0:1],list:SA.list},{team:opp,kit:kits[aside==="home"?1:0],list:SD.list}],kind,how:red?"red":how,e,tm,opp,home:aside==="home",W,rec,end,kept,postHit,nm:red?off:nm,text,plan,sh,sa,m:e.m,base:red?3000:3600,red,from,pre,inks,kits,gk:[gks[0],gks[1]],home0:g.home,away0:g.away};
    cl.open=Object.assign({},cl,{plan:"through",pre:0,red:false,from:W[W.length-1]});
    return cl;
  }
  // pitch coordinates (attack frame -> screen)
  // round 70: the sides change ends at half-time (Ian): lr, the attacking side going left to right
  const P=(W,H,c,a,y)=>{ const lr=c.lr!=null?c.lr:c.home, X=lr?a:1-a, Y=lr?y:1-y; return [W*PAD+X*W*(1-2*PAD), H*PAD+Y*H*(1-2*PAD)] };
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
  /* ---- the full match (round 68) ----
     Between the moments the pitch keeps playing: possession passed about in midfield, never a shot, the ball shared
     between the sides as the engine's balance of play for the stretch has it (its drive's mom, the home side's share).
     Every real moment still plays as its own clip. Drawn from the clock, not stored: a frame is the same however it's
     reached. */
  function ambient(x,W,H){
    if(typeof live==="undefined"||!live||live.done||!live.g)return;
    const g=live.g, last=live.drives[live.drives.length-1], mom=last&&typeof last.mom==="number"?last.mom:0.5;
    const DT=1150, now=Date.now(), seedB=((live.step||0)*7919+live.drives.length*131)>>>0;
    const spot=k=>{ const h=strHash(seedB+"|"+k), r1=(h%1000)/1000, r2=((h>>>10)%1000)/1000, r3=((h>>>20)%1000)/1000, home=r1<mom;
      return {home,a:0.28+r2*0.48,y:0.12+r3*0.76} };      // in the side's own frame: never beyond 0.76 of the way to goal
    const at=T=>{ const k=Math.floor(T/DT), f=(T-k*DT)/DT, A=spot(k), B=spot(k+1);
      const ax=A.home?A.a:1-A.a, bx=B.home?B.a:1-B.a, ay=A.home?A.y:1-A.y, by=B.home?B.y:1-B.y, e=hlEase(Math.min(1,f/0.55));
      return {x:hlLerp(ax,bx,e),y:hlLerp(ay,by,e),home:f<0.55?A.home:B.home} };   // pitch frame: 0 the home goal, 1 the away goal
    const kits=hlKits(g.home,g.away), r=Math.max(5,W/80);
    // each side keeps its shape around the ball: the side on it pushed on, the other in a block behind it
    const shape=(T,home)=>{ const b=at(T), bx=home?b.x:1-b.x, by=home?b.y:1-b.y, has=b.home===home;
      return BASE.map((p,i)=>{ if(i===0)return [0.04+0.05*bx,0.5+(by-0.5)*0.12];
        const push=has?Math.max(0,bx-0.3)*0.7:Math.max(0,bx-0.45)*0.45, depth=i<5?0.6:i<9?0.85:1;
        return [Math.min(0.92,p[0]+push*depth+(has?0.05:-0.02)),0.5+(p[1]-0.5)*(has?1:0.82)+(by-0.5)*(i<5?0.15:0.25)] }) };
    const lagged=home=>{ const S0=[0,120,240,360], o=BASE.map(()=>[0,0]); S0.forEach((dt,q)=>{ const w=4-q; shape(now-dt,home).forEach((p,i)=>{ o[i][0]+=p[0]*w; o[i][1]+=p[1]*w }) }); return o.map(p=>[p[0]/10,p[1]/10]) };
    const h2=live.drives.length*5>45, toS=(home,p)=>{ const lr=home!==h2, X=lr?p[0]:1-p[0], Y=lr?p[1]:1-p[1]; return [W*PAD+X*W*(1-2*PAD), H*PAD+Y*H*(1-2*PAD)] };
    const b=at(now), [qx,qy]=toS(true,[b.x,b.y]);   // the ball in the home side's frame
    [false,true].forEach(home=>{ const k=kits[home?0:1], gk=hlKit("",home?"#E8F56B":"#C9A0FF"), P2=lagged(home);
      // the man nearest the ball, on the side that has it, is on it
      let ni=-1,nd=9; if(b.home===home)P2.forEach((p,i)=>{ if(!i)return; const [sx,sy]=toS(home,p), dd=Math.hypot(sx-qx,sy-qy); if(dd<nd){nd=dd;ni=i} });
      P2.forEach((p,i)=>{ let [sx,sy]=toS(home,p); if(i===ni){ sx=hlLerp(sx,qx,0.8); sy=hlLerp(sy,qy,0.8) } hlPlayer(x,sx,sy,r,i?k:gk,{num:NUM[i],dir:Math.atan2(qy-sy,qx-sx)}) }) });
    hlBall(x,qx,qy,r*0.55,0,null);
    const Hd=live.hold, hs=Hd?Hd.h:live.eng.h, as=Hd?Hd.a:live.eng.a;
    hlBug(x,W,H,{home:g.home,away:g.away,hs:hs,as:as,hk:kits[0],ak:kits[1],clock:Math.min(90,live.drives.length*5)+"'"});
  }
  function idle(x,W,H){ if(typeof hlMode==="function"&&hlMode()==="full")ambient(x,W,H) }
  const NUM=[1,2,5,6,3,7,4,8,11,9,10];
  /* penalties and red cards: an open-play move first, played in the first part of the clip (pre), then the set piece */
  const openT=(c,t)=>Math.min(0.699,Math.max(0,t)*0.7/c.pre);
  function ballAt(c,t){
    if(c.pre&&c.red){ if(t<c.pre)return ballAt0(c.open,openT(c,t)); const f=c.W[c.W.length-1]; return {bx:f[0]+Math.min(0.01,(t-c.pre)*0.05),by:f[1],z:0,carrier:-1,k:0} }
    if(c.pre&&c.plan==="pen"){ if(t<c.pre)return ballAt0(c.open,openT(c,t)); const f=c.W[c.W.length-1];
      if(t<0.5)return {bx:f[0],by:f[1],z:0,carrier:-1,k:0};
      if(t<0.66){ const s=hlEase((t-0.5)/0.16); return {bx:hlLerp(f[0],c.from[0],s),by:hlLerp(f[1],c.from[1],s),z:0,carrier:-1,k:0} } }
    return ballAt0(c,t) }
  function ballAt0(c,t){
    const n=c.W.length, tb=0.7, ts=0.85; let bx,by,z=0, carrier=-1, k=0;
    if(t<tb&&!(c.plan==="pen"&&c.pre)){ const f=Math.max(0,t)/tb*(n-1); k=Math.min(n-2,Math.floor(f)); const s=hlEase(f-k); const a=c.W[k], b=c.W[k+1];
      bx=hlLerp(a[0],b[0],s); by=hlLerp(a[1],b[1],s); z=Math.sin(s*Math.PI)*(c.plan==="wing"&&k===n-2?0.05:c.plan==="corner"?0.06:0.012); carrier=s<0.15?c.rec[k]:s>0.85?c.rec[k+1]:-1 }
    else if(t<tb&&c.plan==="pen"){ bx=c.from[0]; by=c.from[1] }
    else if(t<ts){ const s=(t-tb)/(ts-tb), a=c.from||c.W[n-1]; const e=c.end;
      bx=hlLerp(a[0],e[0],s); by=hlLerp(a[1],e[1],s)+Math.sin(s*Math.PI)*(c.bend||0); z=Math.sin(s*Math.PI)*(c.lift!=null?c.lift:0.02) }
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
    if(c.pre&&t<c.pre+0.08)return attAt0(c.open,openT(c,t));
    if(c.pre&&c.plan==="pen"&&t<0.66){ const a=attAt0(c.open,0.699), b=attAt0(c,0.66), e=hlEase((t-c.pre-0.08)/(0.66-c.pre-0.08)); return a.map((p,i)=>[hlLerp(p[0],b[i][0],e),hlLerp(p[1],b[i][1],e)]) }
    if(c.red){ const a=attAt0(c.open,0.699); return a }   // play stops for the card
    return attAt0(c,t) }
  function attAt0(c,t){
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
    if(t>=tb||c.plan==="pen"&&c.pre&&t>=0.66){ const w=c.plan==="pen"&&c.pre?[c.from[0]-0.02,c.from[1]]:c.W[n-1]; pos[c.rec[n-1]]=[w[0],w[1]] }
    // the celebration: the scorer to the corner flag, team-mates after him
    if(c.kind==="goal"&&t>ts){ const s=hlEase((t-ts)/(1-ts)), cy=by<0.5?0.03:0.97, sc=c.rec[n-1];
      pos[sc]=[hlLerp((c.from||c.W[n-1])[0],0.96,s),hlLerp((c.from||c.W[n-1])[1],cy,s)];
      pos.map((p,i)=>[Math.hypot(p[0]-pos[sc][0],p[1]-pos[sc][1]),i]).filter(([d,i])=>i&&i!==sc).sort((a,b2)=>a[0]-b2[0]).slice(0,3)
        .forEach(([d,i],q)=>{ pos[i]=[hlLerp(pos[i][0],0.93-q*0.02,s*0.8),hlLerp(pos[i][1],cy+(cy<0.5?1:-1)*(0.04+q*0.03),s*0.8)] }) }
    return pos.map(p=>[Math.max(0.02,Math.min(0.97,p[0])),Math.max(0.02,Math.min(0.98,p[1]))]) }
  function defAt(c,t,att){
    // a red card: the booked centre-back (no. 5) closes the man on the ball and chops him; then walks off
    if(c.red){ const base=defAt0(c.open,openT(c,Math.min(t,c.pre)),att), f=c.W[c.W.length-1];
      const k=hlEase(Math.min(1,t/c.pre)); base[2]=[hlLerp(base[2][0],f[0]+0.015,k),hlLerp(base[2][1],f[1],k)];
      if(t>c.pre+0.1){ const w=hlEase((t-c.pre-0.1)/(1-c.pre-0.1)); base[2]=[hlLerp(f[0]+0.015,0.75,w),hlLerp(f[1],f[1]<0.5?-0.01:1.01,w)] }
      return base }
    if(c.pre&&t<c.pre+0.08)return defAt0(c.open,openT(c,t),att);
    if(c.pre&&c.plan==="pen"&&t<0.66){ const a=defAt0(c.open,0.699,att), b=defAt0(c,0.66,att), e=hlEase((t-c.pre-0.08)/(0.66-c.pre-0.08)); return a.map((p,i)=>p&&[hlLerp(p[0],b[i][0],e),hlLerp(p[1],b[i][1],e)]) }
    return defAt0(c,t,att) }
  function defAt0(c,t,att){
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
    const tb=0.7, ts=0.85; if(c.red||t<tb+0.04||c.plan==="pen"&&t<tb)return null;
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
    const bEnd=c.pre||tb, pg=Math.min(1,t/bEnd);
    const done=[]; for(let q=0;q<=Math.min(n-1,Math.floor(pg*(n-1)));q++)done.push(P(W,H,c,c.W[q][0],c.W[q][1]));
    if(done.length){ done.push(t<bEnd?[qx,qy]:P(W,H,c,c.W[n-1][0],c.W[n-1][1])); hlPath(x,done,"rgba(255,255,255,.35)",[4,5],1.3) }
    if(t>=tb&&!c.red){ const a=P(W,H,c,c.from[0],c.from[1]); hlPath(x,[a,[qx,qy]],c.kind==="goal"&&t>=ts?"rgba(255,226,92,.85)":"rgba(255,255,255,.6)",null,1.8) }   // gold only once it's in
    const face=(px,py)=>Math.atan2(qy-py,qx-px);
    const dv=keeperDive(c,t);
    def.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]);
      if(i===0&&dv){ const ang=((c.lr!=null?c.lr:c.home)?1:-1)*(dv.dir>0?Math.PI/2:-Math.PI/2); hlPlayer(x,px,py,r,hlKit("",c.gk[1]),{dive:{ang:ang,k:dv.k}}); return }
      const sent=c.red&&i===2&&t>=c.pre, fade=sent&&t>c.pre+0.1?Math.max(0.25,1-(t-c.pre-0.1)*1.8):null;
      hlPlayer(x,px,py,r,i?kD:hlKit("",c.gk[1]),{num:c.numsD?c.numsD[i]:NUM[i],dir:face(px,py),alpha:fade,label:sent?c.nm:"",hot:sent});
      if(sent){ x.save(); x.translate(px+r*1.3,py-r*1.6); x.rotate(0.2); x.fillStyle="#E3262F"; x.fillRect(-r*0.45,-r*0.65,r*0.9,r*1.3); x.strokeStyle="rgba(0,0,0,.5)"; x.lineWidth=0.8; x.strokeRect(-r*0.45,-r*0.65,r*0.9,r*1.3); x.restore() } });
    att.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); const hot=!c.red&&i===sIdx&&t>=ts; hlPlayer(x,px,py,r,i?kA:hlKit("",c.gk[0]),{num:c.numsA?c.numsA[i]:NUM[i],dir:face(px,py),hot:hot,label:hot?c.nm:""}) });
    // the ball and the last few moments of its path
    const tr=[]; for(let q=8;q>=1;q--){ const b=ballAt(c,t-q*0.012); const pp=P(W,H,c,Math.min(1.03,b.bx),b.by); tr.push([pp[0],pp[1]-b.z*W]) }
    hlBall(x,qx,qy,r*0.55,z*W,t>0.1?tr:null);
    // the score bug, the commentary, and what happened
    const scored=c.kind==="goal"&&t>=ts, hs=c.sh+(scored&&c.home?1:0), as=c.sa+(scored&&!c.home?1:0);
    hlBug(x,W,H,{home:c.home0,away:c.away0,hs:hs,as:as,hk:c.kits[0],ak:c.kits[1],clock:c.m+"'"});
    const said=c.red?t>=c.pre+0.04:t>=ts;
    if(said&&c.text)hlTicker(x,W,H,c.text,8+Math.max(10,Math.round(W/44))*1.7+6);
    if(c.red){ if(said)hlBanner(x,W,H,`RED CARD! ${c.nm||""}`.trim(),{fill:"#E3262F"},(t-c.pre-0.04)/(1-c.pre)); return }
    if(c.plan==="pen"&&c.pre&&t>=c.pre+0.03&&t<tb)hlBanner(x,W,H,"PENALTY!",null,(t-c.pre-0.03)/(tb-c.pre));
    const end=t>=ts?({goal:`GOAL! ${c.nm}`,save:"Saved!",post:"Off the post!",over:"Over the bar!",blocked:"Cleared off the line!",wide:"Wide!"})[c.how]||"":null;
    if(end)hlBanner(x,W,H,end,c.kind==="goal"?kA:null,(t-ts)/(1-ts));
  }
  return {reveal:0.85, ambient:true, aspect:0.62, clips, pitch, idle, frame};
})();
