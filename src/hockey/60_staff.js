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

/* Which option each of them would take, and what they'd say about it. */
/* The Bears do not reason. They react. */
const BEAR_YELL={
  push:  [`SEND EVERYONE. The goalie too, if he wants.`,
          `Pinch! Pinch the D! Pinch everything!`,
          `Shoot it from anywhere. The ice is ours.`,
          `Twenty minutes is loads. We need about four of them.`],
  lock:  [`Lock it down? We didn't come here to be locked.`,
          `MORE GOALS. Goals are the whole point.`,
          `Keep attacking. Bears don't trap.`],
  pull:  [`Pull him NOW. Pull him yesterday.`,
          `Six attackers. Seven if we can sneak one on.`,
          `Empty net? Great. We'll be in their end anyway.`],
  read:  [`Go fast. Go FAST. Pass it to the fast one.`,
          `Stretch passes! Long ones! Over everyone!`],
  goalie:[`He's our goalie. Bears are loyal. Mostly.`,
          `Keep him in. We like his pads.`],
  distracted:[`Is the Zamboni available for hire? Asking for a bear.`,
          `We've been watching the organist. The organist is excellent.`,
          `Did you know you can buy a whole goal? We may have bought a goal.`]
};
/* Pearl is a dog roughly one time in six. Unlike the Bears, her advice
   survives it — the dog bit wraps the read rather than replacing it, so you
   never lose the balanced opinion just because a squirrel went past. */
const PEARL_BEFORE=[`Woof! `,`SQUIRREL. `,`Ooh, ooh, ooh! `,
  `Was that the treat bag? ... Anyway. `,`Someone's at the door! ... No. False alarm. `];
const PEARL_AFTER=[` Woof!`,` (Tail going. Very hard.)`,` Can we go outside after?`,
  ` Also, is it dinner? It smells like dinner.`,` I'm going to spin in a circle about this.`,
  ` Ball. BALL. Sorry \u2014 the actual ball. Carry on.`];
function pearlSay(line, seed){
  const n=Math.abs(seed|0);
  if(n%6!==1)return line;
  return (n%12===1)
    ? PEARL_BEFORE[Math.floor(n/6)%PEARL_BEFORE.length]+line
    : line+PEARL_AFTER[Math.floor(n/6)%PEARL_AFTER.length];
}

function bearYell(kind, seed){
  const n=Math.abs(seed|0);
  // roughly one call in four, they lose the thread entirely
  if(n%4===2){
    const d=BEAR_YELL.distracted;
    return d[Math.floor(n/4)%d.length];
  }
  const pool=BEAR_YELL[kind]||BEAR_YELL.half;
  return pool[n%pool.length]||"We have a feeling about this one. A big feeling.";   // never a blank line
}

const PEARL_SYS={
  forecheck:"They keep pinning us in our own end! That's a forecheck. Stretch passes, beat the first man!",
  trap:"We can't get through the middle at all! It's a trap. Dump it in and chase!",
  cycle:"They're grinding it low behind our net all night! Collapse and take away the slot!"
};
function staffTake(dp, ctx){
  const diff = (ctx.mine||0)-(ctx.theirs||0);
  const seed = (ctx.mine||0)*7+(ctx.theirs||0)*3+(ctx.q||0)+((typeof live!=="undefined"&&live&&typeof liveSeed==="function")?(liveSeed(live.step)%9973):0);   // and the match: at 0-0 at the half every game said the same words (Muse, round 39)
  const R=[];
  if(dp.k==="prep"){
    const top=dp.pearl;
    R.push({who:"bears", pick:"stretch", line:bearYell("read",seed)});
    R.push({who:"pearl", pick:SYSTEM[top]?SYSTEM[top].counter:"normal", line:pearlSay(`They played ${SYSTEM[top].l} in ${dp.report[top]} of their last ${dp.n}! Let's practise for that!`,seed)});
    R.push({who:"capy", pick:"normal", line:"I would rather watch a period first. One finds teams are not always who they were last week."});
  }
  else if(dp.k==="read"){
    R.push({who:"bears", pick:"stretch", line:bearYell("read",seed)});
    // her eyes are the commentary (a third of it names the wrong system); when they disagree with the numbers
    // she says so, and which to trust (Instinct: she pointed at the trap column in a game the numbers called a cycle)
    const eyes=dp.pearl&&PEARL_SYS[dp.pearl], off=eyes&&dp.best&&SYSTEM[dp.best]&&dp.best!==dp.pearl;
    R.push({who:"pearl", pick:dp.pearl&&SYSTEM[dp.pearl]?SYSTEM[dp.pearl].counter:"normal",
      line:pearlSay(!eyes?"I haven't seen enough to say!"
        :off?`I think I saw it: ${PEARL_SYS[dp.pearl]} But the numbers look more like ${SYSTEM[dp.best].l}, and they've watched every shift. I might be wrong.`
        :"I just saw it, and the numbers agree! "+PEARL_SYS[dp.pearl],seed)});
    R.push({who:"capy", pick:"collapse", line:`It seems to me protecting the slot rarely hurts. I have not, I admit, studied their system.`});
  }
  else if(dp.k==="third"){
    R.push({who:"bears", pick:"stretch", line:bearYell("read",seed)});
    R.push({who:"pearl", pick:SYSTEM[dp.pearl]?SYSTEM[dp.pearl].counter:"normal",
      line:pearlSay(`All game it's looked like ${SYSTEM[dp.pearl].l}. I haven't looked at the third on its own, though!`,seed)});
    R.push({who:"capy", pick:dp.opts[0]&&dp.opts[0][0]==="keep"?"keep":"normal", line:`I would change nothing that has got us this far. Though I confess I haven't studied the last ten minutes.`});
  }
  else if(dp.k==="goalie"){
    R.push({who:"bears", pick:"keep", line:bearYell("goalie",seed)});
    R.push({who:"pearl", pick:dp.pearl?"swap":"keep", line:pearlSay(dp.pearl
      ? `That last one was SOFT. He's not himself tonight. Give the other one a go!`
      : `That last one wasn't his fault! Keep him in.`,seed)});
    R.push({who:"capy", pick:"normal", line:`Changing goalies, I find, mostly changes who gets blamed. I'd leave it with the assistant.`});
  }
  else if(dp.k==="push"){
    R.push({who:"bears", pick:"push", line:bearYell("push",seed)});
    R.push({who:"pearl", pick: diff<=-2?"push":"keep", line:pearlSay(diff<=-2
      ? (diff===-2?`Two goals is a lot to find! Let's open it up a bit.`:`Down ${-diff}? That's a lot of ground to make up. Let's open it up.`)
      : `It's one goal! Plenty of time. Keep playing our way.`,seed)});
    R.push({who:"capy", pick:"keep", line:`Chasing, one finds, mostly produces goals at the other end.`});
  }
  else if(dp.k==="lock"){
    R.push({who:"bears", pick:"keep", line:bearYell("lock",seed)});
    R.push({who:"pearl", pick: diff>=2?"sit":"keep", line:pearlSay(diff>=2
      ? (diff===2?`We're two up! Let's make it boring and go home happy.`:`We're ${["","","two","three","four","five"][diff]||diff} up! Let's make it boring and go home happy.`)   // the real lead: "two up" at 4-1 (Instinct)
      : `One goal isn't enough to sit on. Keep going!`,seed)});
    R.push({who:"capy", pick:"sit", line:`I would suggest fewer chances, both ways. Fewer chances, fewer disasters.`});
  }
  else if(dp.k==="pull"){
    R.push({who:"bears", pick:"early", line:bearYell("pull",seed)});
    R.push({who:"pearl", pick: diff<=-2?"early":"late", line:pearlSay(diff<=-2
      ? `Two goals needs time! Get him out early.`
      : `One goal, the usual time. We've done this before.`,seed)});
    R.push({who:"capy", pick:"late", line:`An empty net, I'm afraid, rather invites them to score into it.`});
  }
  return R;
}

/* A line for the moments outside a game. */
function staffAside(kind, data){
  const L={
    depth:[["bears",`Play the kid. Chaos is a ladder.`],
           ["pearl",`He's waited so patiently for this. Let him play!`],
           ["capy",`It seems to me changing the goalie mid-season rarely goes as people imagine.`]],
    staff:[["bears",`FIRE HIM. At centre ice. During the anthem.`],
           ["pearl",`Everyone has bad seasons. Maybe he just needs a bit of help.`],
           ["capy",`I do believe I'd want to be very sure before we start pulling things apart.`]],
    win:  [["bears",`WE ARE UNSTOPPABLE. Say it back to us.`],
           ["pearl",`I'm SO proud of them. Every single one.`],
           ["capy",`Lovely. Though I am, I confess, already a little worried about next week.`]],
    loss: [["bears",`Rigged. The goal was offside. We're appealing.`],
           ["pearl",`It's alright! There's another one next week.`],
           ["capy",`I did rather have a feeling. I didn't want to say.`]],
    title:[["bears",`THE CUP. We are drinking from THE CUP.`],
           ["pearl",`Look at them all crying. It's the loveliest thing.`],
           ["capy",`Champions. I have, I should say, prepared some remarks. They are quite long.`]]
  };
  const set=L[kind]; if(!set)return null;
  const i=Math.abs((data|0))%set.length;
  return {who:set[i][0], line:set[i][1]};
}

