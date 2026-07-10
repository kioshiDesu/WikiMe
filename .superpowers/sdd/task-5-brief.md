# Task 5: Create VirtualList component

**Files:**
- Create: `src/components/VirtualList.tsx`

**What to do:**

Create a generic virtual scrolling component that only renders visible items:

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

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
