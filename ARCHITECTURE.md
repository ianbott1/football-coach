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
business: the cup draw), cup, trophyNow, cardLine.

## In-game calls: the design rule

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
   Wait for the summary line in the output file instead.
5. Check simulation changes against the calibration targets below.
6. Tell Ian plainly when something is broken, a plan is wrong, or you made a
   mistake.

Lessons from this project (each cost a bug that shipped or nearly did):
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
                      wins sd 12-13, 1 seeds ~55% of titles, series 4-7 games
    pro hockey        6.1 goals/game, save % ~.900, ~22% to overtime; points
                      mean ~94 (84 games), sd ~14
    soccer            2.75 goals/game, ~27% draws, ~41% home wins (league
                      mix); strength predicts the tables (rank corr 0.6-0.9)

## Known calibration gaps (measured)

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
  clustered by career. Not loosened.
- Soccer: the Premier League is a little too predictable (rank corr ~0.9).
- Pro hockey: year-to-year correlation of records 0.40 (NHL ~0.5).
