/* ============ the staff room ============ */
/* Three voices who disagree with each other. The capybara is usually right,
   the bears are usually loud, and the doll is usually kind. You learn who to
   trust, which is the point. */

/* The Bears always take the risk. Anacondish reads the situation. L would
   rather not, thank you. Nobody is right all the time. */
const STAFF = {
  bears: {name:"Two Bears",           tag:"bears"},
  pearl: {name:"Pearl",               tag:"pearl"},
  capy:  {name:"Apprehensive Capybara",tag:"capy"}
};

function staffFace(who){
  if(who==="bears"){
    return `<svg viewBox="-1 0 55 40" class="face" aria-hidden="true">
      <g>
        <circle cx="12" cy="11" r="5.2" fill="#EFE7D8"/><circle cx="27" cy="11" r="5.2" fill="#EFE7D8"/>
        <circle cx="18" cy="22" r="14" fill="#EFE7D8"/>
        <ellipse cx="18" cy="26" rx="6.4" ry="5" fill="#E4DCCB"/>
        <ellipse cx="18" cy="25" rx="3.2" ry="2.4" fill="#6B4A38"/>
        <circle cx="12.5" cy="18" r="1.7" fill="#14171F"/><circle cx="23.5" cy="18" r="1.7" fill="#14171F"/>
        <circle cx="13.1" cy="17.4" r=".6" fill="#fff"/><circle cx="24.1" cy="17.4" r=".6" fill="#fff"/>
        <circle cx="35" cy="13" r="4.4" fill="#C9A173"/><circle cx="46" cy="13" r="4.4" fill="#C9A173"/>
        <circle cx="40" cy="23" r="12" fill="#C9A173"/>
        <ellipse cx="40" cy="27" rx="5.4" ry="4.2" fill="#BB9264"/>
        <ellipse cx="40" cy="26" rx="2.7" ry="2" fill="#6B4A38"/>
        <circle cx="35.4" cy="20" r="1.5" fill="#14171F"/><circle cx="44.6" cy="20" r="1.5" fill="#14171F"/>
        <circle cx="35.9" cy="19.5" r=".5" fill="#fff"/><circle cx="45.1" cy="19.5" r=".5" fill="#fff"/>
      </g></svg>`;
  }
  if(who==="pearl"){
    return `<svg viewBox="0 0 40 40" class="face" aria-hidden="true">
      <path d="M9.5 15 C7.4 8.6 8.2 4.4 9.8 3.8 C12.6 6 14.6 9.4 15.6 13.4 Z" fill="#E0BC8A"/>
      <path d="M30.5 15 C32.6 8.6 31.8 4.4 30.2 3.8 C27.4 6 25.4 9.4 24.4 13.4 Z" fill="#E0BC8A"/>
      <path d="M10.8 12.6 C9.6 8.6 10.1 6 10.8 5.6 C12.4 7 13.6 9.1 14.3 11.6 Z" fill="#F3D6B0"/>
      <path d="M29.2 12.6 C30.4 8.6 29.9 6 29.2 5.6 C27.6 7 26.4 9.1 25.7 11.6 Z" fill="#F3D6B0"/>
      <path d="M20 9 C28.4 9 32.4 14.6 32.4 21 C32.4 27.4 27 32 20 32
               C13 32 7.6 27.4 7.6 21 C7.6 14.6 11.6 9 20 9 Z" fill="#E8C494"/>
      <path d="M20 18.4 C25.2 18.4 28.4 21 28.4 24.6 C28.4 28.6 24.6 31.6 20 31.6
               C15.4 31.6 11.6 28.6 11.6 24.6 C11.6 21 14.8 18.4 20 18.4 Z" fill="#F9F1E3"/>
      <ellipse cx="14.4" cy="19.2" rx="2.5" ry="2.7" fill="#2A1C12"/>
      <ellipse cx="25.6" cy="19.2" rx="2.5" ry="2.7" fill="#2A1C12"/>
      <circle cx="15.3" cy="18.2" r=".95" fill="#fff"/><circle cx="26.5" cy="18.2" r=".95" fill="#fff"/>
      <path d="M20 22.6 c-2.4 0 -3.7 1.2 -3.7 2.4 c0 1.2 1.6 2.1 3.7 2.1
               c2.1 0 3.7 -.9 3.7 -2.1 c0 -1.2 -1.3 -2.4 -3.7 -2.4 Z" fill="#4A3226"/>
      <path d="M18.5 27.6 q1.5 1.3 3 0" stroke="#4A3226" stroke-width="1.2"
        fill="none" stroke-linecap="round"/>
      <path d="M18.3 28.8 q1.7 4.6 3.4 0 q-1.7 1.1 -3.4 0 Z" fill="#F2909E"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 40 40" class="face" aria-hidden="true">
    <ellipse cx="8.5" cy="12" rx="3.4" ry="3" fill="#A98B6A"/>
    <ellipse cx="31.5" cy="12" rx="3.4" ry="3" fill="#A98B6A"/>
    <path d="M20 5 C31 5 35 12 35 20 C35 29 28 34 20 34 C12 34 5 29 5 20 C5 12 9 5 20 5 Z"
      fill="#D9BE94"/>
    <path d="M20 17 C27 17 31 20 31 24 C31 29 26 32 20 32 C14 32 9 29 9 24 C9 20 13 17 20 17 Z"
      fill="#B99A73"/>
    <path d="M20 22.8 v2.6" stroke="#6B5136" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M15.6 27 Q20 24.2 24.4 27" stroke="#6B5136" stroke-width="1.5" fill="none"
      stroke-linecap="round"/>
    <ellipse cx="13.2" cy="15.6" rx="4.3" ry="4.6" fill="#F6F4EE"/>
    <ellipse cx="26.8" cy="15.6" rx="4.3" ry="4.6" fill="#F6F4EE"/>
    <ellipse cx="13.6" cy="16.4" rx="3.0" ry="3.2" fill="#14171F"/>
    <ellipse cx="27.2" cy="16.4" rx="3.0" ry="3.2" fill="#14171F"/>
    <circle cx="14.7" cy="15.2" r="1.15" fill="#fff"/><circle cx="28.3" cy="15.2" r="1.15" fill="#fff"/>
    <circle cx="12.6" cy="17.6" r=".55" fill="#fff" opacity=".75"/>
    <circle cx="26.2" cy="17.6" r=".55" fill="#fff" opacity=".75"/>
    <path d="M8.8 11.4 Q12.6 8.2 16.8 8.6" stroke="#7A5F42" stroke-width="1.45" fill="none"
      stroke-linecap="round"/>
    <path d="M31.2 11.4 Q27.4 8.2 23.2 8.6" stroke="#7A5F42" stroke-width="1.45" fill="none"
      stroke-linecap="round"/>
  </svg>`;
}

/* Which option each of them would take, and what they'd say about it.
   The Bears attack. Pearl reads the latest thing she saw: often right, never
   the whole picture. The Capybara would rather not. */
const BEAR_YELL={
  push:  [`SEND EVERYONE. The goalkeeper too, if he wants.`,
          `Shoot from anywhere. Shoot from the car park.`,
          `Fifteen minutes is loads. We need about four of them.`],
  lock:  [`Park the bus? We didn't come here to park.`,
          `MORE GOALS. Goals are the whole point.`,
          `Keep attacking. Bears don't defend. We've checked.`],
  level: [`Draws are for people with small hearts.`,
          `WIN IT. Then win another one.`],
  read:  [`Go long. Go LONG. Kick it at their house.`,
          `Long balls! The longest! Over everyone!`,
          `Hoof it. We read that's a real football word.`],
  flank: [`LEFT. Always left. Left is where the snacks are.`,
          `Down the left, like we planned. We did not plan.`],
  distracted:[`Can we sit in the dugout? The dugout looks comfy.`,
          `We've been watching the ball boys. Very professional.`,
          `Did you know you can buy a corner flag? We may have bought a corner flag.`]
};
/* Pearl is a dog roughly one time in six. Unlike the Bears, her advice
   survives it: the dog bit wraps the read rather than replacing it. */
const PEARL_BEFORE=[`Woof! `,`SQUIRREL. `,`Ooh, ooh, ooh! `,
  `Was that the treat bag? ... Anyway. `,`Someone's at the door! ... No. False alarm. `];
const PEARL_AFTER=[` Woof!`,` (Tail going. Very hard.)`,` Can we go outside after?`,
  ` Also, is it dinner? It smells like dinner.`,` I'm going to spin in a circle about this.`,
  ` Ball. BALL. Sorry, the actual ball. Carry on.`];
function pearlSay(line, seed){
  const n=Math.abs(seed|0);
  if(n%6!==1)return line;
  return (n%12===1)
    ? PEARL_BEFORE[Math.floor(n/6)%PEARL_BEFORE.length]+line
    : line+PEARL_AFTER[Math.floor(n/6)%PEARL_AFTER.length];
}
function bearYell(kind, seed){
  const n=Math.abs(seed|0);
  if(n%4===2){ const d=BEAR_YELL.distracted; return d[Math.floor(n/4)%d.length] }
  const pool=BEAR_YELL[kind]||BEAR_YELL.push;
  return pool[n%pool.length]||"We have a feeling about this one. A big feeling.";   // never a blank line
}
const PEARL_READ={
  press:"They keep winning it back in our half! That's a press. Go long over it!",
  block:"They're all sitting behind the ball. Let's stretch them and get crosses in!",
  wing:"Everything's coming down the wings. Let's double up out there!",
  direct:"They just keep kicking it long! Drop off and win the second balls!"
};
/* half-time: Pearl answers her own 25-minute read with the first half's numbers (Muse: her half-time line was a
   score script, made up fresh each time and repeated word for word across matches) */
function pearlRecall(dp,seed){
  const a=dp.pearl1&&APPROACH[dp.pearl1], b=dp.ht1&&APPROACH[dp.ht1]; if(!a||!b)return "";
  const n=Math.abs(seed|0)%3;
  if(dp.pearl1===dp.ht1)return [`At 25 minutes I said they were ${a.l}, and the first half bore it out. `,
    `The first half was what I saw at 25 minutes: ${a.l}. `,`I called them ${a.l} early on, and the numbers stayed with me all half. `][n];
  return [`At 25 minutes I thought they were ${a.l}. The first half's numbers look more like ${b.l}. `,
    `I said ${a.l} at 25 minutes. Looking at the whole half, it's more ${b.l}. `,`My early read was ${a.l}; the first half says ${b.l}, and the numbers watched it all. `][n];
}
/* Pearl on the flanks: she backs the side the last attack got through, and says so when the half's count points the
   other way (Muse: "Go left!" against a count favouring the right, read as a recycled line) */
function pearlFlank(dp,p,seed){ const F=dp.flank||[0,0], cnt=F[0]>F[1]?"left":F[1]>F[0]?"right":null, n=Math.abs(seed|0)%3;
  if(p==="normal")return ["The flanks, though, I couldn't tell. Both sides look the same to me!","The flanks? Honestly, nothing in it either side.","I've watched both wings and I can't split them. Keep it as it is!"][n];
  if(cnt&&cnt!==p)return [`I know the count says ${cnt}, but the last one we got through came down the ${p}. Go ${p}!`,`The numbers like the ${cnt}. My eyes saw the ${p} open up just now. Go ${p}!`,`Forget the half's count: the ${p} just opened up. Go ${p}!`][n];
  return [`And we just got through on the ${p} again! Go ${p}!`,`The ${p} is where it's happening. Go ${p}!`,`Their ${p==="left"?"right":"left"}-back is struggling. Go ${p}, and keep going ${p}!`][n];
}
function staffTake(dp, ctx){
  const diff=(ctx.mine||0)-(ctx.theirs||0), seed=(ctx.mine||0)*7+(ctx.theirs||0)*3+(ctx.q||0)+((typeof live!=="undefined"&&live&&typeof liveSeed==="function")?(liveSeed(live.step)%9973):0), R=[];   // and the match (Muse: last match's line, word for word)
  const behind=diff<0, ahead=diff>0, o=dp.opts.map(x=>x[0]);
  if(dp.k==="read"){
    const p=dp.pearl&&APPROACH[dp.pearl]?APPROACH[dp.pearl].counter:"normal";
    R.push({who:"bears", pick:"long", line:bearYell("read",seed)});
    // the second read against her first, as in basketball (Muse: at 55' she didn't refer to it at all)
    // whether anything has moved is the numbers' question (as in basketball and hockey: Instinct); her eyes can differ
    const again=dp.stage===2&&dp.best1&&dp.best&&APPROACH[dp.best];
    const moved=again?(dp.best1===dp.best?`The numbers haven't moved since half-time's: still ${APPROACH[dp.best].l}. `:`Has anything moved? The numbers say yes: they look ${APPROACH[dp.best].l} now. `):"";
    const off=dp.pearl&&dp.best&&APPROACH[dp.best]&&dp.pearl!==dp.best;
    R.push({who:"pearl", pick:p, line:pearlSay(!(dp.pearl&&PEARL_READ[dp.pearl])?moved+"I haven't seen enough yet. Let the assistant decide!"
      :moved+(off?`My eyes say otherwise, and I might be wrong: ${PEARL_READ[dp.pearl]}`:(again?"My eyes agree. ":"I just saw it! ")+PEARL_READ[dp.pearl]),seed)});
    R.push({who:"capy", pick:"second", line:"It seems to me dropping off a little rarely hurts anyone. Though I confess I haven't looked at the numbers."});
    return R;
  }
  if(dp.k==="prep"){
    const top=dp.pearl, p=top&&APPROACH[top]?APPROACH[top].counter:"normal";
    R.push({who:"bears", pick:"long", line:bearYell("read",seed)});
    R.push({who:"pearl", pick:p, line:pearlSay(`They were ${APPROACH[top].l} in ${dp.report[top]} of their last ${dp.n}! Let's get ready for that!`,seed)});
    R.push({who:"capy", pick:"normal", line:"I'd rather see them first, myself. Twenty-five minutes of watching never hurt anybody. Well. Rarely."});
    return R;
  }
  if(dp.k==="flank"){
    const p=dp.pearl==="left"||dp.pearl==="right"?dp.pearl:"normal";
    R.push({who:"bears", pick:"left", line:bearYell("flank",seed)});
    R.push({who:"pearl", pick:p, line:pearlSay(pearlRecall(dp,seed)+pearlFlank(dp,p,seed),seed)});
    R.push({who:"capy", pick:"normal", line:"I would leave the shape alone. A count of attacks is, I believe, a small and noisy thing."});
    return R;
  }
  const bold=o.indexOf("push")>=0?"push":o.indexOf("win")>=0?"win":"normal";
  const safe=o.indexOf("sit")>=0?"sit":o.indexOf("point")>=0?"point":o.indexOf("keep")>=0?"keep":"normal";
  R.push({who:"bears", pick:bold, line:bearYell(behind?"push":ahead?"lock":"level",seed)});
  R.push({who:"pearl", pick: behind?(diff<=-2||dp.k==="late"?"push":"normal"):ahead?(diff>=2?"sit":"normal"):(o.indexOf("win")>=0?"win":"normal"),
    line:pearlSay((dp.k==="half"?pearlRecall(dp,seed):"")+(behind?"We need a goal! Let's go and get it.":ahead?"Let's be sensible and see this out!":"A draw's a point, but a win's three! Let's be brave."),seed)});
  R.push({who:"capy", pick:safe, line:behind?"Chasing a game, one finds, mostly concedes on the break.":
    ahead?"I would suggest keeping what we have.":"A point, I do believe, is a point."});
  return R;
}

/* A line for the moments outside a game. */
function staffAside(kind, data){
  const L={
    depth:[["bears",`Play the kid. Chaos is a ladder.`],
           ["pearl",`He's waited so patiently for this. Let him play!`],
           ["capy",`It seems to me changing the goalkeeper mid-season rarely goes as people imagine.`]],
    staff:[["bears",`SACK HIM. At half-time. On the pitch.`],
           ["pearl",`Everyone has bad seasons. Maybe he just needs a bit of help.`],
           ["capy",`I do believe I'd want to be very sure before we start pulling things apart.`]],
    win:  [["bears",`WE ARE UNSTOPPABLE. Say it back to us.`],
           ["pearl",`I'm SO proud of them. Every single one.`],
           ["capy",`Lovely. Though I am, I confess, already a little worried about next week.`]],
    loss: [["bears",`Rigged. That was offside. We're appealing to VAR.`],
           ["pearl",`It's alright! There's another one next week.`],
           ["capy",`I did rather have a feeling. I didn't want to say.`]],
    title:[["bears",`THE TROPHY. We are lifting THE TROPHY.`],
           ["pearl",`Look at them all crying. It's the loveliest thing.`],
           ["capy",`Champions. I have, I should say, prepared some remarks. They are quite long.`]]
  };
  const set=L[kind]; if(!set)return null;
  const i=Math.abs((data|0))%set.length;
  return {who:set[i][0], line:set[i][1]};
}

