/* ============ the staff's voices, varied across games (round 47) ============ */
/* Muse (round 20): Pearl's pre-kickoff line and the capybara's half-time line were word for word the same in all
   four matches. Within a game staffFresh (94_staffplan) already stops a voice repeating itself; across games the fixed
   lines came back verbatim. VOICE_ALT holds, for each fixed line, other ways the same voice says the same thing (the
   same advice, never a different pick). voiceVary swaps the line for the next one in its rotation the first time it's
   heard in a game, and keeps it for that game (one rotation per line, kept in S.voice, so a reload carries on from
   where it was). Lines are matched as sentences inside the composed line, so a recall or a bark around them stays. */
const VOICE_ON=true;
const VOICE_ALT={
  // ---- the capybara ----
  "It seems to me dropping off a little rarely hurts anyone. Though I confess I haven't looked at the numbers.":[
    "Dropping a few metres deeper has, in my experience, never ruined anyone's afternoon. I haven't checked the numbers, mind.",
    "I'd sit a touch deeper and let them come. I say that without having looked at anything, you understand.",
    "A little less adventure at the back would suit me. The numbers I leave to braver souls."],
  "I'd rather see them first, myself. Twenty-five minutes of watching never hurt anybody. Well. Rarely.":[
    "I'd watch them for a while before deciding anything. Teams have a way of not being their reports.",
    "Let's see what turns up first. A plan for the wrong opponent is, I find, worse than no plan.",
    "Twenty-five minutes of looking costs us very little. Guessing costs us, occasionally, everything."],
  "I would leave the shape alone. A count of attacks is, I believe, a small and noisy thing.":[
    "I'd keep the shape as it is. A handful of attacks down one side is not, to my mind, a pattern.",
    "Changing the shape on a few raids seems hasty. They may simply have been lucky down there.",
    "I'd stay balanced. One rather suspects a short count tells us more about chance than about them."],
  "Chasing a game, one finds, mostly concedes on the break.":[
    "Throwing everyone forward, I find, is how a one-goal game becomes a three-goal one.",
    "If we chase it, they'll have the whole pitch to run into. I'd be patient.",
    "Patience, if I may. The equaliser tends to come to sides that haven't left the door open."],
  "I would suggest keeping what we have.":[
    "We have something worth keeping. I'd keep it.",
    "I'd be quite content to hold on to this, if nobody minds.",
    "A lead, it seems to me, is best treated like a full cup of tea: carefully."],
  "A point, I do believe, is a point.":[
    "A point is not nothing. Not in this league.",
    "I'd take the point and go home quietly. Points add up, I'm told.",
    "A draw is still something in the table. Losing it chasing three would be a shame."],
  "I would rather watch a period first. One finds teams are not always who they were last week.":[
    "A period of watching first, I think. Last week's team and tonight's are not always the same one.",
    "I'd let the first period tell us who they are tonight. Scouting reports are, after all, about other nights.",
    "Let's look before we leap. Twenty minutes is a small price for knowing."],
  "It seems to me protecting the slot rarely hurts. I have not, I admit, studied their system.":[
    "Keeping the slot clear seems sensible whatever they're doing. I confess I haven't studied it.",
    "I'd look after the front of our net first. The clever stuff can wait.",
    "The slot is where goals come from, I believe. I'd crowd it."],
  "Changing goalies, I find, mostly changes who gets blamed. I'd leave it with the assistant.":[
    "Pulling a goalie mid-game, in my experience, rarely fixes the goalie. I'd leave it.",
    "I'd let the assistant judge it. A change can unsettle the whole bench.",
    "Swapping him out mostly gives the papers a headline. I'd stay put."],
  "Chasing, one finds, mostly produces goals at the other end.":[
    "If we chase it, they'll get odd-man rushes all night. I'd hold.",
    "Pressing for the goal tends to hand them the next one. Patience.",
    "The goal will come or it won't. Opening up mostly decides which end it comes at."],
  "I would suggest fewer chances, both ways. Fewer chances, fewer disasters.":[
    "I'd make it a dull game now. Dull games are lovely when you're winning them.",
    "Let's take the excitement out of it. Fewer chances suits the side that's ahead.",
    "Slow it down, keep it tidy. The clock is on our side."],
  "A tired goalie, it seems to me, is mostly a slower one.":[
    "Second night on his legs? I'd worry about his reactions late on.",
    "He played last night. A half-step slow is a lot of goals in this league.",
    "Rest is not a luxury for a goalie, I think. Not two nights running."],
  "An odd-man rush the other way, I'm afraid, ends a great many overtimes.":[
    "In overtime one mistake ends it. I'd rather it wasn't ours.",
    "Three-on-three is, I find, mostly a contest in not being caught up the ice.",
    "I'd keep someone home. The breakaway the other way is the whole danger."],
  "An empty net, I'm afraid, rather invites them to score into it.":[
    "Pulling him early does rather leave the door open. I'd wait.",
    "Every second of an empty net is a second they can end it. Late, if at all.",
    "The extra attacker helps, but so does a goalie. I'd keep him in a little longer."],
  "A press, one rather suspects, is mostly a way of giving up layups quickly.":[
    "A full-court press is a gamble, and the house usually wins. I'd stay home.",
    "Press them and we'll see a lot of easy baskets. Some of them ours, not many.",
    "I'd keep our shape. A press beaten once is two points for nothing."],
  "I would gently suggest fewer possessions. Fewer possessions, fewer catastrophes.":[
    "Shorten the game, I'd say. The fewer chances they get, the better.",
    "Run the clock. Every possession we don't play is one they can't use.",
    "Let's make it a slow one now. Slow games are kind to the side in front."],
  "It seems to me a lead like this usually holds. Usually.":[
    "This lead should hold. I'd rest the legs that matter.",
    "We're far enough ahead, I think, to look after the stars.",
    "A lead like this is rarely lost. I'd rather not lose a starter protecting it."],
  "A lead like this usually holds, it seems to me. Usually.":[
    "This lead should hold. I'd get the starters out of harm's way.",
    "We're far enough ahead, I think, to look after the people we need next week.",
    "A lead like this is rarely lost. I'd rather not lose a starter protecting it."],
  "It seems to me a two is the likelier shot. Overtime is, at least, not losing.":[
    "I'd go for the two and take our chances in overtime. Overtime is still a game.",
    "The two is the better percentage, I believe. A miss from three ends everything.",
    "Tie it. Five more minutes is better than none."],
  "A missed conversion would be, I fear, one more thing to worry about.":[
    "I'd kick it. The extra point is nearly certain, and certainty is restful.",
    "Take the point. Missing a two-pointer has a way of haunting the fourth quarter.",
    "One point in the bank, please. I've no appetite for a coin flip just now."],
  "One rather suspects each additional risk compounds against us. Stay measured.":[
    "Every risk we add makes the next one likelier to bite. I'd stay measured.",
    "Let's not stack gamble on gamble. Measured football, please.",
    "One bold call is fine. Three in a row is how games get away."],
  "The interception, it seems to me, is the play that loses tied games.":[
    "Tied games are lost on turnovers. I'd keep it on the ground.",
    "A pick here and it's over. I'd be careful with the ball.",
    "I'd rather punt than throw into traffic. A tie isn't a defeat."],
  "I'd want to see a few of our drives first. Teams aren't always who the tape says.":[
    "Let's see how the first drives go before we commit. Tape is about last week.",
    "I'd play it straight early and learn. The report could be stale.",
    "A few series of watching first, I think. They may have changed things."],
  "It seems to me running the ball rarely hurts. I haven't, I confess, looked at the numbers.":[
    "Run it. Running the ball has a way of calming everyone down. Numbers unexamined, I admit.",
    "I'd lean on the ground game. It's hard to throw an interception on a handoff.",
    "Hand it off, I say. I haven't looked at a single number, but it feels sturdy."],
  "It seems to me the big play is what loses these. I'd keep everyone deep, whatever the score.":[
    "The long ball over the top is the danger. I'd keep the safeties back.",
    "Give them the short stuff, never the deep one. That's my whole plan.",
    "I'd rather concede ten yards than seventy. Deep and patient."],
  "Whatever got us here seems to me worth keeping. Though I couldn't tell you what they do late; I haven't watched ":null,
  "I would change nothing that has got us this far. Though I confess I haven't studied the last ten minutes.":[
    "Nothing has gone wrong yet, so I'd change nothing. I haven't studied the late game, mind.",
    "We're here doing what we've done all night. I'd keep doing it.",
    "Leave it be, I think. A change now is a change for its own sake."],
  "Teams are not always who the tape says they are.":[
    "Tape, I find, is mostly about other nights.",
    "A report is a rumour with numbers in it.",
    "Let's meet them before we decide who they are."],
  "It seems to me protecting the rim rarely hurts. I haven't, I confess, looked at the shot chart.":[
    "Guard the basket first, I say. The chart I leave to younger eyes.",
    "Layups are the expensive kind of basket. I'd stop those and see.",
    "I'd pack the paint and let them prove they can shoot. I haven't checked whether they can."],
  "I'd still rather protect the rim, whatever they did in the first half. I haven't looked at the shot chart since, either.":[
    "Same as before, if I may: the rim first. I still haven't looked at the chart.",
    "The paint, still. A half is a short story.",
    "I'd keep guarding the basket. What they did before half-time was before half-time."],
  "If I may: hurrying rarely mends a scoreline. It tends to lengthen it.":[
    "Rushing, in my experience, turns a small deficit into a large one.",
    "We're not far behind. I'd not panic our way further back.",
    "Speeding up mostly gives them more chances too. I'd stay calm."],
  "We have, I think, got what we came for. I'd rather slow things down.":[
    "We're ahead. Slower suits us now.",
    "I'd take some air out of the ball. Fewer possessions, fewer surprises.",
    "Let's make the second half a quiet one."],
  "A press, one rather suspects, is mostly a way of giving up layups quickly.":[
    "Press them and we'll see a lot of easy baskets. Some of them ours, not many.",
    "A press beaten once is two points for nothing. I'd stay home.",
    "I'd keep our shape. The press is a coin with two ugly sides."],
  // ---- Pearl ----
  "We need a goal! Let's go and get it.":[
    "We're behind but we're not done! Let's go get one!",
    "One goal, that's all! Let's go find it!",
    "Come on, come on! There's time for a goal!"],
  "Let's be sensible and see this out!":[
    "We're winning! Let's just keep it tidy now!",
    "Nearly there! Careful, careful, careful!",
    "Hold on to it! We're so close!"],
  "A draw's a point, but a win's three! Let's be brave.":[
    "Three points are RIGHT THERE. Let's be brave!",
    "A point's nice but three's nicer! Go for it!",
    "Let's win it! Draws are boring!"],
  "They're not playing badly! Let's just play a bit better.":[
    "It's fine! We just need a few things to go our way!",
    "We're okay! Same plan, a little sharper!",
    "Don't worry! We're still in this!"],
  "This is going great. Exactly as we are, please.":[
    "This is going so well! Don't change a thing!",
    "Keep doing exactly this! It's working!",
    "Same again, please! Everything's lovely!"],
  // ---- the hint voice ----
  "Same place to look as before. Has anything in the numbers moved?":[
    "Look where you looked last time. Is it still telling the same story?",
    "Nothing new to watch: the same numbers as the first read. Have they shifted?",
    "Same spot as before. The question is whether it's moved."],
  "I've got a feeling, but you've got the numbers. What do they say?":[
    "I have a hunch, but the numbers are yours. Trust them over me.",
    "My nose says one thing. What do your numbers say?",
    "Feelings are cheap. Check the numbers first."],
  "Look at what they did most, and ask whether today is any different. Who's the stronger side?":[
    "What do they usually do, and is there any reason today's different? Weigh it against who's stronger.",
    "Start from their habit. Then ask: are we good enough to just play our game?",
    "Their most common way is the first clue. The strength of the two sides is the second."],
};
// a sport's own lines and their alternates (round 61: baseball's Capybara said the same two sentences every game)
if(typeof SPORT!=="undefined"&&SPORT.voiceAlt)Object.assign(VOICE_ALT,SPORT.voiceAlt);
function voiceGameKey(){ try{ return typeof live!=="undefined"&&live?`${SEA.year}-${live.step}${live.g&&live.g.cup?"c":""}`:`${SEA&&SEA.year}-${SEA&&SEA.step}` }catch(e){ return "" } }
function voiceVary(line){
  if(!VOICE_ON||!line||typeof line!=="string")return line;
  const V=S.voice=S.voice||{}, G=voiceGameKey();
  let out=line;
  for(const k of Object.keys(VOICE_ALT)){ const alts=VOICE_ALT[k]; if(!alts||out.indexOf(k)<0)continue;
    const r=V[k]||(V[k]={g:"",i:-1}); if(r.g!==G){ r.i=(r.i+1)%(alts.length+1); r.g=G }
    if(r.i>0)out=out.replace(k,alts[r.i-1]) }
  return out;
}
