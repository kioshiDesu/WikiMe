# Task 4: Wire indexed search in HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

**What to do:**

1. Add import at top:
```ts
import { searchEntries, rebuildAllSearchIndexes } from '../utils/searchIndex'
import { db } from '../db/db'
```
(Check if `db` is already imported — if so, skip adding it again.)

2. Find the search `useEffect` that currently filters entries with `.includes()`. It should be looking at `query` state and setting `results`. Replace the filtering logic with:

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

3. **Important:** Make sure the `SearchResult` interface is imported/available. It's already defined at the top of `HomePage.tsx` (around line 23-32):
```ts
interface SearchResult {
  id: number; categoryId: number; categoryName: string; categoryColor: string
  title: string; contentHtml: string; pinned: boolean; updatedAt: string
}
```

4. **In the startup `useEffect`** (the one that seeds starter data), after seeding completes, add a call to rebuild the search index:
```ts
rebuildAllSearchIndexes(db).catch(() => {})
```

Place it after the seeding logic completes so existing entries get indexed.

5. Remove the old `.includes()` search logic. It was probably something like:
```ts
const q = query.toLowerCase()
const filtered = allEntries.filter(e => 
  (e.title || '').toLowerCase().includes(q) || 
  stripHtml(e.contentHtml || '').toLowerCase().includes(q)
)
```

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
