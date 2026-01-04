// Helper functions for querying and manipulating state

import type { HistoryEntry, SetEntry, ParsedSession } from './types'
import { isSessionEndMarker, isSetEntry } from './guards'

// Find index of last session-end marker
export function findLastSessionEndIndex(history: HistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) return i
  }
  return -1
}

// Get the last set for an exercise
export function getLastSet(history: HistoryEntry[], exId: string): SetEntry | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (isSetEntry(entry) && entry.exId === exId) return entry
  }
  return undefined
}

// Get the first set of an exercise from the most recent completed session
export function getFirstSetOfLastSession(history: HistoryEntry[], exId: string): SetEntry | undefined {
  const sessionEndIndices: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      sessionEndIndices.push(i)
    }
  }

  if (sessionEndIndices.length === 0) {
    for (const entry of history) {
      if (isSetEntry(entry) && entry.exId === exId) return entry
    }
    return undefined
  }

  for (let i = sessionEndIndices.length - 1; i >= 0; i--) {
    const sessionEndIdx = sessionEndIndices[i]
    const sessionStartIdx = i > 0 ? sessionEndIndices[i - 1] + 1 : 0

    for (let j = sessionStartIdx; j < sessionEndIdx; j++) {
      const entry = history[j]
      if (isSetEntry(entry) && entry.exId === exId) {
        return entry
      }
    }
  }

  return undefined
}

// Get default rest time for an exercise
export function getDefaultRest(
  history: HistoryEntry[],
  exId: string,
  restTimes?: Record<string, number>
): number {
  if (restTimes && restTimes[exId] !== undefined) {
    return restTimes[exId]
  }
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (isSetEntry(entry) && entry.exId === exId && entry.rest !== undefined) {
      return entry.rest
    }
  }
  return 90 // Global default: 90 seconds
}

// Get sets for an exercise in the current session
export function getSetsForExerciseToday(history: HistoryEntry[], exId: string): SetEntry[] {
  const currentSets = getCurrentSessionSets(history)
  return currentSets.filter(s => s.exId === exId)
}

// Get current session sets (after last session-end marker)
export function getCurrentSessionSets(history: HistoryEntry[]): SetEntry[] {
  const sets: SetEntry[] = []
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (isSessionEndMarker(entry)) break
    if (isSetEntry(entry)) sets.unshift(entry)
  }
  return sets
}

// Parse history into sessions (for pattern matching)
export function parseHistoryIntoSessions(history: HistoryEntry[]): ParsedSession[] {
  const sessions: ParsedSession[] = []
  let currentSets: SetEntry[] = []

  for (const entry of history) {
    if (isSetEntry(entry)) {
      currentSets.push(entry)
    } else if (isSessionEndMarker(entry)) {
      if (currentSets.length > 0) {
        const exerciseSequence: string[] = []
        for (const set of currentSets) {
          if (!exerciseSequence.includes(set.exId)) {
            exerciseSequence.push(set.exId)
          }
        }
        sessions.push({ sets: currentSets, exerciseSequence })
      }
      currentSets = []
    }
  }

  return sessions
}

// Build exercise order from current sets (consecutive same exercise = 1 entry)
export function buildExerciseOrder(currentSets: SetEntry[]): string[] {
  const exerciseOrder: string[] = []
  for (const set of currentSets) {
    if (exerciseOrder.length === 0 || exerciseOrder[exerciseOrder.length - 1] !== set.exId) {
      exerciseOrder.push(set.exId)
    }
  }
  return exerciseOrder
}
