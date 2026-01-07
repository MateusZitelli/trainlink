import { useState, useCallback, useRef, useEffect } from 'react'
import type { SetEntry } from '../lib/state'

const UNDO_TIMEOUT_MS = 5000

interface UseUndoableDeleteProps {
  onDelete: (ts: number) => void
  onRestore: (sets: SetEntry[]) => void
}

export function useUndoableDelete({ onDelete, onRestore }: UseUndoableDeleteProps) {
  const [deletedSets, setDeletedSets] = useState<SetEntry[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimeout_ = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startTimeout = useCallback(() => {
    clearTimeout_()
    timeoutRef.current = setTimeout(() => {
      setDeletedSets([])
    }, UNDO_TIMEOUT_MS)
  }, [clearTimeout_])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout_()
  }, [clearTimeout_])

  const deleteSet = useCallback((set: SetEntry) => {
    onDelete(set.ts)
    setDeletedSets(prev => [...prev, set])
    startTimeout()
  }, [onDelete, startTimeout])

  const undo = useCallback(() => {
    if (deletedSets.length === 0) return
    onRestore(deletedSets)
    setDeletedSets([])
    clearTimeout_()
  }, [deletedSets, onRestore, clearTimeout_])

  const dismiss = useCallback(() => {
    setDeletedSets([])
    clearTimeout_()
  }, [clearTimeout_])

  const canUndo = deletedSets.length > 0

  const undoMessage = deletedSets.length === 0
    ? null
    : deletedSets.length === 1
      ? 'Set deleted'
      : `${deletedSets.length} sets deleted`

  return {
    deleteSet,
    undo,
    dismiss,
    deletedSets,
    canUndo,
    undoMessage,
  }
}
