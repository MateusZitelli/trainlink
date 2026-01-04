import type { NextExercisePrediction } from "../../lib/state"
import { formatDetailedPrediction } from "../../lib/state"
import { getDifficultyTextColor } from "../../lib/utils"

interface PredictionDisplayProps {
  prediction: NextExercisePrediction
}

export function PredictionDisplay({ prediction }: PredictionDisplayProps) {
  const { reason } = prediction

  // For history-dropset, render pattern with styled sets
  if (reason.type === "history-dropset") {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[var(--text-muted)]">
          Following last session:
        </span>
        {reason.pattern.map((set, i) => {
          const isCompleted = i < reason.currentIndex
          const isCurrent = i === reason.currentIndex
          const isFuture = i > reason.currentIndex
          const difficultyColor = getDifficultyTextColor(set.difficulty)

          return (
            <span key={i} className="flex items-center">
              {i > 0 && (
                <span className="mx-1 text-[var(--text-muted)]">→</span>
              )}
              <span
                className={`
                  ${isCompleted ? difficultyColor + " opacity-60" : ""}
                  ${isCurrent ? "text-blue-400 font-semibold bg-blue-500/20 px-1.5 py-0.5 rounded" : ""}
                  ${isFuture ? difficultyColor + " opacity-40" : ""}
                `}
              >
                {isCompleted && <span className="mr-1">✓</span>}
                {set.kg}kg × {set.reps}
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  // For history-dropset-start, render pattern with colored difficulty
  if (reason.type === "history-dropset-start") {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[var(--text-muted)]">Last session:</span>
        {reason.pattern.map((set, i) => {
          const difficultyColor = getDifficultyTextColor(set.difficulty)
          return (
            <span key={i} className="flex items-center">
              {i > 0 && (
                <span className="mx-1 text-[var(--text-muted)]">→</span>
              )}
              <span className={difficultyColor}>
                {set.kg}kg × {set.reps}
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  // For other prediction types, use the text formatter with blue styling
  return (
    <span className="text-blue-400">
      {formatDetailedPrediction(prediction)}
    </span>
  )
}
