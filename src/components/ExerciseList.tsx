import type { Day, HistoryEntry, SetEntry } from '../lib/state'
import { getSetsForExerciseToday, getDefaultRest, predictNextExercise, predictExerciseValues, getCurrentSessionSets } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Reorder, AnimatePresence, useDragControls } from 'motion/react'
import { springs } from '../lib/animations'

// Wrapper component for reorderable exercise row
// Uses a drag handle for reliable mobile experience
function ReorderableExerciseRow({
  item,
  children,
}: {
  item: SortableItem
  children: React.ReactNode
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={springs.snappy}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        zIndex: 50,
      }}
      className="relative"
    >
      <div className="flex">
        <div className="flex-1">{children}</div>
        <div
          className="flex items-center px-2 text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            e.preventDefault()
            controls.start(e)
          }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" className="opacity-40">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="6" cy="2" r="1.5" />
            <circle cx="2" cy="7" r="1.5" />
            <circle cx="6" cy="7" r="1.5" />
            <circle cx="2" cy="12" r="1.5" />
            <circle cx="6" cy="12" r="1.5" />
          </svg>
        </div>
      </div>
    </Reorder.Item>
  )
}

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
  index: number
}

// Create items from exercises array
function createItems(exercises: string[]): SortableItem[] {
  return exercises.map((exId, index) => ({
    id: `${exId}-${index}`,
    exId,
    index,
  }))
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

  void dbReady

  // Local state for the reorderable list
  const [items, setItems] = useState<SortableItem[]>(() => createItems(day.exercises))

  // Track if we're the source of the change to prevent sync loops
  const isInternalUpdate = useRef(false)

  // Sync from parent when exercises change externally
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    setItems(createItems(day.exercises))
  }, [day.exercises])

  const currentSessionSets = useMemo(() => getCurrentSessionSets(history), [history])
  const nextExercisePrediction = useMemo(() => predictNextExercise(history, restTimes), [history, restTimes])

  const unplannedExercises = useMemo(() => {
    const doneExIds = new Set(currentSessionSets.map(s => s.exId))
    const plannedExIds = new Set(day.exercises)
    const unplanned = Array.from(doneExIds).filter(exId => !plannedExIds.has(exId))

    if (currentExId && !plannedExIds.has(currentExId) && !unplanned.includes(currentExId)) {
      unplanned.unshift(currentExId)
    }

    return unplanned
  }, [currentSessionSets, day.exercises, currentExId])

  const handleReorder = (newItems: SortableItem[]) => {
    // Find which item moved
    let fromIndex = -1
    let toIndex = -1

    for (let i = 0; i < items.length; i++) {
      const newPosition = newItems.findIndex(item => item.id === items[i].id)
      if (newPosition !== i) {
        fromIndex = i
        toIndex = newPosition
        break
      }
    }

    if (fromIndex === -1 || toIndex === -1) return

    // Update local state immediately
    setItems(newItems)

    // Mark as internal update so useEffect doesn't fight us
    isInternalUpdate.current = true

    // Notify parent
    onMoveExercise(fromIndex, toIndex)
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
        {t('exercise.plan')} — {day.name}
      </h2>

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className="space-y-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => {
            const exercise = getExercise(item.exId)
            const prediction = predictExerciseValues(history, restTimes, item.exId)
            const todaySets = getSetsForExerciseToday(history, item.exId)
            const isSelected = currentExId === item.exId
            const isNextExercise = nextExercisePrediction?.exId === item.exId

            return (
              <ReorderableExerciseRow key={item.id} item={item}>
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
              </ReorderableExerciseRow>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>

      <button
        onClick={onAddExercise}
        className="w-full py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-dashed border-[var(--border)] rounded-lg hover:border-[var(--text-muted)] transition-colors"
      >
        {t('exercise.addExercise')}
      </button>

      <AnimatePresence>
        {unplannedExercises.length > 0 && (
          <div>
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
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
