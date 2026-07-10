# Task 11: Include versions in export/import

**Status:** DONE

**Build:** Compiled successfully with 3 warnings (webpack performance, pre-existing)

**Changes made to `src/utils/exportImport.ts`:**
- `exportData()`: Added `versions: await db.versions.toArray()` to the export data object
- `importData()`: Added `db.versions` and `db.searchIndex` to the transaction scope
- `importData()`: Added `await db.versions.clear()` and `await db.searchIndex.clear()` before import
- `importData()`: Changed `entries` import to use `{ allKeys: true }` and build `oldToNewEntry` ID map (instead of plain bulkAdd without tracking IDs)
- `importData()`: Added versions import block that remaps `entryId` via `oldToNewEntry`
- `importData()`: Added dynamic import of `rebuildAllSearchIndexes` and call after transaction