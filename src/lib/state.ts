export interface Day {
  name: string
  exercises: string[] // ExerciseDB exercise IDs
}

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface SetEntry {
  type: 'set'
  exId: string
  ts: number
  kg: number
  reps: number
  rest?: number
  difficulty?: Difficulty
  duration?: number  // Set duration in seconds
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

// Get the first set of an exercise from the most recent completed session
// This is used when starting a new day to get starting values (not last drop-set values)
export function getFirstSetOfLastSession(history: HistoryEntry[], exId: string): SetEntry | undefined {
  // Find all session boundaries
  const sessionEndIndices: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      sessionEndIndices.push(i)
    }
  }

  // If no sessions completed, return the first set for this exercise (if any)
  if (sessionEndIndices.length === 0) {
    for (const entry of history) {
      if (isSetEntry(entry) && entry.exId === exId) return entry
    }
    return undefined
  }

  // Search from most recent completed session backwards
  for (let i = sessionEndIndices.length - 1; i >= 0; i--) {
    const sessionEndIdx = sessionEndIndices[i]
    const sessionStartIdx = i > 0 ? sessionEndIndices[i - 1] + 1 : 0

    // Find the first set for this exercise in this session
    for (let j = sessionStartIdx; j < sessionEndIdx; j++) {
      const entry = history[j]
      if (isSetEntry(entry) && entry.exId === exId) {
        return entry
      }
    }
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

// Prediction reason types for UI display
export type PredictionReason =
  | { type: 'cycle'; pattern: string[] }
  | { type: 'trend'; delta: { kg: number; reps: number } }
  | { type: 'history-dropset'; matchedSession: number; pattern: { kg: number; reps: number; difficulty?: Difficulty }[]; currentIndex: number }
  | { type: 'history-dropset-start'; pattern: { kg: number; reps: number; difficulty?: Difficulty }[] }  // Starting a new drop-set from previous session
  | { type: 'history-sequence'; matchedSession: number }
  | { type: 'continue' }
  | { type: 'start' }  // Starting values from first set of last session for a specific exercise
  | { type: 'session-start' }  // First exercise to start a new session

export interface NextExercisePrediction {
  exId: string
  kg: number
  reps: number
  rest: number
  reason: PredictionReason
}

// Helper to capitalize exercise ID for display
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Format a prediction into a detailed human-readable string
export function formatDetailedPrediction(prediction: NextExercisePrediction): string {
  const { kg, reps, reason } = prediction
  const values = `${kg}kg × ${reps}`

  switch (reason.type) {
    case 'cycle': {
      const pattern = reason.pattern.map(capitalize).join(' → ')
      return `${pattern} cycle: ${values}`
    }
    case 'trend': {
      // If no change, don't show arrow format
      if (reason.delta.kg === 0 && reason.delta.reps === 0) {
        return `Continue: ${values}`
      }
      // Calculate previous set values from delta
      const prevKg = kg - reason.delta.kg
      const prevReps = reps - reason.delta.reps
      return `Trend: ${prevKg}kg × ${prevReps} → ${kg}kg × ${reps}`
    }
    case 'history-dropset': {
      const patternStr = reason.pattern.map((set, i) => {
        const setStr = `${set.kg}kg × ${set.reps}`
        return i === reason.currentIndex ? `(${setStr})` : setStr
      }).join(' → ')
      return `Following last session: ${patternStr}`
    }
    case 'history-dropset-start': {
      const patternStr = reason.pattern.map(set => `${set.kg}kg × ${set.reps}`).join(' → ')
      return `Last session: ${patternStr}`
    }
    case 'history-sequence': {
      const sessionDesc = reason.matchedSession === 1
        ? 'last workout'
        : `workout ${reason.matchedSession} ago`
      return `Based on ${sessionDesc}: ${values}`
    }
    case 'continue':
      return `Continue: ${values}`
    case 'start':
      return `From last session: ${values}`
    case 'session-start':
      return `Start with: ${values}`
  }
}

// Context for prediction strategies
interface PredictionContext {
  currentSets: SetEntry[]
  exerciseOrder: string[]  // Exercise transitions (consecutive same = 1 entry)
  lastExId: string
  history: HistoryEntry[]
  restTimes: Record<string, number>
}

type PredictionStrategy = (ctx: PredictionContext) => NextExercisePrediction | null

// Build context from history
function buildContext(
  currentSets: SetEntry[],
  history: HistoryEntry[],
  restTimes: Record<string, number>
): PredictionContext {
  // Get exercise order (consecutive sets of same exercise count as one)
  const exerciseOrder: string[] = []
  for (const set of currentSets) {
    if (exerciseOrder.length === 0 || exerciseOrder[exerciseOrder.length - 1] !== set.exId) {
      exerciseOrder.push(set.exId)
    }
  }

  return {
    currentSets,
    exerciseOrder,
    lastExId: exerciseOrder[exerciseOrder.length - 1],
    history,
    restTimes,
  }
}

// Strategy 1: Detect cycle pattern (A→B→A→B)
function tryCyclePattern(ctx: PredictionContext): NextExercisePrediction | null {
  const { exerciseOrder, currentSets, history, restTimes } = ctx
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
    reason: { type: 'cycle', pattern: cycle.pattern },
  }
}

// Strategy 2: Current session has 2+ consecutive sets - extrapolate trend
function tryCurrentTrend(ctx: PredictionContext): NextExercisePrediction | null {
  const { currentSets, lastExId, history, restTimes } = ctx
  const trend = predictDropSetTrend(currentSets, lastExId)
  if (!trend) return null

  // Get the delta for the reason
  const consecutiveSets: SetEntry[] = []
  for (let i = currentSets.length - 1; i >= 0; i--) {
    if (currentSets[i].exId === lastExId) {
      consecutiveSets.unshift(currentSets[i])
    } else {
      break
    }
  }

  const prev = consecutiveSets[consecutiveSets.length - 2]
  const last = consecutiveSets[consecutiveSets.length - 1]

  return {
    exId: lastExId,
    kg: trend.kg,
    reps: trend.reps,
    rest: getDefaultRest(history, lastExId, restTimes),
    reason: { type: 'trend', delta: { kg: last.kg - prev.kg, reps: last.reps - prev.reps } },
  }
}

// Strategy 3: Historical drop-set pattern matches current start
function tryHistoricalDropSet(ctx: PredictionContext): NextExercisePrediction | null {
  const { currentSets, lastExId, history, restTimes } = ctx

  // Find all previous sessions with this exercise
  const sessions: SetEntry[][] = []
  let currentSession: SetEntry[] = []

  for (const entry of history) {
    if (isSetEntry(entry)) {
      currentSession.push(entry)
    } else if (isSessionEndMarker(entry)) {
      if (currentSession.length > 0) {
        sessions.push(currentSession)
      }
      currentSession = []
    }
  }

  // Get consecutive sets for this exercise in current session
  const currentExSets = currentSets.filter(s => s.exId === lastExId)
  if (currentExSets.length === 0) return null

  // Search from most recent session backwards
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i]

    // Find consecutive blocks of this exercise in the session
    const blocks: SetEntry[][] = []
    let currentBlock: SetEntry[] = []

    for (const set of session) {
      if (set.exId === lastExId) {
        currentBlock.push(set)
      } else if (currentBlock.length > 0) {
        blocks.push(currentBlock)
        currentBlock = []
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock)
    }

    // Look for a block that matches current session's pattern
    for (const block of blocks) {
      if (block.length < 2) continue // Need at least 2 sets to have a trend

      // Check if current session matches the start of this block
      const firstHistoricalSet = block[0]

      // Current session's first set should match historical pattern's first set
      if (currentExSets[0].kg === firstHistoricalSet.kg &&
          currentExSets[0].reps === firstHistoricalSet.reps) {

        // Return the next set in the historical pattern
        const nextIndex = currentExSets.length
        if (nextIndex < block.length) {
          const sessionsAgo = sessions.length - i
          const pattern = block.map(s => ({ kg: s.kg, reps: s.reps, difficulty: s.difficulty }))
          return {
            exId: lastExId,
            kg: block[nextIndex].kg,
            reps: block[nextIndex].reps,
            rest: getDefaultRest(history, lastExId, restTimes),
            reason: {
              type: 'history-dropset',
              matchedSession: sessionsAgo,
              pattern,
              currentIndex: nextIndex,
            },
          }
        }
      }
    }
  }

  return null
}

// Strategy 4: Historical session sequence matches
function tryHistoricalSequence(ctx: PredictionContext): NextExercisePrediction | null {
  const { exerciseOrder, history, restTimes } = ctx

  // Get unique exercise sequence for historical matching
  const uniqueSequence: string[] = []
  for (const exId of exerciseOrder) {
    if (!uniqueSequence.includes(exId)) {
      uniqueSequence.push(exId)
    }
  }

  const historicalSessions = parseHistoryIntoSessions(history)

  // Find sessions that match the current sequence prefix
  const matchingSessions: { session: ParsedSession; index: number }[] = []

  for (let i = 0; i < historicalSessions.length; i++) {
    const session = historicalSessions[i]
    // Check if this session starts with the same exercise sequence
    let matches = true
    for (let j = 0; j < uniqueSequence.length; j++) {
      if (session.exerciseSequence[j] !== uniqueSequence[j]) {
        matches = false
        break
      }
    }

    // Must have at least one more exercise after the current sequence
    if (matches && session.exerciseSequence.length > uniqueSequence.length) {
      matchingSessions.push({ session, index: i })
    }
  }

  if (matchingSessions.length > 0) {
    // Use the most recent matching session
    const mostRecentMatch = matchingSessions[matchingSessions.length - 1]
    const nextExId = mostRecentMatch.session.exerciseSequence[uniqueSequence.length]

    // Find the first set of this exercise in that session
    const nextExSet = mostRecentMatch.session.sets.find(s => s.exId === nextExId)
    if (nextExSet) {
      const sessionsAgo = historicalSessions.length - mostRecentMatch.index
      return {
        exId: nextExId,
        kg: nextExSet.kg,
        reps: nextExSet.reps,
        rest: getDefaultRest(history, nextExId, restTimes),
        reason: { type: 'history-sequence', matchedSession: sessionsAgo },
      }
    }
  }

  return null
}

// Strategy 5: Fallback - continue with last exercise
function fallbackContinue(ctx: PredictionContext): NextExercisePrediction | null {
  const { currentSets, lastExId, history, restTimes } = ctx
  if (!lastExId) return null

  const lastSetForEx = [...currentSets].reverse().find(s => s.exId === lastExId)

  return {
    exId: lastExId,
    kg: lastSetForEx?.kg ?? 0,
    reps: lastSetForEx?.reps ?? 0,
    rest: getDefaultRest(history, lastExId, restTimes),
    reason: { type: 'continue' },
  }
}

// Strategies in priority order
const strategies: PredictionStrategy[] = [
  tryCyclePattern,
  tryCurrentTrend,
  tryHistoricalDropSet,
  tryHistoricalSequence,
  fallbackContinue,
]

// Predict the next exercise based on current cycle or historical patterns
export function predictNextExercise(
  history: HistoryEntry[],
  restTimes: Record<string, number>
): NextExercisePrediction | null {
  const currentSets = getCurrentSessionSets(history)

  // If no sets in current session, suggest first exercise from last session
  if (currentSets.length === 0) {
    const firstExercise = getFirstExerciseFromLastSession(history)
    if (!firstExercise) return null

    return {
      exId: firstExercise.exId,
      kg: firstExercise.kg,
      reps: firstExercise.reps,
      rest: getDefaultRest(history, firstExercise.exId, restTimes),
      reason: { type: 'session-start' },
    }
  }

  const ctx = buildContext(currentSets, history, restTimes)

  for (const strategy of strategies) {
    const result = strategy(ctx)
    if (result) return result
  }

  return null
}

// Get the first exercise (first set) from the most recent completed session
function getFirstExerciseFromLastSession(history: HistoryEntry[]): SetEntry | null {
  // Find the last session-end marker
  let lastSessionEndIndex = -1
  for (let i = history.length - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) {
      lastSessionEndIndex = i
      break
    }
  }

  if (lastSessionEndIndex === -1) return null

  // Find the start of that session (previous session-end or beginning)
  let sessionStartIndex = 0
  for (let i = lastSessionEndIndex - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) {
      sessionStartIndex = i + 1
      break
    }
  }

  // Find the first set in that session
  for (let i = sessionStartIndex; i < lastSessionEndIndex; i++) {
    const entry = history[i]
    if (isSetEntry(entry)) {
      return entry
    }
  }

  return null
}

// Predict values for a specific exercise (unified prediction function)
// - If exercise has sets in current session: use pattern-based prediction
// - If exercise has NO sets in current session: use first set of last session
export function predictExerciseValues(
  history: HistoryEntry[],
  restTimes: Record<string, number>,
  exId: string
): NextExercisePrediction | null {
  const currentSets = getCurrentSessionSets(history)
  const hasSetInCurrentSession = currentSets.some(s => s.exId === exId)

  if (hasSetInCurrentSession) {
    // Use existing prediction logic
    const prediction = predictNextExercise(history, restTimes)
    if (prediction?.exId === exId) {
      return prediction
    }
    // If prediction is for a different exercise, get values for this exercise
    // using current session trends or fallback
    const exSetsInSession = currentSets.filter(s => s.exId === exId)
    if (exSetsInSession.length >= 2) {
      // Use trend from current session
      const trend = predictDropSetTrend(currentSets, exId)
      if (trend) {
        const prev = exSetsInSession[exSetsInSession.length - 2]
        const last = exSetsInSession[exSetsInSession.length - 1]
        return {
          exId,
          kg: trend.kg,
          reps: trend.reps,
          rest: getDefaultRest(history, exId, restTimes),
          reason: { type: 'trend', delta: { kg: last.kg - prev.kg, reps: last.reps - prev.reps } },
        }
      }
    }
    // Use last set from current session
    const lastSetInSession = exSetsInSession[exSetsInSession.length - 1]
    return {
      exId,
      kg: lastSetInSession.kg,
      reps: lastSetInSession.reps,
      rest: getDefaultRest(history, exId, restTimes),
      reason: { type: 'continue' },
    }
  }

  // No sets in current session - check for drop-set pattern from last session
  const lastSessionPattern = getExercisePatternFromLastSession(history, exId)

  if (lastSessionPattern && lastSessionPattern.length >= 2) {
    // Previous session had a drop-set pattern (2+ sets)
    return {
      exId,
      kg: lastSessionPattern[0].kg,
      reps: lastSessionPattern[0].reps,
      rest: getDefaultRest(history, exId, restTimes),
      reason: {
        type: 'history-dropset-start',
        pattern: lastSessionPattern,
      },
    }
  }

  if (lastSessionPattern && lastSessionPattern.length === 1) {
    // Previous session had only one set
    return {
      exId,
      kg: lastSessionPattern[0].kg,
      reps: lastSessionPattern[0].reps,
      rest: getDefaultRest(history, exId, restTimes),
      reason: { type: 'start' },
    }
  }

  // Never done this exercise
  return null
}

// Get all sets for an exercise from the most recent session that contains it
function getExercisePatternFromLastSession(
  history: HistoryEntry[],
  exId: string
): { kg: number; reps: number; difficulty?: Difficulty }[] | null {
  // Find all session boundaries
  const sessionEndIndices: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      sessionEndIndices.push(i)
    }
  }

  if (sessionEndIndices.length === 0) {
    // No completed sessions, check if there are any sets before current session
    const sets = history.filter(e => isSetEntry(e) && e.exId === exId) as SetEntry[]
    return sets.length > 0 ? sets.map(s => ({ kg: s.kg, reps: s.reps, difficulty: s.difficulty })) : null
  }

  // Search from most recent completed session backwards
  for (let i = sessionEndIndices.length - 1; i >= 0; i--) {
    const sessionEndIdx = sessionEndIndices[i]
    const sessionStartIdx = i > 0 ? sessionEndIndices[i - 1] + 1 : 0

    // Get all sets for this exercise in this session
    const setsInSession: { kg: number; reps: number; difficulty?: Difficulty }[] = []
    for (let j = sessionStartIdx; j < sessionEndIdx; j++) {
      const entry = history[j]
      if (isSetEntry(entry) && entry.exId === exId) {
        setsInSession.push({ kg: entry.kg, reps: entry.reps, difficulty: entry.difficulty })
      }
    }

    if (setsInSession.length > 0) {
      return setsInSession
    }
  }

  return null
}

// Predict kg/reps trend for drop-sets (consecutive sets of same exercise)
export function predictDropSetTrend(
  sets: SetEntry[],
  exId: string
): { kg: number; reps: number } | null {
  // Find consecutive sets of this exercise from the end
  const consecutiveSets: SetEntry[] = []
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].exId === exId) {
      consecutiveSets.unshift(sets[i])
    } else {
      break // Stop at first different exercise
    }
  }

  // Need at least 2 consecutive sets to detect a trend
  if (consecutiveSets.length < 2) {
    return null
  }

  // Calculate trend from last two sets
  const prev = consecutiveSets[consecutiveSets.length - 2]
  const last = consecutiveSets[consecutiveSets.length - 1]

  const kgDelta = last.kg - prev.kg
  const repsDelta = last.reps - prev.reps

  // Apply trend with bounds
  const predictedKg = Math.max(0, last.kg + kgDelta)
  const predictedReps = Math.max(1, last.reps + repsDelta)

  return {
    kg: predictedKg,
    reps: predictedReps,
  }
}

