import { useState, useEffect } from 'react'

/**
 * Hook to track elapsed time from a start timestamp.
 * Extracted from ExerciseRow and RestTimer.
 */
export function useElapsedTimer(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }

    const update = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return elapsed
}
