import type { PredictedDifficulty } from '../../lib/state'
import { predictDifficulty, getWeightForDifficulty } from '../../lib/state'

interface DifficultyPredictorProps {
  e1rm: number
  currentKg: number
  currentReps: number
  onSelectDifficulty: (kg: number) => void
}

const DIFFICULTY_CONFIG: Record<PredictedDifficulty, { label: string; color: string; bgColor: string }> = {
  warmup: { label: 'Warmup', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  easy: { label: 'Easy', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  normal: { label: 'Normal', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  hard: { label: 'Hard', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

export function DifficultyPredictor({
  e1rm,
  currentKg,
  currentReps,
  onSelectDifficulty,
}: DifficultyPredictorProps) {
  const predictedDifficulty = predictDifficulty(e1rm, currentKg, currentReps)

  if (!predictedDifficulty) return null

  const config = DIFFICULTY_CONFIG[predictedDifficulty]
  const difficulties: PredictedDifficulty[] = ['warmup', 'easy', 'normal', 'hard']

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--text-muted)]">Predicted:</span>
        <span className={`px-2 py-0.5 rounded ${config.bgColor} ${config.color} font-medium`}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-1">Adjust:</span>
        {difficulties.map(difficulty => {
          const diffConfig = DIFFICULTY_CONFIG[difficulty]
          const targetKg = getWeightForDifficulty(e1rm, currentReps, difficulty)
          const isActive = difficulty === predictedDifficulty

          return (
            <button
              key={difficulty}
              type="button"
              onClick={() => onSelectDifficulty(targetKg)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isActive
                  ? `${diffConfig.bgColor} ${diffConfig.color} font-medium`
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface)]'
              }`}
              title={`${targetKg}kg for ${difficulty}`}
            >
              {diffConfig.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
