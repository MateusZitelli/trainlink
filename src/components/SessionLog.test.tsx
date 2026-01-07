import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionLog } from './SessionLog'
import type { SetEntry, HistoryEntry } from '../lib/state'

describe('SessionLog', () => {
  const mockGetExercise = vi.fn((id: string) => ({
    exerciseId: id,
    name: id === 'bench' ? 'Bench Press' : 'Barbell Row',
    targetMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    category: 'strength',
    imageUrls: [],
    instructions: [],
    level: 'intermediate',
    force: 'push',
    mechanic: 'compound',
  }))

  const createSet = (exId: string, kg: number, reps: number, ts: number): SetEntry => ({
    type: 'set',
    exId,
    kg,
    reps,
    ts,
  })

  const defaultProps = {
    history: [] as HistoryEntry[],
    getExercise: mockGetExercise,
    onEndSession: vi.fn(),
    onResumeSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onRemoveSet: vi.fn(),
    onUpdateSet: vi.fn(),
    onMoveCycleInSession: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('selection and action bar', () => {
    const historyWithSets: HistoryEntry[] = [
      createSet('bench', 60, 10, 1000),
      createSet('bench', 65, 8, 2000),
    ]

    it('shows set values by default', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      expect(screen.getByText(/Bench Press/i)).toBeInTheDocument()
      expect(screen.getByText('60×10')).toBeInTheDocument()
    })

    it('shows action bar when a set is selected', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Click to select the set
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)

      // Action bar should appear with Edit and Delete buttons
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('calls onRemoveSet when delete is clicked from action bar', () => {
      const onRemoveSet = vi.fn()
      render(
        <SessionLog
          {...defaultProps}
          history={historyWithSets}
          onRemoveSet={onRemoveSet}
        />
      )

      // Select the set
      fireEvent.click(screen.getByText('60×10'))

      // Click delete in action bar
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      expect(onRemoveSet).toHaveBeenCalledWith(historyWithSets[0])
    })

    it('hides action bar when cancel is clicked', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Select the set
      fireEvent.click(screen.getByText('60×10'))

      // Action bar should be visible
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()

      // Click cancel (X button)
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      // Action bar should be hidden
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    const historyWithSets: HistoryEntry[] = [
      createSet('bench', 60, 10, 1000),
      createSet('bench', 65, 8, 2000),
    ]

    it('enters edit mode on double-tap (tap selected set)', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // First tap - select the set
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)

      // Second tap - enter edit mode
      fireEvent.click(setButton)

      // Edit inputs should appear
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })

    it('enters edit mode when Edit button in action bar is clicked', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Select the set
      fireEvent.click(screen.getByText('60×10'))

      // Click Edit in action bar
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      // Edit inputs should appear
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })

    it('shows save and cancel buttons in edit mode', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Select and enter edit mode
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('calls onUpdateSet with new values when save is clicked', () => {
      const onUpdateSet = vi.fn()
      render(
        <SessionLog
          {...defaultProps}
          history={historyWithSets}
          onUpdateSet={onUpdateSet}
        />
      )

      // Select and enter edit mode
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      // Change values
      const kgInput = screen.getByDisplayValue('60')
      const repsInput = screen.getByDisplayValue('10')

      fireEvent.change(kgInput, { target: { value: '70' } })
      fireEvent.change(repsInput, { target: { value: '12' } })

      // Save
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      expect(onUpdateSet).toHaveBeenCalledWith(1000, { kg: 70, reps: 12 })
    })

    it('exits edit mode when cancel is clicked', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Select and enter edit mode
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      // Verify edit mode is active
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()

      // Cancel
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      // Should be back to display mode
      expect(screen.queryByDisplayValue('60')).not.toBeInTheDocument()
      expect(screen.getByText('60×10')).toBeInTheDocument()
    })

    it('allows editing rest time', () => {
      const historyWithRest: HistoryEntry[] = [
        { ...createSet('bench', 60, 10, 1000), rest: 90 },
        createSet('bench', 65, 8, 2000),
      ]

      const onUpdateSet = vi.fn()
      render(
        <SessionLog
          {...defaultProps}
          history={historyWithRest}
          onUpdateSet={onUpdateSet}
        />
      )

      // Select and enter edit mode on first set
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      // Rest input should show 90
      const restInput = screen.getByDisplayValue('90')
      expect(restInput).toBeInTheDocument()

      // Change rest time
      fireEvent.change(restInput, { target: { value: '120' } })

      // Save
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      expect(onUpdateSet).toHaveBeenCalledWith(1000, { kg: 60, reps: 10, rest: 120 })
    })

    it('shows difficulty selector in edit mode', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // Select and enter edit mode
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /normal/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument()
    })

    it('calls onUpdateSet with difficulty when difficulty button is clicked', () => {
      const onUpdateSet = vi.fn()
      render(
        <SessionLog
          {...defaultProps}
          history={historyWithSets}
          onUpdateSet={onUpdateSet}
        />
      )

      // Select and enter edit mode
      const setButton = screen.getByText('60×10')
      fireEvent.click(setButton)
      fireEvent.click(setButton)

      // Click hard difficulty
      fireEvent.click(screen.getByRole('button', { name: /hard/i }))

      expect(onUpdateSet).toHaveBeenCalledWith(1000, { kg: 60, reps: 10, difficulty: 'hard' })
    })
  })

  describe('drag handle visibility', () => {
    const historyWithSets: HistoryEntry[] = [
      createSet('bench', 60, 10, 1000),
      createSet('bench', 65, 8, 2000),
    ]

    it('shows drag handle on cycle groups', () => {
      render(<SessionLog {...defaultProps} history={historyWithSets} />)

      // The drag handle indicator should be visible
      expect(screen.getByText('⋮⋮')).toBeInTheDocument()
    })
  })
})
