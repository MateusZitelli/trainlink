import { useState, useRef, useCallback } from 'react'

interface DragState {
  draggedIndex: number | null
  dropTargetIndex: number | null
}

export function useDragReorder(onReorder: (fromIndex: number, toIndex: number) => void) {
  const [dragState, setDragState] = useState<DragState>({
    draggedIndex: null,
    dropTargetIndex: null,
  })

  // Touch drag state
  const touchStart = useRef<{ index: number; y: number; x: number } | null>(null)
  const draggedElement = useRef<HTMLElement | null>(null)

  // Desktop drag handlers
  const handleDragStart = useCallback((index: number) => (e: React.DragEvent) => {
    setDragState({ draggedIndex: index, dropTargetIndex: null })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragState(prev => ({ ...prev, dropTargetIndex: index }))
  }, [])

  const handleDrop = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = dragState.draggedIndex
    if (fromIndex !== null && fromIndex !== index) {
      onReorder(fromIndex, index)
    }
    setDragState({ draggedIndex: null, dropTargetIndex: null })
  }, [dragState.draggedIndex, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedIndex: null, dropTargetIndex: null })
  }, [])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((index: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { index, y: touch.clientY, x: touch.clientX }
    draggedElement.current = e.currentTarget as HTMLElement
    setDragState({ draggedIndex: index, dropTargetIndex: null })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !draggedElement.current) return

    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStart.current.y

    // Only start visual drag after threshold
    if (Math.abs(deltaY) > 10) {
      e.preventDefault()
      draggedElement.current.style.transform = `translateY(${deltaY}px)`
      draggedElement.current.style.opacity = '0.8'
      draggedElement.current.style.zIndex = '50'
    }
  }, [])

  const handleTouchEnd = useCallback((
    items: { element: HTMLElement; index: number }[],
    e: React.TouchEvent
  ) => {
    if (!touchStart.current || !draggedElement.current) {
      setDragState({ draggedIndex: null, dropTargetIndex: null })
      return
    }

    const touch = e.changedTouches[0]
    const fromIndex = touchStart.current.index

    // Find which item we're over
    let toIndex = fromIndex
    for (const item of items) {
      const rect = item.element.getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        toIndex = item.index
        break
      }
    }

    // Reset visual state
    draggedElement.current.style.transform = ''
    draggedElement.current.style.opacity = ''
    draggedElement.current.style.zIndex = ''

    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex)
    }

    touchStart.current = null
    draggedElement.current = null
    setDragState({ draggedIndex: null, dropTargetIndex: null })
  }, [onReorder])

  const getDragProps = useCallback((index: number) => ({
    draggable: true,
    onDragStart: handleDragStart(index),
    onDragOver: handleDragOver(index),
    onDrop: handleDrop(index),
    onDragEnd: handleDragEnd,
  }), [handleDragStart, handleDragOver, handleDrop, handleDragEnd])

  const getTouchProps = useCallback((index: number) => ({
    onTouchStart: handleTouchStart(index),
    onTouchMove: handleTouchMove,
  }), [handleTouchStart, handleTouchMove])

  return {
    draggedIndex: dragState.draggedIndex,
    dropTargetIndex: dragState.dropTargetIndex,
    getDragProps,
    getTouchProps,
    handleTouchEnd,
  }
}
