#!/usr/bin/env python3
"""Sports Sims — build.

A game is the shared core (src/modules/) plus one sport (src/sports/<sport>/).
Files from both are merged and concatenated in filename order into the HTML
shell. Filenames are numbered so plain sorting gives the right build order:
a sport's files slot in between the core modules they depend on.

    python3 build.py              -> dist/football-coach.html   (sport: cfb)
    python3 build.py <sport>      -> dist/<sport>.html
"""
import os, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "src")
OUTNAME = {"cfb": "football-coach.html"}

def build(sport="cfb"):
    sdir = os.path.join(SRC, "sports", sport)
    if not os.path.isdir(sdir):
        sys.exit("no such sport: %s" % sport)
    head = open(os.path.join(SRC, "_head.html"), encoding="utf-8").read()
    tail = open(os.path.join(SRC, "_tail.html"), encoding="utf-8").read()
    core = glob.glob(os.path.join(SRC, "modules", "*.js"))
    mine = glob.glob(os.path.join(sdir, "*.js"))
    names = [os.path.basename(m) for m in core + mine]
    dup = sorted({n for n in names if names.count(n) > 1})
    if dup:
        sys.exit("core and sport both define: %s" % ", ".join(dup))
    mods = sorted(core + mine, key=os.path.basename)
    if not mods:
        sys.exit("no modules found")
    js = "".join(open(m, encoding="utf-8").read() for m in mods)
    out = os.path.join(HERE, "dist", OUTNAME.get(sport, sport + ".html"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(head + "<script>" + js + "</script>" + tail)
    print("built %s  (%d bytes, %d modules)" % (out, os.path.getsize(out), len(mods)))
    for m in mods:
        print("   ", os.path.relpath(m, SRC))

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "cfb")
