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
  fourth:[`GO. GO. GO. GO.`,
          `SEND IT. Send it right now.`,
          `We are Gods. Gods do not hesitate.`,
          `The universe has already decided. We're just telling you.`,
          `Kneel. Then go for it.`,
          `History will remember us. Act accordingly.`],
  fourthKick:[`We did not come here to KICK.`,
          `Boo the kicker. Boo him off the field.`,
          `Three points is a participation trophy.`,
          `Gods do not accept three. Gods take seven.`,
          `Kicking is just punting with extra steps.`,
          `Somebody fetch us a throne and a first down.`],
  fourthPunt:[`Punting is for cowards and accountants.`,
          `If we punt we are walking home.`,
          `Give the ball AWAY? On purpose? To THEM?`,
          `We answer to no one. Least of all the punt team.`,
          `A punt has never made anyone happy. Ever.`,
          `The rules were written by lesser bears.`],
  two:   [`TWO! TWO! TWO! TWO!`,
          `One point? ONE? Be serious.`,
          `Go for two and let them weep about it.`,
          `We demand tribute. Tribute comes in twos.`],
  chase: [`AAAAAAAA.`,
          `Throw it deep. Then throw it deeper.`,
          `We refuse to lose quietly. Absolutely refuse.`,
          `The Gods are DISPLEASED. Fix it.`,
          `Everything. Right now. All of it.`,
          `This is a personal insult to us specifically.`],
  protect:[`MORE. We want MORE points.`,
          `Humiliate them. It's the only language they understand.`,
          `Erase them from the record books entirely.`,
          `Sitting on a lead is how you get a lead taken.`,
          `Show no mercy. Mercy is for teams that punt.`,
          `Keep going until someone makes us stop. Nobody can.`],
  half:  [`Say something inspiring. We've forgotten how.`,
          `New plan: score more, concede less. You're welcome.`,
          `LOUDER. Whatever we're doing, LOUDER.`,
          `Build us a statue at halftime. We'll wait.`,
          `We have notes. None of them are useful.`],
  distracted:[`CHOCOLATE CAKE!`,
          `What did we do?`,
          `COOKIES AND CREAM!`,
          `Is there chocolate cake after? There should be chocolate cake after.`,
          `What did we do? Did we do something? Was it us?`,
          `We would like cookies and cream. Now. During the game.`,
          `CHOCOLATE CAKE. That's our note. That's the whole note.`,
          `Wait, what did we do?`,
          `Cookies and cream and then whatever you decided. In that order.`]
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
  const pool=BEAR_YELL[kind]||BEAR_YELL.fourth;
  return pool[n%pool.length];
}

function staffTake(dp, ctx){
  const opts = dp.opts.map(o=>o[0]);
  const has = k=>opts.indexOf(k)>=0;
  const pct = k=>{
    const o=dp.opts.find(x=>x[0]===k); if(!o)return null;
    const m=o[1].match(/(\d+)%/); return m?+m[1]:null;
  };
  const diff = (ctx.mine||0)-(ctx.theirs||0);
  const seed = (ctx.mine||0)*7+(ctx.theirs||0)*3+(ctx.q||0);
  const R=[];

  if(dp.k==="fourth"){
    const go=pct("go")||0, kick=pct("kick");
    // Anacondish: the points are worth it only if the kick is actually makeable
    const mid = (kick!==null && kick>=52) ? "kick"
              : (go>=48 ? "go" : (has("punt")?"punt":"kick"));
    // L: a long kick is a risk too. She wants the safest available outcome.
    const safe = (kick!==null && kick>=58) ? "kick"
               : (has("punt") ? "punt" : (kick!==null ? "kick" : "go"));
    R.push({who:"bears", pick:"go",
      line:bearYell(kick!==null?"fourthKick":"fourthPunt", seed)});
    R.push({who:"pearl", pick:mid, line:pearlSay(mid==="kick" ? `${kick}% for three points! I'll take three points.`
      : mid==="go"  ? `They've been brilliant all day. Let them finish it!`
      :               `Nothing lovely on offer here. Give it back and go get it again.`,seed)});
    R.push({who:"capy", pick:safe, line:
      safe==="punt" ? (kick!==null
          ? `It seems to me ${kick}% is rather more of a wish than a plan. I'd punt.`
          : `That is, I do believe, simply too far. Give it back and defend.`)
      : safe==="kick" ? `I do believe ${kick}% is about as comfortable as we're likely to get.`
      :                 `I'm not enthusiastic, but nothing safer appears to be on offer.`});
  }
  else if(dp.k==="two"){
    R.push({who:"bears", pick:"two", line:bearYell("two",seed)});
    R.push({who:"pearl", pick: (diff+7)===1||(diff+7)===-1 ? "two":"kick", line:pearlSay((diff+7)===1||(diff+7)===-1 ? `One point either way is agony! Let's just settle it.`
                                  : `The kick keeps it simple, and simple is lovely.`,seed)});
    R.push({who:"capy", pick:"kick", line:`A missed conversion would be, I fear, one more thing to worry about.`});
  }
  else if(dp.k==="chase"){
    R.push({who:"bears", pick:"push", line:bearYell("chase",seed)});
    R.push({who:"pearl", pick: diff<=-4 ? "push":"normal", line:pearlSay(diff<=-4
      ? `More than a field goal down \u2014 come on, let's go and get it!`
      : `It's one score! We've got time. No need to panic.`,seed)});
    R.push({who:"capy", pick:"normal", line:`One rather suspects each additional risk compounds against us. Stay measured.`});
  }
  else if(dp.k==="protect"){
    R.push({who:"bears", pick:"keep", line:bearYell("protect",seed)});
    R.push({who:"pearl", pick:"keep", line:pearlSay(diff>=13
      ? `We're playing so well! Let's just keep playing.`
      : `Whatever we did to get here \u2014 more of that, please.`,seed)});
    R.push({who:"capy", pick:"sit", line:`I would gently suggest fewer possessions. Fewer possessions, fewer catastrophes.`});
  }
  else if(dp.k==="half"){
    const down = diff<0;
    R.push({who:"bears", pick: down?"push":"normal", line:bearYell("half",seed)});
    R.push({who:"pearl", pick:"normal", line:pearlSay(down
      ? `They're not playing badly! Let's just play a bit better.`
      : `This is going great. Exactly as we are, please.`,seed)});
    R.push({who:"capy", pick: down?"normal":"sit", line: down
      ? `If I may \u2014 panicking at this juncture tends to worsen the scoreline, not mend it.`
      : `We have, I think, got what we came for. I'd rather not risk anybody now.`});
  }
  return R;
}

/* A line for the moments outside a game. */
function staffAside(kind, data){
  const L={
    depth:[["bears",`Play the kid. Chaos is a ladder.`],
           ["pearl",`He's waited so patiently for this. Let him play!`],
           ["capy",`It seems to me changing the quarterback mid-season rarely goes as people imagine.`]],
    staff:[["bears",`SACK HIM. On the field. In front of everyone.`],
           ["pearl",`Everyone has bad seasons. Maybe he just needs a bit of help.`],
           ["capy",`I do believe I'd want to be very sure before we start pulling things apart.`]],
    win:  [["bears",`WE ARE UNSTOPPABLE. Say it back to us.`],
           ["pearl",`I'm SO proud of them. Every single one.`],
           ["capy",`Lovely. Though I am, I confess, already a little worried about next week.`]],
    loss: [["bears",`Rigged. Absolutely rigged. We're appealing.`],
           ["pearl",`It's alright! There's another one next week.`],
           ["capy",`I did rather have a feeling. I didn't want to say.`]],
    title:[["bears",`RINGS. RINGS FOR THE BEARS. We did most of it.`],
           ["pearl",`Look at them all crying. It's the loveliest thing.`],
           ["capy",`Champions. I have, I should say, prepared some remarks. They are quite long.`]]
  };
  const set=L[kind]; if(!set)return null;
  const i=Math.abs((data|0))%set.length;
  return {who:set[i][0], line:set[i][1]};
}

