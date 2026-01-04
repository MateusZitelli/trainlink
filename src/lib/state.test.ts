import { describe, it, expect } from 'vitest'
import {
  isSetEntry,
  isSessionEndMarker,
  getLastSet,
  getFirstSetOfLastSession,
  getDefaultRest,
  getCurrentSessionSets,
  getSetsForExerciseToday,
  predictNextExercise,
  predictExerciseValues,
  predictDropSetTrend,
  formatDetailedPrediction,
  type SetEntry,
  type HistoryEntry,
  type NextExercisePrediction,
} from './state'

describe('state.ts pure functions', () => {
  describe('type guards', () => {
    it('isSetEntry returns true for set entries', () => {
      const entry: HistoryEntry = { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10 }
      expect(isSetEntry(entry)).toBe(true)
    })

    it('isSetEntry returns false for session-end markers', () => {
      const entry: HistoryEntry = { type: 'session-end', ts: 1000 }
      expect(isSetEntry(entry)).toBe(false)
    })

    it('isSessionEndMarker returns true for session-end markers', () => {
      const entry: HistoryEntry = { type: 'session-end', ts: 1000 }
      expect(isSessionEndMarker(entry)).toBe(true)
    })
  })

  describe('getLastSet', () => {
    it('returns the last set for an exercise', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 65, reps: 8 },
        { type: 'set', exId: 'row', ts: 3000, kg: 50, reps: 12 },
      ]
      const lastBench = getLastSet(history, 'bench')
      expect(lastBench?.kg).toBe(65)
    })

    it('returns undefined if no sets for exercise', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10 },
      ]
      expect(getLastSet(history, 'squat')).toBeUndefined()
    })
  })

  describe('getFirstSetOfLastSession', () => {
    it('returns first set from most recent completed session', () => {
      // Day 1: Drop-set 100 → 80 → 60, session ends
      // Expected: return 100kg (first set), not 60kg (last set)
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
        { type: 'session-end', ts: 4000 },
      ]
      const firstSet = getFirstSetOfLastSession(history, 'bench')
      expect(firstSet?.kg).toBe(100)
      expect(firstSet?.reps).toBe(5)
    })

    it('returns first set from last session when multiple sessions exist', () => {
      // Day 1: 100 → 80 → 60
      // Day 2: 90 → 70 → 50 (different starting weight)
      // Expected: return 90kg from Day 2 (most recent)
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
        { type: 'session-end', ts: 4000 },
        { type: 'set', exId: 'bench', ts: 50000, kg: 90, reps: 6 },
        { type: 'set', exId: 'bench', ts: 51000, kg: 70, reps: 9 },
        { type: 'set', exId: 'bench', ts: 52000, kg: 50, reps: 12 },
        { type: 'session-end', ts: 53000 },
      ]
      const firstSet = getFirstSetOfLastSession(history, 'bench')
      expect(firstSet?.kg).toBe(90)
      expect(firstSet?.reps).toBe(6)
    })

    it('skips sessions without the requested exercise', () => {
      // Day 1: bench 100 → 80
      // Day 2: only rows (no bench)
      // Expected: return 100kg from Day 1
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
        { type: 'session-end', ts: 3000 },
        { type: 'set', exId: 'row', ts: 50000, kg: 60, reps: 10 },
        { type: 'set', exId: 'row', ts: 51000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 52000 },
      ]
      const firstSet = getFirstSetOfLastSession(history, 'bench')
      expect(firstSet?.kg).toBe(100)
      expect(firstSet?.reps).toBe(5)
    })

    it('returns first set when no sessions are completed (ongoing session)', () => {
      // No session-end markers yet
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      ]
      const firstSet = getFirstSetOfLastSession(history, 'bench')
      expect(firstSet?.kg).toBe(100)
      expect(firstSet?.reps).toBe(5)
    })

    it('returns undefined if exercise was never done', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'session-end', ts: 2000 },
      ]
      expect(getFirstSetOfLastSession(history, 'squat')).toBeUndefined()
    })

    it('handles circuit training - returns first set of exercise in session', () => {
      // Day 1: bench → row → bench → row (circuit)
      // Expected: return first bench (100kg), not second bench in circuit
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'row', ts: 2000, kg: 60, reps: 10 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 100, reps: 4 },
        { type: 'set', exId: 'row', ts: 4000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 5000 },
      ]
      const firstSet = getFirstSetOfLastSession(history, 'bench')
      expect(firstSet?.kg).toBe(100)
      expect(firstSet?.reps).toBe(5)
    })
  })

  describe('getDefaultRest', () => {
    it('uses custom rest time if set', () => {
      const history: HistoryEntry[] = []
      const restTimes = { 'bench': 120 }
      expect(getDefaultRest(history, 'bench', restTimes)).toBe(120)
    })

    it('uses last rest time from history', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10, rest: 90 },
      ]
      expect(getDefaultRest(history, 'bench')).toBe(90)
    })

    it('defaults to 90 seconds', () => {
      const history: HistoryEntry[] = []
      expect(getDefaultRest(history, 'bench')).toBe(90)
    })
  })

  describe('getCurrentSessionSets', () => {
    it('returns sets after last session-end', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 2000 },
        { type: 'set', exId: 'squat', ts: 3000, kg: 100, reps: 5 },
      ]
      const sets = getCurrentSessionSets(history)
      expect(sets).toHaveLength(1)
      expect(sets[0].exId).toBe('squat')
    })

    it('returns all sets if no session-end', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 60, reps: 10 },
        { type: 'set', exId: 'squat', ts: 2000, kg: 100, reps: 5 },
      ]
      const sets = getCurrentSessionSets(history)
      expect(sets).toHaveLength(2)
    })
  })
})

describe('predictDropSetTrend', () => {
  it('detects decreasing weight trend', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
    ]
    const prediction = predictDropSetTrend(sets, 'bench')
    expect(prediction?.kg).toBe(60) // 100 → 80 → 60 (-20 trend)
  })

  it('detects increasing reps trend', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
    ]
    const prediction = predictDropSetTrend(sets, 'bench')
    expect(prediction?.reps).toBe(11) // 5 → 8 → 11 (+3 trend)
  })

  it('does not predict weight below 0', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'lateral', ts: 1000, kg: 20, reps: 12 },
      { type: 'set', exId: 'lateral', ts: 2000, kg: 10, reps: 15 },
    ]
    const prediction = predictDropSetTrend(sets, 'lateral')
    expect(prediction?.kg).toBe(0) // Would be -10, clamped to 0
  })

  it('does not predict reps below 1', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'heavy', ts: 1000, kg: 150, reps: 3 },
      { type: 'set', exId: 'heavy', ts: 2000, kg: 160, reps: 1 },
    ]
    const prediction = predictDropSetTrend(sets, 'heavy')
    expect(prediction?.reps).toBe(1) // Would be -1, clamped to 1
  })

  it('handles triple drop-set', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
    ]
    const prediction = predictDropSetTrend(sets, 'bench')
    expect(prediction?.kg).toBe(40) // Continues -20 trend
    expect(prediction?.reps).toBe(14) // Continues +3 trend
  })

  it('returns null for single set (no trend)', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
    ]
    const prediction = predictDropSetTrend(sets, 'bench')
    expect(prediction).toBeNull()
  })

  it('only considers consecutive sets of same exercise', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'row', ts: 2000, kg: 60, reps: 10 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 80, reps: 8 },
    ]
    // Only the last bench set counts - no consecutive trend
    const prediction = predictDropSetTrend(sets, 'bench')
    expect(prediction).toBeNull()
  })

  it('uses most recent consecutive block', () => {
    const sets: SetEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'row', ts: 3000, kg: 60, reps: 10 },
      { type: 'set', exId: 'bench', ts: 4000, kg: 90, reps: 6 },
      { type: 'set', exId: 'bench', ts: 5000, kg: 70, reps: 9 },
    ]
    const prediction = predictDropSetTrend(sets, 'bench')
    // Uses 90 → 70 trend, not 100 → 80
    expect(prediction?.kg).toBe(50) // 90 → 70 → 50 (-20 trend)
    expect(prediction?.reps).toBe(12) // 6 → 9 → 12 (+3 trend)
  })
})

describe('predictNextExercise with drop-set trends', () => {
  it('applies trend when predicting same exercise continuation', () => {
    const history: HistoryEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
    ]
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('bench')
    expect(prediction?.kg).toBe(60) // Trend applied
    expect(prediction?.reps).toBe(11) // Trend applied
  })

  it('does not apply trend when predicting different exercise', () => {
    const history: HistoryEntry[] = [
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'row', ts: 3000, kg: 60, reps: 10 },
      { type: 'set', exId: 'bench', ts: 4000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 5000, kg: 80, reps: 8 },
    ]
    // Pattern: bench → row → bench, should predict row
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('row')
    expect(prediction?.kg).toBe(60) // Uses last row set values, not trend
    expect(prediction?.reps).toBe(10)
  })
})

describe('predictNextExercise with historical drop-set trends across sessions', () => {
  it('predicts trend from previous session after first set in new session', () => {
    // Day 1: Drop-set 100 → 80 → 60, then end session
    // Day 2: First set at 100kg, should predict 80kg based on historical trend
    const history: HistoryEntry[] = [
      // Previous session - drop-set pattern
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
      { type: 'session-end', ts: 4000 },
      // New session - first set
      { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 5 },
    ]
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('bench')
    expect(prediction?.kg).toBe(80) // Should follow historical trend: 100 → 80
    expect(prediction?.reps).toBe(8) // Should follow historical trend: 5 → 8
  })

  it('predicts third set based on historical trend pattern', () => {
    // Day 1: Drop-set 100 → 80 → 60
    // Day 2: First two sets at 100, 80 - should predict 60
    const history: HistoryEntry[] = [
      // Previous session
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
      { type: 'session-end', ts: 4000 },
      // New session - two sets following same pattern
      { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 101000, kg: 80, reps: 8 },
    ]
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('bench')
    // Current session has trend 100→80, so should predict 60
    expect(prediction?.kg).toBe(60)
    expect(prediction?.reps).toBe(11)
  })

  it('uses most recent historical session for trend', () => {
    // Day 1: Drop-set 100 → 80 → 60
    // Day 2: Drop-set 90 → 70 → 50 (different pattern)
    // Day 3: First set at 90kg, should predict 70kg based on Day 2's trend
    const history: HistoryEntry[] = [
      // First session - old trend
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
      { type: 'session-end', ts: 4000 },
      // Second session - newer trend
      { type: 'set', exId: 'bench', ts: 50000, kg: 90, reps: 6 },
      { type: 'set', exId: 'bench', ts: 51000, kg: 70, reps: 9 },
      { type: 'set', exId: 'bench', ts: 52000, kg: 50, reps: 12 },
      { type: 'session-end', ts: 53000 },
      // New session - first set
      { type: 'set', exId: 'bench', ts: 100000, kg: 90, reps: 6 },
    ]
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('bench')
    expect(prediction?.kg).toBe(70) // Follow most recent trend: 90 → 70
    expect(prediction?.reps).toBe(9) // Follow most recent trend: 6 → 9
  })

  it('handles circuit with drop-sets across sessions', () => {
    // Day 1: bench drop-set → row → bench drop-set → row (circuit)
    // Day 2: bench first set, should predict row (cycle), then bench should follow drop-set trend
    const history: HistoryEntry[] = [
      // Previous session - circuit with drop-sets
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'row', ts: 3000, kg: 60, reps: 10 },
      { type: 'set', exId: 'bench', ts: 4000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 5000, kg: 80, reps: 8 },
      { type: 'set', exId: 'row', ts: 6000, kg: 60, reps: 10 },
      { type: 'session-end', ts: 7000 },
      // New session
      { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 5 },
    ]
    const prediction = predictNextExercise(history, {})
    // With only one bench set, should predict continuation with historical trend
    expect(prediction?.exId).toBe('bench')
    expect(prediction?.kg).toBe(80) // Historical drop-set trend
    expect(prediction?.reps).toBe(8)
  })

  it('does not apply historical trend when starting weight differs', () => {
    // Day 1: Drop-set 100 → 80 → 60
    // Day 2: First set at 120kg (different starting point)
    // Should not blindly apply old trend, use last set values
    const history: HistoryEntry[] = [
      // Previous session
      { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
      { type: 'session-end', ts: 4000 },
      // New session - different starting weight
      { type: 'set', exId: 'bench', ts: 100000, kg: 120, reps: 4 },
    ]
    const prediction = predictNextExercise(history, {})
    expect(prediction?.exId).toBe('bench')
    // Since starting weight differs, fall back to last set values
    expect(prediction?.kg).toBe(120)
    expect(prediction?.reps).toBe(4)
  })
})

describe('predictExerciseValues (unified prediction)', () => {
  describe('new session - no sets yet', () => {
    it('returns first set of last session with start reason', () => {
      // Day 1: Drop-set 100 → 80 → 60, session ends
      // Day 2: No sets yet, should predict 100kg (first set, not 60kg last set)
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 11 },
        { type: 'session-end', ts: 4000 },
      ]
      const prediction = predictExerciseValues(history, {}, 'bench')
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(100) // First set of last session
      expect(prediction?.reps).toBe(5)
      // 3 sets = drop-set pattern, so we get history-dropset-start
      expect(prediction?.reason.type).toBe('history-dropset-start')
    })

    it('returns null for never-done exercise', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'session-end', ts: 2000 },
      ]
      const prediction = predictExerciseValues(history, {}, 'squat')
      expect(prediction).toBeNull()
    })
  })

  describe('ongoing session - has sets', () => {
    it('uses prediction when exercise is predicted next', () => {
      // Has sets, prediction should kick in
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
      ]
      const prediction = predictExerciseValues(history, {}, 'bench')
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(60) // Trend: 100→80→60
      expect(prediction?.reps).toBe(11) // Trend: 5→8→11
      expect(prediction?.reason.type).toBe('trend')
    })

    it('uses continue reason when only one set done', () => {
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
      ]
      const prediction = predictExerciseValues(history, {}, 'bench')
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(5)
      expect(prediction?.reason.type).toBe('continue')
    })

    it('returns starting values for exercise not done in current session', () => {
      // Session has bench, but asking for row (not done yet in this session)
      const history: HistoryEntry[] = [
        // Previous session with row
        { type: 'set', exId: 'row', ts: 1000, kg: 60, reps: 10 },
        { type: 'set', exId: 'row', ts: 2000, kg: 50, reps: 12 },
        { type: 'session-end', ts: 3000 },
        // Current session only has bench
        { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 5 },
      ]
      const prediction = predictExerciseValues(history, {}, 'row')
      expect(prediction?.exId).toBe('row')
      expect(prediction?.kg).toBe(60) // First set of last session for row
      expect(prediction?.reps).toBe(10)
      // 2 sets = drop-set pattern
      expect(prediction?.reason.type).toBe('history-dropset-start')
    })
  })

  describe('across sessions', () => {
    it('uses first set from most recent session with the exercise', () => {
      // Day 1: bench 100→80
      // Day 2: only row
      // Day 3: asking for bench should use Day 1's first set
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 5 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 8 },
        { type: 'session-end', ts: 3000 },
        { type: 'set', exId: 'row', ts: 50000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 51000 },
      ]
      const prediction = predictExerciseValues(history, {}, 'bench')
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(5)
      // 2 sets in Day 1 = drop-set pattern
      expect(prediction?.reason.type).toBe('history-dropset-start')
    })
  })

  describe('formatDetailedPrediction', () => {
    it('formats cycle prediction with pattern and values', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 60,
        reps: 10,
        rest: 90,
        reason: { type: 'cycle', pattern: ['bench', 'row'] },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Bench → Row cycle: 60kg × 10')
    })

    it('formats trend prediction showing previous and next values', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 80,
        reps: 12,
        rest: 90,
        reason: { type: 'trend', delta: { kg: -20, reps: 2 } },
      }
      const result = formatDetailedPrediction(prediction)
      // prevKg = 80 - (-20) = 100, prevReps = 12 - 2 = 10
      expect(result).toBe('Trend: 100kg × 10 → 80kg × 12')
    })

    it('formats trend with only kg change', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 80,
        reps: 10,
        rest: 90,
        reason: { type: 'trend', delta: { kg: -20, reps: 0 } },
      }
      const result = formatDetailedPrediction(prediction)
      // prevKg = 80 - (-20) = 100, prevReps = 10 - 0 = 10
      expect(result).toBe('Trend: 100kg × 10 → 80kg × 10')
    })

    it('formats trend with only reps change', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 100,
        reps: 12,
        rest: 90,
        reason: { type: 'trend', delta: { kg: 0, reps: 2 } },
      }
      const result = formatDetailedPrediction(prediction)
      // prevKg = 100 - 0 = 100, prevReps = 12 - 2 = 10
      expect(result).toBe('Trend: 100kg × 10 → 100kg × 12')
    })

    it('formats history-dropset prediction', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 80,
        reps: 12,
        rest: 90,
        reason: {
          type: 'history-dropset',
          matchedSession: 1,
          pattern: [
            { kg: 100, reps: 10 },
            { kg: 80, reps: 12 },
          ],
          currentIndex: 1,
        },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Following last session: 100kg × 10 → (80kg × 12)')
    })

    it('formats history-sequence prediction', () => {
      const prediction: NextExercisePrediction = {
        exId: 'row',
        kg: 60,
        reps: 10,
        rest: 90,
        reason: { type: 'history-sequence', matchedSession: 2 },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Based on workout 2 ago: 60kg × 10')
    })

    it('formats continue prediction', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 100,
        reps: 10,
        rest: 90,
        reason: { type: 'continue' },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Continue: 100kg × 10')
    })

    it('formats start prediction', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 100,
        reps: 5,
        rest: 90,
        reason: { type: 'start' },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('From last session: 100kg × 5')
    })
  })

  describe('cross-session drop-set prediction', () => {
    it('predicts drop-set continuation on Day 2 after matching first set', () => {
      // Day 1: Pyramid set 100kg x 10 → 110kg x 8 → 120kg x 6
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 110, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 120, reps: 6 },
        { type: 'session-end', ts: 4000 },
        // Day 2: User logs first set matching Day 1's first set
        { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 10 },
      ]

      const prediction = predictNextExercise(history, {})

      // Should predict next set in the historical pattern (110kg x 8)
      expect(prediction).not.toBeNull()
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(110)
      expect(prediction?.reps).toBe(8)
      expect(prediction?.reason.type).toBe('history-dropset')
    })

    it('shows drop-set formatted text with full pattern', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 110,
        reps: 8,
        rest: 90,
        reason: {
          type: 'history-dropset',
          matchedSession: 1,
          pattern: [
            { kg: 100, reps: 10 },
            { kg: 110, reps: 8 },
            { kg: 120, reps: 6 },
          ],
          currentIndex: 1, // Predicting the 2nd set (index 1)
        },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Following last session: 100kg × 10 → (110kg × 8) → 120kg × 6')
    })

    it('Day 2 first prediction shows starting values from Day 1', () => {
      // Day 1: Pyramid set
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 110, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 120, reps: 6 },
        { type: 'session-end', ts: 4000 },
        // Day 2: No sets yet
      ]

      // Use predictExerciseValues for a specific exercise with no current session sets
      const prediction = predictExerciseValues(history, {}, 'bench')

      expect(prediction).not.toBeNull()
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(10)
      // 3 sets in Day 1 = drop-set pattern
      expect(prediction?.reason.type).toBe('history-dropset-start')
    })

    it('Day 2 after first set uses predictExerciseValues to get history-dropset', () => {
      // Day 1: Pyramid set 100kg x 10 → 110kg x 8 → 120kg x 6
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 110, reps: 8 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 120, reps: 6 },
        { type: 'session-end', ts: 4000 },
        // Day 2: User logs first set matching Day 1's pattern
        { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 10 },
      ]

      // This is what the UI calls for a specific exercise
      const prediction = predictExerciseValues(history, {}, 'bench')

      // Should show history-dropset prediction for next set (110kg x 8)
      expect(prediction).not.toBeNull()
      expect(prediction?.kg).toBe(110)
      expect(prediction?.reps).toBe(8)
      expect(prediction?.reason.type).toBe('history-dropset')

      // Verify the formatted text shows full pattern with current highlighted
      const text = formatDetailedPrediction(prediction!)
      expect(text).toBe('Following last session: 100kg × 10 → (110kg × 8) → 120kg × 6')
    })
  })

  describe('predict first exercise when session is empty', () => {
    it('predicts first exercise from last session when no sets logged yet', () => {
      // Previous session: started with bench, then rows
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 12 },
        { type: 'set', exId: 'row', ts: 3000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 4000 },
        // New session: no sets yet
      ]

      const prediction = predictNextExercise(history, {})

      expect(prediction).not.toBeNull()
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(10)
      expect(prediction?.reason.type).toBe('session-start')
    })

    it('returns null when no previous session exists', () => {
      const history: HistoryEntry[] = []

      const prediction = predictNextExercise(history, {})

      expect(prediction).toBeNull()
    })

    it('returns null when only session-end markers exist', () => {
      const history: HistoryEntry[] = [
        { type: 'session-end', ts: 1000 },
      ]

      const prediction = predictNextExercise(history, {})

      expect(prediction).toBeNull()
    })

    it('uses first exercise from most recent completed session', () => {
      // Session 1: started with squats
      // Session 2: started with bench
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'squat', ts: 1000, kg: 100, reps: 5 },
        { type: 'session-end', ts: 2000 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 80, reps: 10 },
        { type: 'set', exId: 'row', ts: 4000, kg: 60, reps: 10 },
        { type: 'session-end', ts: 5000 },
        // New session: no sets yet
      ]

      const prediction = predictNextExercise(history, {})

      // Should suggest bench (first exercise from most recent session)
      expect(prediction?.exId).toBe('bench')
      expect(prediction?.kg).toBe(80)
      expect(prediction?.reps).toBe(10)
    })

    it('formats session-start prediction correctly', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 100,
        reps: 10,
        rest: 90,
        reason: { type: 'session-start' },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Start with: 100kg × 10')
    })
  })

  describe('new day resets counters and shows previous drop-set pattern', () => {
    it('getSetsForExerciseToday returns empty after session-end', () => {
      // Previous day: did 3 sets of bench
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 12 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 15 },
        { type: 'session-end', ts: 4000 },
        // New day: no sets yet
      ]

      const todaySets = getCurrentSessionSets(history)
      const benchSetsToday = todaySets.filter(s => s.exId === 'bench')

      // Should be empty - previous session is closed
      expect(benchSetsToday).toHaveLength(0)
    })

    it('getCurrentSessionSets returns only sets after last session-end', () => {
      // Previous day
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 12 },
        { type: 'session-end', ts: 3000 },
        // New day: logged one set
        { type: 'set', exId: 'bench', ts: 100000, kg: 100, reps: 10 },
      ]

      const todaySets = getCurrentSessionSets(history)

      // Should only have the one set from today
      expect(todaySets).toHaveLength(1)
      expect(todaySets[0].kg).toBe(100)
    })

    it('predictExerciseValues shows drop-set pattern before first set of new day', () => {
      // Previous day: drop-set pattern 100 → 80 → 60
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 12 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 15 },
        { type: 'session-end', ts: 4000 },
        // New day: no sets yet
      ]

      const prediction = predictExerciseValues(history, {}, 'bench')

      // Should show the first set values
      expect(prediction).not.toBeNull()
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(10)
      // Should indicate this is from a drop-set pattern
      expect(prediction?.reason.type).toBe('history-dropset-start')
    })

    it('history-dropset-start includes the full pattern from previous session', () => {
      // Previous day: drop-set pattern
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: 2000, kg: 80, reps: 12 },
        { type: 'set', exId: 'bench', ts: 3000, kg: 60, reps: 15 },
        { type: 'session-end', ts: 4000 },
      ]

      const prediction = predictExerciseValues(history, {}, 'bench')

      expect(prediction?.reason.type).toBe('history-dropset-start')
      if (prediction?.reason.type === 'history-dropset-start') {
        expect(prediction.reason.pattern).toEqual([
          { kg: 100, reps: 10 },
          { kg: 80, reps: 12 },
          { kg: 60, reps: 15 },
        ])
      }
    })

    it('formats history-dropset-start with pattern preview', () => {
      const prediction: NextExercisePrediction = {
        exId: 'bench',
        kg: 100,
        reps: 10,
        rest: 90,
        reason: {
          type: 'history-dropset-start',
          pattern: [
            { kg: 100, reps: 10 },
            { kg: 80, reps: 12 },
            { kg: 60, reps: 15 },
          ],
        },
      }
      const result = formatDetailedPrediction(prediction)
      expect(result).toBe('Last session: 100kg × 10 → 80kg × 12 → 60kg × 15')
    })

    it('uses start reason for single-set exercise from previous day', () => {
      // Previous day: only one set of bench
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: 1000, kg: 100, reps: 10 },
        { type: 'session-end', ts: 2000 },
      ]

      const prediction = predictExerciseValues(history, {}, 'bench')

      // Single set should use 'start' reason, not 'history-dropset-start'
      expect(prediction?.reason.type).toBe('start')
      expect(prediction?.kg).toBe(100)
      expect(prediction?.reps).toBe(10)
    })
  })

  describe('getSetsForExerciseToday respects session-end markers', () => {
    it('returns empty after session-end even on same calendar day', () => {
      // Same day: did 3 sets of bench, session ends, asking for today's sets
      // Bug: was returning 3 sets because it filtered by calendar day
      // Fix: should return 0 because session ended
      const now = Date.now()
      const history: HistoryEntry[] = [
        { type: 'set', exId: 'bench', ts: now - 3000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: now - 2000, kg: 80, reps: 12 },
        { type: 'set', exId: 'bench', ts: now - 1000, kg: 60, reps: 15 },
        { type: 'session-end', ts: now },
      ]

      const todaySets = getSetsForExerciseToday(history, 'bench')

      // Should be empty - session ended, new session has no sets yet
      expect(todaySets).toHaveLength(0)
    })

    it('returns only sets from current session', () => {
      const now = Date.now()
      const history: HistoryEntry[] = [
        // Previous session (same day)
        { type: 'set', exId: 'bench', ts: now - 5000, kg: 100, reps: 10 },
        { type: 'set', exId: 'bench', ts: now - 4000, kg: 80, reps: 12 },
        { type: 'session-end', ts: now - 3000 },
        // Current session (same day)
        { type: 'set', exId: 'bench', ts: now - 1000, kg: 100, reps: 10 },
      ]

      const todaySets = getSetsForExerciseToday(history, 'bench')

      // Should only have the 1 set from current session, not 3
      expect(todaySets).toHaveLength(1)
      expect(todaySets[0].kg).toBe(100)
    })
  })
})
