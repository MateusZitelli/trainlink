import { useEffect, useRef } from 'react'
import type { HistoryEntry } from '../lib/state'
import { getDefaultRest } from '../lib/state'
import { useElapsedTimer } from '../hooks/useElapsedTimer'

interface RestTimerProps {
  restStartedAt?: number
  history: HistoryEntry[]
  currentExId?: string
  restTimes: Record<string, number>
}

export function RestTimer({ restStartedAt, history, currentExId, restTimes }: RestTimerProps) {
  const hasNotified = useRef(false)
  const elapsed = useElapsedTimer(restStartedAt ?? null)

  const targetRest = currentExId ? getDefaultRest(history, currentExId, restTimes) : 90
  const isComplete = elapsed >= targetRest

  // Reset notification flag when rest starts
  useEffect(() => {
    if (restStartedAt) {
      hasNotified.current = false
    }
  }, [restStartedAt])

  // Notify when rest is complete
  useEffect(() => {
    if (elapsed >= targetRest && !hasNotified.current && restStartedAt) {
      hasNotified.current = true
      notifyRestComplete()
    }
  }, [elapsed, targetRest, restStartedAt])

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
  // Vibrate if supported - boxing bell pattern
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 80, 100, 80, 100])
  }

  // Play boxing bell sound (3 rings)
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const playBellRing = (startTime: number) => {
      // Create multiple oscillators for metallic bell harmonics
      const frequencies = [800, 1200, 1600, 2000] // Bell harmonics
      const gains = [0.4, 0.25, 0.15, 0.1] // Decreasing volume for higher harmonics

      frequencies.forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()

        osc.connect(gain)
        gain.connect(audioContext.destination)

        osc.frequency.value = freq
        osc.type = 'sine'

        // Quick attack, medium decay (bell-like)
        gain.gain.setValueAtTime(gains[i], startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)

        osc.start(startTime)
        osc.stop(startTime + 0.4)
      })
    }

    // Three bell rings like boxing round bell
    const now = audioContext.currentTime
    playBellRing(now)
    playBellRing(now + 0.25)
    playBellRing(now + 0.5)

  } catch {
    // Audio not supported
  }
}
