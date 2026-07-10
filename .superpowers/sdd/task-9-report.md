# Task 9: Optimistic updates — Report

**Status:** DONE

**Build:** Compiled successfully (webpack 5.108.3, 3 warnings — bundle size perf recommendations only, no errors).

**Summary of changes:**

### `src/hooks/useEntries.ts`
- **updateEntry** — removed `refresh()` call, added `setAllEntries(prev => prev.map(...))` optimistic update, deps `[]`.
- **trashEntry** — removed `refresh()` call, added `setAllEntries(prev => prev.map(...))` optimistic update, deps `[]`.
- **restoreEntry** — removed `refresh()` call, added `setAllEntries(prev => prev.map(...))` optimistic update, deps `[]`.
- **deleteEntry** — removed `refresh()` call, added `setAllEntries(prev => prev.filter(...))` optimistic update, deps `[]`.
- **addEntry** — moved `refresh()` after `buildSearchIndex()` call (still keeps full refresh since we don't know sort position).
- Unchanged: `saveVersion`, `getVersions`, `restoreVersion`, `cleanupTrash`, `rebuildSearchIndexes`.

### `src/hooks/useCategories.ts`
- **addCategory** — removed `refresh()`, added `setCategories(prev => [...prev, ...])` optimistic update, deps `[]`.
- **updateCategory** — removed `refresh()`, added `setCategories(prev => prev.map(...))` optimistic update, deps `[]`.
- **deleteCategory** — removed `refresh()`, added `setCategories(prev => prev.filter(...))` optimistic update, deps `[]`.

**Concerns:** None. All patterns match the brief exactly.
