# College Basketball Coach — plan

A third game on the shared core: a new sport layer (src/basketball) and a new
league (src/leagues/ncaab). Built in phases; each ends committed, tested and
packaged.

## Phases

1. Sport-neutral core (done: 1c86b85, and the two commits after it). Game
   screens, staff words and the star-performance picker moved out of the
   core; football output unchanged (golden MATCH in both leagues).
2. Basketball sport layer (done: 1e00dae, af37b31, and the commit after
   them): possession-based engine, positions, box scores, gameplans and
   in-game calls, advisors, court view. Measured on its own
   (test/bb-engine.js, test/bb-plans.js, test/bb-calls.js). It supplies every
   name the core uses from a sport (checked mechanically).
3. College basketball league (done): all 365 Division I schools in their
   2026-27 conferences (fictional players), non-conference and conference
   schedule, conference tournaments with automatic bids, Selection Sunday
   and the 76-team tournament (the 2027 format, with the Opening Round),
   poll with Bracketology, awards (Player of the Year, All-America),
   recruiting with five-stars and one-and-dones, the NBA draft.
4. Screens (done): the drawn bracket, the Selection Sunday reveal, the court.
5. Tests and balance (done): golden, hot seat, bracket rules, screens,
   calibration (season one) and March over the long run (test/bb-march.js).
   Known: 4 v 13 and 7 v 10 upsets a few points more common than history;
   18 small schools still use a stand-in colour (not in the colour dataset).

## The sport interface

Everything the core and a league use from a sport, by name:

    SPORT {id, staff{oc,dc,any}, riser, starLine(pos, line)}
    POS (starting slots: {p, w, drop, hz}), BK(i) (that slot's backup)
    playerName, eloToRating, rosterElo, pickInjuredPos, injuryCost
    blankStats, addStats, gameStats(rng, player, slot, pf, pa, won),
      statLine, statProd
    PLANS {safe, balanced, aggressive: {l, d, edge}}, AGGR, FEATURE_EDGE,
      INTERIM_Q
    playGame(rng, eloH, eloA, planH, planA, opts{decide, userIsHome})
      -> {h, a, drives}
    makeLiveGame(rng, eloH, eloA, planH, planA, humans) -> {next(), reply(v)}
      next() -> {done,h,a,drives} | {drive,h,a} | {ask,mine,theirs,q,side}
    DRIVES_PER_TEAM (units of play a side gets: drives, or game segments)
    newCoordinator, coordCandidates, coordGrade, staffElo, STAFF_ELO,
      OFF_SHARE
    STAFF, staffFace, staffTake(dp, ctx), staffAside
    gameScript, fieldSVG, and the screens: liveScoreboard, driveWord,
      driveScript, liveView, liveCallView, watchView, startWatch
    (playback SPEEDS are the core's.)

## Calibration (real Division I men's basketball, approximate)

    possessions per team      ~68-70
    points per team per game  ~71-73
    home-court edge           ~3 points; home teams win ~60-65%
    favourite win rate        ~0.70-0.75 (by ratings going in)
    mean margin               ~11-12
    NCAA tournament, first round, higher seed wins (1985 onward):
      1 v 16 ~99%   2 v 15 ~93%   3 v 14 ~85%   4 v 13 ~79%
      5 v 12 ~64%   6 v 11 ~61%   7 v 10 ~61%   8 v 9 ~50%
    a 1 seed wins it all      ~60% of titles

## Gameplans, basketball's version of the talent/chance trade

  Work it inside (safe): more possessions, high-percentage shots; talent
    shows over 40 minutes. Best when you're the better team.
  Balanced.
  Shorten the game (aggressive): slow the pace, let it fly from three;
    fewer possessions, more variance. Best when you're outgunned.
