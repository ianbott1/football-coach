/* ============ the recruiting board (college games) ============ */
/* A class fills the spots seniors leave. Before the offseason you see, for
   each position with an open spot, a few named prospects, drawn exactly as
   the game draws a freshman newcomer for your program (with your focus and
   recruiting budget). You rank the ones you want. Each open spot goes to
   your highest-ranked prospect there, if he commits; the better he is next
   to what your program usually lands, the harder he is to get. Miss, and you
   get the newcomer you'd have had anyway.
   The default newcomer is always drawn first, from the season's own dice, so
   every other program's class is exactly what it was without a board; the
   commitment rolls use their own dice. (Muse: recruiting was the biggest
   offseason chore, with no board.) */
const RB_PER_POS=4;           // prospects shown at each open position
function rbOpenSpots(my){
  const R=U.roster[my], out={};
  R.forEach((p,i)=>{ if(p&&p.c>=3){ const k=i%POS.length; (out[k]=out[k]||[]).push(p.n) } });
  return out;                  // position index -> the seniors leaving there
}
function rbStars(r){ return r>=82?5:r>=74?4:r>=64?3:2 }
/* the chance he commits: RB_LAND0 for a newcomer of the usual level, falling
   RB_LANDK per standard deviation above it (tuned in test/recruiting.js) */
const RB_LAND0=0.70, RB_LANDK=0.30;
function rbChance(x){ const z=(x.r-x.M)/Math.max(1,x.SD); return Math.max(0.08,Math.min(0.95,RB_LAND0-RB_LANDK*z)) }
function rbChanceWord(x){ const c=rbChance(x); return c>=0.7?"likely":c>=0.4?"a battle":"a long shot" }
/* the prospects at each open position, drawn with the league's own newcomer
   function (drawNewcomer) in this program's context and your choices: the
   same pool your newcomer comes from. Each from its own seed, so the list
   holds through the offseason. M, SD: what a newcomer there averages,
   measured from the same function. */
function rbPool(my,P){
  const open=rbOpenSpots(my), out=[], C=LEAGUE.offseason.recruitCtx(U,my,P||{});
  Object.keys(open).forEach(k=>{ const i=+k;
    const smp=new RNG(strHash(my+"|"+SEA.year+"|mean|"+i)), xs=[];
    for(let q=0;q<60;q++)xs.push(drawNewcomer(smp,C,i).r);
    const M=xs.reduce((a,b)=>a+b,0)/xs.length, SD=Math.sqrt(xs.reduce((a,b)=>a+(b-M)*(b-M),0)/xs.length);
    for(let j=0;j<RB_PER_POS;j++){
      const x=drawNewcomer(new RNG(strHash(my+"|"+SEA.year+"|"+i+"|"+j)),C,i);
      out.push(Object.assign(x,{key:i+"|"+j, i:i, M:Math.round(M*10)/10, SD:Math.round(SD*10)/10, stars:x.star5?5:rbStars(x.r)})) } });
  return out;
}
/* at the commit: your board, as it stands with your final choices */
function rbChoices(my,P){
  const pool=rbPool(my,P), by={}; pool.forEach(x=>by[x.key]=x);
  return (P.rboard||[]).map(k=>by[k]).filter(Boolean);
}
/* in developRoster: the newcomer at position i, from your board if he commits */
function rbSign(board,t,year,i,np){
  if(!board||!board.length)return np;
  const p=POS[i%POS.length].p, x=board.find(y=>!y.used&&y.p===p); if(!x)return np;
  x.used=true;
  const roll=new RNG(strHash(t+"|"+year+"|commit|"+x.n)).r();
  if(roll<rbChance(x)){ x.got=true;
    // he takes the newcomer's place after the offseason's development (rbSettle):
    // swapping him in now would change how the season's dice fall for everyone after
    np._rb=x; np._r0=np.r; np._p0=np.pot; np._c0=np.c; return np }
  // he went elsewhere: a program bigger than yours, more often than not
  const R2=new RNG(strHash(t+"|"+year+"|went|"+x.n)), bigger=NAMES.filter(o=>o!==t&&U.program[o]>U.program[t]);
  const from=bigger.length&&R2.r()<0.75?bigger:NAMES.filter(o=>o!==t); x.to=from[R2.int(from.length)];
  return np;
}
/* at the end of developRoster: each signed prospect replaces the newcomer
   whose spot he took, developed by as much as that newcomer was */
function rbSettle(roster,arriving){
  roster.forEach((np,k)=>{ if(!np||!np._rb)return; const x=np._rb; x.was=np._r0;   // the newcomer he replaced, as drawn
    const r=Math.round(Math.max(30,Math.min(99,x.r+(np.r-np._r0)))), pot=Math.round(Math.max(r,Math.min(99,x.pot+(np.pot-np._p0))));
    const pl=Object.assign({},x,{i:np.i,p:np.p,r:r,pot:pot,board:true});
    ["key","M","SD","used","got","stars","to"].forEach(q=>delete pl[q]);
    Object.keys(np).forEach(q=>{ if(!(q in pl)&&q[0]!=="_")pl[q]=np[q] });   // anything the offseason gave the newcomer (minutes, flags)
    pl.n=x.n; pl.r=r; pl.pot=pot; pl.c=x.c+((np.c||0)-(np._c0||0)); roster[k]=pl;
    if(arriving){ const a=arriving.indexOf(np); if(a>=0)arriving[a]=pl } });   // the class's record counts him, not the man he replaced
  // a newcomer can declare early the offseason he arrives (college basketball):
  // a recruit standing in for one takes the spot of the newcomer who filled it after him
  (arriving||[]).filter(np=>np&&np._rb&&roster.indexOf(np)<0).forEach(np=>{ const x=np._rb;
    const later=arriving.filter(a=>a&&a!==np&&!a._rb&&!a.board&&a.i===np.i&&roster.indexOf(a)>=0).pop();
    if(!later){ x.got=false; x.to=null; return }
    const k=roster.indexOf(later); x.was=later.r;
    const pl=Object.assign({},later,x,{i:later.i,p:later.p,board:true}); ["key","M","SD","used","got","stars","to","_rb","_r0","_p0","_c0","was"].forEach(q=>delete pl[q]);
    roster[k]=pl; arriving[arriving.indexOf(later)]=pl });
  roster.forEach(p=>{ if(p){ delete p._rb; delete p._r0; delete p._p0; delete p._c0 } });
  (arriving||[]).forEach(p=>{ if(p){ delete p._rb; delete p._r0; delete p._p0; delete p._c0 } });
}
function rbReport(board){ return (board||[]).filter(x=>x.used).map(x=>({n:x.n,p:x.p,r:x.r,stars:x.stars,got:!!x.got,to:x.to||null,was:x.was})) }

/* ---- the board on the offseason screen ---- */
function rbStarsHTML(n){ return `<span class="rbstars">${"★".repeat(n)}${"☆".repeat(5-n)}</span>` }
function recruitBoardHTML(P,num){
  const my=S.myTeam, open=rbOpenSpots(my), pool=rbPool(my,P), by={}; pool.forEach(x=>by[x.key]=x);
  const board=(P.rboard||[]).filter(k=>by[k]);
  const row=(x,on,ix)=>`<div class="drow"><span class="dpick">${on?(ix+1)+".":""}</span>
    <div class="fmain"><div class="fname">${esc(x.n)} <span class="dpos">${esc(x.p)}</span> ${rbStarsHTML(x.stars)}</div>
      <div class="fnote">${x.c>=1?"a transfer":"a freshman"} &middot; rated ${x.r}, ceiling ${x.pot} &middot; ${rbChanceWord(x)}</div></div>
    ${on?`<button class="skip small" data-rbup="${esc(x.key)}" ${ix===0?"disabled":""}>&uarr;</button><button class="skip small" data-rbrm="${esc(x.key)}">Remove</button>`
        :`<button class="skip small" data-rbadd="${esc(x.key)}">Add</button>`}</div>`;
  let h=`<div class="grouphead">${num}. Recruiting board</div>
    <div class="note">Open spots: ${Object.keys(open).map(k=>`${esc(POS[k].p)} (${open[k].map(esc).join(", ")} graduating)`).join("; ")||"none"}. Anyone who leaves early opens another. Each spot goes to your highest-ranked prospect there, if he commits; miss, and you get the newcomer you'd have had anyway. Your focus and budget move these ratings.
    <b>Likely</b>: most like him commit. <b>A battle</b>: about half do. <b>A long shot</b>: most go elsewhere.</div>`;   // the words, said (Grokbot: "unclear what A BATTLE means")
  h+=`<div class="divhead">Your board</div>`+(board.length?board.map((k,ix)=>row(by[k],true,ix)).join("")
    :`<div class="note">Empty: the staff recruit as usual. Add prospects below.</div>`);
  Object.keys(open).forEach(k=>{ const list=pool.filter(x=>x.i===+k&&board.indexOf(x.key)<0);
    if(list.length)h+=`<div class="divhead">${esc(POS[k].p)} &middot; ${open[k].length} open</div>`+list.map(x=>row(x,false)).join("") });
  return h;
}
function bindRecruitBoard(){
  const P=()=>S.off.picks;
  document.querySelectorAll("[data-rbadd]").forEach(b=>b.onclick=()=>{ const p=P(); p.rboard=(p.rboard||[]).concat([b.dataset.rbadd]); save(); render() });
  document.querySelectorAll("[data-rbrm]").forEach(b=>b.onclick=()=>{ const p=P(); p.rboard=(p.rboard||[]).filter(k=>k!==b.dataset.rbrm); save(); render() });
  document.querySelectorAll("[data-rbup]").forEach(b=>b.onclick=()=>{ const p=P(), L=(p.rboard||[]).slice(), i=L.indexOf(b.dataset.rbup);
    if(i>0){ [L[i-1],L[i]]=[L[i],L[i-1]]; p.rboard=L; save(); render() } });
}
/* the banner after the offseason: who committed, who went elsewhere */
function rbBannerHTML(B){
  const got=B.filter(x=>x.got), lost=B.filter(x=>!x.got);
  return `<div class="bnews small"><b>Your board:</b> ${got.length?"signed "+got.map(x=>`${esc(x.n)} (${esc(x.p)}, ${x.stars}\u2605)`).join(", "):"nobody signed"}${lost.length?`; lost ${lost.map(x=>`${esc(x.n)} (${esc(x.p)}) to ${esc(x.to||"another program")}`).join(", ")}`:""}.</div>`;
}
