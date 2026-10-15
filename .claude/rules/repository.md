# Repository rules

GitHub Pages serves this repo from branch `main`, path `/`. It is published HTML, not the Astro project that produced it.

- Keep `.nojekyll`. Without it, Pages runs Jekyll and can skip files.
- `CNAME` is `www.fredfinops.com`. Change it only when the domain change is the task.
- Do not add git submodules, symlinks, or agent skill copies. Pages checkout fails on a private submodule. Artifact upload fails on a dangling link.
- `redirect/index.html` is a noindex, no-referrer, no-store bounce. It may forward only `code`, `state`, `error`, and `error_description`. Do not add analytics or extra query fields.
- There is no version or changelog convention. Do not invent one for a content edit.
