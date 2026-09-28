# Sports Sims — architecture

Orientation for any new session. Code: github.com/ianbott1/football-coach
(branch main). Each game is one self-contained HTML file, no dependencies, no
server, published on GitHub Pages at ianbott1.github.io/football-coach.

## The five games

    game                   build            output (dist/)              sport layer   league
    College Football Coach python3 build.py football-coach.html        football      cfb
    Pro Football Coach     build.py nfl     football-coach-pro.html    football      nfl
    College Basketball     build.py ncaab   basketball-coach.html      basketball    ncaab
    Pro Basketball Coach   build.py nba     basketball-coach-pro.html  basketball    nba
    Pro Hockey Coach       build.py nhl     hockey-coach-pro.html      hockey        nhl

Publishing copies each dist file to the repo root (college football as
index.html) and pushes.

## Three layers

    src/core/          sport-neutral: RNG, talent model, season state machine,
                       offseason driver, UI, saves (99_app.js), record keeping
    src/<sport>/       football, basketball, hockey: positions and ratings,
                       the game engine (playGame, makeLiveGame), calls,
                       advisors, the watch view, game screens (SPORT object)
    src/leagues/<id>/  teams, schedule, postseason, offseason rules, awards,
                       views, text (the LEAGUE object)

A league chooses its sport with src/leagues/<id>/GAME. The core reads only
the documented interface from each layer. League settings switch on
anything one league needs (all default off, so other games are unchanged):
tuning.talentSteps (long seasons), tuning.bb / tuning.hk (engine settings),
tracksOT and recText/points/standingsCol (hockey's points and W-L-OTL),
rankTop, stepLabel, text.week, skipIdle (daily schedules), awards.premium.

## Working rules

1. The container doesn't persist between sessions. Package the source (a git
   bundle of main) and have Ian download it before a session ends.
2. Before changing anything, rebuild and confirm golden matches.
3. Verify by measurement, not by reading code; every claim about behaviour
   comes from a test run.
4. Run the suite before every commit and read the result before writing the
   message:   node test/run-all.js --quick   (full: without --quick).
   One CPU: the quick suite takes ~8-10 minutes; run it detached
   (setsid nohup node test/run-all.js --quick > /tmp/runall.txt &) and poll.
5. Check simulation changes against the calibration targets below.
6. Tell Ian plainly when something is broken, a plan is wrong, or you made a
   mistake.

Lessons from this project (each cost a bug that shipped or nearly did):
- A new game needs its own save key in SAVE_KEYS (core) and a case in
  test/saves.js, test/reload.js, test/golden.js, test/hotseat.js.
- Test both layouts (test/layouts.js): at 1024px+ the buttons live in the
  side panel.
- Words: each game has a screen test that fails on another sport's words;
  read a few screens by eye too (records, standings, dates the tests can't
  judge).
- Check real-world facts (season length, divisions, cap) against a current
  source, not memory: the NHL's 2026-27 season is 84 games.

## Tests (test/)

run-all.js runs every verdict test in every game. Per game: golden (fingerprint
of results and screens), hotseat, storage, reload. Across games: saves,
layouts, sim-and-skip, goals, migrate (old saves; the v1 build is kept in
test/fixtures). Per league: rules and clinch tests (nfl, nba-playoffs,
nhl-playoffs, nhl-clinch, bb-bracket), screen and wording audits
(bb-screens, nba-screens, nhl-screens), offseason systems (draftboard,
fatargets, trades, bb-portal), and long-run history checks against the real
leagues (bb-march, nba-history, nhl-history).
Reports (run by hand): calibrate, advisors, calls, the engine harnesses
(bb-engine, hk-engine, hk-decisions), the long-run recorders.

## Real data

    college football  30_schedule2026: ~81% of the 2026 games, transcribed
    pro football      30_schedule2026: all 272 games (nflverse, data/)
    pro hockey        30_schedule2026: Sept 29 - Nov 29 (429 games, Hockey-
                      Reference, data/); the rest generated to the NHL's matrix
    pro basketball    formula only (no readable source found yet)
    college basketball formula only
    colours           data/ (ncaa-team-colors, ISC); 18 stand-ins remain
Real schedules apply to a career's 2026 season; later seasons are generated.

## Calibration targets (checked by the history tests)

    college football  favourite ~0.70, margin ~15, home 57-59%, ~54 pts/game
    pro football      favourite 0.63-0.66, margin (NFL ~10-11), MVP QB ~85-90%
    college basketball first-round seed pairings vs NCAA history (bb-march)
    pro basketball    wins sd 12-13, 1 seeds ~55% of titles, series 4-7 games
    pro hockey        3.0-3.1 goals, save % ~.900, points mean ~94 (84 games),
                      sd ~14, home ice 60-65% of first-round series

## Known calibration gaps (measured)

- Pro football: mean margin ~13 (NFL ~10-11). Making the late-lead 'sit'
  mode score less only brought it to 12.5, and the same mode is your 'bleed
  the clock' call in both football games, so it wasn't changed; the margin
  comes mostly from mid-game scoring.
- Pro basketball: first-round 2 v 7 (73%, real ~90) and 3 v 6 (66, ~78)
  upsets too common (docs/NBA.md).
- College basketball: 4 v 13 and 7 v 10 a few points upset-prone (within
  tolerance, test/bb-march.js).
- Pro basketball and pro hockey: a few 'week' phrases remain outside the
  digest (hot-seat hand-overs, some setting descriptions).
- Pro hockey: year-to-year correlation of records 0.40 (the NHL's, by my
  estimate, ~0.5); the rare season above the real 135-point record.
