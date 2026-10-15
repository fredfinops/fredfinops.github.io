# AGENTS.md

Published static site for fredfinops.com. GitHub Pages serves branch `main` at `/`. This repo is Astro build output, not an Astro project. There is no install or build step.

Before changing a feature, look it up in docs/CAPABILITIES.md; if you add, move or remove a feature, update its entry in the same PR (add one if missing).
The capabilities check runs with the local checks and fails on any listed path that doesn't exist.

Repo-specific traps: `.claude/rules/repository.md`.

## Checks

- `make check` runs the capabilities tests and the capabilities check.
- There is no lint, typecheck, or app test suite. `origin/main` had no local check.

## Traps

- Do not add symlinks, submodules, or skill copies. Pages artifact upload fails on a dangling link, and Pages cannot clone a private submodule.
- `.nojekyll` and `CNAME` must stay. `CNAME` is `www.fredfinops.com`.
- `redirect/index.html` is the Whoop OAuth bounce. Do not widen what it forwards.
- Edits to published pages are edits to the HTML Pages serves. Nothing in this repo rebuilds them.
