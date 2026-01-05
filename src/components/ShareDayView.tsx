import { useMemo } from 'react'
import type { Day, SetEntry, HistoryEntry } from '../lib/state'
import { isSetEntry, isSessionEndMarker } from '../lib/state'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useImageRotation } from '../hooks/useImageRotation'
import { formatDuration } from '../lib/utils'

interface ShareDayViewProps {
  day: Day
  history: HistoryEntry[]
  onBack: () => void
}

interface SessionStats {
  totalSets: number
  totalVolume: number
  totalReps: number
  duration: string
  exerciseStats: {
    exId: string
    name: string
    sets: SetEntry[]
    totalVolume: number
  }[]
}

export function ShareDayView({ day, history, onBack }: ShareDayViewProps) {
  const { getExercise, fetchExercises } = useExerciseDB()

  // Fetch exercise details
  useMemo(() => {
    if (day.exercises.length > 0) {
      fetchExercises(day.exercises)
    }
  }, [day.exercises, fetchExercises])

  // Get today's session stats
  const stats = useMemo((): SessionStats | null => {
    // Find today's sets (current session or last session)
    let sessionSets: SetEntry[] = []
    let sessionStart: number | null = null
    let sessionEnd: number | null = null

    // Check for current session first
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i]
      if (isSessionEndMarker(entry)) {
        sessionEnd = entry.ts
        break
      }
      if (isSetEntry(entry)) {
        sessionSets.unshift(entry)
        if (sessionStart === null || entry.ts < sessionStart) {
          sessionStart = entry.ts
        }
      }
    }

    // If no current session, get last completed session
    if (sessionSets.length === 0) {
      let foundEnd = false
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i]
        if (isSessionEndMarker(entry)) {
          if (foundEnd) break
          foundEnd = true
          sessionEnd = entry.ts
          continue
        }
        if (foundEnd && isSetEntry(entry)) {
          sessionSets.unshift(entry)
          if (sessionStart === null || entry.ts < sessionStart) {
            sessionStart = entry.ts
          }
        }
      }
    }

    if (sessionSets.length === 0) return null

    // Filter to only exercises in this day
    const daySets = sessionSets.filter(s => day.exercises.includes(s.exId))
    if (daySets.length === 0) return null

    // Calculate stats per exercise
    const exerciseMap = new Map<string, SetEntry[]>()
    for (const set of daySets) {
      const existing = exerciseMap.get(set.exId) || []
      existing.push(set)
      exerciseMap.set(set.exId, existing)
    }

    const exerciseStats = Array.from(exerciseMap.entries()).map(([exId, sets]) => ({
      exId,
      name: getExercise(exId)?.name || exId,
      sets,
      totalVolume: sets.reduce((sum, s) => sum + s.kg * s.reps, 0),
    }))

    return {
      totalSets: daySets.length,
      totalVolume: daySets.reduce((sum, s) => sum + s.kg * s.reps, 0),
      totalReps: daySets.reduce((sum, s) => sum + s.reps, 0),
      duration: sessionStart ? formatDuration(sessionStart, sessionEnd) : '0m',
      exerciseStats,
    }
  }, [history, day.exercises, getExercise])

  const copyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

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

      {/* Main Content - Instagram Story style */}
      <div className="px-6 py-8">
        {/* Day Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            {day.name}
          </h1>
          <p className="text-white/50 mt-2">Workout Summary</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-purple-400">{stats.totalSets}</div>
              <div className="text-white/50 text-sm">Total Sets</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-pink-400">{Math.round(stats.totalVolume).toLocaleString()}</div>
              <div className="text-white/50 text-sm">Volume (kg)</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-orange-400">{stats.totalReps}</div>
              <div className="text-white/50 text-sm">Total Reps</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-cyan-400">{stats.duration}</div>
              <div className="text-white/50 text-sm">Duration</div>
            </div>
          </div>
        )}

        {/* Exercise List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/70">Exercises</h2>
          {day.exercises.map((exId, idx) => {
            const exercise = getExercise(exId)
            const exerciseStat = stats?.exerciseStats.find(e => e.exId === exId)

            return (
              <ExerciseCard
                key={exId}
                exercise={exercise}
                exId={exId}
                index={idx + 1}
                sets={exerciseStat?.sets || []}
                totalVolume={exerciseStat?.totalVolume || 0}
              />
            )
          })}
        </div>

        {/* Footer branding */}
        <div className="text-center mt-12 text-white/30 text-sm">
          <p>Tracked with TrainLink</p>
        </div>
      </div>
    </div>
  )
}

interface ExerciseCardProps {
  exercise: { name: string; imageUrls?: string[]; targetMuscles?: string[] } | null
  exId: string
  index: number
  sets: SetEntry[]
  totalVolume: number
}

function ExerciseCard({ exercise, exId, index, sets, totalVolume }: ExerciseCardProps) {
  const imageUrls = exercise?.imageUrls || []
  const imageIndex = useImageRotation(imageUrls, 2000)
  const name = exercise?.name || exId
  const muscles = exercise?.targetMuscles?.slice(0, 2).join(', ') || ''

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
      <div className="flex gap-4 p-4">
        {/* Exercise image */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0">
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[imageIndex]}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl font-bold">
              {index}
            </div>
          )}
        </div>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white truncate">{name}</h3>
              {muscles && (
                <p className="text-white/50 text-sm">{muscles}</p>
              )}
            </div>
            {totalVolume > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-purple-400">{Math.round(totalVolume)}</div>
                <div className="text-white/50 text-xs">kg vol</div>
              </div>
            )}
          </div>

          {/* Sets display */}
          {sets.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {sets.map((set, i) => (
                <div
                  key={i}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    set.difficulty === 'easy' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' :
                    set.difficulty === 'hard' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' :
                    'bg-green-500/20 border-green-500/50 text-green-300'
                  }`}
                >
                  {set.kg}kg × {set.reps}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
