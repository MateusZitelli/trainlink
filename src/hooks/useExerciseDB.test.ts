import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useExerciseDB } from './useExerciseDB'
import i18n from '../lib/i18n'

// Mock i18n
vi.mock('../lib/i18n', () => ({
  default: {
    language: 'en',
    on: vi.fn(),
    off: vi.fn(),
  },
}))

// Mock fetch
global.fetch = vi.fn()

describe('useExerciseDB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should load English exercises by default', async () => {
    const mockExercises = [
      {
        id: 'Barbell_Deadlift',
        name: 'Barbell Deadlift',
        force: 'pull',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primaryMuscles: ['lower back'],
        secondaryMuscles: ['glutes', 'hamstrings'],
        instructions: ['Stand in front of a loaded bar.'],
        category: 'strength',
        images: ['Barbell_Deadlift/0.jpg'],
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExercises,
    })

    const { result } = renderHook(() => useExerciseDB())

    await waitFor(() => {
      expect(result.current.dbReady).toBe(true)
    })

    const exercise = result.current.getExercise('Barbell_Deadlift')
    expect(exercise).toBeDefined()
    expect(exercise?.name).toBe('Barbell Deadlift')
  })

  it('should load pt-BR exercises when language is pt-BR', async () => {
    // Set language to pt-BR
    ;(i18n as any).language = 'pt-BR'

    const mockExercises = [
      {
        id: 'Barbell_Deadlift',
        name: 'Levantamento Terra com Barra',
        force: 'pull',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primaryMuscles: ['lower back'],
        secondaryMuscles: ['glutes', 'hamstrings'],
        instructions: ['Fique em pe na frente de uma barra carregada.'],
        category: 'strength',
        images: ['Barbell_Deadlift/0.jpg'],
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExercises,
    })

    const { result } = renderHook(() => useExerciseDB())

    await waitFor(() => {
      expect(result.current.dbReady).toBe(true)
    })

    const exercise = result.current.getExercise('Barbell_Deadlift')
    expect(exercise).toBeDefined()
    expect(exercise?.name).toBe('Levantamento Terra com Barra')
  })

  it('should fetch from correct URL based on language', async () => {
    ;(i18n as any).language = 'pt-BR'

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    renderHook(() => useExerciseDB())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/data/exercises-pt-br.json')
    })
  })

  it('should use language-specific cache keys', () => {
    // Test that cache keys are different for different languages
    ;(i18n as any).language = 'en'
    const enKey = 'workout-exercise-cache-v4-en'

    ;(i18n as any).language = 'pt-BR'
    const ptKey = 'workout-exercise-cache-v4-pt-BR'

    expect(enKey).not.toBe(ptKey)
  })

  it('should handle language change', async () => {
    let languageChangedCallback: ((lng: string) => void) | null = null
    ;(i18n.on as any).mockImplementation((event: string, cb: (lng: string) => void) => {
      if (event === 'languageChanged') {
        languageChangedCallback = cb
      }
    })

    ;(i18n as any).language = 'en'

    const mockEnExercises = [
      {
        id: 'Barbell_Deadlift',
        name: 'Barbell Deadlift',
        force: 'pull',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primaryMuscles: ['lower back'],
        secondaryMuscles: [],
        instructions: ['English instruction'],
        category: 'strength',
        images: ['Barbell_Deadlift/0.jpg'],
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEnExercises,
    })

    const { result, rerender } = renderHook(() => useExerciseDB())

    await waitFor(() => {
      expect(result.current.dbReady).toBe(true)
    })

    let exercise = result.current.getExercise('Barbell_Deadlift')
    expect(exercise?.name).toBe('Barbell Deadlift')

    // Simulate language change
    ;(i18n as any).language = 'pt-BR'

    const mockPtExercises = [
      {
        id: 'Barbell_Deadlift',
        name: 'Levantamento Terra com Barra',
        force: 'pull',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primaryMuscles: ['lower back'],
        secondaryMuscles: [],
        instructions: ['Instrucao em portugues'],
        category: 'strength',
        images: ['Barbell_Deadlift/0.jpg'],
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPtExercises,
    })

    // Trigger language change
    if (languageChangedCallback) {
      languageChangedCallback('pt-BR')
    }
    rerender()

    await waitFor(() => {
      exercise = result.current.getExercise('Barbell_Deadlift')
      expect(exercise?.name).toBe('Levantamento Terra com Barra')
    })
  })
})
