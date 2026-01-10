import { describe, it, expect } from 'vitest'
import {
  baseE1rm,
  getDifficultyMultiplier,
  getRestMultiplier,
  getFatigueMultiplier,
  calculateSmartE1rm,
  calculateE1rmMetrics,
  predictDifficulty,
  getWeightForDifficulty,
  getDifficultyOptions,
} from './e1rm'
import type { HistoryEntry } from './types'

describe('e1RM calculations', () => {
  describe('baseE1rm (Epley formula)', () => {
    it('returns weight for single rep', () => {
      expect(baseE1rm(100, 1)).toBe(100)
    })

    it('calculates e1RM for multiple reps', () => {
      // 100kg × 10 reps = 100 × (1 + 10/30) = 100 × 1.333 = 133.3
      expect(baseE1rm(100, 10)).toBeCloseTo(133.33, 1)
    })

    it('returns 0 for invalid inputs', () => {
      expect(baseE1rm(0, 5)).toBe(0)
      expect(baseE1rm(100, 0)).toBe(0)
      expect(baseE1rm(-10, 5)).toBe(0)
    })
  })

  describe('getDifficultyMultiplier', () => {
    it('returns 1.07 for easy', () => {
      expect(getDifficultyMultiplier('easy')).toBe(1.07)
    })

    it('returns 1.03 for normal', () => {
      expect(getDifficultyMultiplier('normal')).toBe(1.03)
    })

    it('returns 1.00 for hard', () => {
      expect(getDifficultyMultiplier('hard')).toBe(1.00)
    })

    it('returns 1.03 (default) for undefined', () => {
      expect(getDifficultyMultiplier(undefined)).toBe(1.03)
    })
  })

  describe('getRestMultiplier', () => {
    it('returns 1.10 for rest < 60s', () => {
      expect(getRestMultiplier(30)).toBe(1.10)
      expect(getRestMultiplier(59)).toBe(1.10)
    })

    it('returns 1.05 for rest 60-120s', () => {
      expect(getRestMultiplier(60)).toBe(1.05)
      expect(getRestMultiplier(90)).toBe(1.05)
      expect(getRestMultiplier(120)).toBe(1.05)
    })

    it('returns 1.00 for rest > 120s', () => {
      expect(getRestMultiplier(121)).toBe(1.00)
      expect(getRestMultiplier(180)).toBe(1.00)
    })

    it('returns 1.00 for undefined', () => {
      expect(getRestMultiplier(undefined)).toBe(1.00)
    })
  })

  describe('getFatigueMultiplier', () => {
    it('returns 1.00 for first set', () => {
      expect(getFatigueMultiplier(0)).toBe(1.00)
    })

    it('increases by 1% per set', () => {
      expect(getFatigueMultiplier(1)).toBe(1.01)
      expect(getFatigueMultiplier(2)).toBe(1.02)
      expect(getFatigueMultiplier(5)).toBe(1.05)
    })

    it('caps at 8%', () => {
      expect(getFatigueMultiplier(8)).toBe(1.08)
      expect(getFatigueMultiplier(10)).toBe(1.08)
      expect(getFatigueMultiplier(20)).toBe(1.08)
    })
  })

  describe('calculateSmartE1rm', () => {
    it('applies all multipliers correctly', () => {
      // Base: 100kg × 5 reps = 100 × (1 + 5/30) = 116.67
      // × 1.07 (easy) × 1.10 (short rest) × 1.02 (2nd set)
      const result = calculateSmartE1rm({
        kg: 100,
        reps: 5,
        difficulty: 'easy',
        rest: 30,
        setIndexInSession: 2,
      })

      const expected = 100 * (1 + 5/30) * 1.07 * 1.10 * 1.02
      expect(result).toBeCloseTo(expected, 1)
    })

    it('returns 0 for invalid inputs', () => {
      expect(calculateSmartE1rm({ kg: 0, reps: 5, setIndexInSession: 0 })).toBe(0)
    })
  })

  describe('calculateE1rmMetrics', () => {
    it('returns null values for empty history', () => {
      const metrics = calculateE1rmMetrics([], 'bench')

      expect(metrics.current).toBeNull()
      expect(metrics.peak).toBeNull()
      expect(metrics.trend).toBeNull()
      expect(metrics.suggestedWeights).toEqual([])
    })

    it('returns null for exercise with no sets', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'row', ts: 1000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 2000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')
      expect(metrics.current).toBeNull()
    })

    it('calculates e1RM from completed sessions', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5, difficulty: 'normal' },
        { type: 'session-end', ts: 2000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')
      expect(metrics.current).not.toBeNull()
      expect(metrics.current).toBeGreaterThan(100) // e1RM should be > weight
    })

    it('filters out easy sets (warm-ups)', () => {
      const history: HistoryEntry[] = [
        // Warm-up set (should be ignored)
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10, difficulty: 'easy' },
        // Working set (should be used)
        { type: 'set', exId: 'bench', ts: 2000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 3000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')

      // e1RM should be based on 100kg × 5, not 60kg × 10
      // Base e1RM of 100 × 5 = 116.67, × 1.00 (hard) × 1.00 (no rest) × 1.01 (2nd set)
      expect(metrics.current).toBeGreaterThan(110)
    })

    it('uses peak set from each session', () => {
      const history: HistoryEntry[] = [
        // Session 1
        { type: 'set', exId: 'bench', ts: 1000, kg: 80, reps: 8, difficulty: 'normal' },
        { type: 'set', exId: 'bench', ts: 2000, kg: 100, reps: 5, difficulty: 'hard' }, // Peak
        { type: 'set', exId: 'bench', ts: 3000, kg: 70, reps: 10, difficulty: 'normal' },
        { type: 'session-end', ts: 4000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')

      // Should use the 100kg × 5 set as peak, not average all sets
      expect(metrics.current).not.toBeNull()
    })

    it('calculates peak as highest e1RM ever', () => {
      const history: HistoryEntry[] = [
        // Session 1 - lower
        { type: 'set', exId: 'bench', ts: 1000, kg: 80, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 2000 },
        // Session 2 - higher
        { type: 'set', exId: 'bench', ts: 3000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 4000 },
        // Session 3 - lower again
        { type: 'set', exId: 'bench', ts: 5000, kg: 90, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 6000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')

      // Peak should be from session 2 (100kg × 5)
      const expectedPeakBase = 100 * (1 + 5/30) // ~116.67
      expect(metrics.peak).toBeGreaterThanOrEqual(expectedPeakBase)
    })

    it('calculates trend comparing recent to previous sessions', () => {
      const history: HistoryEntry[] = [
        // Old sessions (lower weight)
        { type: 'set', exId: 'bench', ts: 1000, kg: 80, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 2000 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 80, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 4000 },
        { type: 'set', exId: 'bench', ts: 5000, kg: 80, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 6000 },
        // Recent sessions (higher weight - improving)
        { type: 'set', exId: 'bench', ts: 7000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 8000 },
        { type: 'set', exId: 'bench', ts: 9000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 10000 },
        { type: 'set', exId: 'bench', ts: 11000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 12000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')
      expect(metrics.trend).toBe('up')
    })

    it('returns null trend with insufficient data', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 2000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')
      expect(metrics.trend).toBeNull()
    })

    it('generates suggested weights based on current e1RM', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5, difficulty: 'hard' },
        { type: 'session-end', ts: 2000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')

      expect(metrics.suggestedWeights.length).toBeGreaterThan(0)

      // Check suggestions are properly structured
      const fiveRepSuggestion = metrics.suggestedWeights.find(s => s.targetReps === 5)
      expect(fiveRepSuggestion).toBeDefined()
      expect(fiveRepSuggestion?.suggestedKg).toBeGreaterThan(0)
      expect(fiveRepSuggestion?.description).toBe('Strength')
    })

    it('filters out sets with > 15 reps as unreliable', () => {
      const history: HistoryEntry[] = [
        // High rep set (should be filtered)
        { type: 'set', exId: 'bench', ts: 1000, kg: 40, reps: 20, difficulty: 'hard' },
        // Normal rep set (should be used)
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8, difficulty: 'hard' },
        { type: 'session-end', ts: 3000 },
      ]

      const metrics = calculateE1rmMetrics(history, 'bench')

      // e1RM should be based on 80kg × 8, not 40kg × 20
      // 40 × 20 would give ~67 e1RM, 80 × 8 gives ~101 e1RM
      expect(metrics.current).toBeGreaterThan(90)
    })
  })

  describe('predictDifficulty', () => {
    it('returns null for invalid inputs', () => {
      expect(predictDifficulty(0, 100, 5)).toBeNull()
      expect(predictDifficulty(120, 0, 5)).toBeNull()
      expect(predictDifficulty(120, 100, 0)).toBeNull()
    })

    it('predicts warmup for very light weight', () => {
      // e1RM = 120kg, doing 50kg × 5 = ~58kg e1RM = 48% intensity
      expect(predictDifficulty(120, 50, 5)).toBe('warmup')
    })

    it('predicts easy for light weight', () => {
      // e1RM = 120kg, doing 80kg × 5 = ~93kg e1RM = 78% intensity
      expect(predictDifficulty(120, 80, 5)).toBe('easy')
    })

    it('predicts normal for moderate weight', () => {
      // e1RM = 120kg, doing 90kg × 5 = ~105kg e1RM = 87.5% intensity
      expect(predictDifficulty(120, 90, 5)).toBe('normal')
    })

    it('predicts hard for heavy weight', () => {
      // e1RM = 120kg, doing 105kg × 5 = ~122kg e1RM = 102% intensity
      expect(predictDifficulty(120, 105, 5)).toBe('hard')
    })
  })

  describe('getWeightForDifficulty', () => {
    it('returns 0 for invalid inputs', () => {
      expect(getWeightForDifficulty(0, 5, 'normal')).toBe(0)
      expect(getWeightForDifficulty(120, 0, 'normal')).toBe(0)
    })

    it('returns lighter weight for warmup', () => {
      const warmupKg = getWeightForDifficulty(120, 5, 'warmup')
      const hardKg = getWeightForDifficulty(120, 5, 'hard')
      expect(warmupKg).toBeLessThan(hardKg)
    })

    it('returns progressively heavier weights', () => {
      const warmup = getWeightForDifficulty(120, 5, 'warmup')
      const easy = getWeightForDifficulty(120, 5, 'easy')
      const normal = getWeightForDifficulty(120, 5, 'normal')
      const hard = getWeightForDifficulty(120, 5, 'hard')

      expect(warmup).toBeLessThan(easy)
      expect(easy).toBeLessThan(normal)
      expect(normal).toBeLessThan(hard)
    })

    it('rounds to nearest 0.5kg', () => {
      const kg = getWeightForDifficulty(120, 5, 'normal')
      expect(kg % 0.5).toBe(0)
    })
  })

  describe('getDifficultyOptions', () => {
    it('returns empty array for invalid inputs', () => {
      expect(getDifficultyOptions(0, 5)).toEqual([])
      expect(getDifficultyOptions(120, 0)).toEqual([])
    })

    it('returns all four difficulty options', () => {
      const options = getDifficultyOptions(120, 5)
      expect(options).toHaveLength(4)
      expect(options.map(o => o.difficulty)).toEqual(['warmup', 'easy', 'normal', 'hard'])
    })

    it('includes weight for each difficulty', () => {
      const options = getDifficultyOptions(120, 5)
      options.forEach(option => {
        expect(option.kg).toBeGreaterThan(0)
      })
    })
  })
})
