// Compact schema conversion utilities
import type { AppState, Day, HistoryEntry, SetEntry, SessionEndMarker, Session, Difficulty } from '../state/types'
import type { ShareData } from '../url'
import type {
  CompactAppState,
  CompactDay,
  CompactHistoryEntry,
  CompactSetEntry,
  CompactSessionEndMarker,
  CompactSession,
  CompactShareData,
} from './types'
import { DIFFICULTY_TO_NUM, NUM_TO_DIFFICULTY } from './types'

// Convert Day to compact format
function dayToCompact(day: Day): CompactDay {
  return {
    n: day.name,
    e: day.exercises,
  }
}

// Convert compact Day back to full format
function dayFromCompact(compact: CompactDay): Day {
  return {
    name: compact.n,
    exercises: compact.e,
  }
}

// Convert SetEntry to compact format
function setEntryToCompact(entry: SetEntry): CompactSetEntry {
  const compact: CompactSetEntry = {
    t: 0,
    i: entry.exId,
    x: entry.ts,
    k: entry.kg,
    c: entry.reps,
  }
  if (entry.rest !== undefined) compact.w = entry.rest
  if (entry.difficulty !== undefined) compact.d = DIFFICULTY_TO_NUM[entry.difficulty]
  if (entry.duration !== undefined) compact.u = entry.duration
  return compact
}

// Convert compact SetEntry back to full format
function setEntryFromCompact(compact: CompactSetEntry): SetEntry {
  const entry: SetEntry = {
    type: 'set',
    exId: compact.i,
    ts: compact.x,
    kg: compact.k,
    reps: compact.c,
  }
  if (compact.w !== undefined) entry.rest = compact.w
  if (compact.d !== undefined) entry.difficulty = NUM_TO_DIFFICULTY[compact.d] as Difficulty
  if (compact.u !== undefined) entry.duration = compact.u
  return entry
}

// Convert SessionEndMarker to compact format
function sessionEndToCompact(entry: SessionEndMarker): CompactSessionEndMarker {
  return {
    t: 1,
    x: entry.ts,
  }
}

// Convert compact SessionEndMarker back to full format
function sessionEndFromCompact(compact: CompactSessionEndMarker): SessionEndMarker {
  return {
    type: 'session-end',
    ts: compact.x,
  }
}

// Convert HistoryEntry to compact format
function historyEntryToCompact(entry: HistoryEntry): CompactHistoryEntry {
  if (entry.type === 'set') {
    return setEntryToCompact(entry)
  }
  return sessionEndToCompact(entry)
}

// Convert compact HistoryEntry back to full format
function historyEntryFromCompact(compact: CompactHistoryEntry): HistoryEntry {
  if (compact.t === 0) {
    return setEntryFromCompact(compact as CompactSetEntry)
  }
  return sessionEndFromCompact(compact as CompactSessionEndMarker)
}

// Convert Session to compact format
function sessionToCompact(session: Session): CompactSession {
  const compact: CompactSession = {}
  if (session.activeDay !== undefined) compact.a = session.activeDay
  if (session.currentExId !== undefined) compact.q = session.currentExId
  if (session.restStartedAt !== undefined) compact.z = session.restStartedAt
  return compact
}

// Convert compact Session back to full format
function sessionFromCompact(compact: CompactSession): Session {
  const session: Session = {}
  if (compact.a !== undefined) session.activeDay = compact.a
  if (compact.q !== undefined) session.currentExId = compact.q
  if (compact.z !== undefined) session.restStartedAt = compact.z
  return session
}

// Convert full AppState to compact format
export function toCompact(state: AppState): CompactAppState {
  return {
    v: 2,
    p: { d: state.plan.days.map(dayToCompact) },
    h: state.history.map(historyEntryToCompact),
    s: state.session ? sessionToCompact(state.session) : null,
    r: state.restTimes,
  }
}

// Convert compact format back to full AppState
export function fromCompact(compact: CompactAppState): AppState {
  return {
    plan: { days: compact.p.d.map(dayFromCompact) },
    history: compact.h.map(historyEntryFromCompact),
    session: compact.s ? sessionFromCompact(compact.s) : null,
    restTimes: compact.r,
  }
}

// Convert ShareData to compact format
export function toCompactShare(data: ShareData): CompactShareData {
  return {
    v: 2,
    d: dayToCompact(data.day),
    r: data.restTimes,
  }
}

// Convert compact format back to ShareData
export function fromCompactShare(compact: CompactShareData): ShareData {
  return {
    day: dayFromCompact(compact.d),
    restTimes: compact.r,
  }
}
