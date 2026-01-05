import { useEffect } from 'react'
import type { Day, Difficulty } from '../lib/state'
import type { SetPattern } from '../lib/url'
import { useExerciseDB } from '../hooks/useExerciseDB'
import { useImageRotation } from '../hooks/useImageRotation'
import { getDifficultyColor } from '../lib/utils'

interface ShareDayViewProps {
  day: Day
  restTimes: Record<string, number>
  setPatterns: Record<string, SetPattern[]>
  onBack: () => void
}

export function ShareDayView({ day, restTimes, setPatterns, onBack }: ShareDayViewProps) {
  const { getExercise, fetchExercises } = useExerciseDB()

  // Fetch exercise details
  useEffect(() => {
    if (day.exercises.length > 0) {
      fetchExercises(day.exercises)
    }
  }, [day.exercises, fetchExercises])

  const copyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const totalExercises = day.exercises.length

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
          <p className="text-white/50 mt-2">Workout Plan</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10 text-center">
          <div className="text-5xl font-bold text-purple-400 mb-2">{totalExercises}</div>
          <div className="text-white/50">Exercise{totalExercises !== 1 ? 's' : ''}</div>
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/70 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Exercise Order
          </h2>
          {day.exercises.map((exId, idx) => {
            const exercise = getExercise(exId)
            const restTime = restTimes[exId] ?? 90
            const pattern = setPatterns[exId] || []

            return (
              <ExerciseCard
                key={exId}
                exercise={exercise}
                exId={exId}
                index={idx + 1}
                restTime={restTime}
                setPattern={pattern}
                isLast={idx === day.exercises.length - 1}
              />
            )
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

interface ExerciseCardProps {
  exercise: { name: string; imageUrls?: string[]; targetMuscles?: string[]; equipment?: string | null } | null
  exId: string
  index: number
  restTime: number
  setPattern: SetPattern[]
  isLast: boolean
}

function ExerciseCard({ exercise, exId, index, restTime, setPattern, isLast }: ExerciseCardProps) {
  const imageUrls = exercise?.imageUrls || []
  const imageIndex = useImageRotation(imageUrls, 2000)
  const name = exercise?.name || exId
  const muscles = exercise?.targetMuscles?.slice(0, 2).join(', ') || ''
  const equipment = exercise?.equipment || ''

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`
    if (mins > 0) return `${mins}m`
    return `${secs}s`
  }

  const numSets = setPattern.length

  return (
    <div className="relative">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
        <div className="flex gap-4 p-4">
          {/* Exercise number */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-lg shrink-0">
            {index}
          </div>

          {/* Exercise image */}
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0">
            {imageUrls.length > 0 ? (
              <img
                src={imageUrls[imageIndex]}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl">
                ?
              </div>
            )}
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            {muscles && (
              <p className="text-purple-300 text-sm">{muscles}</p>
            )}
            {equipment && (
              <p className="text-white/50 text-sm">{equipment}</p>
            )}

            {/* Set count and rest time badges */}
            <div className="mt-2 flex flex-wrap gap-2">
              {numSets > 0 && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10" />
                    <path d="M18 20V4" />
                    <path d="M6 20v-4" />
                  </svg>
                  {numSets} set{numSets !== 1 ? 's' : ''}
                </div>
              )}
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatRestTime(restTime)} rest
              </div>
            </div>
          </div>
        </div>

        {/* Set pattern display */}
        {setPattern.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {setPattern.map((set, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
                >
                  <span className="text-white/40 text-xs font-medium">#{i + 1}</span>
                  <span className="text-white font-medium">{set.kg}kg</span>
                  <span className="text-white/50">×</span>
                  <span className="text-white font-medium">{set.reps}</span>
                  {set.difficulty && (
                    <span
                      className="w-2 h-2 rounded-full ml-1"
                      style={{ backgroundColor: getDifficultyColor(set.difficulty) }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arrow connector to next exercise */}
      {!isLast && (
        <div className="flex justify-center py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>
      )}
    </div>
  )
}
