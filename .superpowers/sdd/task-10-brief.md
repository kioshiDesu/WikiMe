# Task 10: Version cascade on delete

**Files:**
- Modify: `src/hooks/useCategories.ts`
- Modify: `src/hooks/useSections.ts`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/hooks/useEntries.ts`

**What to do:**

Add cascade deletion of versions and search index entries when categories, sections, or trash cleanup removes entries.

## Current code (read each file to confirm):

### useCategories.ts line 35-39:
```ts
const deleteCategory = useCallback(async (id: number) => {
  await db.categories.delete(id)
  await db.entries.where('categoryId').equals(id).delete()
  await refresh()
}, [refresh])
```

**Change to:**
```ts
const deleteCategory = useCallback(async (id: number) => {
  const entryIds = (await db.entries.where('categoryId').equals(id).toArray()).map(e => e.id!)
  await db.searchIndex.where('entryId').anyOf(entryIds).delete()
  await db.versions.where('entryId').anyOf(entryIds).delete()
  await db.categories.delete(id)
  await db.entries.where('categoryId').equals(id).delete()
  await refresh()
}, [refresh])
```

### useSections.ts line 35-41:
```ts
const deleteSection = useCallback(async (id: number) => {
  const catIds = (await db.categories.where('sectionId').equals(id).toArray()).map(c => c.id)
  await db.entries.where('categoryId').anyOf(catIds).delete()
  await db.categories.where('sectionId').equals(id).delete()
  await db.sections.delete(id)
  await refresh()
}, [refresh])
```

**Change to:**
```ts
const deleteSection = useCallback(async (id: number) => {
  const catIds = (await db.categories.where('sectionId').equals(id).toArray()).map(c => c.id!)
  const entryIds: number[] = []
  for (const catId of catIds) {
    const ids = (await db.entries.where('categoryId').equals(catId).toArray()).map(e => e.id!)
    entryIds.push(...ids)
  }
  await db.searchIndex.where('entryId').anyOf(entryIds).delete()
  await db.versions.where('entryId').anyOf(entryIds).delete()
  await db.entries.where('categoryId').anyOf(catIds).delete()
  await db.categories.where('sectionId').equals(id).delete()
  await db.sections.delete(id)
  await refresh()
}, [refresh])
```

### AppShell.tsx line 16-28:
```ts
useEffect(() => {
  const cleanup = async () => {
    const now = Date.now()
    const all = await db.entries.toArray()
    for (const e of all) {
      if (!e.deletedAt) continue
      const deadline = new Date(e.deletedAt).getTime() + (e.trashDays || DEFAULT_TRASH_DAYS) * 86400000
      if (now >= deadline) {
        await db.entries.delete(e.id!)
      }
    }
  }
  cleanup()
}, [])
```

**Change to:**
```ts
useEffect(() => {
  const cleanup = async () => {
    const now = Date.now()
    const all = await db.entries.toArray()
    for (const e of all) {
      if (!e.deletedAt) continue
      const deadline = new Date(e.deletedAt).getTime() + (e.trashDays || DEFAULT_TRASH_DAYS) * 86400000
      if (now >= deadline) {
        await db.searchIndex.where('entryId').equals(e.id!).delete()
        await db.versions.where('entryId').equals(e.id!).delete()
        await db.entries.delete(e.id!)
      }
    }
  }
  cleanup()
}, [])
```

### useEntries.ts cleanupTrash (around lines 116-130):
Currently deletes entries and versions but not search index. Add:
```ts
await db.searchIndex.where('entryId').equals(e.id!).delete()
```
before `await db.entries.delete(e.id!)` inside the cleanupTrash loop.

**Read the actual current code first** to confirm line numbers.

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
