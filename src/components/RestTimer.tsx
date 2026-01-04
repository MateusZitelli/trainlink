import { useEffect, useState, useRef } from 'react'
import type { HistoryEntry } from '../lib/state'
import { getDefaultRest } from '../lib/state'

interface RestTimerProps {
  restStartedAt?: number
  history: HistoryEntry[]
  currentExId?: string
  restTimes: Record<string, number>
}

export function RestTimer({ restStartedAt, history, currentExId, restTimes }: RestTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const hasNotified = useRef(false)

  const targetRest = currentExId ? getDefaultRest(history, currentExId, restTimes) : 90
  const isComplete = elapsed >= targetRest

  // Reset notification flag when rest starts
  useEffect(() => {
    if (restStartedAt) {
      hasNotified.current = false
    }
  }, [restStartedAt])

  useEffect(() => {
    if (!restStartedAt) {
      setElapsed(0)
      return
    }

    const update = () => {
      const newElapsed = Math.floor((Date.now() - restStartedAt) / 1000)
      setElapsed(newElapsed)

      // Notify when rest is complete (only once)
      if (newElapsed >= targetRest && !hasNotified.current) {
        hasNotified.current = true
        notifyRestComplete()
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [restStartedAt, targetRest])

  if (!restStartedAt) return null

  const progress = Math.min(elapsed / targetRest, 1)
  const remaining = Math.max(targetRest - elapsed, 0)
  const displayTime = isComplete ? elapsed - targetRest : remaining
  const minutes = Math.floor(displayTime / 60)
  const seconds = displayTime % 60

  return (
    <div className={`px-4 py-2 ${isComplete ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${isComplete ? 'bg-white' : 'bg-[var(--text)]'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`text-sm font-mono min-w-[50px] ${isComplete ? 'text-white font-bold' : 'text-[var(--text-muted)]'}`}>
          {isComplete ? '+' : ''}{minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

function notifyRestComplete() {
  // Vibrate if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }

  // Play notification sound
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 880 // A5 note
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Audio not supported
  }
}
