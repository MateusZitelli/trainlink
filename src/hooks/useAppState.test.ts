import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { INITIAL_STATE } from '../lib/state'

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
