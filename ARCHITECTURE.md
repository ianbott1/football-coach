# Sports Sims — architecture note

Orientation for any new session. The code is **not** in this document — it
lives in the repo. Fetch what you need:

    https://github.com/ianbott1/football-coach

## What this is

Single-file browser games. One HTML file, no dependencies, no server. Source
is three layers of numbered JS files, merged by filename and concatenated by
`build.py` into `dist/<game>.html`. That file is the whole product; the
published copy is `index.html` on main.

    src/core/              engine: RNG, Elo, talent and injuries, coaches,
                           the Season machine, the history book, card, all UI
    src/football/          the sport: positions, box scores, coordinators,
                           the drive engine, the staff room, the field
    src/leagues/<league>/  one league: teams, conferences, schedule, ranking,
                           postseason, awards, offseason, draft, its screens
    src/leagues/<league>/GAME   names the sport layer the league uses

    python3 build.py [league]      cfb (default) -> dist/football-coach.html
                                   nfl           -> dist/football-coach-pro.html

The core and the sport layer know a league only through `LEAGUE`, defined in
the league's `05_league.js` and extended by its other files. README.md lists
the interface. A second league is a new folder under `src/leagues/`.

## Working rules

1. The container filesystem does NOT persist between conversations. Package
   the source and have Ian download it before any session ends.
2. A change meant to alter no behaviour must pass `node test/golden.js`
   (last line MATCH). A change meant to alter behaviour re-records with
   `--write --note "why"`; the reason is kept in golden.json's log.
3. Verify by measurement, not inspection. Every claim about behaviour should
   come from a test run, not from reading the code.
4. Bug fixes are their own commits, never folded into a refactor.

## Tests

    test/golden.js     seeded careers: every score, record, ranking, award,
                       history entry, universe state, and every tab, the
                       offseason screen and the banner; 60 opening schedules
    test/hotseat.js    two coaches sharing a save, three seasons
    test/grades.js     grade shown on the offseason screen = grade recorded
    test/migrate.js    old saves load and draw identically (needs a v1 build)
    test/reload.js     reloading a save gives back the games actually played
    test/storage.js    saving where there is no window.storage (the published
                       site), the quit prompt, Start over
    test/h2h.js        hot-seat coaches playing each other: once, both calling
    test/clinch.js     pro clinch marks (z/y/x/e) checked against how seasons ended
    test/plans.js      the weekly gameplan is a real choice, both leagues
    test/firing.js     people are fired on two missed seasons in a row, never one
    test/moves.js      a season is filed under the team coached, not the next job
    test/stress.js     random-choice careers: crashes, broken text, stuck offseasons
    test/calls.js      report: each in-game call replayed with every answer
    test/draftboard.js pro: your draft board decides your picks, in board order
    test/fatargets.js  pro: free-agent targets are signed or reported, never cut
    test/nfl.js        pro league: rules every season obeys, realism measures,
                       the cap gate on the offseason screen

golden, reload, h2h and storage take either build as an argument; golden
keeps one baseline per league (golden.json, golden-nfl.json).
    test/calibrate.js  the targets below, over N CPU seasons (default 200)

Not covered by any test: click handlers (sub-tabs, budget buttons, picks).

## Saves

Saves go through core/15_store.js: window.storage inside Claude, the
browser's localStorage anywhere else. A save holds the season's starting
universe plus every choice and every live game's result (S.played); loading
replays the season from those, so it must reproduce what was played exactly
(test/reload.js).

## Calibration targets

Any simulation change must be re-checked against these (calibrate.js):

    favourite win rate      ~0.70
    mean margin             ~15
    undefeated per season   ~1
    talent swing            ~110 Elo
    home win rate           57-59%
    points per game         ~54
    schedule integrity      all zeros
    Heisman split           QB 60-70 / WR 20-30 / RB 10-20

Definitions, where a number depends on how it is measured:

- **Favourite win rate**: regular-season games; the favourite is the team
  with the higher *public* Elo plus home field before kickoff (what the game
  shows the player). Measured 0.700. By the hidden true ratings (injuries,
  form, staff) favourites win 0.727, and did before the drive engine too
  (29dce35) — so a gap against 0.70 on that basis is not drift.
- **Talent swing**: per team, highest minus lowest *effective* rating over
  the regular season, sampled each week as the game engine reads it,
  averaged league-wide. This is total in-season variation — injuries,
  development, week-to-week form, locker-room collapses and breakouts — not
  injuries alone. Measured 107.6; injuries by themselves account for ~57.5.
- **Undefeated per season**: teams unbeaten at the end of the regular
  season (before championship week). Measured ~1.1.
- **Schedule integrity**: counts of a team booked twice in a week, a team
  playing itself, a repeated pairing, and teams below 11 or above 12 games.

## Gameplans

The weekly plan is a trade between talent and chance (football/50_drives.js
AGGR). Risk makes the rating gap count less on your own drives, safe makes
it count more; no hidden rating penalty. At even strength the three plans
win equally often; an underdog should take risks, a favourite should play
safe. test/plans.js checks that shape in both leagues. The engine's own
urgency (overtime, a fourth down it goes for) and late-game management
("sit", "chase") are separate modes, so computer-only play is unaffected.

## The three advisors

Fixed strategies, each best in a different situation. (Figures from before
the split, and from before gameplans were rebalanced; in-game calls use the
same risk/safe modes, so these need re-measuring. No test reproduces them
yet.)

    situation        Two Bears   Pearl   Apprehensive Capybara
    even match         59.3%     58.7%          55.4%
    big underdog       40.9%     40.1%          38.5%
    leading late       84.1%     83.6%          84.7%   <- capybara best
    trailing late      25.0%     23.8%          18.7%   <- bears best

Two Bears always take the risk and never reason (no numbers in their lines).
Pearl reads the situation and is a dog ~15% of the time, wrapping rather than
replacing her advice. The Capybara is cautious and hedges everything
("It seems to me...", "I do believe...").

## The history book

One entry per coach per season, version 2 (core/90_history.js). Core fields
are league-neutral: honours {title, group, seed}, group {key, name, rec},
seeds, groupChamps, awards {mvp, team}, coaching {...}. Anything only one
league understands goes under `entry.league`, written by
`LEAGUE.historyExtras` and read only by that league's views. Version-1 saves
migrate on load.

## Pro football (leagues/nfl)

32 franchises by city in their real divisions; every player is fictional.
The league's rotation formula builds 17 games over 18 weeks with byes in
weeks 5-14. Seven seeds a conference, a bye for the 1 seed, re-seeding,
a numbered Super Bowl; records stay regular-season only. Players have ages
and contracts; each offseason re-signs (the user chooses, cap-aware), ages,
retires, drafts in reverse order of finish, runs free agency under a hard
$110M cap over the twenty tracked players, and fills gaps. Franchise
strength is a sticky organisation edge (development, scouting, free-agent
pull); without it the draft and free agency flatten the league.

League-level tuning the football layer honours: tuning.drives (10),
tuning.gapScale (2.2, how much a rating gap is worth on the field),
tuning.gameState (teams nobody is calling sit on three-score fourth-quarter
leads and chase when two scores down), homeField.

Targets (test/nfl.js, 96 seasons):

    favourite win rate   0.636   (NFL ~0.63-0.66, rating going into the game)
    home win rate        55.1%   (~55%)
    points per game      45.4    (~45)
    13+ win teams/season 3.75    (~2-4)
    repeat champions     9.1%    (~10%)
    mean margin          12.8    (~11)          a little high
    17-0 per 100 seasons 6.3     (~2-3)         a little high
    MVP a quarterback    100%    (recent seasons nearly all)

Not in yet: trades; drafting and signing individual players yourself (you
choose a style; the picks and signings are made for you).

## Planned direction

The engine/sport/league split is done for the simulation; the UI split is
mostly done. Still college-shaped in core/99_app.js: wording in weekly news,
stakes lines, team cards, dynasty headings, tiers, intro, help, glossary.

The NFL is now the second league on the football layer (see above). The
original plan for it: It needs genuinely new
mechanics, not relabelling: salary cap, contracts, player ages instead of
class years, free agency, trades, draft order by record, a division-based
schedule, a 14-team playoff, a power ranking instead of a poll, MVP and
All-Pro weights. Recruiting, graduation, bowls and the Heisman don't exist
there. The cap is the largest single piece of work.
