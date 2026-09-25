/* ============ watching a game ============ */
/* Reconstructs a full drive chart that adds up to the real final score, using
   the actual players on both rosters. Seeded from the game itself, so it never
   touches the season's RNG. */

/* Break a final score into plausible scoring plays. Safeties are only used when
   the number genuinely can't be reached any other way (2, 4 and 5 points). */
const BAD_REMAINDER=new Set([1,2,4,5]);

function scoreParts(P,rng){
  if(P===0)return [];
  if(P===2)return [2];
  if(P===4)return [2,2];
  if(P===5)return [2,3];
  const out=[]; let left=P, guard=0;
  while(left>0&&guard++<40){
    const opts=[];
    if(left>=7){opts.push(7,7,7,7,7,7)}                // touchdowns carry the load
    if(left>=6&&rng.r()<0.12){opts.push(6)}            // missed extra point
    if(left>=3){opts.push(3,3,3)}
    if(left>=8&&rng.r()<0.055){opts.push(8)}           // a two-point try by choice
    let ok=opts.filter(v=>{const r=left-v; return r===0||!BAD_REMAINDER.has(r)});
    if(!ok.length&&left>=8)ok=[8];                     // 8 is the only way out of 8
    if(!ok.length){                                    // forced into a safety
      if(left===1&&out.length){out[out.length-1]+=1;break}
      out.push(left>=2?2:left); left-=2; continue;
    }
    const v=ok[rng.int(ok.length)];
    out.push(v); left-=v;
  }
  return out;
}

const PUNT_LINES=["three and out","forced to punt","stalls out, punt",
  "goes backwards, punt","can't move it, punt"];

function scoreText(rng,off,def,pts){
  const nm=i=>off&&off[i]?off[i].n:"the offense";
  const dn=i=>def&&def[i]?def[i].n:"the defense";
  if(pts===3)return `${Math.round(rng.range(19,52))}-yd field goal`;
  if(pts===2)return rng.r()<0.5?`tackled in the end zone \u2014 safety`
    :`snap sails out of the end zone \u2014 safety`;
  if(pts===6&&rng.r()<0.5)return `${dn(8)} ${Math.round(rng.range(18,88))}-yd pick six`;
  const yds=Math.round(rng.range(2,64));
  const two=pts===8?", two-point conversion good":"";
  if(rng.r()<0.56)return `${nm(0)} ${yds}-yd TD pass to ${nm(rng.r()<0.62?2:3)}${two}`;
  if(rng.r()<0.82)return `${nm(1)} ${yds}-yd TD run${two}`;
  return `${nm(0)} ${Math.round(rng.range(1,14))}-yd TD run${two}`;
}

/* Every drive, scoring or not. start/end are yards from the offense's own goal. */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG((seed>>>0)||1);
  const hsc=scoreParts(g.hp,rng), asc=scoreParts(g.ap,rng);
  // both teams get the same number of possessions, so the game trades properly
  const target=Math.max(hsc.length,asc.length,Math.round(rng.range(10,13)));
  const items=[];
  hsc.forEach(p=>items.push({side:"home",pts:p}));
  asc.forEach(p=>items.push({side:"away",pts:p}));
  for(let i=hsc.length;i<target;i++)items.push({side:"home",pts:0});
  for(let i=asc.length;i<target;i++)items.push({side:"away",pts:0});

  // teams trade possession; scoring drives fall wherever they fall
  const hq=rng.shuffle(items.filter(d=>d.side==="home"));
  const aq=rng.shuffle(items.filter(d=>d.side==="away"));
  const seq=[]; let turn=rng.r()<0.5?"home":"away";
  while(hq.length||aq.length){
    const q=turn==="home"?hq:aq;
    if(q.length)seq.push(q.shift());
    else seq.push((turn==="home"?aq:hq).shift());
    turn = turn==="home"?"away":"home";
  }
  // lay them across four quarters with a clock that runs down
  const per=Math.ceil(seq.length/4);
  seq.forEach((d,i)=>{
    d.q=Math.min(4,Math.floor(i/per)+1);
    const within=i-(d.q-1)*per;
    d.sec=Math.max(8,Math.round(895-(within+1)*(880/(per+1))-rng.range(0,40)));
  });

  // "runs out the clock" only belongs on the last drive of a half
  const lastOfQ={};
  seq.forEach((d,i)=>{lastOfQ[d.q]=i});

  let H=0,A=0;
  return seq.map((d,idx)=>{
    const endsHalf = (idx===lastOfQ[2]) || (idx===lastOfQ[4]);
    const off=d.side==="home"?rosterHome:rosterAway;
    const def=d.side==="home"?rosterAway:rosterHome;
    const start=Math.round(Math.max(3,Math.min(78,rng.gauss(27,13))));
    let end,outcome,text;
    let possSide=d.side;
    if(d.pts>0){
      if(d.side==="home")H+=d.pts; else A+=d.pts;
      outcome = d.pts===2?"SAF" : d.pts===3?"FG" : "TD";
      if(d.pts===2){
        possSide = d.side==="home"?"away":"home";     // the trapped offence
        end = 0;                                      // its own goal line
      }else end = 100;
      text = scoreText(rng,off,def,d.pts);
    }else{
      const roll=rng.r();
      if(roll<0.52){outcome="PUNT"; end=Math.min(92,start+Math.round(rng.range(-2,34)));
        text=rng.pick(PUNT_LINES);}
      else if(roll<0.64){outcome="DOWNS"; end=Math.min(95,start+Math.round(rng.range(8,48)));
        text="turned over on downs";}
      else if(roll<0.75){outcome="MISS"; end=Math.min(88,start+Math.round(rng.range(20,55)));
        text=`${Math.round(rng.range(38,56))}-yd attempt is no good`;}
      else if(roll<0.87){outcome="INT"; end=Math.min(96,start+Math.round(rng.range(0,45)));
        text=`intercepted by ${def&&def[8]?def[8].n:"the defense"}`;}
      else if(roll<0.95){outcome="FUM"; end=Math.min(96,start+Math.round(rng.range(0,42)));
        text=`fumble, recovered by ${def&&def[7]?def[7].n:"the defense"}`;}
      else if(endsHalf){outcome=d.q===2?"HALF":"END";
        end=Math.min(90,start+Math.round(rng.range(0,38)));
        text=d.q===2?"runs out the half":"runs out the clock";}
      else {outcome="PUNT"; end=Math.min(92,start+Math.round(rng.range(-2,34)));
        text=rng.pick(PUNT_LINES);}
    }
    const mm=Math.floor(d.sec/60), ss=d.sec%60;
    return {
      n:idx+1, q:d.q, clock:mm+":"+(ss<10?"0":"")+ss, sec:d.sec,
      team:possSide==="home"?g.home:g.away, side:possSide,
      scoredBy:d.pts===2?(d.side==="home"?g.home:g.away):null,
      pts:d.pts, outcome:outcome, text:text, start:start, end:end,
      yards:Math.max(0,end-start),
      ball: possSide==="home" ? 100-end : end, // 0 = away end zone, 100 = home end zone
      h:H, a:A
    };
  });
}

/* ---- the field ---- */
/* End zones carry the full team name, sized to fit rather than chopped. */
function endzoneName(t){
  const s=String(t).replace(/[^A-Za-z& ]/g,"").trim().toUpperCase();
  const n=s.length;
  const size = n<=6?8.2 : n<=9?6.8 : n<=12?5.6 : n<=15?4.7 : 4.0;
  return {t:s,size:size};
}
function venueLabelSize(v){
  const n=String(v).length;
  return n<=8?16 : n<=12?13 : n<=16?10.5 : 8.6;
}

function fieldSVG(g,drive,homeColor,awayColor,venue){
  const x=v=>17+(v/100)*166;
  const ball=drive?Math.max(0,Math.min(100,drive.ball)):50;
  const marks=[];
  for(let y=10;y<=90;y+=10)marks.push(`<line x1="${x(y)}" y1="9" x2="${x(y)}" y2="95"
    stroke="rgba(233,229,218,.26)" stroke-width="0.7"/>`);
  for(let y=5;y<=95;y+=5)marks.push(`<line x1="${x(y)}" y1="49" x2="${x(y)}" y2="55"
    stroke="rgba(233,229,218,.30)" stroke-width="0.6"/>`);
  const nums=[];
  [10,20,30,40,60,70,80,90].forEach(y=>{
    nums.push(`<text x="${x(y)}" y="26" fill="rgba(233,229,218,.24)" font-size="6.5"
      font-family="monospace" text-anchor="middle">${Math.min(y,100-y)}</text>`);
    nums.push(`<text x="${x(y)}" y="90" fill="rgba(233,229,218,.24)" font-size="6.5"
      font-family="monospace" text-anchor="middle">${Math.min(y,100-y)}</text>`);
  });
  return `<svg class="field" viewBox="0 0 200 104" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="field position">
    <rect x="17" y="9" width="166" height="86" fill="rgba(70,181,131,.10)"/>
    <rect x="1" y="9" width="16" height="86" fill="${awayColor}" opacity="0.85"/>
    <rect x="183" y="9" width="16" height="86" fill="${homeColor}" opacity="0.85"/>
    ${(()=>{const A=endzoneName(g.away),H=endzoneName(g.home);return `
    <text x="9" y="52" fill="#F2EFE7" font-size="${A.size}" font-family="'Barlow Condensed',sans-serif"
      font-weight="700" letter-spacing="0.6" text-anchor="middle"
      transform="rotate(-90 9 52)">${A.t}</text>
    <text x="191" y="52" fill="#F2EFE7" font-size="${H.size}" font-family="'Barlow Condensed',sans-serif"
      font-weight="700" letter-spacing="0.6" text-anchor="middle"
      transform="rotate(90 191 52)">${H.t}</text>`})()}
    ${marks.join("")}${nums.join("")}
    <text x="100" y="60" fill="rgba(233,229,218,.26)" font-size="${venueLabelSize(venue)}"
      font-family="'Barlow Condensed',Impact,sans-serif" font-weight="700"
      text-anchor="middle" letter-spacing="1.5">${String(venue).toUpperCase()}</text>
    <rect x="17" y="9" width="166" height="86" fill="none"
      stroke="rgba(233,229,218,.38)" stroke-width="1"/>
    ${drive?`<line x1="${x(ball)}" y1="9" x2="${x(ball)}" y2="95"
        stroke="var(--sodium)" stroke-width="1.5" opacity=".9"/>
      <ellipse cx="${x(ball)}" cy="52" rx="5" ry="3.2" fill="var(--sodium)"/>`:""}
  </svg>`;
}

function isBigGame(g,team,seaRankMap,rivalName){
  if(!g)return false;
  if(rivalName)return true;
  if(g.title||g.site)return true;
  const opp=g.home===team?g.away:g.home;
  if((seaRankMap[opp]||999)<=25)return true;
  if(g.margin<=7)return true;
  return false;
}

/* Gameplan. Variance is the real lever: an underdog wants chaos, a favourite
   wants the game to be boring. Aggression buys variance at a small cost in
   expected margin; playing safe does the reverse. */
const INTERIM_Q=-18;     // replacement-level coordinator
const FEATURE_EDGE=16;   // Elo, roughly 0.75 of a point of spread

const PLANS={
  safe:      {sd:0.76, edge:-14, l:"Play it safe",  d:"Shorten the game. Fewer swings either way."},
  balanced:  {sd:1.00, edge:0,   l:"Balanced",      d:"Play your game."},
  aggressive:{sd:1.38, edge:-8,  l:"Take risks",    d:"Open it up. Higher ceiling, lower floor."}
};


