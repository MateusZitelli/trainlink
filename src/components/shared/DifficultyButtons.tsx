import type { Difficulty } from "../../lib/state"

interface DifficultyButtonsProps {
  onFinish: (difficulty: Difficulty) => void
}

export function DifficultyButtons({ onFinish }: DifficultyButtonsProps) {
  return (
    <>
      <div className="text-sm text-[var(--text-muted)] text-center">
        How'd that feel?
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("easy")
          }}
          className="flex-1 py-3 bg-[var(--diff-chill)] text-white rounded-lg font-medium cursor-pointer"
        >
          Chill
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("normal")
          }}
          className="flex-1 py-3 bg-[var(--diff-solid)] text-white rounded-lg font-medium cursor-pointer"
        >
          Solid
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("hard")
          }}
          className="flex-1 py-3 bg-[var(--diff-spicy)] text-white rounded-lg font-medium cursor-pointer"
        >
          Spicy
        </button>
      </div>
    </>
  )
}
