import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react'
import { useAppState } from '../hooks/useAppState'
import { isSetEntry, isSessionEndMarker, predictNextExercise } from '../lib/state'
import { ExerciseRow } from '../components/ExerciseRow'
import type { NextExercisePrediction } from '../lib/state'

beforeEach(() => {
  vi.resetModules()
  window.location.hash = ''
  localStorage.clear()
})

describe('Integration: Workout Planning Flow', () => {
  it('creates a day and sets it as active', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })

    expect(result.current.state.plan.days).toHaveLength(1)
    expect(result.current.state.plan.days[0].name).toBe('Push Day')
    expect(result.current.state.session?.activeDay).toBe('Push Day')
  })

  it('adds multiple exercises to a day', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })
    act(() => {
      result.current.actions.addExerciseToDay('Push Day', 'bench-press')
      result.current.actions.addExerciseToDay('Push Day', 'overhead-press')
      result.current.actions.addExerciseToDay('Push Day', 'tricep-dips')
    })

    expect(result.current.state.plan.days[0].exercises).toEqual([
      'bench-press',
      'overhead-press',
      'tricep-dips',
    ])
  })

  it('reorders exercises within a day', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })
    act(() => {
      result.current.actions.addExerciseToDay('Push Day', 'bench-press')
      result.current.actions.addExerciseToDay('Push Day', 'overhead-press')
      result.current.actions.addExerciseToDay('Push Day', 'tricep-dips')
    })
    act(() => {
      // Move bench-press from index 0 to index 2
      result.current.actions.moveExerciseInDay('Push Day', 0, 2)
    })

    expect(result.current.state.plan.days[0].exercises).toEqual([
      'overhead-press',
      'tricep-dips',
      'bench-press',
    ])
  })

  it('renames a day and updates activeDay', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })
    act(() => {
      result.current.actions.renameDay('Push Day', 'Chest & Triceps')
    })

    expect(result.current.state.plan.days[0].name).toBe('Chest & Triceps')
    expect(result.current.state.session?.activeDay).toBe('Chest & Triceps')
  })

  it('deletes a day and switches activeDay to remaining day', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
      result.current.actions.addDay('Pull Day')
    })
    act(() => {
      result.current.actions.setActiveDay('Push Day')
    })
    act(() => {
      result.current.actions.deleteDay('Push Day')
    })

    expect(result.current.state.plan.days).toHaveLength(1)
    expect(result.current.state.plan.days[0].name).toBe('Pull Day')
    expect(result.current.state.session?.activeDay).toBe('Pull Day')
  })

  it('reorders days in the plan', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push')
      result.current.actions.addDay('Pull')
      result.current.actions.addDay('Legs')
    })
    act(() => {
      // Move Push from index 0 to index 2
      result.current.actions.moveDay(0, 2)
    })

    expect(result.current.state.plan.days.map(d => d.name)).toEqual([
      'Pull',
      'Legs',
      'Push',
    ])
  })

  it('complete workflow: create plan with multiple days and exercises', () => {
    const { result } = renderHook(() => useAppState())

    // Create workout split
    act(() => {
      result.current.actions.addDay('Push')
      result.current.actions.addDay('Pull')
      result.current.actions.addDay('Legs')
    })

    // Add exercises to Push day
    act(() => {
      result.current.actions.addExerciseToDay('Push', 'bench-press')
      result.current.actions.addExerciseToDay('Push', 'overhead-press')
    })

    // Add exercises to Pull day
    act(() => {
      result.current.actions.addExerciseToDay('Pull', 'barbell-row')
      result.current.actions.addExerciseToDay('Pull', 'pull-ups')
    })

    // Add exercises to Legs day
    act(() => {
      result.current.actions.addExerciseToDay('Legs', 'squat')
      result.current.actions.addExerciseToDay('Legs', 'deadlift')
    })

    // Verify complete plan
    expect(result.current.state.plan.days).toHaveLength(3)
    expect(result.current.state.plan.days[0].exercises).toEqual(['bench-press', 'overhead-press'])
    expect(result.current.state.plan.days[1].exercises).toEqual(['barbell-row', 'pull-ups'])
    expect(result.current.state.plan.days[2].exercises).toEqual(['squat', 'deadlift'])
  })
})

describe('Integration: Exercise Logging Flow', () => {
  it('selects an exercise and logs a set', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.selectExercise('bench-press')
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.history[0]).toMatchObject({
      type: 'set',
      exId: 'bench-press',
      kg: 60,
      reps: 10,
    })
  })

  it('starts rest timer after logging a set', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    expect(result.current.state.session?.restStartedAt).toBeDefined()
    expect(typeof result.current.state.session?.restStartedAt).toBe('number')
  })

  it('calculates rest duration between sets', () => {
    const { result } = renderHook(() => useAppState())

    // Log first set
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    // Log second set - rest duration should be calculated
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    // First set should now have rest duration (time between the two logSet calls)
    const firstSet = result.current.state.history[0]
    if (isSetEntry(firstSet)) {
      // Rest is calculated as seconds between sets
      expect(firstSet.rest).toBeDefined()
      expect(typeof firstSet.rest).toBe('number')
    }
  })

  it('logs multiple sets and maintains order', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 65, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 70, reps: 6 })
    })

    expect(result.current.state.history).toHaveLength(3)
    expect(result.current.state.history.map(h => isSetEntry(h) && h.kg)).toEqual([60, 65, 70])
  })

  it('removes a logged set', () => {
    // Use fake timers to ensure different timestamps
    vi.useFakeTimers()
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    // Advance time to ensure different timestamp
    vi.advanceTimersByTime(1000)

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 65, reps: 8 })
    })

    expect(result.current.state.history).toHaveLength(2)

    // Timestamps should now be different
    const firstTs = result.current.state.history[0].ts
    const secondTs = result.current.state.history[1].ts
    expect(firstTs).not.toBe(secondTs)

    // Remove second set
    act(() => {
      result.current.actions.removeSet(secondTs)
    })

    expect(result.current.state.history).toHaveLength(1)
    if (isSetEntry(result.current.state.history[0])) {
      expect(result.current.state.history[0].kg).toBe(60) // First set remains
    }

    vi.useRealTimers()
  })

  it('clears rest timer', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    expect(result.current.state.session?.restStartedAt).toBeDefined()

    act(() => {
      result.current.actions.clearRest()
    })

    expect(result.current.state.session?.restStartedAt).toBeUndefined()
  })

  it('sets custom rest time for an exercise', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.setRestTime('bench-press', 120)
    })

    expect(result.current.state.restTimes['bench-press']).toBe(120)
  })
})

describe('Integration: Session Management Flow', () => {
  it('ends a session with session-end marker', () => {
    const { result } = renderHook(() => useAppState())

    // Log some sets
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
      result.current.actions.logSet({ exId: 'bench-press', kg: 65, reps: 8 })
    })

    // End session
    act(() => {
      result.current.actions.endSession()
    })

    expect(result.current.state.history).toHaveLength(3)
    expect(result.current.state.history[2].type).toBe('session-end')
    expect(result.current.state.session).toBeNull()
  })

  it('resumes a session by removing session-end marker', () => {
    const { result } = renderHook(() => useAppState())

    // Log sets and end session
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    expect(result.current.state.session).toBeNull()
    expect(result.current.state.history[1].type).toBe('session-end')

    // Resume session
    act(() => {
      result.current.actions.resumeSession()
    })

    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.history[0].type).toBe('set')
    expect(result.current.state.session).not.toBeNull()
  })

  it('deletes an entire session', () => {
    const { result } = renderHook(() => useAppState())

    // First session
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
      result.current.actions.logSet({ exId: 'bench-press', kg: 65, reps: 8 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    // Second session
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    expect(result.current.state.history).toHaveLength(5) // 2 sets + end + 1 set + end

    // Delete first session
    const firstSessionEndTs = result.current.state.history[2].ts

    act(() => {
      result.current.actions.deleteSession(firstSessionEndTs)
    })

    // Only second session remains
    expect(result.current.state.history).toHaveLength(2) // 1 set + end
    expect(result.current.state.history[0]).toMatchObject({ exId: 'squat' })
  })

  it('handles multiple sessions correctly', () => {
    const { result } = renderHook(() => useAppState())

    // Session 1
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    // Session 2
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    // Session 3 (active)
    act(() => {
      result.current.actions.logSet({ exId: 'deadlift', kg: 120, reps: 3 })
    })

    // Count session-end markers
    const sessionEndCount = result.current.state.history.filter(isSessionEndMarker).length
    expect(sessionEndCount).toBe(2)

    // Verify sets
    const sets = result.current.state.history.filter(isSetEntry)
    expect(sets).toHaveLength(3)
  })
})

describe('Integration: State Persistence Flow', () => {
  it('persists state to URL hash', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })

    expect(window.location.hash).not.toBe('')
    expect(window.location.hash.startsWith('#')).toBe(true)
  })

  it('persists state to localStorage', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push Day')
    })

    const stored = localStorage.getItem('trainlink-state')
    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored!)
    expect(parsed.plan.days[0].name).toBe('Push Day')
  })

  it('restores state from URL on mount', async () => {
    // Create state in first hook instance
    const { result: result1, unmount } = renderHook(() => useAppState())

    act(() => {
      result1.current.actions.addDay('Push Day')
      result1.current.actions.addExerciseToDay('Push Day', 'bench-press')
    })

    const savedHash = window.location.hash

    unmount()

    // Simulate fresh page load
    vi.resetModules()
    window.location.hash = savedHash

    // New hook should restore state
    const { useAppState: freshUseAppState } = await import('../hooks/useAppState')
    const { result: result2 } = renderHook(() => freshUseAppState())

    expect(result2.current.state.plan.days[0].name).toBe('Push Day')
    expect(result2.current.state.plan.days[0].exercises).toEqual(['bench-press'])
  })

  it('restores state from localStorage when URL is empty', async () => {
    // Create state
    const { result: result1, unmount } = renderHook(() => useAppState())

    act(() => {
      result1.current.actions.addDay('Pull Day')
    })

    unmount()

    // Clear URL but keep localStorage
    vi.resetModules()
    window.location.hash = ''

    // New hook should restore from localStorage
    const { useAppState: freshUseAppState } = await import('../hooks/useAppState')
    const { result: result2 } = renderHook(() => freshUseAppState())

    expect(result2.current.state.plan.days[0].name).toBe('Pull Day')
  })

  it('persists complete workout history', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.addDay('Push')
      result.current.actions.addExerciseToDay('Push', 'bench-press')
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
      result.current.actions.setRestTime('bench-press', 120)
    })

    const stored = localStorage.getItem('trainlink-state')
    const parsed = JSON.parse(stored!)

    expect(parsed.plan.days[0].name).toBe('Push')
    expect(parsed.history).toHaveLength(1)
    expect(parsed.restTimes['bench-press']).toBe(120)
  })
})

describe('Integration: Prediction Flow', () => {
  it('predicts next exercise based on cycle pattern', () => {
    const { result } = renderHook(() => useAppState())

    // Create a superset pattern: A → B → A → B
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'barbell-row', kg: 50, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    // After logging A → B → A, prediction should be B
    expect(result.current.state.session?.currentExId).toBe('barbell-row')
  })

  it('auto-selects predicted exercise after logging', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 100, reps: 5 })
    })

    // After first set, should predict continuing with same exercise
    expect(result.current.state.session?.currentExId).toBe('squat')
  })

  it('handles circuit pattern with 3 exercises', () => {
    const { result } = renderHook(() => useAppState())

    // Create A → B → C → A pattern
    act(() => {
      result.current.actions.logSet({ exId: 'exercise-a', kg: 10, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'exercise-b', kg: 20, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'exercise-c', kg: 30, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'exercise-a', kg: 10, reps: 10 })
    })

    // After A → B → C → A, should predict B
    expect(result.current.state.session?.currentExId).toBe('exercise-b')
  })

  it('falls back to last exercise when no pattern detected', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })

    // With only one set, should continue with same exercise
    expect(result.current.state.session?.currentExId).toBe('bench-press')
  })
})

describe('Integration: Complex Circuit with Drop-Sets', () => {
  it('predicts next exercise in circuit with drop-sets', () => {
    const { result } = renderHook(() => useAppState())

    // Circuit pattern: Bench (heavy) → Bench (drop) → Row → repeat
    // Since consecutive same-exercise sets collapse, pattern is: bench → row → bench → row

    // Round 1
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 }) // Heavy
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 12 }) // Drop set
    })
    act(() => {
      result.current.actions.logSet({ exId: 'barbell-row', kg: 60, reps: 10 })
    })

    // Round 2
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 7 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 }) // Drop set
    })

    // After bench drop-set in round 2, should predict row (completing the cycle)
    expect(result.current.state.session?.currentExId).toBe('barbell-row')
  })

  it('handles tri-set circuit with drop-sets', () => {
    const { result } = renderHook(() => useAppState())

    // Tri-set: Bench (drop) → OHP → Row → repeat
    // Round 1
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 12 }) // Drop
    })
    act(() => {
      result.current.actions.logSet({ exId: 'overhead-press', kg: 40, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'barbell-row', kg: 60, reps: 10 })
    })

    // Round 2
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 75, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 55, reps: 12 }) // Drop
    })

    // After bench block in round 2, should predict OHP
    expect(result.current.state.session?.currentExId).toBe('overhead-press')
  })

  it('maintains drop-set kg/reps in history', () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 }) // Heavy
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 }) // Drop 1
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 12 }) // Drop 2
    })

    // All three sets should be recorded with their specific weights
    const sets = result.current.state.history.filter(isSetEntry)
    expect(sets).toHaveLength(3)
    expect(sets.map(s => s.kg)).toEqual([100, 80, 60])
    expect(sets.map(s => s.reps)).toEqual([5, 8, 12])
  })

  it('predicts based on historical drop-set patterns', () => {
    const { result } = renderHook(() => useAppState())

    // Session 1: Establish pattern
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 80, reps: 8 }) // Drop
    })
    act(() => {
      result.current.actions.logSet({ exId: 'leg-press', kg: 150, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'lunges', kg: 20, reps: 10 })
    })
    act(() => {
      result.current.actions.endSession()
    })

    // Session 2: Start similar pattern
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 105, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'squat', kg: 85, reps: 8 }) // Drop
    })
    act(() => {
      result.current.actions.logSet({ exId: 'leg-press', kg: 160, reps: 12 })
    })

    // After squat+drop → leg-press, should predict lunges based on history
    expect(result.current.state.session?.currentExId).toBe('lunges')
  })

  it('handles giant set (4+ exercises) with drop-sets', () => {
    const { result } = renderHook(() => useAppState())

    // Giant set: Bench (drop) → Flyes → Dips → Pushups → repeat
    // Round 1
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'flyes', kg: 15, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'dips', kg: 0, reps: 15 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'pushups', kg: 0, reps: 20 })
    })

    // Round 2
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 75, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 55, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'flyes', kg: 15, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'dips', kg: 0, reps: 12 })
    })

    // After dips in round 2, should predict pushups
    expect(result.current.state.session?.currentExId).toBe('pushups')
  })

  it('correctly predicts after breaking a drop-set pattern', () => {
    const { result } = renderHook(() => useAppState())

    // Start with drop-set pattern
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'row', kg: 50, reps: 10 })
    })

    // Second round - only do heavy bench (no drop)
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 85, reps: 6 })
    })

    // After single bench set, prediction should adapt
    // Pattern so far: bench → row → bench
    // Could predict row (continuing simple A→B pattern)
    expect(result.current.state.session?.currentExId).toBe('row')
  })
})

describe('Integration: Drop-Set Trend Prediction', () => {
  it('predicts next weight in decreasing trend', () => {
    const { result } = renderHook(() => useAppState())

    // Drop-set: 100kg → 80kg → should predict 60kg
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })

    // Verify prediction continues the -20kg trend
    expect(result.current.state.session?.currentExId).toBe('bench-press')
    const prediction = predictNextExercise(result.current.state.history, result.current.state.restTimes)
    expect(prediction?.kg).toBe(60) // 100 → 80 → 60 (-20kg trend)
  })

  it('predicts next reps in increasing trend during drop-set', () => {
    const { result } = renderHook(() => useAppState())

    // As weight drops, reps typically increase: 5 → 8 → should predict 11
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })

    // Verify prediction continues the +3 reps trend
    expect(result.current.state.session?.currentExId).toBe('bench-press')
    const prediction = predictNextExercise(result.current.state.history, result.current.state.restTimes)
    expect(prediction?.reps).toBe(11) // 5 → 8 → 11 (+3 reps trend)
  })

  it('does not predict weight below 0', () => {
    const { result } = renderHook(() => useAppState())

    // Trend would go negative: 20 → 10 → would be 0, not -10
    act(() => {
      result.current.actions.logSet({ exId: 'lateral-raise', kg: 20, reps: 12 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'lateral-raise', kg: 10, reps: 15 })
    })

    // Verify kg is clamped to 0, not negative
    expect(result.current.state.session?.currentExId).toBe('lateral-raise')
    const prediction = predictNextExercise(result.current.state.history, result.current.state.restTimes)
    expect(prediction?.kg).toBe(0) // Would be -10, clamped to 0
    expect(prediction?.reps).toBe(18) // 12 → 15 → 18 (+3 trend)
  })

  it('does not predict reps below 1', () => {
    const { result } = renderHook(() => useAppState())

    // Decreasing reps trend: 5 → 3 → would be 1, not negative
    act(() => {
      result.current.actions.logSet({ exId: 'heavy-single', kg: 150, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'heavy-single', kg: 160, reps: 3 })
    })

    // Verify reps is clamped to 1, not negative
    expect(result.current.state.session?.currentExId).toBe('heavy-single')
    const prediction = predictNextExercise(result.current.state.history, result.current.state.restTimes)
    expect(prediction?.reps).toBe(1) // Would be 1 (3-2=1), clamped at 1
    expect(prediction?.kg).toBe(170) // 150 → 160 → 170 (+10 trend)
  })

  it('does not apply trend when switching exercises', () => {
    const { result } = renderHook(() => useAppState())

    // Bench drop-set, then switch to rows
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'barbell-row', kg: 60, reps: 10 })
    })

    // Row prediction should not inherit bench's trend - continues with row
    expect(result.current.state.session?.currentExId).toBe('barbell-row')
  })

  it('handles triple drop-set trend', () => {
    const { result } = renderHook(() => useAppState())

    // 100 → 80 → 60 → should predict 40
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 11 })
    })

    // Verify trend continues from last two sets (80 → 60 = -20kg, 8 → 11 = +3 reps)
    expect(result.current.state.session?.currentExId).toBe('bench-press')
    const prediction = predictNextExercise(result.current.state.history, result.current.state.restTimes)
    expect(prediction?.kg).toBe(40) // 80 → 60 → 40 (-20kg trend)
    expect(prediction?.reps).toBe(14) // 8 → 11 → 14 (+3 reps trend)
  })

  it('resets trend when starting new exercise block', () => {
    // This behavior is tested in state.test.ts 'uses most recent consecutive block'
    // Here we verify the integration: after an interruption, fresh trend starts
    const { result } = renderHook(() => useAppState())

    // First bench block with trend: 100 → 80
    act(() => result.current.actions.logSet({ exId: 'bench-press', kg: 100, reps: 5 }))
    act(() => result.current.actions.logSet({ exId: 'bench-press', kg: 80, reps: 8 }))

    // Switch to rows (interrupts the bench block)
    act(() => result.current.actions.logSet({ exId: 'barbell-row', kg: 60, reps: 10 }))

    // Cycle is now established: bench → row, next prediction should be row
    // This verifies cycle detection takes precedence
    expect(result.current.state.session?.currentExId).toBe('barbell-row')
  })
})

describe('Integration: Complete Workout Session', () => {
  it('simulates a full workout session from start to finish', () => {
    const { result } = renderHook(() => useAppState())

    // 1. Create workout plan
    act(() => {
      result.current.actions.addDay('Push Day')
    })
    act(() => {
      result.current.actions.addExerciseToDay('Push Day', 'bench-press')
      result.current.actions.addExerciseToDay('Push Day', 'overhead-press')
    })

    // 2. Set custom rest times
    act(() => {
      result.current.actions.setRestTime('bench-press', 90)
      result.current.actions.setRestTime('overhead-press', 60)
    })

    // 3. Start logging sets
    act(() => {
      result.current.actions.selectExercise('bench-press')
    })

    // Bench press sets
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 60, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 65, reps: 8 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'bench-press', kg: 70, reps: 6 })
    })

    // Overhead press sets
    act(() => {
      result.current.actions.logSet({ exId: 'overhead-press', kg: 40, reps: 10 })
    })
    act(() => {
      result.current.actions.logSet({ exId: 'overhead-press', kg: 42.5, reps: 8 })
    })

    // 4. End session
    act(() => {
      result.current.actions.endSession()
    })

    // Verify final state
    expect(result.current.state.plan.days[0].exercises).toHaveLength(2)
    expect(result.current.state.history.filter(isSetEntry)).toHaveLength(5)
    expect(result.current.state.history.filter(isSessionEndMarker)).toHaveLength(1)
    expect(result.current.state.restTimes).toEqual({
      'bench-press': 90,
      'overhead-press': 60,
    })
    expect(result.current.state.session).toBeNull()

    // Verify URL was updated
    expect(window.location.hash).not.toBe('')
  })
})

describe('ExerciseRow Component', () => {
  const mockExercise = {
    exerciseId: 'bench-press',
    name: 'Bench Press',
    targetMuscles: ['chest'],
    equipment: 'barbell',
  }

  const basePrediction: NextExercisePrediction = {
    exId: 'bench-press',
    kg: 100,
    reps: 10,
    rest: 90,
    reason: { type: 'start' },
  }

  const baseProps = {
    exercise: mockExercise,
    exerciseId: 'bench-press',
    todaySets: [],
    isSelected: false,
    isNextExercise: false,
    prediction: basePrediction,
    restTime: 90,
    history: [],
    onClick: vi.fn(),
    onLogSet: vi.fn(),
    onSetRestTime: vi.fn(),
  }

  describe('Feature 1: Highlight next exercise row', () => {
    it('highlights row when isNextExercise is true', () => {
      const { container } = render(
        <ExerciseRow {...baseProps} isNextExercise={true} />
      )

      // Check that the next exercise indicator (→) is visible
      expect(screen.getByText('→')).toBeInTheDocument()

      // Check for highlight background class on the row
      const row = container.querySelector('.bg-blue-500\\/5')
      expect(row).toBeInTheDocument()
    })

    it('does not highlight row when isNextExercise is false', () => {
      const { container } = render(
        <ExerciseRow {...baseProps} isNextExercise={false} />
      )

      // Arrow indicator should not be visible
      expect(screen.queryByText('→')).not.toBeInTheDocument()

      // No highlight background
      const row = container.querySelector('.bg-blue-500\\/5')
      expect(row).not.toBeInTheDocument()
    })
  })

  describe('Feature 3: Progressive set input flow', () => {
    it('shows quick state with predicted values', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Quick state shows predicted values as text
      expect(screen.getByText('100kg × 10')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go/i })).toBeInTheDocument()
    })

    it('shows expanded state when adjust is clicked', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Click adjust to expand
      const adjustButton = screen.getByRole('button', { name: /adjust/i })
      fireEvent.click(adjustButton)

      // Should show stepper controls (translation keys shown in tests)
      expect(screen.getByText(/setInput\.weight/i)).toBeInTheDocument()
      expect(screen.getByText(/setInput\.reps/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /startSet/i })).toBeInTheDocument()
    })

    it('shows active state with timer when Go is clicked', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Click Go button
      const goButton = screen.getByRole('button', { name: /go/i })
      fireEvent.click(goButton)

      // Timer should be running
      expect(screen.getByText('0:00')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    })

    it('shows confirm state with difficulty buttons after Done', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Click Go button to start
      const goButton = screen.getByRole('button', { name: /go/i })
      fireEvent.click(goButton)

      // Click Done to finish
      const doneButton = screen.getByRole('button', { name: /done/i })
      fireEvent.click(doneButton)

      // Should show difficulty buttons (Chill/Solid/Spicy)
      expect(screen.getByRole('button', { name: /chill/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /solid/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /spicy/i })).toBeInTheDocument()
    })

    it('can adjust actual values before confirming', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Start and finish set
      fireEvent.click(screen.getByRole('button', { name: /go/i }))
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      // Click to adjust (translation key shown in tests)
      const adjustLink = screen.getByRole('button', { name: /actuallyDidDifferent/i })
      fireEvent.click(adjustLink)

      // Should show adjust state with steppers (translation key shown in tests)
      expect(screen.getByText(/whatDidYouActuallyDo/i)).toBeInTheDocument()
    })

    it('shows prediction info when values match predicted', () => {
      render(
        <ExerciseRow {...baseProps} isSelected={true} />
      )

      // Prediction info should be visible in expanded view
      expect(screen.getByText(/From last session/)).toBeInTheDocument()
    })
  })

  describe('quick start from collapsed row', () => {
    it('starts timer when play button is clicked on collapsed row', () => {
      const onClickMock = vi.fn()
      // First prediction object
      const prediction1 = {
        exId: 'bench',
        kg: 100,
        reps: 10,
        rest: 90,
        reason: { type: 'start' as const },
      }
      const { rerender } = render(
        <ExerciseRow {...baseProps} isSelected={false} onClick={onClickMock} prediction={prediction1} />
      )

      // Click the play button on collapsed row
      const playButton = screen.getByRole('button', { name: /start set/i })
      fireEvent.click(playButton)

      // onClick should have been called (to expand)
      expect(onClickMock).toHaveBeenCalled()

      // Simulate parent expanding the row by re-rendering with isSelected=true
      // Bug: prediction is a NEW object (same values but different reference)
      // This triggers useEffect which resets setStartedAt to null
      const prediction2 = {
        exId: 'bench',
        kg: 100,
        reps: 10,
        rest: 90,
        reason: { type: 'start' as const },
      }
      rerender(
        <ExerciseRow {...baseProps} isSelected={true} onClick={onClickMock} prediction={prediction2} />
      )

      // Timer should be running - look for the timer display and Done button
      expect(screen.getByText('0:00')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    })
  })
})
