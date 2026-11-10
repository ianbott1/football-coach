/* ============ plans, replays and the diamond: baseball ============ */
const INTERIM_Q=-18;     // replacement-level coach
const FEATURE_EDGE=12;   // Elo
const PLANS={
  safe:      {sd:0.9,  edge:0, l:"Small ball",          d:"Put it in play, move the runners, take the walks: fewer strikeouts and fewer home runs. Steady, and best when you're the better side."},
  balanced:  {sd:1.0,  edge:0, l:"Balanced",            d:"Play your game."},
  aggressive:{sd:1.15, edge:0, l:"Swing for the fences",d:"Hunt the long ball: more home runs and more strikeouts, a wider spread of results. Best when you're outgunned."}
};
function isBigGame(g,team,seaRankMap,rivalName){
  if(!g)return false;
  if(rivalName)return true;
  if(g.title||g.site)return true;
  const opp=g.home===team?g.away:g.home;
  if((seaRankMap[opp]||999)<=6)return true;
  if(g.margin<=1)return true;
  return false;
}
/* the diamond: the infield in grass and dirt, the innings as nine bars */
function fieldSVG(g,cur,homeColor,awayColor,venue){
  const segs=cur&&typeof cur.seg==="number"?Math.min(SEGS,cur.seg+1):cur?SEGS:0;
  return `<svg class="field" viewBox="0 0 320 170" role="img" aria-label="Diamond">
    <path d="M160 140 L40 40 A170 170 0 0 1 280 40 Z" fill="#2F7A3B"/>
    <path d="M160 140 L118 98 L160 56 L202 98 Z" fill="#B9875A"/>
    <path d="M160 132 L124 98 L160 64 L196 98 Z" fill="#348442"/>
    ${[[160,140],[202,98],[160,56],[118,98]].map(([x,y])=>`<rect x="${x-3}" y="${y-3}" width="6" height="6" fill="#F4F1E8" transform="rotate(45 ${x} ${y})"/>`).join("")}
    ${Array.from({length:SEGS},(_,i)=>`<rect x="${106+i*12}" y="154" width="10" height="6" rx="2"
      fill="${i<segs?'var(--sodium)':'var(--line)'}"/>`).join("")}
  </svg>`;
}
