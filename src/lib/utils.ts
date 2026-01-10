import type { Difficulty } from './state'

// Difficulty color mappings - using CSS variables for theme support
export const DIFFICULTY_COLORS = {
  easy: {
    bg: 'bg-[var(--diff-chill)]',
    border: 'border-[var(--diff-chill)]',
    text: 'text-[var(--diff-chill)]',
  },
  normal: {
    bg: 'bg-[var(--diff-solid)]',
    border: 'border-[var(--diff-solid)]',
    text: 'text-[var(--diff-solid)]',
  },
  hard: {
    bg: 'bg-[var(--diff-spicy)]',
    border: 'border-[var(--diff-spicy)]',
    text: 'text-[var(--diff-spicy)]',
  },
} as const

export function getDifficultyColor(difficulty?: Difficulty): string {
  if (!difficulty) return 'bg-[var(--diff-solid)]'
  return DIFFICULTY_COLORS[difficulty]?.bg ?? 'bg-[var(--diff-solid)]'
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
  beginner: 'bg-emerald-500',
  intermediate: 'bg-amber-500',
  expert: 'bg-rose-500',
}

export const LEVEL_COLORS_STYLED: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400',
  intermediate: 'bg-amber-500/20 text-amber-400',
  expert: 'bg-rose-500/20 text-rose-400',
}
