/* ============ screens: college football ============ */
/* The views only college football has: the Top 25 and the playoff picture
   under the ranking tab, and the bracket, selection field and bowls under
   Scores once the regular season ends. The core UI reaches them through
   LEAGUE.ui. */

function projectedField(){
  const rk=SEA.poll.rankMap(), order=SEA.poll.order(), leaders={};
  LEAGUE.conf.order.forEach(c=>{
    const mem=NAMES.filter(t=>CONF[t]===c).sort((x,y)=>{
      const px=SEA.confrec[x][0]/Math.max(1,SEA.confrec[x][0]+SEA.confrec[x][1]);
      const py=SEA.confrec[y][0]/Math.max(1,SEA.confrec[y][0]+SEA.confrec[y][1]);
      return py-px||SEA.elo[y]-SEA.elo[x];
    });
    leaders[c]=mem[0];
  });
  const f=LEAGUE.playoff.autoBids.map(c=>leaders[c]);
  f.push(LEAGUE.conf.autoBidPool.map(c=>leaders[c]).sort((x,y)=>rk[x]-rk[y])[0]);
  const ind=LEAGUE.playoff.independent;
  if(rk[ind.team]<=ind.withinRank&&f.indexOf(ind.team)<0)f.push(ind.team);
  for(const t of order){if(f.length>=LEAGUE.playoff.size)break; if(f.indexOf(t)<0)f.push(t)}
  return f.sort((x,y)=>rk[x]-rk[y]);
}

function playoffPicture(){
  const rk=SEA.poll.rankMap(), order=SEA.poll.order();
  const leaders={};
  LEAGUE.conf.order.forEach(c=>{
    const mem=NAMES.filter(t=>CONF[t]===c).sort((x,y)=>{
      const px=SEA.confrec[x][0]/Math.max(1,SEA.confrec[x][0]+SEA.confrec[x][1]);
      const py=SEA.confrec[y][0]/Math.max(1,SEA.confrec[y][0]+SEA.confrec[y][1]);
      return py-px||SEA.confrec[y][0]-SEA.confrec[x][0]||SEA.elo[y]-SEA.elo[x];
    });
    leaders[c]=mem[0];
  });
  const field=[], note={};
  LEAGUE.playoff.autoBids.forEach(c=>{field.push(leaders[c]);
    note[leaders[c]]=LEAGUE.conf.names[c]+" leader"});
  const g6=LEAGUE.conf.autoBidPool.map(c=>leaders[c]).sort((a,b)=>rk[a]-rk[b])[0];
  field.push(g6); note[g6]=LEAGUE.conf.names[CONF[g6]]+" leader";
  const ind=LEAGUE.playoff.independent;
  if(rk[ind.team]<=ind.withinRank&&field.indexOf(ind.team)<0){
    field.push(ind.team);note[ind.team]="Independent"}
  for(const t of order){if(field.length>=LEAGUE.playoff.size)break;
    if(field.indexOf(t)<0){field.push(t);note[t]="At-large"}}
  field.sort((a,b)=>rk[a]-rk[b]);
  const out=order.filter(t=>field.indexOf(t)<0).slice(0,4);
  const my=S.myTeam;
  let h=`<div class="grouphead">If the season ended today</div>`;
  h+=field.map((t,i)=>`<div class="frow ${t===my?'mine':''}">
    <span class="sd">${i+1}</span>
    <span class="dot" style="background:${teamColor(t)}"></span>
    <div class="fmain"><div class="fname">${esc(t)}</div>
    <div class="fnote">${esc(note[t])}</div></div>
    <span class="fcfp">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span>
    ${i<4?'<span class="byebadge">Bye</span>':''}</div>`).join("");
  h+=`<div class="grouphead">First four out</div>`;
  h+=out.map(t=>`<div class="frow ${t===my?'mine':''}"><span class="sd">&mdash;</span>
    <span class="dot" style="background:${teamColor(t)}"></span>
    <div class="fmain"><div class="fname">${esc(t)}</div></div>
    <span class="fcfp">${SEA.rec[t][0]}-${SEA.rec[t][1]}</span></div>`).join("");
  if(field.indexOf(my)<0)h+=`<div class="note">${esc(my)} is currently outside the field
    at ${rk[my]<=25?"No. "+rk[my]:rk[my]+"th"}.</div>`;
  return h;
}

let postTab="bracket";

function bracketView(){
  const my=S.myTeam;
  const inField=SEA.field.indexOf(my)>=0;
  let h=`<div class="dateline"><h2>Postseason</h2><span>${SEA.year}</span></div>`;
  h+=`<div class="subtabs">${[["bracket","Playoff"],["bowls","Bowls"],["field","The field"]]
    .map(([k,l])=>{
      const n=k==="bowls"?SEA.bowls.length:k==="field"?SEA.field.length:"";
      return `<button class="subtab" data-p="${k}" aria-pressed="${postTab===k}">${l}${
        n?` <em>${n}</em>`:""}</button>`}).join("")}</div>`;

  if(postTab==="bowls"){
    if(!SEA.bowls.length){
      const pr=SEA.bowlPairs||[];
      if(!pr.length)return h+`<div class="note">Bowl matchups are announced at the
        Selection Show.</div>`;
      const rk=SEA.poll.rankMap();
      const mine=pr.find(x=>x.a===my||x.b===my);
      let o=`<div class="grouphead">${pr.length} bowl matchups &middot; announced, not yet played</div>`;
      const rowFor=p=>`<div class="frow ${p.a===my||p.b===my?'mine':''}">
        <div class="fmain"><div class="fname">${rkTag(p.rka)}${TL(p.a)}
          <span class="vs">vs</span> ${rkTag(p.rkb)}${TL(p.b)}</div>
        <div class="fnote">${esc(p.name)} &middot; ${p.ra} vs ${p.rb}</div></div></div>`;
      if(mine)o+=rowFor(mine);
      o+=pr.filter(p=>p!==mine).map(rowFor).join("");
      if(SEA.snubbed&&SEA.snubbed.length)
        o+=`<div class="note">Eligible but left without a slot:
          ${SEA.snubbed.map(esc).join(", ")}.</div>`;
      return h+o;
    }
    const mine=SEA.bowls.find(g=>g.home===my||g.away===my);
    if(mine){h+=`<div class="grouphead">Your bowl</div>`+gameLine(mine,true)}
    h+=`<div class="grouphead">${SEA.bowls.length} bowl games &middot; six wins to qualify</div>`;
    h+=SEA.bowls.filter(g=>g!==mine).map(g=>gameLine(g,false)).join("");
    if(SEA.snubbed&&SEA.snubbed.length)
      h+=`<div class="note">Eligible but left without a slot:
        ${SEA.snubbed.map(esc).join(", ")}.</div>`;
    return h;
  }

  if(postTab==="field"){
    if(!SEA.field.length)return h+`<div class="note">The field hasn't been announced yet.</div>`;
    h+=`<div class="grouphead">Seeds 1&ndash;4 receive a first-round bye</div>`;
    h+=SEA.field.map(t=>`<div class="frow ${t===my?'mine':''}">
      <span class="sd">${SEA.seeds[t]}</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${esc(t)}</div>
      <div class="fnote">${esc(SEA.notes[t]||"")}</div></div>
      <span class="fcfp">${esc(SEA.selRec[t]||"")}</span>
      ${SEA.seeds[t]<=4?'<span class="byebadge">Bye</span>':''}</div>`).join("");
    h+=`<div class="grouphead">First four out</div>`;
    h+=SEA.firstOut.map(t=>`<div class="frow"><span class="sd">&mdash;</span>
      <span class="dot" style="background:${teamColor(t)}"></span>
      <div class="fmain"><div class="fname">${esc(t)}</div></div>
      <span class="fcfp">${esc(SEA.selRec[t]||"")}</span></div>`).join("");
    return h;
  }

  // bracket: only the most recent round expanded, earlier rounds collapsed
  const R=[["First Round","Dec 18-19 &middot; campus sites",SEA.rounds.r1],
           ["Quarterfinals","Dec 30 &amp; Jan 1",SEA.rounds.qf],
           ["Semifinals","Jan 14-15",SEA.rounds.sf],
           ["National Championship","Jan 25 &middot; Las Vegas",SEA.rounds.fin]];
  const played=R.filter(r=>r[2].length);
  if(!played.length){
    h+=`<div class="note">The bracket fills in as each round is played.
      ${inField?`<b>${esc(my)}</b> is in at the No. ${SEA.seeds[my]} seed.`
        :`${esc(my)} did not make the field.`}</div>`;
    return h;
  }
  played.forEach(([n,sub,gs],i)=>{
    const latest=i===played.length-1;
    const mine=gs.find(g=>g.home===my||g.away===my);
    h+=`<div class="rnd">${n}<small>${sub}</small></div>`;
    if(latest){
      if(mine)h+=gameLine(mine,true);
      h+=gs.filter(g=>g!==mine).map(g=>gameLine(g,false)).join("");
    }else{
      h+=`<div class="collapsed">${gs.map(g=>{
        const w=g.winner,l=g.loser;
        const ws=Math.max(g.hp,g.ap), ls=Math.min(g.hp,g.ap);
        return `<div class="crow ${w===my||l===my?'mine':''}">
          <span class="csd">${SEA.seeds[w]||""}</span>
          <span class="cw">${esc(w)}</span>
          <span class="cs">${ws}&ndash;${ls}</span>
          <span class="cl">${esc(l)}</span>
          <span class="csd r">${SEA.seeds[l]||""}</span></div>`}).join("")}</div>`;
    }
  });
  if(SEA.champion)h+=`<div class="title-card"><div class="crown">${SEA.year} National Champions</div>
    <div class="champ" style="color:${teamInk(SEA.champion)}">${esc(SEA.champion)}</div>
    <div class="sub">${SEA.rec[SEA.champion][0]}-${SEA.rec[SEA.champion][1]}
    &middot; entered as the No. ${SEA.seeds[SEA.champion]} seed</div></div>`;
  return h;
}

let pollTab="poll";

function pollView(){
  const prev=SEA.prevRank, cur=SEA.poll.rankMap();
  if(SEA.step>=6&&SEA.phase==="week"){
    const bar=`<div class="dateline"><h2>Rankings</h2><span>${SEA.year}</span></div>
      <div class="subtabs">${[["poll","Top 25"],["cfp","Playoff picture"]].map(([k,l])=>
      `<button class="subtab" data-k="${k}" aria-pressed="${pollTab===k}">${l}</button>`).join("")}</div>`;
    if(pollTab==="cfp")return bar+playoffPicture();
    return bar+pollRows(prev,cur);
  }
  return `<div class="dateline"><h2>Top 25</h2><span>${SEA.year}</span></div>`+pollRows(prev,cur);
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

LEAGUE.ui={
  rankingTab:"Poll",                    // label of the ranking tab
  rankingView:pollView,
  projectedField:projectedField,        // who'd be in if it ended today
  /* what Scores shows once the regular season is over, or null */
  postseasonView(){
    if(SEA.phase!=="week"&&(SEA.field.length||SEA.rounds.r1.length))return bracketView();
    return null;
  },
  /* after a step is played, open the sub-tab that step filled in */
  afterAdvance(ph){
    if(ph==="selection")postTab="field";
    else if(ph==="bowls")postTab="bowls";
    else if(ph==="r1"||ph==="qf"||ph==="sf"||ph==="final")postTab="bracket";
  },
  /* a sub-tab button belonging to one of these views */
  subtab(b){
    if(b.dataset.p){postTab=b.dataset.p;return true}
    if(b.dataset.k){pollTab=b.dataset.k;return true}
    return false;
  }
};
