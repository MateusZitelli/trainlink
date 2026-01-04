// Core type definitions for the training app state

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

// Prediction reason types for UI display
export type PredictionReason =
  | { type: 'cycle'; pattern: string[] }
  | { type: 'trend'; delta: { kg: number; reps: number } }
  | { type: 'history-dropset'; matchedSession: number; pattern: { kg: number; reps: number; difficulty?: Difficulty }[]; currentIndex: number }
  | { type: 'history-dropset-start'; pattern: { kg: number; reps: number; difficulty?: Difficulty }[] }
  | { type: 'history-sequence'; matchedSession: number }
  | { type: 'continue' }
  | { type: 'start' }
  | { type: 'session-start' }

export interface NextExercisePrediction {
  exId: string
  kg: number
  reps: number
  rest: number
  reason: PredictionReason
}

// Context for prediction strategies
export interface PredictionContext {
  currentSets: SetEntry[]
  exerciseOrder: string[]  // Exercise transitions (consecutive same = 1 entry)
  lastExId: string
  history: HistoryEntry[]
  restTimes: Record<string, number>
}

export type PredictionStrategy = (ctx: PredictionContext) => NextExercisePrediction | null

// Parsed session for pattern matching
export interface ParsedSession {
  sets: SetEntry[]
  exerciseSequence: string[] // Unique exercise IDs in order of first appearance
}
