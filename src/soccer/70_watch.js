/* ============ plans, replays and the rink: hockey ============ */
const INTERIM_Q=-18;     // replacement-level assistant
const FEATURE_EDGE=12;   // Elo
const PLANS={
  safe:      {sd:0.85, edge:0, l:"Skate with them", d:"Open, high-event hockey. Over sixty minutes the better team wins \u2014 best when that's you."},
  balanced:  {sd:1.0,  edge:0, l:"Balanced",        d:"Play your game."},
  aggressive:{sd:1.2,  edge:0, l:"Clog it up",      d:"Trap the neutral zone, block shots, shorten the game. Fewer chances, more luck \u2014 best when you're outgunned."}
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
/* where the clock stands after segment s: "1st 10:00" ... "3rd 0:00", OT, SO */
function segClock(s){
  if(s===SEGS)return "OT";
  if(s>SEGS)return "SO";
  const per=["1st","2nd","3rd"][Math.floor(s/2)];
  return per+" "+(s%2?"0:00":"10:00");
}
/* a game without a recorded log (the computer's games): segments that add up
   to the final score */
function gameScript(g,rosterHome,rosterAway,seed){
  const rng=new RNG(seed), n=SEGS, out=[];
  const split=(tot)=>{const v=Array.from({length:n},()=>0); for(let i=0;i<tot;i++)v[rng.int(n)]++; return v};
  // overtime games: regulation ends level, the winner's extra goal comes after
  const reg=g.ot?Math.min(g.hp,g.ap):null;
  const hs=split(reg!==null?reg:g.hp), as=split(reg!==null?reg:g.ap); let sh=0,sa=0;
  for(let s=0;s<n;s++){sh+=hs[s]; sa+=as[s]; out.push({seg:s,h:hs[s],a:as[s],sh:sh,sa:sa,shots:[0,0],pp:[false,false]})}
  if(reg!==null)out.push({seg:SEGS,sh:g.hp,sa:g.ap,ot:1,so:!!g.so,h:g.hp-reg,a:g.ap-reg,shots:[0,0],pp:[false,false]});
  return driveScript(g,out);
}
/* the rink: each end in its team's colour, the clock as six bars */
function fieldSVG(g,cur,homeColor,awayColor,venue){
  const segs=cur&&typeof cur.seg==="number"?Math.min(SEGS,cur.seg+1):cur?SEGS:0;
  return `<svg class="field" viewBox="0 0 320 170" role="img" aria-label="Rink">
    <rect x="6" y="8" width="308" height="134" rx="40" fill="#EEF4F8" stroke="#9FB3C4" stroke-width="2"/>
    <rect x="6" y="8" width="60" height="134" rx="40" fill="${awayColor}" opacity=".18"/>
    <rect x="254" y="8" width="60" height="134" rx="40" fill="${homeColor}" opacity=".18"/>
    <line x1="160" y1="8" x2="160" y2="142" stroke="#D7263D" stroke-width="3"/>
    <line x1="112" y1="8" x2="112" y2="142" stroke="#2F6FB5" stroke-width="3"/>
    <line x1="208" y1="8" x2="208" y2="142" stroke="#2F6FB5" stroke-width="3"/>
    <line x1="30" y1="12" x2="30" y2="138" stroke="#D7263D" stroke-width="1.2"/>
    <line x1="290" y1="12" x2="290" y2="138" stroke="#D7263D" stroke-width="1.2"/>
    <circle cx="160" cy="75" r="16" fill="none" stroke="#2F6FB5" stroke-width="1.5"/>
    <path d="M30 67 A9 9 0 0 1 30 83" fill="#9CC9EC" stroke="#D7263D" stroke-width="1"/>
    <path d="M290 67 A9 9 0 0 0 290 83" fill="#9CC9EC" stroke="#D7263D" stroke-width="1"/>
    <text x="52" y="160" fill="var(--bone)" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.away).slice(0,14)}</text>
    <text x="268" y="160" fill="var(--bone)" font-size="10" font-family="var(--mono),monospace" text-anchor="middle">${esc(g.home).slice(0,14)}</text>
    ${Array.from({length:SEGS},(_,i)=>`<rect x="${113+i*16}" y="154" width="13" height="6" rx="2"
      fill="${i<segs?'var(--sodium)':'var(--line)'}"/>`).join("")}
  </svg>`;
}
