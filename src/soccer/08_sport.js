/* ============ sport: hockey ============ */
const SPORT={
  scoreWord:"GOAL",                 // the flash when you score
  id:"soccer",
  word:"Soccer",
  /* the owl on the crossbar of a goal, net behind (the bar where football's is) */
  perch:`<g fill="none" stroke="var(--bone)" stroke-width="1" opacity=".7">
      <path d="M12 51 L18 63 M20 51 L24 64 M28 51 L30 65 M36 51 L36 65 M44 51 L42 65 M52 51 L48 64 M60 51 L54 63"/>
      <path d="M13 55 H59 M15 59 H57"/>
    </g>
    <path d="M10 65 V50 H62 V65" fill="none" stroke="#F4F1EA" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M4 66.5 H68" stroke="#4E9A55" stroke-width="2.2" opacity=".85"/>`,
  featureMore:"gives a player more of the ball",          // what featuring a player means in this sport
  /* Pearl in hint mode: where to look, not the answer */
  hints:{press:"Look at how often they win the ball back in our half. What does that tell you?",   /* where to look, not a claim: it read as fact beside 0.0 turnovers forced (Muse, round 21) */
    block:"Look how deep they're sitting, and how much of the ball they're giving us.",
    wing:"Count where their attacks are coming from.",
    direct:"Watch how often the ball goes long."},
  staff:{
    oc:{short:"ATT", long:"assistant manager, attack"},
    dc:{short:"DEF", long:"assistant manager, defence"},
    any:"coach"
  },
  starLine(P,L){
    if(!L)return null;
    if(P==="GK"){ if(L.cs&&L.sv>=6)return {v:90+L.sv*4,txt:`a clean sheet and ${L.sv} saves`}; return null }
    if(L.goals>=3)return {v:120+L.goals*20,txt:`a hat-trick${L.goals>3?" ("+L.goals+" goals)":""}`};
    if(L.goals>=2&&L.ast>=1)return {v:90,txt:`two goals and an assist`};
    if(L.goals+L.ast>=3)return {v:70+(L.goals+L.ast)*8,txt:`${L.goals} goal${L.goals===1?"":"s"} and ${L.ast} assists`};
    return null;
  },
  /* career milestones: [stat, words, the numbers that count] */
  milestones:{GK:["cs","clean sheets",[25,50,75,100,150,200]], CB:["goals","goals",[10,20,30,50]],
    FB:["ast","assists",[25,50,75,100]], CM:["goals","goals",[25,50,75,100,150]],
    W:["goals","goals",[25,50,75,100,150,200]], ST:["goals","goals",[25,50,75,100,150,200,250,300]]},
  riser:{l:"Rising coach",
    d:"The most talked-about coach in the country. Could be a manager in his own right soon."}
};

