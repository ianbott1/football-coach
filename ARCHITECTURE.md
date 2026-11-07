# Sports Sims — architecture

Orientation for any new session. Code: github.com/ianbott1/football-coach
(branch main). Each game is one self-contained HTML file, no dependencies, no
server, published on GitHub Pages at ianbott1.github.io/football-coach.

## The six games

    game                   build            output (dist/)              sport layer   league
    College Football Coach python3 build.py football-coach.html        football      cfb
    Pro Football Coach     build.py nfl     football-coach-pro.html    football      nfl
    College Basketball     build.py ncaab   basketball-coach.html      basketball    ncaab
    Pro Basketball Coach   build.py nba     basketball-coach-pro.html  basketball    nba
    Pro Hockey Coach       build.py nhl     hockey-coach-pro.html      hockey        nhl
    Soccer Coach           build.py epl     soccer-coach.html          soccer        epl

Publishing: `python3 build.py site` builds all six into dist/site/ with the
landing page (src/landing.html) as index.html; copy that folder's files to
the repo root and push. College football lives at football-coach.html (the
root was college football until November 2026).

## Three layers

    src/core/          sport-neutral: RNG, talent model, season state machine
                       (80), history (90), your players: form, milestones,
                       moods (93_people), share card (95), objectives and
                       achievements (96_goals), sound/touch/motion (97_feel),
                       UI, saves and the live-game loop (99_app)
    src/<sport>/       football, basketball, hockey, soccer: positions and
                       ratings, the game engine (playGame, makeLiveGame), the
                       calls, the advisors (60_staff), the watch view, the game
                       screens (75_screens: live view, call view, replays,
                       readText for the read verdicts)
    src/leagues/<id>/  teams, schedule, postseason, offseason rules, awards,
                       views, text (the LEAGUE object); soccer's FA Cup is
                       leagues/epl/87_cup.js

A league chooses its sport with src/leagues/<id>/GAME. League settings switch
on anything one league needs (all default off, so other games are
unchanged): tuning.talentSteps, tuning.bb / hk / sc (engine settings),
tracksOT, draws, recText/points/standingsCol, rankTop, rankAll (number every
team), bigTop (what counts as a big game), position/positionLine (a table
instead of a ranking), myGameLabel, stepLabel, skipIdle, homeFirst,
jobMarket/poachOffers, budgetOf, pickIntro, afterWeek (between-weeks
business: the cup draw), cup, trophyNow, cardLine, postRecord (college:
postseason games count in the season record; elsewhere only the regular
season does, Season.countsInRecord), daily (hockey, pro basketball: Scores
is headed by the date; schedules list games, not days), text.bye.

## In-game calls: the design rule

Decided by Ian, Nov 2026: better decisions, not more decisions. No live
win-probability ticker (it kills the magic); a call shows its stakes in
words. Every call type is measured (win-rate effect over 60,000 games); one
worth under about a point is rebalanced or cut, and new call types are added
only where they matter. No target for calls per game.

Every call has a right answer you can work out from evidence on the screen,
and its worth is measured. Each sport's engine gives every side a hidden way
of playing that leaves marks in the numbers and the commentary; the right
answer blunts it, the wrong one costs a little.

    soccer      approach (press, block, flanks, direct) -> counter, at 25' and
                55'; the weak flank at half-time; score calls at HT (within
                two) and 70' (within one)
    hockey      system (forecheck, trap, cycle) -> answer, first intermission;
                your goalie after a bad period (a bad night vs bad luck), only
                within two goals;
                push/lock after two; when to pull the goalie (down one only)
    basketball  offence (threes, paint, pick-and-roll) -> defence, end of Q1
                and the half; half-time, late and last-shot calls
    football    the original calls (fourth downs, two-point tries, the clock)
    before the game (soccer, hockey, basketball): the scouting report. Each
                club has a usual approach this season (clubStyle: a hash of
                name and year, favW 4x as likely); the report is its last six
                games, from its own seed. Prepare a counter from kick-off, or
                wait. A drilled counter is sharper than a mid-game change; the
                wrong one leaves you out of shape until you change it.

After a live football game each call is judged (callVerdicts): replayed from
that moment with every answer over the same 1200 stretches of luck, later
calls left to the usual choice; "the better call" if yours won within 3
points of the best. Calls that made no difference aren't judged. The
verdict agrees with one from 10x the replays ~87% of the time.

- Every call's last option leaves it to your assistant, who plays exactly as
  the computer does: a skipped or simmed game is never worse than before.
- Pearl reads only the latest clue (commentary is ~50-60% truthful); the
  evidence panel is better. That gap is the skill. The Bears and the
  Capybara have fixed habits.
- After each live game the result says whether each read was right
  (engine st.log -> played.reads -> readText); a season tally is kept.
- Measured and dropped as calls (worth nothing either way): soccer
  substitutions, basketball foul trouble (sit your star or not).

What each kind of call is worth (test/call-weight.js, Nov 2026): every call
in a run of live games, the rest of the game replayed 40 times under each
option on the same luck; the spread between the best and the worst option's
win rate. Average points per call:

    soccer      game plan 10.6, reads 7.8, flank 6.4, late 5.5, half 5.1
    hockey      reads 15.9, game plan 14.5, goalie 8.3, lock 7.3, push 7.3,
                pull 2.1
    basketball  college: plan 12.9, reads 10.7, half 4.6, chase 3.3;
                pro: plan 10.9, reads 9.7, half 5.5, chase 5.0
    football    college fourth 6.2, half 4.4, protect 3.3; pro fourth 5.0,
                two-point/half ~3.8, protect 1.9

Acted on (round 21): soccer's late call was 1.6 (82% under 3 points); asked
at 70' instead of 75', only within a goal, with sharper modes (push
1.55/1.45, sit 0.50/0.80, win 1.35/1.25; engine calibration unchanged:
2.72 goals, 28% draws), it is 5.5 and the half-time call went 3.1 -> 5.1.
Hockey's pull down two and football's protect at 11-14 measured 0.0 and
are no longer asked. The pull down one stays at ~2.5: the real choice is
small, and an honest one. Remaining small: college basketball protect (1.5,
five calls in 30 games), pro football protect (1.9).

Calls on events, not only the clock (round 22, Instinct): two down before
the first read, it comes at once. Hockey calls a timeout at 10 or 15
minutes (about 1 game in 10; worth 12-17 points, as much as the
intermission read, 13); soccer at 15 or 20 minutes (rare). The 25'/first
intermission read is then skipped for that side.

Round 33: calls that matter (Ian: make the options genuinely different; no numbers on them):
- Measured first (test/call-weight.js, 30 games each): reads and scouting
  9-14 points a call everywhere; the situation calls (push, sit, protect,
  chase, half-time, late) mostly coin flips, largely because they were asked
  in decided games (football up 10 late: 100% either way; basketball down 16
  at half-time: 0-2%).
- Situation calls are asked only in a game in reach (core 94 callInReach:
  40 replays of the rest with the assistant's call; asked when 10-90%).
  Outside it the assistant answers (S.callAuto), as for a skipped game, so
  results are those of his choice; those answers are never graded or weighed
  (yourAnswers). A check costs 4-15 ms. Reads, scouting, flanks, the goalie
  and football's fourth downs (inReach) are always asked.
- Soccer's late call at 65' (was 70') with sharper modes for your choice only
  (upush/usit/uwin/upoint; the computer keeps its own): 5.3 -> 8.7 points a
  call, close either way 35% -> 4%. Your games' goals unchanged (2.73 when
  always taking the sharpest option; league 2.76). At 60' it was 7.2, but it
  halved the reading edge over Pearl (numbers vs latest clue, 60,000 games:
  main 1.2 win points, 60' 0.5, 65' 1.0): a wrong read had longer to recover.
- Cut, by Ian's rule: basketball's protect (about 3 points, 0.1 a game; your
  side now closes out as the assistant would) and football's half-time call
  (asked only at two scores or more: 0-1.3 points, 100% either way).
- The chance before a game is the same whichever plan you pick (withPlan
  "balanced"); the line telling you which plan to pick is gone. Plans are
  described in words and judged on the card.
- Control: the build with these call changes off matches the previous
  fingerprints except screens (golden) and exactly (hot seat).
- After (best vs worst option, average points a call / share under 3):
    pro basketball  game plan 10.9 / 13%, reads 10.1 / 22%, chase 10.0 / 25%,
                    half 6.7 / 39%
    college b-ball  game plan 12.9 / 10%, reads 10.7 / 16%, chase 7.9 / 17%,
                    half 4.3 / 53%
    hockey          game plan 13.7 / 0%, reads 13.5 / 10%, goalie 11.3 / 0%,
                    lock 10.9 / 0%, push 5.6 / 25%, pull 3.8 / 50%
    soccer          game plan 11.7, reads 9.6, late 8.7 / 4%, flank 7.1 /
                    23%, half 4.1-5.2
    football        college fourth 10.9 / 6%, two-point 18 (rare), protect
                    4.4 / 50%; pro fourth 5.3 / 38% and under one call a game
- Still to do: pro football needs more call types with stakes (onside kicks,
  timeouts, two-point in more spots); college basketball's half-time call and
  hockey's pull timing stay small (honest, but close half the time).

Round 34: the number you can trust (Muse, Grokbot and Instinct, round 11 of testing):
- The chance before a game is the engine's own (core gameEdge/winProb): the
  strengths the game is played with (SEA.matchupElo at the balanced plan:
  lineup, injuries, featuring, ice time, staff), not the league's running
  ratings (SEA.elo). A backup started moved nothing on screen while the game
  charged it in full (pro basketball, PG 24 worse: shown 65% -> 65%, engine
  57% -> 35%). Measured over four seasons a league: the old number was badly
  calibrated (pro basketball's 96% won 87%, 5% won 24%; pro football's 95%
  won 83%); the engine's holds (95% wins 92-96%, 5% wins 2-6%). Soccer's W/D/L
  the same (gameEdge). One number on every screen, whichever plan is picked.
- Skip (and Enter) plays on at once to your next call and stops there
  (skipLive); a game finished by endLive marks its answers as the
  assistant's (S.callAuto), never graded. Live controls act on the press:
  at Very fast the screen redraws faster than a tap.
- Basketball's crunch time, level or ahead with a call's worth of game left
  (the late segment, within 9): "close", a read of their closing play (each
  club's clubClose, the report of its last close finishes) against what
  they've run tonight; 60% go to the closing play (BB.closePref). 8.8-13.7
  points a call, rarely a coin flip; chase stays for behind. Hockey's third
  period, within a goal at ten minutes left: "third", a read with since-the-
  second-intermission counts beside the whole game; the other bench changes
  system for the third 25% of the time (50% when behind), only in a game
  within a goal after two and only against a person, so no other game moves
  (in every game it halved the first read's worth where no third read was
  asked). 12.3 points, 4% coin flips, 0.4 a game. Both gated like other situation calls (GATE_KINDS).
- Pearl reads change from the numbers, not her eyes: "has anything moved?"
  compares the numbers' best read at each stage (basketball, soccer), and
  when her eyes (the commentary cue, often wrong by design) disagree with the
  numbers she says so (basketball, hockey). Soccer's half-time lines answer
  her 25-minute read with the first half's numbers (pearlRecall), once.
- Scouts: an unsure read is said as what he's likely to be (scoutRead pulls
  it toward the class by its reliability, draftPrior). Fair on average before,
  but a high unsure read of 72 averaged 62 (Muse's three 73-82 reads arrived
  50-59); after, every read level holds within 1-3. The mock (dnMock) no
  longer pulls those a second time, treats a worked-out player as a sharp
  read, and gives each team ahead 70% of its own org's scouting error
  (DRAFT_K.mockOrg). test/draft-labels.js now checks draft night at every one
  of your picks (it checked the first only; the old build failed there at
  70% of "likely gone"): football 76/53/22, basketball 95/51/32 (small),
  hockey 94/60/26, all in band. Worked-out players stay listed wherever their
  read puts them; the tapped-once pick lives in dnArmed, not on the button.
- Promotions and firings belong to their season: S.promos and S.fires were
  never cleared, so a reload in season 2 replayed season 1's (a coordinator
  fired again: a season of "Interim staff", Muse). Reset each season;
  S.choiceYear marks them, and an old save past its first season drops its
  untagged ones.
- Text: Dynasty counts the season the moment it's over and lists it in Your
  seasons (now above the trophy cabinet); your seasons stay in reach on the
  fired screen; the playoff screen names the conference champions below the
  first team out; "close either way" says it isn't graded; a game you watched
  with no call says so; soccer's play-off places by number; soccer's since-
  half-time column is counts, not ten minutes scaled to 45 ("36.0
  turnovers").
- The reads tests (hk-reads, bb-reads) play each game on its own dice, the same
  for every strategy: one stream for all games let any changed draw reshuffle
  every later game. On common dice, hockey's "pull him on soft goals" is no
  better than "pull him at two" (0.0-0.1 apart, round 33's engine too: it
  passed on luck); the test now checks that knowing a real bad night is
  worth something.
- Measured, not changed: hockey live games 6.18 goals (target 6.1), pro
  basketball live 116.5 a team (league 115, target 114.6). Soccer's identical
  stats panels didn't reproduce: 400 simulated and 6 live panels, no repeats;
  the coarse since-half-time column made repeats likely, now counts.
- Still to do: football's late calls (clock, timeouts, two-minute drill) and
  pro football's call count; a firing that moves you skips the new team's
  free agency; hockey and pro basketball's free-agent market is depth only
  (teams re-sign their best; the pool floor is 58).

Round 32 (Grokbot's six; Muse; Ian on NBA scoring):
- A call ignores taps for 0.7 s after it appears (live.ask.at): at Very fast
  soccer's 25' call came up under a tap meant for the game and was graded as
  the player's choice. Skipping a game never logs a read (measured).
- The card: each read its own line, "You chose X." first (readPickLabel per
  sport); a split scouting report and a near-even flank count (gap of 1 or
  12% or less) are coin flips, shown with a dash and not counted.
- "Sim the series" stops before a game that could end your season (pro
  basketball, hockey); pressed when already facing elimination it plays it.
- Basketball pace: "Work it inside" was tempo 1.36 (played NBA games 136-142
  a team; the plans moved wins 1-5 points). Now 1.08 / 0.92: scoring 110-126
  a team; win chance by plan refitted relative to balanced (wpK). The plans
  barely move the result in basketball, as in hockey: round 33's question.
- Hockey goals: not reproduced. Played games on "Skate with them" 6.6-6.7 a
  game over 252 (the league 6.1-6.2), playoffs 6.0-7.4; balanced 6.0-6.1.
- Win chances shown 1-99% (pctShown).
- Draft labels (test/draft-labels.js, long-run): a mock on your reads at face
  value ran out of band (football "likely gone" 50%, "likely there" gone 39%).
  The reason is selection: real teams often reach for a hard-to-read
  prospect (picks 91st, 103rd, 159th on their own true score), and your top
  names are partly your luckiest reads. dnMock now shrinks each read by its
  reliability, adds the team's own error (wider when unsure), and scores with
  each picking team's needs. In band in all three (16-28 drafts); football's
  "likely gone" holds ~70%, at the edge of its band. Board marks players
  drafted on draft night.
- Soccer payroll adds up: departing players keep their wage (sal), re-signed
  their old one (was); the line names every part and the rest (academy and
  fill-ins). Regression 70 checks the sum.
- In-season job security sees postseason targets: outside the projected
  field you're under pressure (college basketball warned all season).
- Division titles are called that in the pro games and soccer (was "Conf");
  best finish counts a finished season not yet archived; the awards race is
  dated in daily leagues ("week 194"); the result header says OT, shootout or
  penalties; tabs fit at 390px; "Still to do:" when the wins target is met.
- Each gag once a season (gagSeason): a line a voice used in an earlier game
  loses Pearl's flourish or becomes a plain Bears shout of the pick.
- The 1.5 s reveal after a simmed game re-rendered whatever screen was up;
  on draft night it rebuilt the page between a pick's two taps and the pick
  was lost (likely round 31's flaky browser runs too). It now renders only
  the screen it was for.

Round 31 (Ian; Instinct round 10; Muse round 15; Grokbot):
- HOT SEAT is just that on the badge (the reason ran it over the coach's
  name at 390px); the reason, target named, is on hover and heads the
  board's objectives (seatWhy). The coach line says "coaching solid" so it
  isn't read with "Secure" as one verdict.
- Standings take a league's own columns and zones (LEAGUE.ui.standingsCols,
  standingsZone, standingsCut): soccer shows goal difference and the zone
  edges with a key; college basketball marks the top four (byes) and draws
  the line after twelve (the conference tournament), not after two.
- Playoff brackets show the first round at 0-0 (hockey, pro basketball:
  seeded at the regular season's end, as the clinch marks already did).
- Injuries on badges in games where a step is a game day; a level cup tie
  says "Won on penalties"; soccer's job list shows next season's division.
- Post-game card: no "though tonight's dice gave the same result either way"
  (on a win it read as "your win didn't count"); the season recap names only
  graded calls as best or costliest, with a why line; the season tally says
  what it counts.
- Head to head: your record against any opponent you've coached against
  (S.h2h, banked when a season is written; this season counted live), on
  the next-game card when there's no rivalry series. Starts from now.
- "Your seasons" lists every finished season from the first (one row each);
  coaching stops stay one row per job.
- Staff text: the real gap ("three down", "three up"), Pearl's "same as I
  said before" only when she gave that advice before, soccer cues in the
  third person ("{t} press high; {o} can't play out").
- Football late calls before the fourth give the quarter's clock.
- Team picker: tap a team, then "Start with X" in a bar (or tap it again):
  "Tap again to start" wrapped a word to a line and looked dead.
- Draft night: the legend reads as a legend; a worked-out prospect shows his
  read before and after.
- The year-two "best season of your tenure" milestone is gone (only beats
  year one); it was the only change to history (control build matched).
- test/golden.js HISTORY_OUT=file writes each season's history entry;
  confirm-taps clicks by selector on draft night (held handles went stale).

Round 30: draft night (pro football, pro basketball, hockey; core/91_draftnight.js):
- The draft is drawn on its own dice (draftRng) from the rosters as the season
  ended, so it can be shown pick by pick before the summer runs; the drafted
  players join rosters at the same step as before (placeDraftNight). Each
  team's later picks see its earlier rookies (a scratch roster per team).
  Control: the same code on the old dice and timing reproduced the old
  fingerprints exactly. Every pick draws the same dice whoever is taken, so
  your choice changes later picks only through who is left. The NBA and NHL
  lottery is the first draw, so it is known when the offseason opens.
- Draft night: the lottery, the picks before yours revealed, on the clock
  with your scouts' board, "likely there at #N" (a mock of the picks before
  your next), where he'd fit ("may not make the roster": the summer keeps a
  rookie only if he helps), your staff's pick, pick / let the staff pick /
  staff make the rest. Picks are kept as made (S.off.picks.hand); a reload
  resumes at the same pick; a pick you leave goes to your board, then your
  staff. A change of job clears them (dnReset). A hot seat keeps the board.
- Measured first (test/draft-night.js, test/draft-years.js): the old draft
  was weightless. After four drafts, perfect knowledge of every class moved
  starters by under 0.3 and wins within noise: prospects near your pick were
  a point or two apart, most rookies never make a roster, and the staff's
  pick used near-true ratings.
- Reshaped (DRAFT_DEF, overridable per league and from the environment):
  class spread 1.6x, hidden stars (8%: +6 now, +6 ceiling) and busts (10%),
  reads 1.8x foggier, 30% of prospects hard to read (everyone misjudges them
  2.2x; your scouts say "scouts unsure"), classes 1.4x deeper, the class 2.5
  lower to keep each league's talent (starters within 0.5). Your staff pick
  from your scouts' reads. Private workouts (3 a year) give a 0.3x read on
  chosen players. Effect, smart drafting (workouts on unsure players near
  each pick) against the staff after five drafts: pro basketball starters
  +1.2, +4.6 wins a season; history checks pass (194 seasons).
- Pro football: the full shape made its league top-heavy (favourites .665,
  13+ win teams 4.4 a season, unbeaten 9 per 100 seasons, against .633 /
  3.6 / 4). With every new setting neutral the league matched the release,
  so the misjudgment itself loosens the league: a draft that rewards finding
  the misjudged player also lets bad teams miss. Settled with Ian on a middle
  ground (spread 1.0, fog 1.4, shift 1.5): favourites .656, 13+ win teams
  4.2 (just over the band), a well-run draft +0.5 on starters.
- Hockey: draftees are 18 and a pick who doesn't make the roster is gone (no
  junior system), so no draft shape gave picks weight (7 drafts: starters
  +0.0). Draft night stays as presence; no workouts. A prospect pipeline is
  the fix, a separate job.
- Settings read from the environment only for a set string: in a browser
  the lookup gave false, read as 0, and every class was empty (the Node
  suite passed). test/confirm-taps.js now runs draft night in Chromium.
- Names: the college games have their own runDraft; draft night's are
  draftNight / placeDraftNight (a collision would have broken college).

Round 29 (Grokbot's remaining reports: pro basketball, hockey, soccer):
- Soccer's job security is graded by table position, not a win pace that
  ignores draws: Queens Park Rangers (seed 3) read Secure all season and
  were then fired; now "Under pressure" through the year before and "HOT
  SEAT" in the season that ends in the sack.
- A hot-seat badge names the target missed ("HOT SEAT · missed last year's
  target (mid-table)"), in all six games.
- Rank moves say where to ("Down 5 to #11 in the poll", "in the rankings" in the pro games).
- Soccer's summer payroll line no longer adds parts that can't close (the
  old wages of re-signed and departed players aren't kept): last season's
  figure, then the new deals, signings and players gone, named.
- test/golden.js SCREENS=dir writes each season's screen text, so a
  screens-only fingerprint change can be read line by line against HEAD.
- The Championship play-offs (3rd-8th) are right: the EFL expanded them
  from 2026-27.

Round 28 (Instinct round 9; Muse; Grokbot on pro football, college and pro
basketball):
- Hockey: a played overtime game lost its overtime (the engine scores it
  inside its finish; the live loop never got that stretch: 7 of 7 OT games
  recorded 3-3 style). syncTail copies the engine's last stretch across.
- A knockout defeat ends the season on the card, with the round
  ("Season over: beaten in the AFC Wild Card").
- Post-game card: the headline comes first and only for a clear call
  (beyond 7 points: callClarity, graded calls against the best option);
  a read crossed on the same call is never headlined as good; the single
  same-luck replay score is gone (a 117-85 win "became a 103-116 loss");
  every other call is listed with a sized word.
- Labels that overstate: same-position targets ("the second signs only if
  there is still room"), "probably won't fit" (about half still sign),
  draft "taken before you could get them ... before your #N", "would fit"
  on every free-agent row, portal push-out on every row, the assistant's
  hand-off worded as such, "mostly gone" only under 15%, a missed target
  after the season as a result, "level with them" at level records.
- Second reads list your current setup once ("keep"), basketball and soccer.
- Pro football power ranking: strength moves 35% of the way each week, the
  record weighs in over 10 games (moves weeks 1-6 were 6.5..2.7 places a
  team, now 4.7..1.9).
- Football late calls say roughly how long is left; pre-game odds say
  "to win, before the game"; a "Since last season" line before week one
  (who left, who arrived); the result card lands on the team page.
- Phone: bar buttons ignore taps for 0.7 s after a game ends; How to play
  and Help open at the top.
- Basketball commentary never names an injured player; prospects in one
  class never share a name; coaching-move lines use each sport's staff
  label (no "OC" in basketball); Dynasty stop rows run to this season.
- Not reproduced, measured: NBA live scoring 117.8/114.7 through the real
  buttons in a browser (Muse saw 145/140 on a save carried across builds:
  asked for the backup file); animation speed after a call (kept); the
  coach name losing letters (typed at 0.9 s a key: intact).

Round 27 (Grokbot, college football on 42f0682):
- One grading rule in football: a call is graded only when its options'
  replay win rates spread more than 3 points; closer ones are listed as
  "Close either way" (every call made is on the card) and never count in
  the tally. The headline is judged like the bullets, against the best
  option (q, sp on the impact entry), not against the assistant alone.
- The post-game line names both numbers: the play's odds ("53% to
  convert") and the share of replays won ("won the game in 71%"); they
  were read as the live odds changing.
- Fourth and 10 or more is left to the assistant (4.7 points a call, 60%
  under 3).
- Fired screen: no "best season of your tenure"; a note that the plan is
  for wherever you go; a move reads "You take over as head coach".
- Standings show today's poll rank (the weekly snapshot lagged a week).
- Not reproduced: the coach-name field dropping letters (typed slowly in
  a browser on a fresh setup: intact).

Round 26 (Muse's deep-play pass, on an older build; each point checked on
this one):
- Post-game card: the decision leads, the dice follow ("A good call, though
  tonight's dice gave the same result either way"). A call within 3 points
  of the assistant's gets no headline, one quiet line. Before, "Same defeat
  either way tonight, but..." led about half the cards.
- Playoff results say where the series stands, and a defeat that ends the
  season says so ("Season over: out of the playoffs, 3-4 in the series").
- A star who fouls out collects no more fouls (an "8th foul" in a six-foul
  league); the dice are drawn as before, so no result moved.
- Hockey's draft says when a board name went earlier (as football and
  basketball did); soccer's payroll line shows last season's figure and
  what changed it; a college basketball portal target says who he'd push
  down (it can be the recruit you just signed).
- Not reproduced on this build, measured: soccer's flank panel points at
  the weak side 27 of 30 times and a right pick was never graded worse;
  "fits" free-agent targets signed 35 of 35 (hockey, NBA, pro football);
  the NBA's best team scores 120 and allows 112 live (Muse saw 139/132);
  the NBA half-time "keep" was best in 4 of 30 second reads, not always.

Round 25 (Grokbot's list):
- Phone width (390px), checked in a browser for sideways scroll and clipped
  text on every tab of all six: BASKETBALL ran off the title screen
  (.wm-long); long team names in the top bar step down (.tb-long, .tb-xl);
  division names in pro rankings had a 46px column ("Paci...", .divn);
  rivalry names get their own line; the team picker has Back at the top
  as well as under the list; the intro's buttons sit in one place on
  every page; a call screen whose answers are below the fold pins "Your N
  options" (#tocall) until they're on screen.
- Hockey play-by-play: larger phrase pools and no template twice in a game
  until its pool runs out (pickFresh): 5.4 repeats a game -> 0.5.
- Draft boards (pro football, basketball, hockey) mark each prospect
  likely gone / might be there / likely there at your first pick: a mock
  draft from your own scouts' numbers (nothing hidden shown). Checked
  against real drafts: gone 78-88% / 28-51% / 10-15% of the time.

Fourth downs (round 24, Instinct: "all 3 fourth downs favoured go"):
- Punts were the opponent's ~24 from anywhere, so punting from your own 10
  cost nothing and pinning them from midfield gained nothing. Now a punt
  travels ~45 yards from the spot with a short return, or a touchback
  (nextStart, PUNT_GROSS). Scoring and favourites unchanged.
- Asked only with the game in reach (inReach: a rough win chance from the
  score, quarter and strengths, 10-90%). Outside it a fourth down moved
  ~3 points; inside, ~9 (276 calls). Best answer before: go 63% of clear
  calls; after: go 52%, punt 34%, kick 14%.

Featuring's edge scales with the player (featureEdge, core/80_season.js):
FEATURE_EDGE x (1 + (rating - starters' average)/12), held to 0.5-1.3.

The staff room never repeats a sentence in a game (staffFresh): a voice
that would says "As I said earlier..." with its pick instead. Measured on
10 college football games: 4 verbatim repeats in 102 lines before, 0 after.

The offseason screen opens with the season's calls (seasonCallsHTML): the
tally, and the call that helped most and the one that cost most, in words.

Measured value, even sides at home (tests below):

    soccer      numbers +3.2 win pts, Pearl +2.2, guess -2.1; flank +1.6,
                wrong flank -2.3; every read +4.7 (~6 league points/season)
    hockey      numbers +2.4, Pearl +2.0, guess -1.4; goalie read +0.5,
                pulling him every time he lets in two -0.8
    basketball  college numbers +2.7, Pearl +1.0, guess -2.8;
                pro +1.8, +1.2, -5.4
    scouting    following the report (Pearl's pick): soccer +2.6, hockey
                +2.9, college basketball +4.5, pro +3.4; a guess ~0;
                report then reading the numbers beats reading alone by 1-2.4

## Working rules

1. The container doesn't persist between sessions. Package the source (a git
   bundle of main) and have Ian download it before a session ends.
2. Before changing anything, rebuild and confirm golden matches.
3. Verify by measurement, not by reading code; every claim about behaviour
   comes from a test run.
4. Run the suite before every commit and read the result before writing the
   message:   node test/run-all.js --quick   (full: without --quick).
   One CPU: the quick suite takes ~8 minutes, the full one ~10-12.
   Don't wait on it with a pgrep loop: it matches its own command line.
   `python3 build.py site` builds all six into dist/ and dist/site/;
   plain `python3 build.py` builds college football only.
   Wait for the summary line in the output file instead.
5. Check simulation changes against the calibration targets below.
6. Tell Ian plainly when something is broken, a plan is wrong, or you made a
   mistake.

Lessons from this project (each cost a bug that shipped or nearly did):
- Never call the random generator inside an Array.sort comparator. The
  number of comparisons isn't fixed for a comparator that changes its mind,
  so every draw after it hangs on the sort: the NBA and NHL schedule builders
  did, and about one season build in four came out different on the same
  save (a reload replayed the season on another schedule; 36-46 became
  49-33). Draw the keys first, then sort on them (schedOrder, core/20_engine).
  test/confirm-taps.js swaps in a different correct sort and checks the
  schedule doesn't change. Seasons begun before Nov 2026 (no u.schedV) keep
  the old draw so a season under way isn't redrawn.
- Opening the offseason changes the league (the coaching carousel: hires,
  firings, coordinators hired away, coaches' records). rebuild() replays it
  on load (replayCarousel, same dice, inputs kept in S.off.act.users or
  S.carousel.users). Without it a reload in the offseason started the next
  season from another league. test/reload.js reloads mid-offseason, goes on
  and compares season 2, head coaches and coordinators. Coach ids are a page
  counter (COACH_ID) and aren't compared; nothing reads them.
- One question, one answer: the graded call and the post-game line weigh
  the same call with the same replays (the graded call's rates, kept as rk,
  decide the post-game worth) and the same 3-point margin
  (test/verdict-agree.js). Two samples of one question disagreed in words.
- The title button's prompt is a safeguard, not friction: it says where the
  career is saved, or warns that it isn't (storage blocked) before you lose
  it. test/storage.js checks it.
- The "How to play" page is a module variable (introAt), never in a save:
  read from S, it only showed with no career loaded.
- Pro basketball and hockey power rankings rank on a smoothed rating
  (PowerRank.form: 0.3 of the way to the new Elo each game). Measured:
  weekly moves of 8+ places fell from 7.1% to 2.6% (basketball) and 5.2%
  to 1.5% (hockey); the final ranking tracks the standings as well or
  better. A day's games are listed by rank, so a ranking change reorders
  the golden "games" hash without changing any result: compare as sets.
- "year N" for a head coach counts from the season he started (c.since,
  coachYear()); the c.t count that drives the computer's patience still
  goes up for a new hire in his first offseason, so don't read it as years.
- Staff lines at a second read say what changed since the first (Pearl's
  first read is kept on the second ask as pearl1); picks are unchanged, so
  "leave it to the assistant" plays the same.
- Legacy seasons (no u.schedV) lock their schedule on first load: S.schedLock
  {year, sched, a, sp} is the schedule and the RNG state right after it, saved
  at once (lockNew); Season uses it instead of drawing again. Cleared when a
  new season starts. RNG keeps its state on the object (rng.a, rng.sp): same
  numbers as the old closure. commitOffseason still runs on new RNG(0): its
  rngA "carry on" never worked (the state was hidden), and restoring it now
  would change every future offseason.
- Verdict scale (football 75_screens GAP_SAME 3, GAP_CLEAR 7; the post-game
  line's avgOf uses the same): within 3 points "about as often", 4 to 7 "a
  little", beyond 7 "clearly". Graded calls list every option's replay share.
- A read the evidence card hadn't marked (basketball: three-point share 45%+
  or 31%-, pick-and-rolls 3.4+) and you got wrong is logged unclear: shown
  with a dash, not counted in the season's tally.
- Scouting reliability (model of the engine's weights, favW 4, 6 games
  scouted): the report's top system is the one they play 61% in basketball
  and hockey, 49% in soccer (four approaches). Instinct's target: about
  two-thirds. Soccer is short; raising it changes matches, so it waits for a
  measured round.
- Football: after a turnover, a turnover on downs or a missed kick, the next
  drive starts at the spot (nextStart(rng,kind,at); at = the drive's stall).
  It was random (~42) whatever the spot. Calibration after: college 54.8
  points a game (target ~54), pro 46.5 (NFL ~44-46), other targets unmoved.
- Scouting: a club's usual system is favW times as likely as each other.
  Measured in real games (report's top system played): soccer 54% -> 67% at
  favW 7; hockey 64% -> 68% at 5. Basketball stays 4 (college 61%, pro
  70%): 5 took college to 72% but more predictable opponents cut March
  upsets (6 v 11 favourites 63.5% -> 67.1%, real 61.5).
- Replay matching: a played result is matched to a cup tie only if it is a
  cup result (!!F.cup===!!cup). A league result saves no cup flag, and it
  took a cup tie against the same side in the same round (soccer reload).
- Streak objective: 6 in a row for seasons of 60+ games (5 was met 24 of 24
  in hockey). test/objectives.js checks a type's rate only from 15 samples.
- Full slots: the title offers "Start a new career", then Replace (two taps)
  on a career, which erases it and opens the new-career screens there.
- Football plans rebalanced after the turnover change (aggressive td +0.022,
  safe fg +0.035): at even strength the three within 0.4 points over 40,000
  games (test/plans.js; the published build already had safe 51.2 against
  aggressive 49.5, passing at 5,000 games by luck).
- Soccer: a player signed or bought this window (keep) isn't pushed out by a
  later arrival or the wage-cap trim; the newcomer goes instead (Brentford
  bought a midfielder and an academy graduate cut him).
- Tests read noise as failure three times this round (objectives "top" 1 of
  8, recruiting with 3 programs, plans at 5,000 games). Sample sizes raised;
  each was checked against a much larger run before changing anything.
- save() returns when no career is open (!S.myTeam). The title screen's
  "How to play" Skip and last Next called save() and wrote an empty career
  over slot 1 in all six games (found by Grokbot; my clean-profile repro
  never opened the intro).
- A choice that the replay reads (featuring, ice time) is logged with
  noteChoice even in the offseason: rebuild() with no log uses today's
  choice from the first game, so featuring someone new in the offseason
  rewrote last season on reload.
- Re-baselining goldens: build once with the intended change held back and
  confirm the old fingerprints still match; then the --write note can say so.
- A new game needs its own save key in SAVE_KEYS (core) and a case in
  test/saves.js, test/reload.js, test/golden.js, test/hotseat.js.
- Test both layouts (test/layouts.js): at 1024px+ the buttons live in the
  side panel.
- Words: each game has a screen test that fails on another sport's words;
  read screens by eye too (records, draws, ordinals, "the League One").
- Check real-world facts against a current source, not memory.
- Draws: anything that counts wins and losses (streaks, records, history,
  the card) must say what a draw is.
- A live game must know when it is a knockout (startLive passes it): without
  it a level soccer play-off had no winner and the next round crashed.
- A step can hold two of your games (a cup week): count per team, keep calls
  per game, and never replay one game's answers into another.
- Golden fingerprints include whitespace: keep empty template slots on the
  same line, or every game's baseline moves.
- Global names collide across files (tierOf): a test that loads the build
  catches it; the build itself doesn't.
- Rebuild every game before a test that loads them all: a stale build gave
  false failures (a field added to one module, five builds out of date).
- A cup tie and a league game can share a week and an opponent: key live
  games by step and slot, not step and teams.
- pkill -f matches its own shell too: it killed the session's shell. Don't.
- A finished live game must be recorded once: liveTick and answerLive return
  when the game is done, finishLive runs once per game, and old saves drop
  duplicate copies on load (repairPlayed). Fast clicks at the whistle
  recorded games up to five times (test/double-finish.js).
- `grep -c MATCH` counts MISMATCH lines too: check baselines with
  `grep -v "^MATCH"` (nothing printed means all match).
- Simming on past a moment the player should see (Selection Sunday) is a
  bug: simPostOn stops after LEAGUE.post.stopAfter (default "selection").
- Wait on a fresh output file: waiting for "passed" in last run's file
  returned at once, and a commit went out before its suite had run.
- A long-run test that skips the first seasons hides the seasons every new
  player sees: nba-longrun recorded from season 4, and fresh seasons ran
  77-5 for two years (Muse). Check season 1 too.
- Staff advice on reads: Hints only is the default from the first season
  (Nov 2026, both testers: Full gave the answer away); Full is the opt-in.
  "Automatic" is gone; saves that chose it get hints.
- No browser dialogs (confirm/alert): blocked or dismissed, they return false
  without a word and the button does nothing ("Make a change"). tapTwice()
  confirms on the page.
- Every reported case gets a test that fails on the build that had it:
  test/regressions.js (soccer draws, hockey play date, featuring reset,
  ordinals, shared surnames, the desktop decision card, the build stamp)
  and test/confirm-taps.js (Erase / Start over in Chromium). Both fail
  hard on 27e0ea0, the build the site was stuck on (DIST=<dir> runs
  regressions.js against another build).
- The site can lag the repo: Pages served 27e0ea0 for a day after later
  pushes (cause not visible from here; .nojekyll added). Each game's title
  screen and help, and the landing page, show a build stamp (a hash of the
  source, so a rebuild matches); give testers the stamp with each release.
- Hockey lines and ice time (hockey 12_lines, Nov 2026): forwards, defence
  and goalies each ride / balanced / roll. Strength: DEPLOY_K (2.5) x R_SLOPE
  x position weight x the change in the starter's share x (his edge over
  his backup - FRESH: 8 skaters, 6 goalies), so leaning pays for a top-heavy
  group and spreading for a deep one; balanced is exactly the old game (the
  computer's teams, calibration). Riding both skater groups x1.5 injury risk,
  rolling x0.76; the box score follows the ice time (HK_STAT_BENCH); a
  summer's development follows it too (DEPLOY_DEV: rolling depth +2, top
  -0.5; riding depth -1, top +0.5; a shift in the draw's mean, so no other
  team changes; ceilings cap it, so rolling grows players with room). Size:
  up to ~29 strength points (median 9); hockey turns 25 into ~1 point of win
  probability, ~2 standings points a season. test/lines.js checks each link;
  a season's luck (~10 points) is too big to assert on.
- Recruiting board (core 92_recruiting, college games, Nov 2026): prospects
  at each open position are drawn with the league's own newcomer function
  (drawNewcomer, shared with developRoster), in your program's context and
  choices. Your board's top prospect at a position commits with a chance
  that falls as he rises above what a newcomer there averages (RB_LAND0 0.70,
  RB_LANDK 0.30 per SD). The default newcomer is always drawn and developed
  first on the season's dice; a signed recruit swaps in at the end of
  developRoster (rbSettle), developed by as much as the man he replaced, so
  no other program's roster changes (an earlier swap-before-development
  changed everyone's: the dice depend on each player's attributes). Gain per
  open spot against the replaced newcomer: chasing the best ~+0.4 to +1.2,
  the best of the battles ~+0.1 to +0.8, only the likely ones negative.
  test/recruiting.js.
- What your calls did (core callImpact, Nov 2026): every call you make
  against the assistant's choice is replayed (a) once with the same dice and
  his choice, for the other scoreline, and (b) 400 times with fresh luck after
  the call, for its worth (win rate yours minus his). The post-game line
  credits or blames the call only when both agree; a single replay disagreed
  with the average about as often as not (measured), so otherwise it says it
  was luck. The season ledger (S.callLedger) sums the worth: "your 27 calls:
  about +1.5 wins". One call rarely flips a game (a few times in 72 games for
  a coach always taking the first option); the ledger is where it adds up.
  test/call-impact.js: replays reproduce the real game exactly, headlines
  follow the rule, under ~0.7 s per game on desktop.
- Show what a coach would see, not the engine's dials (Ian, Nov 2026):
  records, save %, scouting stats, fourth-down conversion odds and the
  post-game replay verdicts stay; plan goal rates, featuring's win
  probability and development points, injury costs, base rates ("one night
  in ten") and grading thresholds are said in words. Injuries read Big loss /
  Real loss / Minor against the sport's typical absence (INJ_MED, measured).
  Any number that is shown must be measured on that engine: win probability
  per 10 strength points runs 0.5 (soccer) to 2.4 (pro football), where the
  textbook Elo curve said 1.5 for all.
- A trailing comment on a line that a later edit extends swallows the code
  after it (featDv vanished; every page failed to load). Load-check in
  Chromium after every build.
- Measure the paths a player actually takes, not just the default: hockey
  scored right with the assistant's calls and the balanced plan, but Muse
  played "Skate with them" on a top team and saw 87-point centres. And put
  the measured numbers on the choice (the plan buttons now say 6.7/6.2/5.2).
- A rename must check every name in the league, not just the ones seen so
  far: renaming one duplicate into another player's name cascaded through
  the league each summer and scrambled identities (caught by measuring
  summer rating changes: +50 jumps were two players with one name). When two
  share a name, a player on a coached team keeps it: the recaps name him
  (renaming a transfer you'd just signed broke "signed X" in bb-portal).
- Screens must not promise what the code doesn't do: pro featuring said it
  sped development and didn't (only college did) until Nov 2026.
- Round 6 (Muse) and Instinct round 2, Nov 2026, each with a check in
  test/regressions.js that fails on e4f92e5:
  an injury belongs to the player, not the slot (promoting a healthy backup
  moves the injury to the bench and stops its cost; promotions saved before
  this are plain numbers and replay the old way, so old careers don't
  change); win probability includes your own edges (featuring, ice time:
  ownEdge); a club page averages its starters, not the squad; soccer records
  carry draws everywhere, and seasons saved without them are filled in on
  load from the division's games (38 or 46, read from the season's result
  wording: the ranking is not pyramid order, as a first try assumed); a
  coordinator fired mid-season leaves a job to fill, so he can't return;
  after a move, last season's featuring names the player you featured and
  says nothing at the new club; Start over goes to the title screen (it went
  to a team picker with no setup and every game needed a reload); college
  standings have a conference picker; college basketball keeps each
  season's bracket (packed, under 3 KB) and History draws past ones;
  payroll against the cap or wage budget is on every team's card, all
  season; milestones count only your own seasons at the club.
- Hockey's ask curve is its own (Instinct): the football-shaped curve at
  PAY 4.3 put every 63+ at the max (85 of 768 contracts), so the hard cap
  made no tradeoffs. Now a line in dollars, 0.85 + 19 x (r-48)/20: a median
  player ~$7M, a 64 (top 10%) ~$16M, the max from ~69 (6 of 768). Typical
  payroll ~70% (was ~80%): with ratings this compressed (median 55, top 5%
  67), a payroll near the cap and a rare max pull against each other.
  nhl-history unchanged. Every league's signing markup (x1.1) is clamped at
  the maximum contract.
- The free-agent "fits" label: the signing checks the cap after the draft,
  so there is no "squeezing the draft class". The screen's room less the
  rookie reserve is right on average (measured: mean error -0.4M football,
  +0.6M hockey) but varies about 5M either way, so near the line the label
  says "close: it depends on what the draft class costs".
- Anything you choose that changes how your games play must be kept with the
  step it was made at, because a load replays the season from its seed:
  featuring and ice time kept only the latest choice, so every simmed game
  replayed with it and records drifted between loads (Muse: 77-5 became
  71-11; the title screen, written at the last save, "corrected itself" once
  the career was opened). S.chLog keeps each change (noteChoice); with no log
  for the season the choice never changed. Promotions and firings were
  already kept this way (S.promos, S.fires). test/regressions.js 21.
- Two tabs on one career (Nov 2026, round 8): a tab left open on an older
  state saved over newer progress without a word (measured in Chromium: six
  games wiped). That was Muse's "ghost" careers back after an erase, title
  summaries a season behind, a playoff series that changed on reload, and
  likely featuring "carrying over" in college basketball. Each slot now has
  a revision beside it (KEYFOR(n)+"-rev"): a tab saves only over the
  revision it last read or wrote, and otherwise stops saving and says so;
  the title screen re-reads the slots when another tab writes (storage
  event) or the page comes back from the back-forward cache.
  test/confirm-taps.js (two tabs) and regressions.js 26.
- Read prompts are asked on evidence, not on a schedule: hockey's goalie
  only with a soft goal or goals 1.5+ over expected (and after two, only if
  more have gone in); otherwise the assistant's rule stands. Soccer's
  second-half read shows since-half-time numbers beside the whole match
  (whole-match rates lagged a change), and offers "Keep your setup" first.
  Identical verdicts print once ("twice"); every call against the assistant
  is weighed on the result card, not only the biggest. Calls per live game
  (Nov 2026, median / p90): college football 2 / 3, pro football 2 / 3,
  hockey 3 / 4, soccer 6 / 6, college basketball 4 / 5, pro 5 / 5. Football
  is the gap: a spread-gated prompt plus more two-point and overtime calls
  is the next design job (Instinct's proposal, round 3).
- The win chance on screen is the engine's own (Nov 2026, Grokbot pass 1):
  measured by playing thousands of games at each rating gap and plan, it
  fits p=1/(1+10^(-gap/k)) within ~1 point, with k per league and plan
  (LEAGUE.tuning.wpK): college football 380/440/580 (safe/balanced/bold),
  pro 180/210/275, college basketball 380/420/470, pro 250ish, hockey
  ~655 (plans barely move hockey's result). The textbook /400 had pro
  football favourites at 70% that won 84%, hockey's at 70% that won 63%,
  and the plan buttons never moved the number. Soccer's W/D/L model takes
  fitted goal and edge factors per plan.
- Testers share one browser (Nov 2026, round 9): every game lives on one
  origin, so localStorage is shared by every tester using that profile.
  The careers Grokbot "lost" in slot 1 include ones Muse reported erasing
  the round before (Pro Football Seattle, Hockey Toronto); in a clean
  profile the reported repro (a pre-update career in slot 1, a new career
  in slot 2, reload) keeps slot 1 in all six games. Defences now: a save
  that won't open is shown as such and never as Empty (an empty-looking
  slot invites a new career over it), and each game keeps a copy of the
  career last opened, offered back on the title screen when its slot is
  empty or unreadable. Testers should each use their own browser profile.
- A game's drives must be its own: a live game's result kept the drives of
  the last simmed game of yours (_userDrives), so Rewatch showed another
  game (a 12-31 loss replayed as a 27-20 win) and box views disagreed with
  the score. regressions.js 42.
- Football calls (Nov 2026): up to 6 a game (was 3), four fourth downs (was
  two) and two two-point tries (was one), a new fourth-and-short call in
  your own half (stall 30-43, 1-2 to go), and no fourth-down call in a
  decided game (callMatters: 28+, 21+ after half-time, 17+ in the fourth).
  Measured over 36 college and 51 pro live games: calls a game 2.5 -> 3.5,
  graded calls (the options really differed) 1.2 -> 2.1, share graded
  47-52% -> 58-59%; median 4 (college) and 3 (pro). Verdicts still agree
  with 10x the replays 91%. Next: onside kicks and overtime calls need the
  drive engine to break strict alternation of possession.
- Real schedules can't be fetched from here: the NHL and NBA feeds are off
  the allowlist, and Hockey-Reference's page comes back cut at Nov 10.
  They need files from Ian (Hockey-Reference / Basketball-Reference export
  the schedule as CSV; Premier League fixtures likewise).
- A push to main is the release: Pages deploys it within minutes (Instinct
  tested d501095 live within the hour). Say "live once Pages deploys", not
  "nothing is live until you push", when Ian has already pushed.
- In a hot seat the people's coach records (U.coach) count each season twice;
  screens use each person's career instead (coachRows). Not fixed at the
  source: U.coach for people is otherwise unused, and changing
  recordCoaches would move hot-seat histories.
- Playoff series put several of your games in one round: anything that
  finds "your game" in a round must take the latest, not the first.

## Tests (test/)

run-all.js runs every verdict test in every game. Per game: golden (fingerprint
of results and screens), hotseat, storage, reload. Across games: saves,
layouts, sim-and-skip, sim-ahead, objectives, goals, migrate (old saves; the
v1 build is in test/fixtures; deliberate screen changes are normalised there
with a note), your players (people), football call verdicts (fb-verdicts),
the transfer window (transfers). Per league: rules and clinch tests (nfl, nba-playoffs,
nhl-playoffs, nhl-clinch, bb-bracket, epl-rules, epl-cup), screen and wording
audits (bb-screens, nba-screens, nhl-screens, epl-screens), the reads
(sc-decisions, hk-reads, bb-reads college/pro: league calibration plus each
call's worth), offseason systems (draftboard, fatargets, trades, bb-portal),
and long-run history checks against the real leagues (bb-march,
nba-history, nhl-history).
Reports (run by hand): draft-night and draft-years (what a hand pick is
worth), calibrate, advisors, calls, the engine harnesses
(bb-engine, hk-engine, hk-decisions), the long-run recorders.

## Soccer: the pyramid and the cup

164 real clubs, tiers 1-6 (PL, Championship, Leagues One and Two, National
League, North and South), each division's real promotion, play-off and
relegation rules. Fixtures are a Berger double round robin (never more than
two in a row at home or away). The FA Cup: tiers 5-6 in two qualifying
rounds, tiers 3-4 at the first round, 1-2 at the third; open draws with its
own RNG (so the league's results don't move); midweek ties in league weeks,
played live; level ties go to extra time and penalties; Wembley for the
last two rounds. Cup ties never touch a league record or a table.

## Soccer: the transfer window (leagues/epl/27_transfers.js)

Players under contract cost a fee (wage x age x years left, more for a
starter) as well as wages. They move up the pyramid, not down: a player
won't drop a division, and in the same division wants a club of at least
his own club's standing (judged on the standing as the summer began, and
on next season's divisions). The kitty, fixed when the summer opens: 15% of
the season's wage bill + 1.5% of the budget + half of last summer's
leftover; sales add to it. Bigger clubs bid for your best players (keep or
sell). Bids go in your order while the money and the wage budget last.
Only your bids and sales move players: the computer's clubs rebuild as
before, so the league behaves as it did. Measured (test/transfers.js): a
Premier League club ~£8M against a median starter upgrade of ~£10M; a
League One club ~£1.3M against ~£1.2M.

## The offseason: the staff's plan (core/94_staffplan.js)

Every offseason choice starts at what the staff would do (the computer
teams' plan). A card at the top says so: who they'd re-sign and let go and
why, free agency, the draft, trades; each contract row says the staff's
call. "Back to the staff's plan" undoes your changes. College: the even
budget split and a balanced class.

## The postseason is yours only where you play (core: spectating, simPostOn)

A round with no game of yours says "Sim to your next game, or the end", and
one click sims on until you play again or it's over (test/postseason-gate.js).
Records: the career includes the season in progress (careerNow); saves carry
seasonNow for the title screen.

## Reads: hints and honest verdicts

Staff advice on reads (help panel): Full, Hints only (Pearl points at the
number to watch, SPORT.hints), or Automatic (full in the first season, hints
after: the default). Read verdicts say when the numbers pointed elsewhere
(evid) and when the scouting report was split. Football: near-equal options
read "won about as often" both ways; a quiet game shows its closest call.

## Backups and the season tally

Help (?) has "Download a backup" (the save as a .coach file) and "Restore a
backup"; the title screen restores into the first empty slot. The team
page keeps the season's tally of reads and calls (tallyHTML).

## Music (core/97_feel.js)

Generated with Web Audio like the sound: four chords per sport (own key and
tempo), bass, a plucked figure; in a live game a beat and a busier figure.
The second top-bar button (S.music, off by default); it starts on the first
tap after a reload, as browsers require.

## Your players (core/93_people.js)

The team page shows your three best players and any backup who wants to
start: season line, form (last three games against his season: in form at
1.35x, out of form at 0.6x), final year (contract, or a college senior), the
next career milestone when close, and a mood read from those facts (not a
mechanic). Milestones per sport and level are in SPORT.milestones (college:
milestonesCollege) and reach the weekly news. Pro careers count from the
dynasty's first season (generated players have no earlier history).

## Real data

    college football  30_schedule2026: ~81% of the 2026 games, transcribed
    pro football      30_schedule2026: all 272 games (nflverse, data/)
    pro hockey        30_schedule2026: Sept 29 - Nov 29 (429 games, Hockey-
                      Reference, data/); the rest generated to the NHL's matrix
    pro basketball    formula only
    college basketball formula only
    soccer            clubs, divisions and rules 2026-27; fixtures generated
    colours           data/ (ncaa-team-colors, ISC); 18 stand-ins remain

## Calibration targets (checked by the history and reads tests)

    college football  favourite ~0.70, margin ~15, home 57-59%, ~54 pts/game
    pro football      favourite 0.63-0.66, margin (NFL ~10-11), MVP QB ~85-90%
    college basketball 72.6 pts/team, margin 12.2, home 62%, favourites 68%;
                      first-round seed pairings vs NCAA history (bb-march)
    pro basketball    114.6 pts/team, margin 13.2, home 61%, favourites 71%;
                      wins sd 12-13, 1 seeds ~55% of titles, series 4-7 games.
                      First seasons too (nba-history checks seasons 1-3):
                      wins sd ~13, best ~66, worst ~15 (NBA_K 1.0; it was
                      2.0 and fresh seasons ran 77-5 / 9-73, sd 17.6)
    pro hockey        6.1 goals/game, save % ~.900, ~22% to overtime; points
                      mean ~94 (84 games), sd ~14. Game totals spread like a
                      Poisson at that mean (12+ goals ~2%). Your games by plan
                      (Nov 2026): skate with them 6.7, balanced 6.2, clog it
                      up 5.2. Skater points: first-line C ~65 at a 60 rating,
                      ~75 at 63-69; league best 95-112, top goal scorers
                      45-57 and rated 63+ (round 21: goals x0.78, forwards'
                      assists x1.12, rating slope 0.45 -> 0.7; a 62 winger
                      led with 60 goals before), first-pair D ~35-45.
                      Coaching changes: ~2 the first summer, ~5 after
                      (seatSpread 30; at 45 it was ~1).
    soccer            2.75 goals/game, ~27% draws, ~41% home wins (league
                      mix); strength predicts the tables (rank corr 0.6-0.9)

## Known calibration gaps (measured)

- Played vs simmed scoring (Nov 2026, one season x3 per game, calls cycled):
  your live games against the league's simmed games, points per team:
  college football 26.6 / 26.8, pro football 23.8 / 22.4, college basketball
  72.1 / 72.4, pro basketball 115.8 / 114.6, hockey 3.1 / 3.1, soccer
  1.6 / 1.4 (Arsenal: a strong side). In a browser, 20 hand-played Saint
  Joseph's games averaged 74.4. Calls barely move totals (college
  basketball: 72.0 to 72.9 whichever option you always take). Testers'
  high hand-played samples were small; no engine gap found.
- Field goals: fgOdds is a smooth curve (FG_CURVE) used only for your
  fourth-down calls; the computer's drives resolve kicks their own way, so
  CPU calibration doesn't move. Fourth downs graded over 6 careers: where
  no kick is offered (the punt-or-go band) "go" is best about two times in
  three; that band, not the kick curve, is why most fourth downs favour
  going (Instinct). A model question still open.
- Hockey pay (decided Nov 2026, Ian, on all three testers' advice): a
  convex curve for contracts signed from now on (HK_B 1.8, HK_A 16.3, HK_0
  47): a 55 about $4M, a 62 $10.6M, a 66 $15.7M, the maximum from ~70.
  Teams carry 12 contracts, not 23, so each player stands for about two;
  the curve fixes relative prices (a 67 was priced like the best). Over 12
  seasons (test/hk-economy.js): median payroll 61% of the cap (was 80%),
  max deals per team unchanged, top-six retention 79% (78%), points spread
  13.6 (NHL ~14). Deals already signed run at their numbers: an older save
  replays identically mid-season and mid-offseason.

- Hockey's goalie call is nearly weightless (Nov 2026, test/hk-reads.js at
  60,000 games): pulling him only on a real bad night is worth about +1 win
  point over leaving it, and telling a bad night from bad luck (soft goals
  vs simply two in) about +0.3 to +0.4, inside the noise of a 20,000-game
  run. The check now asks only that it's positive. Grokbot scored hockey's
  decision weight 5/10; this is part of why.

- Pro basketball: 70-win seasons in ~19% of long-run seasons (real ~10%);
  max seen 79. Big mismatches (gap over 200) count half (BB.softGap) since an
  82-0 turned up; the tail is still a little fat.
- Pro football: best record ~15 wins (real ~14), worst ~2 (real ~3).
- Salary caps (Nov 2026, Ian's go-ahead): veterans' asks are scaled (PAY:
  football 1.75, basketball 2.1, hockey 4.3; rookie scales and minimums are
  real and unscaled), with each league's maximum contract (20% of the cap,
  35% in basketball). Typical payroll ~75-85% of the cap; hard caps (football,
  hockey) never exceeded (free agency keeps the minimum back for empty spots;
  the post-draft check counts them). Basketball's soft cap: re-signing up to
  the tax line, top payrolls ~105-115%. Calibration unchanged (nba-history,
  nhl-history, football spread by season). Hockey's curve was reshaped
  later (see the lessons): typical payroll ~70%. Gap: hockey's typical payroll
  drifts down by year five (rebuilding teams on rookies and minimums); real
  leagues have a salary floor, the game doesn't.
- College basketball injury costs reach ~200 team-strength points: some
  starters in the 80s have backups rated 30-40. Bench depth, not the cost
  formula, is the problem; worth reshaping college benches (a calibration
  change: run bb-calibrate and bb-march after).

- Pro football: mean margin ~13 (NFL ~10-11).
- Pro basketball: first-round 2 v 7 and 3 v 6 upsets too common.
- College basketball (bb-march, a long-run test): one seed line or another
  fails after unrelated changes (3 v 14, 8 v 9, 6 v 11 on different runs in
  Oct 2026; 6 v 11 read 62-69% across runs). Its tolerance is 3 standard
  errors treating tournaments as independent, but a career's tournaments
  share teams, so the real noise is larger. The old engine also failed 8 v 9
  at 388 tournaments (52.9%, real 48.8). Nov 2026, same seeds: the previous
  build failed 6 v 11 (68.9%); the scouting-report build failed 2 v 15
  (96.1%, prior 94.7) and 3 v 14 (90.1%, prior 88.3). Fix to consider: a standard error
  clustered by career. Not loosened. Nov 2026 (caps round): 3 v 14 at 89.0%
  (194 tournaments) on this build and on e31fc08 alike; the long-run is
  time-limited, so a run can fit a different number of tournaments and pass.
- Soccer: the Premier League is a little too predictable (rank corr ~0.9).
- Pro hockey: year-to-year correlation of records 0.40 (NHL ~0.5).
