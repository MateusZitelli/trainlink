import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { INITIAL_STATE } from './state'
import type { AppState } from './state'

// Reset module state between tests
beforeEach(async () => {
  vi.resetModules()
  window.location.hash = ''
  localStorage.clear()
})

describe('urlStore', () => {
  describe('getSnapshot', () => {
    it('returns INITIAL_STATE when hash is empty', async () => {
      const { getSnapshot } = await import('./urlStore')
      expect(getSnapshot()).toEqual(INITIAL_STATE)
    })

    it('parses state from URL hash', async () => {
      const { stateToUrl } = await import('./url')
      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Monday', exercises: [] }] },
      }
      window.location.hash = stateToUrl(state).slice(1) // Remove #

      const { getSnapshot } = await import('./urlStore')
      expect(getSnapshot()).toEqual(state)
    })

    it('falls back to localStorage when hash empty', async () => {
      const { saveToStorage } = await import('./url')
      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Tuesday', exercises: ['ex1'] }] },
      }
      saveToStorage(state)

      const { getSnapshot } = await import('./urlStore')
      expect(getSnapshot()).toEqual(state)
    })

    it('caches state for same hash', async () => {
      const { getSnapshot } = await import('./urlStore')
      const first = getSnapshot()
      const second = getSnapshot()
      expect(first).toBe(second) // Same reference = cached
    })
  })

  describe('updateStateFn', () => {
    it('updates URL hash with new state', async () => {
      const { updateStateFn, getSnapshot } = await import('./urlStore')

      updateStateFn(prev => ({
        ...prev,
        plan: { days: [{ name: 'Wednesday', exercises: [] }] },
      }))

      expect(window.location.hash).not.toBe('')
      expect(getSnapshot().plan.days[0].name).toBe('Wednesday')
    })

    it('saves to localStorage as backup', async () => {
      const { updateStateFn } = await import('./urlStore')
      const { loadFromStorage } = await import('./url')

      updateStateFn(prev => ({
        ...prev,
        plan: { days: [{ name: 'Thursday', exercises: [] }] },
      }))

      const stored = loadFromStorage()
      expect(stored?.plan.days[0].name).toBe('Thursday')
    })

    it('notifies listeners after update', async () => {
      const { updateStateFn, subscribe } = await import('./urlStore')
      const listener = vi.fn()

      subscribe(listener)
      updateStateFn(prev => ({
        ...prev,
        plan: { days: [{ name: 'Friday', exercises: [] }] },
      }))

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('returns unsubscribe function', async () => {
      const { subscribe, updateStateFn } = await import('./urlStore')
      const listener = vi.fn()

      const unsubscribe = subscribe(listener)
      unsubscribe()

      updateStateFn(prev => ({
        ...prev,
        plan: { days: [{ name: 'Saturday', exercises: [] }] },
      }))

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('useUrlState hook', () => {
    it('returns current state from URL', async () => {
      const { stateToUrl } = await import('./url')

      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Sunday', exercises: [] }] },
      }
      window.location.hash = stateToUrl(state).slice(1)

      // Force module reload for clean state
      vi.resetModules()
      const { useUrlState } = await import('./urlStore')

      const { result } = renderHook(() => useUrlState())
      expect(result.current.plan.days[0].name).toBe('Sunday')
    })

    it('updates when updateStateFn is called', async () => {
      const { useUrlState, updateStateFn } = await import('./urlStore')

      const { result } = renderHook(() => useUrlState())

      expect(result.current.plan.days).toHaveLength(0)

      act(() => {
        updateStateFn(prev => ({
          ...prev,
          plan: { days: [{ name: 'NewDay', exercises: [] }] },
        }))
      })

      expect(result.current.plan.days[0].name).toBe('NewDay')
    })
  })
})
