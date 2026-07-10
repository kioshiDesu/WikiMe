# Task 2 Report: Create searchIndex utility

**Status:** DONE

**Build output:** `webpack 5.108.3 compiled successfully` — no errors (only pre-existing webpack performance warnings about bundle size)

**Created:** `src/utils/searchIndex.ts` with 5 exports:
- `stripHtml(html)` — creates temp div, returns textContent
- `tokenize(text)` — lowercases, splits on punctuation/whitespace, deduplicates, filters empties
- `buildSearchIndex(entryId, title, contentHtml, db)` — builds index for one entry (strips HTML, tokenizes, deletes old tokens, bulk-adds new)
- `rebuildAllSearchIndexes(db)` — bulk rebuild (skips if already up-to-date, clears otherwise, iterates in chunks of 100)
- `searchEntries(db, query)` — prefix search with `.startsWith()`, deduplicates entryIds

**Concerns:** None
