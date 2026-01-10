import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Exercise, SearchFilters, SearchMatch } from '../hooks/useExerciseDB'
import { useExerciseDB, debounce } from '../hooks/useExerciseDB'
import type { Day } from '../lib/state'
import { FilterPanel } from './FilterPanel'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { useImageRotation } from '../hooks/useImageRotation'
import { LEVEL_COLORS } from '../lib/utils'
import {
  muscleTranslations,
  equipmentTranslations,
  categoryTranslations,
  forceTranslations,
  mechanicTranslations,
  levelTranslations,
} from '../lib/searchTranslations'

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
  const { t } = useTranslation()
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
              placeholder={t('search.placeholder')}
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
              {t('search.loading')}
            </div>
          )}

          {/* Loading search */}
          {dbReady && loading && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              {t('search.searching')}
            </div>
          )}

          {/* Results - Grid */}
          {dbReady && !loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((result) => (
                <SearchResultCard
                  key={result.exercise.exerciseId}
                  exercise={result.exercise}
                  matches={result.matches}
                  score={result.score}
                  inDay={getExerciseDay(result.exercise.exerciseId)}
                  onClick={() => setSelectedExercise(result.exercise)}
                  activeDay={activeDay}
                  onAddToDay={activeDay ? (exId) => onAddToDay(activeDay, exId) : undefined}
                  onDoNow={onDoNow}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {dbReady && !loading && (filters.query || hasActiveFilters) && results.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              {t('search.noResults')}
            </div>
          )}

          {/* Initial state */}
          {dbReady && !loading && !filters.query && !hasActiveFilters && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <p>{t('search.initialHint')}</p>
              <button
                onClick={() => setShowFilters(true)}
                className="mt-2 text-blue-400 hover:underline"
              >
                {t('search.openFilters')}
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
  matches: SearchMatch[]
  score: number
  inDay: string | null
  onClick: () => void
  onAddToDay?: (exerciseId: string) => void
  onDoNow: (exerciseId: string) => void
  activeDay?: string
}

// Helper to check if matched value corresponds to a field value (English or Portuguese)
function matchesFieldValue(
  matchedValue: string,
  fieldValue: string,
  translations: Record<string, string>
): boolean {
  const matchedLower = matchedValue.toLowerCase()
  const fieldLower = fieldValue.toLowerCase()

  // Check if matched value contains the English term
  if (matchedLower.includes(fieldLower)) return true

  // Check if matched value contains the Portuguese translation
  const portugueseTranslation = translations[fieldValue]
  if (portugueseTranslation && matchedLower.includes(portugueseTranslation.toLowerCase())) {
    return true
  }

  return false
}

// Check if a specific value was matched (for individual tag highlighting)
function isValueMatched(
  matches: SearchMatch[],
  fieldKey: string,
  value: string,
  translations: Record<string, string>
): boolean {
  return matches.some(m => {
    // Direct field match - check if this specific value was matched
    if (m.key === fieldKey && m.value) {
      return matchesFieldValue(m.value, value, translations)
    }

    // Check searchTerms match
    if (m.key === 'searchTerms' && m.value) {
      return matchesFieldValue(m.value, value, translations)
    }

    return false
  })
}

// Highlight text based on match indices
function HighlightedText({ text, indices }: { text: string; indices?: readonly [number, number][] }) {
  if (!indices || indices.length === 0) {
    return <>{text}</>
  }

  const parts: React.ReactElement[] = []
  let lastIndex = 0

  for (const [start, end] of indices) {
    if (start > lastIndex) {
      parts.push(<span key={`pre-${start}`}>{text.slice(lastIndex, start)}</span>)
    }
    parts.push(
      <mark key={`match-${start}`} className="bg-yellow-500/40 text-inherit rounded-sm px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    )
    lastIndex = end + 1
  }

  if (lastIndex < text.length) {
    parts.push(<span key="post">{text.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

function SearchResultCard({
  exercise,
  matches,
  score,
  inDay,
  onClick,
  onAddToDay,
  onDoNow,
  activeDay,
}: SearchResultCardProps) {
  const { t } = useTranslation()
  const imageIndex = useImageRotation(exercise.imageUrls)

  const forceIcons: Record<string, string> = {
    push: '↑',
    pull: '↓',
    static: '•',
  }

  // Get match info for display
  const matchInfo = useMemo(() => {
    const seen = new Set<string>()
    const fieldKeys: string[] = []

    for (const match of matches) {
      // Skip searchTerms as it's redundant with other fields
      if (match.key === 'searchTerms') continue

      // Normalize muscle fields
      const normalizedKey = match.key === 'secondaryMuscles' ? 'targetMuscles' : match.key

      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey)
        fieldKeys.push(match.key)
      }
    }

    // Translate field names
    const translatedFields = fieldKeys
      .slice(0, 3)
      .map(key => t(`search.matchField.${key}`, { defaultValue: key }))
      .join(', ')

    // Convert score (0 = perfect, 1 = no match) to percentage (100% = perfect)
    const scorePercent = Math.round((1 - score) * 100)

    return { fieldKeys, translatedFields, scorePercent }
  }, [matches, score, t])

  // Get indices for name highlight
  const nameIndices = useMemo(() => {
    const nameMatch = matches.find(m => m.key === 'name')
    return nameMatch?.indices
  }, [matches])

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
      <div className="p-2">
        {/* Name with highlight */}
        <div className="font-medium text-sm line-clamp-2">
          <HighlightedText text={exercise.name} indices={nameIndices} />
        </div>

        {/* Match indicator */}
        {matchInfo.translatedFields && matchInfo.scorePercent > 0 && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-yellow-500 truncate">
            {t('search.matchedBy', { score: matchInfo.scorePercent, fields: matchInfo.translatedFields })}
          </div>
        )}

        {/* All labels in one row */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {/* Level */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${LEVEL_COLORS[exercise.level] ?? 'bg-gray-500'} ${isValueMatched(matches, 'level', exercise.level, levelTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
            {t(`exerciseLevel.${exercise.level}`, { ns: 'common', defaultValue: exercise.level })}
          </span>

          {/* Category */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 ${isValueMatched(matches, 'category', exercise.category, categoryTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
            {t(`exerciseCategory.${exercise.category}`, { ns: 'common', defaultValue: exercise.category })}
          </span>

          {/* Equipment */}
          {exercise.equipment && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 ${isValueMatched(matches, 'equipment', exercise.equipment, equipmentTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
              {t(`exerciseEquipment.${exercise.equipment}`, { ns: 'common', defaultValue: exercise.equipment })}
            </span>
          )}

          {/* Force */}
          {exercise.force && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 ${isValueMatched(matches, 'force', exercise.force, forceTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
              {forceIcons[exercise.force]} {t(`exerciseForce.${exercise.force}`, { ns: 'common', defaultValue: exercise.force })}
            </span>
          )}

          {/* Mechanic */}
          {exercise.mechanic && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-400 ${isValueMatched(matches, 'mechanic', exercise.mechanic, mechanicTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
              {t(`exerciseMechanic.${exercise.mechanic}`, { ns: 'common', defaultValue: exercise.mechanic })}
            </span>
          )}

          {/* Target muscles */}
          {exercise.targetMuscles.map(muscle => (
            <span key={muscle} className={`px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 ${isValueMatched(matches, 'targetMuscles', muscle, muscleTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
              {t(`muscle.${muscle}`, { ns: 'common', defaultValue: muscle })}
            </span>
          ))}

          {/* Secondary muscles */}
          {exercise.secondaryMuscles.slice(0, 2).map(muscle => (
            <span key={`sec-${muscle}`} className={`px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg)] text-[var(--text-muted)] ${isValueMatched(matches, 'secondaryMuscles', muscle, muscleTranslations) ? 'ring-2 ring-yellow-500' : ''}`}>
              {t(`muscle.${muscle}`, { ns: 'common', defaultValue: muscle })}
            </span>
          ))}
          {exercise.secondaryMuscles.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg)] text-[var(--text-muted)]">
              +{exercise.secondaryMuscles.length - 2}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 mt-2">
          {activeDay && !inDay && onAddToDay && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToDay(exercise.exerciseId)
              }}
              className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 active:scale-95 transition-transform"
            >
              {t('search.addButton')}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDoNow(exercise.exerciseId)
            }}
            className="flex-1 px-2 py-1.5 text-[11px] font-medium bg-green-500 text-white rounded hover:bg-green-600 active:scale-95 transition-transform"
          >
            {t('search.doNowButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
