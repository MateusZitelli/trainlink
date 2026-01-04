import type { Difficulty } from "../../lib/state"

interface DifficultyButtonsProps {
  onFinish: (difficulty: Difficulty) => void
}

export function DifficultyButtons({ onFinish }: DifficultyButtonsProps) {
  return (
    <>
      <div className="text-sm text-[var(--text-muted)] text-center">
        How was it?
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("easy")
          }}
          className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium cursor-pointer"
        >
          Easy
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("normal")
          }}
          className="flex-1 py-3 bg-[var(--success)] text-white rounded-lg font-medium cursor-pointer"
        >
          Normal
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onFinish("hard")
          }}
          className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium cursor-pointer"
        >
          Hard
        </button>
      </div>
    </>
  )
}
