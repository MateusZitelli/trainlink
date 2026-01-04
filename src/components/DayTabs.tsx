import type { Day } from '../lib/state'
import { useState, useRef, useEffect } from 'react'

interface DayTabsProps {
  days: Day[]
  activeDay?: string
  onSelectDay: (name: string) => void
  onAddDay: (name: string) => void
  onRenameDay: (oldName: string, newName: string) => void
  onDeleteDay: (name: string) => void
  onMoveDay: (fromIndex: number, toIndex: number) => void
  showSearch: boolean
  onToggleSearch: () => void
}

export function DayTabs({
  days,
  activeDay,
  onSelectDay,
  onAddDay,
  onRenameDay,
  onDeleteDay,
  onMoveDay,
  showSearch,
  onToggleSearch,
}: DayTabsProps) {
  const [contextMenu, setContextMenu] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingDay && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingDay])

  const handleAddDay = () => {
    const name = prompt('Day name:')
    if (name?.trim()) {
      onAddDay(name.trim())
    }
  }

  const handleStartRename = (name: string) => {
    setEditingDay(name)
    setEditValue(name)
    setContextMenu(null)
  }

  const handleFinishRename = () => {
    if (editingDay && editValue.trim() && editValue !== editingDay) {
      onRenameDay(editingDay, editValue.trim())
    }
    setEditingDay(null)
    setEditValue('')
  }

  const handleDelete = (name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      onDeleteDay(name)
    }
    setContextMenu(null)
  }

  const handleTouchStart = (name: string) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenu(contextMenu === name ? null : name)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {days.map((day, index) => (
          <div key={day.name} className="relative">
            {editingDay === day.name ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename()
                  if (e.key === 'Escape') {
                    setEditingDay(null)
                    setEditValue('')
                  }
                }}
                className="px-3 py-2 text-sm font-medium bg-[var(--surface)] border border-[var(--border)] rounded w-24"
              />
            ) : (
              <button
                onClick={() => {
                  if (contextMenu) {
                    setContextMenu(null)
                  } else {
                    onSelectDay(day.name)
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu(contextMenu === day.name ? null : day.name)
                }}
                onTouchStart={() => handleTouchStart(day.name)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeDay === day.name && !showSearch
                    ? 'text-[var(--text)] border-b-2 border-[var(--text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {day.name}
              </button>
            )}

            {/* Context Menu */}
            {contextMenu === day.name && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[120px]">
                {index > 0 && (
                  <button
                    onClick={() => {
                      onMoveDay(index, index - 1)
                      setContextMenu(null)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg)]"
                  >
                    ← Move Left
                  </button>
                )}
                {index < days.length - 1 && (
                  <button
                    onClick={() => {
                      onMoveDay(index, index + 1)
                      setContextMenu(null)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg)]"
                  >
                    Move Right →
                  </button>
                )}
                <button
                  onClick={() => handleStartRename(day.name)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg)]"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(day.name)}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[var(--bg)]"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Day Button */}
        <button
          onClick={handleAddDay}
          className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          +
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Toggle */}
        <button
          onClick={onToggleSearch}
          className={`px-3 py-2 text-sm font-medium ${
            showSearch
              ? 'text-[var(--text)] border-b-2 border-[var(--text)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
