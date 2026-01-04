import lzString from 'lz-string'
import type { AppState } from './state'
import { INITIAL_STATE } from './state'

const STORAGE_KEY = 'trainlink-state'

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
