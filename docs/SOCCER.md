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

## The full pyramid (next): tiers 1-6, 164 clubs

Asked for: every English league, starting at the bottom. Football Manager's
standard game makes England playable to tier 6, and so will this:
Premier League (20), Championship, League One, League Two, National League,
National League North and South (24 each). Clubs, capacities and the 2026-27
rules are in data/england_2026_27.py (from Wikipedia's 2026-27 season pages).

Rules (2026-27): Championship 2 up + play-offs 3-8, 3 down; League One 2 up
+ play-offs 3-6, 4 down; League Two 3 up + play-offs 4-7, 2 down; National
League 1 up + play-offs 2-7, 4 down (to North or South by region); North and
South 1 up + play-offs 2-7, bottom 4 reprieved (step 3 isn't in the game).
Play-off formats: four teams (semis 1 v 4, 2 v 3, final) and six (two
eliminators, then the top two seeds in the semis, final).

Design to do:
- Strength by tier, compressed so tier 6 still has a rating spread (0-99):
  roughly Premier League ratings 64-86, Championship 58-66, League One 54-60,
  League Two 50-55, National League 44-50, North/South 38-44; within a tier,
  stature from capacity and history. (Today's 2.8x Premier League spread would
  put tier 6 below the scale.)
- Wages on an exponential scale: a star ~25m a year, a League Two regular
  ~0.3m, a tier-6 part-timer ~0.02-0.05m; budgets per tier to match.
- One play-off routine for both formats; promotion and relegation as a chain
  from the top down; the National League's relegated sent North or South.
- The career: start anywhere, including tier 6; job offers come from clubs a
  tier or two above or below your record.
