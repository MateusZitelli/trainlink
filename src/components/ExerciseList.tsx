import type { Day, HistoryEntry, SetEntry } from '../lib/state'
import { getLastSet, getSetsForExerciseToday, getDefaultRest, predictNextExercise, getCurrentSessionSets } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useDragReorder } from '../hooks/useDragReorder'
import { useRef, useMemo } from 'react'

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
}: ExerciseListProps) {
  const { getExercise } = useExerciseDB()
  const { draggedIndex, dropTargetIndex, getDragProps, getTouchProps, handleTouchEnd } = useDragReorder(onMoveExercise)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Get prediction for next exercise
  const prediction = useMemo(() => predictNextExercise(history, restTimes), [history, restTimes])

  // Get exercises done in current session that aren't in the plan
  const unplannedExercises = useMemo(() => {
    const currentSets = getCurrentSessionSets(history)
    const doneExIds = new Set(currentSets.map(s => s.exId))
    const plannedExIds = new Set(day.exercises)
    return Array.from(doneExIds).filter(exId => !plannedExIds.has(exId))
  }, [history, day.exercises])

  const handleItemTouchEnd = (e: React.TouchEvent) => {
    const items = Array.from(itemRefs.current.entries()).map(([index, element]) => ({
      index,
      element,
    }))
    handleTouchEnd(items, e)
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
        Plan — {day.name}
      </h2>

      {day.exercises.map((exId, index) => {
        const exercise = getExercise(exId)
        const lastSet = getLastSet(history, exId)
        const todaySets = getSetsForExerciseToday(history, exId)
        const isSelected = currentExId === exId
        const isDragged = draggedIndex === index
        const isDropTarget = dropTargetIndex === index

        return (
          <div
            key={`${exId}-${index}`}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el)
              else itemRefs.current.delete(index)
            }}
            className={`${isDragged ? 'opacity-50' : ''} ${isDropTarget ? 'border-t-2 border-[var(--text)]' : ''}`}
            {...getDragProps(index)}
            {...getTouchProps(index)}
            onTouchEnd={handleItemTouchEnd}
          >
            <div className="flex items-center gap-1">
              {/* Reorder arrows */}
              <div className="flex flex-col -my-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (index > 0) onMoveExercise(index, index - 1)
                  }}
                  disabled={index === 0}
                  className="p-1 text-[var(--text-muted)] disabled:opacity-30 text-xs"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (index < day.exercises.length - 1) onMoveExercise(index, index + 1)
                  }}
                  disabled={index === day.exercises.length - 1}
                  className="p-1 text-[var(--text-muted)] disabled:opacity-30 text-xs"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>

              <div className="flex-1">
                <ExerciseRow
                  exercise={exercise}
                  exerciseId={exId}
                  lastSet={lastSet}
                  todaySets={todaySets}
                  isSelected={isSelected}
                  isPredicted={prediction?.exId === exId}
                  restTime={getDefaultRest(history, exId, restTimes)}
                  onClick={() => onSelectExercise(isSelected ? undefined : exId)}
                  onRemove={() => onRemoveExercise(exId)}
                  onLogSet={(kg, reps) => onLogSet({ exId, kg, reps })}
                  onSetRestTime={(seconds) => onSetRestTime(exId, seconds)}
                />
              </div>
            </div>
          </div>
        )
      })}

      {/* Add Exercise Button */}
      <button
        onClick={onAddExercise}
        className="w-full py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-dashed border-[var(--border)] rounded-lg"
      >
        + Add exercise
      </button>

      {/* Unplanned exercises done in this session */}
      {unplannedExercises.length > 0 && (
        <>
          <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3 mt-6">
            Also done today
          </h2>

          {unplannedExercises.map((exId) => {
            const exercise = getExercise(exId)
            const lastSet = getLastSet(history, exId)
            const todaySets = getSetsForExerciseToday(history, exId)
            const isSelected = currentExId === exId

            return (
              <div key={exId}>
                <div className="flex items-center gap-1">
                  {/* Spacer to align with planned exercises */}
                  <div className="w-6" />

                  <div className="flex-1">
                    <ExerciseRow
                      exercise={exercise}
                      exerciseId={exId}
                      lastSet={lastSet}
                      todaySets={todaySets}
                      isSelected={isSelected}
                      isPredicted={prediction?.exId === exId}
                      restTime={getDefaultRest(history, exId, restTimes)}
                      onClick={() => onSelectExercise(isSelected ? undefined : exId)}
                      onAddToPlan={() => onAddExerciseToDay(exId)}
                      onLogSet={(kg, reps) => onLogSet({ exId, kg, reps })}
                      onSetRestTime={(seconds) => onSetRestTime(exId, seconds)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
