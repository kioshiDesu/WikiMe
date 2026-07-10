# Task 9: Optimistic updates

**Files:**
- Modify: `src/hooks/useEntries.ts`
- Modify: `src/hooks/useCategories.ts`

**What to do:**

Replace full `refresh()` calls with optimistic local state updates after mutations. Instead of re-fetching all data from the DB after every change, update the local state directly.

## useEntries.ts changes

Currently, every mutation calls `await refresh()` which loads all entries from IndexedDB. Change these to update `setAllEntries` directly:

### updateEntry
```ts
const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
  await db.entries.update(id, { ...data, updatedAt: new Date() })
  setAllEntries(prev => prev.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date() } as Entry : e))
  if (data.title !== undefined || data.contentHtml !== undefined) {
    const entry = await db.entries.get(id)
    if (entry) await buildSearchIndex(id, entry.title, entry.contentHtml, db)
  }
}, [])
```

### trashEntry
```ts
const trashEntry = useCallback(async (id: number, days?: number) => {
  const now = new Date()
  await db.entries.update(id, { deletedAt: now, trashDays: days ?? DEFAULT_TRASH_DAYS, updatedAt: now })
  setAllEntries(prev => prev.map(e => e.id === id ? { ...e, deletedAt: now, trashDays: days ?? DEFAULT_TRASH_DAYS, updatedAt: now } as Entry : e))
}, [])
```

### restoreEntry
```ts
const restoreEntry = useCallback(async (id: number) => {
  const now = new Date()
  await db.entries.update(id, { deletedAt: null, updatedAt: now })
  setAllEntries(prev => prev.map(e => e.id === id ? { ...e, deletedAt: null, updatedAt: now } as Entry : e))
}, [])
```

### deleteEntry
```ts
const deleteEntry = useCallback(async (id: number) => {
  await db.searchIndex.where('entryId').equals(id).delete()
  await db.versions.where('entryId').equals(id).delete()
  await db.entries.delete(id)
  setAllEntries(prev => prev.filter(e => e.id !== id))
}, [])
```

### addEntry
Keep `refresh()` for addEntry since we don't know the new entry's final sort position relative to other entries without a re-fetch. But move it after the search index build:
```ts
const addEntry = useCallback(async (data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'trashDays'>) => {
  const now = new Date()
  const id = await db.entries.add({
    ...data, deletedAt: null, trashDays: DEFAULT_TRASH_DAYS, createdAt: now, updatedAt: now,
  } as Entry)
  await buildSearchIndex(id as number, data.title || '', data.contentHtml || '', db)
  await refresh()
  return id
}, [refresh])
```

### saveVersion, getVersions, restoreVersion, cleanupTrash
Keep these unchanged (they don't affect entry list rendering directly).

## useCategories.ts changes

Read the current file. Apply the same pattern:

### addCategory
Add the new category to local state after creating in DB:
```ts
const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date()
  const id = await db.categories.add({ ...data, createdAt: now, updatedAt: now } as Category)
  setCategories(prev => [...prev, { ...data, id: id as number, createdAt: now, updatedAt: now } as Category])
  return id
}, [])
```

### updateCategory
```ts
const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
  const now = new Date()
  await db.categories.update(id, { ...data, updatedAt: now })
  setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: now } as Category : c))
}, [])
```

### deleteCategory
```ts
const deleteCategory = useCallback(async (id: number) => {
  const entryIds = (await db.entries.where('categoryId').equals(id).toArray()).map(e => e.id!)
  if (entryIds.length > 0) {
    await db.searchIndex.where('entryId').anyOf(entryIds).delete()
    await db.versions.where('entryId').anyOf(entryIds).delete()
  }
  await db.categories.delete(id)
  await db.entries.where('categoryId').equals(id).delete()
  setCategories(prev => prev.filter(c => c.id !== id))
}, [])
```

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
