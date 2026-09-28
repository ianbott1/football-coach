# Soccer — plan

The sixth game: English football. The Premier League and the Championship
together, so promotion and relegation are real: every table position has
stakes, and a career can start at a Championship club and go up.

## Facts checked (sources: premierleague.com, NBC Sports, Wikipedia, Sept 2026)

- 2026-27 Premier League, 20 clubs: 2025-26's less the relegated
  Wolverhampton, Burnley and West Ham, plus the promoted Coventry City
  (Championship champions, Frank Lampard), Ipswich Town and Hull City (play-
  off winners from sixth). Opening round Saturday 22 August 2026; 38 rounds.
- 2025-26 finish: Arsenal champions (85 points, seven clear of Manchester
  City); Champions League: Arsenal, City, Manchester United, Aston Villa,
  Liverpool (a fifth place, the European Performance Spot); Europa League:
  Bournemouth, Sunderland; Conference League: Brighton; Tottenham 17th.
- 2026-27 Championship: 24 clubs, 46 rounds; top two promoted automatically;
  the play-offs grow from four clubs to six this season (third and fourth to
  the semi-finals, fifth to eighth to quarter-finals).

## What's new for the engine (and the core)

- Draws. The core assumes every game has a winner. Soccer needs 3 points a
  win, 1 a draw; records W-D-L; tables by points, then goal difference, then
  goals scored; a drawn game has no winner or loser. (Knockout ties - the
  play-offs, cups - go to extra time and penalties.)
- Two divisions in one league, with promotion and relegation between seasons,
  and the Championship play-offs (six clubs) ending at Wembley.
- No salary cap: money is revenue (bigger in the top flight: parachute
  payments soften relegation), wages and transfer fees. The squad matters
  more than one star; the transfer window replaces free agency and the draft
  (there's no draft in English football: academies and youth signings).
- Positions: GK, back four, midfield three, front three, and a bench.

## Phases

1. The sport layer and its engine, calibrated alone against the Premier
   League (goals per game ~2.8-2.9; home wins ~45%, draws ~24%, away ~31%;
   0-0s ~7%).
2. The core: draws, W-D-L, points and goal difference (gated, like hockey's
   overtime losses; the other games unchanged).
3. The league: 44 real clubs in two divisions, the real 2026-27 fixtures if a
   readable source exists, promotion, relegation and the play-offs.
4. The offseason: wages, transfers, youth, the owner's expectations (a top-
   four club and a promoted club want very different things).
5. Tests and calibration against English football's history.
