# Football Coach

A single-file college football dynasty game. No build dependencies beyond
Python 3 and (for tests) Node.

## Layout

    src/_head.html        page shell, styles, fonts, favicon
    src/_tail.html        closing tags
    src/modules/*.js      the shared core, in build order (filenames are numbered)
    src/sports/<id>/*.js  one league: its data and league-only modules
    build.py              merges core + one sport into dist/<game>.html
    dist/                 build output — this is the shippable artifact
    test/                 headless harness and checks

## Build

    python3 build.py

Writes `dist/football-coach.html`. That one file is the whole game: open it in
a browser, or copy it to a web host as `index.html`.

## Tests

    node test/golden.js --check   seeded careers must reproduce test/golden.json
    node test/calibrate.js 200    measures the calibration targets below

A change meant to alter no behaviour must pass `golden.js --check`. A change
that is meant to alter behaviour re-records with `--write`, and says why.

## Module order

Order matters — later modules depend on earlier ones. The numeric prefixes
give the correct order under plain filename sort.

    05_league   [cfb] teams, conferences, weeks, classes, bowls, draft, awards
    10_players        player generation, rosters, development, box scores
    20_engine         RNG, teams, schedule building, sim, poll, coaches, budget
    30_schedule2026   [cfb] the real 2026 schedule (81% of games are the released slate)
    40_rivals   [cfb] rivalry definitions and enforcement
    50_drives         live drive-by-drive engine and in-game decisions
    60_staff          Two Bears, Pearl, Apprehensive Capybara
    70_watch          the field graphic and drive chart
    80_season         Season state machine — weeks, titles, bowls, playoff
    90_draft          NFL draft and the program record book
    95_card           shareable season card (SVG -> PNG)
    99_app            all UI, state, saves, rendering

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
