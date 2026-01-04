import { useState, useEffect } from 'react'

/**
 * Hook to rotate through images at a specified interval.
 * Extracted from ExerciseRow, SearchView, and ExerciseDetailModal.
 */
export function useImageRotation(imageUrls: string[], intervalMs = 1000): number {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Reset index when images change
    setIndex(0)
  }, [imageUrls])

  useEffect(() => {
    if (imageUrls.length <= 1) return

    const interval = setInterval(() => {
      setIndex(i => (i + 1) % imageUrls.length)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [imageUrls.length, intervalMs])

  return index
}
