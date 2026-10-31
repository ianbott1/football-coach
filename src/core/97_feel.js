/* ============ feel: sound, touch, motion ============ */
/* Everything here is a flourish on top of the game: nothing in it changes a
   result, and every part of it fails quietly where it isn't available (no
   audio, no vibration, reduced motion, the test harness).
   Sound is made on the spot with Web Audio (no files): a crowd's roar when
   you score, a groan when they do, the sport's whistle, horn or buzzer at the
   start and the end, a short fanfare for a win. S.sound turns it off. */

let AC=null;
function soundOn(){ return !S||S.sound!==false }
function audio(){
  if(!soundOn())return null;
  try{ if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(!C)return null; AC=new C() }
    if(AC.state==="suspended"&&AC.resume)AC.resume(); return AC }catch(e){ return null }
}
function noiseBuf(ac,secs){
  const n=Math.floor(ac.sampleRate*secs), b=ac.createBuffer(1,n,ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=Math.random()*2-1; return b;
}
/* a shaped burst of filtered noise: a crowd */
function crowd(ac,{f=900,q=0.7,peak=0.22,up=0.12,down=1.4,type="bandpass"}){
  const t=ac.currentTime, s=ac.createBufferSource(), fl=ac.createBiquadFilter(), g=ac.createGain();
  s.buffer=noiseBuf(ac,up+down+0.1); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+up); g.gain.exponentialRampToValueAtTime(0.0001,t+up+down);
  s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t); s.stop(t+up+down+0.1);
}
function tone(ac,{f=440,type="sine",at=0,dur=0.2,peak=0.12,glide=null,vib=0}){
  const t=ac.currentTime+at, o=ac.createOscillator(), g=ac.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);
  if(vib){ const l=ac.createOscillator(), lg=ac.createGain(); l.frequency.value=vib; lg.gain.value=f*0.04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur) }
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+dur+0.02);
}
/* the sport's own sound for the start and the end */
function signal(ac){
  const k=(typeof SPORT!=="undefined"&&SPORT.id)||"";
  if(k==="soccer"){ tone(ac,{f:2900,type:"sine",dur:0.16,peak:0.07,vib:38}); tone(ac,{f:2900,type:"sine",at:0.22,dur:0.5,peak:0.07,vib:38}) }
  else if(k==="hockey"){ tone(ac,{f:196,type:"sawtooth",dur:1.1,peak:0.06}); tone(ac,{f:247,type:"sawtooth",dur:1.1,peak:0.05}) }
  else if(k==="basketball"){ tone(ac,{f:330,type:"square",dur:0.7,peak:0.05}) }
  else { tone(ac,{f:2600,type:"sine",dur:0.35,peak:0.06,vib:30}) }   // football: the referee's whistle
}
function sfx(kind){
  const ac=audio(); if(!ac)return;
  try{
    if(kind==="score"){ crowd(ac,{f:1000,peak:0.24,up:0.1,down:1.6}); crowd(ac,{f:2400,q:1.2,peak:0.06,up:0.08,down:0.9}) }
    else if(kind==="against"){ crowd(ac,{f:380,type:"lowpass",peak:0.13,up:0.18,down:0.8}) }
    else if(kind==="start"||kind==="end")signal(ac);
    else if(kind==="win"){ [523,659,784,1047].forEach((f,i)=>tone(ac,{f:f,type:"triangle",at:0.35+i*0.11,dur:i===3?0.5:0.16,peak:0.1})) }
    else if(kind==="draw"){ [523,523].forEach((f,i)=>tone(ac,{f:f,type:"triangle",at:0.35+i*0.16,dur:0.18,peak:0.08})) }
    else if(kind==="loss"){ tone(ac,{f:330,type:"triangle",at:0.35,dur:0.25,peak:0.08}); tone(ac,{f:247,type:"triangle",at:0.62,dur:0.45,peak:0.08}) }
    else if(kind==="tap"){ tone(ac,{f:1200,type:"sine",dur:0.04,peak:0.03}) }
    else if(kind==="title"){ crowd(ac,{f:1100,peak:0.22,up:0.2,down:2.6}); [523,659,784,1047,1319].forEach((f,i)=>tone(ac,{f:f,type:"triangle",at:0.2+i*0.13,dur:i===4?0.9:0.2,peak:0.1})) }
  }catch(e){}
}
function buzz(pattern){ try{ if(soundOn()&&navigator.vibrate&&!prefersReduced())navigator.vibrate(pattern) }catch(e){} }

/* ---- live games: what changed since the last spell ---- */
/* returns "mine", "theirs" or null: whose score just went up */
function scoreChange(L,prevH,prevA){
  const mineHome=L.g.home===S.myTeam, dh=L.eng.h-prevH, da=L.eng.a-prevA;
  if(!dh&&!da)return null;
  // basketball scores every stretch: only a run counts
  if(typeof SPORT!=="undefined"&&SPORT.id==="basketball"){
    const d=L.drives[L.drives.length-1]; if(!d||typeof d.seg!=="number"||Math.abs(d.h-d.a)<8)return null;
    return (d.h>d.a)===mineHome?"mine":"theirs" }
  const mine=mineHome?dh:da, theirs=mineHome?da:dh;
  return mine>0&&mine>=theirs?"mine":theirs>0?"theirs":null;
}
function feelSpell(L,prevH,prevA){
  const who=scoreChange(L,prevH,prevA); if(!who)return;
  showFlash(L,who);
  if(who==="mine"){ sfx("score"); buzz([40,60,90]) } else sfx("against");
}
function feelFinal(L){
  const mine=L.g.home===S.myTeam?L.eng.h:L.eng.a, theirs=L.g.home===S.myTeam?L.eng.a:L.eng.h;
  let won=mine>theirs; if(L.eng.pens)won=((L.eng.pens==="home")===(L.g.home===S.myTeam));
  sfx("end");
  if(mine===theirs&&!L.eng.pens)sfx("draw"); else if(won){ sfx("win"); buzz([60,40,60,40,140]) } else sfx("loss");
}
/* the flash over the screen when someone scores: your colours for you.
   It lives on the page, not in the game view, so redrawing doesn't restart it. */
function showFlash(L,who){
  if(prefersReduced())return;
  try{
    const mine=who==="mine", tm=mine?S.myTeam:(L.g.home===S.myTeam?L.g.away:L.g.home);
    const word=(typeof SPORT!=="undefined"&&SPORT.scoreWord)||"SCORE";
    const d=document.createElement("div"); if(!d||!document.body||!document.body.appendChild)return;
    d.className="goalflash "+(mine?"mine":"theirs"); d.style.setProperty("--fc",teamInk(tm));
    d.innerHTML=`<span>${mine?esc(word)+"!":esc(tm)}</span>`;
    document.body.appendChild(d); setTimeout(()=>{try{d.remove()}catch(e){}},1500);
  }catch(e){}
}

/* ---- confetti: a title, a promotion ---- */
function confetti(colors){
  if(prefersReduced())return;
  try{
    const c=document.createElement("canvas"); if(!c||!c.getContext)return;
    const W=window.innerWidth, H=window.innerHeight, x=c.getContext("2d"); if(!x)return;
    c.width=W; c.height=H; c.className="confetti"; document.body.appendChild(c);
    const P=Array.from({length:170},()=>({x:Math.random()*W, y:-20-Math.random()*H*0.5, vx:(Math.random()-0.5)*2.4, vy:2+Math.random()*3.2,
      r:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3, w:6+Math.random()*6, h:3+Math.random()*4, c:colors[Math.floor(Math.random()*colors.length)]}));
    const t0=Date.now();
    const step=()=>{ const t=Date.now()-t0; x.clearRect(0,0,W,H);
      P.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.r+=p.vr; x.save(); x.translate(p.x,p.y); x.rotate(p.r);
        x.globalAlpha=Math.max(0,1-Math.max(0,t-2600)/900); x.fillStyle=p.c; x.fillRect(-p.w/2,-p.h/2,p.w,p.h); x.restore() });
      if(t<3500)requestAnimationFrame(step); else c.remove() };
    requestAnimationFrame(step);
  }catch(e){}
}
/* once per season, when it ends in a title or a promotion */
const celebrated={};                 // this session: a reload may celebrate again, which is fine
function celebrateIfDue(){
  if(!SEA||!S.myTeam)return;
  // a trophy won mid-season (soccer's FA Cup): the moment it's won
  const tn=LEAGUE.trophyNow&&LEAGUE.trophyNow(SEA,S.myTeam);
  if(tn){ const k2=SEA.year+":"+tn.key+":"+S.myTeam; if(!celebrated[k2]){ celebrated[k2]=true;
    sfx("title"); buzz([80,50,80,50,200]); confetti([teamInk(S.myTeam),teamColor(S.myTeam),"#C9A227","#E9E5DA"]) } }
  if(SEA.phase!=="done")return;
  const k=SEA.year+":"+S.myTeam; if(celebrated[k])return;
  const res=SEA.seasonResult(S.myTeam)||"";
  const big=SEA.champion===S.myTeam||/CHAMPIONS|[Pp]romoted/.test(res);
  celebrated[k]=true; if(!big)return;
  sfx("title"); buzz([80,50,80,50,200]);
  confetti([teamInk(S.myTeam),teamColor(S.myTeam),"#F4A63A","#E9E5DA"]);
}
