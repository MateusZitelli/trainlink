// Prediction strategies for suggesting next exercise values

import type {
  SetEntry,
  HistoryEntry,
  NextExercisePrediction,
  PredictionContext,
  PredictionStrategy,
  Difficulty,
} from './types'
import { isSetEntry, isSessionEndMarker } from './guards'
import {
  getDefaultRest,
  getLastSet,
  getCurrentSessionSets,
  parseHistoryIntoSessions,
  buildExerciseOrder,
} from './helpers'

// Strategy 1: Detect cycle pattern (A→B→A→B)
const tryCyclePattern: PredictionStrategy = (ctx) => {
  const { exerciseOrder, currentSets, history, restTimes } = ctx
  if (exerciseOrder.length < 3) return null

  let startIdx = 0
  let cycle: { pattern: string[]; length: number } | null = null

  while (startIdx < exerciseOrder.length - 2) {
    const subOrder = exerciseOrder.slice(startIdx)
    const firstEx = subOrder[0]

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

    const pattern = subOrder.slice(0, cycleLength)
    let breakIdx = -1
    for (let i = 0; i < subOrder.length; i++) {
      if (subOrder[i] !== pattern[i % cycleLength]) {
        breakIdx = i
        break
      }
    }

    if (breakIdx === -1) {
      cycle = { pattern, length: subOrder.length }
      break
    } else {
      startIdx = startIdx + breakIdx
    }
  }

  if (!cycle) return null

  const positionInCycle = cycle.length % cycle.pattern.length
  const nextExId = cycle.pattern[positionInCycle]

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
const tryCurrentTrend: PredictionStrategy = (ctx) => {
  const { currentSets, lastExId, history, restTimes } = ctx
  const trend = predictDropSetTrend(currentSets, lastExId)
  if (!trend) return null

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
const tryHistoricalDropSet: PredictionStrategy = (ctx) => {
  const { currentSets, lastExId, history, restTimes } = ctx

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

  const currentExSets = currentSets.filter(s => s.exId === lastExId)
  if (currentExSets.length === 0) return null

  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i]

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

    for (const block of blocks) {
      if (block.length < 2) continue

      const firstHistoricalSet = block[0]

      if (currentExSets[0].kg === firstHistoricalSet.kg &&
          currentExSets[0].reps === firstHistoricalSet.reps) {

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
const tryHistoricalSequence: PredictionStrategy = (ctx) => {
  const { exerciseOrder, history, restTimes } = ctx

  const uniqueSequence: string[] = []
  for (const exId of exerciseOrder) {
    if (!uniqueSequence.includes(exId)) {
      uniqueSequence.push(exId)
    }
  }

  const historicalSessions = parseHistoryIntoSessions(history)

  const matchingSessions: { session: typeof historicalSessions[0]; index: number }[] = []

  for (let i = 0; i < historicalSessions.length; i++) {
    const session = historicalSessions[i]
    let matches = true
    for (let j = 0; j < uniqueSequence.length; j++) {
      if (session.exerciseSequence[j] !== uniqueSequence[j]) {
        matches = false
        break
      }
    }

    if (matches && session.exerciseSequence.length > uniqueSequence.length) {
      matchingSessions.push({ session, index: i })
    }
  }

  if (matchingSessions.length > 0) {
    const mostRecentMatch = matchingSessions[matchingSessions.length - 1]
    const nextExId = mostRecentMatch.session.exerciseSequence[uniqueSequence.length]

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
const fallbackContinue: PredictionStrategy = (ctx) => {
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

// Build prediction context from current state
function buildContext(
  currentSets: SetEntry[],
  history: HistoryEntry[],
  restTimes: Record<string, number>
): PredictionContext {
  const exerciseOrder = buildExerciseOrder(currentSets)
  return {
    currentSets,
    exerciseOrder,
    lastExId: exerciseOrder[exerciseOrder.length - 1],
    history,
    restTimes,
  }
}

// Get the first exercise from the most recent completed session
function getFirstExerciseFromLastSession(history: HistoryEntry[]): SetEntry | null {
  let lastSessionEndIndex = -1
  for (let i = history.length - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) {
      lastSessionEndIndex = i
      break
    }
  }

  if (lastSessionEndIndex === -1) return null

  let sessionStartIndex = 0
  for (let i = lastSessionEndIndex - 1; i >= 0; i--) {
    if (isSessionEndMarker(history[i])) {
      sessionStartIndex = i + 1
      break
    }
  }

  for (let i = sessionStartIndex; i < lastSessionEndIndex; i++) {
    const entry = history[i]
    if (isSetEntry(entry)) {
      return entry
    }
  }

  return null
}

// Predict the next exercise based on current cycle or historical patterns
export function predictNextExercise(
  history: HistoryEntry[],
  restTimes: Record<string, number>
): NextExercisePrediction | null {
  const currentSets = getCurrentSessionSets(history)

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

// Get all sets for an exercise from the most recent session that contains it
export function getExercisePatternFromLastSession(
  history: HistoryEntry[],
  exId: string
): { kg: number; reps: number; difficulty?: Difficulty }[] | null {
  const sessionEndIndices: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      sessionEndIndices.push(i)
    }
  }

  if (sessionEndIndices.length === 0) {
    const sets = history.filter(e => isSetEntry(e) && e.exId === exId) as SetEntry[]
    return sets.length > 0 ? sets.map(s => ({ kg: s.kg, reps: s.reps, difficulty: s.difficulty })) : null
  }

  for (let i = sessionEndIndices.length - 1; i >= 0; i--) {
    const sessionEndIdx = sessionEndIndices[i]
    const sessionStartIdx = i > 0 ? sessionEndIndices[i - 1] + 1 : 0

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

// Predict values for a specific exercise
export function predictExerciseValues(
  history: HistoryEntry[],
  restTimes: Record<string, number>,
  exId: string
): NextExercisePrediction | null {
  const currentSets = getCurrentSessionSets(history)
  const hasSetInCurrentSession = currentSets.some(s => s.exId === exId)

  if (hasSetInCurrentSession) {
    const prediction = predictNextExercise(history, restTimes)
    if (prediction?.exId === exId) {
      return prediction
    }

    const exSetsInSession = currentSets.filter(s => s.exId === exId)
    if (exSetsInSession.length >= 2) {
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

    const lastSetInSession = exSetsInSession[exSetsInSession.length - 1]
    return {
      exId,
      kg: lastSetInSession.kg,
      reps: lastSetInSession.reps,
      rest: getDefaultRest(history, exId, restTimes),
      reason: { type: 'continue' },
    }
  }

  const lastSessionPattern = getExercisePatternFromLastSession(history, exId)

  if (lastSessionPattern && lastSessionPattern.length >= 2) {
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
    return {
      exId,
      kg: lastSessionPattern[0].kg,
      reps: lastSessionPattern[0].reps,
      rest: getDefaultRest(history, exId, restTimes),
      reason: { type: 'start' },
    }
  }

  return null
}

// Predict kg/reps trend for drop-sets (consecutive sets of same exercise)
export function predictDropSetTrend(
  sets: SetEntry[],
  exId: string
): { kg: number; reps: number } | null {
  const consecutiveSets: SetEntry[] = []
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].exId === exId) {
      consecutiveSets.unshift(sets[i])
    } else {
      break
    }
  }

  if (consecutiveSets.length < 2) {
    return null
  }

  const prev = consecutiveSets[consecutiveSets.length - 2]
  const last = consecutiveSets[consecutiveSets.length - 1]

  const kgDelta = last.kg - prev.kg
  const repsDelta = last.reps - prev.reps

  const predictedKg = Math.max(0, last.kg + kgDelta)
  const predictedReps = Math.max(1, last.reps + repsDelta)

  return {
    kg: predictedKg,
    reps: predictedReps,
  }
}
