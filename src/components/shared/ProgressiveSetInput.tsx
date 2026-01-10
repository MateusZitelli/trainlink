import { useState, useEffect } from 'react'
import type { Difficulty, PredictedDifficulty } from '../../lib/state'
import { predictDifficulty, getWeightForDifficulty } from '../../lib/state'

interface LastSessionSet {
  kg: number
  reps: number
  difficulty?: Difficulty
}

interface ProgressiveSetInputProps {
  // Current values
  kg: string
  reps: string
  restTime: number
  // e1RM for difficulty calculation
  e1rm: number | null
  // Last session data
  lastSessionSets: LastSessionSet[]
  // Current set number
  setNumber: number
  // Timer state
  isTimerRunning: boolean
  elapsed: number
  // Callbacks
  onKgChange: (kg: string) => void
  onRepsChange: (reps: string) => void
  onRestTimeChange: (seconds: number) => void
  onStart: () => void
  onFinish: (difficulty: Difficulty, actualKg: number, actualReps: number) => void
}

type UIState = 'quick' | 'expanded' | 'active' | 'confirm' | 'adjust'

const DIFFICULTY_COLORS: Record<PredictedDifficulty, string> = {
  warmup: 'bg-gray-500',
  easy: 'bg-green-500',
  normal: 'bg-yellow-500',
  hard: 'bg-red-500',
}

const DIFFICULTY_LABELS: Record<PredictedDifficulty, string> = {
  warmup: 'Warmup',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}

export function ProgressiveSetInput({
  kg,
  reps,
  restTime,
  e1rm,
  lastSessionSets,
  setNumber,
  isTimerRunning,
  elapsed,
  onKgChange,
  onRepsChange,
  onRestTimeChange,
  onStart,
  onFinish,
}: ProgressiveSetInputProps) {
  const [uiState, setUIState] = useState<UIState>('quick')
  const [actualKg, setActualKg] = useState(kg)
  const [actualReps, setActualReps] = useState(reps)

  // Sync actual values when planned values change
  useEffect(() => {
    setActualKg(kg)
    setActualReps(reps)
  }, [kg, reps])

  // Transition to active state when timer starts
  useEffect(() => {
    if (isTimerRunning) {
      setUIState('active')
    }
  }, [isTimerRunning])

  const kgNum = parseFloat(kg) || 0
  const repsNum = parseInt(reps) || 0
  const predictedDiff = e1rm ? predictDifficulty(e1rm, kgNum, repsNum) : null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStepWeight = (delta: number) => {
    const newKg = Math.max(0, kgNum + delta)
    onKgChange(newKg.toString())
  }

  const handleStepReps = (delta: number) => {
    const newReps = Math.max(1, repsNum + delta)
    onRepsChange(newReps.toString())
  }

  const handleQuickPreset = (difficulty: PredictedDifficulty) => {
    if (!e1rm) return
    const targetKg = getWeightForDifficulty(e1rm, repsNum || 8, difficulty)
    onKgChange(targetKg.toString())
  }

  const handleStartSet = () => {
    onStart()
    setUIState('active')
  }

  const handleSetDone = () => {
    setActualKg(kg)
    setActualReps(reps)
    setUIState('confirm')
  }

  const handleConfirmWithDifficulty = (difficulty: Difficulty) => {
    const finalKg = parseFloat(actualKg) || kgNum
    const finalReps = parseInt(actualReps) || repsNum
    onFinish(difficulty, finalKg, finalReps)
    setUIState('quick')
  }

  const handleActualStepKg = (delta: number) => {
    const current = parseFloat(actualKg) || 0
    setActualKg(Math.max(0, current + delta).toString())
  }

  const handleActualStepReps = (delta: number) => {
    const current = parseInt(actualReps) || 0
    setActualReps(Math.max(1, current + delta).toString())
  }

  const lastSet = lastSessionSets[setNumber - 1]
  const hasLastSession = lastSessionSets.length > 0

  // Check if current values match the corresponding set from last session
  const matchesLastSession = lastSet && kgNum === lastSet.kg && repsNum === lastSet.reps

  // STATE 1: Quick start
  if (uiState === 'quick') {
    return (
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 rounded-lg ${
          matchesLastSession
            ? 'bg-blue-500/10 ring-1 ring-blue-500/30'
            : 'bg-[var(--bg)]'
        }`}>
          <div>
            <div className="text-2xl font-bold">
              {kgNum}kg × {repsNum}
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {matchesLastSession ? (
                <span className="text-blue-400">same as last session</span>
              ) : lastSet ? (
                <span>last: {lastSet.kg}×{lastSet.reps}</span>
              ) : (
                <span>Set #{setNumber}</span>
              )}
              {predictedDiff && (
                <span className={`px-2 py-0.5 rounded text-white text-xs ${DIFFICULTY_COLORS[predictedDiff]}`}>
                  {DIFFICULTY_LABELS[predictedDiff]}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUIState('expanded')}
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Adjust
            </button>
            <button
              type="button"
              onClick={handleStartSet}
              className="px-6 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    )
  }

  // STATE 2: Expanded
  if (uiState === 'expanded') {
    return (
      <div className="space-y-4">
        {/* Last session pattern */}
        {hasLastSession && (
          <div className="p-3 bg-[var(--bg)] rounded-lg">
            <div className="text-xs text-[var(--text-muted)] mb-2">Last session:</div>
            <div className="flex flex-wrap gap-2">
              {lastSessionSets.map((set, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onKgChange(set.kg.toString())
                    onRepsChange(set.reps.toString())
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    i === setNumber - 1
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                      : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {set.kg}×{set.reps}
                  {set.difficulty && (
                    <span className="ml-1 opacity-60">
                      {set.difficulty[0].toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Steppers */}
        <div className="flex gap-4">
          {/* Weight stepper */}
          <div className="flex-1 p-3 bg-[var(--bg)] rounded-lg">
            <div className="text-xs text-[var(--text-muted)] mb-2 text-center">Weight</div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleStepWeight(-5)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-lg font-medium"
              >
                −5
              </button>
              <input
                type="number"
                value={kg}
                onChange={(e) => onKgChange(e.target.value)}
                className="w-20 text-center text-2xl font-bold bg-transparent border-none focus:outline-none"
                step="0.5"
              />
              <button
                type="button"
                onClick={() => handleStepWeight(5)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-lg font-medium"
              >
                +5
              </button>
            </div>
            <div className="text-xs text-[var(--text-muted)] text-center mt-1">kg</div>
          </div>

          {/* Reps stepper */}
          <div className="flex-1 p-3 bg-[var(--bg)] rounded-lg">
            <div className="text-xs text-[var(--text-muted)] mb-2 text-center">Reps</div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleStepReps(-1)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-lg font-medium"
              >
                −1
              </button>
              <input
                type="number"
                value={reps}
                onChange={(e) => onRepsChange(e.target.value)}
                className="w-16 text-center text-2xl font-bold bg-transparent border-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleStepReps(1)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-lg font-medium"
              >
                +1
              </button>
            </div>
            <div className="text-xs text-[var(--text-muted)] text-center mt-1">reps</div>
          </div>
        </div>

        {/* Intensity bar */}
        {e1rm && predictedDiff && (
          <div className="p-3 bg-[var(--bg)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">Intensity</span>
              <span className={`px-2 py-0.5 rounded text-white text-xs ${DIFFICULTY_COLORS[predictedDiff]}`}>
                {DIFFICULTY_LABELS[predictedDiff]}
              </span>
            </div>
            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${DIFFICULTY_COLORS[predictedDiff]}`}
                style={{
                  width: `${Math.min(100, (kgNum * (1 + repsNum / 30) / e1rm) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>Warmup</span>
              <span>Working</span>
              <span>Max</span>
            </div>
          </div>
        )}

        {/* Quick presets */}
        {e1rm && (
          <div className="flex gap-2">
            {(['warmup', 'easy', 'normal', 'hard'] as PredictedDifficulty[]).map((diff) => {
              const presetKg = getWeightForDifficulty(e1rm, repsNum || 8, diff)
              const isActive = predictedDiff === diff
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleQuickPreset(diff)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? `${DIFFICULTY_COLORS[diff]} text-white`
                      : 'bg-[var(--bg)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <div className="font-medium">{DIFFICULTY_LABELS[diff]}</div>
                  <div className="text-xs opacity-75">{presetKg}kg</div>
                </button>
              )
            })}
          </div>
        )}

        {/* Rest time */}
        <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
          <span className="text-sm text-[var(--text-muted)]">Rest time</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRestTimeChange(Math.max(0, restTime - 15))}
              className="w-8 h-8 rounded bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-sm"
            >
              −
            </button>
            <div className="relative">
              <input
                type="number"
                value={restTime}
                onChange={(e) => onRestTimeChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 text-center font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded"
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] pointer-events-none">s</span>
            </div>
            <button
              type="button"
              onClick={() => onRestTimeChange(restTime + 15)}
              className="w-8 h-8 rounded bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUIState('quick')}
            className="flex-1 py-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={handleStartSet}
            className="flex-[2] py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium"
          >
            Start Set
          </button>
        </div>
      </div>
    )
  }

  // STATE 3: Active (timer running)
  if (uiState === 'active') {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="text-5xl font-mono font-bold">{formatTime(elapsed)}</div>
          <div className="text-lg text-[var(--text-muted)] mt-2">
            {kgNum}kg × {repsNum}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSetDone}
          className="w-full py-4 bg-green-500 text-white rounded-lg font-medium text-lg"
        >
          Done
        </button>
      </div>
    )
  }

  // STATE 4: Confirm
  if (uiState === 'confirm') {
    const actualKgNum = parseFloat(actualKg) || kgNum
    const actualRepsNum = parseInt(actualReps) || repsNum
    const matchesPlanned = actualKgNum === kgNum && actualRepsNum === repsNum

    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-sm text-[var(--text-muted)]">Set complete! {formatTime(elapsed)}</div>
          <div className="text-2xl font-bold mt-2">
            Log as {actualKgNum}kg × {actualRepsNum}?
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('easy')}
            className="flex-1 py-4 bg-green-500 text-white rounded-lg font-medium"
          >
            Easy
          </button>
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('normal')}
            className="flex-1 py-4 bg-yellow-500 text-white rounded-lg font-medium"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('hard')}
            className="flex-1 py-4 bg-red-500 text-white rounded-lg font-medium"
          >
            Hard
          </button>
        </div>

        <button
          type="button"
          onClick={() => setUIState('adjust')}
          className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)] text-sm"
        >
          {matchesPlanned ? 'Actually did different...' : 'Adjust values...'}
        </button>
      </div>
    )
  }

  // STATE 5: Adjust actual values
  if (uiState === 'adjust') {
    return (
      <div className="space-y-4">
        <div className="text-center text-sm text-[var(--text-muted)]">
          What did you actually do?
        </div>

        <div className="flex gap-4">
          {/* Actual weight stepper */}
          <div className="flex-1 p-3 bg-[var(--bg)] rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleActualStepKg(-2.5)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              >
                −
              </button>
              <div className="text-center">
                <input
                  type="number"
                  value={actualKg}
                  onChange={(e) => setActualKg(e.target.value)}
                  className="w-20 text-center text-2xl font-bold bg-transparent border-none focus:outline-none"
                  step="0.5"
                />
                <div className="text-xs text-[var(--text-muted)]">kg</div>
              </div>
              <button
                type="button"
                onClick={() => handleActualStepKg(2.5)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              >
                +
              </button>
            </div>
            {parseFloat(actualKg) !== kgNum && (
              <div className="text-xs text-center text-[var(--text-muted)] mt-1">
                (planned {kgNum})
              </div>
            )}
          </div>

          {/* Actual reps stepper */}
          <div className="flex-1 p-3 bg-[var(--bg)] rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleActualStepReps(-1)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              >
                −
              </button>
              <div className="text-center">
                <input
                  type="number"
                  value={actualReps}
                  onChange={(e) => setActualReps(e.target.value)}
                  className="w-16 text-center text-2xl font-bold bg-transparent border-none focus:outline-none"
                />
                <div className="text-xs text-[var(--text-muted)]">reps</div>
              </div>
              <button
                type="button"
                onClick={() => handleActualStepReps(1)}
                className="w-10 h-10 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              >
                +
              </button>
            </div>
            {parseInt(actualReps) !== repsNum && (
              <div className="text-xs text-center text-[var(--text-muted)] mt-1">
                (planned {repsNum})
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('easy')}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            Easy
          </button>
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('normal')}
            className="flex-1 py-3 bg-yellow-500 text-white rounded-lg font-medium"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => handleConfirmWithDifficulty('hard')}
            className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium"
          >
            Hard
          </button>
        </div>

        <button
          type="button"
          onClick={() => setUIState('confirm')}
          className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)] text-sm"
        >
          Back
        </button>
      </div>
    )
  }

  return null
}
