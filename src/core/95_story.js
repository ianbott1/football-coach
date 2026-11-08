/* ============ the season story (round 41) ============
   What a career remembers beyond its records (Muse: the Film Room, rivals, comebacks; Instinct: make the peak a peak).
   All of it is written from games already played and kept in the save, per coach (COACH_FIELDS):
     S.film      your biggest calls, career-long: the best and the costliest, by their worth against the assistant
     S.lifeCalls every call you made differently from the assistant, career-long: count, worth, bold or careful
     S.storyYr   this season's comeback and collapse (banked into the season's history entry, then cleared)
     S.rivals    each opposing head coach you've met: your record against him, at which clubs
   None of it moves a game. */

const STORY_ON=true;
const STORY_TH={football:10,basketball:12,hockey:2,soccer:2};          // a comeback worth remembering: down this many
const STORY_BOLD={push:1,go:1,attack:1,win:1,early:1,two:1,onside:1,pressure:1,swap:1,force:1};
const STORY_SAFE={sit:1,hold:1,point:1,punt:1,kick:1,prevent:1,late:1,rest:1};
const FILM_KEEP=30;                                                      // the best thirty and the costliest thirty (the room shows a varied few)

function storyScore(d){ return d.sh!==undefined?[d.sh,d.sa]:[d.h,d.a] }
function storyGameLabel(step){ try{ return LEAGUE.daily&&LEAGUE.dates&&LEAGUE.dates[step]?LEAGUE.dates[step]:typeof wkLabel==="function"?wkLabel(step):"" }catch(e){ return "" } }

/* after a played game: the film, the ledger of style, and the night's comeback or collapse */
function recordStory(played,g,step,meHome){
  if(!STORY_ON||!played||!S)return;
  const my=S.myTeam, opp=played.other, ha=typeof haWord==="function"?haWord(g,my):(meHome?"vs":"at"),
    wk=storyGameLabel(step), yr=SEA.year, po=SEA.phase!=="week"||!!g.title;
  // the film: graded situation calls only (a "close either way" call is no story; a read is judged right or wrong on
  // its card, and judging it again here against the assistant could disagree: round 39's one-verdict rule)
  const RK={}; (played.reads||[]).forEach(r=>{ RK[r.k]=1 });
  (played.impact||[]).forEach(c=>{ if(c.k&&RK[c.k])return;
    const k=typeof callClarity==="function"?callClarity(c):Math.round(c.worth*100);
    if(Math.abs(k)<4||!Number.isFinite(c.worth))return;
    (S.film=S.film||[]).push({y:yr,wk:wk,opp:opp,ha:ha,mine:played.mine,theirs:played.theirs,h:c.h,pick:c.pick,def:c.def,
      w:Math.round(c.worth*100),po:po,title:g.title||null,team:my,k:c.k||null});
  });
  if(S.film&&S.film.length>FILM_KEEP*2){ const F=S.film.slice().sort((a,b)=>b.w-a.w);
    S.film=F.slice(0,FILM_KEEP).concat(F.slice(-FILM_KEEP)).filter((x,i,a)=>a.indexOf(x)===i) }
  // the style: bold or careful, and what each has been worth
  (played.impact||[]).forEach(c=>{ if(!Number.isFinite(c.worth))return;
    const L=S.lifeCalls=S.lifeCalls||{n:0,w:0,bold:0,safe:0,boldW:0,safeW:0};
    L.n++; L.w=Math.round((L.w+c.worth)*1000)/1000;
    if(STORY_BOLD[c.pk]){ L.bold++; L.boldW=Math.round((L.boldW+c.worth)*1000)/1000 }
    else if(STORY_SAFE[c.pk]){ L.safe++; L.safeW=Math.round((L.safeW+c.worth)*1000)/1000 } });
  // the night's shape: how far behind you were, how far ahead
  let down=0, up=0; (played.drives||[]).forEach(d=>{ const s=storyScore(d); if(!s||s[0]===undefined)return;
    const m=meHome?s[0]-s[1]:s[1]-s[0]; if(-m>down)down=-m; if(m>up)up=m });
  const th=STORY_TH[(typeof SPORT!=="undefined"&&SPORT.id)||"football"]||10, won=played.mine>played.theirs, lost=played.mine<played.theirs;
  const Y=(S.storyYr=S.storyYr||{})[yr]=(S.storyYr[yr]||{});
  const one={wk:wk,opp:opp,ha:ha,mine:played.mine,theirs:played.theirs,po:po};
  if(down>=th&&(won||(LEAGUE.draws&&!lost&&down>=th))&&(!Y.cb||down>Y.cb.by))Y.cb=Object.assign({by:down,won:won},one);
  if(up>=th&&lost&&(!Y.cl||up>Y.cl.by))Y.cl=Object.assign({by:up},one);
}

/* the season banked: its comeback and collapse go into its history entry, and the head-to-head with each coach */
function bankStory(entry){
  if(!STORY_ON)return;
  const yr=SEA.year;
  if(S.storyYr&&S.storyYr[yr]&&(S.storyYr[yr].cb||S.storyYr[yr].cl))entry.story=JSON.parse(JSON.stringify(S.storyYr[yr]));
  if(S.storyYr){ Object.keys(S.storyYr).forEach(y=>{ if(+y<=yr)delete S.storyYr[y] }) }
  // every game you coached this season, against whoever was coaching the other side when it ended
  const my=S.myTeam, seen=new Set(), G=[].concat(...SEA.weeks.map(w=>w.games||[]));
  if(typeof SEA.postPools==="function"){ try{ G.push(...[].concat(...SEA.postPools())) }catch(e){} }
  G.forEach(x=>{ if(!x||seen.has(x)||x.hp===undefined||(x.home!==my&&x.away!==my))return; seen.add(x);
    const opp=x.home===my?x.away:x.home, c=U.coach&&U.coach[opp]; if(!c||c.interim||!c.n)return;
    const R=(S.rivals=S.rivals||{})[c.n]=(S.rivals[c.n]||{w:0,l:0,d:0,teams:{},mine:{}});
    const ms=x.home===my?x.hp:x.ap, os=x.home===my?x.ap:x.hp;
    if(x.winner===my||(x.winner===undefined&&ms>os))R.w++; else if(x.winner===opp||ms<os)R.l++; else R.d++;
    R.teams[opp]=1; R.mine[my]=1; R.last=yr });
}

/* your rival: the coach you've met most (four meetings at least), the closer record breaking ties */
function rivalName(){
  const R=S.rivals||{}; let best=null, bk=-1;
  Object.keys(R).forEach(n=>{ const r=R[n], g=r.w+r.l+r.d; if(g<4)return;
    const k=g*10-Math.abs(r.w-r.l); if(k>bk){bk=k;best=n} });
  return best;
}
/* the line before a game against a coach you've met before (round 41: a rivalry follows both of you between jobs) */
function rivalLine(opp){
  if(!STORY_ON)return "";
  const c=U&&U.coach&&U.coach[opp]; if(!c||c.interim||!S.rivals||!S.rivals[c.n])return "";
  const r=S.rivals[c.n], g=r.w+r.l+r.d; if(g<2)return "";
  const elsewhere=Object.keys(r.teams).filter(t=>t!==opp), mineElse=Object.keys(r.mine||{}).filter(t=>t!==S.myTeam);
  const where=elsewhere.length?` (and with ${elsewhere.slice(0,2).map(esc).join(" and ")})`:"";
  const youWhere=mineElse.length?`, some of it at ${mineElse.slice(0,2).map(esc).join(" and ")}`:"";
  const tag=rivalName()===c.n?`<b class="rivtag">Your rival</b> `:"";
  return `<div class="series">${tag}${esc(c.n)}, their coach: <b>${r.w}-${LEAGUE.draws?r.d+"-":""}${r.l}${!LEAGUE.draws&&r.d?"-"+r.d:""}</b> against him${youWhere}${where}.</div>`;
}

/* who you are, in one line, once there's enough to say it (Muse: "a gambler who won his gambles") */
function identityLine(){
  const L=S.lifeCalls; if(!L||L.n<8)return "";
  const tot=L.bold+L.safe, bs=tot?L.bold/tot:0.5, w=L.w;
  const res=x=>x>0.3?"and it's paid":x<-0.3?"and it's cost you":"and it's come out about even";
  const who=bs>=0.6?`A gambler, ${res(L.boldW)}`:bs<=0.4?`A percentages coach, ${res(L.safeW)}`:`Even-handed, bold when it's called for, careful when it isn't, ${res(w)}`;
  const a=Math.abs(w), say=a<0.25?"about even":`about ${w>0?"+":"−"}${a<1?Math.round(a*10)/10:Math.round(a*2)/2} win${a>=0.75&&a<1.25?"":"s"}`;
  return `<div class="ident"><b>${who}.</b> Every call you've made differently from your assistant, career-long (${L.n}): ${say} against leaving them to him, over many replays.</div>`;
}

/* the Film Room: your biggest calls, career-long */
function filmRoomHTML(){
  if(!STORY_ON)return "";
  const F=(S.film||[]).filter(x=>x.team===undefined||true); const id=identityLine();
  if(!F.length&&!id)return "";
  // no more than two of one kind of moment: five overtimes in a row read as one story told five times
  const vary=(L,n)=>{ const c={}, out=[]; L.forEach(x=>{ const k=String(x.h).replace(/\d+/g,"#"); if(out.length<n&&(c[k]=(c[k]||0)+1)<=2)out.push(x) }); return out };
  const best=vary(F.filter(x=>x.w>0).sort((a,b)=>b.w-a.w),5), worst=vary(F.filter(x=>x.w<0).sort((a,b)=>a.w-b.w),3);
  const res=x=>`${x.mine>x.theirs?"W":x.mine<x.theirs?"L":"D"} ${x.mine}&ndash;${x.theirs}`;
  const row=x=>`<div class="film ${x.w>0?'up':'dn'}"><div class="filmh">${esc(x.h)}</div>
    <div class="filmm">${x.y}${x.wk?" &middot; "+esc(x.wk):""}${x.title?" &middot; "+esc(x.title):""} &middot; ${esc(x.ha)} ${esc(x.opp)} &middot; ${res(x)}</div>
    <div class="filmb">${/assistant/i.test(x.pick)?"You left it to your assistant":`You: ${esc(x.pick)}`}.${x.def&&!/assistant/i.test(x.def)?` Your assistant: ${esc(x.def)}.`:""} From that moment your call won about ${Math.abs(x.w)} ${x.w>0?"more":"fewer"} games in 100.</div></div>`;
  return `<div class="grouphead">The Film Room</div>${id}`+
    (best.length?`<div class="filmlab">Your best calls</div>`+best.map(row).join(""):"")+
    (worst.length?`<div class="filmlab">The ones that got away</div>`+worst.map(row).join(""):"")+
    (!best.length&&!worst.length?`<div class="note">No call clear enough to keep yet: the Film Room keeps the ones that made a real difference.</div>`:"");
}

/* a season's shape, in a line for its row in Your seasons */
function storyRowLine(st){
  if(!st)return ""; const out=[];
  if(st.cb)out.push(`came back from ${st.cb.by} down ${st.cb.ha} ${esc(st.cb.opp)}${st.cb.wk?" ("+esc(st.cb.wk)+")":""}`);
  if(st.cl)out.push(`let ${/^(8|11|18)$|^8\d$/.test(String(st.cl.by))?"an":"a"} ${st.cl.by}-point lead go ${st.cl.ha} ${esc(st.cl.opp)}`);
  return out.length?`<div class="ystory">${out.join(" &middot; ")}</div>`:"";
}

/* title night (Instinct: "a career's biggest night presented like a Tuesday in January") */
function titleNightHTML(my){
  if(!STORY_ON)return "";
  const yr=SEA.year, Y=(S.storyYr||{})[yr]||{}, titles=(S.history||[]).filter(h=>h.year<yr&&h.honours&&h.honours.title).length+1;
  const call=(S.film||[]).filter(x=>x.y===yr&&x.w>0).sort((a,b)=>b.w-a.w)[0];
  const star=(()=>{ try{ return (SEA.mvpRace(60)||[]).find(x=>x.t===my) }catch(e){ return null } })();
  const ord=n=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th");
  const lines=[`${esc(my)} ${yr}: ${esc(recStr(my))}.`];
  if(Y.cb)lines.push(`The night it could have gone: ${Y.cb.by} down ${Y.cb.ha} ${esc(Y.cb.opp)}, and you came back to win ${Y.cb.mine}&ndash;${Y.cb.theirs}.`);
  if(call)lines.push(`Your call of the season: ${esc(call.h)}, ${call.ha} ${esc(call.opp)}. From that moment it won about ${call.w} more games in 100 than your assistant's call.`);
  if(star)lines.push(`${esc(star.n)} carried it${star.line?": "+esc(star.line):""}.`);
  lines.push(titles>1?`Your ${ord(titles)} title.`:`Your first title. Nobody can take it off you now.`);
  return `<div class="titlenight"><div class="tnconf" aria-hidden="true">${"<i></i>".repeat(18)}</div>
    <div class="tnhead">Champions</div>${lines.map(l=>`<div class="tnline">${l}</div>`).join("")}</div>`;
}
