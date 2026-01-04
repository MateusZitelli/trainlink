import { describe, it, expect, beforeEach } from 'vitest'
import { saveToStorage, loadFromStorage, stateToUrl, urlToState } from './url'
import { INITIAL_STATE } from './state'
import type { AppState } from './state'

describe('url.ts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('stateToUrl / urlToState', () => {
    it('serializes state to URL hash and back', () => {
      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Monday', exercises: ['ex1', 'ex2'] }] },
      }
      const url = stateToUrl(state)
      expect(url).toMatch(/^#/)
      const parsed = urlToState(url)
      expect(parsed).toEqual(state)
    })

    it('returns null for empty hash', () => {
      expect(urlToState('')).toBeNull()
      expect(urlToState('#')).toBeNull()
    })

    it('returns null for invalid hash data', () => {
      expect(urlToState('#invalid-data')).toBeNull()
    })
  })

  describe('saveToStorage / loadFromStorage', () => {
    it('saves and loads state from localStorage', () => {
      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Monday', exercises: [] }] },
      }
      saveToStorage(state)
      expect(loadFromStorage()).toEqual(state)
    })

    it('returns null when localStorage is empty', () => {
      expect(loadFromStorage()).toBeNull()
    })

    it('persists history entries', () => {
      const state: AppState = {
        ...INITIAL_STATE,
        history: [
          { type: 'set', exId: 'ex1', ts: 1000, kg: 50, reps: 10 },
          { type: 'session-end', ts: 2000 },
        ],
      }
      saveToStorage(state)
      expect(loadFromStorage()).toEqual(state)
    })
  })
})
