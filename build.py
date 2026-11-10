#!/usr/bin/env python3
"""Sports Sims — build.

A game is three layers, merged and concatenated in filename order into the
HTML shell:

    src/core/              the engine: RNG, Elo, the season machine, UI
    src/<game>/            the sport itself: positions, the drive engine,
                           box scores, the staff room (football)
    src/leagues/<league>/  one league: teams, structure, schedule, ranking,
                           postseason, awards, offseason, names (cfb)

A league names its game layer in its GAME file. Filenames are numbered so
plain sorting gives the right build order across all three layers; two
layers may not use the same filename.

    python3 build.py              -> dist/football-coach.html   (league: cfb)
    python3 build.py <league>     -> dist/<league>.html
    python3 build.py site         -> all six, plus the landing page, in dist/site/
                                     (what the GitHub Pages root holds)
"""
import os, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "src")
OUTNAME = {"cfb": "football-coach.html", "nfl": "football-coach-pro.html", "ncaab": "basketball-coach.html", "nba": "basketball-coach-pro.html", "nhl": "hockey-coach-pro.html", "epl": "soccer-coach.html", "mlb": "baseball-coach-pro.html"}

def build(league="cfb"):
    ldir = os.path.join(SRC, "leagues", league)
    if not os.path.isdir(ldir):
        sys.exit("no such league: %s" % league)
    game = open(os.path.join(ldir, "GAME"), encoding="utf-8").read().strip()
    gdir = os.path.join(SRC, game)
    if not os.path.isdir(gdir):
        sys.exit("league %s wants game layer %s, which doesn't exist" % (league, game))
    head = open(os.path.join(SRC, "_head.html"), encoding="utf-8").read()
    tfile = os.path.join(ldir, "TITLE")                   # the browser tab's title
    if os.path.exists(tfile):
        import re
        title = open(tfile, encoding="utf-8").read().strip()
        head = re.sub(r"<title>.*?</title>", lambda m: "<title>" + title + "</title>", head, count=1)   # a function: no escapes
    tail = open(os.path.join(SRC, "_tail.html"), encoding="utf-8").read()
    files = [f for d in (os.path.join(SRC, "core"), gdir, ldir)
             for f in glob.glob(os.path.join(d, "*.js"))]
    names = [os.path.basename(m) for m in files]
    dup = sorted({n for n in names if names.count(n) > 1})
    if dup:
        sys.exit("two layers both define: %s" % ", ".join(dup))
    mods = sorted(files, key=os.path.basename)
    js = "".join(open(m, encoding="utf-8").read() for m in mods)
    # the build stamp: a hash of everything that went in, shown on the title
    # screen so a tester can tell which build they're playing (the same
    # source always gives the same stamp, so a rebuild still matches)
    import hashlib
    stamp = hashlib.sha1((head + js + tail).encode("utf-8")).hexdigest()[:7]
    js = 'const BUILD_ID="%s";\n' % stamp + js
    out = os.path.join(HERE, "dist", OUTNAME.get(league, league + ".html"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(head + "<script>" + js + "</script>" + tail)
    print("built %s  (%d bytes, %d modules, build %s)" % (out, os.path.getsize(out), len(mods), stamp))
    for m in mods:
        print("   ", os.path.relpath(m, SRC))

def site():
    """Every game, and src/landing.html as index.html, in dist/site/."""
    import re, shutil
    out = os.path.join(HERE, "dist", "site")
    os.makedirs(out, exist_ok=True)
    for lg in OUTNAME:
        build(lg)
        shutil.copy(os.path.join(HERE, "dist", OUTNAME[lg]), os.path.join(out, OUTNAME[lg]))
    head = open(os.path.join(SRC, "_head.html"), encoding="utf-8").read()
    icon = re.search(r'<link rel="icon" href="([^"]*)">', head).group(1)
    page = open(os.path.join(SRC, "landing.html"), encoding="utf-8").read()
    page = page.replace("<!--ICON-->", '<link rel="icon" href="%s">' % icon).replace("<!--ICONURL-->", icon)
    # each game's build stamp on the landing page, so a tester can check the site is current
    import hashlib
    stamps = []
    for lg in OUTNAME:
        g = open(os.path.join(out, OUTNAME[lg]), encoding="utf-8").read()
        m = re.search(r'const BUILD_ID="([0-9a-f]+)"', g)
        stamps.append(m.group(1) if m else "?")
    page = page.replace("<!--BUILDS-->", "Builds: " + " &middot; ".join(stamps))
    # round 48: every game checks this on load and says when the browser served it an older copy (Muse, round 21: a
    # pro football page two builds old for a whole review, and a college page with the last build's stamp on first load)
    import json
    with open(os.path.join(out, "version.json"), "w", encoding="utf-8") as f:
        json.dump({OUTNAME[lg]: st for lg, st in zip(OUTNAME, stamps)}, f)
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)
    print("site: %s" % ", ".join(sorted(os.listdir(out))))

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "cfb"
    site() if arg == "site" else build(arg)
