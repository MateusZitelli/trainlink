import type { E1rmMetrics } from '../../lib/state'

interface E1rmDisplayProps {
  metrics: E1rmMetrics
  onSelectWeight?: (kg: number, reps: number) => void
}

export function E1rmDisplay({ metrics, onSelectWeight }: E1rmDisplayProps) {
  if (!metrics.current) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        No e1RM data yet. Complete some sets to see estimates.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main e1RM values */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-xs text-[var(--text-muted)]">Current e1RM</div>
          <div className="text-2xl font-bold">{metrics.current}kg</div>
        </div>

        {metrics.peak && metrics.peak > metrics.current && (
          <div>
            <div className="text-xs text-[var(--text-muted)]">Peak</div>
            <div className="text-lg text-[var(--text-muted)]">{metrics.peak}kg</div>
          </div>
        )}

        {metrics.trend && <TrendIndicator trend={metrics.trend} />}
      </div>

      {/* Weight suggestions */}
      {metrics.suggestedWeights.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-[var(--text-muted)]">Suggested weights</div>
          <div className="grid grid-cols-2 gap-2">
            {metrics.suggestedWeights.map(suggestion => (
              <button
                key={suggestion.targetReps}
                type="button"
                onClick={() => onSelectWeight?.(suggestion.suggestedKg, suggestion.targetReps)}
                className="px-3 py-2 bg-[var(--bg)] rounded-lg text-left hover:bg-blue-500/10 transition-colors"
              >
                <div className="text-sm font-medium">{suggestion.suggestedKg}kg</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {suggestion.targetReps} reps &middot; {suggestion.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const config = {
    up: { icon: '↑', color: 'text-green-400', label: 'Improving' },
    down: { icon: '↓', color: 'text-orange-400', label: 'Declining' },
    stable: { icon: '→', color: 'text-[var(--text-muted)]', label: 'Stable' },
  }[trend]

  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <span className="text-lg">{config.icon}</span>
      <span className="text-xs">{config.label}</span>
    </div>
  )
}
