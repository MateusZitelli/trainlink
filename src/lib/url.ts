import lzString from 'lz-string'
import type { AppState } from './state'
import { INITIAL_STATE } from './state'

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

export function syncToUrl(state: AppState): void {
  const url = stateToUrl(state)
  window.history.replaceState(null, '', url)
}

export function loadFromUrl(): AppState {
  const state = urlToState(window.location.hash)
  return state ?? INITIAL_STATE
}
