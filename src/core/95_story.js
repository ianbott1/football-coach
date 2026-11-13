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
    (S.film=S.film||[]).push({y:yr,wk:wk,opp:opp,ha:ha,mine:played.mine,theirs:played.theirs,h:c.h,pick:c.pick,def:c.def,dd:c.dd,
      w:Math.round(k),po:po,title:g.title||null,team:my,k:c.k||null});   // the card's own measure (football's graded calls: against the best option)
  });
  // the season's "what if" (round 49): each call made your own way, with how the same night ends on your assistant's
  // call (the same dice). Kept per season, the three that diverged most; shown at the season's end.
  (played.impact||[]).forEach(c=>{ if(c.k&&RK[c.k])return; if(!c.cf||!Number.isFinite(c.worth))return;
    const k=typeof callClarity==="function"?callClarity(c):Math.round(c.worth*100);
    const W=(S.whatIf=S.whatIf||{})[yr]=(S.whatIf[yr]||[]);
    W.push({wk:wk,opp:opp,ha:ha,mine:played.mine,theirs:played.theirs,cm:c.cf.mine,ct:c.cf.theirs,h:c.h,pick:c.pick,def:c.def,dd:c.dd,w:Math.round(k),po:po});
    W.sort((a,b)=>whatIfRank(b)-whatIfRank(a)); W.length=Math.min(W.length,3) });
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
  // the live chance at its lowest and highest (round 48, Muse: "You were at 7% in Blacksburg and won anyway" is a
  // sentence a player keeps; round 41 wanted it and had no live chance to quote)
  const ext=storyExtremes(played,meHome,opp);
  if(ext){ if(won&&ext.lo<=0.12&&(!Y.cbw||ext.lo<Y.cbw.lo))Y.cbw=Object.assign({lo:ext.lo},one);
    if(lost&&ext.hi>=0.88&&(!Y.clw||ext.hi>Y.clw.hi))Y.clw=Object.assign({hi:ext.hi},one) }
}
function storyExtremes(played,meHome,opp){
  if(typeof liveChance!=="function"||typeof LIVE_WP_ON==="undefined"||!LIVE_WP_ON||!played.drives||!played.drives.length)return null;
  let pre; try{ pre=LEAGUE.wdl?withPlan("balanced",()=>LEAGUE.wdl(S.myTeam,opp,meHome,false)):[winProb(S.myTeam,opp,meHome,false),0] }catch(e){ return null }
  const sig=LIVE_SIG[LEAGUE.id]||10; let lo=1, hi=0;
  played.drives.forEach((d,i)=>{ if(i===played.drives.length-1)return; const sc=liveScore(d); if(sc[0]===undefined)return;
    const m=meHome?sc[0]-sc[1]:sc[1]-sc[0], poss=d.q!==undefined?(d.home===meHome?-1:1):0, c=liveChance(m,liveTau(d),pre,sig,poss), v=c[0]+c[1]/2;
    if(v<lo)lo=v; if(v>hi)hi=v });
  return {lo:lo,hi:hi};
}

/* what your assistant would have done, in the same words everywhere (round 50: "Keep your setup" against "he would have left
   things as they were" read as one action, and "kept to his plan" never named the plan: Instinct, Muse). From the replay
   on the same dice when the engine says (dd); else his option, when it names an action; else nothing invented. */
function assistantSaid(c){
  if(c.dd)return c.cf?` On the same night your assistant ${esc(c.dd)}.`:` Your assistant ${esc(c.dd)}.`;
  const d=filmDef(c.def); if(d&&!/assistant/i.test(c.def||""))return ` Your assistant would have gone with ${esc(d)}.`;
  return "" }
/* the match card's own word for a call, so the season's showcases speak in it (round 50: one ledger) */
function verdictWord(k){ return k>7?"clearly better than your assistant's":k>3?"a little better than your assistant's":k<-7?"clearly worse than your assistant's":k<-3?"a little worse than your assistant's":"close either way" }
/* how far the road not taken diverged: a different result on the same night first, then by how much the score
   moved and how clear the call was over many replays */
function whatIfRank(x){ const r=(a,b)=>a>b?1:a<b?-1:0, flip=r(x.mine,x.theirs)!==r(x.cm,x.ct);
  return (flip?100:0)+Math.abs((x.mine-x.theirs)-(x.cm-x.ct))*(typeof SPORT!=="undefined"&&(SPORT.id==="hockey"||SPORT.id==="soccer")?6:1)+Math.abs(x.w)/2 }
const WHATIF_ON=true;
function whatIfHTML(){
  if(!WHATIF_ON||!S||!SEA||SEA.phase!=="done")return "";
  // a road that went somewhere: the result flips on his call, or the match itself graded the call (round 50: a close call
  // whose replay changed only the score, "3-2 instead of 5-2", deflated the idea: Muse)
  const res=(a,b)=>a>b?"win":a<b?(LEAGUE.draws?"defeat":"loss"):"draw";
  const all=(S.whatIf&&S.whatIf[SEA.year])||[], W=all.filter(x=>res(x.mine,x.theirs)!==res(x.cm,x.ct)||Math.abs(x.w)>3);
  const head=`<div class="grouphead">What if</div>`;
  // empty, it says why (Instinct looked on five screens and found nothing: the feature shouldn't need hunting)
  if(!W.length)return head+`<div class="note">${all.length?"None of your own calls this season changed a result on your assistant's road, and none stood out over many replays.":"No call of yours to replay this season: reads are judged right or wrong on their own cards, and calls you left to your assistant have no other road."} Each season keeps up to three.</div>`;
  const row=x=>{ const flip=res(x.mine,x.theirs)!==res(x.cm,x.ct), k=x.w;
    // the night first, then the replays, and the lens named: what one night did is not what the call is worth
    const night=`The same night replayed on his call: ${x.cm}&ndash;${x.ct}${flip?`, a ${res(x.cm,x.ct)} instead of your ${res(x.mine,x.theirs)}`:""}.`;
    const lens=Math.abs(k)<=3?` In the match this call was graded close either way: over many replays the two win about as often, so this night the dice decided it.`
      :` In the match it was graded ${verdictWord(k)}${flip&&((k>0)!==(res(x.mine,x.theirs)==="win"))?`, whatever this night did`:""}.`;
    return `<div class="film ${k>3?'up':k<-3?'dn':''}"><div class="filmh">${esc(x.h)}</div>
    <div class="filmm">${x.wk?esc(x.wk)+" &middot; ":""}${esc(x.ha)} ${esc(x.opp)} &middot; ${res(x.mine,x.theirs).toUpperCase()} ${x.mine}&ndash;${x.theirs}</div>
    <div class="filmb">You: ${esc(x.pick)}.${assistantSaid({dd:x.dd,def:x.def,cf:1})} ${night}${lens}</div></div>` };
  return head+`<div class="note">${W.length===1?"The call":`The ${W.length===2?"two":"three"} calls`} this season where your assistant's road went furthest from yours: each night replayed on the same dice with his call instead.</div>`+W.map(row).join("");
}
/* the season banked: its comeback and collapse go into its history entry, and the head-to-head with each coach */
function bankStory(entry){
  if(!STORY_ON)return;
  const yr=SEA.year;
  if(S.storyYr&&S.storyYr[yr]&&(S.storyYr[yr].cb||S.storyYr[yr].cl||S.storyYr[yr].cbw||S.storyYr[yr].clw))entry.story=JSON.parse(JSON.stringify(S.storyYr[yr]));
  if(S.storyYr){ Object.keys(S.storyYr).forEach(y=>{ if(+y<=yr)delete S.storyYr[y] }) }
  if(S.whatIf){ Object.keys(S.whatIf).forEach(y=>{ if(+y<yr)delete S.whatIf[y] }) }   // only this season's reel is shown
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

/* on a call: the last time the Film Room kept one like it (round 47, Muse: "memory that changes the week": the room
   remembered your fourth-and-2, the staff never mentioned it the next time the same call came up). Same heading, this
   team; the most recent. Shown as evidence, beside the staff, before you choose. */
function filmMemoryHTML(dp){
  if(!STORY_ON||!FILMPRE_ON||!S.film||!dp||!dp.h)return "";
  const F=S.film.filter(x=>x.h===dp.h&&(x.team===undefined||x.team===S.myTeam)).reverse().sort((a,b)=>b.y-a.y)[0]; if(!F)return "";
  const res=`${F.mine>F.theirs?"W":F.mine<F.theirs?"L":"D"} ${F.mine}&ndash;${F.theirs}`, alt=filmDef(F.def)||"his call";
  return `<div class="filmmem"><b>The Film Room remembers:</b> ${F.y}${F.wk?" &middot; "+esc(F.wk):""}, ${esc(F.ha)} ${esc(F.opp)} (${res}), the same call. ${/assistant/i.test(F.pick)?"You left it to your assistant":"You went with "+esc(F.pick)}, and it was ${F.w>7?"clearly better than":F.w>0?"a little better than":F.w<-7?"clearly worse than":"a little worse than"} ${esc(alt)}. Tonight is its own game.</div>`;   // in words: no number on tonight's options (Ian)
}
/* the series so far, before a play-off game (round 48, Instinct: "the game-7 scouting screen is the emptiest screen in
   the most meaningful game of the season"): every game of it, and what your calls in the ones you watched were worth */
function seriesBookHTML(opp){
  if(!STORY_ON||!SEA||SEA.phase==="week"||typeof SEA.postGamesFor!=="function")return "";
  const my=S.myTeam, G=SEA.postGamesFor(my).map(x=>Array.isArray(x)?x[0]:x).filter(g=>g&&(g.home===opp||g.away===opp)&&g.hp!==undefined);
  if(!G.length)return "";
  const sc=g=>{ const m=g.home===my?g.hp:g.ap, t=g.home===my?g.ap:g.hp; return `${m>t?"W":"L"} ${m}&ndash;${t}` };
  const w=G.filter(g=>g.winner===my).length, l=G.length-w;
  let n=0, worth=0; Object.keys(S.played||{}).forEach(k=>{ const [y,st]=k.split(":"); if(+y!==SEA.year||!(+st>=LEAGUE.weeks))return;   // play-off steps only
    (S.played[k]||[]).forEach(p=>{ if(p.team!==my||p.other!==opp)return; (p.impact||[]).forEach(c=>{ if(Number.isFinite(c.worth)){ n++; worth+=c.worth } }) }) });
  return `<div class="series seriesbook"><b>The series so far:</b> ${w>l?"you lead "+w+"-"+l:w<l?"they lead "+l+"-"+w:"level at "+w+"-"+l}. ${G.map((g,i)=>`Game ${i+1} ${sc(g)}`).join(" &middot; ")}.${n?` Your calls in the games you watched: ${n}, worth about ${worth>=0?"+":"\u2212"}${Math.abs(worth).toFixed(1)} wins against leaving them to your assistant.`:""}</div>`;
}
/* before a game: the last call from the Film Room against this side (round 45: the room was a page nobody opened
   before the games it was about) */
const FILMPRE_ON=true;
function filmLine(opp){
  if(!STORY_ON||!FILMPRE_ON||!S.film)return "";
  const F=S.film.filter(x=>x.opp===opp&&(x.team===undefined||x.team===S.myTeam)).reverse().sort((a,b)=>b.y-a.y)[0]; if(!F)return "";
  const res=`${F.mine>F.theirs?"W":F.mine<F.theirs?"L":"D"} ${F.mine}&ndash;${F.theirs}`;
  return `<div class="series filmpre"><b>From the Film Room:</b> ${F.y}${F.wk?" &middot; "+esc(F.wk):""}, ${esc(F.ha)} ${esc(F.opp)} (${res}). ${esc(F.h)}: ${/assistant/i.test(F.pick)?"you left it to your assistant":"you went with "+esc(F.pick)}, about ${Math.abs(F.w)} ${F.w>0?"more":"fewer"} wins in 100 than ${filmDef(F.def)?esc(filmDef(F.def)):"his call"}.</div>`;
}
/* the career's count of calls made your own way, and their worth (round 71: the Film Room's count fell across an offseason,
   143 to 129 and 130 to 85, Muse: it took the larger of two ledgers, and the season ledger keeps only two seasons). One
   count, S.callCareer, added to as each call is graded and never recomputed; an older save starts it from the larger of
   the two it had, once. */
function careerCalls(keep){
  if(S.callCareer)return S.callCareer;
  const L=S.lifeCalls||{n:0,w:0}, CL=S.callLedger||{}, ys=Object.keys(CL), ln=ys.reduce((t,y)=>t+(CL[y].n||0),0),
    lw=Math.round(ys.reduce((t,y)=>t+(CL[y].worth||0),0)*1000)/1000, C=ln>=(L.n||0)?{n:ln,w:lw}:{n:L.n||0,w:L.w||0};
  if(keep)S.callCareer=C; return C }
/* who you are, in one line, once there's enough to say it (Muse: "a gambler who won his gambles") */
function identityLine(){
  const L=S.lifeCalls; if(!L||L.n<8)return "";
  const tot=L.bold+L.safe, bs=tot?L.bold/tot:0.5;
  // career-long, from the same ledger as the season's count beside it: the life tally began in round 41, so a career's
  // "30" sat under a season's "92" (Muse, round 20). Older seasons kept no ledger; they count from this one.
  // the count and the worth from one source, never one from each: a count from one ledger beside a worth from the other read
  // 123 at +0.7, then 117 at +0.7, then 117 at +0.8, with no game played (Muse, round 50)
  const C=careerCalls(false), n=C.n, w=C.w;
  const res=x=>x>0.3?"and it's paid":x<-0.3?"and it's cost you":"and it's come out about even";
  const who=bs>=0.6?`A gambler, ${res(L.boldW)}`:bs<=0.4?`A percentages coach, ${res(L.safeW)}`:`Even-handed, bold when it's called for, careful when it isn't, ${res(w)}`;
  const a=Math.abs(w), say=a<0.25?"about even":`about ${w>0?"+":"−"}${a<1?Math.round(a*10)/10:Math.round(a*2)/2} win${a>=0.75&&a<1.25?"":"s"}`;
  return `<div class="ident"><b>${who}.</b> Every call you've made differently from your assistant, career-long (${n}): ${say} against leaving them to him, over many replays.</div>`;
}

/* the assistant's call, by name: "Play it straight, as your assistant would" was hidden for saying "assistant", so
   college football's entries never named the alternative (Muse, round 20) */
function filmDef(d){ if(!d)return ""; const t=String(d).replace(/,?\s*(as|like|what) your assistant (would|does)[^.]*$/i,"").trim();
  return /assistant/i.test(t)||!t?"":t }
/* the Film Room: your biggest calls, career-long */
function filmRoomHTML(){
  if(!STORY_ON)return "";
  const F=(S.film||[]).filter(x=>x.team===undefined||true); const id=identityLine();
  if(!F.length&&!id)return "";
  // no more than two of one kind of moment: five overtimes in a row read as one story told five times
  const vary=(L,n)=>{ const c={}, out=[]; L.forEach(x=>{ const k=String(x.h).replace(/\d+/g,"#"); if(out.length<n&&(c[k]=(c[k]||0)+1)<=2)out.push(x) }); return out };
  const best=vary(F.filter(x=>x.w>0).sort((a,b)=>b.w-a.w),5), worst=vary(F.filter(x=>x.w<0).sort((a,b)=>a.w-b.w),3);
  // what the room shows and why (Muse, round 21: "the best list caps at three and evicts an older entry without a word":
  // it was the two-of-a-kind rule, unsaid)
  const kept=F.filter(x=>x.w>0).length+F.filter(x=>x.w<0).length, hidden=kept-best.length-worst.length;
  const rule=`<div class="note">Up to five of your best calls and three of your costliest, no more than two of one kind of moment; only calls the match graded better or worse than your assistant's are kept (never one it called close either way).${hidden>0?` ${hidden} more ${hidden===1?"is":"are"} in the room, behind ones like ${hidden===1?"it":"them"}.`:""}</div>`;
  const res=x=>`${x.mine>x.theirs?"W":x.mine<x.theirs?"L":"D"} ${x.mine}&ndash;${x.theirs}`;
  const row=x=>`<div class="film ${x.w>0?'up':'dn'}"><div class="filmh">${esc(x.h)}</div>
    <div class="filmm">${x.y}${x.wk?" &middot; "+esc(x.wk):""}${x.title?" &middot; "+esc(x.title):""} &middot; ${esc(x.ha)} ${esc(x.opp)} &middot; ${res(x)}</div>
    <div class="filmb">${/assistant/i.test(x.pick)?"You left it to your assistant":`You: ${esc(x.pick)}`}.${assistantSaid({dd:x.dd,def:x.def})} The match graded it ${verdictWord(x.w)}: from that moment your call won about ${Math.abs(x.w)} ${x.w>0?"more":"fewer"} games in 100.</div></div>`;
  return `<div class="grouphead">The Film Room</div>${id}${best.length||worst.length?rule:""}`+
    (best.length?`<div class="filmlab">Your best calls</div>`+best.map(row).join(""):"")+
    (worst.length?`<div class="filmlab">The ones that got away</div>`:"")+(worst.length?worst.map(row).join(""):"")+
    // an empty list says so (Muse, round 20: "a memory that silently stops recording is worse than none")
    (best.length&&!worst.length?`<div class="note">No costly call kept yet: none of yours has cost a game clearly enough to make the list.</div>`:"")+
    (!best.length&&worst.length?`<div class="note">No best call kept yet: none of yours has won a game clearly enough to make the list.</div>`:"")+
    (!best.length&&!worst.length?`<div class="note">No call clear enough to keep yet: the Film Room keeps the ones that made a real difference.</div>`:"")+
    (()=>{ const yr=SEA&&SEA.year, n=F.filter(x=>x.y===yr).length, L=S.callLedger&&S.callLedger[yr]; return L&&L.n&&!n?`<div class="note">This season: ${L.n} call${L.n===1?"":"s"} made your own way, none clear enough to keep. Most calls are close; the room keeps the ones that weren't.</div>`:"" })();
}

/* a season's shape, in a line for its row in Your seasons */
function storyRowLine(st){
  if(!st)return ""; const out=[];
  if(st.cb)out.push(`came back from ${st.cb.by} down ${st.cb.ha} ${esc(st.cb.opp)}${st.cb.wk?" ("+esc(st.cb.wk)+")":""}`);
  if(st.cl)out.push(`let ${/^(8|11|18)$|^8\d$/.test(String(st.cl.by))?"an":"a"} ${st.cl.by}-point lead go ${st.cl.ha} ${esc(st.cl.opp)}`);
  // the live chance's extremes: added to the same night's line, or a line of their own
  const same=(a,b)=>a&&b&&a.wk===b.wk&&a.opp===b.opp;
  if(st.cbw){ const t=`${Math.max(1,Math.round(st.cbw.lo*100))}% to win at one point`; if(same(st.cb,st.cbw))out[0]+=` (${t})`; else out.push(`won from ${t.replace(" to win at one point","")} ${st.cbw.ha} ${esc(st.cbw.opp)}`) }
  if(st.clw){ const t=`${Math.min(99,Math.round(st.clw.hi*100))}% to win at one point`, i=st.cb?1:0; if(same(st.cl,st.clw)&&out[i])out[i]+=` (${t})`; else out.push(`lost from ${t.replace(" to win at one point","")} ${st.clw.ha} ${esc(st.clw.opp)}`) }
  return out.length?`<div class="ystory">${out.join(" &middot; ")}</div>`:"";
}

/* Soccer: the night it's settled (round 45). A title, automatic promotion or relegation is decided when nobody can
   catch you (or you can't catch them) on points, often weeks before the last day; the trophy still waits for it.
   Checked whenever the team page is drawn; kept per season with the step it happened at. Ties on points count
   against a clinch (goal difference could still go either way). */
const CLINCH_ON=true;
function clinchCheck(my){
  if(!CLINCH_ON||!LEAGUE.draws||typeof DIVS==="undefined"||typeof LEAGUE.points!=="function"||!SEA||(SEA.phase!=="week"&&SEA.step!==LEAGUE.weeks))return null;   // the last day too
  const d=CONF[my], R=DIVS[d]; if(!R)return null;
  const C=S.clinch&&S.clinch.year===SEA.year&&S.clinch.team===my?S.clinch:(S.clinch={year:SEA.year,team:my,k:{}});
  const div=NAMES.filter(t=>CONF[t]===d), P=t=>LEAGUE.points(t,SEA);
  const done=SEA.half?SEA.step:SEA.step-1;   // the step just played (a cup week's league half doesn't move the step on)
  const rem=t=>SEA.sched.filter(g=>!g.cup&&g.week>done&&g.week<LEAGUE.weeks&&(g.home===t||g.away===t)).length;
  const mine=P(my), myMax=mine+3*rem(my), others=div.filter(t=>t!==my), left=rem(my);
  const step=done;
  if(!C.k.title&&others.every(t=>P(t)+3*rem(t)<mine))C.k.title={step:step,left:left};
  if(R.up&&!C.k.title&&!C.k.up&&others.filter(t=>P(t)+3*rem(t)>=mine).length<R.up)C.k.up={step:step,left:left};
  if(R.down&&!C.k.down&&others.filter(t=>P(t)>myMax).length>=div.length-R.down)C.k.down={step:step,left:left};
  return C;
}
function clinchText(k,x,my){
  const name=LEAGUE.conf.names[CONF[my]], spare=x.left?`, with ${x.left} game${x.left===1?"":"s"} to spare`:"";
  return k==="title"?{h:"Champions",l:`${esc(my)} are ${esc(name)} champions${spare}. Nobody can catch you now.${DIVS[CONF[my]].up?" Promotion with it.":""}`}
    :k==="up"?{h:"Promoted",l:`${esc(my)} are going up${spare}: a top-${DIVS[CONF[my]].up} finish in ${esc(typeof divThe==="function"?divThe(CONF[my]):name)} can't be taken off you.`}
    :{h:"Relegated",l:`It's done: ${esc(my)} can't climb out of the bottom ${DIVS[CONF[my]].down} now${spare}.`};
}
/* on the result card of the game that settled it */
function clinchHTML(my){
  const C=clinchCheck(my); if(!C||!flash||flash.step===undefined)return "";
  return Object.keys(C.k).filter(k=>C.k[k].step===flash.step).map(k=>{ const t=clinchText(k,C.k[k],my);
    return k==="down"?`<div class="clinch dn"><div class="tnhead">${t.h}</div><div class="tnline">${t.l}</div></div>`
      :`<div class="titlenight"><div class="tnconf" aria-hidden="true">${"<i></i>".repeat(18)}</div><div class="tnhead">${t.h}</div><div class="tnline">${t.l}</div></div>` }).join("");
}
/* in a sim digest: anything settled in the weeks simmed */
function clinchDigest(my,from,to){
  const C=clinchCheck(my); if(!C)return [];
  return Object.keys(C.k).filter(k=>C.k[k].step>=from&&C.k[k].step<to).map(k=>{ const t=clinchText(k,C.k[k],my); return `<b>${t.h}.</b> ${t.l}` });
}
/* title night (Instinct: "a career's biggest night presented like a Tuesday in January") */
function titleNightHTML(my){
  if(!STORY_ON)return "";
  const yr=SEA.year, Y=(S.storyYr||{})[yr]||{}, titles=(S.history||[]).filter(h=>h.year<yr&&h.honours&&h.honours.title).length+1;
  const call=(S.film||[]).filter(x=>x.y===yr&&x.w>0).sort((a,b)=>b.w-a.w)[0];
  const star=(()=>{ try{ return (SEA.mvpRace(60)||[]).find(x=>x.t===my) }catch(e){ return null } })();
  const ord=n=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th");
  const lines=[`${esc(my)} ${yr}: ${esc(recStr(my))}.`];
  if(Y.cbw)lines.push(`You were at ${Math.max(1,Math.round(Y.cbw.lo*100))}% ${Y.cbw.ha} ${esc(Y.cbw.opp)}${Y.cbw.wk?" ("+esc(Y.cbw.wk)+")":""}, and won anyway, ${Y.cbw.mine}&ndash;${Y.cbw.theirs}.`);
    if(Y.cb)lines.push(`The night it could have gone: ${Y.cb.by} down ${Y.cb.ha} ${esc(Y.cb.opp)}, and you came back to win ${Y.cb.mine}&ndash;${Y.cb.theirs}.`);
  if(call)lines.push(`Your call of the season: ${esc(call.h)}, ${call.ha} ${esc(call.opp)}. From that moment it won about ${call.w} more games in 100 than your assistant's call.`);
  if(star)lines.push(`${esc(star.n)} carried it${star.line?": "+esc(star.line):""}.`);
  lines.push(titles>1?`Your ${ord(titles)} title.`:`Your first title. Nobody can take it off you now.`);
  return `<div class="titlenight"><div class="tnconf" aria-hidden="true">${"<i></i>".repeat(18)}</div>
    <div class="tnhead">Champions</div>${lines.map(l=>`<div class="tnline">${l}</div>`).join("")}</div>`;
}
