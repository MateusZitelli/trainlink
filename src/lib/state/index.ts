// Re-export all state-related types and functions
// This maintains backward compatibility with existing imports

export type {
  Day,
  Difficulty,
  SetEntry,
  SessionEndMarker,
  HistoryEntry,
  Session,
  AppState,
  PredictionReason,
  NextExercisePrediction,
  PredictionContext,
  PredictionStrategy,
  ParsedSession,
} from './types'

export { INITIAL_STATE } from './types'

export { isSessionEndMarker, isSetEntry } from './guards'

export {
  findLastSessionEndIndex,
  getLastSet,
  getFirstSetOfLastSession,
  getDefaultRest,
  getSetsForExerciseToday,
  getCurrentSessionSets,
  parseHistoryIntoSessions,
  buildExerciseOrder,
} from './helpers'

export { formatDetailedPrediction } from './format'

export {
  predictNextExercise,
  predictExerciseValues,
  predictDropSetTrend,
  getExercisePatternFromLastSession,
} from './predictions'

export type { E1rmMetrics, WeightSuggestion, PredictedDifficulty } from './e1rm'

export {
  calculateE1rmMetrics,
  calculateSmartE1rm,
  baseE1rm,
  predictDifficulty,
  getWeightForDifficulty,
  getDifficultyOptions,
} from './e1rm'
