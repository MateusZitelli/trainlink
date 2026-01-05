import { useAppState } from './hooks/useAppState'
import { DayTabs } from './components/DayTabs'
import { ExerciseList } from './components/ExerciseList'
import { RestTimer } from './components/RestTimer'
import { SearchView } from './components/SearchView'
import { SessionLog, type Session } from './components/SessionLog'
import { QuickExercise } from './components/QuickExercise'
import { ShareSessionView } from './components/ShareSessionView'
import { useExerciseDB } from './hooks/useExerciseDB'
import { isSetEntry } from './lib/state'
import { parseSessionShareFromUrl, clearStorage, generateSessionShareUrl, type ShareSessionData } from './lib/url'
import { useState, useMemo, useEffect, useCallback } from 'react'
import './index.css'

function App() {
  const { state, actions } = useAppState()
  const [showSearch, setShowSearch] = useState(false)
  const [sessionShareData, setSessionShareData] = useState<ShareSessionData | null>(null)
  const { getExercise, fetchExercises, dbReady } = useExerciseDB()

  const activeDay = state.plan.days.find(d => d.name === state.session?.activeDay)

  // Show loading while exercise DB initializes (only if we have exercises to load)
  const needsExercises = state.plan.days.some(d => d.exercises.length > 0) || state.history.length > 0
  if (!dbReady && needsExercises) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--bg)]">
        <div className="text-5xl mb-4">💪</div>
        <div className="text-xl font-bold mb-2">TrainLink</div>
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--text)] rounded-full animate-spin" />
      </div>
    )
  }

  // Check for session share URL on mount
  useEffect(() => {
    const data = parseSessionShareFromUrl()
    if (data) {
      setSessionShareData(data)
      // Fetch exercises for the shared session
      const exIds = [...new Set(data.sets.map(s => s.exId))]
      if (data.previousSession) {
        data.previousSession.sets.forEach(s => exIds.push(s.exId))
      }
      fetchExercises([...new Set(exIds)])
    }
  }, [fetchExercises])

  // Collect all exercise IDs from plan and history
  const allExerciseIds = useMemo(() => {
    const ids = new Set<string>()
    state.plan.days.forEach(day => day.exercises.forEach(id => ids.add(id)))
    state.history.forEach(entry => {
      if (isSetEntry(entry)) ids.add(entry.exId)
    })
    return Array.from(ids)
  }, [state.plan.days, state.history])

  // Fetch missing exercise details on load
  useEffect(() => {
    if (allExerciseIds.length > 0) {
      fetchExercises(allExerciseIds)
    }
  }, [allExerciseIds, fetchExercises])

  // Find previous comparable session for progress comparison
  const findPreviousSession = useCallback((currentSession: Session): Session | null => {
    const currentExIds = new Set(currentSession.sets.map(s => s.exId))

    // Parse history into sessions
    const sessions: Session[] = []
    let currentSets: typeof currentSession.sets = []
    let sessionStart: number | null = null

    for (const entry of state.history) {
      if (isSetEntry(entry)) {
        if (sessionStart === null) sessionStart = entry.ts
        currentSets.push(entry)
      } else if (entry.type === 'session-end') {
        if (currentSets.length > 0 && sessionStart !== null) {
          sessions.push({ sets: currentSets, endTs: entry.ts, startTs: sessionStart })
        }
        currentSets = []
        sessionStart = null
      }
    }

    // Find most recent completed session before current that shares 50%+ exercises
    for (let i = sessions.length - 1; i >= 0; i--) {
      const session = sessions[i]
      if (session.endTs && session.endTs < currentSession.startTs) {
        const sessionExIds = new Set(session.sets.map(s => s.exId))
        const overlap = [...currentExIds].filter(id => sessionExIds.has(id))
        if (overlap.length >= currentExIds.size * 0.5) {
          return session
        }
      }
    }
    return null
  }, [state.history])

  // Handle share session action
  const handleShareSession = useCallback((session: Session) => {
    if (!session.endTs) return // Can't share in-progress sessions

    // Determine session name from active day or date
    const sessionName = state.session?.activeDay || new Date(session.startTs).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    // Find previous session for comparison
    const previousSession = findPreviousSession(session)

    const shareUrl = generateSessionShareUrl(
      sessionName,
      { sets: session.sets, startTs: session.startTs, endTs: session.endTs },
      previousSession ? { sets: previousSession.sets, startTs: previousSession.startTs, endTs: previousSession.endTs! } : undefined
    )

    navigator.clipboard.writeText(shareUrl)
    alert('Share link copied to clipboard!')
  }, [state.session?.activeDay, findPreviousSession])

  // Handle clear storage
  const handleClearStorage = () => {
    if (confirm('Clear all saved data? This will reset the app to its initial state.')) {
      clearStorage()
      window.location.hash = ''
      window.location.reload()
    }
  }

  // Exit session share view
  const handleExitSessionShare = () => {
    setSessionShareData(null)
    // Remove session param from URL
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }

  // Auto-select first day if we have days but no active day
  useEffect(() => {
    if (!sessionShareData && state.plan.days.length > 0 && !state.session?.activeDay) {
      actions.setActiveDay(state.plan.days[0].name)
    }
  }, [sessionShareData, state.plan.days, state.session?.activeDay, actions])

  // Show session share view if we have session share data
  if (sessionShareData) {
    return (
      <ShareSessionView
        sessionData={sessionShareData}
        onBack={handleExitSessionShare}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      {/* Rest Timer */}
      <RestTimer
        restStartedAt={state.session?.restStartedAt}
        history={state.history}
        currentExId={state.session?.currentExId}
        restTimes={state.restTimes}
      />

      {/* Day Tabs */}
      <DayTabs
        days={state.plan.days}
        activeDay={state.session?.activeDay}
        onSelectDay={actions.setActiveDay}
        onAddDay={actions.addDay}
        onRenameDay={actions.renameDay}
        onDeleteDay={actions.deleteDay}
        onMoveDay={actions.moveDay}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onClearStorage={handleClearStorage}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {showSearch ? (
          <SearchView
            activeDay={state.session?.activeDay}
            days={state.plan.days}
            onAddToDay={actions.addExerciseToDay}
            onDoNow={(exId) => {
              actions.selectExercise(exId)
              setShowSearch(false)
            }}
          />
        ) : (() => {
          const currentExId = state.session?.currentExId

          // If there's an active day, always show ExerciseList (no collapse)
          if (activeDay) {
            return (
              <div className="pt-4 pb-[60vh]">
                <ExerciseList
                  day={activeDay}
                  history={state.history}
                  restTimes={state.restTimes}
                  currentExId={currentExId}
                  onSelectExercise={actions.selectExercise}
                  onRemoveExercise={(exId) => actions.removeExerciseFromDay(activeDay.name, exId)}
                  onLogSet={actions.logSet}
                  onAddExercise={() => setShowSearch(true)}
                  onAddExerciseToDay={(exId) => actions.addExerciseToDay(activeDay.name, exId)}
                  onMoveExercise={(from, to) => actions.moveExerciseInDay(activeDay.name, from, to)}
                  onSetRestTime={actions.setRestTime}
                  onClearRest={actions.clearRest}
                />
              </div>
            )
          }

          // No active day - show QuickExercise if an exercise is selected
          if (currentExId) {
            return (
              <QuickExercise
                exerciseId={currentExId}
                history={state.history}
                restTimes={state.restTimes}
                onLogSet={actions.logSet}
                onSetRestTime={actions.setRestTime}
                onClose={() => actions.selectExercise(undefined)}
                onClearRest={actions.clearRest}
              />
            )
          }

          // Empty state - prompt to add a day
          return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-4">💪</div>
              <h2 className="text-xl font-bold mb-2">Welcome to TrainLink</h2>
              <p className="text-[var(--text-muted)] mb-6">
                Create your first training day to get started
              </p>
              <button
                onClick={() => {
                  const name = prompt('Day name (e.g., Push, Pull, Legs):')
                  if (name?.trim()) {
                    actions.addDay(name.trim())
                  }
                }}
                className="px-6 py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium"
              >
                + Add Training Day
              </button>
            </div>
          )
        })()}
      </div>

      {/* Sticky Session Log */}
      {!showSearch && state.history.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto border-t border-[var(--border)] bg-[var(--bg)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <SessionLog
            history={state.history}
            getExercise={getExercise}
            onEndSession={actions.endSession}
            onResumeSession={actions.resumeSession}
            onDeleteSession={actions.deleteSession}
            onRemoveSet={actions.removeSet}
            onShareSession={handleShareSession}
          />
        </div>
      )}
    </div>
  )
}

export default App
