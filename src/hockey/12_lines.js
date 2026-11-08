/* ============ lines and pairings: who plays how much ============ */
/* Hockey's real deployment call: how to split the ice time between the top
   line and the depth, the top pair and the third, the starter and the
   backup. Leaning on your best players gives them more of it (the team gets
   their level more often), and it pays when they're much better than the
   depth behind them; rolling the lines keeps legs fresh, and pays when the
   depth is close. Riding them also gets more of them hurt. Balanced is the
   game as it always was: the computer's teams play it, so calibration is
   untouched. (Muse and Instinct: "lines and pairings".)
   Each group's effect, in strength: R_SLOPE x position weight x the change
   in the starter's share x (his edge over the man behind him, less what
   fresh legs are worth: FRESH rating points). */
const DEPLOY={
  f:{l:"Forwards", idx:[0,1,2], fresh:8, opts:{ride:{l:"Ride the top line",b:0.20}, bal:{l:"Balanced",b:0.30}, roll:{l:"Roll the lines",b:0.40}}},
  d:{l:"Defence",  idx:[3,4],   fresh:8, opts:{ride:{l:"Lean on the top pair",b:0.20}, bal:{l:"Balanced",b:0.30}, roll:{l:"Even pairs",b:0.40}}},
  g:{l:"Goalies",  idx:[5],     fresh:6, opts:{ride:{l:"Ride the starter",b:0.15}, bal:{l:"The usual split",b:0.22}, roll:{l:"Share the net",b:0.30}}}
};
const DEPLOY_HURT={ride:0.25, bal:0, roll:-0.12};     // injury risk, per skater group riding or rolling
/* how much the ice time matters: x2.5 the plain arithmetic, so a choice that
   fits your roster is worth ~3 standings points a season, and one that
   doesn't costs as much (measured in test/lines.js; at x1 it was lost in a
   season's luck) */
const DEPLOY_K=2.5;
let HK_STAT_BENCH=null;                               // the depth's share of the scoring, for the team being written up
function deployOf(sea,team){ return (sea&&team&&sea.userTeam===team&&sea.deploy)||{} }
function deployEdge(sea,team){
  const D=deployOf(sea,team); if(!sea||!sea.roster||!sea.roster[team])return 0;
  const R=sea.roster[team], hurt=new Set(sea.talent.active(team).map(x=>x.idx)); let e=0;
  Object.keys(DEPLOY).forEach(g=>{ const k=D[g]||"bal"; if(k==="bal")return; const G=DEPLOY[g], b1=G.opts[k].b;
    G.idx.forEach(i=>{ const P=POS[i], bk=R[BK(i)], st=hurt.has(i)?bk:R[i]; if(!st||!bk)return;
      e+=DEPLOY_K*R_SLOPE*P.w*(P.bench-b1)*((st.r-bk.r)-G.fresh) }) });
  return e;
}
/* ice time grows players: a summer's development, for the season's choice.
   Rolling gives the depth minutes (+2), and the top unit a little less (-0.5);
   riding the top unit leaves the depth on the bench (-1) and gives the top
   unit a little more (+0.5). Now against later. (A shift in the mean of the
   offseason's draw: the dice fall the same, so no other team changes.) */
const DEPLOY_DEV={ride:{top:0.5,depth:-1}, bal:{top:0,depth:0}, roll:{top:-0.5,depth:2}};
function deployDev(ch,i){
  if(!ch||!ch.deploy)return 0; const k=i%POS.length, g=Object.keys(DEPLOY).find(x=>DEPLOY[x].idx.indexOf(k)>=0);
  const d=DEPLOY_DEV[ch.deploy[g]||"bal"]; return i<POS.length?d.top:d.depth;
}
/* riding your skaters gets more of them hurt; rolling them, fewer */
function deployHazard(t){
  if(typeof SEA==="undefined"||!SEA)return 1; const D=deployOf(SEA,t);
  return 1+DEPLOY_HURT[D.f||"bal"]+DEPLOY_HURT[D.d||"bal"];
}
/* the box score follows the ice time */
function statDeploy(sea,tm){
  const D=deployOf(sea,tm); if(!D.f&&!D.d&&!D.g){ HK_STAT_BENCH=null; return }
  HK_STAT_BENCH=POS.map((P,i)=>{ const g=Object.keys(DEPLOY).find(k=>DEPLOY[k].idx.indexOf(i)>=0); const k=D[g]||"bal";
    return k==="bal"?P.bench:DEPLOY[g].opts[k].b });
}
/* the staff's read of your roster, in words */
function deployRead(g){
  const G=DEPLOY[g], R=SEA.roster[S.myTeam]; let gap=0,n=0;
  G.idx.forEach(i=>{ if(R[i]&&R[BK(i)]){ gap+=R[i].r-R[BK(i)].r; n++ } });
  gap=n?gap/n:0;
  const top=g==="g"?"starter":g==="d"?"top pair":"top line", depth=g==="g"?"backup":"depth";
  return gap>=G.fresh+4?`Your ${top} is well ahead of your ${depth}: leaning on them pays${g==="g"?"":", at more risk of injury"}.`
    :gap<=G.fresh-4?`Your ${depth} is close to your ${top}: spreading the ice time keeps legs fresh, and costs little.`
    :`It's close either way with this group.`;
}
function linesHTML(){
  const R=SEA.roster[S.myTeam], D=S.deploy||{};
  // two of one surname get their initials ("SISSOKO 54, SISSOKO 42" made you work out who was who: Instinct)
  const last=n=>n.split(" ").slice(-1)[0], dup={}; R.forEach(p=>{ if(p&&p.n)dup[last(p.n)]=(dup[last(p.n)]||0)+1 });
  const nm=i=>R[i]?`${esc(dup[last(R[i].n)]>1?R[i].n.split(" ")[0][0]+". "+last(R[i].n):last(R[i].n))} ${R[i].r}`:"&ndash;";
  const units={f:[`Top line: ${[0,1,2].map(nm).join(", ")}`,`Depth: ${[0,1,2].map(i=>nm(BK(i))).join(", ")}`],
               d:[`Top pair: ${[3,4].map(nm).join(", ")}`,`Depth: ${[3,4].map(i=>nm(BK(i))).join(", ")}`],
               g:[`Starter: ${nm(5)}`,`Backup: ${nm(BK(5))}`]};
  let h=`<div class="grouphead">Lines and ice time</div>`;
  Object.keys(DEPLOY).forEach(g=>{ const G=DEPLOY[g], cur=D[g]||"bal";
    h+=`<div class="lineset"><div class="divhead">${esc(G.l)}</div>
      <div class="fnote">${units[g].join(" &middot; ")}</div>
      <div class="setrow">${Object.keys(G.opts).map(k=>`<button class="setbtn" data-deploy="${g}:${k}" aria-pressed="${cur===k}">${esc(G.opts[k].l)}</button>`).join("")}</div>
      <div class="fnote">${esc(deployRead(g))}</div></div>` });
  return h+`<div class="note">Leaning on your best players gets the team their level more often, and gets more of them hurt. Rolling keeps legs fresh, and the minutes grow your depth over the summer; riding leaves them on the bench. Balanced is how every team plays by default.</div>`;
}
function bindLines(){
  document.querySelectorAll("[data-deploy]").forEach(b=>b.onclick=()=>{ const [g,k]=b.dataset.deploy.split(":");
    const was=S.deploy; S.deploy=Object.assign({},S.deploy||{},{[g]:k}); noteChoice("d",was,S.deploy); if(SEA)SEA.deploy=S.deploy; save(); render() });
}
