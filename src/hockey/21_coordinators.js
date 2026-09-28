/* ============ assistants: basketball ============ */
/* Two lead assistants per program, one for each end of the floor. They shift
   the team on the court and shape how their players develop, and the good
   ones get hired away. (The core calls them coordinators.) */
const OFF_SHARE=0.50, DEF_SHARE=0.50;      // both ends count the same
const STAFF_ELO=0.62;                      // Elo per point of assistant quality
const OC_STYLE=["Motion offense","Pick-and-roll heavy","Five-out","Dribble drive","Post-up inside-out"];
const DC_STYLE=["Pack line","Man-to-man pressure","2-3 zone","Full-court press","Switch everything"];
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
    c.grade=coordGrade(c.q+rng.gauss(0,11));
    return c;
  });
}
