import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import type { HistoryEntry, SetEntry, Difficulty } from '../lib/state'
import { isSetEntry, isSessionEndMarker } from '../lib/state'
import type { Exercise } from '../hooks/useExerciseDB'
import {
  getDifficultyBorderColor,
  formatDuration,
  formatRest,
  formatSessionDate,
  formatTimeOfDay,
} from '../lib/utils'
import { ActionBar } from './ActionBar'

export interface SessionLogProps {
  history: HistoryEntry[]
  getExercise: (id: string) => Exercise | null
  onEndSession: () => void
  onResumeSession: () => void
  onDeleteSession: (sessionEndTs: number) => void
  onRemoveSet: (set: SetEntry) => void
  onUpdateSet?: (ts: number, updates: Partial<Omit<SetEntry, 'ts' | 'type'>>) => void
  onMoveCycleInSession?: (cycleSetTimestamps: number[], targetIndex: number, sessionEndTs: number | null) => void
  onMoveCycleToSession?: (cycleSetTimestamps: number[], targetSessionEndTs: number | null) => void
  onShareSession?: (session: Session) => void
  urlCutoffTs?: number | null
}

export interface Session {
  sets: SetEntry[]
  endTs: number | null
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
    const pattern: string[] = []
    const patternSets: SetEntry[] = []
    let j = i
    let foundCircuit = false

    while (j < sets.length) {
      const exId = sets[j].exId

      if (pattern.length > 0 && exId === pattern[0]) {
        foundCircuit = true
        break
      }

      if (!pattern.includes(exId)) {
        pattern.push(exId)
        patternSets.push(sets[j])
      } else {
        break
      }
      j++
    }

    const isCircuit = pattern.length > 1 && foundCircuit

    if (isCircuit) {
      const rounds: SetEntry[][] = [patternSets]
      let roundStart = j

      while (roundStart < sets.length) {
        const roundSets: SetEntry[] = []

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

  if (currentSets.length > 0 && sessionStart !== null) {
    sessions.push({
      sets: currentSets,
      endTs: null,
      startTs: sessionStart,
    })
  }

  return sessions
}

export function SessionLog({
  history,
  getExercise,
  onEndSession,
  onResumeSession,
  onDeleteSession,
  onRemoveSet,
  onUpdateSet,
  onMoveCycleInSession,
  onMoveCycleToSession,
  onShareSession,
  urlCutoffTs,
}: SessionLogProps) {
  const { t } = useTranslation()
  const [selectedTs, setSelectedTs] = useState<number | null>(null)
  const [editingTs, setEditingTs] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ kg: '', reps: '', rest: '' })
  const [editingRestTs, setEditingRestTs] = useState<number | null>(null)
  const [editRestValue, setEditRestValue] = useState('')
  const [isListCollapsed, setIsListCollapsed] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const sessions = useMemo(() => parseSessions(history), [history])

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Flatten all cycles from all sessions into one list with headers (reversed - newest first)
  interface FlatItem {
    type: 'header' | 'cycle'
    session: Session
    sessionIdx: number
    circuit?: CircuitGroup
    circuitIdxInSession?: number
    totalCircuitsInSession?: number
    isFirstHeader: boolean
  }

  const flatItems = useMemo(() => {
    const items: FlatItem[] = []
    const reversedSessions = [...sessions].reverse()

    reversedSessions.forEach((session, reversedIdx) => {
      const sessionIdx = sessions.length - 1 - reversedIdx
      const circuits = detectCircuits(session.sets)

      // Add header for this session
      items.push({
        type: 'header',
        session,
        sessionIdx,
        isFirstHeader: items.length === 0,
      })

      // Add cycles for this session
      circuits.forEach((circuit, circuitIdxInSession) => {
        items.push({
          type: 'cycle',
          circuit,
          session,
          sessionIdx,
          circuitIdxInSession,
          totalCircuitsInSession: circuits.length,
          isFirstHeader: false,
        })
      })
    })
    return items
  }, [sessions])

  // Get only cycles for drag handling
  const flatCycles = useMemo(() =>
    flatItems.filter((item): item is FlatItem & { type: 'cycle'; circuit: CircuitGroup } => item.type === 'cycle'),
    [flatItems]
  )

  const isShareable = (session: Session): boolean => {
    if (urlCutoffTs === null || urlCutoffTs === undefined) return true
    return session.startTs >= urlCutoffTs
  }

  const handleSetClick = useCallback((set: SetEntry, e: React.MouseEvent) => {
    e.stopPropagation()

    if (editingTs === set.ts) return

    if (selectedTs === set.ts) {
      setEditingTs(set.ts)
      setEditValues({
        kg: set.kg.toString(),
        reps: set.reps.toString(),
        rest: set.rest?.toString() ?? '',
      })
    } else {
      setSelectedTs(set.ts)
      setEditingTs(null)
    }
  }, [selectedTs, editingTs])

  const handleEdit = useCallback(() => {
    if (selectedTs === null) return
    const set = sessions.flatMap(s => s.sets).find(s => s.ts === selectedTs)
    if (!set) return

    setEditingTs(selectedTs)
    setEditValues({
      kg: set.kg.toString(),
      reps: set.reps.toString(),
      rest: set.rest?.toString() ?? '',
    })
  }, [selectedTs, sessions])

  const handleDelete = useCallback(() => {
    if (selectedTs === null) return
    const set = sessions.flatMap(s => s.sets).find(s => s.ts === selectedTs)
    if (set) {
      onRemoveSet(set)
      setSelectedTs(null)
    }
  }, [selectedTs, sessions, onRemoveSet])

  const handleSave = useCallback((ts: number, difficulty?: Difficulty) => {
    if (onUpdateSet) {
      const updates: Partial<Omit<SetEntry, 'ts' | 'type'>> = {
        kg: parseFloat(editValues.kg) || 0,
        reps: parseInt(editValues.reps) || 0,
      }
      if (editValues.rest) {
        updates.rest = parseInt(editValues.rest)
      }
      if (difficulty) {
        updates.difficulty = difficulty
      }
      onUpdateSet(ts, updates)
    }
    setEditingTs(null)
    setSelectedTs(null)
  }, [editValues, onUpdateSet])

  const handleCancel = useCallback(() => {
    setEditingTs(null)
    setSelectedTs(null)
  }, [])

  const handleClickOutside = useCallback(() => {
    if (editingTs === null && selectedTs !== null) {
      setSelectedTs(null)
    }
  }, [editingTs, selectedTs])

  // Drag and drop handler for flat list (with headers interleaved)
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result

    if (!destination) return
    if (source.index === destination.index) return

    const sourceItem = flatItems[source.index]
    if (!sourceItem || sourceItem.type !== 'cycle') return

    const cycleTimestamps = sourceItem.circuit!.rounds.flat().map(s => s.ts)

    // Find the target - skip headers when determining position
    // Count how many cycles come before the destination index
    let cycleCountBeforeDest = 0
    for (let i = 0; i < destination.index; i++) {
      if (flatItems[i].type === 'cycle') cycleCountBeforeDest++
    }

    // Determine target session and position
    let targetSession: Session
    let targetSetIndex: number

    if (cycleCountBeforeDest === 0) {
      // Dropped at very beginning
      targetSession = flatCycles[0]?.session ?? sessions[sessions.length - 1]
      targetSetIndex = 0
    } else if (cycleCountBeforeDest >= flatCycles.length) {
      // Dropped at the end
      const lastCycle = flatCycles[flatCycles.length - 1]
      targetSession = lastCycle.session
      targetSetIndex = lastCycle.session.sets.length
    } else {
      // Find the cycle at the destination position
      const cycleAtDest = flatCycles[cycleCountBeforeDest]
      targetSession = cycleAtDest.session

      // Calculate set index within the target session
      const circuitsInSession = detectCircuits(targetSession.sets)
      targetSetIndex = 0
      for (let i = 0; i < (cycleAtDest.circuitIdxInSession ?? 0); i++) {
        targetSetIndex += circuitsInSession[i].rounds.flat().length
      }
    }

    const sourceSession = sourceItem.session

    if (sourceSession === targetSession) {
      if (onMoveCycleInSession) {
        onMoveCycleInSession(cycleTimestamps, targetSetIndex, targetSession.endTs)
      }
    } else {
      if (onMoveCycleToSession) {
        onMoveCycleToSession(cycleTimestamps, targetSession.endTs)
      }
    }
  }, [flatItems, flatCycles, sessions, onMoveCycleInSession, onMoveCycleToSession])

  // Handle inter-cycle rest editing
  const handleRestClick = useCallback((set: SetEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingRestTs(set.ts)
    setEditRestValue(set.rest?.toString() ?? '')
    setSelectedTs(null)
    setEditingTs(null)
  }, [])

  const handleRestSave = useCallback(() => {
    if (editingRestTs !== null && onUpdateSet) {
      const restValue = parseInt(editRestValue) || 0
      onUpdateSet(editingRestTs, { rest: restValue > 0 ? restValue : undefined })
    }
    setEditingRestTs(null)
    setEditRestValue('')
  }, [editingRestTs, editRestValue, onUpdateSet])

  const handleRestCancel = useCallback(() => {
    setEditingRestTs(null)
    setEditRestValue('')
  }, [])

  const renderEditUI = (set: SetEntry) => (
    <div className="bg-[var(--surface-elevated,var(--surface))] rounded-lg p-3 space-y-3 shadow-lg" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={editValues.kg}
          onChange={(e) => setEditValues(prev => ({ ...prev, kg: e.target.value }))}
          className="w-20 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
          placeholder="kg"
          autoFocus
        />
        <span className="text-sm text-[var(--text-muted)]">kg ×</span>
        <input
          type="number"
          value={editValues.reps}
          onChange={(e) => setEditValues(prev => ({ ...prev, reps: e.target.value }))}
          className="w-20 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
          placeholder="reps"
        />
        <span className="text-sm text-[var(--text-muted)]">reps</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={editValues.rest}
          onChange={(e) => setEditValues(prev => ({ ...prev, rest: e.target.value }))}
          className="w-20 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
          placeholder="rest"
        />
        <span className="text-sm text-[var(--text-muted)]">s rest</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] mr-1">{t('common:difficulty.easy')}:</span>
        <button
          onClick={() => handleSave(set.ts, 'easy')}
          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors"
        >
          {t('common:difficulty.easy')}
        </button>
        <button
          onClick={() => handleSave(set.ts, 'normal')}
          className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors"
        >
          {t('common:difficulty.normal')}
        </button>
        <button
          onClick={() => handleSave(set.ts, 'hard')}
          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors"
        >
          {t('common:difficulty.hard')}
        </button>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
        <button
          onClick={() => handleSave(set.ts)}
          className="flex-1 px-4 py-2 bg-[var(--success)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t('common:buttons.save')}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--surface)] transition-colors"
        >
          {t('common:buttons.cancel')}
        </button>
      </div>
    </div>
  )

  const renderSetButton = (set: SetEntry, index: number, totalSets: number) => {
    const isSelected = selectedTs === set.ts
    const isEditing = editingTs === set.ts

    if (isEditing) {
      return <div key={set.ts}>{renderEditUI(set)}</div>
    }

    return (
      <div key={set.ts} className="flex items-center">
        <button
          onClick={(e) => handleSetClick(set, e)}
          className={`px-2 py-1 bg-[var(--bg)] rounded text-sm transition-all ${getDifficultyBorderColor(set.difficulty)} ${
            isSelected
              ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]'
              : 'hover:bg-[var(--surface)]'
          }`}
        >
          <span className="text-[var(--text-muted)] text-xs">{index + 1}.</span>
          <span className="font-medium">{set.kg}×{set.reps}</span>
        </button>
        {set.rest && index < totalSets - 1 && (
          <span className="text-xs text-[var(--text-muted)] px-1">
            {formatRest(set.rest)}
          </span>
        )}
      </div>
    )
  }

  const renderCircuitSetButton = (set: SetEntry, showComma: boolean) => {
    const isSelected = selectedTs === set.ts
    const isEditing = editingTs === set.ts

    if (isEditing) {
      return (
        <div key={set.ts} className="flex items-center">
          {renderEditUI(set)}
        </div>
      )
    }

    return (
      <div key={set.ts} className="flex items-center">
        <button
          onClick={(e) => handleSetClick(set, e)}
          className={`px-2 py-1 bg-[var(--bg)] rounded text-sm transition-all ${
            isSelected
              ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]'
              : 'hover:bg-[var(--surface)]'
          }`}
        >
          <span className="font-medium">{set.kg}×{set.reps}</span>
        </button>
        {showComma && (
          <span className="text-[var(--text-muted)] text-xs px-0.5">,</span>
        )}
      </div>
    )
  }

  const renderInterCycleRest = (lastSet: SetEntry) => {
    const isEditingRest = editingRestTs === lastSet.ts

    if (isEditingRest) {
      return (
        <div className="flex items-center justify-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
          <input
            type="number"
            value={editRestValue}
            onChange={(e) => setEditRestValue(e.target.value)}
            className="w-16 px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-center focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
            placeholder="sec"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRestSave()
              if (e.key === 'Escape') handleRestCancel()
            }}
          />
          <span className="text-xs text-[var(--text-muted)]">s</span>
          <button onClick={handleRestSave} className="px-2 py-1 bg-[var(--success)] text-white rounded text-xs">✓</button>
          <button onClick={handleRestCancel} className="px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-xs">✕</button>
        </div>
      )
    }

    return (
      <button
        onClick={(e) => handleRestClick(lastSet, e)}
        className="block mx-auto text-xs text-[var(--text-muted)] mt-2 px-2 py-0.5 rounded hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors"
      >
        {formatRest(lastSet.rest!)}
      </button>
    )
  }

  const renderCycleCard = (circuit: CircuitGroup, circuitIdx: number, totalCircuits: number, isDraggingThis: boolean, dragHandleProps?: any) => {
    const allSets = circuit.rounds.flat()
    const lastSet = allSets[allSets.length - 1]
    const hasRestAfter = lastSet?.rest && circuitIdx < totalCircuits - 1

    if (circuit.isCircuit) {
      const exerciseNames = circuit.pattern.map(id => {
        const name = getExercise(id)?.name ?? id
        return name.split(' ').slice(0, 2).join(' ')
      })

      return (
        <>
          <div className={`bg-[var(--surface)] rounded-lg p-3 ${isDraggingThis ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <span className="text-[var(--success)]">⟳</span>
              <span>{exerciseNames.join(' + ')}</span>
              <span {...dragHandleProps} className="ml-auto text-[var(--text-muted)] select-none cursor-grab active:cursor-grabbing p-1 -m-1">⋮⋮</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {circuit.rounds.map((round, roundIdx) => (
                <div key={roundIdx} className="flex items-center gap-1">
                  <span className="text-[var(--text-muted)] text-sm">{roundIdx + 1}.</span>
                  {round.map((set, i) => renderCircuitSetButton(set, i < round.length - 1))}
                  {round[round.length - 1]?.rest && roundIdx < circuit.rounds.length - 1 && (
                    <span className="text-xs text-[var(--text-muted)] px-1">
                      {formatRest(round[round.length - 1].rest!)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {hasRestAfter && renderInterCycleRest(lastSet)}
        </>
      )
    } else {
      const exId = circuit.pattern[0]
      const exercise = getExercise(exId)
      const name = exercise?.name ?? exId

      return (
        <>
          <div className={`bg-[var(--surface)] rounded-lg p-3 ${isDraggingThis ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <span>{name}</span>
              <span {...dragHandleProps} className="ml-auto text-[var(--text-muted)] select-none cursor-grab active:cursor-grabbing p-1 -m-1">⋮⋮</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {allSets.map((set, i) => renderSetButton(set, i, allSets.length))}
            </div>
          </div>
          {hasRestAfter && renderInterCycleRest(lastSet)}
        </>
      )
    }
  }

  const renderDayHeader = (session: Session, isFirst: boolean) => {
    const isActive = session.endTs === null
    const totalSets = session.sets.length
    const totalVolume = session.sets.reduce((sum, set) => sum + set.kg * set.reps, 0)
    const uniqueExercises = new Set(session.sets.map(s => s.exId)).size
    const lastCompletedSession = sessions.filter(s => s.endTs !== null).pop()
    const isLastCompleted = lastCompletedSession === session

    return (
      <div className={`${!isFirst ? 'border-t border-[var(--border)] mt-4' : ''}`}>
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium flex items-center gap-2">
              <span>{formatSessionDate(session.startTs)}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-sm text-[var(--text-muted)]">{formatTimeOfDay(session.startTs)}</span>
              {isActive && (
                <span className="text-xs bg-[var(--success)] text-white px-1.5 py-0.5 rounded">{t('session.active')}</span>
              )}
              {!isActive && !isShareable(session) && (
                <span className="text-xs bg-[var(--surface)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">{t('session.local')}</span>
              )}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {t('session.exercises', { count: uniqueExercises })} · {t('session.sets', { count: totalSets })} · {t('session.totalVolume', { amount: Math.round(totalVolume).toLocaleString() })} · {formatDuration(session.startTs, session.endTs)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isActive ? (
              <button
                onClick={onEndSession}
                className="px-3 py-1.5 text-sm bg-[var(--success)] text-white rounded-lg"
              >
                {t('session.finishDay')}
              </button>
            ) : (
              <>
                {onShareSession && (
                  <button
                    onClick={() => isShareable(session) && onShareSession(session)}
                    disabled={!isShareable(session)}
                    className={`p-2 bg-[var(--surface)] rounded-lg ${
                      isShareable(session)
                        ? 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'
                        : 'text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                    }`}
                    title={isShareable(session) ? t('session.shareSession') : t('session.localOnly')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                )}
                {isLastCompleted ? (
                  <button
                    onClick={onResumeSession}
                    className="px-3 py-1.5 text-sm bg-[var(--surface)] rounded-lg hover:bg-[var(--border)]"
                  >
                    {t('session.resumeDay')}
                  </button>
                ) : (
                  <button
                    onClick={() => session.endTs && onDeleteSession(session.endTs)}
                    className="px-3 py-1.5 text-sm text-red-500 bg-[var(--surface)] rounded-lg hover:bg-red-500 hover:text-white flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    {t('session.deleteSession')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) return null

  // Calculate totals for sessions header
  const totalSets = sessions.reduce((sum, s) => sum + s.sets.length, 0)
  const totalVolume = sessions.reduce((sum, s) => sum + s.sets.reduce((v, set) => v + set.kg * set.reps, 0), 0)

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div ref={containerRef} className="bg-[var(--bg)]" onClick={handleClickOutside}>
        {/* Sessions list header with collapse toggle */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsListCollapsed(!isListCollapsed)}
          onKeyDown={(e) => e.key === 'Enter' && setIsListCollapsed(!isListCollapsed)}
          className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface)]/50 transition-colors border-b border-[var(--border)]"
        >
          <span className="text-lg text-[var(--text-muted)]">{isListCollapsed ? '▶' : '▼'}</span>
          <div>
            <div className="font-medium">{t('session.sessions')}</div>
            <div className="text-sm text-[var(--text-muted)]">
              {t('session.days', { count: sessions.length })} · {t('session.sets', { count: totalSets })} · {t('session.totalKg', { amount: Math.round(totalVolume).toLocaleString() })}
            </div>
          </div>
        </div>

        {!isListCollapsed && (
          <Droppable droppableId="all-cycles" type="CYCLE">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="pb-3"
              >
                {flatItems.map((item, idx) => {
                  if (item.type === 'header') {
                    return (
                      <Draggable
                        key={`header-${item.sessionIdx}`}
                        draggableId={`header-${item.sessionIdx}`}
                        index={idx}
                        isDragDisabled={true}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            {renderDayHeader(item.session, item.isFirstHeader)}
                          </div>
                        )}
                      </Draggable>
                    )
                  }

                  return (
                    <Draggable
                      key={`cycle-${idx}`}
                      draggableId={`cycle-${idx}`}
                      index={idx}
                      isDragDisabled={editingTs !== null || editingRestTs !== null}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`px-4 pt-2 ${dragSnapshot.isDragging ? 'opacity-90 shadow-2xl z-50 bg-[var(--bg)]' : ''}`}
                        >
                          {renderCycleCard(
                            item.circuit!,
                            item.circuitIdxInSession!,
                            item.totalCircuitsInSession!,
                            dragSnapshot.isDragging,
                            dragProvided.dragHandleProps
                          )}
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}

        {/* Action bar for selected set */}
        {selectedTs !== null && editingTs === null && (
          <ActionBar
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCancel={handleCancel}
          />
        )}

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-20 right-4 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-lg hover:bg-[var(--border)] transition-all z-40"
            aria-label="Scroll to top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    </DragDropContext>
  )
}
