# Money learning content

This directory is the website's tracked copy of the 31 financial literacy drafts prepared on 29 September 2026. `catalog.json` preserves their course, module and slug ordering; its `path` fields refer to the original editorial export layout, not runtime URLs.

The library is at `/money/learn`; reading pages are `/money/learn/<slug>`. The existing database-backed Study courses are not changed. No database seed, migration, account or server connection is required to read these pages.

Edit the individual Markdown files here to update the website. Keep YAML front matter, official inline source links, disclaimers and pending verification notes. Update the catalogue if changing a title, slug, course or order. The reader strips front matter and the unresolved publisher placeholder, and puts Answers in a disclosure; it does not rewrite factual material. It retains all nine verification TODOs across five drafts.

All content remains draft, with visible review notices and noindex route metadata. Resolve factual checks and obtain editorial approval before removing those notices. Do not replace unknown facts with guesses. Business modules intentionally start at 2; module 1 was outside the supplied batch.

Checks: `npm test -- src/test/moneyLessons.test.jsx`, then `npm run build`.
