# Pro Basketball Coach — plan

The fourth game: the basketball sport layer (src/basketball) with a new
league, src/leagues/nba, and the pro franchise systems from the pro football
league (contracts, cap, draft board, free-agent targets, trade block).

## Decided
- 30 franchises (2026-27: no expansion), East and West, six divisions.
- A hard cap at the real 2026-27 figure, $164.961 million (NBA, June 30,
  2026), simple as pro football's; the real soft cap, exceptions and
  luxury tax ($200.428M) could come later.

## Phases
1. The engine by league (done): LEAGUE.tuning.bb overrides the college game;
   four 12-minute quarters (still eight segments, six minutes each; the
   halftime call after segment four); the late call says six minutes.
   College unchanged (golden MATCH).
2. The NBA league: franchises, 82-game schedule (four against division
   rivals, three or four against the rest of the conference, two against
   the other conference), play-in (7-10), best-of-seven series (2-2-1-1-1,
   with a 'sim the series' option), draft lottery, awards (MVP, All-NBA).
3. Offseason: contracts and cap, re-signing, aging and retirement, the
   draft (two rounds, lottery for the 14 non-playoff teams), free agency
   with targets, the trade block.
4. Tests and calibration: golden, hot seat, series rules, screens, and
   history (a 1 or 2 seed wins most titles; first-round upsets are rarer
   than in March).

## Engine calibration (engine only, 20,000 games, home edge 60 Elo)

    setting                          value
    pace (possessions per team)      99
    twos / threes                    .545 / .362
    shooting fouls on twos / threes  .13 / .02
    free throws                      .785
    offensive rebounds               .24
    turnovers                        .135
    rating gap per possession        .00028
    benches in, and their cost       at 13 points, .08

    measured                         engine    NBA (approximate, recent)
    points per team                  115.1     114-115
    possessions                      99        ~99
    mean margin                      12.0      ~12-13
    game noise                       13.2      ~12-13
    home teams, equal sides          56.8%     55-57% (~2.5 pts)
    threes                           36.1%     ~36%
    turnovers per possession         .137      ~.13
    overtime                         5.5%      ~6%
