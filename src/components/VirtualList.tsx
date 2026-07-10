import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'

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
  const [scrollTop, setScrollTop] = useState(0)
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

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
  }, [items])

  const totalHeight = items.reduce((sum, _, index) => sum + (measuredHeights.get(index) ?? estimatedItemHeight), 0)
  const containerHeight = containerRef.current?.clientHeight || 400
  
  let accumulatedHeight = 0
  let startIndex = 0
  for (let i = 0; i < items.length; i++) {
    const height = measuredHeights.get(i) ?? estimatedItemHeight
    if (accumulatedHeight + height >= scrollTop - overscan * estimatedItemHeight) {
      startIndex = Math.max(0, i - overscan)
      break
    }
    accumulatedHeight += height
  }

  let endIndex = startIndex
  accumulatedHeight = 0
  for (let i = startIndex; i < items.length; i++) {
    const height = measuredHeights.get(i) ?? estimatedItemHeight
    accumulatedHeight += height
    if (accumulatedHeight >= containerHeight + overscan * 2 * estimatedItemHeight) {
      endIndex = i + 1
      break
    }
    endIndex = i + 1
  }
  endIndex = Math.min(items.length, endIndex + overscan)

  const paddingTop = items.slice(0, startIndex).reduce((sum, _, index) => sum + (measuredHeights.get(index) ?? estimatedItemHeight), 0)
  const paddingBottom = totalHeight - paddingTop - items.slice(startIndex, endIndex).reduce((sum, _, index) => sum + (measuredHeights.get(startIndex + index) ?? estimatedItemHeight), 0)

  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className || 'overflow-y-auto'}
      style={{ overflowAnchor: 'none', height: '100%', width: '100%' }}
    >
      <div ref={contentRef} style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div style={{ height: paddingTop }} />
        <div style={{ height: totalHeight - paddingTop - paddingBottom, position: 'relative' }}>
          {visibleItems.map((item, i) => (
            <div
              key={startIndex + i}
              ref={(el) => { itemRefs.current[startIndex + i] = el }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: measuredHeights.get(startIndex + i) ?? estimatedItemHeight, transform: `translateY(${items.slice(startIndex, startIndex + i).reduce((sum, _, idx) => sum + (measuredHeights.get(startIndex + idx) ?? estimatedItemHeight), 0)}px)` }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
        <div style={{ height: paddingBottom }} />
      </div>
    </div>
  )
}