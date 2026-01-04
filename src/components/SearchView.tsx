import { useState, useMemo, useCallback } from 'react'
import type { Exercise } from '../hooks/useExerciseDB'
import { useExerciseDB, debounce } from '../hooks/useExerciseDB'
import type { Day } from '../lib/state'
import { FilterPanel } from './FilterPanel'

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
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    muscle?: string
    equipment?: string
    bodyPart?: string
  }>({})

  const { results, loading, search } = useExerciseDB()

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((params: Parameters<typeof search>[0]) => search(params), 300),
    [search]
  )

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    debouncedSearch({
      name: value,
      targetMuscles: filters.muscle,
      equipments: filters.equipment,
      bodyParts: filters.bodyPart,
    })
  }, [debouncedSearch, filters])

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters)
    debouncedSearch({
      name: query,
      targetMuscles: newFilters.muscle,
      equipments: newFilters.equipment,
      bodyParts: newFilters.bodyPart,
    })
  }, [debouncedSearch, query])

  const removeFilter = (key: keyof typeof filters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    handleFilterChange(newFilters)
  }

  // Check if exercise is already in a day
  const getExerciseDay = (exerciseId: string): string | null => {
    for (const day of days) {
      if (day.exercises.includes(exerciseId)) {
        return day.name
      }
    }
    return null
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v)

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
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
          className={`px-3 py-2 border rounded-lg ${
            showFilters || activeFilters.length > 0
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
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <button
              key={key}
              onClick={() => removeFilter(key as keyof typeof filters)}
              className="px-3 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-sm flex items-center gap-1"
            >
              {value}
              <span className="text-[var(--text-muted)]">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          Searching...
        </div>
      )}

      {/* Results - Grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {results.map((exercise) => (
            <SearchResult
              key={exercise.exerciseId}
              exercise={exercise}
              inDay={getExerciseDay(exercise.exerciseId)}
              activeDay={activeDay}
              onAdd={(dayName) => onAddToDay(dayName, exercise.exerciseId)}
              onDoNow={() => onDoNow(exercise.exerciseId)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && query && results.length === 0 && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No exercises found
        </div>
      )}

      {/* Initial state */}
      {!loading && !query && activeFilters.length === 0 && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          Type to search or use filters
        </div>
      )}
    </div>
  )
}

interface SearchResultProps {
  exercise: Exercise
  inDay: string | null
  activeDay?: string
  onAdd: (dayName: string) => void
  onDoNow: () => void
}

function SearchResult({
  exercise,
  inDay,
  activeDay,
  onAdd,
  onDoNow,
}: SearchResultProps) {
  const meta = [
    exercise.targetMuscles?.[0],
    exercise.equipments?.[0],
  ].filter(Boolean).join(' · ')

  return (
    <div className="bg-[var(--surface)] rounded-lg overflow-hidden">
      {/* Exercise image - large */}
      {exercise.imageUrl ? (
        <img
          src={exercise.imageUrl}
          alt={exercise.name}
          className="w-full aspect-square object-cover bg-[var(--border)]"
        />
      ) : (
        <div className="w-full aspect-square bg-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-2xl">
          ?
        </div>
      )}

      <div className="p-3">
        <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{exercise.name}</div>
        <div className="text-xs text-[var(--text-muted)] truncate">{meta}</div>
        {inDay && (
          <div className="text-xs text-[var(--success)] mt-1">
            In: {inDay}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {activeDay && !inDay && (
            <button
              onClick={() => onAdd(activeDay)}
              className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg)]"
            >
              + Add
            </button>
          )}
          <button
            onClick={onDoNow}
            className="flex-1 py-1.5 text-xs bg-[var(--text)] text-[var(--bg)] rounded-lg"
          >
            ▶ Do
          </button>
        </div>
      </div>
    </div>
  )
}
