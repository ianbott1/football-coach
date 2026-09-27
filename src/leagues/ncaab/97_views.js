/* ============ views: college basketball ============ */
/* The poll with bracketology beside it, the stakes line for your next game,
   and the postseason: conference tournaments, the field, the bracket. */
let pollTab="poll";            // Rankings: the Top 25 or Bracketology
let postTab="ct";              // postseason: conference tournaments, the field, the bracket
function pollView(){
  const prev=SEA.prevRank, cur=SEA.poll.rankMap();
  if(SEA.step>=8&&SEA.phase==="week"){
    const bar=`<div class="dateline"><h2>Rankings</h2><span>${SEA.year}</span></div>
      <div class="subtabs">${[["poll","Top 25"],["cfp","Bracketology"]].map(([k,l])=>
      `<button class="subtab" data-k="${k}" aria-pressed="${pollTab===k}">${l}</button>`).join("")}</div>`;
    if(pollTab==="cfp")return bar+bracketology();
    return bar+pollRows(prev,cur);
  }
  let h=`<div class="dateline"><h2>Top 25</h2><span>${SEA.year}</span></div>`+pollRows(prev,cur);
  if(SEA.step>=LEAGUE.weeks)h+=allAmericaHTML();       // once the regular season is over
  return h;
}
function allAmericaHTML(){
  const A=SEA.allAmerica();
  const row=(x,i)=>`<div class="prow ${x.t===S.myTeam?'mine':''}" style="--tc:${teamInk(x.t)}"><span class="cbar"></span>
    <div class="pnum">${x.p}</div><div class="pmain"><div class="pname">${esc(x.n)}${i===0?" &middot; <b>Player of the Year</b>":""}</div>
    <div class="psub">${esc(x.t)} &middot; ${esc(classTag(x.c))} &middot; ${esc(x.line)}</div></div></div>`;
  return `<div class="grouphead">All-America first team</div>`+A.first.map(row).join("")+
    `<div class="grouphead">Second team</div>`+A.second.map((x,i)=>row(x,i+1)).join("");
}
function pollRows(prev,cur){
  const rows=SEA.top25(null);
  let h="";
  const mv=t=>{
    if(!prev||!prev[t])return `<span class="mv flat">&ndash;</span>`;
    const d=prev[t]-cur[t];
    if(prev[t]>25&&cur[t]<=25)return `<span class="mv up">NEW</span>`;
    if(d>0)return `<span class="mv up">&#9650;${d}</span>`;
    if(d<0)return `<span class="mv dn">&#9660;${-d}</span>`;
    return `<span class="mv flat">&ndash;</span>`;
  };
  h+=rows.map(p=>`<div class="prow ${p.team===S.myTeam?'mine':''}"
      style="--tc:${teamInk(p.team)}">
      <span class="cbar"></span>
      <div class="pnum">${p.rank}</div>
      <div class="pmain"><div class="pname">${TL(p.team)}</div>
      <div class="psub">${p.rec} &middot; ${esc(LEAGUE.conf.names[p.conf])}</div></div>
      ${mv(p.team)}</div>`).join("");
  if(cur[S.myTeam]>25){
    h+=`<div class="grouphead">Your program</div>
      <div class="prow mine" style="--tc:${teamInk(S.myTeam)}"><span class="cbar"></span>
      <div class="pnum">${cur[S.myTeam]}</div>
      <div class="pmain"><div class="pname">${esc(S.myTeam)}</div>
      <div class="psub">${SEA.rec[S.myTeam][0]}-${SEA.rec[S.myTeam][1]} &middot; outside the top 25</div>
      </div>${mv(S.myTeam)}</div>`;
  }
  return h;
}

/* who'd be in if it ended today: conference leaders take the automatic bids,
   the best 44 résumés the rest */
function projectedField(){
  const inel=LEAGUE.playoff.ineligible, ok=t=>inel.indexOf(t)<0;
  const aq=LEAGUE.conf.order.map(c=>SEA.confRank(c).find(ok)).filter(Boolean);
  const byRes=NAMES.filter(ok).sort((a,b)=>SEA.resume(b)-SEA.resume(a));
  const al=byRes.filter(t=>aq.indexOf(t)<0);
  const field=aq.concat(al.slice(0,LEAGUE.playoff.atLarge)).sort((a,b)=>SEA.resume(b)-SEA.resume(a));
  return {field:field,aq:aq,lastIn:al.slice(LEAGUE.playoff.atLarge-4,LEAGUE.playoff.atLarge),
          firstOut:al.slice(LEAGUE.playoff.atLarge,LEAGUE.playoff.atLarge+4)};
}
/* seed line from a place in the 1-76 order (the Opening Round teams sit on 11, 12, 15, 16) */
function seedLineOf(i,n){ if(i<40)return Math.floor(i/4)+1; if(i<52)return 11+Math.floor((i-40)/6); return Math.min(16,13+Math.floor((i-52)/6)) }
function bracketology(){
  const P=projectedField(), my=S.myTeam, pos=P.field.indexOf(my);
  const row=(t,i,tag)=>`<div class="prow ${t===my?'mine':''}" style="--tc:${teamInk(t)}"><span class="cbar"></span>
    <div class="pnum">${tag}</div><div class="pmain"><div class="pname">${TL(t)}</div>
    <div class="psub">${SEA.rec[t][0]}-${SEA.rec[t][1]} &middot; ${esc(CONF[t])}${P.aq.indexOf(t)>=0?" &middot; leads the conference":""}</div></div></div>`;
  let h=`<div class="note">If the season ended today. Conference leaders take the automatic bids; the committee picks the other 44 on résumé.</div>`;
  h+=`<div class="grouphead">You</div>`+(pos>=0?row(my,pos,seedLineOf(pos))+
     `<div class="note">Projected ${seedLineOf(pos)} seed${seedLineOf(pos)>=11&&P.aq.indexOf(my)<0?", on the bubble":""}.</div>`
     :`<div class="note">Projected out${P.firstOut.indexOf(my)>=0?" \u2014 among the first four out":""}. Win your conference tournament and you're in regardless.</div>`);
  h+=`<div class="grouphead">Top four seed lines</div>`+P.field.slice(0,16).map((t,i)=>row(t,i,seedLineOf(i))).join("");
  h+=`<div class="grouphead">Last four in</div>`+P.lastIn.map(t=>row(t,P.field.indexOf(t),seedLineOf(P.field.indexOf(t)))).join("");
  h+=`<div class="grouphead">First four out</div>`+P.firstOut.map(t=>row(t,0,"&ndash;")).join("");
  return h;
}
/* what's riding on your next game: a list of {p: priority, tag, l: line} */
function bbStakes(x){
  const {my,wk,left,cp}=x, out=[];
  if(SEA.phase!=="week")return out;
  if(cp&&wk>=LEAGUE.schedule.nonConf+6&&cp.pos<=2)
    out.push({p:84,tag:"CONFERENCE RACE",l:`${cp.pos===1?"First":"Second"} in the ${esc(cp.conf)} with ${left} to play. The top seed in the conference tournament matters.`});
  if(wk>=8){
    const P=projectedField(), pos=P.field.indexOf(my);
    if(pos>=0&&pos<16)out.push({p:76,tag:"SEEDING",l:`Projected a ${seedLineOf(pos)} seed. A protected seed means an easier road in March.`});
    else if(P.lastIn.indexOf(my)>=0)out.push({p:86,tag:"BUBBLE",l:`Among the last four in. Every game is a résumé game now.`});
    else if(P.firstOut.indexOf(my)>=0)out.push({p:86,tag:"BUBBLE",l:`First four out. One good win changes that.`});
    else if(pos>=0)out.push({p:60,tag:"IN THE FIELD",l:`Projected a ${seedLineOf(pos)} seed${P.aq.indexOf(my)>=0?", as the conference leader":""}.`});
  }
  return out;
}
/* the postseason: conference tournaments, then the field and the bracket */
function gameLine(g){
  const sd=x=>x?`<span class="seed">${x}</span> `:"";
  const w=g.winner===g.home;
  return `<div class="brow ${g.home===S.myTeam||g.away===S.myTeam?'mine':''}">
    <span class="${w?'bw':''}">${sd(g.hseed)}${esc(g.home)} ${g.hp}</span> &middot;
    <span class="${!w?'bw':''}">${sd(g.aseed)}${esc(g.away)} ${g.ap}</span></div>`;
}
function bracketView(){
  const tabs=[["ct","Conference tournaments"]];
  if(SEA.field.length)tabs.push(["field","The field"],["bracket","The bracket"]);
  if(tabs.map(t=>t[0]).indexOf(postTab)<0)postTab=tabs[tabs.length-1][0];
  let h=`<div class="subtabs">${tabs.map(([k,l])=>`<button class="subtab" data-p="${k}" aria-pressed="${postTab===k}">${l}</button>`).join("")}</div>`;
  if(postTab==="ct"){
    const mine=CONF[S.myTeam], gs=(SEA.ctGames[mine]||[]);
    h+=`<div class="grouphead">${esc(mine)} Tournament</div>`+(gs.length?gs.map(gameLine).join(""):`<div class="note">Not started.</div>`);
    const ch=Object.keys(SEA.champs);
    if(ch.length)h+=`<div class="grouphead">Automatic bids</div>`+LEAGUE.conf.order.filter(c=>SEA.champs[c]).map(c=>
      `<div class="brow ${SEA.champs[c]===S.myTeam?'mine':''}"><b>${esc(SEA.champs[c])}</b> &middot; ${esc(c)}</div>`).join("");
    return h;
  }
  if(postTab==="field"){
    h+=selectionReveal();
    h+=`<div class="grouphead">The field by region</div>`;
    REGIONS.forEach(r=>{
      h+=`<div class="grouphead">${r}</div>`;
      for(let line=1;line<=16;line++){
        const t=SEA.bracket&&SEA.bracket[r]?SEA.bracket[r][line]:null;
        const og=(SEA.openGames||[]).find(o=>o.region===r&&o.line===line);
        const label=og&&(!t||t===og.a||t===og.b)&&!(SEA.rounds.open||[]).length?`${esc(og.a)} / ${esc(og.b)} <span class="psub">(Opening Round)</span>`:esc(t||"");
        h+=`<div class="brow ${t===S.myTeam||(og&&(og.a===S.myTeam||og.b===S.myTeam))?'mine':''}"><span class="seed">${line}</span> ${label}</div>`;
      }
    });
    return h;
  }
  // the bracket, drawn: one region at a time, or the Final Four
  const regTabs=REGIONS.concat(["Final Four"]);
  if(regTabs.indexOf(bracketRegion)<0)bracketRegion=REGIONS[0];
  h+=`<div class="subtabs">${regTabs.map(r=>`<button class="subtab" data-br="${r}" aria-pressed="${bracketRegion===r}">${r}</button>`).join("")}</div>`;
  if(SEA.champion)h+=`<div class="note"><b>${esc(SEA.champion)}</b> are national champions.</div>`;
  h+=bracketRegion==="Final Four"?finalFourHTML():regionHTML(bracketRegion);
  const og=(SEA.rounds.open||[]);
  if(og.length&&bracketRegion!=="Final Four"){
    const mine=og.filter(g=>g.region===bracketRegion);
    if(mine.length)h+=`<div class="grouphead">Opening Round</div>`+mine.map(gameLine).join("");
  }
  return h;
}
/* ---- Selection Sunday ---- */
/* your fate first, then the field: the 1 seeds, the bubble, bids by conference */
function selectionReveal(){
  const my=S.myTeam, sd=SEA.seeds[my], F=SEA.field, al=F.filter(t=>SEA.notes[t]==="At-large");
  const lastIn=al.slice(-4), og=(SEA.openGames||[]).find(o=>o.a===my||o.b===my);
  let card;
  if(F.indexOf(my)>=0){
    const reg=SEA.region[my];
    let first="";
    if(og)first=`First the Opening Round in ${og.line<=12?"Dayton":"the second Opening Round site"}: ${esc(og.a===my?og.b:og.a)}. Win, and you're the ${og.line} seed in the ${reg}.`;
    else{const pr=R64_PAIRS.find(p=>p[0]===sd||p[1]===sd), other=pr[0]===sd?pr[1]:pr[0];
      const opp=SEA.bracket[reg][other], oo=(SEA.openGames||[]).find(o=>o.region===reg&&o.line===other);
      first=`First round: ${oo&&!(SEA.rounds.open||[]).length?"the winner of "+esc(oo.a)+" and "+esc(oo.b):esc(opp)} (${other} seed).`}
    card=`<div class="selcard in"><div class="selhead">You're in</div>
      <div class="selbig">${sd} seed &middot; ${reg}</div>
      <div class="selsub">${esc(SEA.notes[my])}${lastIn.indexOf(my)>=0?" &middot; among the last four in":""}. ${first}</div></div>`;
  }else{
    const close=SEA.firstOut.indexOf(my)>=0;
    card=`<div class="selcard out"><div class="selhead">${close?"So close":"Not this year"}</div>
      <div class="selbig">${close?"First four out":"Not selected"}</div>
      <div class="selsub">${SEA.rec[my][0]}-${SEA.rec[my][1]}. ${close?"One more good win would have done it.":"Win the conference tournament next year and you're in regardless."}</div></div>`;
  }
  const ones=REGIONS.map(r=>SEA.bracket[r][1]);
  const byConf={}; F.forEach(t=>byConf[CONF[t]]=(byConf[CONF[t]]||0)+1);
  const multi=Object.keys(byConf).filter(c=>byConf[c]>1).sort((a,b)=>byConf[b]-byConf[a]);
  return card+
    `<div class="grouphead">The No. 1 seeds</div>`+ones.map((t,i)=>`<div class="brow ${t===my?'mine':''}"><span class="seed">1</span> <b>${esc(t)}</b> &middot; ${REGIONS[i]} &middot; ${SEA.rec[t][0]}-${SEA.rec[t][1]}</div>`).join("")+
    `<div class="grouphead">Last four in</div>`+lastIn.map(t=>`<div class="brow ${t===my?'mine':''}">${esc(t)} &middot; ${SEA.rec[t][0]}-${SEA.rec[t][1]} &middot; ${esc(CONF[t])}</div>`).join("")+
    `<div class="grouphead">First four out</div>`+SEA.firstOut.map(t=>`<div class="brow ${t===my?'mine':''}">${esc(t)} &middot; ${SEA.rec[t][0]}-${SEA.rec[t][1]} &middot; ${esc(CONF[t])}</div>`).join("")+
    `<div class="grouphead">Bids by conference</div><div class="note">${multi.map(c=>`${esc(c)} ${byConf[c]}`).join(" &middot; ")}; ${Object.keys(byConf).length-multi.length} conferences with one.</div>`;
}

/* ---- the drawn bracket ---- */
let bracketRegion="East";
/* a game box: two lines, seed and team and score; the winner in bold */
function bslot(t,seed,pts,win){
  const my=t&&t===S.myTeam;
  return `<div class="bslot ${win?'bwin':''} ${my?'bmine':''}" style="--tc:${t?teamInk(t):'transparent'}">
    <span class="bseed">${seed||""}</span><span class="bteam">${t?esc(t):'<span class="btbd">to be decided</span>'}</span>
    <span class="bpts">${pts!==undefined&&pts!==null?pts:""}</span></div>`;
}
function bgame(g,top,bot){
  if(g)return `<div class="bgame">${bslot(g.home,g.hseed,g.hp,g.winner===g.home)}${bslot(g.away,g.aseed,g.ap,g.winner===g.away)}</div>`;
  return `<div class="bgame">${bslot(top&&top.t,top&&top.s)}${bslot(bot&&bot.t,bot&&bot.s)}</div>`;
}
/* who fills a first-round slot before it's played: the team, or both Opening Round teams */
function slotTeam(r,line){
  const t=SEA.bracket&&SEA.bracket[r]?SEA.bracket[r][line]:null;
  const og=(SEA.openGames||[]).find(o=>o.region===r&&o.line===line);
  if(og&&!(SEA.rounds.open||[]).length)return {t:og.a+" / "+og.b,s:line};
  return t?{t:t,s:line}:null;
}
function regionHTML(r){
  const played=k=>(SEA.rounds[k]||[]).filter(g=>g.region===r);
  const col=(k,n,pre)=>{const gs=played(k); const out=[];
    for(let i=0;i<n;i++)out.push(gs[i]?bgame(gs[i]):pre?pre(i):bgame(null)); return out};
  const r64=col("r64",8,i=>bgame(null,slotTeam(r,R64_PAIRS[i][0]),slotTeam(r,R64_PAIRS[i][1])));
  const winnersOf=(k,i)=>{const g=played(k)[i]; return g?{t:g.winner,s:SEA.seeds[g.winner]}:null};
  const r32=col("r32",4,i=>bgame(null,winnersOf("r64",2*i),winnersOf("r64",2*i+1)));
  const s16=col("s16",2,i=>bgame(null,winnersOf("r32",2*i),winnersOf("r32",2*i+1)));
  const e8=col("e8",1,i=>bgame(null,winnersOf("s16",0),winnersOf("s16",1)));
  const column=(title,items)=>`<div class="bcol"><div class="bhead">${title}</div><div class="bgames">${items.join("")}</div></div>`;
  return `<div class="bracket">${column("First round",r64)}${column("Second round",r32)}${column("Sweet 16",s16)}${column("Elite Eight",e8)}</div>`;
}
function finalFourHTML(){
  const champ=r=>{const g=(SEA.rounds.e8||[]).find(x=>x.region===r); return g?{t:g.winner,s:SEA.seeds[g.winner]}:null};
  const f4=SEA.rounds.f4||[], fin=(SEA.rounds.final||[])[0];
  const semis=[f4[0]?bgame(f4[0]):bgame(null,champ("East"),champ("South")), f4[1]?bgame(f4[1]):bgame(null,champ("Midwest"),champ("West"))];
  const w=i=>f4[i]?{t:f4[i].winner,s:SEA.seeds[f4[i].winner]}:null;
  const column=(title,items)=>`<div class="bcol"><div class="bhead">${title}</div><div class="bgames">${items.join("")}</div></div>`;
  return `<div class="note">Ford Field, Detroit. East plays South; Midwest plays West.</div>
    <div class="bracket">${column("Final Four",semis)}${column("National Championship",[fin?bgame(fin):bgame(null,w(0),w(1))])}</div>`;
}
LEAGUE.ui={
  stakes:bbStakes,
  rankingTab:"Poll",
  rankingView:pollView,
  projectedField:()=>projectedField().field,
  postseasonView(){ if(SEA.phase!=="week"&&(SEA.step>LEAGUE.weeks||Object.keys(SEA.ctGames||{}).length))return bracketView(); return null },
  afterAdvance(ph){ if(ph==="selection")postTab="field"; else if(NCAA_ROUNDS.indexOf(ph)>=0)postTab="bracket"; else if(CT_ROUNDS.indexOf(ph)>=0)postTab="ct" },
  subtab(b){ if(b.dataset.p){postTab=b.dataset.p;return true} if(b.dataset.k){pollTab=b.dataset.k;return true}
    if(b.dataset.br){bracketRegion=b.dataset.br;return true} return false }
};
