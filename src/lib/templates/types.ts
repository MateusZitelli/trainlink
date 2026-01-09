export type DayDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface DayTemplate {
  id: string
  name: string
  description: string
  difficulty: DayDifficulty
  exerciseNames: string[]
  tags: string[]
}

export interface Pack {
  id: string
  name: string
  description: string
  difficulty: DayDifficulty
  days: Omit<DayTemplate, 'id' | 'difficulty'>[]
  durationWeeks?: number
  frequency: string
}

export const DIFFICULTY_LABELS: Record<DayDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const DIFFICULTY_COLORS: Record<DayDifficulty, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
  intermediate: { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' },
  advanced: { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
}
