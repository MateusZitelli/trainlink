import type { Day, HistoryEntry, SetEntry } from '../lib/state'
import { getLastSet, getSetsForExerciseToday, getDefaultRest, predictNextExercise, getCurrentSessionSets } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface SortableExerciseProps {
  id: string
  exId: string
  history: HistoryEntry[]
  restTimes: Record<string, number>
  currentExId?: string
  isPredicted: boolean
  onSelectExercise: (exId: string | undefined) => void
  onRemoveExercise: (exId: string) => void
  onLogSet: (entry: Omit<SetEntry, 'ts' | 'type'>) => void
  onSetRestTime: (exId: string, seconds: number) => void
}

function SortableExercise({
  id,
  exId,
  history,
  restTimes,
  currentExId,
  isPredicted,
  onSelectExercise,
  onRemoveExercise,
  onLogSet,
  onSetRestTime,
}: SortableExerciseProps) {
  const { getExercise } = useExerciseDB()
  const exercise = getExercise(exId)
  const lastSet = getLastSet(history, exId)
  const todaySets = getSetsForExerciseToday(history, exId)
  const isSelected = currentExId === exId

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ExerciseRow
        exercise={exercise}
        exerciseId={exId}
        lastSet={lastSet}
        todaySets={todaySets}
        isSelected={isSelected}
        isPredicted={isPredicted}
        restTime={getDefaultRest(history, exId, restTimes)}
        onClick={() => onSelectExercise(isSelected ? undefined : exId)}
        onRemove={() => onRemoveExercise(exId)}
        onLogSet={(kg, reps) => onLogSet({ exId, kg, reps })}
        onSetRestTime={(seconds) => onSetRestTime(exId, seconds)}
      />
    </div>
  )
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

  // Get prediction for next exercise
  const prediction = useMemo(() => predictNextExercise(history, restTimes), [history, restTimes])

  // Get exercises done in current session that aren't in the plan
  const unplannedExercises = useMemo(() => {
    const currentSets = getCurrentSessionSets(history)
    const doneExIds = new Set(currentSets.map(s => s.exId))
    const plannedExIds = new Set(day.exercises)
    return Array.from(doneExIds).filter(exId => !plannedExIds.has(exId))
  }, [history, day.exercises])

  // Create unique IDs for sortable (handle duplicate exercises)
  const sortableItems = day.exercises.map((exId, index) => ({
    id: `${exId}-${index}`,
    exId,
  }))

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = sortableItems.findIndex(item => item.id === active.id)
      const newIndex = sortableItems.findIndex(item => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveExercise(oldIndex, newIndex)
      }
    }
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
        Plan — {day.name}
      </h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sortableItems.map((item) => (
              <SortableExercise
                key={item.id}
                id={item.id}
                exId={item.exId}
                history={history}
                restTimes={restTimes}
                currentExId={currentExId}
                isPredicted={prediction?.exId === item.exId}
                onSelectExercise={onSelectExercise}
                onRemoveExercise={onRemoveExercise}
                onLogSet={onLogSet}
                onSetRestTime={onSetRestTime}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
              <ExerciseRow
                key={exId}
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
            )
          })}
        </>
      )}
    </div>
  )
}
