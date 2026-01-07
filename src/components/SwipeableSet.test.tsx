import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SwipeableSet } from './SwipeableSet'

describe('SwipeableSet', () => {
  const defaultProps = {
    children: <span>60kg × 10</span>,
    onDelete: vi.fn(),
    onSwipeStart: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('renders children content', () => {
      render(<SwipeableSet {...defaultProps} />)
      expect(screen.getByText('60kg × 10')).toBeInTheDocument()
    })

    it('does not show delete button initially', () => {
      render(<SwipeableSet {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('swipe gesture', () => {
    it('reveals delete button after swiping left', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Simulate touch swipe left
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('does not reveal delete button on vertical swipe', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Simulate vertical swipe (scrolling)
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 200 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('does not reveal delete button on right swipe', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Simulate swipe right
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('requires minimum swipe distance to reveal delete', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Simulate very short swipe (less than threshold)
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 90, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('calls onSwipeStart when swipe begins', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      expect(defaultProps.onSwipeStart).toHaveBeenCalled()
    })
  })

  describe('delete action', () => {
    it('calls onDelete when delete button is clicked', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Swipe to reveal
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)

      expect(defaultProps.onDelete).toHaveBeenCalled()
    })

    it('hides delete button after deletion', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Swipe to reveal
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      // Click delete
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)

      // Delete button should be hidden after clicking
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('dismiss behavior', () => {
    it('hides delete button when close is called', () => {
      const { rerender } = render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      // Swipe to reveal
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(container)

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()

      // Simulate close by re-rendering with forceClose prop
      rerender(<SwipeableSet {...defaultProps} forceClose={true} />)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('visual feedback', () => {
    it('shows red background during swipe', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      // During swipe, the delete background should be visible
      const deleteBackground = screen.getByTestId('delete-background')
      expect(deleteBackground).toBeInTheDocument()
    })

    it('applies transform during swipe', () => {
      render(<SwipeableSet {...defaultProps} />)
      const container = screen.getByTestId('swipeable-set')
      const content = screen.getByTestId('swipeable-content')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 150, clientY: 100 }],
      })

      // Content should have transform applied
      expect(content.style.transform).toContain('translateX')
    })
  })
})
