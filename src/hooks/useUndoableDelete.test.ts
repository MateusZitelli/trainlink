import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoableDelete } from './useUndoableDelete'
import type { SetEntry } from '../lib/state'

describe('useUndoableDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockSet = (ts: number, kg = 50, reps = 10): SetEntry => ({
    type: 'set',
    exId: 'bench-press',
    ts,
    kg,
    reps,
  })

  describe('delete operation', () => {
    it('calls onDelete with the set timestamp', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      const set = createMockSet(1000)

      act(() => {
        result.current.deleteSet(set)
      })

      expect(onDelete).toHaveBeenCalledWith(1000)
    })

    it('stores deleted set for undo', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      const set = createMockSet(1000)

      act(() => {
        result.current.deleteSet(set)
      })

      expect(result.current.deletedSets).toHaveLength(1)
      expect(result.current.deletedSets[0]).toEqual(set)
    })

    it('shows undo available after delete', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      expect(result.current.canUndo).toBe(false)

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      expect(result.current.canUndo).toBe(true)
    })
  })

  describe('undo operation', () => {
    it('restores deleted set when undo is called', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      const set = createMockSet(1000, 60, 12)

      act(() => {
        result.current.deleteSet(set)
      })

      act(() => {
        result.current.undo()
      })

      expect(onRestore).toHaveBeenCalledWith([set])
    })

    it('clears deleted sets after undo', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.undo()
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.deletedSets).toHaveLength(0)
    })
  })

  describe('undo timeout', () => {
    it('expires undo after 5 seconds', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      expect(result.current.canUndo).toBe(true)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.deletedSets).toHaveLength(0)
    })

    it('extends timeout when new delete happens', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Delete another set
      act(() => {
        result.current.deleteSet(createMockSet(2000))
      })

      // 3 more seconds (6 total since first delete, 3 since second)
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Should still be able to undo (only 3 seconds since last delete)
      expect(result.current.canUndo).toBe(true)
      expect(result.current.deletedSets).toHaveLength(2)

      // 2 more seconds (5 total since last delete)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Now it should be expired
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('multiple deletes', () => {
    it('accumulates deleted sets before timeout', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })
      act(() => {
        result.current.deleteSet(createMockSet(2000))
      })
      act(() => {
        result.current.deleteSet(createMockSet(3000))
      })

      expect(result.current.deletedSets).toHaveLength(3)
    })

    it('restores all accumulated sets on undo', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      const sets = [
        createMockSet(1000),
        createMockSet(2000),
        createMockSet(3000),
      ]

      act(() => {
        sets.forEach(s => result.current.deleteSet(s))
      })

      act(() => {
        result.current.undo()
      })

      expect(onRestore).toHaveBeenCalledWith(sets)
    })
  })

  describe('toast message', () => {
    it('provides message for single deleted set', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      expect(result.current.undoMessage).toBe('Set deleted')
    })

    it('provides message for multiple deleted sets', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
        result.current.deleteSet(createMockSet(2000))
        result.current.deleteSet(createMockSet(3000))
      })

      expect(result.current.undoMessage).toBe('3 sets deleted')
    })

    it('returns null message when no sets deleted', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      expect(result.current.undoMessage).toBeNull()
    })
  })

  describe('dismiss', () => {
    it('clears deleted sets without restoring when dismiss is called', () => {
      const onDelete = vi.fn()
      const onRestore = vi.fn()
      const { result } = renderHook(() => useUndoableDelete({ onDelete, onRestore }))

      act(() => {
        result.current.deleteSet(createMockSet(1000))
      })

      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.canUndo).toBe(false)
      expect(onRestore).not.toHaveBeenCalled()
    })
  })
})
