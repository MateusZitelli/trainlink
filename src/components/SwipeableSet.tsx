import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

const SWIPE_THRESHOLD = 50 // Minimum distance to trigger swipe
const DELETE_BUTTON_WIDTH = 80

interface SwipeableSetProps {
  children: ReactNode
  onDelete: () => void
  onSwipeStart?: () => void
  forceClose?: boolean
}

export function SwipeableSet({
  children,
  onDelete,
  onSwipeStart,
  forceClose,
}: SwipeableSetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)

  // Handle forceClose prop
  useEffect(() => {
    if (forceClose) {
      setIsOpen(false)
      setTranslateX(0)
    }
  }, [forceClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    isHorizontalSwipe.current = null
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY)
        if (isHorizontalSwipe.current && onSwipeStart) {
          onSwipeStart()
        }
      }
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return

    // Only allow left swipe (negative deltaX)
    if (deltaX > 0) {
      setTranslateX(0)
      return
    }

    // Clamp the translation
    const clampedX = Math.max(deltaX, -DELETE_BUTTON_WIDTH)
    setTranslateX(clampedX)
  }, [isSwiping, onSwipeStart])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)

    // Check if swipe exceeded threshold
    if (translateX < -SWIPE_THRESHOLD) {
      setIsOpen(true)
      setTranslateX(-DELETE_BUTTON_WIDTH)
    } else {
      setIsOpen(false)
      setTranslateX(0)
    }
  }, [translateX])

  const handleDelete = useCallback(() => {
    onDelete()
    setIsOpen(false)
    setTranslateX(0)
  }, [onDelete])

  const showDeleteBackground = isSwiping && translateX < 0

  return (
    <div
      data-testid="swipeable-set"
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete background - always rendered when swiping or open */}
      {(showDeleteBackground || isOpen) && (
        <div
          data-testid="delete-background"
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500"
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <button
            onClick={handleDelete}
            className="w-full h-full flex items-center justify-center text-white font-medium"
            aria-label="Delete"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div
        data-testid="swipeable-content"
        className="relative bg-[var(--surface)] transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${isOpen ? -DELETE_BUTTON_WIDTH : translateX}px)`,
          transition: isSwiping ? 'none' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
