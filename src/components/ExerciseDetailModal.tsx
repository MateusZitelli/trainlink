import { useEffect } from 'react'
import type { Exercise } from '../hooks/useExerciseDB'
import { useImageRotation } from '../hooks/useImageRotation'
import { LEVEL_COLORS_STYLED } from '../lib/utils'

interface ExerciseDetailModalProps {
  exercise: Exercise
  onClose: () => void
  onAddToDay?: (dayName: string) => void
  onDoNow?: () => void
  activeDay?: string
  inDay?: string | null
}

export function ExerciseDetailModal({
  exercise,
  onClose,
  onAddToDay,
  onDoNow,
  activeDay,
  inDay,
}: ExerciseDetailModalProps) {
  const imageIndex = useImageRotation(exercise.imageUrls)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const categoryIcons: Record<string, string> = {
    strength: '💪',
    stretching: '🧘',
    plyometrics: '⚡',
    cardio: '❤️',
    powerlifting: '🏋️',
    'olympic weightlifting': '🥇',
    strongman: '🦾',
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative aspect-square bg-[var(--surface)]">
          {exercise.imageUrls.length > 0 ? (
            <img
              src={exercise.imageUrls[imageIndex]}
              alt={exercise.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-4xl">
              ?
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
          >
            ✕
          </button>

          {/* Image indicator */}
          {exercise.imageUrls.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {exercise.imageUrls.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === imageIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {/* Level badge */}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS_STYLED[exercise.level] ?? 'bg-[var(--surface)]'}`}>
                {exercise.level}
              </span>

              {/* Category */}
              <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface)]">
                {categoryIcons[exercise.category] ?? '🏃'} {exercise.category}
              </span>

              {/* Force */}
              {exercise.force && (
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface)]">
                  {exercise.force === 'push' ? '⬆️' : exercise.force === 'pull' ? '⬇️' : '⏸️'} {exercise.force}
                </span>
              )}

              {/* Mechanic */}
              {exercise.mechanic && (
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface)]">
                  {exercise.mechanic === 'compound' ? '🔗' : '🎯'} {exercise.mechanic}
                </span>
              )}
            </div>
          </div>

          {/* Equipment */}
          {exercise.equipment && (
            <div>
              <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Equipment</h3>
              <p className="text-sm">{exercise.equipment}</p>
            </div>
          )}

          {/* Muscles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Target Muscles</h3>
              <div className="flex flex-wrap gap-1">
                {exercise.targetMuscles.map(muscle => (
                  <span key={muscle} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Secondary</h3>
                <div className="flex flex-wrap gap-1">
                  {exercise.secondaryMuscles.map(muscle => (
                    <span key={muscle} className="px-2 py-0.5 rounded text-xs bg-[var(--surface)]">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <div>
              <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Instructions</h3>
              <ol className="space-y-2">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                      {i + 1}
                    </span>
                    <span className="text-[var(--text-muted)]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Status */}
          {inDay && (
            <div className="text-sm text-[var(--success)]">
              Already in: {inDay}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {activeDay && !inDay && onAddToDay && (
              <button
                onClick={() => {
                  onAddToDay(activeDay)
                  onClose()
                }}
                className="flex-1 py-3 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--surface)]"
              >
                + Add to {activeDay}
              </button>
            )}
            {onDoNow && (
              <button
                onClick={() => {
                  onDoNow()
                  onClose()
                }}
                className="flex-1 py-3 text-sm bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium"
              >
                ▶ Do Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
