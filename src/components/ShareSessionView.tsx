import { useEffect, useMemo } from 'react'
import type { SetEntry } from '../lib/state'
import type { ShareSessionData } from '../lib/url'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useImageRotation } from '../hooks/useImageRotation'
import { formatDuration, formatRest } from '../lib/utils'

interface Exercise {
  name: string
  imageUrls?: string[]
  targetMuscles?: string[]
  equipment?: string | null
}

interface ShareSessionViewProps {
  sessionData: ShareSessionData
  onBack: () => void
}

interface CircuitGroup {
  pattern: string[]
  rounds: SetEntry[][]
  isCircuit: boolean
}

// Detect circuits from a sequence of sets (reused from SessionLog)
function detectCircuits(sets: SetEntry[]): CircuitGroup[] {
  if (sets.length === 0) return []

  const groups: CircuitGroup[] = []
  let i = 0

  while (i < sets.length) {
    const pattern: string[] = []
    const patternSets: SetEntry[] = []
    let j = i
    let foundCircuit = false

    while (j < sets.length) {
      const exId = sets[j].exId

      if (pattern.length > 0 && exId === pattern[0]) {
        foundCircuit = true
        break
      }

      if (!pattern.includes(exId)) {
        pattern.push(exId)
        patternSets.push(sets[j])
      } else {
        break
      }
      j++
    }

    const isCircuit = pattern.length > 1 && foundCircuit

    if (isCircuit) {
      const rounds: SetEntry[][] = [patternSets]
      let roundStart = j

      while (roundStart < sets.length) {
        const roundSets: SetEntry[] = []

        for (let p = 0; p < pattern.length && roundStart + p < sets.length; p++) {
          if (sets[roundStart + p].exId === pattern[p]) {
            roundSets.push(sets[roundStart + p])
          } else {
            break
          }
        }

        if (roundSets.length > 0) {
          rounds.push(roundSets)
          roundStart += roundSets.length
        } else {
          break
        }
      }

      groups.push({ pattern, rounds, isCircuit: true })
      i = roundStart
    } else {
      const exId = sets[i].exId
      const consecutiveSets: SetEntry[] = []

      while (i < sets.length && sets[i].exId === exId) {
        consecutiveSets.push(sets[i])
        i++
      }

      groups.push({
        pattern: [exId],
        rounds: [consecutiveSets],
        isCircuit: false,
      })
    }
  }

  return groups
}

// Calculate session stats
function calculateStats(sets: SetEntry[], startTs: number, endTs: number) {
  const totalVolume = sets.reduce((sum, set) => sum + set.kg * set.reps, 0)
  const totalSets = sets.length
  const uniqueExercises = new Set(sets.map(s => s.exId)).size
  const durationMs = endTs - startTs
  const durationMins = Math.floor(durationMs / 60000)

  return { totalVolume, totalSets, uniqueExercises, durationMins }
}

// Calculate progress comparison
function calculateProgress(currentSets: SetEntry[], previousSets: SetEntry[]) {
  const currentVolume = currentSets.reduce((sum, s) => sum + s.kg * s.reps, 0)
  const previousVolume = previousSets.reduce((sum, s) => sum + s.kg * s.reps, 0)

  const volumeDelta = currentVolume - previousVolume
  const volumePercent = previousVolume > 0
    ? Math.round((volumeDelta / previousVolume) * 100)
    : 0

  return { volumeDelta, volumePercent }
}

// Format date for session
function formatSessionFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function ShareSessionView({ sessionData, onBack }: ShareSessionViewProps) {
  const { getExercise, fetchExercises, dbReady } = useExerciseDB()

  // Force re-render when dbReady changes (e.g., after language switch)
  void dbReady

  // Get unique exercise IDs
  const exerciseIds = useMemo(() => {
    const ids = new Set(sessionData.sets.map(s => s.exId))
    if (sessionData.previousSession) {
      sessionData.previousSession.sets.forEach(s => ids.add(s.exId))
    }
    return [...ids]
  }, [sessionData])

  // Fetch exercise details
  useEffect(() => {
    if (exerciseIds.length > 0) {
      fetchExercises(exerciseIds)
    }
  }, [exerciseIds, fetchExercises])

  const copyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const stats = useMemo(() =>
    calculateStats(sessionData.sets, sessionData.startTs, sessionData.endTs),
    [sessionData]
  )

  const progress = useMemo(() =>
    sessionData.previousSession
      ? calculateProgress(sessionData.sets, sessionData.previousSession.sets)
      : null,
    [sessionData]
  )

  const circuits = useMemo(() => detectCircuits(sessionData.sets), [sessionData.sets])

  return (
    <div className="min-h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/70 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Session Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            {sessionData.sessionName}
          </h1>
          <p className="text-white/50 mt-2">{formatSessionFullDate(sessionData.startTs)}</p>
        </div>

        {/* Stats Card - 2x2 Grid */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Volume */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {Math.round(stats.totalVolume).toLocaleString()}
                <span className="text-lg text-white/50 ml-1">kg</span>
              </div>
              <div className="text-white/50 text-sm">Total Volume</div>
              {progress && (
                <div className={`text-sm mt-1 ${progress.volumePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {progress.volumePercent >= 0 ? '↑' : '↓'} {Math.abs(progress.volumePercent)}%
                  <span className="text-white/30 ml-1">
                    ({progress.volumeDelta >= 0 ? '+' : ''}{Math.round(progress.volumeDelta).toLocaleString()}kg)
                  </span>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">
                {formatDuration(sessionData.startTs, sessionData.endTs)}
              </div>
              <div className="text-white/50 text-sm">Duration</div>
            </div>

            {/* Total Sets */}
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400">{stats.totalSets}</div>
              <div className="text-white/50 text-sm">Sets</div>
            </div>

            {/* Exercises */}
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">{stats.uniqueExercises}</div>
              <div className="text-white/50 text-sm">Exercises</div>
            </div>
          </div>
        </div>

        {/* Circuit Groups / Exercise Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/70 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
            Workout Details
          </h2>

          {circuits.map((circuit, circuitIdx) => {
            if (circuit.isCircuit) {
              return (
                <CircuitCard
                  key={circuitIdx}
                  circuit={circuit}
                  getExercise={getExercise}
                />
              )
            } else {
              const exId = circuit.pattern[0]
              const sets = circuit.rounds[0]
              return (
                <ExerciseCard
                  key={circuitIdx}
                  exId={exId}
                  sets={sets}
                  getExercise={getExercise}
                />
              )
            }
          })}
        </div>

        {/* Footer branding */}
        <div className="text-center mt-12 text-white/30 text-sm">
          <p>Created with TrainLink</p>
        </div>
      </div>
    </div>
  )
}

interface CircuitCardProps {
  circuit: CircuitGroup
  getExercise: (id: string) => Exercise | null
}

function CircuitCard({ circuit, getExercise }: CircuitCardProps) {
  const exercises = circuit.pattern.map(id => ({
    id,
    exercise: getExercise(id),
    name: getExercise(id)?.name?.split(' ').slice(0, 3).join(' ') ?? id
  }))

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 p-4">
      {/* Circuit Header with Images */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-400 text-xl">⟳</span>
        <span className="font-semibold text-white">{exercises.map(e => e.name).join(' + ')}</span>
        <span className="text-white/40 text-sm ml-auto">{circuit.rounds.length} rounds</span>
      </div>

      {/* Exercise Images Row */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {exercises.map(({ id, exercise, name }) => (
          <CircuitExerciseImage key={id} exercise={exercise} name={name} />
        ))}
      </div>

      {/* Rounds */}
      <div className="space-y-3">
        {circuit.rounds.map((round, roundIdx) => (
          <div key={roundIdx} className="bg-white/5 rounded-lg p-3">
            <div className="text-white/50 text-xs mb-2">Round {roundIdx + 1}</div>
            <div className="flex flex-wrap gap-2">
              {round.map((set) => {
                const exName = getExercise(set.exId)?.name?.split(' ').slice(0, 2).join(' ') ?? set.exId
                return (
                  <div
                    key={set.ts}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="text-white/40 text-xs">{exName}:</span>
                    <span className="text-white font-medium">{set.kg}kg</span>
                    <span className="text-white/50">×</span>
                    <span className="text-white font-medium">{set.reps}</span>
                    {set.difficulty && (
                      <span
                        className="w-2 h-2 rounded-full ml-1"
                        style={{ backgroundColor: getDifficultyColorHex(set.difficulty) }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Separate component for circuit exercise images to use hooks properly
function CircuitExerciseImage({ exercise, name }: { exercise: Exercise | null; name: string }) {
  const imageUrls = exercise?.imageUrls ?? []
  const imageIndex = useImageRotation(imageUrls, 2000)

  return (
    <div className="shrink-0 text-center">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10">
        {imageUrls.length > 0 ? (
          <img
            src={imageUrls[imageIndex]}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xl">
            💪
          </div>
        )}
      </div>
      <div className="text-white/50 text-xs mt-1 max-w-16 truncate">{name.split(' ')[0]}</div>
    </div>
  )
}

interface ExerciseCardProps {
  exId: string
  sets: SetEntry[]
  getExercise: (id: string) => Exercise | null
}

function ExerciseCard({ exId, sets, getExercise }: ExerciseCardProps) {
  const exercise = getExercise(exId)
  const name = exercise?.name ?? exId
  const muscles = exercise?.targetMuscles?.slice(0, 2).join(', ') ?? ''
  const equipment = exercise?.equipment ?? ''
  const imageUrls = exercise?.imageUrls ?? []
  const imageIndex = useImageRotation(imageUrls, 2000)

  // Calculate exercise stats
  const exerciseVolume = sets.reduce((sum, s) => sum + s.kg * s.reps, 0)
  const maxWeight = Math.max(...sets.map(s => s.kg))

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 p-4">
      {/* Exercise Header with Image */}
      <div className="flex gap-4 mb-4">
        {/* Exercise Image */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0">
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[imageIndex]}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl">
              💪
            </div>
          )}
        </div>

        {/* Exercise Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-lg truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {muscles && <span className="text-purple-300 text-sm">{muscles}</span>}
            {muscles && equipment && <span className="text-white/30">·</span>}
            {equipment && <span className="text-white/50 text-sm">{equipment}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-cyan-300">{Math.round(exerciseVolume).toLocaleString()}kg</span>
            <span className="text-orange-300">Max: {maxWeight}kg</span>
          </div>
        </div>
      </div>

      {/* Sets */}
      <div className="flex flex-wrap gap-2">
        {sets.map((set, i) => (
          <div
            key={set.ts}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="text-white/40 text-xs font-medium">#{i + 1}</span>
            <span className="text-white font-medium">{set.kg}kg</span>
            <span className="text-white/50">×</span>
            <span className="text-white font-medium">{set.reps}</span>
            {set.difficulty && (
              <span
                className="w-2 h-2 rounded-full ml-1"
                style={{ backgroundColor: getDifficultyColorHex(set.difficulty) }}
              />
            )}
            {set.rest && i < sets.length - 1 && (
              <span className="text-white/30 text-xs ml-1">
                ({formatRest(set.rest)})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper to get hex color for difficulty (for inline styles)
function getDifficultyColorHex(difficulty?: string): string {
  switch (difficulty) {
    case 'easy': return '#3b82f6' // blue-500
    case 'normal': return '#22c55e' // green-500
    case 'hard': return '#f97316' // orange-500
    default: return '#22c55e'
  }
}
