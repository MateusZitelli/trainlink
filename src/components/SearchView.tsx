import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Exercise, SearchFilters } from '../hooks/useExerciseDB'
import { useExerciseDB, debounce } from '../hooks/useExerciseDB'
import type { Day } from '../lib/state'
import { FilterPanel } from './FilterPanel'
import { ExerciseDetailModal } from './ExerciseDetailModal'

interface SearchViewProps {
  activeDay?: string
  days: Day[]
  onAddToDay: (dayName: string, exerciseId: string) => void
  onDoNow: (exerciseId: string) => void
}

export function SearchView({
  activeDay,
  days,
  onAddToDay,
  onDoNow,
}: SearchViewProps) {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const { results, loading, search, dbReady } = useExerciseDB()

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((f: SearchFilters) => search(f), 300),
    [search]
  )

  // Trigger search when filters change
  useEffect(() => {
    debouncedSearch(filters)
  }, [filters, debouncedSearch])

  const handleQueryChange = useCallback((value: string) => {
    setFilters(f => ({ ...f, query: value }))
  }, [])

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
  }, [])

  // Check if exercise is already in a day
  const getExerciseDay = (exerciseId: string): string | null => {
    for (const day of days) {
      if (day.exercises.includes(exerciseId)) {
        return day.name
      }
    }
    return null
  }

  const hasActiveFilters = Object.keys(filters).some(k => k !== 'query' && filters[k as keyof SearchFilters])

  return (
    <div className="flex flex-col h-full">
      {/* Search Header - Sticky */}
      <div className="sticky top-0 z-10 bg-[var(--bg)] p-4 pb-2 border-b border-[var(--border)]">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.query ?? ''}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search exercises..."
              autoFocus
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg relative ${
              showFilters || hasActiveFilters
                ? 'border-[var(--text)] bg-[var(--surface)]'
                : 'border-[var(--border)]'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="8" y1="18" x2="16" y2="18" />
            </svg>
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              resultCount={results.length}
            />
          </div>
        )}

        <div className="p-4">
          {/* Loading */}
          {!dbReady && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              Loading exercise database...
            </div>
          )}

          {/* Loading search */}
          {dbReady && loading && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              Searching...
            </div>
          )}

          {/* Results - Grid */}
          {dbReady && !loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((exercise) => (
                <SearchResultCard
                  key={exercise.exerciseId}
                  exercise={exercise}
                  inDay={getExerciseDay(exercise.exerciseId)}
                  onClick={() => setSelectedExercise(exercise)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {dbReady && !loading && (filters.query || hasActiveFilters) && results.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              No exercises found
            </div>
          )}

          {/* Initial state */}
          {dbReady && !loading && !filters.query && !hasActiveFilters && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <p>Search or filter to find exercises</p>
              <button
                onClick={() => setShowFilters(true)}
                className="mt-2 text-blue-400 hover:underline"
              >
                Open filters to browse
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          activeDay={activeDay}
          inDay={getExerciseDay(selectedExercise.exerciseId)}
          onAddToDay={(dayName) => onAddToDay(dayName, selectedExercise.exerciseId)}
          onDoNow={() => onDoNow(selectedExercise.exerciseId)}
        />
      )}
    </div>
  )
}

interface SearchResultCardProps {
  exercise: Exercise
  inDay: string | null
  onClick: () => void
}

function SearchResultCard({
  exercise,
  inDay,
  onClick,
}: SearchResultCardProps) {
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    if (exercise.imageUrls.length <= 1) return
    const interval = setInterval(() => {
      setImageIndex(i => (i + 1) % exercise.imageUrls.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [exercise.imageUrls.length])

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    expert: 'bg-red-500',
  }

  const forceIcons: Record<string, string> = {
    push: '↑',
    pull: '↓',
    static: '•',
  }

  return (
    <div
      onClick={onClick}
      className="bg-[var(--surface)] rounded-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Image */}
      <div className="relative aspect-square">
        {exercise.imageUrls.length > 0 ? (
          <img
            src={exercise.imageUrls[imageIndex]}
            alt={exercise.name}
            loading="lazy"
            className="w-full h-full object-cover bg-[var(--border)]"
          />
        ) : (
          <div className="w-full h-full bg-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-2xl">
            ?
          </div>
        )}

        {/* In day badge */}
        {inDay && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--success)] text-white">
            {inDay}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2 space-y-1.5">
        {/* Name */}
        <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{exercise.name}</div>

        {/* All labels in one row */}
        <div className="flex flex-wrap gap-1">
          {/* Level */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${levelColors[exercise.level] ?? 'bg-gray-500'}`}>
            {exercise.level}
          </span>

          {/* Category */}
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
            {exercise.category}
          </span>

          {/* Equipment */}
          {exercise.equipment && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400">
              {exercise.equipment}
            </span>
          )}

          {/* Force */}
          {exercise.force && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400">
              {forceIcons[exercise.force]} {exercise.force}
            </span>
          )}

          {/* Mechanic */}
          {exercise.mechanic && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-400">
              {exercise.mechanic}
            </span>
          )}

          {/* Target muscles */}
          {exercise.targetMuscles.map(muscle => (
            <span key={muscle} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
              {muscle}
            </span>
          ))}

          {/* Secondary muscles */}
          {exercise.secondaryMuscles.slice(0, 2).map(muscle => (
            <span key={`sec-${muscle}`} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg)] text-[var(--text-muted)]">
              {muscle}
            </span>
          ))}
          {exercise.secondaryMuscles.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg)] text-[var(--text-muted)]">
              +{exercise.secondaryMuscles.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
