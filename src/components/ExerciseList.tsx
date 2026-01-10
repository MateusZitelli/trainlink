import type { Day, HistoryEntry, SetEntry } from '../lib/state'
import { getSetsForExerciseToday, getDefaultRest, predictNextExercise, predictExerciseValues, getCurrentSessionSets } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Reorder, AnimatePresence } from 'motion/react'
import { springs } from '../lib/animations'

interface ExerciseListProps {
  day: Day
  history: HistoryEntry[]
  restTimes: Record<string, number>
  currentExId?: string
  onSelectExercise: (exId: string | undefined) => void
  onRemoveExercise: (exId: string) => void
  onLogSet: (entry: Omit<SetEntry, 'ts' | 'type'>) => void
  onAddExercise: () => void
  onAddExerciseToDay: (exId: string) => void
  onMoveExercise: (fromIndex: number, toIndex: number) => void
  onSetRestTime: (exId: string, seconds: number) => void
  onClearRest: () => void
}

interface SortableItem {
  id: string
  exId: string
}

export function ExerciseList({
  day,
  history,
  restTimes,
  currentExId,
  onSelectExercise,
  onRemoveExercise,
  onLogSet,
  onAddExercise,
  onAddExerciseToDay,
  onMoveExercise,
  onSetRestTime,
  onClearRest,
}: ExerciseListProps) {
  const { t } = useTranslation()
  const { getExercise, dbReady } = useExerciseDB()

  // Force re-render when dbReady changes (e.g., after language switch)
  void dbReady

  // Get current session sets (for unplanned exercises list)
  const currentSessionSets = useMemo(() => getCurrentSessionSets(history), [history])

  // Get prediction for which exercise is "next" (for arrow indicator)
  const nextExercisePrediction = useMemo(() => predictNextExercise(history, restTimes), [history, restTimes])

  // Get exercises done in current session that aren't in the plan
  const unplannedExercises = useMemo(() => {
    const doneExIds = new Set(currentSessionSets.map(s => s.exId))
    const plannedExIds = new Set(day.exercises)
    const unplanned = Array.from(doneExIds).filter(exId => !plannedExIds.has(exId))

    // If there's a selected exercise that's not in the plan and not already in unplanned, add it
    if (currentExId && !plannedExIds.has(currentExId) && !unplanned.includes(currentExId)) {
      unplanned.unshift(currentExId) // Add at the beginning
    }

    return unplanned
  }, [currentSessionSets, day.exercises, currentExId])

  // Create unique IDs for sortable (handle duplicate exercises)
  const sortableItems: SortableItem[] = useMemo(() =>
    day.exercises.map((exId, index) => ({
      id: `${exId}-${index}`,
      exId,
    })),
    [day.exercises]
  )

  const handleReorder = useCallback((newItems: SortableItem[]) => {
    // Find what moved by comparing old and new positions
    const oldIds = sortableItems.map(item => item.id)
    const newIds = newItems.map(item => item.id)

    // Find the item that moved
    for (let i = 0; i < oldIds.length; i++) {
      if (oldIds[i] !== newIds[i]) {
        const movedId = oldIds[i]
        const newIndex = newIds.indexOf(movedId)
        if (newIndex !== -1 && newIndex !== i) {
          onMoveExercise(i, newIndex)
          return
        }
      }
    }
  }, [sortableItems, onMoveExercise])

  return (
    <div className="px-4 pb-4 space-y-2">
      <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
        {t('exercise.plan')} — {day.name}
      </h2>

      <Reorder.Group
        axis="y"
        values={sortableItems}
        onReorder={handleReorder}
        className="space-y-2"
      >
        <AnimatePresence initial={false}>
          {sortableItems.map((item) => {
            const exercise = getExercise(item.exId)
            const prediction = predictExerciseValues(history, restTimes, item.exId)
            const todaySets = getSetsForExerciseToday(history, item.exId)
            const isSelected = currentExId === item.exId
            const isNextExercise = nextExercisePrediction?.exId === item.exId

            return (
              <Reorder.Item
                key={item.id}
                value={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={springs.snappy}
                whileDrag={{
                  scale: 1.02,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  cursor: 'grabbing'
                }}
                style={{ position: 'relative' }}
              >
                <ExerciseRow
                  exercise={exercise}
                  exerciseId={item.exId}
                  todaySets={todaySets}
                  isSelected={isSelected}
                  isNextExercise={isNextExercise}
                  prediction={prediction}
                  restTime={prediction?.rest ?? getDefaultRest(history, item.exId, restTimes)}
                  history={history}
                  onClick={() => onSelectExercise(isSelected ? undefined : item.exId)}
                  onRemove={() => onRemoveExercise(item.exId)}
                  onLogSet={(kg, reps, difficulty, duration) => onLogSet({ exId: item.exId, kg, reps, difficulty, duration })}
                  onSetRestTime={(seconds) => onSetRestTime(item.exId, seconds)}
                  onStartSet={onClearRest}
                />
              </Reorder.Item>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add Exercise Button */}
      <button
        onClick={onAddExercise}
        className="w-full py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-dashed border-[var(--border)] rounded-lg"
      >
        {t('exercise.addExercise')}
      </button>

      {/* Unplanned exercises (done or currently selected) */}
      {unplannedExercises.length > 0 && (
        <>
          <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3 mt-6">
            {t('exercise.otherExercises')}
          </h2>

          {unplannedExercises.map((exId) => {
            const exercise = getExercise(exId)
            const prediction = predictExerciseValues(history, restTimes, exId)
            const todaySets = getSetsForExerciseToday(history, exId)
            const isSelected = currentExId === exId
            const isNextExercise = nextExercisePrediction?.exId === exId

            return (
              <ExerciseRow
                key={exId}
                exercise={exercise}
                exerciseId={exId}
                todaySets={todaySets}
                isSelected={isSelected}
                isNextExercise={isNextExercise}
                prediction={prediction}
                restTime={prediction?.rest ?? getDefaultRest(history, exId, restTimes)}
                history={history}
                onClick={() => onSelectExercise(isSelected ? undefined : exId)}
                onAddToPlan={() => onAddExerciseToDay(exId)}
                onLogSet={(kg, reps, difficulty, duration) => onLogSet({ exId, kg, reps, difficulty, duration })}
                onSetRestTime={(seconds) => onSetRestTime(exId, seconds)}
                onStartSet={onClearRest}
              />
            )
          })}
        </>
      )}
    </div>
  )
}
