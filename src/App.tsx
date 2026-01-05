import { useAppState } from './hooks/useAppState'
import { DayTabs } from './components/DayTabs'
import { ExerciseList } from './components/ExerciseList'
import { RestTimer } from './components/RestTimer'
import { SearchView } from './components/SearchView'
import { SessionLog } from './components/SessionLog'
import { QuickExercise } from './components/QuickExercise'
import { ShareDayView } from './components/ShareDayView'
import { useExerciseDB } from './hooks/useExerciseDB'
import { isSetEntry } from './lib/state'
import { parseShareFromUrl, clearStorage, generateShareUrl } from './lib/url'
import { useState, useMemo, useEffect } from 'react'
import './index.css'

function App() {
  const { state, actions } = useAppState()
  const [showSearch, setShowSearch] = useState(false)
  const [shareData, setShareData] = useState<ReturnType<typeof parseShareFromUrl>>(null)
  const { getExercise, fetchExercises } = useExerciseDB()

  const activeDay = state.plan.days.find(d => d.name === state.session?.activeDay)

  // Check for share URL on mount
  useEffect(() => {
    const data = parseShareFromUrl()
    if (data) {
      setShareData(data)
      // Fetch exercises for the shared day
      fetchExercises(data.day.exercises)
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

  // Handle share day action
  const handleShareDay = (dayName: string) => {
    const day = state.plan.days.find(d => d.name === dayName)
    if (!day) return

    const shareUrl = generateShareUrl(day, state.restTimes, state.history)
    navigator.clipboard.writeText(shareUrl)
    alert('Share link copied to clipboard!')
  }

  // Handle clear storage
  const handleClearStorage = () => {
    if (confirm('Clear all saved data? This will reset the app to its initial state.')) {
      clearStorage()
      window.location.hash = ''
      window.location.reload()
    }
  }

  // Exit share view
  const handleExitShare = () => {
    setShareData(null)
    // Remove share param from URL
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }

  // Auto-select first day if we have days but no active day
  useEffect(() => {
    if (!shareData && state.plan.days.length > 0 && !state.session?.activeDay) {
      actions.setActiveDay(state.plan.days[0].name)
    }
  }, [shareData, state.plan.days, state.session?.activeDay, actions])

  // Show share view if we have share data
  if (shareData) {
    return (
      <ShareDayView
        day={shareData.day}
        restTimes={shareData.restTimes}
        setPatterns={shareData.setPatterns || {}}
        onBack={handleExitShare}
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
        onShareDay={handleShareDay}
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
          />
        </div>
      )}
    </div>
  )
}

export default App
