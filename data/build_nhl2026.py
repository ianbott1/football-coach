"""The real start of the 2026-27 NHL season (Sept 29 - Nov 29) for Pro
Hockey Coach's first season, from data/nhl_2026_oct_nov.txt (transcribed from
Hockey-Reference's schedule page). Writes src/leagues/nhl/30_schedule2026.js:
[days after Sept 29, away, home, neutral site].   python3 data/build_nhl2026.py"""
import re, json, datetime
CODE={"ANA":"Anaheim","BOS":"Boston","BUF":"Buffalo","CAR":"Carolina","CBJ":"Columbus","CGY":"Calgary",
 "CHI":"Chicago","COL":"Colorado","DAL":"Dallas","DET":"Detroit","EDM":"Edmonton","FLA":"Florida",
 "LAK":"Los Angeles","MIN":"Minnesota","MTL":"Montreal","NJD":"New Jersey","NSH":"Nashville",
 "NYI":"NY Islanders","NYR":"NY Rangers","OTT":"Ottawa","PHI":"Philadelphia","PIT":"Pittsburgh",
 "SEA":"Seattle","SJS":"San Jose","STL":"St. Louis","TBL":"Tampa Bay","TOR":"Toronto","UTA":"Utah",
 "VAN":"Vancouver","VEG":"Vegas","WPG":"Winnipeg","WSH":"Washington"}
start=datetime.date(2026,9,29); out=[]
for l in open("data/nhl_2026_oct_nov.txt"):
    if not re.match(r"^\d{4}:",l): continue
    d=datetime.date(2026,int(l[:2]),int(l[2:4])); day=(d-start).days
    for p in l[5:].split(","):
        p=p.strip(); neutral=p.endswith("*"); a,h=p.rstrip("*").split("-")
        out.append([day,CODE[a],CODE[h],1 if neutral else 0])
js=["/* ============ the real start of the 2026-27 NHL schedule ============ */",
    "/* Sept 29 - Nov 29, "+str(len(out))+" games, transcribed from Hockey-Reference's schedule page",
    "   (data/nhl_2026_oct_nov.txt; made by data/build_nhl2026.py). [days after",
    "   Sept 29, away, home, neutral]. The rest of the season is generated to fit the",
    "   NHL's 84-game matrix around these; later seasons come from the formula. */",
    "const REAL_NHL2026="+json.dumps(out,separators=(",",":"))+";"]
open("src/leagues/nhl/30_schedule2026.js","w").write("\n".join(js)+"\n")
print(len(out),"games written")
