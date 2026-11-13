/* ============ sport: baseball ============ */
const SPORT={
  lateFloor:{late:(D,d)=>(d.seg||0)>=6, close:1},   // round 71: from the 7th, within a run
  margins:{close:1,rout:7,crush:9,blow:11},
  // the Capybara's fixed lines, said a different way from game to game (round 61: the same two sentences every night)
  voiceAlt:{
    "I would rather see an inning or two first. One finds lineups are not always who they were last week.":[
      "A few innings of looking, I think, before we decide anything. Reports are about other nights.",
      "I'd pitch our own game early and learn. Six games is a small book.",
      "Let's meet these hitters before we plan for them. They may have changed their minds.",
      "I would wait. One rarely regrets an inning spent watching."],
    "It seems to me changing speeds rarely hurts. I have not, I admit, studied their swings.":[
      "Slow, then fast, then slow. It unsettles most people. I haven't looked at the swings, mind.",
      "I'd mix the speeds. A hitter who can't time it can't hit it, one supposes.",
      "Change of pace, I say. Nobody likes being rushed and then kept waiting.",
      "Something slow after something quick. That's the whole of my scouting, I'm afraid."],
    "A tired arm, I find, is mostly a slower one. The bullpen is there to be used.":[
      "He's done his share, I'd say. There are fresh arms sitting down out there.",
      "I'd make the change. A tired pitcher is a hopeful one, and hope is not a plan.",
      "The bullpen, I think. They've been warm for an hour; let's use the warmth.",
      "Let him have his applause now, while it's still applause."]},   // round 60: close, a rout, never in doubt, the week's blowout (core MG)
  scoreWord:"RUN",
  closeMargin:1, closeLabel:"One run",   // the scores page chip (round 56)                  // the flash when you score
  /* which runs get the flash (round 56: an enormous "RUN!" on every run hid the log at the moment you wanted to read it,
     and a homer felt the same as a bases-loaded walk: Muse): a home run, or a run from the 7th on that ties the game or
     takes the lead; anything else just plays its sound */
  /* round 70 (Ian): a home run of yours gets the big sound, any other run a smaller cheer */
  scoreSfx(L,who){ try{ const d=(L.drives||[])[L.drives.length-1], side=(L.g.home===S.myTeam)===(who==="mine")?"home":"away";
    return d&&(d.ev||[]).some(e=>e.k==="hr"&&e.side===side)?"hr":"run" }catch(e){ return "score" } },
  flashWord(L,who){
    try{ const D=L.drives||[], d=D[D.length-1]; if(!d)return null; const my=S.myTeam, side=who==="mine"?(L.g.home===my?"home":"away"):(L.g.home===my?"away":"home");
      L._fl=L._fl||{}; const hr=(d.ev||[]).find((e,i)=>e.k==="hr"&&e.side===side&&!L._fl[d.seg+":"+i]&&(L._fl[d.seg+":"+i]=true));
      if(hr)return hr.n===4?"GRAND SLAM":"HOME RUN";
      const us=side==="home"?L.eng.h:L.eng.a, them=side==="home"?L.eng.a:L.eng.h;
      return d.seg>=6&&us>=them&&us-them<=1?"RUN":null }catch(e){ return null } },
  id:"baseball",
  word:"Baseball",
  /* what the owl perches on in the logo: a bat, laid across, and a ball */
  perch:`<path d="M12 60 L58 52" stroke="#C99A5B" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M12 60 L20 58.6" stroke="#7A4A22" stroke-width="4.6" stroke-linecap="round"/>
    <circle cx="60" cy="61" r="4.2" fill="#F4F1E8" stroke="#D7263D" stroke-width="1"/>`,
  milestones:(()=>{ const H=["hr","home runs",[25,50,100,200,300,400,500]], P=["k","strikeouts",[100,500,1000,1500,2000,2500,3000]];
    return {C:H,"1B":H,"2B":H,"3B":H,SS:H,LF:H,CF:H,RF:H,DH:H,SP:P,SP2:P,SP3:P,CL:["sv","saves",[25,100,200,300,400]]} })(),
  featureMore:"gives a player more at-bats, or a pitcher more innings",
  /* Pearl in hint mode: where to look, not the answer */
  hints:{pull:"Look at where their hits are going. Which side of the field?",
    patient:"Count how many pitches each of their at-bats is taking.",
    contact:"Look at our strikeouts. Are they swinging and missing, or putting it in play?"},
  staff:{
    oc:{short:"HIT", long:"hitting coach"},
    dc:{short:"PIT", long:"pitching coach"},
    any:"coach"
  },
  /* a game worth a headline, or null */
  starLine(P,L){
    if(!L)return null;
    if(isPitcher(P)){ if(L.gs&&L.ip>=27&&!L.er)return {v:160,txt:"a complete-game shutout"};
      if(L.gs&&L.k>=10)return {v:90+L.k*4,txt:`${L.k} strikeouts in ${ipStr(L.ip)} innings`}; return null }
    if(L.hr>=2)return {v:100+L.hr*25+(L.rbi||0)*5,txt:`${L.hr} home runs${L.rbi?" and "+L.rbi+" RBI":""}`};
    if(L.h>=4)return {v:70+L.h*10,txt:`${L.h} hits in ${L.ab} at-bats`};
    if((L.rbi||0)>=5)return {v:70+L.rbi*8,txt:`${L.rbi} RBI`};
    return null;
  },
  riser:{l:"Rising coach",
    d:"The hottest coach in the league. Could be the next great manager, could be a lifer in someone else's dugout."}
};
