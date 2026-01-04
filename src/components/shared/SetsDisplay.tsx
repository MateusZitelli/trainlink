import type { SetEntry } from "../../lib/state"
import { getDifficultyColor } from "../../lib/utils"

interface SetsDisplayProps {
  sets: SetEntry[]
}

export function SetsDisplay({ sets }: SetsDisplayProps) {
  if (sets.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {sets.map((set, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${getDifficultyColor(set.difficulty)}`}
          title={`${set.kg}kg × ${set.reps}${set.difficulty ? ` (${set.difficulty})` : ""}`}
        />
      ))}
      <span className="text-xs text-[var(--text-muted)] ml-1">
        {sets.length} today
      </span>
    </div>
  )
}
