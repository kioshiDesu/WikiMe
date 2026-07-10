# Storage & Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale WikiMe to handle thousands of entries with compressed storage, efficient pagination, and reduced memory churn.

**Architecture:** Add lz-string compression to entry/version content with transparent migration. Paginate category views via compound Dexie indexes instead of in-memory sorting. Debounce search index rebuilds. Fix VirtualList remeasurement.

**Tech Stack:** Dexie.js (IndexedDB), lz-string, React, TypeScript

## Global Constraints

- lz-string must be added as a dependency (`npm install lz-string`)
- DB migration from v5 to v6 adds `compressed: boolean` to Entry and EntryVersion interfaces
- Existing entries have `compressed === undefined` after migration (set to `false`); on read, decompress attempt failing means raw HTML → compress and write back
- All contentHtml writes go through compression; all reads go through conditional decompression
- Version pruning: max 5 versions per entry AND no versions older than 90 days
- Export v3: compressed blob with `version: 3`; import checks `data.version` for v2 vs v3
- Category pagination uses `[categoryId+updatedAt]` compound index with `.between()` bounds
- Search index rebuild debounced at 2s in auto-save
- VirtualList measurement `useEffect` depends only on `items.length`, not `scrollTop`

---

### Task 1: Add lz-string dependency and update DB schema

**Files:**
- Modify: `package.json`
- Modify: `src/db/db.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Entry` interface gains `compressed: boolean`, `EntryVersion` interface gains `compressed: boolean`, `WikiMeDB` v6 migration

- [ ] **Step 1: Install lz-string**

```bash
npm install lz-string
```

- [ ] **Step 2: Update interfaces with `compressed` field**

Edit `src/db/db.ts`:

```typescript
export interface Entry {
  id: number
  categoryId: number
  title: string
  contentHtml: string
  pinned: boolean
  deletedAt: Date | null
  trashDays: number
  compressed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EntryVersion {
  id: number
  entryId: number
  title: string
  contentHtml: string
  compressed: boolean
  savedAt: Date
}
```

- [ ] **Step 3: Add v6 migration**

Insert after the v5 upgrade block in the constructor:

```typescript
this.version(6).stores({
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

- [ ] **Step 4: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

Expected: `webpack 5.x.x compiled successfully`

---

### Task 2: Content compression utilities

**Files:**
- Create: `src/utils/compress.ts`

**Interfaces:**
- Produces: `compressHtml(html: string): string`, `decompressHtml(data: string): string`, `tryDecompress(data: string): string` (returns raw if not compressed)

- [ ] **Step 1: Create `src/utils/compress.ts`**

```typescript
import LZString from 'lz-string'

export function compressHtml(html: string): string {
  return LZString.compressToUTF16(html)
}

export function decompressHtml(compressed: string): string {
  return LZString.decompressFromUTF16(compressed) || ''
}

export function tryDecompress(data: string, wasCompressed: boolean): string {
  if (!wasCompressed) return data
  const result = LZString.decompressFromUTF16(data)
  return result || data
}
```

- [ ] **Step 2: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

Expected: compiles without errors

---

### Task 3: Compress entry content on write, decompress on read

**Files:**
- Modify: `src/hooks/useEntryMutations.ts`

**Interfaces:**
- Consumes: `compressHtml`, `tryDecompress` from `src/utils/compress.ts`
- Produces: All mutations transparently handle compression

- [ ] **Step 1: Update `addEntry` to compress contentHtml**

```typescript
import { compressHtml } from '../utils/compress'

const addEntry = useCallback(async (data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'trashDays' | 'compressed'>) => {
  const now = new Date()
  const compressed = compressHtml(data.contentHtml || '')
  const id = await db.entries.add({
    ...data,
    contentHtml: compressed,
    compressed: true,
    deletedAt: null,
    trashDays: DEFAULT_TRASH_DAYS,
    createdAt: now,
    updatedAt: now,
  } as Entry)
  await buildSearchIndex(id as number, data.title || '', data.contentHtml || '', db)
  return id
}, [])
```

- [ ] **Step 2: Update `updateEntry` to compress contentHtml and decompress after get**

```typescript
import { compressHtml, tryDecompress } from '../utils/compress'

const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  const updateData: Partial<Entry> = { ...data, updatedAt: new Date() }
  if (data.contentHtml !== undefined) {
    updateData.contentHtml = compressHtml(data.contentHtml)
    updateData.compressed = true
  }
  await db.entries.update(id, updateData)
  if (data.title !== undefined || data.contentHtml !== undefined) {
    const entry = await db.entries.get(id)
    if (entry) {
      entry.contentHtml = tryDecompress(entry.contentHtml, entry.compressed)
      await buildSearchIndex(id, entry.title, entry.contentHtml, db)
    }
  }
}, [])
```

- [ ] **Step 3: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

Expected: compiles without errors

---

### Task 4: Add lazy migration for existing entries on read

**Files:**
- Create: `src/hooks/useEntryReader.ts`
- Modify: `src/hooks/useEntriesList.ts`

**Interfaces:**
- Produces: `useEntryReader()` returning `readEntry(id): Promise<Entry | undefined>` that decompresses content on read and migrates old entries
- `useEntriesList` uses `readEntry` internally for entry access (though list view only needs title/pinned/updatedAt — content decompressed lazily by the view page)

Actually, the simpler approach: make `useEntriesList` return entries as-is (compressed), and decompress at the view/edit page level. The category list only shows title, pinned, updatedAt — no contentHtml needed.

Let me refine: Only `EntryViewPage` and `EntryEditPage` need decompressed content. They already call `db.entries.get(id)` directly or receive the entry from navigation. We'll handle decompression in those pages.

**Revised plan for this task:**

- Modify: `src/hooks/useEntryMutations.ts` (done in Task 3)
- Modify: `src/pages/EntryViewPage.tsx` — decompress contentHtml on load
- Modify: `src/pages/EntryEditPage.tsx` — decompress contentHtml on load, compress on save

- [ ] **Step 1: Update `EntryViewPage` to decompress entry content on load**

In `src/pages/EntryViewPage.tsx`, find where `entry.contentHtml` is used and wrap it:

```typescript
import { tryDecompress } from '../utils/compress'

// After fetching the entry:
const decompressedHtml = entry ? tryDecompress(entry.contentHtml, entry.compressed) : ''
```

Replace usage of `entry.contentHtml` with `decompressedHtml` in the rendered content.

- [ ] **Step 2: Update `EntryEditPage` to decompress on load, compress on save**

In `src/pages/EntryEditPage.tsx`:

```typescript
import { compressHtml, tryDecompress } from '../utils/compress'

// On initial load/setup:
const initialHtml = entry ? tryDecompress(entry.contentHtml, entry.compressed) : ''

// Before auto-save or manual save:
const compressedHtml = compressHtml(contentHtml)
```

Replace direct `contentHtml` references with the decompressed form for editing, and compress before persisting.

- [ ] **Step 3: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

---

### Task 5: Version storage compression + dual pruning

**Files:**
- Modify: `src/hooks/useVersions.ts`

**Interfaces:**
- Consumes: `compressHtml`, `tryDecompress` from `src/utils/compress.ts`
- Produces: Version content compressed; pruning by both count (5) and age (90 days)

- [ ] **Step 1: Update `saveVersion`**

```typescript
import { compressHtml, decompressHtml, tryDecompress } from '../utils/compress'

const saveVersion = useCallback(async (entryId: number, title: string, contentHtml: string) => {
  const all = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
  const normalizedInput = decompressHtml(compressHtml(contentHtml)) // normalize via compress/decompress round-trip
  if (all.length > 0) {
    const latest = all[all.length - 1]
    const latestContent = tryDecompress(latest.contentHtml, latest.compressed)
    if (latestContent === normalizedInput && norm(latest.title) === norm(title)) return
  }
  await db.versions.add({
    entryId,
    title: norm(title),
    contentHtml: compressHtml(contentHtml),
    compressed: true,
    savedAt: new Date(),
  })
  const updated = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const toDelete = updated.filter(v => {
    if (updated.length <= MAX_VERSIONS && (now - v.savedAt.getTime()) < MAX_AGE_MS) return false
    return updated.length > MAX_VERSIONS || (now - v.savedAt.getTime()) >= MAX_AGE_MS
  }).slice(0, Math.max(0, updated.length - MAX_VERSIONS))
  for (const v of toDelete) await db.versions.delete(v.id!)
}, [])
```

Wait, the pruning logic is getting tangled. Let me simplify:

```typescript
const saveVersion = useCallback(async (entryId: number, title: string, contentHtml: string) => {
  const all = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
  const normalizedInput = decompressHtml(compressHtml(contentHtml))
  if (all.length > 0) {
    const latest = all[all.length - 1]
    const latestContent = tryDecompress(latest.contentHtml, latest.compressed)
    if (latestContent === normalizedInput && norm(latest.title) === norm(title)) return
  }
  await db.versions.add({
    entryId,
    title: norm(title),
    contentHtml: compressHtml(contentHtml),
    compressed: true,
    savedAt: new Date(),
  })
  const updated = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - MAX_AGE_MS
  const keep: typeof updated = []
  for (const v of updated) {
    if (v.savedAt.getTime() >= cutoff) keep.push(v)
  }
  // Keep newest MAX_VERSIONS within the keep set
  const pruned = keep.slice(-MAX_VERSIONS)
  const toDeleteIds = updated.filter(v => !pruned.includes(v)).map(v => v.id!)
  for (const id of toDeleteIds) await db.versions.delete(id!)
}, [])
```

This keeps versions that are both within 90 days AND within the newest 5.

- [ ] **Step 2: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

---

### Task 6: Category view pagination via compound index

**Files:**
- Modify: `src/hooks/useEntriesList.ts`

**Interfaces:**
- Consumes: `db.entries` table with `[categoryId+updatedAt]` compound index
- Produces: Paginated loading for category-specific entry lists using Dexie index bounds

- [ ] **Step 1: Replace in-memory sort+slice with compound index pagination**

Current code for the category-specific branch:

```typescript
if (categoryId !== undefined && !Number.isNaN(categoryId)) {
  const all = await db.entries.where('categoryId').equals(categoryId).toArray()
  const sorted = all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  data = sorted.slice(start, start + pageSize)
}
```

Replace with:

```typescript
if (categoryId !== undefined && !Number.isNaN(categoryId)) {
  data = await db.entries
    .where('[categoryId+updatedAt]')
    .between([categoryId, new Date(0)], [categoryId, new Date(8640000000000000)])
    .reverse()
    .offset(start)
    .limit(pageSize)
    .toArray()
}
```

Note: `Date(8640000000000000)` is the max date. The `between` is inclusive from the earliest date to the latest, then reversed to get newest-first.

- [ ] **Step 2: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

---

### Task 7: Debounce search index rebuild in auto-save

**Files:**
- Modify: `src/pages/EntryEditPage.tsx`

**Interfaces:**
- Consumes: `buildSearchIndex` from `src/utils/searchIndex.ts`
- Produces: Search index rebuild debounced at 2s

- [ ] **Step 1: Add debounce ref and useEffect for search index**

In `src/pages/EntryEditPage.tsx`, find the auto-save logic. Add a debounced search index rebuild:

```typescript
const rebuildTimerRef = useRef<ReturnType<typeof setTimeout>>()

// Inside the auto-save effect, after saving:
if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current)
rebuildTimerRef.current = setTimeout(() => {
  if (entryId) {
    buildSearchIndex(entryId, title, contentHtml, db)
  }
}, 2000)

// Cleanup on unmount:
useEffect(() => {
  return () => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current)
  }
}, [])
```

- [ ] **Step 2: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

---

### Task 8: Export compression (v3)

**Files:**
- Modify: `src/utils/exportImport.ts`
- Consumes: `compressHtml` (reused), or use lz-string directly on the full JSON

**Interfaces:**
- Produces: Export v3 with compressed JSON blob; import handles v2 and v3

- [ ] **Step 1: Update export to compress**

```typescript
import LZString from 'lz-string'

export async function exportData() {
  const data = {
    version: 3,
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    sections: await db.sections.toArray(),
    versions: await db.versions.toArray(),
  }
  const json = JSON.stringify(data)
  const compressed = LZString.compressToUTF16(json)
  const blob = new Blob([compressed], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wikime-backup-${new Date().toISOString().split('T')[0]}.json`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
```

- [ ] **Step 2: Update import to handle v3 (compressed)**

```typescript
export async function importData(json: string) {
  let data: any
  // Try to decompress — if it's already JSON, JSON.parse will throw on first char
  try {
    const decompressed = LZString.decompressFromUTF16(json)
    if (decompressed) {
      data = JSON.parse(decompressed)
    } else {
      data = JSON.parse(json)
    }
  } catch {
    data = JSON.parse(json)
  }
  // ... rest of import logic ...
}
```

Actually, the cleanest approach: check `json` for leading `{`. If it starts with `{`, it's raw JSON (v2). Otherwise, it's compressed (v3).

```typescript
export async function importData(json: string) {
  let data: any
  if (json.trim().startsWith('{')) {
    data = JSON.parse(json)
  } else {
    const decompressed = LZString.decompressFromUTF16(json)
    if (!decompressed) throw new Error('Invalid compressed backup')
    data = JSON.parse(decompressed)
  }
  if (data.version > 3) throw new Error(`Unsupported backup version ${data.version}`)
  // ... rest unchanged ...
}
```

- [ ] **Step 3: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```

---

### Task 9: Fix VirtualList remeasurement

**Files:**
- Modify: `src/components/VirtualList.tsx`

**Interfaces:**
- Produces: VirtualList only remeasures when items change, not on every scroll

- [ ] **Step 1: Remove `scrollTop` from measurement effect deps**

Change:

```typescript
useEffect(() => {
  itemRefs.current.forEach((el, index) => {
    if (el) {
      setMeasuredHeights(prev => {
        const next = new Map(prev)
        next.set(index, el.offsetHeight)
        return next
      })
    }
  })
}, [items.length, scrollTop])
```

To:

```typescript
useEffect(() => {
  itemRefs.current.forEach((el, index) => {
    if (el) {
      setMeasuredHeights(prev => {
        const next = new Map(prev)
        next.set(index, el.offsetHeight)
        return next
      })
    }
  })
}, [items.length])
```

- [ ] **Step 2: Build to verify**

```bash
node node_modules/webpack-cli/bin/cli.js --mode production 2>&1 | tail -5
```
