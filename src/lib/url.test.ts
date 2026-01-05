/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest'

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
import lzString from 'lz-string'
import { saveToStorage, loadFromStorage, stateToUrl, urlToState, encodeShareData, decodeShareData } from './url'
import type { ShareData } from './url'
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

    it('preserves all state fields including history with all optional properties', () => {
      const state: AppState = {
        plan: { days: [{ name: 'Push', exercises: ['0001', '0002'] }] },
        history: [
          { type: 'set', exId: '0001', ts: 1704067200000, kg: 60, reps: 10, rest: 90, difficulty: 'hard', duration: 45 },
          { type: 'set', exId: '0002', ts: 1704067300000, kg: 40, reps: 12 },
          { type: 'session-end', ts: 1704067400000 },
        ],
        session: { activeDay: 'Push', currentExId: '0001', restStartedAt: 1704067250000 },
        restTimes: { '0001': 90, '0002': 120 },
      }
      const url = stateToUrl(state)
      const parsed = urlToState(url)
      expect(parsed).toEqual(state)
    })

    it('handles all difficulty values', () => {
      const difficulties = ['easy', 'normal', 'hard'] as const
      for (const difficulty of difficulties) {
        const state: AppState = {
          ...INITIAL_STATE,
          history: [{ type: 'set', exId: 'ex1', ts: 1000, kg: 50, reps: 10, difficulty }],
        }
        const url = stateToUrl(state)
        const parsed = urlToState(url)
        expect(parsed?.history[0]).toMatchObject({ difficulty })
      }
    })

    it('handles null session', () => {
      const state: AppState = {
        ...INITIAL_STATE,
        session: null,
      }
      const url = stateToUrl(state)
      const parsed = urlToState(url)
      expect(parsed?.session).toBeNull()
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

  describe('encodeShareData / decodeShareData', () => {
    it('encodes and decodes share data', () => {
      const shareData: ShareData = {
        day: { name: 'Push Day', exercises: ['0001', '0002', '0003'] },
        restTimes: { '0001': 90, '0002': 120 },
        setPatterns: {},
      }
      const encoded = encodeShareData(shareData)
      const decoded = decodeShareData(encoded)
      expect(decoded).toEqual(shareData)
    })

    it('handles empty rest times', () => {
      const shareData: ShareData = {
        day: { name: 'Pull', exercises: ['ex1'] },
        restTimes: {},
        setPatterns: {},
      }
      const encoded = encodeShareData(shareData)
      const decoded = decodeShareData(encoded)
      expect(decoded).toEqual(shareData)
    })

    it('encodes and decodes set patterns', () => {
      const shareData: ShareData = {
        day: { name: 'Push', exercises: ['bench', 'ohp'] },
        restTimes: { 'bench': 120, 'ohp': 90 },
        setPatterns: {
          'bench': [
            { kg: 100, reps: 5 },
            { kg: 80, reps: 8, difficulty: 'normal' },
            { kg: 60, reps: 12, difficulty: 'hard' },
          ],
          'ohp': [
            { kg: 50, reps: 8, difficulty: 'easy' },
          ],
        },
      }
      const encoded = encodeShareData(shareData)
      const decoded = decodeShareData(encoded)
      expect(decoded).toEqual(shareData)
    })

    it('returns null for invalid encoded data', () => {
      expect(decodeShareData('invalid')).toBeNull()
    })
  })

  describe('backward compatibility with v1 lz-string format', () => {
    it('decodes legacy v1 app state from URL hash', () => {
      const legacyState: AppState = {
        plan: { days: [{ name: 'Legs', exercises: ['squat', 'deadlift'] }] },
        history: [
          { type: 'set', exId: 'squat', ts: 1700000000000, kg: 100, reps: 5 },
        ],
        session: null,
        restTimes: { squat: 180 },
      }
      // Encode using old lz-string format (v1)
      const legacyEncoded = lzString.compressToEncodedURIComponent(JSON.stringify(legacyState))
      const legacyUrl = '#' + legacyEncoded

      // Should decode correctly
      const decoded = urlToState(legacyUrl)
      expect(decoded).toEqual(legacyState)
    })

    it('decodes legacy v1 share data', () => {
      const legacyShareData = {
        day: { name: 'Upper Body', exercises: ['bench', 'rows'] },
        restTimes: { bench: 120, rows: 90 },
      }
      // Encode using old lz-string format (v1)
      const legacyEncoded = lzString.compressToEncodedURIComponent(JSON.stringify(legacyShareData))

      // Should decode correctly with setPatterns added for backward compatibility
      const decoded = decodeShareData(legacyEncoded)
      expect(decoded).toEqual({ ...legacyShareData, setPatterns: {} })
    })

    it('decodes legacy state with all optional fields', () => {
      const legacyState: AppState = {
        plan: { days: [] },
        history: [
          { type: 'set', exId: 'ex1', ts: 1000, kg: 50, reps: 10, rest: 60, difficulty: 'easy', duration: 30 },
          { type: 'session-end', ts: 2000 },
        ],
        session: { activeDay: 'Day1', currentExId: 'ex1', restStartedAt: 1500 },
        restTimes: {},
      }
      const legacyEncoded = lzString.compressToEncodedURIComponent(JSON.stringify(legacyState))
      const decoded = urlToState('#' + legacyEncoded)
      expect(decoded).toEqual(legacyState)
    })
  })

  describe('compression efficiency', () => {
    it('produces shorter URLs than v1 for typical state', () => {
      const state: AppState = {
        plan: {
          days: [
            { name: 'Push', exercises: ['0001', '0002', '0003'] },
            { name: 'Pull', exercises: ['0004', '0005', '0006'] },
            { name: 'Legs', exercises: ['0007', '0008'] },
          ],
        },
        history: Array.from({ length: 20 }, (_, i) => ({
          type: 'set' as const,
          exId: `000${(i % 8) + 1}`,
          ts: 1700000000000 + i * 1000,
          kg: 50 + i,
          reps: 10 - (i % 5),
        })),
        session: null,
        restTimes: { '0001': 90, '0002': 120, '0003': 60 },
      }

      // v2 encoding (current)
      const v2Url = stateToUrl(state)

      // v1 encoding (legacy lz-string)
      const v1Json = JSON.stringify(state)
      const v1Encoded = lzString.compressToEncodedURIComponent(v1Json)
      const v1Url = '#' + v1Encoded

      // v2 should be shorter
      expect(v2Url.length).toBeLessThan(v1Url.length)

      // Log compression ratio for visibility
      const ratio = ((v1Url.length - v2Url.length) / v1Url.length * 100).toFixed(1)
      console.log(`Compression improvement: ${ratio}% (${v1Url.length} -> ${v2Url.length} chars)`)
    })

    it('produces URL-safe output without special characters needing escaping', () => {
      const state: AppState = {
        ...INITIAL_STATE,
        plan: { days: [{ name: 'Test Day with Spaces & Special Chars!', exercises: ['ex1'] }] },
      }
      const url = stateToUrl(state)
      // Should only contain URL-safe characters (alphanumeric, -, _, and #)
      expect(url).toMatch(/^#[A-Za-z0-9_-]+$/)
    })
  })
})
