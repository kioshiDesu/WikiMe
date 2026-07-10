# Storage & Performance Optimization

**Date:** 2026-07-10
**Status:** Approved

## Overview

Scale WikiMe to handle thousands of entries, hundreds of sections/categories, and years of version history without excessive storage usage or UI jank.

## Changes

### 1. Content Compression with lz-string

Compress `contentHtml` before writing to IndexedDB, decompress on read.

- **Entry schema addition (v6):** Add `compressed: boolean` field
- **Write path:** `addEntry` / `updateEntry` → compress `contentHtml` via `lz-string.compressToUTF16()` → store compressed string + `compressed: true`
- **Read path:** if `entry.compressed`, decompress via `lz-string.decompressFromUTF16()`
- **Migration:** Existing entries have `compressed === undefined`. On first read, attempt `lz-string.decompressFromUTF16(contentHtml)` — if it returns falsy (not valid compressed), treat content as raw HTML, compress it, and write back. This handles both old and new entries transparently.
- **Version content:** Same compression applied in `saveVersion`
- **Dependency:** Add `lz-string` package

### 2. Version Store Optimization

- **Compression:** Version `contentHtml` compressed identically to entries
- **Dual pruning:** Keep versions where both conditions hold:
  - At most 5 versions per entry (existing behavior)
  - Versions newer than 90 days
  - Oldest versions deleted first
- **Dedup:** Skip version if content matches latest (existing, unchanged)

### 3. Category View Pagination

Replace in-memory sort+slice with Dexie compound index pagination.

- Current: `db.entries.where('categoryId').equals(catId).toArray()` → sort in JS → slice
- New: Use `[categoryId+updatedAt]` compound index with `.between()` bounds and `.reverse()` to get entries in updatedAt-descending order, paged via `.offset().limit()`
- Falls back to in-memory sort only if compound index query fails

### 4. Search Index Debouncing

- Replace synchronous `buildSearchIndex` call in auto-save with a debounced rebuild
- 2-second debounce timer, reset on each auto-save trigger
- Clears + rebuilds index for that entry only (existing behavior)
- Prevents redundant index churn during rapid typing

### 5. Export Compression

- **Export (v3):** Bump `version` to 3. Compress the entire JSON blob with lz-string (`compressToUTF16`) before download
- **Import v3:** Check `data.version === 3` → decompress via `lz-string.decompressFromUTF16()` → parse JSON
- **Import v2:** `data.version === 2` or `!data.version` → unchanged behavior (raw JSON)
- Download append/click/revoke pattern unchanged

### 6. VirtualList Remeasurement Fix

- Remove `scrollTop` from the measurement `useEffect` dependency array
- Only re-measure when `items.length` changes
- Prevents O(n) Map creation on every scroll tick

### 7. DB Migration (v5 → v6)

```ts
this.version(6).stores({
  // Same indexes as v5
  sections: '++id, name',
  categories: '++id, name, sectionId',
  entries: '++id, categoryId, title, pinned, updatedAt, deletedAt, [categoryId+deletedAt], [categoryId+pinned+updatedAt]',
  versions: '++id, entryId, savedAt, [entryId+savedAt]',
  searchIndex: '++id, entryId, token',
}).upgrade(async tx => {
  await tx.table('entries').toCollection().modify(e => {
    if (e.compressed === undefined) e.compressed = false
  })
  await tx.table('versions').toCollection().modify(e => {
    if (e.compressed === undefined) e.compressed = false
  })
})
```

## Files to Change

| File | Change |
|------|--------|
| `src/db/db.ts` | Add v6 migration, `compressed` field to Entry/EntryVersion interfaces |
| `src/hooks/useEntryMutations.ts` | Compress before add/update entry, decompress after get |
| `src/hooks/useVersions.ts` | Compress version content, dual pruning (age + count) |
| `src/hooks/useEntriesList.ts` | Use compound index pagination for category view |
| `src/utils/exportImport.ts` | v3 compressed export/import |
| `src/utils/searchIndex.ts` | No changes needed (already bulk operations; debounce handled at call site) |
| `src/pages/EntryEditPage.tsx` | Debounce search index rebuild on auto-save |
| `src/components/VirtualList.tsx` | Remove `scrollTop` from measurement deps |
| `package.json` | Add `lz-string` dependency |

## Out of Scope

- Full-text search engine swap (Fuse.js, etc.)
- Splitting entry metadata from content
- Database partitioning or sharding
- Image attachment optimization (no image support yet)
- Web Worker for compression (overkill for Phase 1)
