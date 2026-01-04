import { useSyncExternalStore } from 'react'
import type { AppState } from './state'
import { INITIAL_STATE } from './state'
import { urlToState, stateToUrl, saveToStorage, loadFromStorage } from './url'

// Module-level state
let listeners: Set<() => void> = new Set()
let cachedState: AppState | null = null
let cachedHash: string = ''

export function getSnapshot(): AppState {
  const currentHash = window.location.hash

  // Return cached state if hash unchanged (performance optimization)
  if (currentHash === cachedHash && cachedState !== null) {
    return cachedState
  }

  // Parse fresh state from URL
  cachedHash = currentHash
  cachedState = urlToState(currentHash) ?? loadFromStorage() ?? INITIAL_STATE
  return cachedState
}

function getServerSnapshot(): AppState {
  return INITIAL_STATE
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  // Listen to hashchange and popstate for browser navigation
  const handleChange = () => {
    cachedState = null // Invalidate cache
    listener()
  }

  window.addEventListener('hashchange', handleChange)
  window.addEventListener('popstate', handleChange)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('hashchange', handleChange)
    window.removeEventListener('popstate', handleChange)
  }
}

// Notify all listeners (for programmatic updates)
function emitChange(): void {
  cachedState = null // Invalidate cache
  listeners.forEach(listener => listener())
}

// Functional update pattern
export function updateStateFn(updater: (prev: AppState) => AppState): void {
  const current = getSnapshot()
  const newState = updater(current)
  const url = stateToUrl(newState)
  window.history.replaceState(null, '', url)
  saveToStorage(newState) // PWA backup
  emitChange()
}

// Hook for components
export function useUrlState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
