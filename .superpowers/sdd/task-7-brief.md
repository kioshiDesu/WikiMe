# Task 7: Apply VirtualList to TrashPage

**Files:**
- Modify: `src/pages/TrashPage.tsx`

**What to do:**

Replace the current trash entry list with VirtualList.

The current rendering at lines 97-135:
```tsx
<div className="flex-1 overflow-y-auto">
  {trashedEntries.map(e => {
    const remaining = daysLeft(e)
    return (
      <div key={e.id} onClick={() => toggle(e.id!)} ...>
        <div className="checkbox">...</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium ...">{e.title || 'Untitled'}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span>{remaining} days left</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Auto-deletes after {(e.trashDays || 7)} days
          </div>
        </div>
        <button onClick={restoreEntry}>Restore</button>
        <button onClick={deleteEntry}>Delete</button>
      </div>
    )
  })}
</div>
```

Read the actual file to see the exact code, then:

1. Add import: `import { VirtualList } from '../components/VirtualList'`
2. Replace the `.map()` block with:
```tsx
<div className="flex-1 overflow-y-auto">
  <VirtualList
    items={trashedEntries}
    itemHeight={80}
    renderItem={(e) => {
      const remaining = daysLeft(e)
      return (
        <div
          key={e.id}
          onClick={() => toggle(e.id!)}
          className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-all cursor-pointer ${
            selected.has(e.id!) ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''
          }`}
          style={{ height: '80px' }}
        >
          {/* Keep the original content exactly as-is inside */}
        </div>
      )
    }}
  />
</div>
```

3. Keep ALL the original JSX content inside the renderItem — just wrap it in VirtualList

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
