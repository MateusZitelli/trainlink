export interface Day {
  name: string
  exercises: string[] // ExerciseDB exercise IDs
}

export interface SetEntry {
  type: 'set'
  exId: string
  ts: number
  kg: number
  reps: number
  rest?: number
}

export interface SessionEndMarker {
  type: 'session-end'
  ts: number
}

export type HistoryEntry = SetEntry | SessionEndMarker

// Type guards
export function isSessionEndMarker(entry: HistoryEntry): entry is SessionEndMarker {
  return entry.type === 'session-end'
}

export function isSetEntry(entry: HistoryEntry): entry is SetEntry {
  return entry.type === 'set'
}

// Find index of last session-end marker
export function findLastSessionEndIndex(history: HistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) return i
  }
  return -1
}

export interface Session {
  activeDay?: string
  currentExId?: string
  restStartedAt?: number
}

export interface AppState {
  plan: {
    days: Day[]
  }
  history: HistoryEntry[]
  session: Session | null
  restTimes: Record<string, number> // Custom rest times per exercise ID (in seconds)
}

export const INITIAL_STATE: AppState = {
  plan: { days: [] },
  history: [],
  session: null,
  restTimes: {},
}

// Derived data helpers

export function getLastSet(history: HistoryEntry[], exId: string): SetEntry | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (isSetEntry(entry) && entry.exId === exId) return entry
  }
  return undefined
}

export function getDefaultRest(
  history: HistoryEntry[],
  exId: string,
  restTimes?: Record<string, number>
): number {
  // Check custom rest time first
  if (restTimes && restTimes[exId] !== undefined) {
    return restTimes[exId]
  }
  // Fall back to last used rest time
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (isSetEntry(entry) && entry.exId === exId && entry.rest !== undefined) {
      return entry.rest
    }
  }
  return 90 // Global default: 90 seconds
}

export function getSetsForExerciseToday(history: HistoryEntry[], exId: string): SetEntry[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfDay = today.getTime()

  return history.filter((h): h is SetEntry => isSetEntry(h) && h.exId === exId && h.ts >= startOfDay)
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
interface ParsedSession {
  sets: SetEntry[]
  exerciseSequence: string[] // Unique exercise IDs in order of first appearance
}

function parseHistoryIntoSessions(history: HistoryEntry[]): ParsedSession[] {
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

  // Don't include current session in pattern matching
  return sessions
}

export interface NextExercisePrediction {
  exId: string
  kg: number
  reps: number
  rest: number
  confidence: number // 0-1, based on how many matching sessions
}

// Detect cycle pattern in exercise order and predict next exercise
function predictFromCurrentCycle(
  exerciseOrder: string[],
  currentSets: SetEntry[],
  history: HistoryEntry[],
  restTimes: Record<string, number>
): NextExercisePrediction | null {
  if (exerciseOrder.length < 3) return null

  // Try to find a valid cycle, starting from the beginning
  // If a cycle breaks, try to find a new cycle starting from the break point
  let startIdx = 0
  let cycle: { pattern: string[]; length: number } | null = null

  while (startIdx < exerciseOrder.length - 2) {
    const subOrder = exerciseOrder.slice(startIdx)
    const firstEx = subOrder[0]

    // Find when first exercise repeats
    let cycleLength = -1
    for (let i = 1; i < subOrder.length; i++) {
      if (subOrder[i] === firstEx) {
        cycleLength = i
        break
      }
    }

    if (cycleLength < 2) {
      startIdx++
      continue
    }

    // Verify pattern
    const pattern = subOrder.slice(0, cycleLength)
    let breakIdx = -1
    for (let i = 0; i < subOrder.length; i++) {
      if (subOrder[i] !== pattern[i % cycleLength]) {
        breakIdx = i
        break
      }
    }

    if (breakIdx === -1) {
      // Valid cycle found!
      cycle = { pattern, length: subOrder.length }
      break
    } else {
      // Cycle broken, try from break point
      startIdx = startIdx + breakIdx
    }
  }

  if (!cycle) return null

  // Predict the next exercise in the cycle
  const positionInCycle = cycle.length % cycle.pattern.length
  const nextExId = cycle.pattern[positionInCycle]

  // Find the last set for this exercise to get kg/reps
  const lastSetForEx = [...currentSets].reverse().find(s => s.exId === nextExId)
  const historicalSet = lastSetForEx ?? getLastSet(history, nextExId)

  return {
    exId: nextExId,
    kg: historicalSet?.kg ?? 0,
    reps: historicalSet?.reps ?? 0,
    rest: getDefaultRest(history, nextExId, restTimes),
    confidence: 0.95,
  }
}

// Predict the next exercise based on current cycle or historical patterns
export function predictNextExercise(
  history: HistoryEntry[],
  restTimes: Record<string, number>
): NextExercisePrediction | null {
  const currentSets = getCurrentSessionSets(history)
  if (currentSets.length === 0) return null

  // Get exercise order (consecutive sets of same exercise count as one)
  const exerciseOrder: string[] = []
  for (const set of currentSets) {
    if (exerciseOrder.length === 0 || exerciseOrder[exerciseOrder.length - 1] !== set.exId) {
      exerciseOrder.push(set.exId)
    }
  }

  // First, try to predict based on current cycle pattern
  const cyclePrediction = predictFromCurrentCycle(exerciseOrder, currentSets, history, restTimes)
  if (cyclePrediction) return cyclePrediction

  // Fall back to historical pattern matching
  // Get unique exercise sequence for historical matching
  const uniqueSequence: string[] = []
  for (const exId of exerciseOrder) {
    if (!uniqueSequence.includes(exId)) {
      uniqueSequence.push(exId)
    }
  }

  const historicalSessions = parseHistoryIntoSessions(history)

  // Find sessions that match the current sequence prefix
  const matchingSessions: ParsedSession[] = []

  for (const session of historicalSessions) {
    // Check if this session starts with the same exercise sequence
    let matches = true
    for (let i = 0; i < uniqueSequence.length; i++) {
      if (session.exerciseSequence[i] !== uniqueSequence[i]) {
        matches = false
        break
      }
    }

    // Must have at least one more exercise after the current sequence
    if (matches && session.exerciseSequence.length > uniqueSequence.length) {
      matchingSessions.push(session)
    }
  }

  if (matchingSessions.length > 0) {
    // Use the most recent matching session
    const mostRecentMatch = matchingSessions[matchingSessions.length - 1]
    const nextExId = mostRecentMatch.exerciseSequence[uniqueSequence.length]

    // Find the first set of this exercise in that session
    const nextExSet = mostRecentMatch.sets.find(s => s.exId === nextExId)
    if (nextExSet) {
      return {
        exId: nextExId,
        kg: nextExSet.kg,
        reps: nextExSet.reps,
        rest: getDefaultRest(history, nextExId, restTimes),
        confidence: Math.min(matchingSessions.length / 3, 1),
      }
    }
  }

  // Fallback: continue with the last exercise (more sets of it)
  const lastExId = exerciseOrder[exerciseOrder.length - 1]
  if (lastExId) {
    const lastSetForEx = [...currentSets].reverse().find(s => s.exId === lastExId)

    return {
      exId: lastExId,
      kg: lastSetForEx?.kg ?? 0,
      reps: lastSetForEx?.reps ?? 0,
      rest: getDefaultRest(history, lastExId, restTimes),
      confidence: 0.5,
    }
  }

  return null
}
