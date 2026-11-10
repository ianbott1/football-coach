/* Highlights (round 51): the game's big moments drawn on a pitch, as Football Manager's 2D match does, while you watch.
   Nothing here decides anything. The engine has already played the stretch: a goal at 23', a save at 27'; a sport's
   choreographer (HL_SPORT, e.g. soccer 72_highlights) turns each event into a few seconds of movement that ends the
   way the event did. Shown in the live view's #hlpitch, one clip after another; the next stretch waits for them.
   Tap the pitch to skip. Off, goals only, or goals and big chances, in the ? panel (S.highlights). Without a canvas
   (tests, a reduced-motion setting) nothing plays and nothing waits. */
const HL={cv:null, x:null, clips:[], cur:null, t0:0, raf:0, done:null, idle:null};
function hlMode(){ return (S&&S.highlights)||"key" }
function hlCan(){
  if(typeof HL_SPORT==="undefined"||!HL_SPORT)return false;
  if(typeof requestAnimationFrame!=="function"||typeof document==="undefined"||!document.createElement)return false;
  if(typeof prefersReduced==="function"&&prefersReduced())return false;
  return true }
/* the pitch box in the live view: a place for the canvas, which moves in after each redraw (the redraw replaces the
   page; the canvas, and a clip half played, carry on) */
function hlBox(){ if(!hlCan()||hlMode()==="off")return ""; return `<div id="hlpitch" class="hlpitch" aria-label="Highlights"></div>` }
function hlMount(){
  if(!hlCan())return; const box=document.getElementById&&document.getElementById("hlpitch"); if(!box)return;
  if(!HL.cv){ const c=document.createElement("canvas"); if(!c||!c.getContext)return; HL.cv=c; HL.x=c.getContext("2d"); if(!HL.x){ HL.cv=null; return }
    c.className="hlcv"; c.onclick=()=>hlSkip(); }
  if(HL.cv.parentNode!==box){ try{ box.appendChild(HL.cv) }catch(e){ return } }
  // a sport with its own field on the live screen (football's, basketball's flow) shows the pitch only while a clip plays
  if(HL_SPORT.collapseIdle){ box.style.display=HL.cur?"":"none"; if(!HL.cur)return }
  const W=Math.max(240,Math.round(box.clientWidth||320)), H=Math.round(W*HL_SPORT.aspect), dpr=Math.min(2,window.devicePixelRatio||1);
  if(HL.cv.width!==W*dpr){ HL.cv.width=W*dpr; HL.cv.height=H*dpr; HL.cv.style.width=W+"px"; HL.cv.style.height=H+"px" }
  if(!HL.cur)hlDraw(null,0);
}
/* this stretch's clips; returns how long they take (ms), for the next stretch to wait */
function hlPlay(L,drive){
  if(!hlCan()||hlMode()==="off"||!L||L.ff||L.ask||!drive)return 0;
  const box=document.getElementById&&document.getElementById("hlpitch"); if(!box)return 0;
  let clips=[]; try{ clips=HL_SPORT.clips(L,drive,hlMode())||[] }catch(e){ clips=[] }
  if(!clips.length)return 0;
  box.style.display=""; HL.cur={dur:1}; hlMount();
  const k=Math.sqrt(1/Math.max(0.2,speedMult()));   // slower watching, longer clips; never longer than half again
  clips.forEach(c=>{ c.dur=Math.round(c.base*Math.min(1.6,k)) });
  HL.clips=clips.slice(1); hlStart(clips[0]);
  return clips.reduce((t,c)=>t+c.dur+250,0);
}
function hlStart(c){ HL.cur=c; HL.t0=Date.now(); cancelAnimationFrame(HL.raf); HL.raf=requestAnimationFrame(hlFrame) }
function hlFrame(){
  const c=HL.cur; if(!c)return; const t=Math.min(1,(Date.now()-HL.t0)/c.dur);
  hlDraw(c,t);
  if(t<1){ HL.raf=requestAnimationFrame(hlFrame); return }
  // a beat on the last frame, then the next clip
  setTimeout(()=>{ if(HL.cur!==c)return; const n=HL.clips.shift(); if(n)hlStart(n); else { HL.cur=null; hlDraw(null,0); hlMount() } },250);
}
function hlSkip(){
  if(!HL.cur)return; HL.cur=null; HL.clips=[]; cancelAnimationFrame(HL.raf); hlDraw(null,0); hlMount();
  // the next stretch was waiting for the clips: it comes now
  if(typeof live!=="undefined"&&live&&!live.done&&!live.paused&&!live.ask&&live.timer){ clearTimeout(live.timer); live.timer=setTimeout(liveTick,Math.min(400,liveGap())) }
}
function hlDraw(c,t){
  const cv=HL.cv, x=HL.x; if(!cv||!x)return; const dpr=cv.width/(parseFloat(cv.style.width)||cv.width);
  x.setTransform(dpr,0,0,dpr,0,0); const W=cv.width/dpr, H=cv.height/dpr;
  try{ HL_SPORT.pitch(x,W,H); if(c)HL_SPORT.frame(x,W,H,c,t); else HL_SPORT.idle(x,W,H) }catch(e){}
}
/* shared drawing */
function hlDot(x,px,py,r,fill,ring,label){
  x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fillStyle=fill; x.fill(); x.lineWidth=1.4; x.strokeStyle=ring; x.stroke();
  if(label){ x.font=`600 ${Math.round(r*2.1)}px var(--mono),monospace`; x.textAlign="center"; x.textBaseline="bottom";
    x.lineWidth=3; x.strokeStyle="rgba(0,0,0,.65)"; x.strokeText(label,px,py-r-2); x.fillStyle="#fff"; x.fillText(label,px,py-r-2) } }
function hlCaption(x,W,H,top,bottom,ink){
  x.textAlign="left"; x.textBaseline="top";
  if(top){ x.font=`600 ${Math.max(10,Math.round(W/34))}px var(--mono),monospace`; x.fillStyle="rgba(0,0,0,.55)"; x.fillRect(0,0,W,Math.round(W/34)+10);
    let tt=top; while(tt.length>8&&x.measureText(tt).width>W-16)tt=tt.slice(0,-2);   // the commentary line, cut to the pitch's width
    if(tt!==top)tt=tt.replace(/\s*\S*$/,"")+"\u2026";
    x.fillStyle="#fff"; x.fillText(tt,8,5) }
  if(bottom){ const fs=Math.max(15,Math.round(W/16)), cy=H*0.84; x.fillStyle="rgba(0,0,0,.6)"; x.fillRect(0,cy-fs*0.8,W,fs*1.6);
    if(ink){ x.fillStyle=ink; x.fillRect(0,cy-fs*0.8,6,fs*1.6); x.fillRect(W-6,cy-fs*0.8,6,fs*1.6) }
    x.font=`700 ${fs}px var(--cond),sans-serif`; x.textAlign="center"; x.textBaseline="middle";
    x.lineWidth=4; x.strokeStyle="rgba(0,0,0,.7)"; x.strokeText(bottom,W/2,cy); x.fillStyle="#fff"; x.fillText(bottom,W/2,cy) } }
const hlEase=t=>t<0?0:t>1?1:t*t*(3-2*t);
const hlLerp=(a,b,t)=>a+(b-a)*t;
/* colours not close to any of these (the keepers', away from both sides') */
function hlRGB(s){ const m=/^#?([0-9a-f]{6})$/i.exec(String(s||"")); if(!m)return [200,200,200]; const n=parseInt(m[1],16); return [n>>16,(n>>8)&255,n&255] }
function hlFar(cands,avoid){ const d=(a,b)=>{ const A=hlRGB(a),B=hlRGB(b); return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]) };
  return cands.slice().sort((a,b)=>Math.min(...avoid.map(v=>d(b,v)))-Math.min(...avoid.map(v=>d(a,v)))) }
/* two team colours that can be told apart on grass: the away side goes white when they're close */
function hlInks(home,away){
  const hx=s=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(s||"")); if(!m)return [200,200,200]; const n=parseInt(m[1],16); return [n>>16,(n>>8)&255,n&255] };
  const a=teamInk(home), b=teamInk(away), A=hx(a), B=hx(b), d=Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);
  const green=c=>c[1]>c[0]+30&&c[1]>c[2]+20;
  return [green(A)?"#F4F1E8":a, d<90||green(B)?(green(A)?"#1A1D26":"#F4F1E8"):b];
}
