import { useState, useMemo } from 'react'
import type { HistoryEntry, SetEntry, Difficulty } from '../lib/state'
import { isSetEntry, isSessionEndMarker } from '../lib/state'
import type { Exercise } from '../hooks/useExerciseDB'

// Get border color class for difficulty
function getDifficultyBorderColor(difficulty?: Difficulty): string {
  switch (difficulty) {
    case 'easy': return 'border border-blue-500'
    case 'hard': return 'border border-orange-500'
    case 'normal': return 'border border-[var(--success)]'
    default: return ''
  }
}

interface SessionLogProps {
  history: HistoryEntry[]
  getExercise: (id: string) => Exercise | null
  onEndSession: () => void
  onResumeSession: () => void
  onDeleteSession: (sessionEndTs: number) => void
  onRemoveSet: (ts: number) => void
}

interface Session {
  sets: SetEntry[]
  endTs: number | null // null if in progress
  startTs: number
}

interface CircuitGroup {
  pattern: string[]
  rounds: SetEntry[][]
  isCircuit: boolean
}

// Detect circuits from a sequence of sets
function detectCircuits(sets: SetEntry[]): CircuitGroup[] {
  if (sets.length === 0) return []

  const groups: CircuitGroup[] = []
  let i = 0

  while (i < sets.length) {
    // Try to detect a circuit pattern starting at position i
    // A circuit is detected when: A, B, A (first exercise repeats = round 2 starting)

    // First, collect potential pattern until we see a repeat of the first exercise
    const pattern: string[] = []
    const patternSets: SetEntry[] = []
    let j = i
    let foundCircuit = false

    while (j < sets.length) {
      const exId = sets[j].exId

      if (pattern.length > 0 && exId === pattern[0]) {
        // Found repeat of first exercise - this is a circuit!
        foundCircuit = true
        break
      }

      if (!pattern.includes(exId)) {
        pattern.push(exId)
        patternSets.push(sets[j])
      } else {
        // Repeat of non-first exercise - not a circuit pattern, break
        break
      }
      j++
    }

    // It's a circuit if we have 2+ exercises and the first one repeated
    const isCircuit = pattern.length > 1 && foundCircuit

    if (isCircuit) {
      // Collect all rounds (including partial ones)
      const rounds: SetEntry[][] = [patternSets]
      let roundStart = j

      while (roundStart < sets.length) {
        const roundSets: SetEntry[] = []

        // Collect sets that follow the pattern (allow partial rounds)
        for (let p = 0; p < pattern.length && roundStart + p < sets.length; p++) {
          if (sets[roundStart + p].exId === pattern[p]) {
            roundSets.push(sets[roundStart + p])
          } else {
            break
          }
        }

        if (roundSets.length > 0) {
          rounds.push(roundSets)
          roundStart += roundSets.length
        } else {
          break
        }
      }

      groups.push({ pattern, rounds, isCircuit: true })
      i = roundStart
    } else {
      // Not a circuit - group consecutive sets of the same exercise
      const exId = sets[i].exId
      const consecutiveSets: SetEntry[] = []

      while (i < sets.length && sets[i].exId === exId) {
        consecutiveSets.push(sets[i])
        i++
      }

      groups.push({
        pattern: [exId],
        rounds: [consecutiveSets],
        isCircuit: false,
      })
    }
  }

  return groups
}

// Parse history into sessions
function parseSessions(history: HistoryEntry[]): Session[] {
  const sessions: Session[] = []
  let currentSets: SetEntry[] = []
  let sessionStart: number | null = null

  for (const entry of history) {
    if (isSetEntry(entry)) {
      if (sessionStart === null) {
        sessionStart = entry.ts
      }
      currentSets.push(entry)
    } else if (isSessionEndMarker(entry)) {
      if (currentSets.length > 0 && sessionStart !== null) {
        sessions.push({
          sets: currentSets,
          endTs: entry.ts,
          startTs: sessionStart,
        })
      }
      currentSets = []
      sessionStart = null
    }
  }

  // Add current in-progress session if any
  if (currentSets.length > 0 && sessionStart !== null) {
    sessions.push({
      sets: currentSets,
      endTs: null,
      startTs: sessionStart,
    })
  }

  return sessions
}

// Format date for session header
function formatSessionDate(ts: number): string {
  const date = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const entryDate = new Date(ts)
  entryDate.setHours(0, 0, 0, 0)

  if (entryDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

export function SessionLog({
  history,
  getExercise,
  onEndSession,
  onResumeSession,
  onDeleteSession,
  onRemoveSet,
}: SessionLogProps) {
  const [expandedSessionIdx, setExpandedSessionIdx] = useState<number | null>(0)
  const [selectedTs, setSelectedTs] = useState<number | null>(null)

  const sessions = useMemo(() => parseSessions(history), [history])

  if (sessions.length === 0) return null

  // Reverse to show most recent first
  const reversedSessions = [...sessions].reverse()

  const lastCompletedSession = sessions.filter(s => s.endTs !== null).pop()

  const formatTime = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (startTs: number, endTs: number | null) => {
    const end = endTs ?? Date.now()
    const seconds = Math.floor((end - startTs) / 1000)
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`
    }
    return `${mins}m`
  }

  const formatRest = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const renderSessionContent = (session: Session) => {
    const circuits = detectCircuits(session.sets)

    return (
      <div className="px-4 pb-3 space-y-1" onClick={() => setSelectedTs(null)}>
        {circuits.map((circuit, circuitIdx) => {
          const allSets = circuit.rounds.flat()
          const lastSet = allSets[allSets.length - 1]
          const hasRestAfter = lastSet?.rest && circuitIdx < circuits.length - 1

          if (circuit.isCircuit) {
            const exerciseNames = circuit.pattern.map(id => {
              const name = getExercise(id)?.name ?? id
              return name.split(' ').slice(0, 2).join(' ')
            })

            return (
              <div key={circuitIdx}>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">
                    <span className="text-[var(--success)]">⟳</span> {exerciseNames.join(' + ')}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {circuit.rounds.map((round, roundIdx) => (
                      <div key={roundIdx} className="flex items-center gap-1">
                        <span className="text-[var(--text-muted)] text-sm">{roundIdx + 1}.</span>
                        {round.map((set, i) => {
                          const isSelected = selectedTs === set.ts
                          return (
                            <div key={set.ts} className="flex items-center">
                              {isSelected ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onRemoveSet(set.ts)
                                    setSelectedTs(null)
                                  }}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-sm font-medium"
                                >
                                  Delete
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTs(set.ts)
                                  }}
                                  className="px-2 py-1 bg-[var(--bg)] rounded text-sm"
                                >
                                  <span className="font-medium">{set.kg}×{set.reps}</span>
                                </button>
                              )}
                              {i < round.length - 1 && !isSelected && (
                                <span className="text-[var(--text-muted)] text-xs px-0.5">,</span>
                              )}
                            </div>
                          )
                        })}
                        {round[round.length - 1]?.rest && roundIdx < circuit.rounds.length - 1 && (
                          <span className="text-xs text-[var(--text-muted)] px-1">
                            {formatRest(round[round.length - 1].rest!)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {hasRestAfter && (
                  <div className="text-center text-xs text-[var(--text-muted)] -mb-1 mt-1">
                    {formatRest(lastSet.rest!)}
                  </div>
                )}
              </div>
            )
          } else {
            const exId = circuit.pattern[0]
            const exercise = getExercise(exId)
            const name = exercise?.name ?? exId

            return (
              <div key={circuitIdx}>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">{name}</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {allSets.map((set, i) => {
                      const isSelected = selectedTs === set.ts

                      return (
                        <div key={set.ts} className="flex items-center gap-1">
                          {isSelected ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSet(set.ts)
                                setSelectedTs(null)
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium"
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTs(set.ts)
                              }}
                              className={`px-2 py-1 bg-[var(--bg)] rounded text-sm ${getDifficultyBorderColor(set.difficulty)}`}
                            >
                              <span className="text-[var(--text-muted)]">{i + 1}.</span>{' '}
                              <span className="font-medium">{set.kg}kg × {set.reps}</span>
                            </button>
                          )}
                          {set.rest && i < allSets.length - 1 && !isSelected && (
                            <span className="text-xs text-[var(--text-muted)] px-1">
                              {formatRest(set.rest)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {hasRestAfter && (
                  <div className="text-center text-xs text-[var(--text-muted)] -mb-1 mt-1">
                    {formatRest(lastSet.rest!)}
                  </div>
                )}
              </div>
            )
          }
        })}
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg)]">
      {reversedSessions.map((session, idx) => {
        const originalIdx = sessions.length - 1 - idx
        const isActive = session.endTs === null
        const isExpanded = expandedSessionIdx === originalIdx
        const isLastCompleted = lastCompletedSession === session
        const totalSets = session.sets.length
        const totalVolume = session.sets.reduce((sum, set) => sum + set.kg * set.reps, 0)
        const uniqueExercises = new Set(session.sets.map(s => s.exId)).size

        return (
          <div key={session.startTs} className={idx > 0 ? 'border-t border-[var(--border)]' : ''}>
            {/* Session Header */}
            <button
              onClick={() => setExpandedSessionIdx(isExpanded ? null : originalIdx)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                <div className="text-left">
                  <div className="font-medium flex items-center gap-2">
                    <span>{formatSessionDate(session.startTs)}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-sm text-[var(--text-muted)]">{formatTime(session.startTs)}</span>
                    {isActive && (
                      <span className="text-xs bg-[var(--success)] text-white px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {uniqueExercises} exercise{uniqueExercises !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''} · {Math.round(totalVolume).toLocaleString()}kg · {formatDuration(session.startTs, session.endTs)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEndSession()
                    }}
                    className="px-3 py-1.5 text-sm bg-[var(--success)] text-white rounded-lg"
                  >
                    Finish Day
                  </button>
                ) : isLastCompleted ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onResumeSession()
                    }}
                    className="px-3 py-1.5 text-sm bg-[var(--surface)] rounded-lg hover:bg-[var(--border)]"
                  >
                    Resume Day
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (session.endTs) onDeleteSession(session.endTs)
                    }}
                    className="px-3 py-1.5 text-sm text-red-500 bg-[var(--surface)] rounded-lg hover:bg-red-500 hover:text-white flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </button>

            {/* Session Content */}
            {isExpanded && renderSessionContent(session)}
          </div>
        )
      })}
    </div>
  )
}
