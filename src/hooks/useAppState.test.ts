import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { INITIAL_STATE, type SetEntry } from '../lib/state'

beforeEach(() => {
  vi.resetModules()
  window.location.hash = ''
  localStorage.clear()
})

describe('useAppState', () => {
  describe('initial state', () => {
    it('returns state and actions', () => {
      const { result } = renderHook(() => useAppState())
      expect(result.current.state).toBeDefined()
      expect(result.current.actions).toBeDefined()
    })

    it('starts with empty state', () => {
      const { result } = renderHook(() => useAppState())
      expect(result.current.state).toEqual(INITIAL_STATE)
    })
  })

  describe('day actions', () => {
    it('addDay adds a day to the plan', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })

      expect(result.current.state.plan.days).toHaveLength(1)
      expect(result.current.state.plan.days[0].name).toBe('Monday')
      expect(result.current.state.plan.days[0].exercises).toEqual([])
    })

    it('addDay sets activeDay if no session exists', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })

      expect(result.current.state.session?.activeDay).toBe('Monday')
    })

    it('renameDay renames an existing day', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })
      act(() => {
        result.current.actions.renameDay('Monday', 'Tuesday')
      })

      expect(result.current.state.plan.days[0].name).toBe('Tuesday')
    })

    it('renameDay updates activeDay if renamed', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })
      act(() => {
        result.current.actions.renameDay('Monday', 'Tuesday')
      })

      expect(result.current.state.session?.activeDay).toBe('Tuesday')
    })

    it('deleteDay removes a day from the plan', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
        result.current.actions.addDay('Tuesday')
      })
      act(() => {
        result.current.actions.deleteDay('Monday')
      })

      expect(result.current.state.plan.days).toHaveLength(1)
      expect(result.current.state.plan.days[0].name).toBe('Tuesday')
    })

    it('setActiveDay changes the active day', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
        result.current.actions.addDay('Tuesday')
      })
      act(() => {
        result.current.actions.setActiveDay('Tuesday')
      })

      expect(result.current.state.session?.activeDay).toBe('Tuesday')
    })

    it('moveDay reorders days', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
        result.current.actions.addDay('Tuesday')
        result.current.actions.addDay('Wednesday')
      })
      act(() => {
        result.current.actions.moveDay(0, 2)
      })

      expect(result.current.state.plan.days.map(d => d.name)).toEqual([
        'Tuesday',
        'Wednesday',
        'Monday',
      ])
    })
  })

  describe('exercise actions', () => {
    it('addExerciseToDay adds exercise to day', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })
      act(() => {
        result.current.actions.addExerciseToDay('Monday', 'ex1')
      })

      expect(result.current.state.plan.days[0].exercises).toEqual(['ex1'])
    })

    it('removeExerciseFromDay removes exercise from day', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })
      act(() => {
        result.current.actions.addExerciseToDay('Monday', 'ex1')
        result.current.actions.addExerciseToDay('Monday', 'ex2')
      })
      act(() => {
        result.current.actions.removeExerciseFromDay('Monday', 'ex1')
      })

      expect(result.current.state.plan.days[0].exercises).toEqual(['ex2'])
    })

    it('moveExerciseInDay reorders exercises', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })
      act(() => {
        result.current.actions.addExerciseToDay('Monday', 'ex1')
        result.current.actions.addExerciseToDay('Monday', 'ex2')
        result.current.actions.addExerciseToDay('Monday', 'ex3')
      })
      act(() => {
        result.current.actions.moveExerciseInDay('Monday', 0, 2)
      })

      expect(result.current.state.plan.days[0].exercises).toEqual(['ex2', 'ex3', 'ex1'])
    })

    it('selectExercise sets currentExId', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.selectExercise('ex1')
      })

      expect(result.current.state.session?.currentExId).toBe('ex1')
    })

    it('setRestTime sets custom rest time for exercise', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.setRestTime('ex1', 120)
      })

      expect(result.current.state.restTimes['ex1']).toBe(120)
    })
  })

  describe('set logging', () => {
    it('logSet adds a set to history', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      expect(result.current.state.history).toHaveLength(1)
      expect(result.current.state.history[0]).toMatchObject({
        type: 'set',
        exId: 'ex1',
        kg: 50,
        reps: 10,
      })
    })

    it('logSet sets restStartedAt', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      expect(result.current.state.session?.restStartedAt).toBeDefined()
    })

    it('removeSet removes a set from history', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.removeSet(ts)
      })

      expect(result.current.state.history).toHaveLength(0)
    })

    it('clearRest clears restStartedAt', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.clearRest()
      })

      expect(result.current.state.session?.restStartedAt).toBeUndefined()
    })
  })

  describe('updateSet', () => {
    it('updates kg on an existing set', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { kg: 60 })
      })

      expect(result.current.state.history[0]).toMatchObject({
        type: 'set',
        exId: 'ex1',
        kg: 60,
        reps: 10,
      })
    })

    it('updates reps on an existing set', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { reps: 12 })
      })

      expect(result.current.state.history[0]).toMatchObject({
        kg: 50,
        reps: 12,
      })
    })

    it('updates rest on an existing set', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { rest: 90 })
      })

      expect(result.current.state.history[0]).toMatchObject({
        rest: 90,
      })
    })

    it('updates difficulty on an existing set', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { difficulty: 'hard' })
      })

      expect(result.current.state.history[0]).toMatchObject({
        difficulty: 'hard',
      })
    })

    it('preserves other fields when updating partially', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10, difficulty: 'normal' })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { kg: 60 })
      })

      expect(result.current.state.history[0]).toMatchObject({
        type: 'set',
        exId: 'ex1',
        kg: 60,
        reps: 10,
        difficulty: 'normal',
        ts,
      })
    })

    it('does nothing when updating non-existent timestamp', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const originalHistory = [...result.current.state.history]

      act(() => {
        result.current.actions.updateSet(999999999, { kg: 60 })
      })

      expect(result.current.state.history).toEqual(originalHistory)
    })

    it('updates multiple fields at once', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts = result.current.state.history[0].ts

      act(() => {
        result.current.actions.updateSet(ts, { kg: 70, reps: 8, difficulty: 'hard' })
      })

      expect(result.current.state.history[0]).toMatchObject({
        kg: 70,
        reps: 8,
        difficulty: 'hard',
      })
    })

    it('only updates the targeted set in history with multiple sets', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })

      const ts1 = result.current.state.history[0].ts

      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 55, reps: 10 })
      })

      act(() => {
        result.current.actions.updateSet(ts1, { kg: 60 })
      })

      expect(result.current.state.history[0]).toMatchObject({ kg: 60 })
      expect(result.current.state.history[1]).toMatchObject({ kg: 55 })

      vi.useRealTimers()
    })
  })

  describe('session management', () => {
    it('endSession adds session-end marker and clears session', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      expect(result.current.state.history).toHaveLength(2)
      expect(result.current.state.history[1].type).toBe('session-end')
      expect(result.current.state.session).toBeNull()
    })

    it('resumeSession removes last session-end marker', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })
      act(() => {
        result.current.actions.resumeSession()
      })

      expect(result.current.state.history).toHaveLength(1)
      expect(result.current.state.history[0].type).toBe('set')
      expect(result.current.state.session).toBeDefined()
    })

    it('deleteSession removes all sets in a session', () => {
      const { result } = renderHook(() => useAppState())

      // First session
      act(() => {
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
        result.current.actions.logSet({ exId: 'ex1', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      const sessionEndTs = result.current.state.history[2].ts

      act(() => {
        result.current.actions.deleteSession(sessionEndTs)
      })

      expect(result.current.state.history).toHaveLength(0)
    })
  })

  describe('moveCycleInSession', () => {
    it('moves a cycle to a different position within a session', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Create 3 groups: A, B, C (each is a cycle/straight set)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-c', kg: 50, reps: 10 })
      })

      const tsA = result.current.state.history[0].ts
      const tsB = result.current.state.history[1].ts
      const tsC = result.current.state.history[2].ts

      // Move A to after C (position 2)
      act(() => {
        result.current.actions.moveCycleInSession([tsA], 2, null)
      })

      // Order should now be: B, C, A
      expect(result.current.state.history[0].ts).toBe(tsB)
      expect(result.current.state.history[1].ts).toBe(tsC)
      expect(result.current.state.history[2].ts).toBe(tsA)

      vi.useRealTimers()
    })

    it('preserves timestamps when moving', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })

      const originalTsA = result.current.state.history[0].ts
      const originalTsB = result.current.state.history[1].ts

      act(() => {
        result.current.actions.moveCycleInSession([originalTsA], 1, null)
      })

      // Timestamps should be preserved
      expect(result.current.state.history[0].ts).toBe(originalTsB)
      expect(result.current.state.history[1].ts).toBe(originalTsA)

      vi.useRealTimers()
    })

    it('does nothing when moving to same position', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })

      const tsA = result.current.state.history[0].ts
      const tsB = result.current.state.history[1].ts

      act(() => {
        result.current.actions.moveCycleInSession([tsA], 0, null)
      })

      // Order should be unchanged
      expect(result.current.state.history[0].ts).toBe(tsA)
      expect(result.current.state.history[1].ts).toBe(tsB)

      vi.useRealTimers()
    })

    it('moves multiple sets as a cycle unit', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Create a drop-set (2 sets of same exercise) followed by another exercise
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 40, reps: 12 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 60, reps: 8 })
      })

      const tsA1 = result.current.state.history[0].ts
      const tsA2 = result.current.state.history[1].ts
      const tsB = result.current.state.history[2].ts

      // Move the entire ex-a cycle after ex-b
      act(() => {
        result.current.actions.moveCycleInSession([tsA1, tsA2], 1, null)
      })

      // Order should now be: B, A1, A2
      expect(result.current.state.history[0].ts).toBe(tsB)
      expect(result.current.state.history[1].ts).toBe(tsA1)
      expect(result.current.state.history[2].ts).toBe(tsA2)

      vi.useRealTimers()
    })

    it('moves cycle within a specific completed session', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Session 1: A, B
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      const sessionEndTs = result.current.state.history[2].ts
      const tsA = result.current.state.history[0].ts
      const tsB = result.current.state.history[1].ts

      // Move B before A within session 1
      act(() => {
        result.current.actions.moveCycleInSession([tsB], 0, sessionEndTs)
      })

      // Order in session should now be: B, A
      expect(result.current.state.history[0].ts).toBe(tsB)
      expect(result.current.state.history[1].ts).toBe(tsA)

      vi.useRealTimers()
    })
  })

  describe('moveCycleToSession', () => {
    it('moves a cycle from current session to a completed session', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Session 1: A, B - then end
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      const session1EndTs = result.current.state.history[2].ts

      // Session 2 (current): C, D
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-c', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-d', kg: 50, reps: 10 })
      })

      const tsC = result.current.state.history[3].ts
      const tsD = result.current.state.history[4].ts

      // Move cycle [C, D] from current session to session 1
      act(() => {
        result.current.actions.moveCycleToSession([tsC, tsD], session1EndTs)
      })

      // Session 1 should now have: A, B, C, D
      // Current session should be empty
      const history = result.current.state.history
      expect(history).toHaveLength(5) // 4 sets + 1 session-end marker
      expect((history[0] as SetEntry).exId).toBe('ex-a')
      expect((history[1] as SetEntry).exId).toBe('ex-b')
      expect((history[2] as SetEntry).exId).toBe('ex-c')
      expect((history[3] as SetEntry).exId).toBe('ex-d')
      expect(history[4].type).toBe('session-end')

      vi.useRealTimers()
    })

    it('moves a cycle from completed session to current session', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Session 1: A, B - then end
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      const tsA = result.current.state.history[0].ts

      // Start new session: C
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-c', kg: 50, reps: 10 })
      })

      // Move A from session 1 to current session (null means current)
      act(() => {
        result.current.actions.moveCycleToSession([tsA], null)
      })

      // Session 1 should now have: B
      // Current session should have: C, A (appended at end)
      const history = result.current.state.history
      expect((history[0] as SetEntry).exId).toBe('ex-b')
      expect(history[1].type).toBe('session-end')
      expect((history[2] as SetEntry).exId).toBe('ex-c')
      expect((history[3] as SetEntry).exId).toBe('ex-a')

      vi.useRealTimers()
    })

    it('moves a cycle between two completed sessions', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      // Session 1: A - then end
      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.endSession()
      })
      const session1EndTs = result.current.state.history[1].ts

      // Session 2: B - then end
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.logSet({ exId: 'ex-b', kg: 50, reps: 10 })
      })
      vi.advanceTimersByTime(1000)
      act(() => {
        result.current.actions.endSession()
      })

      const tsB = result.current.state.history[2].ts

      // Move B from session 2 to session 1
      act(() => {
        result.current.actions.moveCycleToSession([tsB], session1EndTs)
      })

      // Session 1 should now have: A, B, then session-end
      // Session 2 should have just its session-end marker
      const history = result.current.state.history
      expect(history).toHaveLength(4)
      expect((history[0] as SetEntry).exId).toBe('ex-a')
      expect((history[1] as SetEntry).exId).toBe('ex-b')
      expect(history[2].type).toBe('session-end')
      expect(history[3].type).toBe('session-end')

      vi.useRealTimers()
    })

    it('does nothing when source cycle is not found', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.logSet({ exId: 'ex-a', kg: 50, reps: 10 })
      })
      act(() => {
        result.current.actions.endSession()
      })

      const historyBefore = [...result.current.state.history]

      // Try to move non-existent cycle
      act(() => {
        result.current.actions.moveCycleToSession([99999], null)
      })

      expect(result.current.state.history).toEqual(historyBefore)

      vi.useRealTimers()
    })
  })

  describe('URL synchronization', () => {
    it('updates URL when state changes', () => {
      const { result } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })

      expect(window.location.hash).not.toBe('')
    })

    it('persists state across hook re-mounts', async () => {
      const { result, unmount } = renderHook(() => useAppState())

      act(() => {
        result.current.actions.addDay('Monday')
      })

      unmount()

      // Re-mount should restore state from URL
      const { result: result2 } = renderHook(() => useAppState())

      expect(result2.current.state.plan.days[0].name).toBe('Monday')
    })
  })
})
