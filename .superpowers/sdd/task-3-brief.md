# Task 3: Integrate search index into useEntries

**Files:**
- Modify: `src/hooks/useEntries.ts`

**Changes needed:**

1. **Add import** at top:
```ts
import { buildSearchIndex, rebuildAllSearchIndexes } from '../utils/searchIndex'
```

2. **In `addEntry`**, after `await refresh()` and before `return id`, add:
```ts
await buildSearchIndex(id as number, data.title || '', data.contentHtml || '', db)
```

3. **In `updateEntry`**, add index rebuild when title or content changes:
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

4. **In `deleteEntry`**, add search index cascade:
```ts
const deleteEntry = useCallback(async (id: number) => {
  await db.searchIndex.where('entryId').equals(id).delete()
  await db.versions.where('entryId').equals(id).delete()
  await db.entries.delete(id)
  await refresh()
}, [refresh])
```

5. **Add `rebuildSearchIndexes` export** — add this to the returned object:
```ts
rebuildSearchIndexes: useCallback(async () => {
  await rebuildAllSearchIndexes(db)
  await refresh()
}, [refresh]),
```

**Important:** The `refresh` dependency is used in the useCallback; the plan says `[]` for rebuildSearchIndexes but it needs `[refresh]` since it calls `refresh()`. Use `[refresh]`.

**Current file for reference:** `/storage/self/primary/Documents/wikime/src/hooks/useEntries.ts`

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
