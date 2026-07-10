# Task 4 Report: Wire indexed search in HomePage

**Status:** DONE

## Changes made to `src/pages/HomePage.tsx`:

1. **Added import** for `searchEntries` and `rebuildAllSearchIndexes` from `../utils/searchIndex` (line 22). `db` was already imported — no duplicate.

2. **Replaced the search `useEffect`** (old lines 161–187) — the `.includes()` filter over `db.entries.toArray()` with a 200ms debounce was swapped for `searchEntries(db, query)` which uses the IndexedDB `searchIndex` table for instant prefix search. The new effect uses `categoryMap` (already a `useMemo`) and the `Entry` type guard.

3. **Added index rebuild after seeding** — `rebuildAllSearchIndexes(db).catch(() => {})` placed in the `.then()` after the starter data seeding completes, so the welcome entry gets indexed.

## Build output

```
webpack 5.108.3 compiled successfully in 22533 ms
```

No errors. Only pre-existing webpack performance warnings (bundles size advice).

## Report file

`/storage/self/primary/Documents/wikime/.superpowers/sdd/task-4-report.md`
