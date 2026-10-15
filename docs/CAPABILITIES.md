# Capabilities

This table is the capability inventory for fredfinops.github.io.
A feature with no entry gets one added in the same PR.

Status is `Planned`, `In progress`, or `Done`.
Key is a GitHub issue `#n`, or `—` when there is no issue.
Where is a comma-separated list of repo-root-relative paths.
Each path must exist. Absolute paths and paths containing `..` are rejected.

| Status | Key | Description | Where |
| --- | --- | --- | --- |
| Done | — | Public site shell, subscribe link, and analytics tag | index.html, fonts/atkinson-regular.woff, fonts/atkinson-bold.woff, favicon.svg |
| Done | — | Blog and RSS feed | blog/index.html, rss.xml |
| Done | — | Resources pages and FOCUS column list | resources/index.html, resources/focus/index.html, resources/gettingintofinops/index.html, resources/helpfulfinopsstuff/index.html, files/FOCUSColumnsbyType.pdf |
| Done | — | About page and handout | about/index.html, files/working_genius_handouts.pdf |
| Done | — | Sitemap | sitemap-index.xml, sitemap-0.xml |
| Done | — | Custom domain served without Jekyll | CNAME, .nojekyll |
| Done | — | Whoop OAuth callback bounce | redirect/index.html |
| Done | #1 | Capability inventory check | docs/CAPABILITIES.md, scripts/check-capabilities.mjs, scripts/check-capabilities.test.mjs, Makefile |
