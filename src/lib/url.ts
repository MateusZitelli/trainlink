import lzString from 'lz-string'
import type { AppState, Day, HistoryEntry } from './state'
import { INITIAL_STATE } from './state'

const STORAGE_KEY = 'trainlink-state'

// Share data structure - contains workout plan (not results)
export interface ShareData {
  day: Day
  restTimes: Record<string, number>  // Rest time per exercise
}

// Encode share data to URL-safe string
export function encodeShareData(data: ShareData): string {
  const json = JSON.stringify(data)
  return lzString.compressToEncodedURIComponent(json)
}

// Decode share data from URL
export function decodeShareData(encoded: string): ShareData | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as ShareData
  } catch {
    return null
  }
}

// Generate share URL for a day
export function generateShareUrl(day: Day, restTimes: Record<string, number>): string {
  // Only include rest times for exercises in this day
  const dayRestTimes: Record<string, number> = {}
  for (const exId of day.exercises) {
    if (restTimes[exId] !== undefined) {
      dayRestTimes[exId] = restTimes[exId]
    }
  }
  const data: ShareData = { day, restTimes: dayRestTimes }
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

export function stateToUrl(state: AppState): string {
  const json = JSON.stringify(state)
  const compressed = lzString.compressToEncodedURIComponent(json)
  return '#' + compressed
}

export function urlToState(hash: string): AppState | null {
  if (!hash || hash === '#') return null

  try {
    const compressed = hash.slice(1) // Remove #
    const json = lzString.decompressFromEncodedURIComponent(compressed)
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
    // Also save to localStorage to keep them in sync
    saveToStorage(urlState)
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
