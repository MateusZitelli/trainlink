// Smart e1RM (estimated one-rep max) calculation with difficulty, rest, and fatigue adjustments

import type { HistoryEntry, SetEntry, Difficulty } from './types'
import { isSetEntry, isSessionEndMarker } from './guards'

// Types
export interface E1rmMetrics {
  current: number | null        // Median of recent sessions' peak e1RMs
  peak: number | null           // All-time highest e1RM
  trend: 'up' | 'down' | 'stable' | null
  suggestedWeights: WeightSuggestion[]
}

export interface WeightSuggestion {
  targetReps: number
  suggestedKg: number
  description: string
}

interface SmartE1rmInput {
  kg: number
  reps: number
  difficulty?: Difficulty
  rest?: number
  setIndexInSession: number
}

interface SessionE1rmData {
  sessionIndex: number  // 0 = most recent completed session
  peakE1rm: number
  peakSet: SetEntry
}

// Base Epley formula: e1RM = weight × (1 + reps/30)
export function baseE1rm(kg: number, reps: number): number {
  if (reps <= 0 || kg <= 0) return 0
  if (reps === 1) return kg
  return kg * (1 + reps / 30)
}

// Difficulty adjustment: easy sets have more in the tank
export function getDifficultyMultiplier(difficulty?: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 1.07   // Had 2-3 RIR, true max is higher
    case 'hard': return 1.00   // Near failure, formula is accurate
    case 'normal':
    default: return 1.03       // Standard RPE ~7-8
  }
}

// Rest adjustment: short rest = fatigued = true capacity is higher
export function getRestMultiplier(restSeconds?: number): number {
  if (restSeconds === undefined) return 1.00
  if (restSeconds < 60) return 1.10    // Very fatigued
  if (restSeconds <= 120) return 1.05  // Moderate fatigue
  return 1.00                          // Adequate rest
}

// Fatigue adjustment: later sets in session are harder
export function getFatigueMultiplier(setIndexInSession: number): number {
  // +1% per set, capped at +8%
  const fatigueBoost = Math.min(setIndexInSession * 0.01, 0.08)
  return 1.0 + fatigueBoost
}

// Calculate smart e1RM for a single set
export function calculateSmartE1rm(input: SmartE1rmInput): number {
  const base = baseE1rm(input.kg, input.reps)
  if (base === 0) return 0

  const diffMult = getDifficultyMultiplier(input.difficulty)
  const restMult = getRestMultiplier(input.rest)
  const fatigueMult = getFatigueMultiplier(input.setIndexInSession)

  return Math.round(base * diffMult * restMult * fatigueMult * 10) / 10
}

// Check if a set is reliable for e1RM calculation
function isReliableSet(set: SetEntry): boolean {
  return (
    set.reps >= 1 &&
    set.reps <= 15 &&    // Formulas less accurate beyond 15 reps
    set.kg > 0 &&
    set.difficulty !== 'easy'  // Filter out warm-ups and deload sets
  )
}

// Parse history into sessions and get peak e1RM per session for an exercise
function getSessionPeakE1rms(history: HistoryEntry[], exId: string): SessionE1rmData[] {
  const results: SessionE1rmData[] = []

  // Find all session boundaries
  const sessionEndIndices: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      sessionEndIndices.push(i)
    }
  }

  // Process each completed session (most recent first)
  for (let sessionIdx = sessionEndIndices.length - 1; sessionIdx >= 0; sessionIdx--) {
    const endIdx = sessionEndIndices[sessionIdx]
    const startIdx = sessionIdx > 0 ? sessionEndIndices[sessionIdx - 1] + 1 : 0

    // Get all sets for this exercise in this session
    const sessionSets: SetEntry[] = []
    for (let i = startIdx; i < endIdx; i++) {
      const entry = history[i]
      if (isSetEntry(entry) && entry.exId === exId) {
        sessionSets.push(entry)
      }
    }

    if (sessionSets.length === 0) continue

    // Filter to reliable sets and find the peak
    let peakE1rm = 0
    let peakSet: SetEntry | null = null

    sessionSets.forEach((set, setIndex) => {
      if (!isReliableSet(set)) return

      const e1rm = calculateSmartE1rm({
        kg: set.kg,
        reps: set.reps,
        difficulty: set.difficulty,
        rest: set.rest,
        setIndexInSession: setIndex,
      })

      if (e1rm > peakE1rm) {
        peakE1rm = e1rm
        peakSet = set
      }
    })

    if (peakSet && peakE1rm > 0) {
      results.push({
        sessionIndex: sessionEndIndices.length - 1 - sessionIdx,
        peakE1rm,
        peakSet,
      })
    }
  }

  return results
}

// Calculate current e1RM: median of last 3 sessions' peaks
function calculateCurrentE1rm(sessionData: SessionE1rmData[]): number | null {
  // Get peaks from last 3 sessions
  const recentPeaks = sessionData
    .filter(d => d.sessionIndex < 3)
    .map(d => d.peakE1rm)
    .sort((a, b) => a - b)

  if (recentPeaks.length === 0) return null

  // Return median
  const mid = Math.floor(recentPeaks.length / 2)
  if (recentPeaks.length % 2 === 0) {
    return Math.round((recentPeaks[mid - 1] + recentPeaks[mid]) / 2 * 10) / 10
  }
  return recentPeaks[mid]
}

// Calculate trend: compare recent 3 sessions to previous 3
function calculateTrend(sessionData: SessionE1rmData[]): 'up' | 'down' | 'stable' | null {
  const recent = sessionData.filter(d => d.sessionIndex < 3)
  const previous = sessionData.filter(d => d.sessionIndex >= 3 && d.sessionIndex < 6)

  if (recent.length === 0 || previous.length === 0) return null

  const recentAvg = recent.reduce((sum, d) => sum + d.peakE1rm, 0) / recent.length
  const previousAvg = previous.reduce((sum, d) => sum + d.peakE1rm, 0) / previous.length

  const delta = (recentAvg - previousAvg) / previousAvg

  if (delta > 0.02) return 'up'      // >2% increase
  if (delta < -0.02) return 'down'   // >2% decrease
  return 'stable'
}

// Calculate suggested weights for different rep targets
function calculateSuggestions(currentE1rm: number): WeightSuggestion[] {
  // Inverse Epley: weight = e1rm / (1 + reps/30)
  const forReps = (targetReps: number) => {
    const raw = currentE1rm / (1 + targetReps / 30)
    return Math.round(raw * 2) / 2  // Round to nearest 0.5kg
  }

  return [
    { targetReps: 5, suggestedKg: forReps(5), description: 'Strength' },
    { targetReps: 8, suggestedKg: forReps(8), description: 'Hypertrophy' },
    { targetReps: 12, suggestedKg: forReps(12), description: 'Volume' },
    { targetReps: 15, suggestedKg: forReps(15), description: 'Endurance' },
  ]
}

// Main function: Calculate all e1RM metrics for an exercise
export function calculateE1rmMetrics(history: HistoryEntry[], exId: string): E1rmMetrics {
  const sessionData = getSessionPeakE1rms(history, exId)

  if (sessionData.length === 0) {
    return {
      current: null,
      peak: null,
      trend: null,
      suggestedWeights: [],
    }
  }

  const current = calculateCurrentE1rm(sessionData)
  const peak = Math.max(...sessionData.map(d => d.peakE1rm))
  const trend = calculateTrend(sessionData)
  const suggestedWeights = current ? calculateSuggestions(current) : []

  return {
    current,
    peak: Math.round(peak * 10) / 10,
    trend,
    suggestedWeights,
  }
}
