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
  const idx=R.map((p,i)=>i).filter(i=>R[i]&&!hurt[i]&&news(i)).sort((a,b)=>R[b].r-R[a].r).slice(0,4);
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
