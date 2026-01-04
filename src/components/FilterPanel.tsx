interface Filters {
  muscle?: string
  equipment?: string
  bodyPart?: string
}

interface FilterPanelProps {
  filters: Filters
  onChange: (filters: Filters) => void
  onClose: () => void
}

const MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
]

const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'EZ Bar',
]

const BODY_PARTS = [
  'Upper Body',
  'Lower Body',
  'Core',
  'Full Body',
  'Arms',
  'Legs',
  'Back',
  'Chest',
]

export function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  const handleChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters }
    if (value === '') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }
    onChange(newFilters)
  }

  const handleReset = () => {
    onChange({})
  }

  return (
    <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-4">
      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">
          Muscle
        </label>
        <select
          value={filters.muscle ?? ''}
          onChange={(e) => handleChange('muscle', e.target.value)}
          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
        >
          <option value="">Any</option>
          {MUSCLES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">
          Equipment
        </label>
        <select
          value={filters.equipment ?? ''}
          onChange={(e) => handleChange('equipment', e.target.value)}
          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
        >
          <option value="">Any</option>
          {EQUIPMENT.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">
          Body Part
        </label>
        <select
          value={filters.bodyPart ?? ''}
          onChange={(e) => handleChange('bodyPart', e.target.value)}
          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
        >
          <option value="">Any</option>
          {BODY_PARTS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 py-2 border border-[var(--border)] rounded-lg text-sm"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
