import type { SearchFilters } from '../hooks/useExerciseDB'
import { getFilterOptions } from '../hooks/useExerciseDB'

interface FilterPanelProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  resultCount: number
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        selected
          ? 'bg-[var(--text)] text-[var(--bg)]'
          : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      {label}
    </button>
  )
}

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  )
}

export function FilterPanel({ filters, onChange, resultCount }: FilterPanelProps) {
  const options = getFilterOptions()

  const handleToggle = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters }
    if (filters[key] === value) {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }
    onChange(newFilters)
  }

  const activeCount = Object.keys(filters).filter(k => k !== 'query' && filters[k as keyof SearchFilters]).length

  const handleReset = () => {
    onChange({ query: filters.query })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">{resultCount}</span>
          <span className="text-[var(--text-muted)]"> exercises</span>
          {activeCount > 0 && (
            <span className="text-[var(--text-muted)]"> ({activeCount} filters)</span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Level */}
      {options.levels.length > 0 && (
        <FilterSection title="Level">
          {options.levels.map(level => (
            <FilterChip
              key={level}
              label={level}
              selected={filters.level === level}
              onClick={() => handleToggle('level', level)}
            />
          ))}
        </FilterSection>
      )}

      {/* Category */}
      {options.categories.length > 0 && (
        <FilterSection title="Category">
          {options.categories.map(cat => (
            <FilterChip
              key={cat}
              label={cat}
              selected={filters.category === cat}
              onClick={() => handleToggle('category', cat)}
            />
          ))}
        </FilterSection>
      )}

      {/* Force & Mechanic */}
      {(options.forces.length > 0 || options.mechanics.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {options.forces.length > 0 && (
            <FilterSection title="Force">
              {options.forces.map(force => (
                <FilterChip
                  key={force}
                  label={force}
                  selected={filters.force === force}
                  onClick={() => handleToggle('force', force)}
                />
              ))}
            </FilterSection>
          )}

          {options.mechanics.length > 0 && (
            <FilterSection title="Type">
              {options.mechanics.map(mech => (
                <FilterChip
                  key={mech}
                  label={mech}
                  selected={filters.mechanic === mech}
                  onClick={() => handleToggle('mechanic', mech)}
                />
              ))}
            </FilterSection>
          )}
        </div>
      )}

      {/* Equipment */}
      {options.equipment.length > 0 && (
        <FilterSection title="Equipment">
          {options.equipment.map(eq => (
            <FilterChip
              key={eq}
              label={eq}
              selected={filters.equipment === eq}
              onClick={() => handleToggle('equipment', eq)}
            />
          ))}
        </FilterSection>
      )}

      {/* Muscles */}
      {options.muscles.length > 0 && (
        <FilterSection title="Muscle">
          {options.muscles.map(muscle => (
            <FilterChip
              key={muscle}
              label={muscle}
              selected={filters.muscle === muscle}
              onClick={() => handleToggle('muscle', muscle)}
            />
          ))}
        </FilterSection>
      )}
    </div>
  )
}
