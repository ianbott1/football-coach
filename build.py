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
"""
import os, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "src")
OUTNAME = {"cfb": "football-coach.html"}

def build(league="cfb"):
    ldir = os.path.join(SRC, "leagues", league)
    if not os.path.isdir(ldir):
        sys.exit("no such league: %s" % league)
    game = open(os.path.join(ldir, "GAME"), encoding="utf-8").read().strip()
    gdir = os.path.join(SRC, game)
    if not os.path.isdir(gdir):
        sys.exit("league %s wants game layer %s, which doesn't exist" % (league, game))
    head = open(os.path.join(SRC, "_head.html"), encoding="utf-8").read()
    tail = open(os.path.join(SRC, "_tail.html"), encoding="utf-8").read()
    files = [f for d in (os.path.join(SRC, "core"), gdir, ldir)
             for f in glob.glob(os.path.join(d, "*.js"))]
    names = [os.path.basename(m) for m in files]
    dup = sorted({n for n in names if names.count(n) > 1})
    if dup:
        sys.exit("two layers both define: %s" % ", ".join(dup))
    mods = sorted(files, key=os.path.basename)
    js = "".join(open(m, encoding="utf-8").read() for m in mods)
    out = os.path.join(HERE, "dist", OUTNAME.get(league, league + ".html"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(head + "<script>" + js + "</script>" + tail)
    print("built %s  (%d bytes, %d modules)" % (out, os.path.getsize(out), len(mods)))
    for m in mods:
        print("   ", os.path.relpath(m, SRC))

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "cfb")
