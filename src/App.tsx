import { useAppState } from './hooks/useAppState'
import { DayTabs } from './components/DayTabs'
import { ExerciseList } from './components/ExerciseList'
import { RestTimer } from './components/RestTimer'
import { SearchView } from './components/SearchView'
import { SessionLog } from './components/SessionLog'
import { QuickExercise } from './components/QuickExercise'
import { useExerciseDB } from './hooks/useExerciseDB'
import { isSetEntry } from './lib/state'
import { useState, useMemo, useEffect } from 'react'
import './index.css'

function App() {
  const { state, actions } = useAppState()
  const [showSearch, setShowSearch] = useState(false)
  const { getExercise, fetchExercises } = useExerciseDB()

  const activeDay = state.plan.days.find(d => d.name === state.session?.activeDay)

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

          // If there's an active day, show ExerciseList (handles both planned and unplanned exercises)
          if (activeDay) {
            return (
              <div className="pt-4 pb-32">
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

          return <div className="pt-4 pb-32" />
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
