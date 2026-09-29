/* ============ plans, replays and the pitch: soccer ============ */
const INTERIM_Q=-18;     // replacement-level assistant
const FEATURE_EDGE=12;   // Elo
const PLANS={
  safe:      {sd:0.85, edge:0, l:"Take the game to them", d:"Press high and keep the ball. Over ninety minutes the better side wins \u2014 best when that's you."},
  balanced:  {sd:1.0,  edge:0, l:"Balanced",              d:"Play your game."},
  aggressive:{sd:1.2,  edge:0, l:"Sit deep and counter",  d:"Two banks of four, hit them on the break. Fewer chances, more luck \u2014 best when you're outgunned."}
};
function isBigGame(g,team,seaRankMap,rivalName){
  if(!g)return false;
  if(rivalName)return true;
  if(g.title||g.site)return true;
  const opp=g.home===team?g.away:g.home;
  if((seaRankMap[opp]||999)<=8)return true;
  if(g.margin<=1)return true;
  return false;
}
/* where the clock stands after segment s: 15' ... 90', then extra time, penalties */
function segClock(s){
  if(s===SEGS)return "ET";
  if(s>SEGS)return "PENS";
  return (s+1)*15+"'";
}
/* a game without a recorded log (the computer's games): segments that add up
   to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), n=SEGS, out=[];
  const split=(tot)=>{const v=Array.from({length:n},()=>0); for(let i=0;i<tot;i++)v[rng.int(n)]++; return v};
  // games decided after ninety minutes: level at full time, extra time after
  const reg=g.ot?Math.min(g.hp,g.ap):null;
  const hs=split(reg!==null?reg:g.hp), as=split(reg!==null?reg:g.ap); let sh=0,sa=0;
  for(let s=0;s<n;s++){sh+=hs[s]; sa+=as[s]; out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa,shots:[0,0],pp:[false,false]})}
  if(reg!==null)out.push({seg:SEGS,sh:g.hp,sa:g.ap,ot:1,so:!!g.so,h:g.hp-reg,a:g.ap-reg,shots:[0,0],pp:[false,false]});
  return driveScript(g,out);
}
/* the pitch: each half in its side's colour, the clock as six bars */
function fieldSVG(g,cur,homeColor,awayColor,venue){
  const segs=cur&&typeof cur.seg==="number"?Math.min(SEGS,cur.seg+1):cur?SEGS:0;
  return `<svg class="field" viewBox="0 0 320 170" role="img" aria-label="Pitch">
    <rect x="6" y="8" width="308" height="134" rx="4" fill="#3E8E48"/>
    <rect x="6" y="8" width="154" height="134" fill="${awayColor}" opacity=".12"/>
    <rect x="160" y="8" width="154" height="134" fill="${homeColor}" opacity=".12"/>
    <g fill="none" stroke="#EAF4E6" stroke-width="1.6" opacity=".9">
      <rect x="10" y="12" width="300" height="126"/><line x1="160" y1="12" x2="160" y2="138"/>
      <circle cx="160" cy="75" r="17"/><rect x="10" y="45" width="36" height="60"/><rect x="274" y="45" width="36" height="60"/>
      <rect x="10" y="61" width="12" height="28"/><rect x="298" y="61" width="12" height="28"/>
    </g>
    <text x="52" y="160" fill="var(--bone)" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.away).slice(0,16)}</text>
    <text x="268" y="160" fill="var(--bone)" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.home).slice(0,16)}</text>
    ${Array.from({length:SEGS},(_,i)=>`<rect x="${113+i*16}" y="154" width="13" height="6" rx="2"
      fill="${i<segs?'var(--sodium)':'var(--line)'}"/>`).join("")}
  </svg>`;
}
