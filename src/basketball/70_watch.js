/* ============ plans, replays and the court: basketball ============ */
const INTERIM_Q=-18;     // replacement-level assistant
const FEATURE_EDGE=16;   // Elo, about two-thirds of a point
const PLANS={
  safe:      {sd:0.8, edge:0, l:"Work it inside",   d:"Push the pace and take the high-percentage shots. Over forty minutes the better team wins \u2014 best when that's you."},
  balanced:  {sd:1.0, edge:0, l:"Balanced",         d:"Play your game."},
  aggressive:{sd:1.3, edge:0, l:"Shorten the game", d:"Slow it down and let it fly from three. Fewer possessions, more variance \u2014 best when you're outgunned."}
};
function isBigGame(g,team,seaRankMap,rivalName){
  if(!g)return false;
  if(rivalName)return true;
  if(g.title||g.site)return true;
  const opp=g.home===team?g.away:g.home;
  if((seaRankMap[opp]||999)<=25)return true;
  if(g.margin<=5)return true;
  return false;
}
/* where the clock stands after segment s: "1st 15:00" ... "2nd 0:00", or OT */
function segClock(s){
  if(s==="last")return "0:02";
  if(s>=8)return "OT"+(s-7>1?(s-7):"");
  const half=s<4?"1st":"2nd", left=20-5*((s%4)+1);
  return half+" "+left+":00";
}
/* a game without a recorded log (the computer's games): segments that add up
   to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), n=8, out=[];
  const split=(tot)=>{const w=Array.from({length:n},()=>0.6+rng.r()); const W=w.reduce((a,b)=>a+b,0);
    const v=w.map(x=>Math.floor(tot*x/W)); let r=tot-v.reduce((a,b)=>a+b,0); while(r-->0)v[rng.int(n)]++; return v};
  const hs=split(g.hp), as=split(g.ap); let sh=0,sa=0;
  for(let s=0;s<n;s++){sh+=hs[s]; sa+=as[s]; out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa})}
  return driveScript(g,out);
}
/* the court, with each end in its team's colour and the clock as a bar */
function fieldSVG(g,cur,homeColor,awayColor,venue){
  const segs=cur&&typeof cur.seg==="number"?Math.min(8,cur.seg+1):cur?8:0;
  return `<svg class="field" viewBox="0 0 320 170" role="img" aria-label="Court">
    <rect x="0" y="0" width="320" height="170" rx="6" fill="#C8955B"/>
    <rect x="10" y="10" width="300" height="130" fill="none" stroke="#F3E9D8" stroke-width="2"/>
    <rect x="10" y="50" width="52" height="50" fill="${awayColor}" opacity=".55" stroke="#F3E9D8" stroke-width="2"/>
    <rect x="258" y="50" width="52" height="50" fill="${homeColor}" opacity=".55" stroke="#F3E9D8" stroke-width="2"/>
    <path d="M10 22 H40 A63 63 0 0 1 40 128 H10" fill="none" stroke="#F3E9D8" stroke-width="2"/>
    <path d="M310 22 H280 A63 63 0 0 0 280 128 H310" fill="none" stroke="#F3E9D8" stroke-width="2"/>
    <line x1="160" y1="10" x2="160" y2="140" stroke="#F3E9D8" stroke-width="2"/>
    <circle cx="160" cy="75" r="18" fill="none" stroke="#F3E9D8" stroke-width="2"/>
    <circle cx="22" cy="75" r="4" fill="none" stroke="#E4572E" stroke-width="2"/>
    <circle cx="298" cy="75" r="4" fill="none" stroke="#E4572E" stroke-width="2"/>
    <text x="36" y="155" fill="#3A2A18" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.away).slice(0,14)}</text>
    <text x="284" y="155" fill="#3A2A18" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.home).slice(0,14)}</text>
    ${Array.from({length:8},(_,i)=>`<rect x="${100+i*15.5}" y="150" width="13" height="6" rx="2"
      fill="${i<segs?'#3A2A18':'#E8D3B4'}"/>`).join("")}
  </svg>`;
}
