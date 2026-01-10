import type { Day, HistoryEntry, SetEntry } from '../lib/state'
import { getSetsForExerciseToday, getDefaultRest, predictNextExercise, predictExerciseValues, getCurrentSessionSets } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'

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
  const sortableItems = day.exercises.map((exId, index) => ({
    id: `${exId}-${index}`,
    exId,
  }))

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (source.index === destination.index) return
    onMoveExercise(source.index, destination.index)
  }, [onMoveExercise])

  return (
    <div className="px-4 pb-4 space-y-2">
      <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
        {t('exercise.plan')} — {day.name}
      </h2>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="exercise-list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {sortableItems.map((item, index) => {
                const exercise = getExercise(item.exId)
                const prediction = predictExerciseValues(history, restTimes, item.exId)
                const todaySets = getSetsForExerciseToday(history, item.exId)
                const isSelected = currentExId === item.exId
                const isNextExercise = nextExercisePrediction?.exId === item.exId

                return (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
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
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

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
