"""The real 2026 NFL regular season, for Pro Football Coach's first season.
Source: nflverse, github.com/nflverse/nfldata (data/games.csv), the 2026
regular-season rows kept in data/nfl_2026_schedule.csv (week, date, teams,
site only). Writes src/leagues/nfl/30_schedule2026.js.
    python3 data/build_nfl2026.py"""
import csv, json
CODE = {"ARI":"Arizona","ATL":"Atlanta","BAL":"Baltimore","BUF":"Buffalo","CAR":"Carolina","CHI":"Chicago",
  "CIN":"Cincinnati","CLE":"Cleveland","DAL":"Dallas","DEN":"Denver","DET":"Detroit","GB":"Green Bay",
  "HOU":"Houston","IND":"Indianapolis","JAX":"Jacksonville","KC":"Kansas City","LA":"LA Rams","LAC":"LA Chargers",
  "LV":"Las Vegas","MIA":"Miami","MIN":"Minnesota","NE":"New England","NO":"New Orleans","NYG":"NY Giants",
  "NYJ":"NY Jets","PHI":"Philadelphia","PIT":"Pittsburgh","SEA":"Seattle","SF":"San Francisco","TB":"Tampa Bay",
  "TEN":"Tennessee","WAS":"Washington"}
rows = list(csv.DictReader(open("data/nfl_2026_schedule.csv")))
games = [[int(r["week"])-1, CODE[r["away_team"]], CODE[r["home_team"]], 1 if r["location"]=="Neutral" else 0, r["gameday"]] for r in rows]
out = ["/* ============ the real 2026 NFL schedule ============ */",
       "/* All 272 regular-season games, from nflverse (github.com/nflverse/nfldata),",
       "   made by data/build_nfl2026.py. [week (0 = week 1), away, home, neutral, date].",
       "   Used for a career's 2026 season; later seasons come from the formula. */",
       "const REAL_NFL2026=" + json.dumps(games, separators=(",",":")) + ";"]
open("src/leagues/nfl/30_schedule2026.js","w").write("\n".join(out)+"\n")
print(len(games), "games written")
