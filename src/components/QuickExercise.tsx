import type { HistoryEntry, SetEntry } from '../lib/state'
import { getSetsForExerciseToday, getDefaultRest, predictExerciseValues } from '../lib/state'
import { ExerciseRow } from './ExerciseRow'
import { useExerciseDB } from '../hooks/useExerciseDB'

interface QuickExerciseProps {
  exerciseId: string
  history: HistoryEntry[]
  restTimes: Record<string, number>
  onLogSet: (entry: Omit<SetEntry, 'ts' | 'type'>) => void
  onSetRestTime: (exId: string, seconds: number) => void
  onClose: () => void
  onClearRest: () => void
}

export function QuickExercise({
  exerciseId,
  history,
  restTimes,
  onLogSet,
  onSetRestTime,
  onClose,
  onClearRest,
}: QuickExerciseProps) {
  const { getExercise, dbReady } = useExerciseDB()

  // Force re-render when dbReady changes (e.g., after language switch)
  void dbReady

  const exercise = getExercise(exerciseId)
  const prediction = predictExerciseValues(history, restTimes, exerciseId)
  const todaySets = getSetsForExerciseToday(history, exerciseId)

  return (
    <div className="px-4 pt-4 pb-32">
      <ExerciseRow
        exercise={exercise}
        exerciseId={exerciseId}
        todaySets={todaySets}
        isSelected={true}
        isNextExercise={false}
        prediction={prediction}
        restTime={prediction?.rest ?? getDefaultRest(history, exerciseId, restTimes)}
        history={history}
        onClick={onClose}
        onLogSet={(kg, reps, difficulty, duration) => onLogSet({ exId: exerciseId, kg, reps, difficulty, duration })}
        onSetRestTime={(seconds) => onSetRestTime(exerciseId, seconds)}
        onStartSet={onClearRest}
      />
    </div>
  )
}
