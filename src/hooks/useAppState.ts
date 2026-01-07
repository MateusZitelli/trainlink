import { useCallback } from 'react'
import type { SetEntry } from '../lib/state'
import { findLastSessionEndIndex, isSetEntry, isSessionEndMarker, predictNextExercise } from '../lib/state'
import { useUrlState, updateStateFn } from '../lib/urlStore'

export function useAppState() {
  // State is now derived directly from URL
  const state = useUrlState()

  // Actions update URL directly (no useState, no useEffect sync)

  const addDay = useCallback((name: string) => {
    updateStateFn(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        days: [...prev.plan.days, { name, exercises: [] }],
      },
      session: prev.session ?? { activeDay: name },
    }))
  }, [])

  const renameDay = useCallback((oldName: string, newName: string) => {
    updateStateFn(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        days: prev.plan.days.map(d =>
          d.name === oldName ? { ...d, name: newName } : d
        ),
      },
      session: prev.session?.activeDay === oldName
        ? { ...prev.session, activeDay: newName }
        : prev.session,
    }))
  }, [])

  const deleteDay = useCallback((name: string) => {
    updateStateFn(prev => {
      const newDays = prev.plan.days.filter(d => d.name !== name)
      return {
        ...prev,
        plan: { ...prev.plan, days: newDays },
        session: prev.session?.activeDay === name
          ? { ...prev.session, activeDay: newDays[0]?.name }
          : prev.session,
      }
    })
  }, [])

  const setActiveDay = useCallback((name: string) => {
    updateStateFn(prev => ({
      ...prev,
      session: { ...prev.session, activeDay: name, currentExId: undefined },
    }))
  }, [])

  const addExerciseToDay = useCallback((dayName: string, exerciseId: string) => {
    updateStateFn(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        days: prev.plan.days.map(d =>
          d.name === dayName
            ? { ...d, exercises: [...d.exercises, exerciseId] }
            : d
        ),
      },
    }))
  }, [])

  const removeExerciseFromDay = useCallback((dayName: string, exerciseId: string) => {
    updateStateFn(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        days: prev.plan.days.map(d =>
          d.name === dayName
            ? { ...d, exercises: d.exercises.filter(e => e !== exerciseId) }
            : d
        ),
      },
    }))
  }, [])

  const selectExercise = useCallback((exerciseId: string | undefined) => {
    updateStateFn(prev => ({
      ...prev,
      session: {
        ...prev.session,
        currentExId: exerciseId,
      },
    }))
  }, [])

  const logSet = useCallback((entry: Omit<SetEntry, 'ts' | 'type'>) => {
    const now = Date.now()
    updateStateFn(prev => {
      // Calculate rest duration from previous set if exists
      const lastEntry = prev.history.length > 0 ? prev.history[prev.history.length - 1] : null
      const updatedHistory = lastEntry && isSetEntry(lastEntry) && !lastEntry.rest
        ? prev.history.slice(0, -1).concat({
            ...lastEntry,
            rest: Math.round((now - lastEntry.ts) / 1000),
          })
        : prev.history

      // Add new set to history
      const newHistory = [...updatedHistory, { type: 'set' as const, ...entry, ts: now }]

      // Predict next exercise and auto-expand it
      const prediction = predictNextExercise(newHistory, prev.restTimes)

      return {
        ...prev,
        history: newHistory,
        session: {
          ...prev.session,
          currentExId: prediction?.exId, // Auto-expand predicted exercise
          restStartedAt: now,
        },
      }
    })
  }, [])

  const clearRest = useCallback(() => {
    updateStateFn(prev => ({
      ...prev,
      session: prev.session
        ? { ...prev.session, restStartedAt: undefined }
        : null,
    }))
  }, [])

  // Session management
  const endSession = useCallback(() => {
    updateStateFn(prev => ({
      ...prev,
      history: [...prev.history, { type: 'session-end' as const, ts: Date.now() }],
      session: null,
    }))
  }, [])

  const resumeSession = useCallback(() => {
    updateStateFn(prev => {
      const lastEndIdx = findLastSessionEndIndex(prev.history)
      if (lastEndIdx === -1) return prev

      return {
        ...prev,
        history: [
          ...prev.history.slice(0, lastEndIdx),
          ...prev.history.slice(lastEndIdx + 1),
        ],
        session: prev.session ?? {},
      }
    })
  }, [])

  const deleteSession = useCallback((sessionEndTs: number) => {
    updateStateFn(prev => {
      const endIdx = prev.history.findIndex(
        e => isSessionEndMarker(e) && e.ts === sessionEndTs
      )
      if (endIdx === -1) return prev

      // Find previous session-end marker (or start of history)
      let startIdx = 0
      for (let i = endIdx - 1; i >= 0; i--) {
        if (isSessionEndMarker(prev.history[i])) {
          startIdx = i + 1
          break
        }
      }

      return {
        ...prev,
        history: [
          ...prev.history.slice(0, startIdx),
          ...prev.history.slice(endIdx + 1),
        ],
      }
    })
  }, [])

  // Reordering
  const moveExerciseInDay = useCallback(
    (dayName: string, fromIndex: number, toIndex: number) => {
      updateStateFn(prev => ({
        ...prev,
        plan: {
          ...prev.plan,
          days: prev.plan.days.map(d => {
            if (d.name !== dayName) return d
            const exercises = [...d.exercises]
            const [moved] = exercises.splice(fromIndex, 1)
            exercises.splice(toIndex, 0, moved)
            return { ...d, exercises }
          }),
        },
      }))
    },
    []
  )

  const moveDay = useCallback((fromIndex: number, toIndex: number) => {
    updateStateFn(prev => {
      const days = [...prev.plan.days]
      const [moved] = days.splice(fromIndex, 1)
      days.splice(toIndex, 0, moved)
      return {
        ...prev,
        plan: { ...prev.plan, days },
      }
    })
  }, [])

  const setRestTime = useCallback((exId: string, seconds: number) => {
    updateStateFn(prev => ({
      ...prev,
      restTimes: {
        ...prev.restTimes,
        [exId]: seconds,
      },
    }))
  }, [])

  const removeSet = useCallback((ts: number) => {
    updateStateFn(prev => ({
      ...prev,
      history: prev.history.filter(entry => entry.ts !== ts),
    }))
  }, [])

  const updateSet = useCallback((ts: number, updates: Partial<Omit<SetEntry, 'ts' | 'type'>>) => {
    updateStateFn(prev => ({
      ...prev,
      history: prev.history.map(entry =>
        isSetEntry(entry) && entry.ts === ts
          ? { ...entry, ...updates }
          : entry
      ),
    }))
  }, [])

  const restoreSets = useCallback((sets: SetEntry[]) => {
    updateStateFn(prev => ({
      ...prev,
      history: [...prev.history, ...sets].sort((a, b) => a.ts - b.ts),
    }))
  }, [])

  const moveCycleInSession = useCallback((
    cycleSetTimestamps: number[],
    targetIndex: number,
    sessionEndTs: number | null
  ) => {
    updateStateFn(prev => {
      // Find session bounds
      let endIdx = prev.history.length
      let startIdx = 0

      if (sessionEndTs !== null) {
        // Find the session end marker
        endIdx = prev.history.findIndex(
          e => isSessionEndMarker(e) && e.ts === sessionEndTs
        )
        if (endIdx === -1) return prev

        // Find the start of this session (after previous session-end or start of history)
        for (let i = endIdx - 1; i >= 0; i--) {
          if (isSessionEndMarker(prev.history[i])) {
            startIdx = i + 1
            break
          }
        }
      } else {
        // Current session - find the last session-end marker
        const lastEndIdx = findLastSessionEndIndex(prev.history)
        startIdx = lastEndIdx === -1 ? 0 : lastEndIdx + 1
      }

      // Extract session entries (sets only, no session-end markers)
      const before = prev.history.slice(0, startIdx)
      const sessionEntries = prev.history.slice(startIdx, endIdx).filter(isSetEntry)
      const after = prev.history.slice(endIdx)

      // Find current index of the cycle
      const cycleIndices = cycleSetTimestamps.map(ts =>
        sessionEntries.findIndex(e => e.ts === ts)
      ).filter(i => i !== -1)

      if (cycleIndices.length === 0) return prev

      const cycleStartIdx = Math.min(...cycleIndices)

      // Don't do anything if moving to same position
      if (cycleStartIdx === targetIndex) return prev

      // Remove cycle sets from session
      const cycleSets = cycleSetTimestamps
        .map(ts => sessionEntries.find(e => e.ts === ts))
        .filter((s): s is SetEntry => s !== undefined)

      const remainingSets = sessionEntries.filter(
        e => !cycleSetTimestamps.includes(e.ts)
      )

      // Insert cycle at target position (targetIndex is the final position for the first set of the cycle)
      remainingSets.splice(Math.min(remainingSets.length, Math.max(0, targetIndex)), 0, ...cycleSets)

      return {
        ...prev,
        history: [...before, ...remainingSets, ...after],
      }
    })
  }, [])

  return {
    state,
    actions: {
      addDay,
      renameDay,
      deleteDay,
      setActiveDay,
      addExerciseToDay,
      removeExerciseFromDay,
      selectExercise,
      logSet,
      clearRest,
      endSession,
      resumeSession,
      deleteSession,
      moveExerciseInDay,
      moveDay,
      setRestTime,
      removeSet,
      updateSet,
      restoreSets,
      moveCycleInSession,
    },
  }
}
