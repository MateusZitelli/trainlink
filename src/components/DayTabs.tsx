import type { Day } from '../lib/state'
import { useState, useRef } from 'react'
import { useDragReorder } from '../hooks/useDragReorder'

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
  const { draggedIndex, dropTargetIndex, getDragProps, getTouchProps, handleTouchEnd } = useDragReorder(onMoveDay)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const handleItemTouchEnd = (e: React.TouchEvent) => {
    const items = Array.from(itemRefs.current.entries()).map(([index, element]) => ({
      index,
      element,
    }))
    handleTouchEnd(items, e)
  }

  const handleAddDay = () => {
    const name = prompt('Day name:')
    if (name?.trim()) {
      onAddDay(name.trim())
    }
  }

  const handleRename = (name: string) => {
    const newName = prompt('New name:', name)
    if (newName?.trim() && newName !== name) {
      onRenameDay(name, newName.trim())
    }
    setContextMenu(null)
  }

  const handleDelete = (name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      onDeleteDay(name)
    }
    setContextMenu(null)
  }

  const handleLongPress = (name: string) => {
    setContextMenu(contextMenu === name ? null : name)
  }

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {days.map((day, index) => {
          const isDragged = draggedIndex === index
          const isDropTarget = dropTargetIndex === index

          return (
            <div
              key={day.name}
              className={`relative ${isDragged ? 'opacity-50' : ''} ${isDropTarget ? 'border-l-2 border-[var(--text)]' : ''}`}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el)
                else itemRefs.current.delete(index)
              }}
              {...getDragProps(index)}
              {...getTouchProps(index)}
              onTouchEnd={handleItemTouchEnd}
            >
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
                  handleLongPress(day.name)
                }}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeDay === day.name && !showSearch
                    ? 'text-[var(--text)] border-b-2 border-[var(--text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {day.name}
              </button>

              {/* Context Menu */}
              {contextMenu === day.name && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10 min-w-[120px]">
                  {index > 0 && (
                    <button
                      onClick={() => {
                        onMoveDay(index, index - 1)
                        setContextMenu(null)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--border)]"
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
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--border)]"
                    >
                      Move Right →
                    </button>
                  )}
                  <button
                    onClick={() => handleRename(day.name)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--border)]"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(day.name)}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[var(--border)]"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}

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
          className="fixed inset-0 z-0"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
