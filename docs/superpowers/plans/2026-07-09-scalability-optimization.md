# Scalability Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WikiMe fast and responsive with 1000+ categories and thousands of entries.

**Architecture:** Add a tokenized search index in IndexedDB for instant search, a virtual list component for smooth scrolling, alphabetical category grouping with letter jump bar for navigation, and optimistic data flow with proper version cascading.

**Tech Stack:** Dexie.js, IndexedDB, React hooks, CSS sticky positioning

## Global Constraints

- All search index operations must be IndexedDB-native (no in-memory search libraries)
- VirtualList must be a standalone component (~80 lines max)
- No new npm dependencies
- TDD: write test code (or manual verification steps) before implementation
- Follow existing code patterns in the codebase

---

### Task 1: Add searchIndex table to DB schema

**Files:**
- Modify: `src/db/db.ts`

**Interfaces:**
- Produces: Dexie `searchIndex` table with schema `'++id, entryId, token'`
- Produces: `DEFAULT_TRASH_DAYS` export (already exists, verify)

- [ ] **Step 1: Read current db.ts**

```bash
cat src/db/db.ts
```

- [ ] **Step 2: Add SearchIndexEntry interface and update DB version**

Edit `src/db/db.ts`:

After the `EntryVersion` interface, add:
```ts
export interface SearchIndexEntry {
  id?: number
  entryId: number
  token: string
}
```

In the `WikiMeDB` class, add `searchIndex` to the tables list. Change version from 4 to 5 and increment the schema version:
```ts
export class WikiMeDB extends Dexie {
  sections!: Table<Section, number>
  categories!: Table<Category, number>
  entries!: Table<Entry, number>
  versions!: Table<EntryVersion, number>
  searchIndex!: Table<SearchIndexEntry, number>

  constructor() {
    super('WikiMeDB')
    this.version(5).stores({
      sections: '++id, name',
      categories: '++id, name, sectionId',
      entries: '++id, categoryId, title, pinned, updatedAt, deletedAt',
      versions: '++id, entryId, savedAt',
      searchIndex: '++id, entryId, token',
    })
  }
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled with only the 3 bundle size warnings (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/db/db.ts
git commit -m "feat: add searchIndex table to DB schema v5"
```

---

### Task 2: Create searchIndex utility (tokenize + index helpers)

**Files:**
- Create: `src/utils/searchIndex.ts`

**Interfaces:**
- Produces: `tokenize(text: string): string[]` — splits text into lowercase unique word tokens
- Produces: `stripHtml(html: string): string` — strips HTML tags
- Produces: `buildSearchIndex(entryId: number, title: string, contentHtml: string, db: WikiMeDB): Promise<void>` — builds index for one entry
- Produces: `rebuildAllSearchIndexes(db: WikiMeDB): Promise<void>` — bulk rebuild for all entries
- Produces: `searchEntries(db: WikiMeDB, query: string): Promise<number[]>` — returns matching entry IDs

- [ ] **Step 1: Write the utility file**

Create `src/utils/searchIndex.ts`:
```ts
import type { WikiMeDB } from '../db/db'

export function stripHtml(html: string): string {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent || ''
}

export function tokenize(text: string): string[] {
  const words = text.toLowerCase().split(/[\s,.;:!?()\[\]{}"'/\\@#$%^&*+=<>~`|]+/)
  const unique = new Set<string>()
  for (const w of words) {
    if (w.length > 0) unique.add(w)
  }
  return Array.from(unique)
}

export async function buildSearchIndex(
  entryId: number,
  title: string,
  contentHtml: string,
  db: WikiMeDB,
): Promise<void> {
  const plainText = title + ' ' + stripHtml(contentHtml)
  const tokens = tokenize(plainText)
  await db.searchIndex.where('entryId').equals(entryId).delete()
  if (tokens.length === 0) return
  const rows = tokens.map(token => ({ entryId, token }))
  await db.searchIndex.bulkAdd(rows)
}

export async function rebuildAllSearchIndexes(db: WikiMeDB): Promise<void> {
  const count = await db.searchIndex.count()
  const entryCount = await db.entries.count()
  if (entryCount === 0) return
  if (count > 0) {
    const hasStale = (await db.searchIndex.limit(1).toArray()).length > 0
    if (hasStale && (await db.searchIndex.count()) >= entryCount) return
  }
  await db.searchIndex.clear()
  const all = await db.entries.toArray()
  for (let i = 0; i < all.length; i += 100) {
    const chunk = all.slice(i, i + 100)
    const rows = chunk.flatMap(e => {
      const plain = (e.title || '') + ' ' + stripHtml(e.contentHtml || '')
      return tokenize(plain).map(t => ({ entryId: e.id!, token: t }))
    })
    if (rows.length) await db.searchIndex.bulkAdd(rows)
  }
}

export async function searchEntries(
  db: WikiMeDB,
  query: string,
): Promise<number[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const results = await db.searchIndex
    .where('token')
    .startsWith(q)
    .distinct()
    .toArray()
  const entryIds = [...new Set(results.map(r => r.entryId))]
  return entryIds
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add src/utils/searchIndex.ts
git commit -m "feat: add search index utilities"
```

---

### Task 3: Integrate search index into useEntries

**Files:**
- Modify: `src/hooks/useEntries.ts`

**Interfaces:**
- Consumes: `buildSearchIndex` from `src/utils/searchIndex`
- Modifies: `addEntry`, `updateEntry`, `deleteEntry` to rebuild index

- [ ] **Step 1: Read current useEntries.ts**

```bash
cat src/hooks/useEntries.ts
```

- [ ] **Step 2: Add searchIndex import and index rebuild on save**

At the top of `src/hooks/useEntries.ts`, add:
```ts
import { buildSearchIndex, rebuildAllSearchIndexes } from '../utils/searchIndex'
```

In `addEntry`, after `await refresh()` and before `return id`, add:
```ts
await buildSearchIndex(id as number, data.title || '', data.contentHtml || '', db)
```

In `updateEntry`, change from:
```ts
const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  await db.entries.update(id, { ...data, updatedAt: new Date() })
  await refresh()
}, [refresh])
```
To:
```ts
const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  await db.entries.update(id, { ...data, updatedAt: new Date() })
  if (data.title !== undefined || data.contentHtml !== undefined) {
    const entry = await db.entries.get(id)
    if (entry) await buildSearchIndex(id, entry.title, entry.contentHtml, db)
  }
  await refresh()
}, [refresh])
```

In `deleteEntry`, add cascade delete of search index:
```ts
const deleteEntry = useCallback(async (id: number) => {
  await db.searchIndex.where('entryId').equals(id).delete()
  await db.versions.where('entryId').equals(id).delete()
  await db.entries.delete(id)
  await refresh()
}, [refresh])
```

At the end of the exported object, after `restoreVersion`, add:
```ts
rebuildSearchIndexes: useCallback(async () => {
  await rebuildAllSearchIndexes(db)
  await refresh()
}, [refresh]),
```

Add `rebuildSearchIndexes` to the return type.

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEntries.ts
git commit -m "feat: integrate search index into entry CRUD"
```

---

### Task 4: Wire search in HomePage to use indexed search

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `searchEntries`, `rebuildAllSearchIndexes` from `src/utils/searchIndex`
- Changes: search query to use indexed search instead of JS filter

- [ ] **Step 1: Read current HomePage search logic**

Find the search useEffect and the search results rendering:
```bash
grep -n "searching\|setResults\|query\|\.includes" src/pages/HomePage.tsx | head -20
```

- [ ] **Step 2: Replace JS filter search with indexed search**

Add import at top:
```ts
import { searchEntries, rebuildAllSearchIndexes } from '../utils/searchIndex'
```

Replace the search useEffect (the one that filters entries with `.includes()`) with:
```ts
useEffect(() => {
  if (!query.trim()) {
    setResults([])
    setSearching(false)
    return
  }
  let cancelled = false
  setSearching(true)
  searchEntries(db, query).then(entryIds => {
    if (cancelled) return
    if (entryIds.length === 0) {
      setResults([])
      setSearching(false)
      return
    }
    db.entries.bulkGet(entryIds).then(entries => {
      if (cancelled) return
      const valid = entries.filter((e): e is Entry => e !== undefined && e.deletedAt === null)
      const mapped: SearchResult[] = valid.map(e => {
        const cat = categoryMap.get(e.categoryId)
        return {
          id: e.id!,
          categoryId: e.categoryId,
          categoryName: cat?.name || 'Uncategorized',
          categoryColor: cat?.color || '#94a3b8',
          title: e.title || '',
          contentHtml: e.contentHtml || '',
          pinned: e.pinned,
          updatedAt: e.updatedAt?.toISOString() || '',
        }
      })
      setResults(mapped)
      setSearching(false)
    })
  })
  return () => { cancelled = true }
}, [query, categoryMap])
```

Also run `rebuildAllSearchIndexes(db)` in the startup useEffect after seeding data, to ensure existing entries get indexed.

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 4: Manual verification**

- Open the app
- Type a search query matching existing entry content
- Verify results appear instantly
- This replaces the old `.includes()` scan with indexed lookup

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: use indexed search on HomePage"
```

---

### Task 5: Create VirtualList component

**Files:**
- Create: `src/components/VirtualList.tsx`

**Interfaces:**
- Produces: `<VirtualList items itemHeight renderItem overscan>` component

- [ ] **Step 1: Write the VirtualList component**

Create `src/components/VirtualList.tsx`:
```tsx
import { useRef, useState, useCallback, type ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  className?: string
}

export function VirtualList<T>({ items, itemHeight, renderItem, overscan = 5, className }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  const totalHeight = items.length * itemHeight
  const containerHeight = containerRef.current?.clientHeight || 400
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan
  const endIndex = Math.min(items.length, startIndex + visibleCount)

  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className || 'overflow-y-auto'}
      style={{ overflowAnchor: 'none' }}
    >
      <div style={{ height: totalHeight, paddingTop: startIndex * itemHeight, boxSizing: 'border-box' }}>
        {visibleItems.map((item, i) => (
          <div key={startIndex + i} style={{ height: itemHeight }}>
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add src/components/VirtualList.tsx
git commit -m "feat: add VirtualList component"
```

---

### Task 6: Apply VirtualList to CategoryPage entry list

**Files:**
- Modify: `src/pages/CategoryPage.tsx`

- [ ] **Step 1: Read CategoryPage entry list rendering**

Find the `.map()` that renders entry cards:
```bash
grep -n "\.map.*entry\|entries\.map" src/pages/CategoryPage.tsx | head -10
```

- [ ] **Step 2: Replace flat map with VirtualList**

Import VirtualList:
```ts
import { VirtualList } from '../components/VirtualList'
```

Replace the entry list `.map()` with:
```tsx
<VirtualList
  items={filteredEntries}
  itemHeight={72}
  overscan={3}
  renderItem={(entry) => (
    <EntryCard
      key={entry.id}
      entry={entry}
      categoryName={category?.name || ''}
      categoryColor={category?.color || '#94a3b8'}
      onTap={selectMode ? undefined : () => navigate(`/entry/${entry.id}`)}
      selectable={selectMode}
      selected={selected.has(entry.id!)}
      onSelect={() => toggleSelect(entry.id!)}
    />
  )}
/>
```

Remove the outer `.map()` loop and its wrapping container.

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 4: Manual verification**

- Navigate to a category with entries
- Verify entries render and scroll smoothly
- Verify select mode still works

- [ ] **Step 5: Commit**

```bash
git add src/pages/CategoryPage.tsx
git commit -m "feat: virtual scroll entry list on CategoryPage"
```

---

### Task 7: Apply VirtualList to TrashPage

**Files:**
- Modify: `src/pages/TrashPage.tsx`

- [ ] **Step 1: Read TrashPage entry list**

Find the `.map()` that renders trashed entries:
```bash
grep -n "\.map\|trashedEntries" src/pages/TrashPage.tsx | head -10
```

- [ ] **Step 2: Replace with VirtualList**

Import:
```ts
import { VirtualList } from '../components/VirtualList'
```

Replace the flat map with:
```tsx
<VirtualList
  items={trashedEntries}
  itemHeight={72}
  overscan={3}
  renderItem={(entry) => (
    <TrashEntryCard key={entry.id} entry={entry} />
  )}
/>
```

If `TrashEntryCard` doesn't exist as a named component, wrap the existing inline rendering in a simple wrapper.

- [ ] **Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 4: Commit**

```bash
git add src/pages/TrashPage.tsx
git commit -m "feat: virtual scroll on TrashPage"
```

---

### Task 8: Alphabetical category grouping with letter jump bar

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Read current category rendering in HomePage**

Find where categories are rendered within sections:
```bash
grep -n "categories\.map\|sections\.map\|SectionBlock" src/pages/HomePage.tsx | head -10
```

- [ ] **Step 2: Add alphabetical grouping for sections with >30 categories**

Add a `groupCategoriesByLetter` helper function before the `SectionBlock` component or inside `HomePage`:
```tsx
function groupCategoriesByLetter(categories: Category[]): { letter: string; categories: Category[] }[] {
  const groups: Record<string, Category[]> = {}
  for (const cat of categories) {
    const first = cat.name.trim()[0] || '#'
    const letter = /[a-zA-Z]/.test(first) ? first.toUpperCase() : '#'
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(cat)
  }
  const sorted = Object.entries(groups).sort(([a], [b]) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))
  return sorted.map(([letter, cats]) => ({ letter, categories: cats }))
}
```

In the section rendering area of `SectionBlock`, when `categories.length > 30`, replace the flat category list with grouped output. Inside `SectionBlock` (or in the HomePage section rendering), add:

```tsx
{filtered.length > 30 ? (
  <div className="relative">
    <div className="space-y-1">
      {groupCategoriesByLetter(filtered).map(group => (
        <div key={group.letter} id={`letter-${group.letter}`}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-900/95 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {group.letter}
            <span className="text-[10px] font-normal text-gray-300 dark:text-gray-600">{group.categories.length}</span>
          </div>
          <div className="flex flex-col">
            {group.categories.map(cat => (
              // existing category card rendering
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-20">
      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(letter => (
        <button
          key={letter}
          onClick={() => {
            const el = document.getElementById(`letter-${letter}`)
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
          className="w-4 h-4 flex items-center justify-center text-[9px] font-medium text-gray-400 dark:text-gray-500 active:text-teal-500 dark:active:text-teal-400"
        >
          {letter}
        </button>
      ))}
    </div>
  </div>
) : (
  // existing flat category list
)}
```

- [ ] **Step 3: Add category search within HomePage**

Add a search input before the section listing that filters categories by name using indexed `startsWith`:

```tsx
const [catQuery, setCatQuery] = useState('')
// ...
{catQuery.trim() ? (
  // search results from indexed query
) : (
  // normal section + category rendering
)}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: alphabetical category grouping with letter jump bar"
```

---

### Task 9: Optimistic updates in useEntries and useCategories

**Files:**
- Modify: `src/hooks/useEntries.ts`
- Modify: `src/hooks/useCategories.ts`

- [ ] **Step 1: Read current useEntries refresh pattern**

```bash
grep -n "refresh\|setEntries\|setTrashedEntries" src/hooks/useEntries.ts | head -20
```

- [ ] **Step 2: Add optimistic state setters**

In `useEntries.ts`, after the `useState` for `allEntries`, add refs for the latest state:

```ts
const entriesRef = useRef<Entry[]>([])
entriesRef.current = entries
const trashedRef = useRef<Entry[]>([])
trashedRef.current = trashedEntries
```

Make `updateEntry` optimistic:
```ts
const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  await db.entries.update(id, { ...data, updatedAt: new Date() })
  // Optimistic: update local state without re-fetch
  setAllEntries(prev => prev.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date() } as Entry : e))
  if (data.title !== undefined || data.contentHtml !== undefined) {
    const entry = await db.entries.get(id)
    if (entry) await buildSearchIndex(id, entry.title, entry.contentHtml, db)
  }
}, [])
```

Apply similar optimistic patterns to `trashEntry`, `restoreEntry`, `pinEntry` (if it exists), and `deleteEntry`:
- `trashEntry`: update allEntries → mark as deleted (or remove) + add to trashed
- `restoreEntry`: move from trashed back to active
- `deleteEntry`: remove from both lists

- [ ] **Step 3: Apply same pattern to useCategories**

```bash
cat src/hooks/useCategories.ts
```

Make `addCategory`, `updateCategory`, `deleteCategory` optimistic by updating state directly after the DB operation, skipping the full `refresh()`.

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEntries.ts src/hooks/useCategories.ts
git commit -m "perf: optimistic updates in useEntries and useCategories"
```

---

### Task 10: Version cascade on delete

**Files:**
- Modify: `src/hooks/useEntries.ts` (if not already done in Task 3)
- Modify: `src/hooks/useCategories.ts`
- Modify: `src/hooks/useSections.ts`
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Read current delete logic**

```bash
grep -n "deleteCategory\|deleteSection\|cleanupTrash" src/hooks/useCategories.ts src/hooks/useSections.ts src/hooks/useEntries.ts
```

- [ ] **Step 2: Add version cascade to deleteCategory**

In `useCategories.ts`, find `deleteCategory` and update it:
```ts
const deleteCategory = useCallback(async (id: number) => {
  const entryIds = (await db.entries.where('categoryId').equals(id).toArray()).map(e => e.id!)
  await db.searchIndex.where('entryId').anyOf(entryIds).delete()
  await db.versions.where('entryId').anyOf(entryIds).delete()
  await db.entries.where('categoryId').equals(id).delete()
  await db.categories.delete(id)
  setCategories(prev => prev.filter(c => c.id !== id))
}, [])
```

- [ ] **Step 3: Add version cascade to deleteSection**

In `useSections.ts`, find the delete logic and add:
```ts
const catIds = (await db.categories.where('sectionId').equals(id).toArray()).map(c => c.id!)
const entryIds: number[] = []
for (const catId of catIds) {
  const ids = (await db.entries.where('categoryId').equals(catId!).toArray()).map(e => e.id!)
  entryIds.push(...ids)
}
await db.searchIndex.where('entryId').anyOf(entryIds).delete()
await db.versions.where('entryId').anyOf(entryIds).delete()
await db.entries.where('categoryId').anyOf(catIds as number[]).delete()
await db.categories.where('sectionId').equals(id).delete()
```

- [ ] **Step 4: Fix cleanupTrash in AppShell**

Read the AppShell:
```bash
cat src/components/AppShell.tsx
```

Find the cleanupTrash logic and add version deletion:
```ts
if (entry.deletedAt) {
  const deadline = new Date(entry.deletedAt.getTime() + (entry.trashDays || 7) * 86400000)
  if (now > deadline) {
    await db.versions.where('entryId').equals(entry.id!).delete()
    await db.entries.delete(entry.id!)
  }
}
```

Also delete from search index:
```ts
await db.searchIndex.where('entryId').equals(entry.id!).delete()
```

- [ ] **Step 5: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCategories.ts src/hooks/useSections.ts src/components/AppShell.tsx
git commit -m "fix: cascade delete versions and search index"
```

---

### Task 11: Include versions in export/import

**Files:**
- Modify: `src/utils/exportImport.ts`

- [ ] **Step 1: Read current export/import**

```bash
cat src/utils/exportImport.ts
```

- [ ] **Step 2: Add versions to export**

Find the export function and add versions:
```ts
const versions = await db.versions.toArray()
const data = { sections, categories, entries, versions }
// ...rest of export
```

- [ ] **Step 3: Add versions to import**

In the import function, after importing entries, add:
```ts
const versionMap = new Map<number, number>()
if (data.versions) {
  const versionRows = data.versions.map((v: any) => ({
    ...v,
    entryId: oldToNewEntry.get(v.entryId) || v.entryId,
  }))
  await db.versions.bulkAdd(versionRows)
}
```

Also trigger search index rebuild after import:
```ts
const { rebuildAllSearchIndexes } = await import('../utils/searchIndex')
await rebuildAllSearchIndexes(db)
```

- [ ] **Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: compiled successfully.

- [ ] **Step 5: Manual verification**

- Export data from the app
- Verify the JSON includes a `versions` array
- Import the data back
- Verify version history is preserved

- [ ] **Step 6: Commit**

```bash
git add src/utils/exportImport.ts
git commit -m "feat: include versions in export/import"
```
