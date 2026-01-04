import type { SetEntry, NextExercisePrediction, Difficulty, HistoryEntry } from '../lib/state'
import { formatDetailedPrediction, getLastSet } from '../lib/state'
import { useState, useEffect, useMemo } from 'react'

// Get color class for difficulty
function getDifficultyColor(difficulty?: Difficulty): string {
  switch (difficulty) {
    case 'easy': return 'bg-blue-500'
    case 'hard': return 'bg-orange-500'
    case 'normal':
    default: return 'bg-[var(--success)]'
  }
}

// Display sets as colored dots
function SetsDisplay({ sets }: { sets: SetEntry[] }) {
  if (sets.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {sets.map((set, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${getDifficultyColor(set.difficulty)}`}
          title={`${set.kg}kg × ${set.reps}${set.difficulty ? ` (${set.difficulty})` : ''}`}
        />
      ))}
      <span className="text-xs text-[var(--text-muted)] ml-1">{sets.length} today</span>
    </div>
  )
}

// Get text color for difficulty
function getDifficultyTextColor(difficulty?: Difficulty): string {
  switch (difficulty) {
    case 'easy': return 'text-blue-400'
    case 'hard': return 'text-orange-400'
    case 'normal': return 'text-[var(--success)]'
    default: return 'text-[var(--text-muted)]'
  }
}

// Render prediction info with proper styling
function PredictionDisplay({ prediction }: { prediction: NextExercisePrediction }) {
  const { reason } = prediction

  // For history-dropset, render pattern with styled sets
  if (reason.type === 'history-dropset') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[var(--text-muted)]">Following last session:</span>
        {reason.pattern.map((set, i) => {
          const isCompleted = i < reason.currentIndex
          const isCurrent = i === reason.currentIndex
          const isFuture = i > reason.currentIndex
          const difficultyColor = getDifficultyTextColor(set.difficulty)

          return (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-1 text-[var(--text-muted)]">→</span>}
              <span
                className={`
                  ${isCompleted ? difficultyColor + ' opacity-60' : ''}
                  ${isCurrent ? 'text-blue-400 font-semibold bg-blue-500/20 px-1.5 py-0.5 rounded' : ''}
                  ${isFuture ? difficultyColor + ' opacity-40' : ''}
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
  if (reason.type === 'history-dropset-start') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[var(--text-muted)]">Last session:</span>
        {reason.pattern.map((set, i) => {
          const difficultyColor = getDifficultyTextColor(set.difficulty)
          return (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-1 text-[var(--text-muted)]">→</span>}
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
  return <span className="text-blue-400">{formatDetailedPrediction(prediction)}</span>
}

interface Exercise {
  exerciseId: string
  name: string
  targetMuscles?: string[]
  equipment?: string | null
  imageUrls?: string[]
  instructions?: string[]
  level?: string
  force?: string | null
  mechanic?: string | null
  category?: string
}

interface ExerciseRowProps {
  exercise: Exercise | null
  exerciseId: string
  todaySets: SetEntry[]
  isSelected: boolean
  isNextExercise: boolean
  prediction: NextExercisePrediction | null
  restTime: number
  history: HistoryEntry[]
  onClick: () => void
  onRemove?: () => void
  onAddToPlan?: () => void
  onLogSet: (kg: number, reps: number, difficulty?: Difficulty, duration?: number) => void
  onSetRestTime: (seconds: number) => void
  onStartSet?: () => void
}

export function ExerciseRow({
  exercise,
  exerciseId,
  todaySets,
  isSelected,
  isNextExercise,
  prediction,
  restTime,
  history,
  onClick,
  onRemove,
  onAddToPlan,
  onLogSet,
  onSetRestTime,
  onStartSet,
}: ExerciseRowProps) {
  // Use predicted values when available
  const defaultKg = prediction?.kg
  const defaultReps = prediction?.reps

  // Form state
  const [kg, setKg] = useState(defaultKg?.toString() ?? '')
  const [reps, setReps] = useState(defaultReps?.toString() ?? '')
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [showFullImage, setShowFullImage] = useState(false)

  // Derived: highlight if current value matches predicted
  const isKgPredicted = prediction !== null && kg === String(prediction.kg)
  const isRepsPredicted = prediction !== null && reps === String(prediction.reps)

  // Get last set's duration for this exercise
  const lastSetDuration = useMemo(() => {
    const lastSet = getLastSet(history, exerciseId)
    return lastSet?.duration
  }, [history, exerciseId])

  // Reset form when exercise changes
  useEffect(() => {
    setSetStartedAt(null)
    setElapsed(0)
    setImageIndex(0)
    setShowFullImage(false)
  }, [exerciseId])

  // Update kg/reps when prediction values change (but don't reset timer)
  useEffect(() => {
    setKg(prediction?.kg?.toString() ?? '')
    setReps(prediction?.reps?.toString() ?? '')
  }, [prediction?.kg, prediction?.reps])

  // Animate through images
  const imageUrls = exercise?.imageUrls ?? []
  useEffect(() => {
    if (imageUrls.length <= 1) return
    const interval = setInterval(() => {
      setImageIndex(i => (i + 1) % imageUrls.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [imageUrls.length])

  // Timer for active set
  useEffect(() => {
    if (!setStartedAt) {
      setElapsed(0)
      return
    }

    const update = () => {
      setElapsed(Math.floor((Date.now() - setStartedAt) / 1000))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [setStartedAt])

  const handleStart = () => {
    setSetStartedAt(Date.now())
    onStartSet?.()
  }

  const handleFinish = (difficulty?: Difficulty) => {
    const kgNum = parseFloat(kg)
    const repsNum = parseInt(reps)
    if (!isNaN(kgNum) && !isNaN(repsNum) && repsNum > 0) {
      // Calculate duration if we have a start time
      const duration = setStartedAt ? Math.floor((Date.now() - setStartedAt) / 1000) : undefined
      onLogSet(kgNum, repsNum, difficulty, duration)
      setSetStartedAt(null)
      setElapsed(0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const name = exercise?.name ?? exerciseId
  const meta = [
    exercise?.targetMuscles?.[0],
    exercise?.equipment,
  ].filter(Boolean).join(' · ')

  const isActive = setStartedAt !== null

  const handleQuickStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSetStartedAt(Date.now())
    onStartSet?.()
    onClick() // Expand to show the timer
  }

  const handleQuickFinish = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleFinish()
  }

  // Check if we have params for quick start (from prediction)
  const hasParams = prediction !== null

  // Collapsed view
  if (!isSelected) {
    return (
      <div className={`rounded-lg ${isNextExercise ? 'bg-blue-500/5' : ''}`}>
        <div
          className="flex items-center gap-2 p-3 cursor-pointer"
          onClick={onClick}
        >
          {/* Next exercise indicator */}
          {isNextExercise && (
            <span className="text-lg text-blue-500">→</span>
          )}

          {/* Exercise image */}
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[imageIndex]}
              alt={name}
              className="w-16 h-16 rounded-lg object-cover bg-[var(--surface)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] text-sm">
              ?
            </div>
          )}

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{name}</div>
            {meta && (
              <div className="text-sm text-[var(--text-muted)] truncate">{meta}</div>
            )}
          </div>

          {/* Parameters & status */}
          <div className="text-right shrink-0">
            {hasParams ? (
              // Show predicted params
              <div className="text-sm text-[var(--text-muted)]">
                {prediction.kg}kg × {prediction.reps}
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)]">New</div>
            )}
            {/* Rest time */}
            <div className="text-xs text-[var(--text-muted)]">
              {restTime}s rest
            </div>
            <SetsDisplay sets={todaySets} />
          </div>

          {/* Quick Start/Finish button */}
          {isActive ? (
            <button
              onClick={handleQuickFinish}
              className="p-2 bg-[var(--success)] text-white rounded-lg shrink-0"
              aria-label="Finish set"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          ) : hasParams ? (
            <button
              onClick={handleQuickStart}
              className="p-2 bg-[var(--text)] text-[var(--bg)] rounded-lg shrink-0"
              aria-label="Start set"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          ) : null}

          {/* Add to plan button */}
          {onAddToPlan && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToPlan()
              }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--success)]"
              aria-label="Add to plan"
            >
              +
            </button>
          )}
        </div>
      </div>
    )
  }

  // Expanded view - ACTIVE (compact UI)
  if (isActive) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-4 space-y-4">
        {/* Header with image and timer side by side */}
        <div className="flex gap-4 cursor-pointer" onClick={onClick}>
          {/* Large image */}
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[imageIndex]}
              alt={name}
              className="w-32 h-32 rounded-lg object-cover bg-[var(--bg)]"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] text-xl">
              ?
            </div>
          )}

          {/* Timer, info, and prediction */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold">{formatTime(elapsed)}</span>
              {lastSetDuration !== undefined && (
                <span className="text-lg text-[var(--text-muted)] font-mono">/ {formatTime(lastSetDuration)}</span>
              )}
            </div>
            <div className="text-sm text-[var(--text-muted)] mt-1">{name} · {kg}kg × {reps}</div>
            {/* Prediction info inline */}
            {prediction && (
              <div className="text-sm text-blue-400 mt-1">
                <PredictionDisplay prediction={prediction} />
              </div>
            )}
          </div>
        </div>

        {/* How was it? + Three finish buttons */}
        <div className="text-sm text-[var(--text-muted)] text-center">How was it?</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleFinish('easy')
            }}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium cursor-pointer"
          >
            Easy
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleFinish('normal')
            }}
            className="flex-1 py-3 bg-[var(--success)] text-white rounded-lg font-medium cursor-pointer"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleFinish('hard')
            }}
            className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium cursor-pointer"
          >
            Hard
          </button>
        </div>
      </div>
    )
  }

  // Expanded view - NOT ACTIVE (full UI)
  return (
    <div className="bg-[var(--surface)] rounded-lg p-4 space-y-4">
      {/* Full screen image modal */}
      {showFullImage && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={imageUrls[imageIndex]}
            alt={name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Header - clickable to collapse */}
      <div className="flex gap-4 cursor-pointer" onClick={onClick}>
        {/* Large image - clickable to expand */}
        {imageUrls.length > 0 ? (
          <img
            src={imageUrls[imageIndex]}
            alt={name}
            className="w-28 h-28 rounded-lg object-cover bg-[var(--bg)] cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation()
              setShowFullImage(true)
            }}
          />
        ) : (
          <div className="w-28 h-28 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] text-xl">
            ?
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium text-lg">{name}</div>
          {meta && <div className="text-sm text-[var(--text-muted)]">{meta}</div>}
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {todaySets.length > 0 ? (
              <span>Set #{todaySets.length + 1}</span>
            ) : prediction ? (
              <span>Suggested: {prediction.kg}kg × {prediction.reps}</span>
            ) : (
              <span>First set</span>
            )}
          </div>
          <SetsDisplay sets={todaySets} />
        </div>

        <div className="flex self-start">
          {onAddToPlan && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToPlan()
              }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--success)]"
              aria-label="Add to plan"
            >
              +
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-2 text-[var(--text-muted)] hover:text-red-500"
              aria-label="Remove exercise"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Prediction info */}
      {prediction && (isKgPredicted || isRepsPredicted) && (
        <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
          <PredictionDisplay prediction={prediction} />
        </div>
      )}

      {/* Weight, Reps & Rest inputs */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={`block text-sm mb-1 ${isKgPredicted ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
            Weight {isKgPredicted && <span className="text-xs">(predicted)</span>}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={`w-full px-2 py-2 bg-[var(--bg)] border rounded-lg text-center text-lg ${
                isKgPredicted
                  ? 'border-blue-500/50 text-blue-400'
                  : 'border-[var(--border)]'
              }`}
              placeholder="0"
            />
            <span className="text-[var(--text-muted)] text-sm">kg</span>
          </div>
        </div>

        <div className="flex-1">
          <label className={`block text-sm mb-1 ${isRepsPredicted ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
            Reps {isRepsPredicted && <span className="text-xs">(predicted)</span>}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`w-full px-2 py-2 bg-[var(--bg)] border rounded-lg text-center text-lg ${
              isRepsPredicted
                ? 'border-blue-500/50 text-blue-400'
                : 'border-[var(--border)]'
            }`}
            placeholder="0"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm text-[var(--text-muted)] mb-1">Rest</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={restTime}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val) && val > 0) onSetRestTime(val)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-center text-lg"
              placeholder="90"
            />
            <span className="text-[var(--text-muted)] text-sm">s</span>
          </div>
        </div>
      </div>

      {/* Instructions - collapsible */}
      {exercise?.instructions && exercise.instructions.length > 0 && (
        <details className="bg-[var(--bg)] rounded-lg">
          <summary className="px-3 py-2 text-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)]">
            How to perform ({exercise.instructions.length} steps)
          </summary>
          <ol className="px-3 pb-3 space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <span className="text-[var(--text-muted)]">{step}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* Start button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleStart()
        }}
        className="w-full py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Set {todaySets.length > 0 && `#${todaySets.length + 1}`}
      </button>
    </div>
  )
}
