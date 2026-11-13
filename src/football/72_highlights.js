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
  /* round 67: field goals (made and missed) and interceptions too, so a clip isn't always a touchdown (Ian) */
  // round 72: the header names the drive a clip shows (it named the drive before it until the clip was over)
  function clips(L,d,mode){ const out=clips0(L,d,mode), n=(L.drives||[]).indexOf(d);
    out.forEach(c=>{ c.hd=d.q>=5?"OT":"Q"+d.q+" \u00b7 drive "+(n>=0?n+1:(L.drives||[]).length); c.scores=d.kind==="TD"||d.kind==="FG" }); return out }
  function clips0(L,d,mode){
    const k=d.kind; if(d.q===5&&!d.pts&&k==="TD")return [];
    const close=Math.abs((d.h||0)-(d.a||0))<=8;
    if(k==="TD"){ if(mode==="goals"&&!(d.q>=4&&close))return []; return [mk(L,d)] }
    if(mode==="goals")return [];
    const all=mode==="all"||mode==="full";   // round 68: every kick and every pick
    if(k==="FG"||k==="MISS"&&(all||(d.stall||0)>=62))return [mkKick(L,d)];
    if(k==="INT")return [mkPick(L,d)];   // round 70: every turnover (Ian: "I didn't see any turnovers")
    if(k==="FUM")return [mkFum(L,d)];
    return [];
  }
  // round 67: numbers. The tracked man at each position wears his own (QB, RB, both WRs, a lineman; edge, tackle,
  // linebacker, corner, safety); the rest of the eleven take free numbers in their position's range. Key below.
  const OFF_SL={0:0,1:1,2:2,3:3,8:4}, DEF_SL={0:5,1:6,5:7,7:8,9:9};
  const FILL_O=[null,null,null,null,85,11,72,64,null,61,77], FILL_D=[null,null,97,94,52,null,45,null,24,null,31];
  function numbers(team,SL,fill){ const R=(SEA.roster&&SEA.roster[team])||[], nums=fill.slice(), list=[], used={};
    Object.keys(SL).forEach(k=>{ const i=SL[k]; if(R[i]){ const n=shirtNo(team,i); nums[k]=n; used[n]=1; list.push([n,String(R[i].n).split(" ").slice(-1)[0]]) } });
    nums.forEach((v,k)=>{ if(SL[k]===undefined&&v!=null){ let w=v; while(used[w])w++; nums[k]=w; used[w]=1 } }); return {nums,list} }
  function base(L,d){ const g=L.g, tm=d.home?g.home:g.away, opp=d.home?g.away:g.home, K=hlKits(g.home,g.away), O=numbers(tm,OFF_SL,FILL_O), D=numbers(opp,DEF_SL,FILL_D);
    return {offN:O.nums,defN:D.nums,legend:[{team:tm,kit:K[d.home?0:1],list:O.list},{team:opp,kit:K[d.home?1:0],list:D.list}],d,tm:d.home?g.home:g.away,opp:d.home?g.away:g.home,home:!!d.home,q:d.q,inks:hlKits(g.home,g.away).map(k=>k.fill),kits:hlKits(g.home,g.away),hm:g.home,aw:g.away,ot:d.q>=5} }
  function mkKick(L,d){ const r=mulberry32(((d.n||1)*7919+(d.stall||0)*131+(d.home?17:29))>>>0), los=Math.max(40,Math.min(97,d.stall||75));
    // the kick's own length, as the run of play gives it; some hook, some start wide and curl back (round 70: Ian)
    const good=d.kind==="FG", hook=r()<0.45, wide=r()<0.5?-1:1;
    return Object.assign(base(L,d),{kind:good?"fg":"miss",los,dist:typeof fgDistance==="function"?fgDistance(d.stall||los):Math.round(100-los+17),wide,hook,
      endY:good?0.5+wide*(0.005+r()*0.03):0.5+wide*(0.085+r()*0.05),startY:hook?(good?0.5+wide*0.09:0.5-wide*0.02):0.5,base:3400,reveal:0.82}) }
  function mkFum(L,d){ const r=mulberry32(((d.n||1)*7919+(d.stall||0)*131+(d.home?19:31))>>>0), los=Math.max(25,Math.min(90,d.stall||50)), len=Math.round(3+r()*8);
    const m=/recovered by (.*)$/.exec(rowText(L,d));
    return Object.assign(base(L,d),{kind:"fum",pass:false,los,rcv:1,len,catchY:Math.min(99,los+len),lane:0.38+r()*0.24,who:m?surname(m[1]):"",base:3200,reveal:0.66}) }
  function mkPick(L,d){ const r=mulberry32(((d.n||1)*7919+(d.stall||0)*131+(d.home?17:29))>>>0), los=Math.max(50,Math.min(90,d.stall||70));
    const rcv=r()<0.6?2:3, len=Math.round(8+r()*Math.min(25,100-los-2));
    const m=/intercepted by (.*)$/.exec(rowText(L,d));
    return Object.assign(base(L,d),{kind:"int",who:m?surname(m[1]):"",tight:true,pass:true,los,rcv,len,catchY:Math.min(99,los+len),lane:(rcv===2?0.18:0.82)+(r()-0.5)*0.1,base:3400,reveal:0.86}) }
  /* the run of play's line for this drive (driveScript draws its words in drive order from the game's seed, so the
     prefix up to this drive gives the same line the page shows): the clip plays what it says (round 70: Ian, "who
     scored it"; the clip had picked its own pass or run and length) */
  function rowText(L,d){ try{ const i=L.drives.indexOf(d); if(i<0||typeof driveScript!=="function")return ""; const sc=driveScript(L.g,L.drives.slice(0,i+1)); return (sc[sc.length-1]||{}).text||"" }catch(e){ return "" } }
  const surname=n=>String(n||"").split(" ").slice(-1)[0];
  function mk(L,d){
    const g=L.g, tm=d.home?g.home:g.away;
    const r=mulberry32(((d.n||1)*7919+(d.h||0)*131+(d.a||0)*37+(d.home?17:29))>>>0);
    let pass=r()<0.56, len=pass?Math.round(4+r()*45):Math.round(1+r()*30), rcv=pass?(r()<0.62?2:3):1, who="", qbRun=false;
    const T=rowText(L,d), off=(SEA.roster&&SEA.roster[tm])||[], mp=/^(.*?) (\d+)-yd TD pass to (.*)$/.exec(T), mr=/^(.*?) (\d+)-yd TD run$/.exec(T);
    if(mp){ pass=true; len=+mp[2]; who=mp[3]; rcv=off[3]&&off[3].n===who?3:2 }
    else if(mr){ pass=false; len=+mr[2]; who=mr[1]; qbRun=!!(off[0]&&off[0].n===who); rcv=1 }
    const los=100-len;
    // most balls are contested: the corner stays with the receiver; now and then he's beaten clean
    const tight=pass&&r()<0.7;
    const catchY=pass?Math.min(104,100+Math.round(r()*6)):104, lane=pass?(rcv===2?0.15:0.85)+(r()-0.5)*0.1:0.4+r()*0.2;
    const inks=hlKits(g.home,g.away).map(k=>k.fill);
    return Object.assign(base(L,d),{kind:"td",pass,len,los,rcv,catchY,lane,who:surname(who),qbRun,tight,base:3400,reveal:0.86});
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
  function idle(x,W,H){}   // round 67: nothing to say until something happens (Ian)
  /* the end zones in the two sides' colours with their names, as the drive chart has them */
  function endZones(x,W,H,c){
    [[-10,c.home?c.hm:c.aw],[100,c.home?c.aw:c.hm]].forEach(([y0,team])=>{ const a=P(W,H,c,y0,0), b=P(W,H,c,y0+10,1), l=Math.min(a[0],b[0]), w=Math.abs(b[0]-a[0]), tp=Math.min(a[1],b[1]), h=Math.abs(b[1]-a[1]);
      const k=c.kits[team===c.hm?0:1]; x.save(); x.globalAlpha=0.78; x.fillStyle=k.fill; x.fillRect(l,tp,w,h); x.globalAlpha=1;
      const nm=String(team).toUpperCase(), fs=Math.max(8,Math.min(w*0.62,h/Math.max(4,nm.length)*1.25)); x.translate(l+w/2,tp+h/2); x.rotate(l<W/2?-Math.PI/2:Math.PI/2);
      x.font=`800 ${fs}px 'Barlow Condensed',Impact,sans-serif`; x.textAlign="center"; x.textBaseline="middle"; x.fillStyle=k.num; x.globalAlpha=0.9; x.fillText(nm,0,1,h*0.92); x.restore() }) }
  function kickFrame(x,W,H,c,t){
    const snap=0.15, kick=0.3, tEnd=c.reveal, r=Math.max(4.5,W/100), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    const holder=[c.los-7,0.5], kicker=[c.los-9.5+Math.min(1,Math.max(0,(t-snap)/(kick-snap)))*2.3,0.47];
    let bx,by,z=0;
    if(t<snap){ const s=t/snap; bx=c.los; by=0.5 } else if(t<kick){ bx=holder[0]; by=holder[1] }
    else { const s=Math.min(1.05,(t-kick)/(tEnd-kick)), sy=c.startY!=null?c.startY:0.5, ey=c.endY!=null?c.endY:(c.kind==="fg"?0.5+c.wide*0.012:0.5+c.wide*0.075);
      // a hook: the line it starts on, bending late to where it ends
      bx=hlLerp(holder[0],111,s); const k=Math.min(1,s), path=c.hook?hlLerp(hlLerp(0.5,sy,Math.min(1,k*1.6)),ey,Math.pow(k,2.4)):hlLerp(0.5,ey,k); by=path; z=Math.max(0,Math.sin(Math.min(1,s)*Math.PI*0.95))*0.06 }   // low again by the posts, so where it crosses reads plainly
    if(t>=snap&&t<kick){ const s=(t-snap)/(kick-snap); if(s<0.4){ bx=hlLerp(c.los,holder[0],s/0.4) } }
    const line=[0.38,0.42,0.46,0.5,0.54,0.58,0.62,0.34,0.66];
    line.forEach((y,i)=>{ const [px,py]=P(W,H,c,c.los-1.2,y); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)") });
    [holder,kicker].forEach(p=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)") });
    line.concat([0.3,0.7]).forEach((y,i)=>{ const rush=t>snap?Math.min(1,(t-snap)/0.25)*2.5:0; const [px,py]=P(W,H,c,c.los+1.8-rush*0.6,y+(y-0.5)*-0.1*rush/2.5); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)") });
    // the uprights, drawn over everything so the ball is plainly inside them or not
    { const a=P(W,H,c,110,0.45), b=P(W,H,c,110,0.55), a0=P(W,H,c,96,0.45), b0=P(W,H,c,96,0.55); x.save();
      // the window between the uprights, marked back up the field so the ball's line through it (or not) is plain
      x.strokeStyle="rgba(242,210,75,.45)"; x.lineWidth=Math.max(1,W/520); x.setLineDash([4,4]); x.beginPath(); x.moveTo(a0[0],a0[1]); x.lineTo(a[0],a[1]); x.moveTo(b0[0],b0[1]); x.lineTo(b[0],b[1]); x.stroke(); x.setLineDash([]);
      x.strokeStyle="#F2D24B"; x.lineWidth=Math.max(3,W/180); x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke();
      [a,b].forEach(q=>{ x.beginPath(); x.arc(q[0],q[1],Math.max(3.5,W/150),0,Math.PI*2); x.fillStyle="#F2D24B"; x.fill() }); x.restore() }
    const [qx,qy]=P(W,H,c,bx,by); hlBall(x,qx,qy,r*0.55,z*W,null,{kind:"oval",fill:"#8A5428",ring:"#2a1406",rot:t>kick?(t*40)%6.3:0});
    // the view from behind the kicker as it reaches the posts: an H, and the ball going through it or past it
    if(t>kick+(tEnd-kick)*0.35){ const u=Math.min(1,(t-kick)/(tEnd-kick)), bw=Math.min(W*0.3,170), bh=bw*0.72, X0=P(W,H,c,110,0.5)[0]>W/2?W*0.035:W*0.965-bw, Y0=H*0.13;   // at the end away from the posts, clear of the line
      x.save(); x.globalAlpha=Math.min(1,(u-0.35)/0.15); x.fillStyle="rgba(10,16,24,.94)"; x.strokeStyle="rgba(255,255,255,.3)"; x.lineWidth=1;
      x.beginPath(); x.rect(X0,Y0,bw,bh); x.fill(); x.stroke();
      const cx=X0+bw/2, gy=Y0+bh*0.88, cb=Y0+bh*0.6, half=bw*0.17, sc=half/0.05;
      x.strokeStyle="#F2D24B"; x.lineWidth=3; x.beginPath(); x.moveTo(cx,gy); x.lineTo(cx,cb); x.moveTo(cx-half,cb); x.lineTo(cx+half,cb); x.moveTo(cx-half,cb); x.lineTo(cx-half,Y0+bh*0.08); x.moveTo(cx+half,cb); x.lineTo(cx+half,Y0+bh*0.08); x.stroke();
      const side=(by-0.5)*(c.home?-1:1), bxI=cx-side*sc, far=Math.pow(u,1.3), byI=hlLerp(gy+bh*0.05,cb-bh*(c.kind==="fg"?0.22:0.18),Math.min(1,u*1.15)), br=hlLerp(bw*0.07,bw*0.022,far);
      x.beginPath(); x.ellipse(Math.max(X0+br,Math.min(X0+bw-br,bxI)),byI,br,br*0.7,0,0,Math.PI*2); x.fillStyle="#8A5428"; x.fill(); x.strokeStyle="#2a1406"; x.lineWidth=1; x.stroke(); x.restore() }
    const top=`${c.ot?"Overtime":"Q"+c.q} \u00b7 ${c.dist}-yard field goal try`;
    const end=t>=tEnd?(c.kind==="fg"?"IT'S GOOD!":"NO GOOD! Wide "+(c.wide*(c.home?-1:1)>0?"left":"right")):null;
    hlCaption(x,W,H,top,end,c.kind==="fg"?ink:null);
  }
  function frame(x,W,H,c,t){
    endZones(x,W,H,c);
    if(c.kind==="fg"||c.kind==="miss")return kickFrame(x,W,H,c,t);
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
      if(t>snap){ if(i===0)return c.qbRun?carrierAt(runS):qb; if(c.pass&&i===c.rcv){ const q=carrierAt(runS); return q }
        if(!c.pass&&i===1){ return c.qbRun?[c.los-6,0.5+0.1]:carrierAt(runS) }
        if(c.kind==="fum"&&i===1&&t>c.reveal-0.12){ return carrierAt(Math.min(1,(c.reveal-0.12-snap)/(tEnd-snap))) }
        if(i>=6){ yd+=runS*1.5 } else if(i>=2){ yd+=runS*Math.min(18,c.len*0.7); y=hlLerp(y,0.5,runS*0.2) } }
      return [yd,y] });
    const def=DEF.map((p,i)=>{ let yd=c.los+p[0], y=p[1]; if(t>snap){ const k=i<4?0.15:0.45*runS; yd=hlLerp(yd,bx,k*0.6); y=hlLerp(y,by,k) } return [yd,y] });
    // a contested ball: the corner on the receiver's hip the whole way (round 70: Ian, too many blown coverages)
    if(c.pass&&c.tight&&t>snap&&c.kind!=="int"){ const j=c.rcv===2?7:8, q=carrierAt(runS), lag=0.9+0.6*Math.sin(runS*5); def[j]=[q[0]-lag,q[1]+(c.rcv===2?0.035:-0.035)] }
    // a fumble: the carrier is hit, the ball comes loose, a defender falls on it
    if(c.kind==="fum"&&t>c.reveal-0.12){ const hit=carrierAt(Math.min(1,(c.reveal-0.12-snap)/(tEnd-snap))), u=Math.min(1,(t-c.reveal+0.12)/0.3), j=c.rcv===2?5:6;
      bx=hit[0]+hlEase(u)*4.5; by=hit[1]+hlEase(u)*(hit[1]<0.5?0.07:-0.07)+Math.sin(u*9)*0.012; z=Math.abs(Math.sin(u*Math.PI*3))*0.012*(1-u); def[j]=[hlLerp(def[j][0],bx,Math.min(1,u*1.4)),hlLerp(def[j][1],by,Math.min(1,u*1.4))] }
    // a pick: the nearest defensive back jumps the route and takes it the other way
    if(c.kind==="int"&&t>throwT){ const tg=carrierAt(Math.min(1,runS+0.05)), j=c.rcv===2?7:8, s=Math.min(1,(t-throwT)/(tEnd-throwT));
      def[j]=[hlLerp(def[j][0],tg[0]+0.8,hlEase(s)),hlLerp(def[j][1],tg[1],hlEase(s))]; if(t>tEnd){ const u=(t-tEnd)/(1-tEnd); def[j]=[tg[0]+0.8-u*12,tg[1]]; bx=def[j][0]; by=def[j][1]; z=0 } }
    const r=Math.max(4.5,W/100), ink=c.inks[c.home?0:1], dink=c.inks[c.home?1:0];
    const tag=i=>t>snap&&((c.pass&&i===c.rcv)||(!c.pass&&i===1)||(c.pass&&i===0&&t<throwT))?["QB","RB","WR","WR"][i]:"";
    def.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,dink,"rgba(0,0,0,.6)","",c.defN?{num:c.defN[i]}:null) });
    off.forEach((p,i)=>{ const [px,py]=P(W,H,c,p[0],p[1]); hlDot(x,px,py,r,ink,"rgba(0,0,0,.6)",tag(i),c.offN?{num:c.offN[i]}:null) });
    const [qx,qy]=P(W,H,c,bx,by); hlBall(x,qx,qy,r*0.55,z*W,null,{kind:"oval",fill:"#8A5428",ring:"#2a1406"});
    const top=`${c.ot?"Overtime":"Q"+c.q} \u00b7 ${c.tm} ball`;   // round 67: no "12 yards out" before it's done
    const te=c.kind==="fum"?c.reveal:tEnd;
    const end=t>=te?(c.kind==="int"?`INTERCEPTED!${c.who?" "+c.who:""}`:c.kind==="fum"?`FUMBLE!${c.who?" Recovered by "+c.who:""}`:`TOUCHDOWN! ${c.who?c.who+", ":""}${c.len}-yard ${c.pass?"pass":"run"}`):null;
    hlCaption(x,W,H,top,end,c.kind==="int"||c.kind==="fum"?dink:ink);
  }
  const headClock=c=>c&&c.hd||null;
  return {replaces:".field", collapseIdle:true, aspect:0.46, clips, pitch, idle, frame, headClock, goalsLabel:"Late touchdowns"};
})();
