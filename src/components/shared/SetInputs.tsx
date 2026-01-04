interface SetInputsProps {
  kg: string
  reps: string
  restTime: number
  isKgPredicted: boolean
  isRepsPredicted: boolean
  onKgChange: (value: string) => void
  onRepsChange: (value: string) => void
  onRestTimeChange: (seconds: number) => void
}

export function SetInputs({
  kg,
  reps,
  restTime,
  isKgPredicted,
  isRepsPredicted,
  onKgChange,
  onRepsChange,
  onRestTimeChange,
}: SetInputsProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <label
          className={`block text-sm mb-1 ${isKgPredicted ? "text-blue-400" : "text-[var(--text-muted)]"}`}
        >
          Weight{" "}
          {isKgPredicted && <span className="text-xs">(predicted)</span>}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={kg}
            onChange={(e) => onKgChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`w-full px-2 py-2 bg-[var(--bg)] border rounded-lg text-center text-lg ${
              isKgPredicted
                ? "border-blue-500/50 text-blue-400"
                : "border-[var(--border)]"
            }`}
            placeholder="0"
          />
          <span className="text-[var(--text-muted)] text-sm">kg</span>
        </div>
      </div>

      <div className="flex-1">
        <label
          className={`block text-sm mb-1 ${isRepsPredicted ? "text-blue-400" : "text-[var(--text-muted)]"}`}
        >
          Reps{" "}
          {isRepsPredicted && <span className="text-xs">(predicted)</span>}
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => onRepsChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className={`w-full px-2 py-2 bg-[var(--bg)] border rounded-lg text-center text-lg ${
            isRepsPredicted
              ? "border-blue-500/50 text-blue-400"
              : "border-[var(--border)]"
          }`}
          placeholder="0"
        />
      </div>

      <div className="flex-1">
        <label className="block text-sm text-[var(--text-muted)] mb-1">
          Rest
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={restTime}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (!isNaN(val) && val > 0) onRestTimeChange(val)
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-center text-lg"
            placeholder="90"
          />
          <span className="text-[var(--text-muted)] text-sm">s</span>
        </div>
      </div>
    </div>
  )
}
