import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  delay?: number
  moveThreshold?: number
}

export function useLongPress(
  onLongPress: () => void,
  { delay = 500, moveThreshold = 10 }: UseLongPressOptions = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const wasLongPress = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const isPressed = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  const start = useCallback((x: number, y: number) => {
    if (!window.getSelection()?.isCollapsed) return
    isPressed.current = true
    wasLongPress.current = false
    startPos.current = { x, y }
    timerRef.current = setTimeout(() => {
      if (!isPressed.current) return
      wasLongPress.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    start(t.clientX, t.clientY)
  }, [start])

  const handleTouchEnd = useCallback(() => {
    isPressed.current = false
    clear()
  }, [clear])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (Math.abs(t.clientX - startPos.current.x) > moveThreshold ||
        Math.abs(t.clientY - startPos.current.y) > moveThreshold) {
      isPressed.current = false
      clear()
    }
  }, [clear, moveThreshold])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    start(e.clientX, e.clientY)
  }, [start])

  const handleMouseUp = useCallback(() => {
    isPressed.current = false
    clear()
  }, [clear])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPressed.current) return
    if (Math.abs(e.clientX - startPos.current.x) > moveThreshold ||
        Math.abs(e.clientY - startPos.current.y) > moveThreshold) {
      isPressed.current = false
      clear()
    }
  }, [clear, moveThreshold])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    clear()
    if (wasLongPress.current) {
      e.preventDefault()
      return
    }
    if (e.button === 2) {
      e.preventDefault()
      onLongPress()
    }
  }, [clear, onLongPress])

  return {
    wasLongPress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseMove: handleMouseMove,
      onContextMenu: handleContextMenu,
    },
  }
}
