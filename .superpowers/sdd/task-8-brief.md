# Task 8: Alphabetical category grouping

**Files:**
- Modify: `src/pages/HomePage.tsx`

**What to do:**

Add alphabetical category grouping for sections with >30 categories.

## 1. Add helper function

Add this function before `HomePage` component, after `SectionBlock`:

```tsx
function groupCategoriesByLetter(categories: Category[]): { letter: string; categories: Category[] }[] {
  const groups: Record<string, Category[]> = {}
  for (const cat of categories) {
    const first = cat.name.trim()[0] || '#'
    const letter = /[a-zA-Z]/.test(first) ? first.toUpperCase() : '#'
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(cat)
  }
  const sorted = Object.entries(groups).sort(([a], [b]) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)
  )
  return sorted.map(([letter, cats]) => ({ letter, categories: cats }))
}
```

Also add `Category` type import if not already imported - check the imports.

## 2. Modify section rendering

In the section rendering area (lines 353-386), currently categories render in a 3-column grid with expand/collapse. Replace the content inside the `SectionBlock` for `g.cats.length > 30`:

```tsx
{g.cats.length > 30 ? (
  <div className="px-4 pb-2 space-y-2">
    {groupCategoriesByLetter(g.cats).map(group => (
      <div key={group.letter}>
        <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800">
          {group.letter}
          <span className="text-[9px] font-normal text-gray-300 dark:text-gray-600">{group.categories.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {group.categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} entryCount={getCount(cat.id!)} onClick={() => navigate(`/category/${cat.id}`)} />
          ))}
        </div>
      </div>
    ))}
  </div>
) : (
  // Keep EXISTING grid layout with expand/collapse for <=30 categories
  <div className="px-4 pb-2 grid grid-cols-3 gap-2">
    <AnimatePresence mode="popLayout">
      {(expandedSections.has(g.section.id!) ? g.cats : g.cats.slice(0, 3)).map(cat => (
        <CategoryCard
          key={cat.id}
          category={cat}
          entryCount={getCount(cat.id!)}
          onClick={() => navigate(`/category/${cat.id}`)}
        />
      ))}
      {g.cats.length > 3 && !expandedSections.has(g.section.id!) && (
        <motion.button layout key="show-more" onClick={() => toggleSection(g.section.id!)}
          className="flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 h-14 bg-transparent active:scale-95 transition-all"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
        >
          <span className="text-xs font-medium text-teal-500">+{g.cats.length - 3} more</span>
        </motion.button>
      )}
    </AnimatePresence>
    {g.cats.length > 3 && expandedSections.has(g.section.id!) && (
      <button onClick={() => toggleSection(g.section.id!)}
        className="col-span-3 text-center text-xs text-teal-500 py-2 active:text-teal-600 transition-colors"
      >Show less</button>
    )}
  </div>
)}
```

**Important:** Read the actual current code for the grid layout section (around line 353-386) and preserve it exactly as-is. Only wrap it in the ternary with the >30 branch.

## 3. Verify

- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
