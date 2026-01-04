// Formatting functions for predictions

import type { NextExercisePrediction } from './types'

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
      if (reason.delta.kg === 0 && reason.delta.reps === 0) {
        return `Continue: ${values}`
      }
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
