# Scalability Optimization Design

## Problem
WikiMe currently loads all entries and categories into memory and filters with JavaScript `.includes()`. With 1000+ categories and thousands of entries, this causes:
- Slow search (full HTML string scan on every keystroke)
- Janky scrolling (thousands of DOM nodes rendered)
- Unusable category browsing (flat list of 1000+ items)
- Orphaned version records accumulating

## Solution Overview
Three independent subsystems that together keep the app fast at scale:
1. **Search Index** — tokenized search index stored in IndexedDB
2. **Virtual Scrolling** — only render visible items in lists
3. **Paginated Categories** — alphabetical groups with letter jump bar
Plus data flow optimizations.

---

## 1. Search Subsystem

### `searchIndex` Table
```
searchIndex: { id: ++id, entryId: number, token: string }
```
Index on `token` for `startsWith` prefix queries.

### Tokenization (on entry save)
- Strip HTML tags from `contentHtml` → plain text
- Split on whitespace/punctuation → lowercase words
- Deduplicate tokens per entry
- Delete old tokens for this entry → bulk-add new tokens
- Tokens include words from both title and stripped content

### Query (on keystroke)
```
db.searchIndex
  .where('token')
  .startsWith(query.toLowerCase())
  .distinct()
  .toArray()
```
Returns matching `entryId`s → fetch those entries separately.

### Properties
- Fully IndexedDB-native: zero in-memory index
- Sub-millisecond token prefix lookups even at 10k+ entries
- ~0.5–2MB for the index table at 10k entries (negligible for IndexedDB)
- Incremental: only re-tokenize the saved entry, not everything

### Initial Index Build
- On first app launch after upgrade, check if `searchIndex` is empty while entries exist
- If so, bulk-build index: iterate all entries, tokenize, bulk-add in chunks of 100
- Runs once; subsequent saves update incrementally

---

## 2. Virtual Scrolling

### `VirtualList` Component
A minimal (~80 lines) React component:
- Props: `items`, `itemHeight`, `renderItem`, `overscan` (default 5)
- Tracks scroll position via `onScroll`
- Calculates visible range: `start = floor(scrollTop / itemHeight) - overscan`, `end = start + visibleCount + 2*overscan`
- Renders a container div with `paddingTop` = `start * itemHeight` and `paddingBottom` = `(total - end) * itemHeight`
- Only renders items in `[start, end)` range

### Where VirtualList replaces flat .map()
- `CategoryPage` — entry list inside a category
- `TrashPage` — trashed entries list
- `HomePage` — recent entries section (when scrolled)
- Category picker modal (step 2 of FAB) — 1000+ categories in a searchable list

### Item Heights
- Entry card: ~72px
- Category button in picker: ~48px
- Category letter-group header: ~32px

---

## 3. Category Browsing at Scale

### Alphabetical Grouping
- Categories within a section grouped by first letter (A–Z, `#` for non-alpha)
- Each group shows letter header + count badge
- Group headers collapse/expand on tap

### Letter Jump Bar
- Fixed right-side bar with letters A–Z + `#`
- Tap a letter → scroll to that group
- Only appears when section has >30 categories

### Category Search
- Text input at top of category list
- Queries `db.categories.where('name').startsWith(q)` (already indexed)
- Instant filtered results

### Threshold
- Sections with ≤30 categories keep current flat list behavior
- Alphabetical grouping activates at >30 categories per section

---

## 4. Storage & Data Flow Optimizations

### Optimistic Updates
After any mutation (pin, trash, update, restore):
- Update React state immediately (optimistic)
- Do NOT call `refresh()` (full re-fetch)
- Only re-fetch on component mount or explicit pull-to-refresh
- Eliminates flicker and redundant DB queries

### Version Cascade on Delete
- `deleteCategory`: also delete versions for entries in that category
- `deleteSection`: also delete versions for entries in child categories
- `cleanupTrash` in `AppShell`: also delete versions for expired entries

### Export/Import
- Include `versions` table in export/import so no history is lost
- Apply same ID remapping pattern (entryId → new entryId)
- `searchIndex` table NOT exported (it's derivable from entries)
- On import completion, trigger a bulk search index rebuild

---

## Files Changed

| File | Change |
|------|--------|
| `src/db/db.ts` | Add `searchIndex` table (version 5 schema), fix version cascade on deletes |
| `src/hooks/useEntries.ts` | Add `rebuildSearchIndex(entryId)` on save; optimistic update pattern; cascade versions on delete |
| `src/components/VirtualList.tsx` | New file — virtual scrolling component |
| `src/pages/HomePage.tsx` | Category section uses VirtualList + alphabetical groups with letter jump bar |
| `src/pages/CategoryPage.tsx` | Entry list uses VirtualList |
| `src/pages/TrashPage.tsx` | Entry list uses VirtualList |
| `src/pages/EntryEditPage.tsx` | Trigger search index rebuild on save |
| `src/pages/EntryViewPage.tsx` | Trigger search index rebuild on checklist toggle in read mode |
| `src/hooks/useCategories.ts` | Category search: use indexed `startsWith` query instead of JS filter |
| `src/utils/searchIndex.ts` | New file — tokenize + index building helpers + initial bulk build logic |
| `src/utils/exportImport.ts` | Include versions in export/import with ID remapping |
| `src/components/AppShell.tsx` | Fix `cleanupTrash` to also delete versions |
