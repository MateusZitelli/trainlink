// Compact type definitions for URL compression
// These mirror the main types but with shortened property names

export interface CompactDay {
  n: string  // name
  e: string[]  // exercises
}

// SetEntry compact: type=0
export interface CompactSetEntry {
  t: 0  // type: 'set'
  i: string  // exId
  x: number  // ts (timestamp)
  k: number  // kg
  c: number  // reps (count)
  w?: number  // rest (wait)
  d?: 0 | 1 | 2  // difficulty: easy=0, normal=1, hard=2
  u?: number  // duration
}

// SessionEndMarker compact: type=1
export interface CompactSessionEndMarker {
  t: 1  // type: 'session-end'
  x: number  // ts
}

export type CompactHistoryEntry = CompactSetEntry | CompactSessionEndMarker

export interface CompactSession {
  a?: string  // activeDay
  q?: string  // currentExId
  z?: number  // restStartedAt
}

export interface CompactAppState {
  v: 2  // schema version
  p: { d: CompactDay[] }  // plan.days
  h: CompactHistoryEntry[]  // history
  s: CompactSession | null  // session
  r: Record<string, number>  // restTimes
}

export interface CompactShareData {
  v: 2  // schema version
  d: CompactDay  // day
  r: Record<string, number>  // restTimes
}

// Difficulty mapping
export const DIFFICULTY_TO_NUM = {
  easy: 0,
  normal: 1,
  hard: 2,
} as const

export const NUM_TO_DIFFICULTY = {
  0: 'easy',
  1: 'normal',
  2: 'hard',
} as const
