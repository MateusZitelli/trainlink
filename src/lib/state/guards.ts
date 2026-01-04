// Type guards for history entries

import type { HistoryEntry, SessionEndMarker, SetEntry } from './types'

export function isSessionEndMarker(entry: HistoryEntry): entry is SessionEndMarker {
  return entry.type === 'session-end'
}

export function isSetEntry(entry: HistoryEntry): entry is SetEntry {
  return entry.type === 'set'
}
