# Football Coach

A college football coaching career simulator. Build a program. Win it all.

**Play it:** https://ianbott.github.io/football-coach/

## What it is

You're the head coach, not the athletic director. You have a job, a record, and a
seat that gets warm. Miss expectations two years running and you're fired — then
you pick from whatever programs will still take you.

- **132 FBS programs** across all ten conferences, with real 2026 alignment
- **Ten rated starters per team** who develop, graduate, get hurt, and leave early
- **A weekly gameplan** — protect a lead or open it up. An underdog going for it
  roughly doubles its chances; a favourite doing it throws away a win.
- **An offseason budget** across recruiting, development, facilities and retention.
  Every point you spend somewhere is a point you didn't spend elsewhere.
- **A coaching career** — reputation, job offers, firings, and a record that
  follows you from program to program.

## How the simulation works

Team strength is derived from player ratings rather than set by hand. Games are
decided by the rating gap plus real-world variance, calibrated so favourites win
about 70% of the time, the mean margin is ~15 points, and roughly one team a year
finishes the regular season unbeaten.

The public poll is modelled separately from the underlying ratings — voters are
sticky and punish losses out of proportion, so the poll can be wrong about a team
for weeks. The playoff field is picked from the poll, not from the ratings.

## Running it

One self-contained HTML file, no build step and no dependencies.

```
open index.html
```

Save data and the shared league table use the host environment's storage API.
