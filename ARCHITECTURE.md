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
                55'; the weak flank at half-time; score calls at HT and 75'
    hockey      system (forecheck, trap, cycle) -> answer, first intermission;
                your goalie after a bad period (a bad night vs bad luck);
                push/lock after two; when to pull the goalie
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
Reports (run by hand): calibrate, advisors, calls, the engine harnesses
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
                      up 5.2. Skater points: first-line C median ~65 (best
                      ~100; a top team skating with them gets ~90, as real
                      Vegas did), first-pair D ~35, second pair ~20.
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
