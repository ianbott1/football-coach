/* ============ coordinators ============ */
/* Two assistants per program. They shift the team on the field and shape how
   their side of the ball develops — and the good ones get poached. */
const OFF_SHARE=0.61, DEF_SHARE=0.39;      // matches the positional weights
const STAFF_ELO=0.62;                      // Elo per point of coordinator quality

const OC_STYLE=["Air raid","Pro-style","Spread option","Run-heavy","RPO"];
const DC_STYLE=["3-4 attacking","4-2-5 nickel","Bend-don't-break","Blitz-heavy","Cover 3"];

function newCoordinator(rng,prestige,side,repBonus){
  const tier=Math.max(0,Math.min(1,(prestige-1150)/900));
  const q=rng.gauss(-20+tier*44+(repBonus||0), 24);
  return {n:rng.pick(FIRST)+" "+rng.pick(LAST),
          q:Math.round(Math.max(-52,Math.min(62,q))), t:0,
          s:rng.pick(side==="oc"?OC_STYLE:DC_STYLE)};
}

function staffElo(u,t){
  if(!u.oc||!u.dc||!u.oc[t]||!u.dc[t])return 0;
  return (u.oc[t].q*OFF_SHARE + u.dc[t].q*DEF_SHARE)*STAFF_ELO;
}

function coordGrade(q){
  if(q>=40)return "one of the best in the country";
  if(q>=20)return "highly regarded";
  if(q>=2)return "solid";
  if(q>=-20)return "unproven";
  return "in over his head";
}

function coordCandidates(rng,prestige,side,rep){
  return [0,1,2].map(()=>{
    const c=newCoordinator(rng,prestige,side,(rep||0)*0.22);
    c.grade=coordGrade(c.q+rng.gauss(0,11));    // scouting is imperfect here too
    return c;
  });
}
