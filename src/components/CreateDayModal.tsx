import { useState, useEffect, useMemo } from 'react'
import { dayTemplates, packs, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../lib/templates'
import type { DayDifficulty, DayTemplate, Pack } from '../lib/templates'
import type { Exercise } from '../hooks/useExerciseDB'

interface CreateDayModalProps {
  onClose: () => void
  onAddDay: (name: string) => void
  onAddDayWithExercises: (name: string, exerciseIds: string[]) => void
  onAddPack: (days: { name: string; exerciseIds: string[] }[]) => void
  allExercises: Exercise[]
  existingDayNames: string[]
}

type Tab = 'days' | 'packs'

function DifficultyBadge({ difficulty }: { difficulty: DayDifficulty }) {
  const colors = DIFFICULTY_COLORS[difficulty]
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} text-white`}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  )
}

function DayTemplateCard({
  template,
  exercises,
  onSelect,
}: {
  template: DayTemplate
  exercises: Exercise[]
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-left hover:border-[var(--text-muted)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium">{template.name}</h3>
        <DifficultyBadge difficulty={template.difficulty} />
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-3">{template.description}</p>
      <div className="flex items-center justify-between">
        <ExerciseImageStack exercises={exercises} max={5} />
        <span className="text-xs text-[var(--text-muted)]">
          {template.exerciseNames.length} exercises
        </span>
      </div>
    </button>
  )
}

function PackCard({
  pack,
  exercises,
  onSelect,
}: {
  pack: Pack
  exercises: Exercise[]
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-left hover:border-[var(--text-muted)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium">{pack.name}</h3>
        <DifficultyBadge difficulty={pack.difficulty} />
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-3">{pack.description}</p>
      <div className="flex items-center justify-between">
        <ExerciseImageStack exercises={exercises} max={6} />
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>{pack.frequency}</span>
          <span>•</span>
          <span>{pack.days.length} days</span>
        </div>
      </div>
    </button>
  )
}

function resolveExerciseIds(names: string[], allExercises: Exercise[]): string[] {
  return names
    .map(name => {
      const match = allExercises.find(
        ex => ex.name.toLowerCase() === name.toLowerCase()
      )
      return match?.exerciseId ?? null
    })
    .filter((id): id is string => id !== null)
}

function resolveExercises(names: string[], allExercises: Exercise[]): Exercise[] {
  return names
    .map(name => allExercises.find(ex => ex.name.toLowerCase() === name.toLowerCase()))
    .filter((ex): ex is Exercise => ex !== undefined)
}

function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const imageUrl = exercise.imageUrls[0]
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] overflow-hidden flex-shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt={exercise.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">?</div>
      )}
    </div>
  )
}

function ExerciseImageStack({ exercises, max = 4 }: { exercises: Exercise[]; max?: number }) {
  const shown = exercises.slice(0, max)
  const remaining = exercises.length - max

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((ex, i) => (
          <div key={ex.exerciseId} className="relative" style={{ zIndex: max - i }}>
            <ExerciseThumbnail exercise={ex} />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <span className="ml-2 text-xs text-[var(--text-muted)]">+{remaining}</span>
      )}
    </div>
  )
}

export function CreateDayModal({
  onClose,
  onAddDay,
  onAddDayWithExercises,
  onAddPack,
  allExercises,
  existingDayNames,
}: CreateDayModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('days')
  const [difficultyFilter, setDifficultyFilter] = useState<DayDifficulty | 'all'>('all')
  const [blankDayName, setBlankDayName] = useState('')
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPack) {
          setSelectedPack(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, selectedPack])

  const filteredTemplates = useMemo(() => {
    if (difficultyFilter === 'all') return dayTemplates
    return dayTemplates.filter(t => t.difficulty === difficultyFilter)
  }, [difficultyFilter])

  const filteredPacks = useMemo(() => {
    if (difficultyFilter === 'all') return packs
    return packs.filter(p => p.difficulty === difficultyFilter)
  }, [difficultyFilter])

  const handleSelectTemplate = (template: DayTemplate) => {
    const exerciseIds = resolveExerciseIds(template.exerciseNames, allExercises)
    const baseName = template.name
    let name = baseName
    let counter = 1
    while (existingDayNames.includes(name)) {
      counter++
      name = `${baseName} ${counter}`
    }
    onAddDayWithExercises(name, exerciseIds)
    onClose()
  }

  const handleSelectPack = (pack: Pack) => {
    setSelectedPack(pack)
  }

  const handleConfirmPack = () => {
    if (!selectedPack) return

    const days = selectedPack.days.map(day => {
      const exerciseIds = resolveExerciseIds(day.exerciseNames, allExercises)
      let name = day.name
      let counter = 1
      while (existingDayNames.includes(name)) {
        counter++
        name = `${day.name} ${counter}`
      }
      return { name, exerciseIds }
    })

    onAddPack(days)
    onClose()
  }

  const handleAddBlankDay = () => {
    if (blankDayName.trim()) {
      let name = blankDayName.trim()
      let counter = 1
      const baseName = name
      while (existingDayNames.includes(name)) {
        counter++
        name = `${baseName} ${counter}`
      }
      onAddDay(name)
      onClose()
    }
  }

  // Pack detail view
  if (selectedPack) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
        onClick={() => setSelectedPack(null)}
      >
        <div
          className="bg-[var(--bg)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPack(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ← Back
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pack info */}
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-xl font-bold">{selectedPack.name}</h2>
                <DifficultyBadge difficulty={selectedPack.difficulty} />
              </div>
              <p className="text-[var(--text-muted)]">{selectedPack.description}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-muted)]">
                <span>{selectedPack.frequency}</span>
                <span>•</span>
                <span>{selectedPack.days.length} days</span>
              </div>
            </div>

            {/* Days preview */}
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
                Training Days
              </h3>
              <div className="space-y-3">
                {selectedPack.days.map((day, i) => {
                  const dayExercises = resolveExercises(day.exerciseNames, allExercises)
                  return (
                    <div
                      key={i}
                      className="p-3 bg-[var(--surface)] rounded-lg"
                    >
                      <h4 className="font-medium mb-1">{day.name}</h4>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{day.description}</p>
                      <div className="space-y-2">
                        {dayExercises.slice(0, 4).map(ex => (
                          <div key={ex.exerciseId} className="flex items-center gap-2">
                            <ExerciseThumbnail exercise={ex} />
                            <span className="text-sm truncate">{ex.name}</span>
                          </div>
                        ))}
                        {day.exerciseNames.length > 4 && (
                          <div className="text-xs text-[var(--text-muted)] pl-10">
                            +{day.exerciseNames.length - 4} more exercises
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add pack button */}
            <button
              onClick={handleConfirmPack}
              className="w-full py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium"
            >
              Add {selectedPack.days.length} Days
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] w-full max-w-lg max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Create Training Day</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('days')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'days'
                  ? 'bg-[var(--bg)] text-[var(--text)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Single Day
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'packs'
                  ? 'bg-[var(--bg)] text-[var(--text)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Packs ({packs.length})
            </button>
          </div>
        </div>

        {/* Difficulty filter */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-[var(--text-muted)] shrink-0">Filter:</span>
            <button
              onClick={() => setDifficultyFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                difficultyFilter === 'all'
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'bg-[var(--surface)] text-[var(--text-muted)]'
              }`}
            >
              All
            </button>
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={() => setDifficultyFilter(level)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  difficultyFilter === level
                    ? `${DIFFICULTY_COLORS[level].bg} text-white`
                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                {DIFFICULTY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'days' ? (
            /* Templates */
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
                Suggested Days
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {filteredTemplates.map(template => (
                  <DayTemplateCard
                    key={template.id}
                    template={template}
                    exercises={resolveExercises(template.exerciseNames, allExercises)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Packs */
            <div className="grid grid-cols-1 gap-3">
              {filteredPacks.map(pack => {
                const allPackExerciseNames = [...new Set(pack.days.flatMap(d => d.exerciseNames))]
                const packExercises = resolveExercises(allPackExerciseNames, allExercises)
                return (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    exercises={packExercises}
                    onSelect={() => handleSelectPack(pack)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Sticky blank day input */}
        <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={blankDayName}
              onChange={e => setBlankDayName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddBlankDay()
              }}
              placeholder="Or create blank day..."
              className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
            />
            <button
              onClick={handleAddBlankDay}
              disabled={!blankDayName.trim()}
              className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
