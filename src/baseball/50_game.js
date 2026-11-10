/* ============ the game: baseball ============ */
/* A game is nine innings (more if level), played plate appearance by plate appearance: each one a strikeout, a walk,
   a hit of some kind or an out, from the hitters' and the pitcher's strength. The live view moves an inning at a time;
   your calls come between at-bats.
   - The starters: each side's starting pitcher tires (a little worse each batter past his eighteenth) and goes to the
     bullpen when he's spent or hit hard; the closer gets the ninth with a lead of one to three.
   - Their hitters' approach (pull, patient, contact), and your pitching plan against it: the read, as in the other
     games. The right plan takes something off their bats; the wrong one gives a little.
   - Your calls: the scouting report, the read after the third, pulling your starter when he's tiring in a close
     game, a pinch hitter late with men in scoring position, and sending the runner late in a one-run game.
   Calibrated (test/bs-calibrate.js) against MLB 2023-25: about 4.4 runs a side, home sides winning 53%, a game in
   four or five decided by a run, extras about one game in twelve. */
const SEGS=9;
const BS={
  // a plate appearance between average sides: strikeout, walk, hit by pitch, single, double, triple, home run (the rest an out in play)
  k:0.224, bb:0.080, hbp:0.011, s1:0.136, s2:0.043, s3:0.004, hr:0.029,
  edge:+((typeof process!=="undefined"&&process.env&&process.env.BS_E)||0.00031),   // per Elo point of gap: the log-odds a hit or walk shifts
  dp:0.12,            // an out in play with a man on first and fewer than two out: a double play this often
  sf:0.32,            // with a man on third and fewer than two out: a fly ball deep enough this often
  adv2:0.6,           // a single scores the runner from second this often; a double the runner from first
  tired:0.06,         // the starter, each batter past his eighteenth: this much worse
  stamina:[22,30],    // batters a starter faces before he's done, between these
  pen:-0.02,          // the bullpen against the side's own starter (a shade worse, the closer apart)
  closer:0.05,        // the closer, the ninth with a lead of one to three
  form:0.12,          // tonight's spread of a starter's form
  read:{right:-0.12, wrong:0.04},   // their hitters against your pitching plan
  steal:0.74, stealTry:0.035,       // a steal of second succeeds this often; the computer tries this often a chance
  pinch:0.1,          // a pinch hitter off the bench against a weak bat: this much better
  hfa:0.0             // home edge comes in the Elo
};
const APPROACH={
  pull:   {l:"Pull hitters, sitting on the fastball", counter:"away"},
  patient:{l:"Patient: working counts, taking walks", counter:"zone"},
  contact:{l:"Contact: putting everything in play", counter:"spin"}
};
const APPROACH_KEYS=["pull","patient","contact"];
const ANSWERS={
  away:{beats:"pull",   l:"Pitch them away: soft stuff on the outer edge", d:"Live on the outside corner and make them go the other way"},
  zone:{beats:"patient",l:"Attack the zone: strike one, every hitter",     d:"Get ahead early; no free passes to hitters who wait"},
  spin:{beats:"contact",l:"Change speeds: spin and offspeed",              d:"Breaking balls and changeups to miss barrels and get weak contact"}
};
const BS_TELL={pull:[0.62,3.7,0.18],patient:[0.45,4.3,0.21],contact:[0.44,3.6,0.15]};   // pulled share of balls in play, pitches an at-bat, strikeout rate
function bsRead(T){ if(!T||!T.n)return null; const pl=T.bip?T.pull/T.bip:0, pp=T.pa?T.pit/T.pa:0, kr=T.pa?T.k/T.pa:0;
  const sc={pull:(pl-0.5)*8, patient:(pp-3.9)*4, contact:(0.19-kr)*30}; return APPROACH_KEYS.reduce((a,k)=>sc[k]>sc[a]?k:a,"pull") }
const ASSIST=["normal","Leave it to your assistant"];
function scoutReport(fav,seed){
  const r=mulberry32(seed>>>0), rep={pull:0,patient:0,contact:0};
  for(let i=0;i<6;i++){ rep[r()<0.55?fav:APPROACH_KEYS[Math.floor(r()*3)]]++ } return rep }
function prepCall(rep){
  return {k:"prep",h:"Before the first pitch: the scouting report",q:"Their last six games, by how their hitters went at it. Set the plan, or wait and see?",
    opts:Object.keys(ANSWERS).map(a=>[a,ANSWERS[a].l]).concat([["normal","Wait and see: leave it to your assistant"]]),report:Object.assign({},rep)};
}
function readCall(T,cur){
  return {k:"read",h:"After three innings",q:"How are their hitters going at it? Pick the plan.",
    opts:(cur&&ANSWERS[cur]?[["keep","Keep your plan: "+ANSWERS[cur].l]]:[]).concat(Object.keys(ANSWERS).filter(a=>a!==cur).map(a=>[a,ANSWERS[a].l])).concat([ASSIST]),
    tell:Object.assign({},T), best:bsRead(T)};
}
function pullCall(inn,lead,P,on){
  return {k:"pull",h:`${ordw(inn)} inning, ${lead>0?"up "+lead:lead<0?"down "+(-lead):"tied"}`,
    q:`${P.n||"Your starter"} has faced ${P.bf} batters${P.ra?` and given up ${nOf(P.ra,"run")}`:""}.${on?" "+on:""} Go to the bullpen?`,
    opts:[["pen","Go to the bullpen"],["stay","Leave him in"],ASSIST], bf:P.bf, ra:P.ra};
}
function pinchCall(inn,lead,who,bench,on){
  return {k:"pinch",h:`${ordw(inn)} inning, ${lead>0?"up "+lead:lead<0?"down "+(-lead):"tied"}`,
    q:`${on}. ${who||"Your number nine"} is up. Pinch-hit${bench?" with "+bench:""}?`,
    opts:[["pinch",`Pinch-hit${bench?": "+bench.split(" ").slice(-1)[0]:""}`],["let","Let him hit"],ASSIST]};
}
function stealCall(inn,lead,runner,outs){
  return {k:"steal",h:`${ordw(inn)} inning, ${lead>0?"up "+lead:lead<0?"down "+(-lead):"tied"}`,
    q:`${runner||"Your runner"} on first, ${outs===0?"nobody":"one"} out. Send him?`,
    opts:[["send","Send him"],["hold","Hold him"],ASSIST]};
}
function ordw(n){ return ["","1st","2nd","3rd","4th","5th","6th","7th","8th","9th"][n]||n+"th" }

function makeLiveGame(rng, eloH, eloA, planH, planA, humans, playoff, ctx){
  ctx=ctx||{}; const fav=ctx.fav||{};
  if(typeof humans!=="object"||humans===null)humans={home:!!humans, away:!humans};
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const other=s=>s==="home"?"away":"home";
  const SPc=(ctx.sp)||{};
  const side0=sd=>({app:null, ans:null, prepd:false, sp:{n:(SPc[sd]&&SPc[sd].n)||null, q:(SPc[sd]&&SPc[sd].q)||0, form:rng.gauss(0,BS.form), bf:0, ra:0,
      stam:BS.stamina[0]+rng.int(BS.stamina[1]-BS.stamina[0]+1)}, pen:false, closer:false, bat:0,
    tell:{pull:0,bip:0,pit:0,pa:0,k:0,n:0}});
  const st={h:0,a:0,drives:[],seg:0,humans:humans,lines:{h:blankTeamLine(),a:blankTeamLine()},
    mode:{home:planH,away:planA}, late:{}, asked:{}, queue:[], ask:null, ot:0, done:false, playoff:!!playoff, S:{home:side0("home"),away:side0("away")}};
  st.gap=gap;
  const pickApp=side=>{ if(fav[side]&&rng.r()<0.6)return fav[side]; return APPROACH_KEYS[rng.int(3)] };
  st.S.home.app=pickApp("home"); st.S.away.app=pickApp("away");
  const lead=side=>side==="home"?st.h-st.a:st.a-st.h;
  const queueCall=(side,dp)=>{ const key=dp.k+(dp.h||"")+side; if(!humans[side]||st.asked[key])return false;
    st.asked[key]=true; st.queue.push({side:side,dp:dp}); return true };
  const readIt=(side,p)=>{ if(rng.r()<p){ st.S[side].ans=APPROACH[st.S[other(side)].app].counter; st.S[side].prepd=false } };
  // the pitcher's edge for the side in the field: starter (form, fatigue, his place in the rotation) or the bullpen
  const pitEdge=fs=>{ const X=st.S[fs]; if(X.closer)return BS.closer; if(X.pen)return BS.pen;
    const P=X.sp; return P.q+P.form-Math.max(0,P.bf-18)*BS.tired };
  // the plan's effect on their bats: right read, wrong read
  const readEdge=(bat,fs)=>{ const A=st.S[bat].app, X=st.S[fs]; if(!X.ans)return 0; return ANSWERS[X.ans].beats===A?BS.read.right:(APPROACH[A].counter===X.ans?0:BS.read.wrong) };
  const modeMul=sd=>{ const m=st.mode[sd]; return m==="aggressive"?{hr:1.25,k:1.12,s1:0.94,bb:1}:m==="safe"?{hr:0.82,k:0.88,s1:1.06,bb:1.04}:{hr:1,k:1,s1:1,bb:1} };
  /* one plate appearance: the batting side (bat), the side in the field (fs) */
  function pa(bat,fs,extra){
    const e=(bat==="home"?gap:-gap)*BS.edge*100/100, pe=pitEdge(fs), re=readEdge(bat,fs), M=modeMul(bat);
    const x=e-pe+re+(extra||0), up=Math.exp(x*2.2), dn=Math.exp(-x*1.6);
    const p={k:BS.k*dn*M.k, bb:BS.bb*up*M.bb, hbp:BS.hbp, s1:BS.s1*up*M.s1, s2:BS.s2*up, s3:BS.s3, hr:BS.hr*up*M.hr};
    let u=rng.r(), o="out"; for(const k of ["k","bb","hbp","s1","s2","s3","hr"]){ if(u<p[k]){ o=k; break } u-=p[k] }
    // the evidence their approach leaves (for your read): pitches seen, pulled balls in play, strikeouts
    const T=st.S[bat].tell, tl=BS_TELL[st.S[bat].app]; T.pa++; T.pit+=Math.max(1,Math.round(rng.gauss(tl[1],1.4)));
    if(o==="k")T.k++; else if(o!=="bb"&&o!=="hbp"){ T.bip++; if(rng.r()<tl[0])T.pull++ }
    st.S[fs].sp.bf+=st.S[fs].pen||st.S[fs].closer?0:1;
    return o;
  }
  // the half-inning in progress
  let H=null;   // {bat, fs, outs, b:[r1,r2,r3], runs, ev}
  const startHalf=(bat)=>{ H={bat:bat, fs:other(bat), outs:0, b:[0,0,0], runs:0, ev:H&&H.bat==="away"?H.ev:[], hits:0};
    if(st.seg>=SEGS&&!st.playoff)H.b[1]=1;   // extra innings: a runner on second
  };
  let D=null;   // the inning's drive
  const inn=()=>st.seg+1;
  const score=(n,how)=>{ if(H.bat==="home")st.h+=n; else st.a+=n; H.runs+=n;
    if(st.S[H.fs].pen===false&&!st.S[H.fs].closer)st.S[H.fs].sp.ra+=n };
  const walkoff=()=>H.bat==="home"&&st.seg>=SEGS-1&&st.h>st.a;
  const onDesc=()=>{ const b=H.b; const n=b.filter(Boolean).length; if(!n)return "Bases empty";
    if(n===3)return "Bases loaded"; return (b[0]&&b[1]?"Men on first and second":b[0]&&b[2]?"Men on first and third":b[1]&&b[2]?"Men on second and third":b[0]?"A man on first":b[1]?"A man on second":"A man on third")+(H.outs?`, ${H.outs} out`:", nobody out") };
  // the computer's manager: the bullpen when the starter is spent or hit hard; the closer for a save
  const cpuPen=fs=>{ const X=st.S[fs], P=X.sp; if(X.pen)return; if(P.bf>=P.stam||P.ra>=5||(P.bf>=18&&P.ra>=4))X.pen=true };
  const cpuCloser=fs=>{ const X=st.S[fs], L=lead(fs); if(inn()>=9&&L>=1&&L<=3&&!X.closer){ X.closer=true; X.pen=true } };
  const pullDue=fs=>{ const X=st.S[fs], P=X.sp; return !X.pen&&P.bf>=Math.max(18,P.stam-3)&&inn()>=5&&inn()<=8&&Math.abs(lead(fs))<=3 };
  const doAB=()=>{
    const bat=H.bat, fs=H.fs, X=st.S[bat];
    const slot=X.bat%9; X.bat++;
    let extra=0; if(st.late[bat+"pinch"]){ extra=BS.pinch; st.late[bat+"pinch"]=false; H.ev.push({k:"ph",side:bat,u:rng.int(100),inn:inn()}) }
    const o=pa(bat,fs,extra-(slot>=6?0.02:slot<=3?-0.02:0)), L=st.lines[bat==="home"?"h":"a"];
    const b=H.b;
    if(o==="k"){ H.outs++; L.k++; if(b[0]+b[1]+b[2]>=2&&rng.r()<0.6)H.ev.push({k:"kk",side:fs,u:rng.int(100),inn:inn(),on:b[0]+b[1]+b[2]}) }
    else if(o==="bb"||o==="hbp"){ L.bb++; if(b[0]){ if(b[1]){ if(b[2])score(1); b[2]=1 } b[1]=1 } b[0]=1 }
    else if(o==="s1"){ L.h++; H.hits++; let n=b[2]; b[2]=0; if(b[1]){ if(rng.r()<BS.adv2)n++; else b[2]=1 } b[1]=0; if(b[0]){ if(!b[2]&&rng.r()<0.3)b[2]=1; else b[1]=1 } b[0]=1;
      if(n){ score(n); H.ev.push({k:"rbi",side:bat,n:n,hit:1,u:rng.int(100),inn:inn()}) } }
    else if(o==="s2"){ L.h++; H.hits++; let n=b[2]+b[1]; b[2]=0; b[1]=0; if(b[0]){ if(rng.r()<BS.adv2*0.7)n++; else b[2]=1 } b[0]=0; b[1]=1;
      if(n){ score(n); H.ev.push({k:"rbi",side:bat,n:n,hit:2,u:rng.int(100),inn:inn()}) } }
    else if(o==="s3"){ L.h++; H.hits++; const n=b[0]+b[1]+b[2]; b[0]=b[1]=0; b[2]=1; if(n){ score(n); H.ev.push({k:"rbi",side:bat,n:n,hit:3,u:rng.int(100),inn:inn()}) } }
    else if(o==="hr"){ L.h++; L.hr++; H.hits++; const n=1+b[0]+b[1]+b[2]; b[0]=b[1]=b[2]=0; score(n); H.ev.push({k:"hr",side:bat,n:n,u:rng.int(100),inn:inn(),slot:slot}) }
    else{ // an out in play
      if(b[0]&&H.outs<2&&rng.r()<BS.dp){ H.outs+=2; b[0]=0; if(H.outs<3&&b[2]&&rng.r()<0.4){ score(1); b[2]=0 } H.ev.push({k:"dp",side:fs,u:rng.int(100),inn:inn()}) }
      else if(b[2]&&H.outs<2&&rng.r()<BS.sf){ H.outs++; b[2]=0; score(1); H.ev.push({k:"rbi",side:bat,n:1,hit:0,u:rng.int(100),inn:inn()}) }
      else{ H.outs++; if(H.outs<3&&b[1]&&!b[2]&&rng.r()<0.3){ b[2]=1; b[1]=0 } } }
    if(H.outs>=3)L.lob+=b[0]+b[1]+b[2];
  };
  const steal=(side)=>{ const ok=rng.r()<BS.steal; const b=H.b; b[0]=0; if(ok)b[1]=1; else H.outs++; H.ev.push({k:ok?"sb":"cs",side:side,u:rng.int(100),inn:inn()}) };
  st.log=[];
  const apply=(side,dp,v)=>{
    const X=st.S[side];
    if(dp.k==="prep"){ if(ANSWERS[v]){ const t=st.S[other(side)].app; X.ans=v; X.prepd=true;
      st.log.push({side:side,h:dp.h,k:"prep",pick:v,truth:t,right:ANSWERS[v].beats===t,split:(()=>{const a=Object.values(dp.report).sort((x,y)=>y-x);return a[0]===a[1]?a.filter(x=>x>0).join("-"):false})()}) }
      else if(v!==undefined&&dp.report){ const t=st.S[other(side)].app, ks=Object.keys(dp.report).sort((a,b)=>dp.report[b]-dp.report[a]);
        st.log.push({side:side,h:dp.h,k:"prep",pick:"wait",waited:true,fav:ks[0],truth:t,right:ks[0]!==t,unclear:dp.report[ks[0]]===dp.report[ks[1]]}) } return }
    if(dp.k==="read"){ const t=st.S[other(side)].app, pick=v==="keep"?X.ans:ANSWERS[v]?v:null;
      if(pick){ st.log.push({side:side,h:dp.h,k:"read",pick:pick,truth:t,right:ANSWERS[pick].beats===t,evid:dp.best}); if(pick!==X.ans)X.prepd=false; X.ans=pick }
      else { const was=X.ans; readIt(side,0.45); st.autoDid=X.ans!==was&&ANSWERS[X.ans]?"read them himself and switched to "+ANSWERS[X.ans].l.split(":")[0].toLowerCase():"read them himself and kept the plan as it was" }
      return }
    if(dp.k==="pull"){ if(v==="pen")X.pen=true; else if(v==="stay"){ X.sp.stam=Math.max(X.sp.stam,X.sp.bf+3) } else { cpuPen(side); st.autoDid=X.pen?"went to the bullpen":"left him in, by the computer's rule" } return }
    if(dp.k==="pinch"){ if(v==="pinch"||(v==="normal"&&lead(side)<=0))st.late[side+"pinch"]=true; if(v==="normal")st.autoDid=st.late[side+"pinch"]?"sent up the pinch hitter (the computer does when not ahead)":"let him hit"; return }
    if(dp.k==="steal"){ const go=v==="send"||(v==="normal"&&rng.r()<0.25); if(v==="normal")st.autoDid=go?"sent him":"held him"; if(go&&H&&H.b[0]&&!H.b[1])steal(side); return }
  };
  /* the calls due before the next at-bat (people only; the computer manages as above) */
  function callsDue(){
    const bat=H.bat, fs=H.fs;
    // your starter, tiring in a close game, with you in the field
    if(humans[fs]&&pullDue(fs)&&!st.asked["pull"+inn()+fs]){ st.asked["pull"+inn()+fs]=true; const X=st.S[fs];
      if(queueCall(fs,pullCall(inn(),lead(fs),X.sp,H.b.some(Boolean)?onDesc()+".":"")))return true }
    if(humans[bat]&&inn()>=7&&Math.abs(lead(bat))<=2){ const X=st.S[bat], slot=X.bat%9;
      if((H.b[1]||H.b[2])&&slot>=6&&!st.asked["pinch"+inn()+bat]){ st.asked["pinch"+inn()+bat]=true;
        if(queueCall(bat,pinchCall(inn(),lead(bat),ctx.lineup&&ctx.lineup[bat]?ctx.lineup[bat][slot]:null,ctx.bench&&ctx.bench[bat]||null,onDesc())))return true }
      if(H.b[0]&&!H.b[1]&&H.outs<2&&Math.abs(lead(bat))<=1&&!st.asked["steal"+inn()+bat]){ st.asked["steal"+inn()+bat]=true;
        if(queueCall(bat,stealCall(inn(),lead(bat),null,H.outs)))return true } }
    return false;
  }
  function cpuTurn(){
    const bat=H.bat, fs=H.fs;
    if(!humans[fs]||st.S[fs].pen){ cpuPen(fs) } else if(!pullDue(fs))cpuPen(fs);
    cpuCloser(fs);
    if(!humans[bat]&&H.b[0]&&!H.b[1]&&H.outs<2&&rng.r()<BS.stealTry)steal(bat);
  }
  function finishHalf(){
    st.lines[H.bat==="home"?"h":"a"];
    if(H.bat==="away"){ D.a=H.runs; D.ev=H.ev.slice() } else { D.h=H.runs; D.ev=H.ev.slice() }
  }
  st.next=function(){
    const fin=()=>({done:true,h:st.h,a:st.a,drives:st.drives});
    if(st.done)return fin();
    if(st.pendingSide){ const P=st.pendingSide, v=st.answer; st.pendingSide=null; st.answer=null; st.autoDid=null; apply(P.side,P.dp,v) }
    if(st.queue.length){ const Q=st.queue.shift(); st.pendingSide=Q;
      const r={ask:Q.dp,mine:Q.side==="home"?st.h:st.a,theirs:Q.side==="home"?st.a:st.h,q:st.seg,side:Q.side}; st.waiting=r; return r }
    if(st.seg===0&&!st.p0){ st.p0=true; ["home","away"].forEach(sd=>{ const o=other(sd);
      if(humans[sd]&&!humans[o]&&fav[o])queueCall(sd,prepCall(scoutReport(fav[o],(ctx.seed||0)+(o==="home"?1:2)))) });
      if(st.queue.length)return st.next() }
    if(st.seg===3&&!st.r1&&!H){ st.r1=true; ["home","away"].forEach(sd=>{ if(!humans[sd]){ readIt(sd,0.45); return } const O=st.S[other(sd)]; O.tell.n=1; queueCall(sd,readCall(O.tell,st.S[sd].ans)) });
      if(st.queue.length)return st.next() }
    // the inning
    if(!D){ D={seg:st.seg,h:0,a:0,sh:st.h,sa:st.a,ev:[]}; startHalf("away") }
    let guard=0;
    while(guard++<200){
      if(callsDue())return st.next();
      cpuTurn();
      if(H.outs<3)doAB();
      if(H.outs>=3||walkoff()){
        const wasBat=H.bat; const evs=H.ev; finishHalf();
        if(wasBat==="away"){
          // the home side needn't bat in the ninth (or later) if it's ahead
          if(st.seg>=SEGS-1&&st.h>st.a){ D.ev=evs; break }
          startHalf("home"); H.ev=evs; continue }
        break }
    }
    D.sh=st.h; D.sa=st.a; D.ev=H.ev; D.hits=[st.lines.h.h,st.lines.a.h];
    st.drives.push(D); const out=D; D=null; H=null; st.seg++;
    if(st.seg>=SEGS&&st.h!==st.a){ st.done=true }
    else if(st.seg>=SEGS){ st.ot=st.seg-SEGS+1 }
    if(st.seg>=30){ st.done=true }   // never, in practice
    return {drive:out,h:st.h,a:st.a};
  };
  st.reply=function(v){ st.answer=v; st.waiting=null };
  return st;
}
/* each club's usual approach at the plate this season, and the seed for its scouting report */
function clubStyle(t,year){ return APPROACH_KEYS[strHash(t+"|"+year)%APPROACH_KEYS.length] }
/* the day's starters: the rotation turns one a game (the fourth and fifth men are the starters' backups) */
function spCtx(t,step){
  try{ if(typeof SEA==="undefined"||!SEA||!SEA.roster||!SEA.roster[t])return null; const R=SEA.roster[t];
    const k=(step+strHash(t))%5, idx=k<3?BS_SP[k]:BK(BS_SP[k-3]), p=R[idx]; if(!p)return null;
    const mean=(R[BS_SP[0]].r+R[BS_SP[1]].r+R[BS_SP[2]].r+(R[BK(BS_SP[0])]||R[BS_SP[0]]).r+(R[BK(BS_SP[1])]||R[BS_SP[1]]).r)/5;
    return {n:p.n, q:(p.r-mean)*0.012} }catch(e){ return null } }
function gameCtx(h,a,year,step){ return {fav:{home:clubStyle(h,year),away:clubStyle(a,year)}, sp:{home:spCtx(h,step),away:spCtx(a,step)},
  lineup:{home:lineupOf(h),away:lineupOf(a)}, bench:{home:benchBat(h),away:benchBat(a)}, seed:strHash(h+"|"+a+"|"+year+"|"+step)} }
function lineupOf(t){ try{ const R=SEA.roster[t]; return BS_HIT.map(i=>R[i]?R[i].n:null) }catch(e){ return null } }
function benchBat(t){ try{ const R=SEA.roster[t]; let b=null; BS_HIT.forEach(i=>{ const p=R[BK(i)]; if(p&&(!b||p.r>b.r))b=p }); return b?b.n:null }catch(e){ return null } }
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const humans=opts.decide?{home:!!opts.userIsHome,away:!opts.userIsHome}:{home:false,away:false};
  const e=makeLiveGame(rng,eloH,eloA,planH,planA,humans,opts.playoff,opts.ctx);
  let guard=0;
  while(guard++<400){
    const r=e.next();
    if(r.done)return {h:r.h,a:r.a,drives:r.drives,ot:e.ot,lines:e.lines};
    if(r.ask){ const v=opts.decide(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q}); e.reply(v||r.ask.opts[r.ask.opts.length-1][0]) }
  }
  return {h:e.h,a:e.a,drives:e.drives,ot:0,lines:e.lines};
}
