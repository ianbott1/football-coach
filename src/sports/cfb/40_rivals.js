/* ============ rivalries ============ */
/* Annual games with something on the line. These are forced into every schedule
   and pushed as late in the year as the calendar allows. */
const RIVALS=[
["Michigan","Ohio State","The Game"],
["Alabama","Auburn","the Iron Bowl"],
["Texas","Oklahoma","the Red River Rivalry"],
["Army","Navy","the Army-Navy Game"],
["Florida","Georgia","the World's Largest Outdoor Cocktail Party"],
["USC","UCLA","the Victory Bell"],
["Washington","Washington St","the Apple Cup"],
["Clemson","South Carolina","the Palmetto Bowl"],
["Florida State","Miami","the Sunshine Showdown"],
["Notre Dame","USC","the Jeweled Shillelagh"],
["Iowa","Iowa State","the Cy-Hawk Trophy"],
["Minnesota","Wisconsin","Paul Bunyan's Axe"],
["Michigan","Michigan State","the Paul Bunyan Trophy"],
["Indiana","Purdue","the Old Oaken Bucket"],
["Illinois","Northwestern","the Land of Lincoln Trophy"],
["Kansas","Kansas State","the Sunflower Showdown"],
["Texas","Texas A&M","the Lone Star Showdown"],
["Ole Miss","Mississippi St","the Egg Bowl"],
["LSU","Ole Miss","the Magnolia Bowl"],
["Georgia","Georgia Tech","Clean Old-Fashioned Hate"],
["Tennessee","Vanderbilt","the Beer Barrel"],
["Kentucky","Louisville","the Governor's Cup"],
["Auburn","Georgia","the Deep South's Oldest Rivalry"],
["Missouri","Arkansas","the Battle Line Rivalry"],
["Utah","BYU","the Holy War"],
["Arizona","Arizona State","the Territorial Cup"],
["Colorado","Colorado State","the Rocky Mountain Showdown"],
["Pittsburgh","West Virginia","the Backyard Brawl"],
["Virginia","Virginia Tech","the Commonwealth Cup"],
["North Carolina","Duke","the Victory Bell"],
["NC State","North Carolina","the Textile Bowl"],
["Air Force","Navy","the Commander-in-Chief's Trophy"],
["Nevada","UNLV","the Fremont Cannon"],
["Toledo","Bowling Green","the Battle of I-75"],
["Miami (OH)","Cincinnati","the Victory Bell"],
["Baylor","TCU","the Revivalry"],
["Oklahoma State","Oklahoma","Bedlam"],
["Iowa","Nebraska","the Heroes Trophy"],
["Penn State","Pittsburgh","the Keystone Classic"],
["Stanford","California","the Big Game"],
["SMU","TCU","the Iron Skillet"],
["Houston","Rice","the Bayou Bucket"],
["UTEP","New Mexico St","the Battle of I-10"],
["Wyoming","Colorado State","the Border War"],
["App State","Georgia South","the Deeper South"],
["Troy","South Alabama","the Battle for the Belt"],
["Fresno State","San Jose State","the Valley Trophy"],
["Boise State","Utah State","the Milk Can"],
["Marshall","Old Dominion","the Coastal Clash"],
["Memphis","Tulane","the Bell Game"],
];

/* the ones that traditionally close the season */
const MARQUEE=new Set(["The Game","the Iron Bowl","the Egg Bowl","the Apple Cup",
"the Palmetto Bowl","Clean Old-Fashioned Hate","the Backyard Brawl","the Big Game",
"the Territorial Cup","the Commonwealth Cup","the Victory Bell","the Civil War",
"the Lone Star Showdown","Bedlam","the Holy War","the Army-Navy Game",
"the Old Oaken Bucket","Paul Bunyan's Axe","the Governor's Cup","the Sunflower Showdown"]);

const RIVAL_OF={};
RIVALS.forEach(([a,b,n])=>{
  (RIVAL_OF[a]=RIVAL_OF[a]||[]).push({o:b,n:n});
  (RIVAL_OF[b]=RIVAL_OF[b]||[]).push({o:a,n:n});
});
function rivalryName(a,b){
  const l=RIVAL_OF[a]||[];
  const hit=l.find(x=>x.o===b);
  return hit?hit.n:null;
}

/* ---- series history, kept across seasons ---- */
function seriesKey(a,b){return [a,b].sort().join("~")}

function recordRivalries(u,season){
  u.series=u.series||{};
  const all=[].concat(...season.weeks.map(w=>w.games),season.titles||[],
                      season.bowls||[],season.rounds?[].concat(
                      season.rounds.r1,season.rounds.qf,season.rounds.sf,season.rounds.fin):[]);
  all.forEach(g=>{
    const nm=rivalryName(g.home,g.away); if(!nm)return;
    const k=seriesKey(g.home,g.away);
    const s=u.series[k]||(u.series[k]={n:nm,w:{},streak:null,games:[]});
    s.w[g.winner]=(s.w[g.winner]||0)+1;
    if(s.streak&&s.streak.t===g.winner)s.streak.n++;
    else s.streak={t:g.winner,n:1};
    s.games.push({y:season.year,w:g.winner,l:g.loser,
                  s:Math.max(g.hp,g.ap)+"-"+Math.min(g.hp,g.ap)});
    if(s.games.length>25)s.games.shift();
  });
}

/* What the series looks like from one side. */
function seriesFor(u,a,b){
  if(!u||!u.series)return null;
  const s=u.series[seriesKey(a,b)];
  if(!s)return null;
  const mine=s.w[a]||0, theirs=s.w[b]||0;
  return {name:s.n,w:mine,l:theirs,
          streak:s.streak?{team:s.streak.t,n:s.streak.n}:null,
          games:s.games.slice().reverse()};
}

/* Confirmed 2026 matchups. These are real; the rest of the slate is generated.
   week is 0-indexed (0 = opening weekend). */
const REAL_LEGACY=[
 {a:"TCU",h:"North Carolina",w:0,neutral:true,site:"Dublin"},
 {a:"NC State",h:"Virginia",w:0,neutral:true,site:"Rio de Janeiro"},
 {a:"Clemson",h:"LSU",w:0},
 {a:"Boise State",h:"Oregon",w:0},
 {a:"UCLA",h:"California",w:0},
 {a:"Boston College",h:"Cincinnati",w:0},
 {a:"Miami",h:"Stanford",w:0},
 {a:"SMU",h:"Florida State",w:0},
 {a:"Louisville",h:"Ole Miss",w:0,neutral:true,site:"Nashville"},
 {a:"Toledo",h:"Michigan State",w:0},
 {a:"Fresno State",h:"USC",w:0},
 {a:"San Jose State",h:"Eastern Mich",w:0},
 {a:"UTEP",h:"Oklahoma",w:0},
 {a:"Mississippi St",h:"Minnesota",w:1},
 {a:"USC",h:"Rutgers",w:2},
 {a:"Miami",h:"Notre Dame",w:10},
 {a:"Florida State",h:"Boston College",w:10},
 {a:"UCLA",h:"Minnesota",w:10},
 {a:"Florida State",h:"Pittsburgh",w:11},
 {a:"UCLA",h:"Michigan",w:12},
 {a:"Nebraska",h:"Iowa",w:13}
];

/* Everything we know to be real, from both the transcribed conference slates
   and the confirmed marquee non-conference games. */
const REAL2026=(function(){
  const out=[], seen=new Set();
  const key=(a,b)=>[a,b].sort().join("|");
  // A team can only play so many non-conference games. Where a real schedule
  // disagrees with this game's alignment (Louisiana Tech is the 2026 example,
  // caught between two conferences), pin only as many as actually fit.
  const nonCount={}; NAMES.forEach(t=>nonCount[t]=0);
  const nonCap=t=>12-((CONF[t]==="SEC"||CONF[t]==="B1G"||CONF[t]==="B12")?9:
                      (CONF[t]==="IND"?0:8));
  (typeof SCHED_2026!=="undefined"?SCHED_2026:[]).forEach(g=>{
    const h=realName(g.h), a=realName(g.a);
    if(NAMES.indexOf(h)<0||NAMES.indexOf(a)<0)return;   // skip FCS and non-FBS
    if(seen.has(key(h,a)))return;
    if(CONF[h]!==CONF[a]){
      if(CONF[h]!=="IND"&&nonCount[h]>=nonCap(h))return;
      if(CONF[a]!=="IND"&&nonCount[a]>=nonCap(a))return;
      nonCount[h]++; nonCount[a]++;
    }
    seen.add(key(h,a));
    out.push({a:a,h:h,w:g.w,neutral:!!g.neutral,site:g.site||null});
  });
  REAL_LEGACY.forEach(g=>{
    if(NAMES.indexOf(g.h)<0||NAMES.indexOf(g.a)<0)return;
    if(seen.has(key(g.h,g.a)))return;
    if(CONF[g.h]!==CONF[g.a]){
      if(CONF[g.h]!=="IND"&&nonCount[g.h]>=nonCap(g.h))return;
      if(CONF[g.a]!=="IND"&&nonCount[g.a]>=nonCap(g.a))return;
      nonCount[g.h]++; nonCount[g.a]++;
    }
    seen.add(key(g.h,g.a));
    out.push(g);
  });
  return out;
})();

/* Swap the generated slate around so the confirmed games actually happen. */
function enforceReal(games,rng){
  const key=(x,y)=>[x,y].sort().join("|");
  const has=new Set(games.map(g=>key(g[0],g[1])));
  REAL2026.forEach(R=>{
    if(!NAMES.includes(R.a)||!NAMES.includes(R.h))return;
    if(has.has(key(R.a,R.h))){
      const ex=games.find(g=>key(g[0],g[1])===key(R.a,R.h));
      if(ex){ex[0]=R.a;ex[1]=R.h;ex[3]=!!R.neutral;ex[4]=true;ex[5]=R.w;ex[6]=R.site||null}
      return;
    }
    const sameConf=CONF[R.a]===CONF[R.h];
    const ga=games.map((g,i)=>i).filter(i=>
      (games[i][0]===R.a||games[i][1]===R.a)&&games[i][2]===sameConf);
    const gb=games.map((g,i)=>i).filter(i=>
      (games[i][0]===R.h||games[i][1]===R.h)&&games[i][2]===sameConf);
    rng.shuffle(ga); rng.shuffle(gb);
    let done=false;
    for(const ia of ga){
      if(done)break;
      const pa=games[ia][0]===R.a?games[ia][1]:games[ia][0];
      if(pa===R.h)break;
      for(const ib of gb){
        if(ib===ia)continue;
        const pb=games[ib][0]===R.h?games[ib][1]:games[ib][0];
        if(pb===R.a||pb===pa)continue;
        const legal=sameConf?(CONF[pa]===CONF[pb]):(CONF[pa]!==CONF[pb]);
        if(!legal||has.has(key(pa,pb)))continue;
        has.delete(key(R.a,pa)); has.delete(key(R.h,pb));
        has.add(key(R.a,R.h)); has.add(key(pa,pb));
        [ia,ib].sort((x,y)=>y-x).forEach(i=>games.splice(i,1));
        games.push([R.a,R.h,sameConf,!!R.neutral,true,R.w,R.site||null]);
        games.push([pa,pb,sameConf,false]);
        done=true; break;
      }
    }
  });
  return games;
}

/* Put those games in the week they are actually played, and the right way round. */
function pinRealWeeks(sched,busy,NW_){
  // busy[] must always agree with sched; rebuild it for the teams we touch
  // rather than patching it by hand
  const rebusy=ts=>ts.forEach(t=>{busy[t]=new Set(
    sched.filter(x=>x.home===t||x.away===t).map(x=>x.week))});
  REAL2026.forEach(R=>{
    const g=sched.find(x=>(x.home===R.h&&x.away===R.a)||(x.home===R.a&&x.away===R.h));
    if(!g)return;
    g.neutral=!!R.neutral; g.site=R.site||null; g.real=true;
    if(g.home!==R.h){g.home=R.h; g.away=R.a}          // correct the venue
    if(g.week===R.w)return;
    const A=R.h, B=R.a, from=g.week, to=R.w;
    // anything already occupying that week for either side has to move
    const block=sched.filter(x=>x!==g&&x.week===to&&
      (x.home===A||x.away===A||x.home===B||x.away===B));
    if(block.some(x=>x.real))return;                  // never displace another real game
    // Plan every move against the schedule as it would be, and only commit
    // if all of them fit. Moving some and then giving up left a displaced
    // game sitting on top of this one.
    const occ={};
    const weeksOf=t=>occ[t]||(occ[t]=new Set(sched.filter(x=>x!==g&&block.indexOf(x)<0&&
      (x.home===t||x.away===t)).map(x=>x.week)));
    weeksOf(A).add(to); weeksOf(B).add(to);
    const plan=[];
    for(const x of block){
      const teams=[x.home,x.away];
      let target=-1;
      for(let w=0;w<NW_;w++){
        if(w===to)continue;
        if(teams.every(t=>!weeksOf(t).has(w))){target=w;break}
      }
      if(target<0)return;                             // can't pin this one; leave it
      teams.forEach(t=>weeksOf(t).add(target));
      plan.push([x,target]);
    }
    plan.forEach(([x,w])=>{x.week=w});
    g.week=to;
    rebusy([A,B].concat(...block.map(x=>[x.home,x.away])));
  });
  return sched;
}
function enforceRivalries(games,rng,protectReal){
  const key=(x,y)=>[x,y].sort().join("|");
  const has=new Set(games.map(g=>key(g[0],g[1])));
  RIVALS.forEach(([a,b])=>{
    if(!NAMES.includes(a)||!NAMES.includes(b))return;
    if(has.has(key(a,b)))return;
    const sameConf=CONF[a]===CONF[b];
    // find one game for each that can be re-paired
    const ga=games.map((g,i)=>i).filter(i=>
      (games[i][0]===a||games[i][1]===a) && games[i][2]===sameConf);
    const gb=games.map((g,i)=>i).filter(i=>
      (games[i][0]===b||games[i][1]===b) && games[i][2]===sameConf);
    rng.shuffle(ga); rng.shuffle(gb);
    for(const ia of ga){
      const pa=games[ia][0]===a?games[ia][1]:games[ia][0];
      if(pa===b)break;
      let done=false;
      for(const ib of gb){
        if(ib===ia)continue;
        const pb=games[ib][0]===b?games[ib][1]:games[ib][0];
        if(pb===a||pb===pa)continue;
        // leftovers must be a legal pairing too
        const legal=sameConf?(CONF[pa]===CONF[pb]):(CONF[pa]!==CONF[pb]);
        if(!legal)continue;
        if(has.has(key(pa,pb)))continue;
        has.delete(key(a,pa)); has.delete(key(b,pb));
        has.add(key(a,b)); has.add(key(pa,pb));
        const keep=[ia,ib].sort((x,y)=>y-x);
        keep.forEach(i=>games.splice(i,1));
        games.push([rng.r()<0.5?a:b, rng.r()<0.5?b:a, sameConf, false]);
        const last=games[games.length-1];
        if(last[0]===last[1]){last[0]=a;last[1]=b}
        games.push([pa,pb,sameConf,false]);
        done=true;break;
      }
      if(done)break;
    }
  });
  return games;
}

/* Nobody opens the year with two byes. Pull a later game forward to fill them. */
function fillEarlyByes(sched,busy){
  for(let w=0;w<3;w++){
    NAMES.forEach(t=>{
      if(busy[t].has(w))return;
      const cand=sched.filter(g=>(g.home===t||g.away===t)&&g.week>w+2
        &&!rivalryName(g.home,g.away)&&!g.real);
      for(const g of cand){
        const other=g.home===t?g.away:g.home;
        if(busy[other].has(w))continue;
        const from=g.week;
        busy[t].delete(from); busy[other].delete(from);
        busy[t].add(w); busy[other].add(w);
        g.week=w; return;
      }
    });
  }
  return sched;
}

function lateenRivalries(sched,busy){
  // drag rivalry games toward the end of the year, displacing ordinary games if needed
  const late=[13,12,11,10,9];
  const riv=sched.filter(g=>rivalryName(g.home,g.away)).sort((a,b)=>{
    const ma=MARQUEE.has(rivalryName(a.home,a.away))?0:1;
    const mb=MARQUEE.has(rivalryName(b.home,b.away))?0:1;
    return ma-mb || a.week-b.week;
  });
  riv.forEach(g=>{
    for(const w of late){
      if(w<=g.week)break;
      const A=g.home,B=g.away,from=g.week;
      if(!busy[A].has(w)&&!busy[B].has(w)){
        busy[A].delete(from);busy[B].delete(from);
        busy[A].add(w);busy[B].add(w);g.week=w;return;
      }
      // try to bump the ordinary games sitting in that week
      const block=sched.filter(x=>x!==g&&x.week===w&&
        (x.home===A||x.away===A||x.home===B||x.away===B));
      if(block.length>2||block.some(x=>rivalryName(x.home,x.away)||x.real))continue;
      const ok=block.every(x=>!busy[x.home].has(from)&&!busy[x.away].has(from)
        ||x.home===A||x.away===A||x.home===B||x.away===B);
      if(!ok)continue;
      let moved=true;
      block.forEach(x=>{
        const others=[x.home,x.away].filter(t=>t!==A&&t!==B);
        if(others.some(t=>busy[t].has(from))){moved=false;return}
      });
      if(!moved)continue;
      busy[A].delete(from);busy[B].delete(from);
      block.forEach(x=>{
        [x.home,x.away].forEach(t=>{busy[t].delete(w);busy[t].add(from)});
        x.week=from;
      });
      busy[A].add(w);busy[B].add(w);g.week=w;return;
    }
  });
  return sched;
}

