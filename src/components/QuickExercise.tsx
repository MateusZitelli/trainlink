import type { HistoryEntry, SetEntry } from '../lib/state'
import { getLastSet, getSetsForExerciseToday, getDefaultRest } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'

interface QuickExerciseProps {
  exerciseId: string
  history: HistoryEntry[]
  restTimes: Record<string, number>
  onLogSet: (entry: Omit<SetEntry, 'ts' | 'type'>) => void
  onSetRestTime: (exId: string, seconds: number) => void
  onClose: () => void
}

export function QuickExercise({
  exerciseId,
  history,
  restTimes,
  onLogSet,
  onSetRestTime,
  onClose,
}: QuickExerciseProps) {
  const { getExercise } = useExerciseDB()
  const exercise = getExercise(exerciseId)
  const lastSet = getLastSet(history, exerciseId)
  const todaySets = getSetsForExerciseToday(history, exerciseId)

  return (
    <div className="px-4 pt-4 pb-32">
      <ExerciseRow
        exercise={exercise}
        exerciseId={exerciseId}
        lastSet={lastSet}
        todaySets={todaySets}
        isSelected={true}
        restTime={getDefaultRest(history, exerciseId, restTimes)}
        onClick={onClose}
        onLogSet={(kg, reps) => onLogSet({ exId: exerciseId, kg, reps })}
        onSetRestTime={(seconds) => onSetRestTime(exerciseId, seconds)}
      />
    </div>
  )
}
