#!/usr/bin/env python3
"""Football Coach — build.

Concatenates src/modules/*.js in filename order into the HTML shell and writes
a single self-contained page. Module order matters: filenames are numbered so
plain sorting gives the right build order.

    python3 build.py            -> dist/football-coach.html
"""
import os, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "src")
OUT  = os.path.join(HERE, "dist", "football-coach.html")

def build():
    head = open(os.path.join(SRC, "_head.html"), encoding="utf-8").read()
    tail = open(os.path.join(SRC, "_tail.html"), encoding="utf-8").read()
    mods = sorted(glob.glob(os.path.join(SRC, "modules", "*.js")))
    if not mods:
        sys.exit("no modules found in src/modules/")
    js = "".join(open(m, encoding="utf-8").read() for m in mods)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(head + "<script>" + js + "</script>" + tail)
    print("built %s  (%d bytes, %d modules)" % (OUT, os.path.getsize(OUT), len(mods)))
    for m in mods:
        print("   ", os.path.basename(m))

if __name__ == "__main__":
    build()
