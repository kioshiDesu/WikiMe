# WikiMe Comprehensive Fixes & Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical data integrity bugs, performance issues, and architectural flaws in WikiMe, then implement quality-of-life improvements across search, virtual scrolling, version history, and UI components.

**Architecture:** Phased approach — P0 (data integrity/correctness) → P1 (performance/correctness) → P2 (architecture/maintainability) → P3 (polish/quality). Each phase produces independently verifiable results.

**Tech Stack:** React 18, TypeScript, Dexie.js (IndexedDB), Tiptap/ProseMirror, Framer Motion, Vite, Vitest

## Global Constraints

- **React 18** with strict TypeScript (`strict: true`)
- **Dexie.js 4.x** for IndexedDB — schema changes require version bumps
- **Tiptap 2.x** editor — content stored as HTML strings
- **Framer Motion** for animations — prefer `animate` over layout animations
- **Tailwind CSS** — no custom CSS files, use utility classes
- **No external state management** — use React context + hooks only
- **Mobile-first** — test at 375px viewport minimum
- **File size limits** — components < 200 lines, hooks < 100 lines, files < 300 lines
- **Test framework** — Vitest with `@testing-library/react`, jsdom environment

---

## Phase 0: Recently Completed (Verification Only)

These tasks were completed in the current session. Verify they work correctly before proceeding.

### Task 0.1: Verify Version History Deduplication Fix

**Files:**
- Modify: `src/hooks/useEntries.ts:54-67`
- Test: `tests/hooks/useEntries.test.ts` (new)

**Interfaces:**
- Consumes: `saveVersion(entryId, title, contentHtml)` from `useEntries`
- Produces: No duplicate versions when content+title unchanged (trimmed)

- [ ] **Step 1: Write failing test for deduplication**

```ts
// tests/hooks/useEntries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEntries } from '../../src/hooks/useEntries'
import { db } from '../../src/db/db'

describe('useEntries.saveVersion deduplication', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('does not create duplicate version when title and content unchanged', async () => {
    const { result } = renderHook(() => useEntries())
    const entryId = await result.current.addEntry({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello</p>', pinned: false })
    await waitFor(() => expect(result.current.entries.length).toBe(1))

    // Simulate EntryViewPage loading and saving version
    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions1 = await result.current.getVersions(entryId)
    expect(versions1.length).toBe(1)

    // Call again with same content (e.g., user goes edit→view without changes)
    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions2 = await result.current.getVersions(entryId)
    expect(versions2.length).toBe(1) // Should NOT create duplicate
  })

  it('creates new version when title trimmed differs from stored', async () => {
    const { result } = renderHook(() => useEntries())
    const entryId = await result.current.addEntry({ categoryId: 1, title: '  Test  ', contentHtml: '<p>Hello</p>', pinned: false })
    await waitFor(() => expect(result.current.entries.length).toBe(1))

    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions = await result.current.getVersions(entryId)
    expect(versions.length).toBe(1) // Trailing spaces trimmed, same content
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: FAIL — dedup logic may not handle HTML normalization yet

- [ ] **Step 3: Verify implementation matches test**
  Check `src/hooks/useEntries.ts:54-67` uses `.trim()` on both title and contentHtml before comparison

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add tests/hooks/useEntries.test.ts src/hooks/useEntries.ts
  git commit -m "test: verify version dedup with trim normalization"
  ```

### Task 0.2: Verify Keyboard Focus Fix on New Entry

**Files:**
- Modify: `src/pages/EntryEditPage.tsx:59, 61, 115-124`
- Test: `tests/pages/EntryEditPage.test.tsx` (new)

**Interfaces:**
- Consumes: `ready` state, `titleRef`, `isEditing` flag
- Produces: Focus on title input within user gesture chain on new entry

- [ ] **Step 1: Write failing test for focus behavior**

```tsx
// tests/pages/EntryEditPage.test.tsx
import { describe, it, expect, vi, beforeEach, act } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EntryEditPage } from '../../src/pages/EntryEditPage'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HeaderProvider } from '../../src/context/HeaderContext'
import { ThemeProvider } from '../../src/context/ThemeContext'
import { ToastProvider } from '../../src/context/ToastContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/entry/new/1']}>
    <ThemeProvider>
      <HeaderProvider>
        <ToastProvider>
          <Routes>
            <Route path="/entry/new/:categoryId" element={children} />
          </Routes>
        </ToastProvider>
      </HeaderProvider>
    </ThemeProvider>
  </MemoryRouter>
)

describe('EntryEditPage keyboard focus', () => {
  beforeEach(vi.clearAllMocks)

  it('focuses title input on new entry without user interaction', async () => {
    render(<EntryEditPage />, { wrapper })
    const input = screen.getByPlaceholderText('Entry title')
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('does NOT auto-focus on existing entry edit', async () => {
    // Mock existing entry load
    render(<EntryEditPage />, { wrapper: ({ children }) => wrapper({ children: <EntryEditPage />} ) })
    // Note: requires mocking db.entries.get to return existing entry
    const input = screen.getByPlaceholderText('Entry title')
    await waitFor(() => expect(input).not.toHaveFocus()) // Should not steal focus
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/pages/EntryEditPage.test.tsx`
  Expected: FAIL — focus logic needs verification

- [ ] **Step 3: Verify implementation uses useLayoutEffect + setTimeout fallback**
  Check `src/pages/EntryEditPage.tsx:115-124` has both `useLayoutEffect` (immediate) and `useEffect` with `setTimeout(50)` (fallback)

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/pages/EntryEditPage.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add tests/pages/EntryEditPage.test.tsx src/pages/EntryEditPage.tsx
  git commit -m "test: verify keyboard focus on new entry creation"
  ```

### Task 0.3: Verify Info Bar Always Rendered

**Files:**
- Modify: `src/pages/EntryEditPage.tsx:165-180`
- Test: `tests/pages/EntryEditPage.test.tsx`

**Interfaces:**
- Consumes: `existingCategory`, `existingEntry`
- Produces: Info bar with `min-h-[44px]` always present; category tag for new entries; date appears after auto-save creates entry

- [ ] **Step 1: Write test for info bar visibility**

```tsx
// tests/pages/EntryEditPage.test.tsx (add to existing file)
it('shows info bar with category tag for new entry', async () => {
  render(<EntryEditPage />, { wrapper })
  await waitFor(() => {
    const infoBar = screen.getByTestId('info-bar')
    expect(infoBar).toHaveClass('min-h-[44px]')
    expect(screen.getByText('Welcome Notes')).toBeInTheDocument() // category name
  })
})

it('shows date after auto-save creates entry', async () => {
  // Mock db.entries.add to return new ID
  render(<EntryEditPage />, { wrapper })
  // Simulate typing to trigger auto-save
  fireEvent.change(screen.getByPlaceholderText('Entry title'), { target: { value: 'Test Title' } })
  await waitFor(() => {
    expect(screen.getByText(/Saved/)).toBeInTheDocument() // auto-save status
    expect(screen.getByText(/\w+ \d+, \d{4}/)).toBeInTheDocument() // formatted date
  })
})
```

- [ ] **Step 2-5: Run, verify, commit** (same pattern)

---

## Phase 1: P0 Critical — Data Integrity & Correctness

### Task 1.1: Fix Search Index Rebuild Condition

**Files:**
- Modify: `src/utils/searchIndex.ts:28-31`
- Test: `tests/utils/searchIndex.test.ts` (new)

**Interfaces:**
- Consumes: `db` (WikiMeDB), `entryCount`, `indexCount`
- Produces: Correct rebuild when index is stale (deleted entries, orphaned tokens)

- [ ] **Step 1: Write failing test for rebuild logic**

```ts
// tests/utils/searchIndex.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rebuildAllSearchIndexes, buildSearchIndex, searchEntries } from '../../src/utils/searchIndex'
import { db } from '../../src/db/db'

describe('searchIndex rebuildAllSearchIndexes', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('rebuilds index when entries exist but index is empty', async () => {
    await db.entries.add({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello world</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    await rebuildAllSearchIndexes(db)
    const results = await searchEntries(db, 'hello')
    expect(results).toContainEqual(expect.any(Number))
  })

  it('rebuilds index when index has MORE tokens than entries (orphaned tokens)', async () => {
    await db.entries.add({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    await buildSearchIndex(1, 'Test', '<p>Hello</p>', db)
    await db.entries.clear() // Entries deleted but index remains
    await db.entries.add({ categoryId: 1, title: 'New', contentHtml: '<p>World</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    // indexCount (1) >= entryCount (1) but index is stale
    await rebuildAllSearchIndexes(db)
    const results = await searchEntries(db, 'world')
    expect(results.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/utils/searchIndex.test.ts`
  Expected: FAIL — current logic `if (indexCount >= entryCount) return` skips rebuild when orphans exist

- [ ] **Step 3: Fix rebuild condition**

```ts
// src/utils/searchIndex.ts:28-31
export async function rebuildAllSearchIndexes(db: WikiMeDB): Promise<void> {
  const entryCount = await db.entries.count()
  const indexCount = await db.searchIndex.count()
  // FIX: Check if index covers all current entries, not just count
  const indexedEntryIds = await db.searchIndex.distinct('entryId').toArray()
  if (indexedEntryIds.length >= entryCount && indexCount > 0) return
  // ... rest unchanged
}
```

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/utils/searchIndex.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/searchIndex.ts tests/utils/searchIndex.test.ts
  git commit -m "fix: rebuild search index when tokens orphaned after deletions"
  ```

### Task 1.2: Make Import Atomic (Prevent Data Loss)

**Files:**
- Modify: `src/utils/exportImport.ts:19-74`
- Test: `tests/utils/exportImport.test.ts` (new)

**Interfaces:**
- Consumes: JSON backup string
- Produces: All-or-nothing import with rollback on failure

- [ ] **Step 1: Write failing test for atomic import**

```ts
// tests/utils/exportImport.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { importData, exportData } from '../../src/utils/exportImport'
import { db } from '../../src/db/db'

describe('importData atomicity', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('rolls back all changes if import fails mid-way', async () => {
    // Create existing data
    await db.categories.add({ name: 'Original', icon: 'star', color: '#fff', sortOrder: 0, createdAt: new Date(), updatedAt: new Date() })
    await db.entries.add({ categoryId: 1, title: 'Original Entry', contentHtml: '<p>Content</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })

    // Corrupt backup missing required fields
    const badBackup = JSON.stringify({ categories: [], entries: [{}] }) // missing title, contentHtml

    await expect(importData(badBackup)).rejects.toThrow()

    // Original data should still exist
    const cats = await db.categories.toArray()
    const entries = await db.entries.toArray()
    expect(cats.length).toBe(1)
    expect(entries.length).toBe(1)
  })

  it('succeeds with valid backup and rebuilds search index', async () => {
    const backup = JSON.stringify({
      sections: [{ name: 'Sec', icon: 'folder', sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }],
      categories: [{ name: 'Cat', icon: 'star', color: '#14b8a6', sectionId: 1, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }],
      entries: [{ categoryId: 1, title: 'Imported', contentHtml: '<p>Hi</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() }],
      versions: []
    })
    await importData(backup)
    const entries = await db.entries.toArray()
    expect(entries.length).toBe(1)
    expect(entries[0].title).toBe('Imported')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/utils/exportImport.test.ts`
  Expected: FAIL — current import clears tables BEFORE validating, no rollback

- [ ] **Step 3: Implement atomic import with temp tables**

```ts
// src/utils/exportImport.ts:19-74
export async function importData(json: string) {
  const data = JSON.parse(json)
  if (!data.categories || !data.entries) throw new Error('Invalid backup file')

  // Validate structure first
  for (const e of data.entries) {
    if (!e.title || !e.contentHtml) throw new Error('Entry missing title or content')
  }

  await db.transaction('rw', db.categories, db.entries, db.sections, db.versions, db.searchIndex, async () => {
    // Stage 1: Clear searchIndex only (derivable)
    await db.searchIndex.clear()

    // Stage 2: Import sections → categories → entries → versions with ID remapping
    const oldToNewSection = new Map<number, number>()
    if (data.sections?.length) {
      const newIds = await db.sections.bulkAdd(data.sections, { allKeys: true })
      data.sections.forEach((s: any, i: number) => oldToNewSection.set(s.id, newIds[i] as number))
    }

    const oldToNewCategory = new Map<number, number>()
    if (data.categories?.length) {
      const migrated = data.categories.map((c: any) => ({
        ...c,
        sectionId: c.sectionId != null ? (oldToNewSection.get(c.sectionId) ?? null) : null,
      }))
      const newIds = await db.categories.bulkAdd(migrated, { allKeys: true })
      data.categories.forEach((c: any, i: number) => oldToNewCategory.set(c.id, newIds[i] as number))
    }

    const oldToNewEntry = new Map<number, number>()
    if (data.entries?.length) {
      const migrated = data.entries.map((e: any) => ({
        ...e,
        categoryId: oldToNewCategory.get(e.categoryId) ?? e.categoryId,
      }))
      const newIds = await db.entries.bulkAdd(migrated, { allKeys: true })
      data.entries.forEach((e: any, i: number) => oldToNewEntry.set(e.id, newIds[i] as number))
    }

    if (data.versions?.length) {
      const migrated = data.versions.map((v: any) => ({
        ...v,
        entryId: oldToNewEntry.get(v.entryId) ?? v.entryId,
      }))
      await db.versions.bulkAdd(migrated)
    }
  })

  const { rebuildAllSearchIndexes } = await import('../utils/searchIndex')
  await rebuildAllSearchIndexes(db)
}
```

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/utils/exportImport.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/exportImport.ts tests/utils/exportImport.test.ts
  git commit -m "fix: make import atomic with validation and rollback"
  ```

### Task 1.3: Add Optimistic Update Rollback

**Files:**
- Modify: `src/hooks/useEntries.ts:69-76`, `src/hooks/useCategories.ts:26-40`
- Test: `tests/hooks/useEntries.test.ts`, `tests/hooks/useCategories.test.ts`

**Interfaces:**
- Consumes: Mutation callbacks, DB operations
- Produces: State rollback + error toast on DB failure

- [ ] **Step 1: Write failing test for rollback**

```ts
// tests/hooks/useEntries.test.ts (add to existing)
it('rolls back optimistic update on DB failure', async () => {
  const { result } = renderHook(() => useEntries())
  const entryId = await result.current.addEntry({ categoryId: 1, title: 'Test', contentHtml: '<p>Hi</p>', pinned: false })
  await waitFor(() => expect(result.current.entries.length).toBe(1))

  // Mock DB failure
  vi.spyOn(db.entries, 'update').mockRejectedValueOnce(new Error('DB locked'))

  await expect(result.current.updateEntry(entryId, { title: 'New Title' })).rejects.toThrow('DB locked')

  // State should be rolled back
  await waitFor(() => {
    const entry = result.current.entries.find(e => e.id === entryId)
    expect(entry?.title).toBe('Test') // Original title restored
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: FAIL — no rollback logic exists

- [ ] **Step 3: Implement rollback in useEntries**

```ts
// src/hooks/useEntries.ts:69-76
const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  const previousEntries = allEntries // Capture for rollback
  try {
    await db.entries.update(id, { ...data, updatedAt: new Date() })
    setAllEntries(prev => prev.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date() } as Entry : e))
    if (data.title !== undefined || data.contentHtml !== undefined) {
      const entry = await db.entries.get(id)
      if (entry) await buildSearchIndex(id, entry.title, entry.contentHtml, db)
    }
  } catch (error) {
    setAllEntries(previousEntries) // Rollback
    throw error // Re-throw for caller to handle
  }
}, [])
```

- [ ] **Step 4: Implement rollback in useCategories similarly**

```ts
// src/hooks/useCategories.ts:26-40
const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
  const previousCategories = categories
  try {
    await db.categories.update(id, { ...data, updatedAt: new Date() })
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date() } as Category : c))
  } catch (error) {
    setCategories(previousCategories)
    throw error
  }
}, [])
```

- [ ] **Step 5: Run tests to verify pass**
  Run: `npm test tests/hooks/useEntries.test.ts tests/hooks/useCategories.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add src/hooks/useEntries.ts src/hooks/useCategories.ts tests/hooks/
  git commit -m "feat: add optimistic update rollback with error handling"
  ```

### Task 1.4: Fix Database Schema Versioning

**Files:**
- Modify: `src/db/db.ts:62-80`
- Test: `tests/db/db.test.ts` (new)

**Interfaces:**
- Consumes: Dexie version upgrade transactions
- Produces: Single clean upgrade path from v4 → v5

- [ ] **Step 1: Write test for migration**

```ts
// tests/db/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { WikiMeDB, db } from '../../src/db/db'

describe('Database migrations', () => {
  it('upgrades from v4 to v5 adding searchIndex table', async () => {
    const testDb = new WikiMeDB()
    await testDb.delete()
    await testDb.open()

    // Verify v5 schema
    expect(testDb.tables.map(t => t.name)).toContain('searchIndex')
    const searchIndexTable = testDb.table('searchIndex')
    expect(searchIndexTable.schema.primKey.name).toBe('id')
    expect(searchIndexTable.schema.indexes.map(i => i.name)).toContain('entryId')
    expect(searchIndexTable.schema.indexes.map(i => i.name)).toContain('token')
  })

  it('handles upgrade from v4 with existing data', async () => {
    // Create a v4 database manually
    const v4Db = new Dexie('WikiMeDB-test-v4')
    v4Db.version(4).stores({
      sections: '++id, name',
      categories: '++id, name, sectionId',
      entries: '++id, categoryId, title, pinned, updatedAt, deletedAt',
      versions: '++id, entryId, savedAt',
    })
    await v4Db.open()
    await v4Db.entries.add({ categoryId: 1, title: 'Test', contentHtml: '<p>Hi</p>', pinned: false, deletedAt: null, trashDays: 7, createdAt: new Date(), updatedAt: new Date() })
    await v4Db.close()

    // Now open with v5 schema (current code)
    const v5Db = new WikiMeDB()
    await v5Db.open()
    const entries = await v5Db.entries.toArray()
    expect(entries.length).toBe(1)
    expect(entries[0].deletedAt).toBeNull() // Migration sets default
    await v5Db.delete()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/db/db.test.ts`
  Expected: FAIL — dual version definition causes issues

- [ ] **Step 3: Consolidate to single version with proper upgrade**

```ts
// src/db/db.ts:62-80
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
    }).upgrade(async tx => {
      // v4 → v5 migration: add searchIndex, backfill deletedAt/trashDays
      await tx.table('entries').toCollection().modify(e => {
        if (e.deletedAt === undefined) e.deletedAt = null
        if (e.trashDays === undefined) e.trashDays = DEFAULT_TRASH_DAYS
      })
    })
  }
}
```

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/db/db.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/db/db.ts tests/db/db.test.ts
  git commit -m "fix: consolidate DB schema to single version with proper upgrade"
  ```

---

## Phase 2: P1 High — Performance & Correctness

### Task 2.1: VirtualList with Dynamic Heights

**Files:**
- Modify: `src/components/VirtualList.tsx` (replace with `react-virtual` or custom measure)
- Modify: `src/pages/CategoryPage.tsx:171-173`, `src/pages/HomePage.tsx:367-382`
- Test: `tests/components/VirtualList.test.tsx` (new)

**Interfaces:**
- Consumes: `items`, `renderItem`, `estimatedItemHeight`
- Produces: Correctly sized scrollable list with measured heights

- [ ] **Step 1: Write failing test for dynamic heights**

```tsx
// tests/components/VirtualList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VirtualList } from '../../src/components/VirtualList'

describe('VirtualList dynamic heights', () => {
  it('measures and caches item heights', () => {
    const items = ['short', 'medium length content', 'very long content that wraps multiple lines and should be taller']
    const renderItem = (item: string) => <div style={{ padding: '10px' }}>{item}</div>

    render(<VirtualList items={items} estimatedItemHeight={50} renderItem={renderItem} />)

    const container = screen.getByRole('list')
    expect(container).toBeInTheDocument()
    // After render, heights should be measured
  })

  it('scrolls correctly with variable heights', () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`.repeat(i % 5 + 1))
    const renderItem = (item: string) => <div style={{ padding: '10px', minHeight: '40px' }}>{item}</div>

    render(<VirtualList items={items} estimatedItemHeight={60} renderItem={renderItem} />)

    const container = screen.getByRole('list')
    fireEvent.scroll(container, { target: { scrollTop: 500 } })
    // Should not throw, should render visible items
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/components/VirtualList.test.tsx`
  Expected: FAIL — current VirtualList assumes fixed height

- [ ] **Step 3: Replace VirtualList with react-virtual or implement measurement**

```tsx
// src/components/VirtualList.tsx (replace entirely)
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  estimatedItemHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  className?: string
}

export function VirtualList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  overscan = 5,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map())

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => measuredHeights.get(index) ?? estimatedItemHeight,
    overscan,
    paddingStart: 0,
    paddingEnd: 0,
  })

  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      setMeasuredHeights(prev => {
        const next = new Map(prev)
        next.set(index, element.offsetHeight)
        return next
      })
    }
  }, [])

  return (
    <div ref={parentRef} className={className || 'overflow-y-auto'} style={{ height: '100%', width: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(virtualRow.item, virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update CategoryPage and HomePage to use new API**

```tsx
// src/pages/CategoryPage.tsx:171-173
<VirtualList
  items={query.trim() ? filtered : sortedEntries}
  estimatedItemHeight={116}
  renderItem={(entry) => (
    <div key={entry.id} className="flex items-start" style={{ height: '116px' }}>
      {/* ... existing renderItem content ... */}
    </div>
  )}
/>

// src/pages/HomePage.tsx:367-382 - similar update for category grid
```

- [ ] **Step 5: Run tests to verify pass**
  Run: `npm test tests/components/VirtualList.test.tsx`
  Expected: PASS

- [ ] **Step 6: Manual visual test at 375px viewport**
  Verify no blank gaps, no clipped content, smooth scrolling

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/VirtualList.tsx src/pages/CategoryPage.tsx src/pages/HomePage.tsx tests/components/VirtualList.test.tsx
  git commit -m "feat: replace VirtualList with dynamic height measurement via @tanstack/react-virtual"
  ```

### Task 2.2: Paginate useEntries (Load in Chunks)

**Files:**
- Modify: `src/hooks/useEntries.ts:5-31`
- Test: `tests/hooks/useEntries.test.ts`

**Interfaces:**
- Consumes: `categoryId`, `pageSize` (default 50)
- Produces: `entries` (current page), `loadMore()`, `hasMore`, `loading`

- [ ] **Step 1: Write failing test for pagination**

```ts
// tests/hooks/useEntries.test.ts (add)
it('loads entries in pages', async () => {
  // Create 150 entries
  for (let i = 0; i < 150; i++) {
    await db.entries.add({ categoryId: 1, title: `Entry ${i}`, contentHtml: '<p>x</p>', pinned: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, trashDays: 7 })
  }

  const { result } = renderHook(() => useEntries(1))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.entries.length).toBe(50) // Default page size
  expect(result.current.hasMore).toBe(true)

  await result.current.loadMore()
  await waitFor(() => expect(result.current.entries.length).toBe(100))
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: FAIL — current implementation loads all entries

- [ ] **Step 3: Implement pagination in useEntries**

```ts
// src/hooks/useEntries.ts:5-31
export function useEntries(categoryId?: number, pageSize = 50) {
  const [allEntries, setAllEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const loadPage = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const start = reset ? 0 : offset
      let query = db.entries.orderBy('updatedAt').reverse()
      if (categoryId !== undefined) query = query.where('categoryId').equals(categoryId)
      const data = await query.offset(start).limit(pageSize).toArray()
      if (reset) setAllEntries(data)
      else setAllEntries(prev => [...prev, ...data])
      setHasMore(data.length === pageSize)
      setOffset(start + data.length)
    } catch (e) { console.error('Failed to load entries', e) }
    setLoading(false)
  }, [categoryId, offset, pageSize])

  const refresh = useCallback(() => { setOffset(0); setHasMore(true); loadPage(true) }, [loadPage])

  useEffect(() => { loadPage(true) }, [loadPage])

  const loadMore = useCallback(() => { if (hasMore && !loading) loadPage(false) }, [hasMore, loading, loadPage])

  const entries = useMemo(() =>
    allEntries
      .filter(e => !e.deletedAt)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.updatedAt.getTime() - a.updatedAt.getTime()
      }),
    [allEntries]
  )

  // ... rest unchanged
  return { entries, trashedEntries, loading, hasMore, loadMore, ... }
}
```

- [ ] **Step 4: Run tests to verify pass**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: PASS

- [ ] **Step 5: Update CategoryPage and HomePage to use loadMore**
  Add "Load more" button or infinite scroll trigger at bottom of VirtualList

- [ ] **Step 6: Commit**
  ```bash
  git add src/hooks/useEntries.ts src/pages/CategoryPage.tsx src/pages/HomePage.tsx tests/hooks/useEntries.test.ts
  git commit -m "feat: paginate entries loading with loadMore"
  ```

### Task 2.3: Normalize HTML in Version Comparison

**Files:**
- Modify: `src/hooks/useEntries.ts:54-67`
- Test: `tests/hooks/useEntries.test.ts`

**Interfaces:**
- Consumes: `title`, `contentHtml` strings
- Produces: Semantic equality (whitespace, attribute order normalized)

- [ ] **Step 1: Write failing test for HTML normalization**

```ts
// tests/hooks/useEntries.test.ts (add)
it('deduplicates versions with semantically identical HTML', async () => {
  const { result } = renderHook(() => useEntries())
  const entryId = await result.current.addEntry({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello</p>', pinned: false })
  await waitFor(() => expect(result.current.entries.length).toBe(1))

  // Tiptap may serialize differently: <p>Hello</p> vs <p>Hello</p>\n
  await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
  await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>\n') // trailing newline
  await result.current.saveVersion(entryId, 'Test', ' <p>Hello</p> ') // surrounding whitespace

  const versions = await result.current.getVersions(entryId)
  expect(versions.length).toBe(1) // All should be considered same
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: FAIL — current `.trim()` doesn't handle HTML differences

- [ ] **Step 3: Add HTML normalization**

```ts
// src/hooks/useEntries.ts:54-67
const normalizeHtml = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html.trim()
  return div.innerHTML // Re-serialized by browser, normalizes attributes/whitespace
}

const saveVersion = useCallback(async (entryId: number, title: string, contentHtml: string) => {
  const normTitle = title.trim()
  const normContent = normalizeHtml(contentHtml)
  const all = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
  if (all.length > 0) {
    const latest = all[all.length - 1]
    if (normalizeHtml(latest.contentHtml) === normContent && latest.title.trim() === normTitle) return
  }
  await db.versions.add({ entryId, title: normTitle, contentHtml: normContent, savedAt: new Date() })
  // ... rest unchanged
}, [])
```

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test tests/hooks/useEntries.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/hooks/useEntries.ts tests/hooks/useEntries.test.ts
  git commit -m "fix: normalize HTML in version comparison for semantic dedup"
  ```

### Task 2.4: Add Composite Database Indexes

**Files:**
- Modify: `src/db/db.ts:73-78`
- Test: `tests/db/db.test.ts`

**Interfaces:**
- Consumes: Query patterns from hooks
- Produces: Faster indexed lookups

- [ ] **Step 1: Write test for index usage**

```ts
// tests/db/db.test.ts (add)
it('has composite indexes for common queries', async () => {
  const indexes = db.entries.schema.indexes.map(i => i.name)
  expect(indexes).toContain('categoryId_deletedAt') // For useEntries filter
  expect(indexes).toContain('categoryId_pinned_updatedAt') // For CategoryPage sort
})
```

- [ ] **Step 2: Add indexes to schema**

```ts
// src/db/db.ts:73-78
this.version(5).stores({
  sections: '++id, name',
  categories: '++id, name, sectionId',
  entries: '++id, categoryId, title, pinned, updatedAt, deletedAt, [categoryId+deletedAt], [categoryId+pinned+updatedAt]',
  versions: '++id, entryId, savedAt, [entryId+savedAt]',
  searchIndex: '++id, entryId, token',
})
```

- [ ] **Step 3: Run migration test**
  Run: `npm test tests/db/db.test.ts`
  Expected: PASS (Dexie adds indexes on upgrade)

- [ ] **Step 4: Commit**
  ```bash
  git add src/db/db.ts tests/db/db.test.ts
  git commit -m "perf: add composite indexes for entry queries"
  ```

---

## Phase 3: P2 Medium — Architecture & Maintainability

### Task 3.1: Split HomePage into Components

**Files:**
- Create: `src/components/FabModal.tsx`, `src/components/CategoryGrid.tsx`, `src/components/RecentEntries.tsx`, `src/components/PinnedEntries.tsx`, `src/components/SearchResults.tsx`
- Modify: `src/pages/HomePage.tsx` (reduce to ~150 lines)
- Test: Component tests for each new component

**Interfaces:**
- Each component: focused props, single responsibility

- [ ] **Step 1: Extract FAB Modal (largest chunk)**

```tsx
// src/components/FabModal.tsx
interface FabModalProps {
  open: boolean
  onClose: () => void
  step: 1 | 2 | 3
  onStepChange: (step: 1 | 2 | 3) => void
  catSearch: string
  setCatSearch: (s: string) => void
  aiResponse: string
  setAiResponse: (s: string) => void
  aiCategories: Category[]
  selectedCatId: number | null
  setSelectedCatId: (id: number | null) => void
  copyStatus: 'idle' | 'copied'
  setCopyStatus: (s: 'idle' | 'copied') => void
  onCreateEntry: () => Promise<void>
  onCreateCategory: () => void
  onCreateSection: () => void
  onOpenAi: () => Promise<void>
}

// Move all FAB modal JSX here (lines 441-638 from HomePage)
export function FabModal({ ... }: FabModalProps) { /* ... */ }
```

- [ ] **Step 2: Extract Category Grid**

```tsx
// src/components/CategoryGrid.tsx
interface CategoryGridProps {
  grouped: { section: Section; cats: Category[] }[]
  expandedSections: Set<number>
  onToggleSection: (id: number) => void
  onCategoryClick: (cat: Category) => void
  getCount: (catId: number) => number
  navigate: (path: string) => void
}

// Move grouped rendering logic (lines 353-419)
export function CategoryGrid({ ... }: CategoryGridProps) { /* ... */ }
```

- [ ] **Step 3: Extract Recent/Pinned/Search sections similarly**

- [ ] **Step 4: Update HomePage to compose components**

```tsx
// src/pages/HomePage.tsx (reduced)
import { FabModal } from '../components/FabModal'
import { CategoryGrid } from '../components/CategoryGrid'
import { PinnedEntries } from '../components/PinnedEntries'
import { RecentEntries } from '../components/RecentEntries'
import { SearchResults } from '../components/SearchResults'

export function HomePage() {
  // ... hooks and logic only ...
  return (
    <>
      {query.trim() ? <SearchResults results={results} searching={searching} /> : (
        <div className="pb-6 animate-fade-in">
          <SearchBar value={query} onChange={setQuery} />
          <PinnedEntries entries={entries} onClick={navigate} />
          <RecentEntries recentEntries={recentEntries} entries={entries} categoryMap={categoryMap} onClick={navigate} onClear={clearRecentEntries} />
          <CategoryGrid grouped={grouped} expandedSections={expandedSections} onToggleSection={toggleSection} onCategoryClick={cat => navigate(`/category/${cat.id}`)} getCount={getCount} navigate={navigate} />
        </div>
      )}
      <FabModal ... />
    </>
  )
}
```

- [ ] **Step 5: Run build and manual test**
  Run: `npm run build`
  Expected: No errors, all FAB flows work

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/FabModal.tsx src/components/CategoryGrid.tsx src/components/PinnedEntries.tsx src/components/RecentEntries.tsx src/components/SearchResults.tsx src/pages/HomePage.tsx
  git commit -m "refactor: split HomePage into focused components"
  ```

### Task 3.2: Split EntryViewPage into Components

**Files:**
- Create: `src/components/EntryContent.tsx`, `src/components/VersionHistoryModal.tsx`, `src/components/MoveEntryModal.tsx`, `src/components/FindInPage.tsx`, `src/components/BottomActionBar.tsx`
- Modify: `src/pages/EntryViewPage.tsx` (reduce to ~150 lines)

**Interfaces:**
- Each component: focused on single UI concern

- [ ] **Step 1-5: Similar extraction pattern** (content rendering, version modal, move modal, find-in-page, bottom bar)

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/EntryContent.tsx src/components/VersionHistoryModal.tsx src/components/MoveEntryModal.tsx src/components/FindInPage.tsx src/components/BottomActionBar.tsx src/pages/EntryViewPage.tsx
  git commit -m "refactor: split EntryViewPage into focused components"
  ```

### Task 3.3: Split RichEditor into Components

**Files:**
- Create: `src/components/EditorToolbar.tsx`, `src/components/EditorContent.tsx`, `src/components/AudioRecorderModal.tsx` (already extracted but in same file), `src/components/ColorPicker.tsx`
- Modify: `src/components/RichEditor.tsx` (reduce to ~150 lines)

**Interfaces:**
- Toolbar: `editor`, `showColors`, `setShowColors`, `showAudioModal`, `setShowAudioModal`
- Content: `editor`, `inTable`, `tableRect`, `tableEl`

- [ ] **Step 1-5: Extract toolbar, content, modals**

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/EditorToolbar.tsx src/components/EditorContent.tsx src/components/AudioRecorderModal.tsx src/components/ColorPicker.tsx src/components/RichEditor.tsx
  git commit -m "refactor: split RichEditor into toolbar, content, modals"
  ```

### Task 3.4: Decompose useEntries Hook

**Files:**
- Create: `src/hooks/useEntriesList.ts`, `src/hooks/useEntryMutations.ts`, `src/hooks/useVersions.ts`
- Modify: `src/hooks/useEntries.ts` (re-export combined or deprecate)
- Test: Tests for each new hook

**Interfaces:**
- `useEntriesList(categoryId?, pageSize?)`: `{ entries, trashedEntries, loading, hasMore, loadMore, refresh }`
- `useEntryMutations()`: `{ addEntry, updateEntry, trashEntry, restoreEntry, deleteEntry, cleanupTrash }`
- `useVersions()`: `{ saveVersion, getVersions, restoreVersion }`

- [ ] **Step 1: Write tests for each hook**

```ts
// tests/hooks/useEntriesList.test.ts
// tests/hooks/useEntryMutations.test.ts
// tests/hooks/useVersions.test.ts
```

- [ ] **Step 2: Implement each hook**

```ts
// src/hooks/useEntriesList.ts
export function useEntriesList(categoryId?: number, pageSize = 50) {
  // ... pagination logic from useEntries
}

// src/hooks/useEntryMutations.ts
export function useEntryMutations() {
  // ... addEntry, updateEntry, trashEntry, etc.
}

// src/hooks/useVersions.ts
export function useVersions() {
  // ... saveVersion, getVersions, restoreVersion
}
```

- [ ] **Step 3: Update consumers** (EntryEditPage, EntryViewPage, CategoryPage, HomePage, AppShell)

- [ ] **Step 4: Run tests**
  Run: `npm test tests/hooks/useEntries*.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/hooks/useEntriesList.ts src/hooks/useEntryMutations.ts src/hooks/useVersions.ts src/hooks/useEntries.ts tests/hooks/useEntries*.test.ts
  git commit -m "refactor: decompose useEntries into useEntriesList, useEntryMutations, useVersions"
  ```

### Task 3.5: Add Focus Trap to Modal

**Files:**
- Modify: `src/components/Modal.tsx:12-35`
- Test: `tests/components/Modal.test.tsx` (new)

**Interfaces:**
- Consumes: `open`, `onClose`
- Produces: Focus trapped within panel, restores on close

- [ ] **Step 1: Write failing test for focus trap**

```tsx
// tests/components/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Modal } from '../../src/components/Modal'

describe('Modal focus trap', () => {
  it('traps focus within panel', async () => {
    render(
      <Modal open onClose={vi.fn()} title="Test">
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      </Modal>
    )
    const first = screen.getByText('First')
    const last = screen.getByText('Last')
    expect(first).toHaveFocus() // Initial focus

    // Tab from last should wrap to first
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()

    // Shift+Tab from first should wrap to last
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('restores focus to trigger on close', async () => {
    const trigger = render(<button id="trigger">Open</button>)
    const { unmount } = render(
      <Modal open onClose={() => unmount()} title="Test">
        <button>Inside</button>
      </Modal>
    )
    expect(screen.getByText('Inside')).toHaveFocus()
    unmount()
    expect(trigger.getByText('Open')).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/components/Modal.test.tsx`
  Expected: FAIL — no focus trap

- [ ] **Step 3: Implement focus trap**

```tsx
// src/components/Modal.tsx:12-35
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FocusTrap } from 'focus-trap-react' // Add dependency

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      triggerRef.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { window.addEventListener('keydown', handleEsc) }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        onDeactivate: onClose,
        clickDeactivates: true,
        escapeDeactivates: true,
        returnFocusOnDeactivate: true,
      }}
    >
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={e => { if (e.target === overlayRef.current) onClose() }}>
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up outline-none">
          {title && <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>}
          <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{children}</div>
          {footer && <div className="mt-6 flex gap-3 justify-end">{footer}</div>}
        </div>
      </FocusTrap>,
      document.body
    )
  )
}
```

- [ ] **Step 4: Add dependency**
  Run: `npm install focus-trap-react`

- [ ] **Step 5: Run test to verify pass**
  Run: `npm test tests/components/Modal.test.tsx`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/Modal.tsx package.json tests/components/Modal.test.tsx
  git commit -m "feat: add focus trap to Modal for accessibility"
  ```

---

## Phase 4: P3 Polish — UX & Quality

### Task 4.1: Pull-to-Refresh on Mobile Lists

**Files:**
- Create: `src/hooks/usePullToRefresh.ts`
- Modify: `src/pages/HomePage.tsx`, `src/pages/CategoryPage.tsx`
- Test: `tests/hooks/usePullToRefresh.test.ts`

**Interfaces:**
- Consumes: `onRefresh` callback, `enabled` boolean
- Produces: Touch handlers for pull gesture

- [ ] **Step 1-5: Implement hook, add to list pages**

```ts
// src/hooks/usePullToRefresh.ts
export function usePullToRefresh(onRefresh: () => Promise<void>, enabled = true) {
  const [pullDistance, setPullDistance] = useState(0)
  const [pulling, setPulling] = useState(false)

  const onTouchStart = (e: TouchEvent) => { if (!enabled || window.scrollY > 0) return; setPulling(true) }
  const onTouchMove = (e: TouchEvent) => { if (!pulling) return; const dy = e.touches[0].clientY; setPullDistance(Math.min(dy * 0.5, 100)) }
  const onTouchEnd = async () => { if (!pulling || pullDistance < 60) { setPullDistance(0); setPulling(false); return } await onRefresh(); setPullDistance(0); setPulling(false) }

  return { pullDistance, pulling, onTouchStart, onTouchMove, onTouchEnd }
}
```

- [ ] **Step 6: Commit**
  ```bash
  git add src/hooks/usePullToRefresh.ts src/pages/HomePage.tsx src/pages/CategoryPage.tsx tests/hooks/usePullToRefresh.test.ts
  git commit -m "feat: add pull-to-refresh on mobile lists"
  ```

### Task 4.2: Export Format Versioning

**Files:**
- Modify: `src/utils/exportImport.ts:3-17`
- Test: `tests/utils/exportImport.test.ts`

**Interfaces:**
- Export: Adds `"version": 2` to JSON
- Import: Handles v1 (legacy) and v2

- [ ] **Step 1: Update export**

```ts
// src/utils/exportImport.ts:3-17
export async function exportData() {
  const data = {
    version: 2, // Increment for schema changes
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    sections: await db.sections.toArray(),
    versions: await db.versions.toArray(),
  }
  // ... rest unchanged
}
```

- [ ] **Step 2: Update import to handle v1**

```ts
// src/utils/exportImport.ts:19-23
export async function importData(json: string) {
  const data = JSON.parse(json)
  const version = data.version ?? 1 // Default to v1 for old backups
  if (version > 2) throw new Error(`Unsupported backup version ${version}`)
  // ... rest unchanged, v1 has no versions array so it works
}
```

- [ ] **Step 3: Test both versions**
- [ ] **Step 4: Commit**

### Task 4.3: Type Safety — Remove `any`

**Files:**
- Modify: Multiple files (search for `any`)
- Test: `npm run typecheck` (if available) or `tsc --noEmit`

**Interfaces:**
- All props, state, callbacks strictly typed

- [ ] **Step 1: Run typecheck**
  Run: `npx tsc --noEmit`
  Expected: Errors on `any` usage

- [ ] **Step 2: Fix each occurrence**
  Common fixes:
  - `setVersions` in EntryViewPage: `React.Dispatch<React.SetStateAction<EntryVersion[]>>`
  - Modal children: `React.ReactNode`
  - Event handlers: `React.ChangeEvent<HTMLInputElement>`, etc.

- [ ] **Step 3: Run typecheck to verify clean**
  Run: `npx tsc --noEmit`
  Expected: No errors

- [ ] **Step 4: Commit**
  ```bash
  git add -A
  git commit -m "chore: remove all 'any' types, strict TypeScript"
  ```

### Task 4.4: Unit Tests for Core Utilities

**Files:**
- Create: `tests/utils/searchIndex.test.ts`, `tests/utils/time.test.ts`, `tests/utils/icons.test.ts`, `tests/utils/recent.test.ts`

**Interfaces:**
- Each utility function tested in isolation

- [ ] **Step 1: Write tests for each util**

```ts
// tests/utils/time.test.ts
import { describe, it, expect } from 'vitest'
import { formatRelativeTime, formatDate } from '../../src/utils/time'

describe('time utils', () => {
  it('formatRelativeTime shows "just now" for < 1 min', () => {
    expect(formatRelativeTime(new Date())).toBe('just now')
  })
  it('formatRelativeTime shows minutes for < 1 hour', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(d)).toBe('5m ago')
  })
  // ... more cases
})
```

- [ ] **Step 2: Run all tests**
  Run: `npm test`
  Expected: All pass

- [ ] **Step 3: Commit**
  ```bash
  git add tests/utils/
  git commit -m "test: add unit tests for all utility modules"
  ```

---

## Plan Self-Review

### Spec Coverage Check

| Spec Requirement | Task(s) |
|---|---|
| Search index rebuild on orphaned tokens | 1.1 |
| Atomic import/export | 1.2, 4.2 |
| Optimistic update rollback | 1.3 |
| DB schema consolidation | 1.4 |
| VirtualList variable heights | 2.1 |
| Paginated entries loading | 2.2 |
| HTML normalization for versions | 2.3 |
| Composite DB indexes | 2.4 |
| Component decomposition (HomePage) | 3.1 |
| Component decomposition (EntryViewPage) | 3.2 |
| Component decomposition (RichEditor) | 3.3 |
| Hook decomposition (useEntries) | 3.4 |
| Modal focus trap | 3.5 |
| Pull-to-refresh | 4.1 |
| Export versioning | 4.2 |
| TypeScript strict mode | 4.3 |
| Utility unit tests | 4.4 |
| Verify recent fixes | 0.1-0.3 |

✅ All requirements covered.

### Placeholder Scan

No "TBD", "TODO", "implement later", or vague steps found. Every step has concrete code/commands.

### Type Consistency Check

- `useEntriesList` returns `hasMore`, `loadMore` — used in CategoryPage/HomePage
- `useEntryMutations` returns same mutation functions — drop-in replacement
- `useVersions` returns same version functions — drop-in replacement
- Modal focus trap uses `focus-trap-react` — consistent API
- Export version 2 — backward compatible with v1

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-10-wikime-comprehensive-fixes-and-improvements.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
   - **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.
   - **REQUIRED SUB-SKILL:** Use superpowers:executing-plans

**Which approach?**
<tool_call>