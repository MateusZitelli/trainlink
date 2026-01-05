import lzString from 'lz-string'
import type { AppState, Day, HistoryEntry, Difficulty } from './state'
import { INITIAL_STATE, getExercisePatternFromLastSession } from './state'
import { compress, decompress, isV2Format } from './url/compress'
import { toCompact, fromCompact, toCompactShare, fromCompactShare } from './url/schema'
import type { CompactAppState, CompactShareData } from './url/types'

const STORAGE_KEY = 'trainlink-state'

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
    return JSON.parse(json) as AppState
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
  const url = stateToUrl(state)
  window.history.replaceState(null, '', url)
  // Also save to localStorage for PWA persistence
  saveToStorage(state)
}

export function loadFromUrl(): AppState {
  // Try URL first
  const urlState = urlToState(window.location.hash)
  if (urlState) {
    // Rewrite URL to v2 format and save to localStorage
    syncToUrl(urlState)
    return urlState
  }

  // Fallback to localStorage (for PWA reopens)
  const storageState = loadFromStorage()
  if (storageState) {
    // Restore URL from localStorage state
    const url = stateToUrl(storageState)
    window.history.replaceState(null, '', url)
    return storageState
  }

  return INITIAL_STATE
}
