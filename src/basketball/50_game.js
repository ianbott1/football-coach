/* ============ the game: basketball ============ */
/* Played possession by possession: a turnover, or a shot (two or three),
   with fouls to the line and offensive rebounds for a second chance. The
   rating gap tilts each side's make rates and turnovers; home court is a
   small edge for the home side. A gameplan sets the pace (possessions) and
   the share of threes. Twos and threes are worth the same on average, so a
   plan changes how swingy a game is, not how many points it's worth: more
   possessions and fewer threes let the better team's talent show; fewer
   possessions and more threes make it a game of chances.
   Possessions are grouped into eight five-minute segments, which the live
   view shows one at a time (the sport's "drives"). */
const DRIVES_PER_TEAM = 4;                    // segments per half; 8 in a game
const SEGS = 8;
const BB = {
  pace: 69,             // possessions per team per game, both teams balanced
  paceSd: 3.0,
  gapPerPoss: 0.00025,  // rating gap (Elo) -> make-rate edge: about 25 Elo a point
  toBase: 0.17, toGap: 0.9,
  two: 0.52, three: 0.352,   // with fouls and and-ones, a two and a three are each worth ~1.05
  foul2: 0.085, foul3: 0.015, ft: 0.715, and1: 0.07,   // threes are rarely fouled
  oreb: 0.22,
  garbage: 13,          // a lead this big after 25 minutes: the benches come in
  benchPull: 0.05       // the bench's make-rate cost to the side that's ahead
};
/* Calibrated on its own (engine only; 20,000 games; league spread sd 160 Elo;
   home court 105 Elo): 70.5 points and 69 possessions a team, mean margin
   11.0, game-to-game noise 12.3, home teams 59.4% (2.6 points) between equal
   sides, threes 35.2%, turnovers 0.170 a possession, overtime 2.6%. Points
   per possession are the same whatever the plan (1.019 / 1.020 / 1.023).
   Real Division I: ~72, ~69, 11-12, ~11, 60-65% (~3), ~34%, ~0.18, ~6%. */
const AGGR = {
  safe:      {tempo:1.36, three:0.18},        // work it inside: ~81 possessions against a balanced side
  balanced:  {tempo:1.00, three:0.38},
  aggressive:{tempo:0.66, three:0.64},        // shorten the game: ~57, and lots of threes
  // not gameplans: the engine's own late-game modes
  urgent:    {tempo:1.10, three:0.55},        // behind late: quick shots, threes
  sit:       {tempo:0.80, three:0.25},        // ahead late: bleed the clock
  chase:     {tempo:1.10, three:0.55},
  force:     {tempo:1.10, three:0.70}
};
/* one possession: points scored, and a line for the box score */
function possession(rng, edge, mode, st){
  const A=AGGR[mode]||AGGR.balanced;
  if(rng.r() < BB.toBase - edge*BB.toGap*0.1){ st.to++; return 0 }
  for(let tries=0;tries<3;tries++){
    const three = rng.r() < A.three;
    // talent is worth the same per shot either way (2/3 of the edge on a
    // three), so taking more threes adds variance, not an edge
    const pMake = (three?BB.three+edge*2/3:BB.two+edge);
    if(rng.r() < (three?BB.foul3:BB.foul2)){          // fouled in the act
      const n=three?3:2; let pts=0; st.fta+=n;
      for(let i=0;i<n;i++) if(rng.r()<BB.ft){pts++; st.ftm++}
      return pts;
    }
    if(three)st.tpa++; else st.fga2++;
    if(rng.r() < pMake){
      if(three)st.tpm++; else st.fgm2++;
      let pts=three?3:2;
      if(!three&&rng.r()<BB.and1){st.fta++; if(rng.r()<BB.ft){pts++;st.ftm++}}
      return pts;
    }
    if(rng.r() >= BB.oreb) return 0;                  // defense rebounds
    st.oreb++;
  }
  return 0;
}
/* How the game is managed from here, given the segment and the home lead:
   the edge (home side's) and each side's mode. */
function gameState(seg,lead,eH,planH,planA){
  const left=SEGS-seg, big=Math.abs(lead);
  let e=eH, mH=planH, mA=planA;
  if(seg>=5&&big>=BB.garbage){                    // decided: benches on both sides
    e=eH*0.4-Math.sign(lead)*BB.benchPull; mH="balanced"; mA="balanced";
  }else if(left<=2&&big>=4&&big<BB.garbage){      // late and close enough to matter
    if(lead>0){mH="sit";mA="chase"} else {mH="chase";mA="sit"}
  }
  return {eH:e,mH:mH,mA:mA};
}
const blankTeamLine=()=>({to:0,fta:0,ftm:0,tpa:0,tpm:0,fga2:0,fgm2:0,oreb:0});
/* A whole game at once (every game but the ones you watch). */
function playGame(rng, eloH, eloA, planH, planA, opts){
  opts=opts||{};
  const tempo=((AGGR[planH]||AGGR.balanced).tempo+(AGGR[planA]||AGGR.balanced).tempo)/2;
  const poss=Math.max(55,Math.round(rng.gauss(BB.pace*tempo,BB.paceSd)));
  const gap=(eloH-eloA)*(typeof GAP_SCALE!=="undefined"?GAP_SCALE:1);
  const eH=gap*BB.gapPerPoss/2, eA=-eH;
  const sH=blankTeamLine(), sA=blankTeamLine();
  let h=0,a=0; const drives=[];
  for(let s=0;s<SEGS;s++){
    const n=Math.floor(poss/SEGS)+(s<poss%SEGS?1:0);   // exactly poss in all
    let dh=0,da=0;
    // how the game is being managed: a decided game goes to the benches; late
    // in a close one the leader slows it down and the team behind chases
    const g=gameState(s,h-a,eH,planH,planA);
    for(let i=0;i<n;i++){ dh+=possession(rng,g.eH,g.mH,sH); da+=possession(rng,-g.eH,g.mA,sA) }
    h+=dh; a+=da;
    drives.push({seg:s,h:dh,a:da,sh:h,sa:a});
  }
  let ot=0;
  while(h===a&&ot<6){                               // five-minute overtimes
    ot++; const n=Math.round(poss/SEGS); let dh=0,da=0;   // a five-minute period
    for(let i=0;i<n;i++){ dh+=possession(rng,eH,"urgent",sH); da+=possession(rng,eA,"urgent",sA) }
    h+=dh; a+=da; drives.push({seg:SEGS+ot-1,ot:ot,h:dh,a:da,sh:h,sa:a});
  }
  if(h===a){ if(rng.r()<0.5)h++; else a++ }
  return {h:h,a:a,drives:drives,poss:poss,ot:ot,lines:{h:sH,a:sA}};
}
