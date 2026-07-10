# Task 3 Report: Integrate search index into useEntries

**Status:** DONE

**Build output:** webpack 5.108.3 compiled successfully with 3 warnings (bundle size recommendations only, no errors)

**Changes made to `src/hooks/useEntries.ts`:**

1. Added import for `buildSearchIndex` and `rebuildAllSearchIndexes` from `../utils/searchIndex`
2. In `addEntry`: added `await buildSearchIndex(...)` call after `await refresh()` and before `return id`
3. In `updateEntry`: added conditional index rebuild when `title` or `contentHtml` changes (fetches updated entry, calls `buildSearchIndex`)
4. In `deleteEntry`: added `await db.searchIndex.where('entryId').equals(id).delete()` before version and entry deletion (cascade order: searchIndex → versions → entries)
5. Added `rebuildSearchIndexes` to the returned object, wrapping `rebuildAllSearchIndexes(db)` in a `useCallback` with `refresh` dependency

**Notes:**
- `refresh` is in the dependency array for `rebuildSearchIndexes` (as specified in brief, not `[]`)
- The `cleanupTrash` function was not modified per the brief (no search index cleanup needed for expired trash entries)
