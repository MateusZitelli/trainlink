import type { Difficulty } from './state'

// Difficulty color mappings - consolidated from multiple files
export const DIFFICULTY_COLORS = {
  easy: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-400',
  },
  normal: {
    bg: 'bg-[var(--success)]',
    border: 'border-[var(--success)]',
    text: 'text-[var(--success)]',
  },
  hard: {
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    text: 'text-orange-400',
  },
} as const

export function getDifficultyColor(difficulty?: Difficulty): string {
  if (!difficulty) return 'bg-[var(--success)]'
  return DIFFICULTY_COLORS[difficulty]?.bg ?? 'bg-[var(--success)]'
}

export function getDifficultyBorderColor(difficulty?: Difficulty): string {
  if (!difficulty) return ''
  return `border ${DIFFICULTY_COLORS[difficulty]?.border ?? ''}`
}

export function getDifficultyTextColor(difficulty?: Difficulty): string {
  if (!difficulty) return 'text-[var(--text-muted)]'
  return DIFFICULTY_COLORS[difficulty]?.text ?? 'text-[var(--text-muted)]'
}

// Time formatting utilities - consolidated from multiple files
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDuration(startTs: number, endTs: number | null): string {
  const end = endTs ?? Date.now()
  const seconds = Math.floor((end - startTs) / 1000)
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`
  }
  return `${mins}m`
}

export function formatRest(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}

export function formatSessionDate(ts: number): string {
  const date = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const entryDate = new Date(ts)
  entryDate.setHours(0, 0, 0, 0)

  if (entryDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

export function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Level colors for exercise cards
export const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-500',
  intermediate: 'bg-yellow-500',
  expert: 'bg-red-500',
}

export const LEVEL_COLORS_STYLED: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  expert: 'bg-red-500/20 text-red-400',
}
