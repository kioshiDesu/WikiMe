# Task 6: Apply VirtualList to CategoryPage entry list

**Files:**
- Modify: `src/pages/CategoryPage.tsx`

**What to do:**

Replace the current entry list rendering (lines 170-205) with a VirtualList.

Currently:
```tsx
<div className="divide-y divide-gray-100 dark:divide-gray-800">
  <AnimatePresence mode="popLayout">
    {(query.trim() ? filtered : sortedEntries).map(entry => (
      <div key={entry.id} className="flex items-center">
        {selectMode && (
          <button onClick={...} /> // selection checkbox
        )}
        <div className="flex-1 min-w-0">
          <EntryCard entry={entry} onClick={...} />
        </div>
      </div>
    ))}
  </AnimatePresence>
</div>
```

Replace with:
```tsx
<div className="divide-y divide-gray-100 dark:divide-gray-800">
  <VirtualList
    items={query.trim() ? filtered : sortedEntries}
    itemHeight={72}
    renderItem={(entry) => (
      <div key={entry.id} className="flex items-center" style={{ height: '72px' }}>
        {selectMode && (
          <button
            onClick={() => {
              const next = new Set(selected)
              if (next.has(entry.id!)) next.delete(entry.id!)
              else next.add(entry.id!)
              setSelected(next)
            }}
            className={`flex-shrink-0 ml-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              selected.has(entry.id!)
                ? 'bg-teal-500 border-teal-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {selected.has(entry.id!) && <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <EntryCard
            entry={entry}
            onClick={() => selectMode ? (() => {
              const next = new Set(selected)
              if (next.has(entry.id!)) next.delete(entry.id!)
              else next.add(entry.id!)
              setSelected(next)
            })() : navigate(`/entry/${entry.id}`)}
          />
        </div>
      </div>
    )}
  />
</div>
```

**Steps:**
1. Add import: `import { VirtualList } from '../components/VirtualList'`
2. Replace the entry list div/AnimatePresence/map block with VirtualList
3. Remove the `AnimatePresence` import if it's no longer used in this file

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
