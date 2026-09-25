# Football Coach

A single-file college football dynasty game. No build dependencies beyond
Python 3 and (for tests) Node.

## Layout

    src/_head.html          page shell, styles, fonts, favicon
    src/_tail.html          closing tags
    src/core/*.js           the engine: RNG, Elo, talent and injuries, coaches,
                            the Season machine, the season card, all UI
    src/football/*.js       the sport: positions, rosters' two-deep, box
                            scores, coordinators, the drive engine, the staff
                            room, the field graphic and game plans
    src/leagues/<id>/*.js   one league: teams, conferences, schedule, ranking,
                            postseason, awards, offseason, draft, names
    src/leagues/<id>/GAME   which sport layer the league is played in
    build.py                merges core + sport + league into dist/<game>.html
    test/                   headless harness, golden master, calibration

## Build

    python3 build.py            # cfb -> dist/football-coach.html

That one file is the whole game: open it in a browser, or copy it to a web
host as `index.html`.

## What a league provides

Everything the core and the sport layer know about a league goes through
`LEAGUE`, defined in the league's `05_league.js` and extended by its other
files:

    teams, colors, conf{names,order,display,autoBidPool,divisions}
    weeks, dates, classes, bowls, draftTeams, awards{mvp,weights}
    tuning{hfa}, venues, schedule{games,confGames,...}, playoff{...}
    buildSchedule(rng, ratings, year)          25_schedule.js
    Ranking  class: order, rankMap, update     22_poll.js
    offseason{newRoster, run}                  26_offseason.js
    post{phases, run, init} + Season methods   85_postseason.js
    Season._award, mvpRace, allConference      86_awards.js
    Season postPools, postGamesFor, honours,
      confChampions, seasonResult, postRecord  85_postseason.js
    rivals{name,series,record,of}              40_rivals.js
    records{book,leaders,alumniLine}           90_draft.js
    offseason{open,choices,recruitFocus,budget} 26_offseason.js
    goals{expectations,grade,isTitle,firstTitle} 26_offseason.js
    ui{rankingTab,rankingView,postseasonView,afterAdvance,subtab,
       projectedField}                         97_views.js
    ui{offseasonScreen,offseasonBanner,offseasonBlock,
       bindOffseason}                          98_offseason_views.js

Still college-shaped inside the core UI (core/99_app.js): wording in the
weekly news, stakes, team cards, dynasty tables, intro, help and glossary;
the history-book fields (bowls, cfp, heis, allconf) that saves depend on.

## Tests

    node test/golden.js --check   seeded careers must reproduce test/golden.json
    node test/calibrate.js 200    measures the calibration targets below
    node test/hotseat.js          two coaches, three seasons; compare builds

A change meant to alter no behaviour must pass `golden.js --check`. A change
that is meant to alter behaviour re-records with `--write`, and says why.

## Build order

Order matters: later files depend on earlier ones at load time. The numeric
prefixes give the order across all three layers under plain filename sort;
run `python3 build.py` to see the merged list.

## Publishing

    cp dist/football-coach.html <repo>/index.html
    git add -A && git commit -m "..." && git push

## Calibration targets

Any change to the simulation should be checked against these:

    favourite win rate      ~0.70
    mean margin             ~15
    undefeated teams/season ~1
    talent swing            ~110 Elo
    home win rate           57-59%
    points per game         ~54
    schedule integrity      all zeros
