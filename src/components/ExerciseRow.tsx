import type { SetEntry } from '../lib/state'
import { useState, useEffect } from 'react'

interface Exercise {
  exerciseId: string
  name: string
  targetMuscles?: string[]
  equipments?: string[]
  imageUrls?: string[]
}

interface ExerciseRowProps {
  exercise: Exercise | null
  exerciseId: string
  lastSet?: SetEntry
  todaySets: SetEntry[]
  isSelected: boolean
  isPredicted?: boolean
  restTime: number
  onClick: () => void
  onRemove?: () => void
  onAddToPlan?: () => void
  onLogSet: (kg: number, reps: number) => void
  onSetRestTime: (seconds: number) => void
}

export function ExerciseRow({
  exercise,
  exerciseId,
  lastSet,
  todaySets,
  isSelected,
  isPredicted,
  restTime,
  onClick,
  onRemove,
  onAddToPlan,
  onLogSet,
  onSetRestTime,
}: ExerciseRowProps) {
  // Form state
  const [kg, setKg] = useState(lastSet?.kg?.toString() ?? '')
  const [reps, setReps] = useState(lastSet?.reps?.toString() ?? '')
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [showFullImage, setShowFullImage] = useState(false)

  // Reset form when exercise changes
  useEffect(() => {
    setKg(lastSet?.kg?.toString() ?? '')
    setReps(lastSet?.reps?.toString() ?? '')
    setSetStartedAt(null)
    setElapsed(0)
    setImageIndex(0)
    setShowFullImage(false)
  }, [exerciseId, lastSet])

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
  }

  const handleFinish = () => {
    const kgNum = parseFloat(kg)
    const repsNum = parseInt(reps)
    if (!isNaN(kgNum) && !isNaN(repsNum) && repsNum > 0) {
      onLogSet(kgNum, repsNum)
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
    exercise?.equipments?.[0],
  ].filter(Boolean).join(' · ')

  const isActive = setStartedAt !== null

  const handleQuickStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSetStartedAt(Date.now())
    onClick() // Expand to show the timer
  }

  const handleQuickFinish = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleFinish()
  }

  // Check if we have all params for quick start
  const hasParams = lastSet !== undefined

  // Collapsed view
  if (!isSelected) {
    return (
      <div className="rounded-lg">
        <div
          className="flex items-center gap-2 p-3 cursor-pointer"
          onClick={onClick}
        >
          {/* Prediction indicator */}
          {isPredicted && (
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
            {isActive ? (
              // Active set - show timer
              <div className="text-sm font-mono font-bold text-[var(--success)]">
                {formatTime(elapsed)}
              </div>
            ) : hasParams ? (
              // Show last set params
              <div className="text-sm text-[var(--text-muted)]">
                {lastSet.kg}kg × {lastSet.reps}
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)]">New</div>
            )}
            {/* Rest time */}
            <div className="text-xs text-[var(--text-muted)]">
              {restTime}s rest
            </div>
            {todaySets.length > 0 && (
              <div className="text-xs text-[var(--success)]">
                {todaySets.length} today
              </div>
            )}
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

  // Expanded view
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
            ) : lastSet ? (
              <span>Last: {lastSet.kg}kg × {lastSet.reps}</span>
            ) : (
              <span>First set</span>
            )}
          </div>
          {todaySets.length > 0 && (
            <div className="text-sm text-[var(--success)]">{todaySets.length} done today</div>
          )}
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

      {/* Active set timer */}
      {isActive && (
        <div className="flex items-center justify-center py-4 bg-[var(--bg)] rounded-lg">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold">{formatTime(elapsed)}</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Set in progress</div>
          </div>
        </div>
      )}

      {/* Weight, Reps & Rest inputs */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm text-[var(--text-muted)] mb-1">Weight</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-center text-lg"
              placeholder="0"
            />
            <span className="text-[var(--text-muted)] text-sm">kg</span>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm text-[var(--text-muted)] mb-1">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-center text-lg"
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

      {/* Start / Finish buttons */}
      {!isActive ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleStart()
          }}
          className="w-full py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start Set {todaySets.length > 0 && `#${todaySets.length + 1}`}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleFinish()
          }}
          className="w-full py-3 bg-[var(--success)] text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Finish Set
        </button>
      )}
    </div>
  )
}
