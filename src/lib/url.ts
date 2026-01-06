import lzString from 'lz-string'
import type { AppState, Day, HistoryEntry, Difficulty } from './state'
import { INITIAL_STATE, getExercisePatternFromLastSession, isSessionEndMarker } from './state'
import { compress, decompress, isV2Format } from './url/compress'
import { toCompact, fromCompact, toCompactShare, fromCompactShare, toCompactShareSession, fromCompactShareSession } from './url/schema'
import type { ShareSessionData } from './url/schema'
import type { CompactAppState, CompactShareData, CompactShareSessionData } from './url/types'

export type { ShareSessionData } from './url/schema'

const STORAGE_KEY = 'trainlink-state'
const METADATA_KEY = 'trainlink-history-meta'
const URL_LENGTH_TARGET = 1900  // Keep under ~2000 for compatibility

// Metadata for tracking which sessions are in URL vs localStorage only
export interface HistoryMetadata {
  urlCutoffTs: number | null  // oldest timestamp in URL, null if all fit
}

// Save history metadata to localStorage
export function saveMetadata(meta: HistoryMetadata): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(meta))
  } catch {
    // Ignore errors
  }
}

// Load history metadata from localStorage
export function loadMetadata(): HistoryMetadata | null {
  try {
    const json = localStorage.getItem(METADATA_KEY)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Calculate URL length for a given state
function calculateUrlLength(state: AppState): number {
  const compact = toCompact(state)
  const compressed = compress(compact)
  return 1 + compressed.length  // +1 for '#'
}

// Find indices of session-end markers in history
function findSessionBoundaries(history: HistoryEntry[]): number[] {
  const boundaries: number[] = []
  for (let i = 0; i < history.length; i++) {
    if (isSessionEndMarker(history[i])) {
      boundaries.push(i)
    }
  }
  return boundaries
}

// Result of truncating state for URL
interface TruncationResult {
  urlState: AppState       // State safe for URL (truncated history)
  fullState: AppState      // Full state for localStorage
  urlCutoffTs: number | null  // Oldest timestamp in URL, null if all fit
}

// Truncate state to fit in URL while preserving plan.days and recent sessions
export function truncateStateForUrl(state: AppState): TruncationResult {
  // First check: does full state fit?
  if (calculateUrlLength(state) <= URL_LENGTH_TARGET) {
    return { urlState: state, fullState: state, urlCutoffTs: null }
  }

  // Find session boundaries
  const boundaries = findSessionBoundaries(state.history)

  // If no completed sessions, check if we can fit without history
  if (boundaries.length === 0) {
    const emptyHistoryState: AppState = { ...state, history: [] }
    if (calculateUrlLength(emptyHistoryState) <= URL_LENGTH_TARGET) {
      return {
        urlState: emptyHistoryState,
        fullState: state,
        urlCutoffTs: state.history.length > 0 ? state.history[0].ts : null,
      }
    }
    // Even empty history doesn't fit - just return truncated (edge case)
    return { urlState: emptyHistoryState, fullState: state, urlCutoffTs: null }
  }

  // Binary search: find minimum number of sessions from end that fit
  // sessionsToExclude: number of complete sessions to exclude from URL
  let low = 0
  let high = boundaries.length
  let bestSplitIdx = state.history.length  // Default: exclude all history

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)

    // mid = number of complete sessions to EXCLUDE from URL
    // Start including from after the mid-th session-end marker
    let includeFromIdx: number
    if (mid === 0) {
      includeFromIdx = 0  // Include everything
    } else if (mid >= boundaries.length) {
      includeFromIdx = state.history.length  // Include nothing (only in-progress if any)
    } else {
      includeFromIdx = boundaries[mid - 1] + 1  // Start after (mid-1)th session-end
    }

    const truncatedHistory = state.history.slice(includeFromIdx)
    const testState: AppState = { ...state, history: truncatedHistory }

    if (calculateUrlLength(testState) <= URL_LENGTH_TARGET) {
      bestSplitIdx = includeFromIdx
      high = mid - 1  // Try to include more (exclude fewer)
    } else {
      low = mid + 1  // Need to exclude more
    }
  }

  const truncatedHistory = state.history.slice(bestSplitIdx)
  const urlState: AppState = { ...state, history: truncatedHistory }
  const urlCutoffTs = truncatedHistory.length > 0 ? truncatedHistory[0].ts : null

  return {
    urlState,
    fullState: state,
    urlCutoffTs,
  }
}

// Merge URL state with localStorage state (URL is authoritative for recent data)
function mergeStates(urlState: AppState, storageState: AppState): AppState {
  // URL is authoritative for: plan, session, restTimes
  // Merge history: storage entries older than URL's oldest + URL's history

  if (urlState.history.length === 0) {
    return { ...urlState, history: storageState.history }
  }

  const oldestUrlTs = urlState.history[0].ts

  // Take storage entries older than URL's oldest
  const olderEntries = storageState.history.filter(e => e.ts < oldestUrlTs)

  // Merge: older from storage + all from URL
  const mergedHistory = [...olderEntries, ...urlState.history]

  return {
    ...urlState,
    history: mergedHistory,
  }
}

// Validate that parsed data has the required AppState structure
function isValidAppState(data: unknown): data is AppState {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  // Validate plan.days exists and is an array
  if (!obj.plan || typeof obj.plan !== 'object') return false
  const plan = obj.plan as Record<string, unknown>
  if (!Array.isArray(plan.days)) return false

  // Validate history is an array
  if (!Array.isArray(obj.history)) return false

  // Validate restTimes is an object (or missing, which is ok)
  if (obj.restTimes !== undefined && (typeof obj.restTimes !== 'object' || obj.restTimes === null)) return false

  return true
}

// Set pattern from last session
export interface SetPattern {
  kg: number
  reps: number
  difficulty?: Difficulty
}

// Share data structure - contains workout plan (not results)
export interface ShareData {
  day: Day
  restTimes: Record<string, number>  // Rest time per exercise
  setPatterns: Record<string, SetPattern[]>  // Last session pattern per exercise
}

// Encode share data to URL-safe string (v2 format with fflate compression)
export function encodeShareData(data: ShareData): string {
  const compact = toCompactShare(data)
  return compress(compact)
}

// Decode share data from URL (handles both v1 lz-string and v2 fflate formats)
export function decodeShareData(encoded: string): ShareData | null {
  try {
    if (isV2Format(encoded)) {
      const compact = decompress(encoded) as CompactShareData
      return fromCompactShare(compact)
    }
    // Legacy v1 format: lz-string
    const json = lzString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const data = JSON.parse(json) as ShareData
    // Ensure setPatterns exists for backward compatibility
    if (!data.setPatterns) data.setPatterns = {}
    return data
  } catch {
    return null
  }
}

// Generate share URL for a day
export function generateShareUrl(
  day: Day,
  restTimes: Record<string, number>,
  history: HistoryEntry[]
): string {
  // Only include rest times for exercises in this day
  const dayRestTimes: Record<string, number> = {}
  const setPatterns: Record<string, SetPattern[]> = {}

  for (const exId of day.exercises) {
    if (restTimes[exId] !== undefined) {
      dayRestTimes[exId] = restTimes[exId]
    }
    // Get last session pattern for this exercise
    const pattern = getExercisePatternFromLastSession(history, exId)
    if (pattern) {
      setPatterns[exId] = pattern
    }
  }

  const data: ShareData = { day, restTimes: dayRestTimes, setPatterns }
  const encoded = encodeShareData(data)
  return `${window.location.origin}${window.location.pathname}?share=${encoded}`
}

// Parse current URL for share data
export function parseShareFromUrl(): ShareData | null {
  const params = new URLSearchParams(window.location.search)
  const shareParam = params.get('share')
  if (!shareParam) return null
  return decodeShareData(shareParam)
}

// Session share URL functions (v3 format)

// Encode session share data to URL-safe string (v3 format)
export function encodeSessionShareData(data: ShareSessionData): string {
  const compact = toCompactShareSession(data)
  return compress(compact, '3')
}

// Decode session share data from URL
export function decodeSessionShareData(encoded: string): ShareSessionData | null {
  try {
    // Session shares always use v3 format (starts with "3")
    if (!encoded.startsWith('3')) return null
    const compact = decompress(encoded) as CompactShareSessionData
    if (compact.v !== 3) return null
    return fromCompactShareSession(compact)
  } catch {
    return null
  }
}

// Generate share URL for a session
export function generateSessionShareUrl(
  sessionName: string,
  session: { sets: { type: 'set'; exId: string; ts: number; kg: number; reps: number; rest?: number; difficulty?: Difficulty; duration?: number }[]; startTs: number; endTs: number },
  previousSession?: { sets: { type: 'set'; exId: string; ts: number; kg: number; reps: number; rest?: number; difficulty?: Difficulty; duration?: number }[]; startTs: number; endTs: number }
): string {
  const data: ShareSessionData = {
    sessionName,
    startTs: session.startTs,
    endTs: session.endTs,
    sets: session.sets,
    previousSession: previousSession ? {
      startTs: previousSession.startTs,
      endTs: previousSession.endTs,
      sets: previousSession.sets,
    } : undefined,
  }
  const encoded = encodeSessionShareData(data)
  return `${window.location.origin}${window.location.pathname}?session=${encoded}`
}

// Parse current URL for session share data
export function parseSessionShareFromUrl(): ShareSessionData | null {
  const params = new URLSearchParams(window.location.search)
  const sessionParam = params.get('session')
  if (!sessionParam) return null
  return decodeSessionShareData(sessionParam)
}

// Convert state to URL hash (v2 format with fflate compression)
export function stateToUrl(state: AppState): string {
  const compact = toCompact(state)
  const compressed = compress(compact)
  return '#' + compressed
}

// Parse URL hash to state (handles both v1 lz-string and v2 fflate formats)
export function urlToState(hash: string): AppState | null {
  if (!hash || hash === '#') return null

  try {
    const encoded = hash.slice(1) // Remove #

    if (isV2Format(encoded)) {
      const compact = decompress(encoded) as CompactAppState
      return fromCompact(compact)
    }

    // Legacy v1 format: lz-string
    const json = lzString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as AppState
  } catch {
    return null
  }
}

// Save to localStorage as backup for PWA
export function saveToStorage(state: AppState): void {
  try {
    const json = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    // Ignore errors (quota exceeded, etc.)
  }
}

// Load from localStorage
export function loadFromStorage(): AppState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (!isValidAppState(parsed)) {
      // Clear corrupted data to prevent repeated issues
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

// Clear localStorage
export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

export function syncToUrl(state: AppState): void {
  const { urlState, fullState, urlCutoffTs } = truncateStateForUrl(state)

  // URL gets truncated state
  const url = stateToUrl(urlState)
  window.history.replaceState(null, '', url)

  // localStorage gets full state
  saveToStorage(fullState)

  // Save cutoff for UI
  saveMetadata({ urlCutoffTs })
}

export function loadFromUrl(): AppState {
  const urlState = urlToState(window.location.hash)
  const storageState = loadFromStorage()

  // Case 1: Both exist - merge (URL authoritative for recent, storage fills older)
  if (urlState && storageState) {
    const mergedState = mergeStates(urlState, storageState)
    syncToUrl(mergedState)
    return mergedState
  }

  // Case 2: Only URL
  if (urlState) {
    syncToUrl(urlState)
    return urlState
  }

  // Case 3: Only localStorage (PWA reopen)
  if (storageState) {
    syncToUrl(storageState)
    return storageState
  }

  // Case 4: Nothing - fresh start
  return INITIAL_STATE
}
