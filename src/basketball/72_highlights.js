/* Basketball's highlights (round 51, core 97_highlights): a stretch's big basket from the engine's event (a three, an
   and-one inside), and the last shot of a game, played out on a court by ten dots. The man the commentary names takes
   the shot. In "key" mode, one basket a stretch while the game is within ten, and every last shot; "goals" mode keeps
   only the last five minutes of a close game and the last shot. The home side attacks to the right. */
const HL_SPORT=(function(){
  const PADX=0.03, PADY=0.05, RIM=[0.945,0.5];
  // attack frame: 0 the side's own baseline, 1 the one it attacks. PG, SG, SF, PF, C
  const ATT=[[0.64,0.5],[0.76,0.12],[0.77,0.88],[0.86,0.3],[0.9,0.66]];
  function clips(L,d,mode){
    const g=L.g, out=[];
    if(d.seg==="last"){ out.push(mk(L,{k:d.made?"last":"lastmiss",side:d.side,u:(d.sh*7+d.sa*13)%100,choice:d.choice,m:"0:04"},d)); return out }
    const SG=typeof SEGS!=="undefined"?SEGS:8, late=d.seg>=SG-1, close=Math.abs(d.sh-d.sa)<=(late?5:10);
    if(mode==="goals"&&!(late&&close))return out;
    if(!close)return out;
    const ev=(d.ev||[]).filter(e=>e.k==="three"||e.k==="inside");
    if(!ev.length)return out;
    // the stretch's moment: the last side to score big, its draw picking which
    const e=ev[(ev.length-1+((ev[0].u||0)%2))%ev.length];
    out.push(mk(L,Object.assign({},e,{m:segClock(d.seg)}),d));
    return out;
  }
  function mk(L,e,d){
    const g=L.g, tm=e.side==="home"?g.home:g.away, u=e.u||0;
    const r=mulberry32((u*131+(typeof e.m==="string"?e.m.length*977:0)+(e.side==="home"?17:29))>>>0);
    const kind=e.k==="last"||e.k==="lastmiss"?(e.choice==="three"?"three":"two"):e.k;
    const made=e.k!=="lastmiss";
    const idx=kind==="three"?[1,2,0,1,2][u%5]:kind==="inside"?[4,3,4,2][u%4]:(u%2?0:1);
    let nm=""; try{ nm=bbPlayer(tm,idx,u)||(e.k==="last"||e.k==="lastmiss"?bbStar(tm):"") }catch(er){}
    if(e.k==="last"||e.k==="lastmiss"){ try{ nm=bbStar(tm) }catch(er){} }
    // the spot: a three from the corner, the wing or the top; inside at the rim; a two from the elbow
    const spot=kind==="three"?[[0.92,0.035],[0.77,0.14],[0.69,0.5],[0.77,0.86],[0.92,0.965]][Math.floor(r()*5)]:kind==="inside"?[0.93,0.5+(r()-0.5)*0.12]:[0.84,0.38+r()*0.24];
    // ball movement: two or three passes round the perimeter, then the shooter
    const W=[[0.62,0.5]]; const k=1+Math.floor(r()*2);
    for(let i=0;i<k;i++)W.push([[0.76,0.15],[0.7,0.5],[0.76,0.85]][Math.floor(r()*3)]);
    if(kind==="inside")W.push([0.82,0.5+(r()-0.5)*0.4]);
    W.push(spot);
    const rec=W.map((w,i)=>{ if(i===W.length-1)return idx; let b=0,bd=9; ATT.forEach((p,j)=>{ if(j===idx)return; const dd=Math.hypot(p[0]-w[0],p[1]-w[1]); if(dd<bd){bd=dd;b=j} }); return b });
    const inks=hlKits(g.home,g.away).map(k=>k.fill), last=e.k==="last"||e.k==="lastmiss";
    return {kind,made,last,e,tm,home:e.side==="home",W,rec,nm:nm?String(nm).split(" ").slice(-1)[0]:"",m:e.m,base:last?3600:2600,inks,
      andOne:kind==="inside",text:""};
  }
  const P=(W,H,c,a,y)=>{ const X=c.home?a:1-a, Y=c.home?y:1-y; return [W*PADX+X*W*(1-2*PADX), H*PADY+Y*H*(1-2*PADY)] };
  function pitch(x,W,H){
    const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#161B26"); bg.addColorStop(1,"#0E121A"); x.fillStyle=bg; x.fillRect(0,0,W,H);
    const L=W*PADX, T=H*PADY, w=W*(1-2*PADX), h=H*(1-2*PADY);
    // the apron, then maple boards running the length of the floor, each its own shade, with grain
    x.fillStyle="#7A4E2A"; x.fillRect(L-W*0.012,T-H*0.02,w+W*0.024,h+H*0.04);
    { const r=mulberry32(3), bh=Math.max(3,h/34); for(let yy=T,row=0;yy<T+h;yy+=bh,row++){ let xx=L-r()*w*0.2;
        while(xx<L+w){ const bl=w*(0.12+r()*0.18), tone=r(); x.fillStyle=`rgb(${Math.round(206+tone*22)},${Math.round(160+tone*18)},${Math.round(104+tone*14)})`;
          x.fillRect(Math.max(L,xx),yy,Math.min(bl,L+w-Math.max(L,xx)),Math.min(bh,T+h-yy)); x.fillStyle="rgba(90,55,25,.18)"; x.fillRect(Math.max(L,xx),yy,0.7,Math.min(bh,T+h-yy)); xx+=bl }
        x.fillStyle="rgba(90,55,25,.12)"; x.fillRect(L,yy,w,0.6) }
      for(let k=0;k<260;k++){ const gx=L+r()*w, gy=T+r()*h; x.fillStyle=`rgba(120,75,35,${0.05+r()*0.08})`; x.fillRect(gx,gy,4+r()*18,0.6) } }
    // varnish: the arena lights reflected down the middle
    const gl=x.createLinearGradient(0,T,0,T+h); gl.addColorStop(0,"rgba(255,255,255,0)"); gl.addColorStop(0.5,"rgba(255,248,230,.16)"); gl.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=gl; x.fillRect(L,T,w,h);
    const lw=Math.max(1.3,W/480);
    // the painted lanes and the centre circle
    [[RIM[0],1],[1-RIM[0],-1]].forEach(([rx,sd])=>{ x.fillStyle="rgba(28,58,120,.78)"; x.fillRect(sd>0?L+w*0.81:L,T+h*0.34,w*0.19,h*0.32) });
    x.beginPath(); x.arc(L+w/2,T+h/2,h*0.12,0,Math.PI*2); x.fillStyle="rgba(28,58,120,.55)"; x.fill();
    hlLines(x,lw,()=>{
      x.strokeRect(L,T,w,h);
      x.beginPath(); x.moveTo(L+w/2,T); x.lineTo(L+w/2,T+h); x.stroke(); x.beginPath(); x.arc(L+w/2,T+h/2,h*0.12,0,Math.PI*2); x.stroke();
      x.beginPath(); x.arc(L+w/2,T+h/2,h*0.04,0,Math.PI*2); x.stroke();
      [[RIM[0],1],[1-RIM[0],-1]].forEach(([rx,sd])=>{ const cx=L+rx*w, cy=T+h/2;
        x.strokeRect(sd>0?L+w*0.81:L,T+h*0.34,w*0.19,h*0.32);
        const fx=sd>0?L+w*0.81:L+w*0.19; x.beginPath(); x.arc(fx,cy,h*0.12,sd>0?Math.PI/2:-Math.PI/2,sd>0?Math.PI*1.5:Math.PI/2); x.stroke();
        // the three-point line: straight from the baseline in the corners, then the arc round the rim
        const Rr=h*0.45, th=Math.asin(Math.min(0.999,0.44/0.45));
        x.beginPath(); x.moveTo(sd>0?L+w:L,cy-h*0.44); x.lineTo(cx-sd*Rr*Math.cos(th),cy-h*0.44);
        x.arc(cx,cy,Rr,sd>0?Math.PI+th:-th,sd>0?Math.PI-th:th,sd>0); x.lineTo(sd>0?L+w:L,cy+h*0.44); x.stroke();
        // the restricted-area arc and lane hash marks
        x.beginPath(); x.arc(cx,cy,h*0.08,sd>0?Math.PI/2:-Math.PI/2,sd>0?Math.PI*1.5:Math.PI/2); x.stroke();
        [0.86,0.9].forEach(fz=>{ const hx=sd>0?L+w*fz:L+w*(1-fz); x.beginPath(); x.moveTo(hx,T+h*0.34); x.lineTo(hx,T+h*0.32); x.moveTo(hx,T+h*0.66); x.lineTo(hx,T+h*0.68); x.stroke() }) });
    });
    // the baskets: backboard, rim, net
    [[RIM[0],1],[1-RIM[0],-1]].forEach(([rx,sd])=>{ const cx=L+rx*w, cy=T+h/2, rr=Math.max(3,w*0.012);
      x.fillStyle="rgba(240,244,248,.9)"; x.fillRect(cx+sd*rr*1.6-(sd>0?0:2),cy-h*0.09,2.2,h*0.18);
      x.beginPath(); x.arc(cx,cy,rr,0,Math.PI*2); x.fillStyle="rgba(255,255,255,.35)"; x.fill();
      x.strokeStyle="rgba(255,255,255,.6)"; x.lineWidth=0.6; for(let a=0;a<6;a++){ x.beginPath(); x.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); x.lineTo(cx+Math.cos(a+1.2)*rr*0.4,cy+Math.sin(a+1.2)*rr*0.4); x.stroke() }
      x.beginPath(); x.arc(cx,cy,rr,0,Math.PI*2); x.strokeStyle="#E8553D"; x.lineWidth=2; x.stroke() });
  }
  function idle(x,W,H){ hlCaption(x,W,H,"Highlights: the big baskets and last shots play here",null) }
  function frame(x,W,H,c,t){
    const n=c.W.length, tb=0.7, ts=0.86;
    let bx,by,z=0;
    if(t<tb){ const f=t/tb*(n-1), k=Math.min(n-2,Math.floor(f)), s=hlEase(f-k), a=c.W[k], b=c.W[k+1]; bx=hlLerp(a[0],b[0],s); by=hlLerp(a[1],b[1],s) }
    else if(t<ts){ const s=(t-tb)/(ts-tb), a=c.W[n-1]; const to=c.made?RIM:[RIM[0]+0.02,RIM[1]+0.06]; bx=hlLerp(a[0],to[0],s); by=hlLerp(a[1],to[1],s); z=Math.sin(s*Math.PI)*0.06 }
    else{ const s=(t-ts)/(1-ts); bx=c.made?RIM[0]:RIM[0]-s*0.08; by=c.made?RIM[1]:RIM[1]+0.06+s*0.1 }
    const att=ATT.map((p,i)=>{ let a=p[0],y=p[1]; const j=c.rec.indexOf(i); if(j>=0){ const w=c.W[j], nr=t<tb?Math.max(0,1-Math.abs(t/tb*(n-1)-j)):j===n-1?1:0; a=hlLerp(a,w[0],hlEase(Math.min(1,nr*1.4))); y=hlLerp(y,w[1],hlEase(Math.min(1,nr*1.4))) }
      if(i===c.rec[n-1]&&t>=tb){ a=c.W[n-1][0]; y=c.W[n-1][1] } return [a,y] });
    // man to man: each defender between his man and the rim, closer on the ball
    const def=att.map(([a,y])=>{ const d=Math.hypot(a-bx,y-by)<0.04?0.35:0.25; return [hlLerp(a,RIM[0],d),hlLerp(y,RIM[1],d)] });
    const r=Math.max(5,W/80), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    def.forEach(p=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)") });
    att.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)",i===c.rec[n-1]&&t>=tb-0.12?c.nm:"") });
    const [qx,qy]=P(W,H,c,bx,by); hlBall(x,qx,qy,r*0.62,z*W,null,{fill:"#E8702A",ring:"#2a1406"});
    const top=c.last?`Last shot: ${c.tm}`:`${c.m} \u00b7 ${c.tm}`;
    const end=t>=ts?(c.last?(c.made?(c.kind==="three"?`${c.nm} hits it! Game over`:`${c.nm} ties it!`):"No good!"):c.kind==="three"?`${c.nm} from three!`:`${c.nm}, and one!`):null;
    hlCaption(x,W,H,top,end,c.made?ink:null);
  }
  return {collapseIdle:true, aspect:0.54, clips, pitch, idle, frame};
})();
