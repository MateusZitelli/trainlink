import { useState, useEffect, useCallback } from 'react'
import type { AppState, SetEntry } from '../lib/state'
import { findLastSessionEndIndex, isSetEntry, isSessionEndMarker, predictNextExercise } from '../lib/state'
import { loadFromUrl, syncToUrl } from '../lib/url'

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadFromUrl())

  // Sync to URL on state change
  useEffect(() => {
    syncToUrl(state)
  }, [state])

  // Actions

  const addDay = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        days: [...prev.plan.days, { name, exercises: [] }],
      },
      session: prev.session ?? { activeDay: name },
    }))
  }, [])

  const renameDay = useCallback((oldName: string, newName: string) => {
    setState(prev => ({
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
    setState(prev => {
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
    setState(prev => ({
      ...prev,
      session: { ...prev.session, activeDay: name, currentExId: undefined },
    }))
  }, [])

  const addExerciseToDay = useCallback((dayName: string, exerciseId: string) => {
    setState(prev => ({
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
    setState(prev => ({
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
    setState(prev => ({
      ...prev,
      session: {
        ...prev.session,
        currentExId: exerciseId,
      },
    }))
  }, [])

  const logSet = useCallback((entry: Omit<SetEntry, 'ts' | 'type'>) => {
    const now = Date.now()
    setState(prev => {
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
    setState(prev => ({
      ...prev,
      session: prev.session
        ? { ...prev.session, restStartedAt: undefined }
        : null,
    }))
  }, [])

  // Session management
  const endSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      history: [...prev.history, { type: 'session-end' as const, ts: Date.now() }],
      session: null,
    }))
  }, [])

  const resumeSession = useCallback(() => {
    setState(prev => {
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
    setState(prev => {
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
      setState(prev => ({
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
    setState(prev => {
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
    setState(prev => ({
      ...prev,
      restTimes: {
        ...prev.restTimes,
        [exId]: seconds,
      },
    }))
  }, [])

  const removeSet = useCallback((ts: number) => {
    setState(prev => ({
      ...prev,
      history: prev.history.filter(entry => entry.ts !== ts),
    }))
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
    },
  }
}
