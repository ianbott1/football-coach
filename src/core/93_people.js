/* ============ players you care about ============ */
/* Your best players as people: how they're playing lately (form), where their
   careers are heading (the next milestone), whether this is their last year
   with you (a contract year, a senior season), and how they seem. Form and
   milestones come from the box scores; the mood is a reading of the same
   facts (playing time, form, contract, results), not a separate mechanic.
   The season notes each player's games as it plays them (noteGame), on its
   own roster copy, so a reload rebuilds the same story. */
const FORM_N=5;                                // games in the form line
function careerOf(pl,key){ return ((pl.car&&pl.car[key])||0)+((pl.st2&&pl.st2[key])||0) }
function milestoneSpec(pos){
  const M=(LEAGUE.classes&&LEAGUE.classes.length&&SPORT.milestonesCollege)||SPORT.milestones;
  return M&&M[pos]||null }
function nextMilestone(pl,pos){
  const M=milestoneSpec(pos); if(!M)return null;
  const v=careerOf(pl,M[0]), t=M[2].find(x=>x>v);
  return t?{label:M[1],at:t,v:v,left:t-v}:null;
}
/* one game for one player: form, and a milestone crossed. Called before the
   line is added to his season. */
function noteGame(sea,pl,pos,line,team){
  const one=Object.assign({g:1},line), v=statProd(pos,one);
  (pl.fm=pl.fm||[]).push(Math.round(v*10)/10); if(pl.fm.length>FORM_N)pl.fm.shift();
  const M=milestoneSpec(pos); if(!M||!line[M[0]])return;
  const before=careerOf(pl,M[0]), after=before+line[M[0]], hit=M[2].filter(x=>before<x&&after>=x).pop();
  if(hit)(sea.miles=sea.miles||[]).push({step:sea.step,n:pl.n,pos:pos,team:team,at:hit,key:M[0],label:M[1],r:pl.r});
}
/* hot, cold or neither: his last few games against his season so far */
function formOf(pl,pos){
  const s=pl.st2; if(!s||!s.g||s.g<FORM_N||!pl.fm||pl.fm.length<3)return null;
  const avg=statProd(pos,s)/s.g; if(avg<=0.5)return null;
  const recent=pl.fm.slice(-3).reduce((a,b)=>a+b,0)/3;
  return recent>=avg*1.35?"hot":recent<=avg*0.6?"cold":null;
}
function lastYear(pl){
  if(LEAGUE.classes&&LEAGUE.classes.length)return pl.c>=LEAGUE.classes.length-1?"senior":null;
  return pl.k&&pl.k.yrs<=1?"contract":null;
}
/* how he seems, from what's true of him */
function moodOf(pl,i,team){
  const R=SEA.roster[team], P=POS[i%POS.length].p, backup=i>=POS.length;
  const st=backup?R[i-POS.length]:null, f=formOf(pl,P), ly=lastYear(pl), run=streakOf(team);
  if(backup&&st&&pl.r>=st.r-2)return {t:"wants to start",tone:"no"};
  if(f==="hot")return {t:"flying",tone:"ok"};
  if(ly==="contract"&&run.n>=RUN(3)&&!run.won)return {t:"weighing his future",tone:"no"};
  if(!backup&&run.n>=RUN(3)&&!run.won)return {t:"frustrated",tone:"no"};
  if(f==="cold")return {t:"searching for form",tone:"no"};
  if(run.n>=RUN(3)&&run.won)return {t:"enjoying it",tone:"ok"};
  return {t:"settled",tone:""};
}
/* the team page: your three best players, and anyone unhappy about his minutes */
function starsHTML(team){
  if(!SEA||!SEA.roster||!SEA.roster[team]||typeof statLine!=="function")return "";
  const R=SEA.roster[team], hurt={}; SEA.talent.active(team).forEach(e=>hurt[e.idx]=e);
  // round 67: the three best players are on the roster tab already (Ian: "redundant"); only the news stays here
  // players with something to say: form either way, a mood that isn't "settled", a last year, a milestone close
  const news=i=>{ const p=R[i], P=POS[i%POS.length].p, nm=nextMilestone(p,P);
    return formOf(p,P)||moodOf(p,i,team).t!=="settled"||lastYear(p)||(nm&&nm.left<=Math.max(3,nm.at*0.15)) };
  // round 72: one story a contract year, not four (day one listed four stars, each "final year of his contract":
  // Instinct). A player whose only news is his last year is kept once, the best of them
  const only=i=>{ const p=R[i], P=POS[i%POS.length].p, nm=nextMilestone(p,P); return !!lastYear(p)&&!formOf(p,P)&&moodOf(p,i,team).t==="settled"&&!(nm&&nm.left<=Math.max(3,nm.at*0.15)) };
  let lyOnly=0;
  const idx=R.map((p,i)=>i).filter(i=>R[i]&&!hurt[i]&&news(i)).sort((a,b)=>R[b].r-R[a].r).filter(i=>!only(i)||lyOnly++<1).slice(0,4);
  if(!idx.length)return "";
  const tag=(t,c)=>`<span class="ptag ${c||""}">${esc(t)}</span>`;
  return `<div class="grouphead">Squad news</div>`+idx.map(i=>{
    const p=R[i], P=POS[i%POS.length].p, f=formOf(p,P), ly=lastYear(p), m=moodOf(p,i,team), nm=nextMilestone(p,P);
    const line=statLine(P,p.st2);
    const tags=[f==="hot"?tag("in form","ok"):f==="cold"?tag("out of form","no"):"",
      ly==="contract"?tag("final year of his contract"):ly==="senior"?tag("senior"):"",
      hurt[i]?tag("injured","no"):""].join("");
    return `<div class="prow2 feat"><div class="pmain"><div class="pname">${esc(p.n)} <span class="dpos">${esc(P)}</span> <span class="pr">${p.r}</span></div>
      <div class="fnote">${line?esc(line)+" &middot; ":""}${esc(m.t)}${nm&&nm.left<=Math.max(3,nm.at*0.15)?` &middot; ${nm.left} from ${nm.at} career ${esc(nm.label)}`:""}</div>${tags?`<div class="ptags">${tags}</div>`:""}</div></div>`;
  }).join("");
}
/* the news desk: milestones this week, yours first */
function milestoneNews(my){
  const M=(SEA.miles||[]).filter(x=>x.step===SEA.step-1); if(!M.length)return [];
  const mine=M.filter(x=>x.team===my), other=M.filter(x=>x.team!==my).sort((a,b)=>b.at-a.at||b.r-a.r);
  const out=[];
  mine.forEach(x=>out.push({p:87,k:"mile",tone:"gold",h:`${x.n} reaches ${x.at} career ${x.label}`,
    b:vary([`Your ${x.pos}. A number to remember.`,`A milestone for your ${x.pos}, and for the club.`,`${x.at}. Your ${x.pos} gets the game ball.`],"mi"+x.n)}));
  if(other.length&&other[0].at>=(milestoneSpec(other[0].pos)||[0,0,[0]])[2][1])out.push({p:44,k:"mile",tone:"muted",
    h:`${other[0].n} of ${other[0].team} reaches ${other[0].at} career ${other[0].label}`,b:""});
  return out;
}

/* ---- shirt numbers (round 67: Ian, "not easy to identify the players"; Football Manager numbers its dots) ----
   Each player's number is fixed by his name and team and kept unique on the roster: starters choose first, in roster
   order, from the numbers their position wears (a keeper 1, a lineman in the 50s-70s); the rest by a hash of the name
   in that range. Nothing is drawn from the game's dice and nothing is saved: the same roster numbers the same way. */
const SHIRT_RANGE={
  soccer:{GK:{l:[1,13,31]},CB:{l:[5,4,6,15,23]},FB:{l:[2,3,12,22,24]},CM:{l:[8,14,16,25,26]},W:{l:[7,11,17,19,21]},ST:{l:[9,10,18,20,27]}},
  football:{QB:[1,19],RB:[20,49],WR:[10,19,80,89],WR2:[10,19,80,89],OT:[50,79],EDGE:[90,99,50,59],DT:[90,99,60,79],LB:[40,59],CB:[20,49],S:[20,49]},
  hockey:{G:{l:[30,31,35,1,29,40,33]}}
};
const _SHIRT={};
function shirtNo(team,idx){
  const R=SEA&&SEA.roster&&SEA.roster[team]; if(!R||!R[idx])return null;
  const key=team+"|"+R.map(p=>p?p.n:"").join(","); let M=_SHIRT[team];
  if(!M||M.key!==key){ M=_SHIRT[team]={key:key,no:{}}; const used={}, sp=(typeof SPORT!=="undefined"&&SHIRT_RANGE[SPORT.id])||{};
    const order=R.map((p,i)=>i).filter(i=>R[i]).sort((a,b)=>(a<POS.length?0:1)-(b<POS.length?0:1)||a-b);
    order.forEach(i=>{ const pos=POS[i%POS.length].p, rg=sp[pos], h=strHash(team+"|"+R[i].n); let n=null;
      if(rg&&rg.l){ n=rg.l.find(v=>!used[v]); if(n===undefined)n=null }   // a list of numbers: the first free
      if(n==null&&!(rg&&rg.l)){ const lo=rg?rg[0]:(SPORT.id==="basketball"?0:1), hi=rg?rg[1]:(SPORT.id==="hockey"?98:99), span=hi-lo+1;
        for(let k=0;k<100&&n==null;k++){ const v=lo+((h+k*7)%span); if(!used[v])n=v }
        if(n==null&&rg&&rg.length>=4){ const lo2=rg[2], sp2=rg[3]-rg[2]+1; for(let k=0;k<100&&n==null;k++){ const v=lo2+((h+k*7)%sp2); if(!used[v])n=v } }
        }
      for(let v=1;n==null&&v<100;v++)if(!used[v])n=v;
      used[n]=1; M.no[i]=n }) }
  return M.no[idx] }

/* ---- the player's page and the leaders (round 69: Ian, "when you click on a player you can see all of their
   history and game-by-game stats", "league leaders across the league in categories") ----
   Any player on any roster: who he is, this season, season by season (the seasons since round 69 one by one, any
   before as one line), his career, and this season's games one by one. Tap a name to open it. */
let playerSel=null, standTab="table", leadCat=-1;
function openPlayer(team,name){ playerSel={team:team,name:name}; render(); try{ window.scrollTo(0,0) }catch(e){} }
function plLink(team,name,label){ return `<span class="plink" data-player="${esc(team)}|${esc(name)}" style="cursor:pointer;text-decoration:underline dotted rgba(255,255,255,.35);text-underline-offset:3px">${esc(label==null?name:label)}</span>` }
function findPl(team,name){
  const at=t=>{ const R=SEA.roster&&SEA.roster[t]; const i=R?R.findIndex(p=>p&&p.n===name):-1; return i>=0?{p:R[i],team:t,i:i}:null };
  return at(team)||NAMES.map(at).find(Boolean)||null }
function tAb(t){ return (LEAGUE.abbr&&LEAGUE.abbr[t])||String(t) }
function statCols(pos){ const keys=STAT_KEYS[pos]||[], ab=typeof STAT_ABBR!=="undefined"?STAT_ABBR:{}, fm=typeof STAT_FMT!=="undefined"?STAT_FMT:{};
  return keys.map(k=>[ab[k]||k.toUpperCase(),s=>fm[k]?fm[k](s[k]||0):String(Math.round((s[k]||0)*10)/10)]).concat(typeof STAT_EXTRA==="function"?STAT_EXTRA(pos):[]) }
function statTable(head,rows,left){ left=left||1;
  const th=`style="text-align:right;padding:4px 6px;color:var(--muted);font-weight:600;white-space:nowrap"`, td=`style="text-align:right;padding:4px 6px;white-space:nowrap"`, tl=`style="text-align:left;padding:4px 6px;white-space:nowrap"`;
  return `<div style="overflow-x:auto;margin:4px 0 12px"><table style="border-collapse:collapse;font:12px/1.3 var(--mono);width:100%">
    <tr style="border-bottom:1px solid var(--line)">${head.map((h,i)=>`<th ${i>=left?th:tl.replace("white-space","color:var(--muted);font-weight:600;white-space")}>${esc(h)}</th>`).join("")}</tr>
    ${rows.map(r=>`<tr style="border-bottom:1px solid rgba(255,255,255,.05)${r.you?";background:rgba(244,201,93,.08)":""}">${r.c.map((c,i)=>`<td ${i>=left?td:tl}>${c}</td>`).join("")}</tr>`).join("")}</table></div>` }
function playerView(){
  const back=`<button class="skip" data-plback="1" style="margin-bottom:8px">&larr; Back</button>`;
  const F=playerSel&&findPl(playerSel.team,playerSel.name);
  if(!F)return back+`<div class="fnote">${esc(playerSel?playerSel.name:"")} isn't on a roster now.</div>`;
  const p=F.p, pos=p.p||POS[F.i%POS.length].p, no=shirtNo(F.team,F.i), cols=statCols(pos), heads=["","G"].concat(cols.map(c=>c[0]));
  const line=(lab,st,you)=>({you:you,c:[lab,String(st.g||0)].concat(cols.map(c=>esc(c[1](st))))});
  let h=back+`<div class="dateline"><h2>${no!=null?"#"+no+" ":""}${esc(p.n)}</h2><span>${esc(F.team)}</span></div>
    <div class="fnote" style="margin-bottom:10px">${esc(pos)}${p.c!=null&&typeof classTag==="function"&&classTag(p.c)?" &middot; "+esc(classTag(p.c)):""} &middot; rating ${p.r}${p.pot>p.r?", ceiling "+p.pot:""}${p.k&&p.k.yrs?` &middot; ${p.k.yrs} year${p.k.yrs===1?"":"s"} left${p.k.sal?" at $"+(Math.round(p.k.sal*10)/10)+"M":""}`:""}${F.i>=POS.length?" &middot; backup":""}</div>`;
  // this season, and per game where a sport counts that way
  const st=p.st2||blankStats(pos);
  h+=`<div class="grouphead">${SEA.year}</div>`+(st.g?`<div class="fnote" style="margin:2px 0 4px">${esc(statLine(pos,st))}</div>`:`<div class="fnote">No games yet this season.</div>`);
  // season by season
  const rows=[], H=p.hist||[], car=p.car;
  if(car&&car.yrs>H.length){ const e=Object.assign({},car); H.forEach(x=>Object.keys(x.s).forEach(k=>{ if(typeof e[k]==="number")e[k]-=x.s[k]||0 })); rows.push(line(`Before ${H.length?H[0].y:SEA.year}`,e)) }
  H.forEach(x=>rows.push(line(`${x.y} ${tAb(x.t)}`,x.s)));
  if(st.g)rows.push(line(`${SEA.year} ${tAb(F.team)}`,st,true));
  if(rows.length){ const tot=Object.assign({},car||blankStats(pos)); if(st.g)Object.keys(st).forEach(k=>{ if(typeof st[k]==="number")tot[k]=(tot[k]||0)+st[k] }); rows.push({c:["<b>Career</b>"].concat(line("",tot).c.slice(1).map(v=>"<b>"+v+"</b>"))});
    h+=`<div class="grouphead">Season by season</div>`+statTable(heads,rows) }
  // this season's games, the latest first
  const gl=[], G0=p.gl||[], w=typeof glStride==="function"?glStride():0;
  for(let j=G0.length-w;j>=0&&w;j-=w){ const P0=POS[G0[j+5]]; gl.push([G0[j],NAMES[G0[j+1]],G0[j+2],G0[j+3],G0[j+4],P0?P0.p:pos].concat(G0.slice(j+6,j+w))) }
  if(gl.length){ const keys=STAT_KEYS[pos]||[];
    h+=`<div class="grouphead">Game by game, ${SEA.year}</div>`+statTable(["","Opp","Result","G"].concat(cols.map(c=>c[0])).filter((x,i)=>i!==3),gl.slice(0,60).map(r=>{
      const o={g:1}; (STAT_KEYS[r[5]]||keys).forEach((k,j)=>o[k]=r[6+j]); const W=SEA.weeks[r[0]], res=r[3]>r[4]?"W":r[3]<r[4]?"L":"D";
      return {c:[esc(W&&W.label?String(W.label).split(" \u00b7 ")[0].replace(/^Matchday /,"MD ").replace(/^Week /,"Wk "):String(r[0]+1)),(r[2]?"":"@ ")+esc(tAb(r[1])),`${res} ${r[3]}-${r[4]}`].concat(cols.map(c=>esc(c[1](o))))} }),3)
    + (gl.length>60?`<div class="fnote">The latest 60 of ${gl.length}.</div>`:"") }
  return `<div style="padding:0 12px">${h}</div>` }
/* the league's leaders: each category's top five, or one category's top 25 */
function leadersView(){
  if(typeof LEADERS==="undefined")return `<div class="fnote">No leaders for this sport yet.</div>`;
  const teams=LEAGUE.groupFilter&&typeof CONF!=="undefined"?NAMES.filter(t=>CONF[t]===CONF[S.myTeam]):NAMES;   // soccer: your division
  let G=0; teams.forEach(t=>(SEA.roster[t]||[]).forEach(p=>{ if(p&&p.st2&&p.st2.g>G)G=p.st2.g }));
  if(!G)return `<div class="fnote">The leaders appear once the season starts.</div>`;
  const board=(L,n)=>{ const E=[]; teams.forEach(t=>(SEA.roster[t]||[]).forEach((p,i)=>{ if(!p||!p.st2||!p.st2.g)return; const pos=p.p||POS[i%POS.length].p;
      if(L.pos&&L.pos.indexOf(pos)<0)return; if(L.min&&!L.min(p.st2,G))return; E.push({p:p,t:t,v:L.v(p.st2)}) }));
    E.sort((a,b)=>L.low?a.v-b.v:b.v-a.v); const f=L.f||(v=>String(Math.round(v*10)/10));
    return E.slice(0,n).map((e,k)=>({you:e.t===S.myTeam,c:[String(k+1),plLink(e.t,e.p.n),esc(tAb(e.t)),"<b>"+esc(f(e.v))+"</b>"]})) };
  let h=`<div class="subtabs" style="flex-wrap:wrap">${[[-1,"All"]].concat(LEADERS.map((L,i)=>[i,L.l])).map(([i,l])=>`<button class="subtab" data-lead="${i}" aria-pressed="${leadCat===i}">${esc(l)}</button>`).join("")}</div>`;
  if(leadCat>=0&&LEADERS[leadCat]){ const L=LEADERS[leadCat]; return `<div style="padding:0 12px">`+h+`<div class="grouphead">${esc(L.l)}</div>`+statTable(["","Player","Team",""],board(L,25),3)+`</div>` }
  LEADERS.forEach(L=>{ h+=`<div class="grouphead">${esc(L.l)}</div>`+statTable(["","Player","Team",""],board(L,5),3) });
  return `<div style="padding:0 12px">${h}${LEAGUE.groupFilter?`<div class="fnote">Your division.</div>`:""}</div>` }
