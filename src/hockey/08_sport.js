/* ============ sport: hockey ============ */
const SPORT={
  id:"hockey",
  word:"Hockey",
  /* what the owl perches on in the logo: the crossbar of a goal, with the
     net behind (the crossbar sits where football's does) */
  perch:`<g fill="none" stroke="var(--bone)" stroke-width="1.1" opacity=".7">
      <path d="M16 51 L22 62 M24 51 L28 63 M32 51 L34 64 M40 51 L38 64 M48 51 L44 63 M56 51 L50 62"/>
      <path d="M17 55 H55 M19 59 H53"/>
    </g>
    <path d="M14 64 V50 H58 V64" fill="none" stroke="#D7263D" stroke-width="3.6" stroke-linejoin="round"/>
    <ellipse cx="36" cy="66.5" rx="24" ry="2.4" fill="none" stroke="#7FB7E6" stroke-width="1.6" opacity=".8"/>`,
  staff:{
    oc:{short:"OFF", long:"assistant coach, forwards"},
    dc:{short:"DEF", long:"assistant coach, defence"},
    any:"assistant coach"
  },
  /* a game worth a headline, or null */
  starLine(P,L){
    if(!L)return null;
    if(P==="G"){ if(L.so)return {v:120+L.sv,txt:`a ${L.sv}-save shutout`};
      if(L.sv>=40)return {v:80+L.sv,txt:`${L.sv} saves`}; return null }
    if(L.goals>=3)return {v:100+L.goals*20+L.ast*6,txt:`a hat trick${L.goals>3?" (and then some: "+L.goals+" goals)":""}${L.ast?" and "+L.ast+" assist"+(L.ast===1?"":"s"):""}`};
    if(L.pts>=4)return {v:60+L.pts*12,txt:`${L.pts} points (${L.goals} goals, ${L.ast} assists)`};
    return null;
  },
  riser:{l:"Rising assistant",
    d:"The hottest assistant in the league. Could be the next great head coach, could be a lifer behind someone else's bench."}
};
