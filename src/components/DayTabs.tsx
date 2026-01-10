import type { Day } from '../lib/state'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { springs } from '../lib/animations'

interface DayTabsProps {
  days: Day[]
  activeDay?: string
  onSelectDay: (name: string) => void
  onOpenCreateModal: () => void
  onRenameDay: (oldName: string, newName: string) => void
  onDeleteDay: (name: string) => void
  onMoveDay: (fromIndex: number, toIndex: number) => void
  showSearch: boolean
  onToggleSearch: () => void
  onClearStorage: () => void
}

export function DayTabs({
  days,
  activeDay,
  onSelectDay,
  onOpenCreateModal,
  onRenameDay,
  onDeleteDay,
  onMoveDay,
  showSearch,
  onToggleSearch,
  onClearStorage,
}: DayTabsProps) {
  const { t } = useTranslation()
  const [contextMenu, setContextMenu] = useState<{ name: string; x: number; y: number } | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (editingDay && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingDay])

  const handleAddDay = () => {
    onOpenCreateModal()
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
    if (confirm(t('dayTabs.deleteConfirm', { name }))) {
      onDeleteDay(name)
    }
    setContextMenu(null)
  }

  const openContextMenu = (name: string) => {
    const button = buttonRefs.current.get(name)
    if (button) {
      const rect = button.getBoundingClientRect()
      setContextMenu({ name, x: rect.left, y: rect.bottom + 4 })
    }
  }

  const handleTouchStart = (name: string) => {
    longPressTimer.current = setTimeout(() => {
      openContextMenu(name)
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
        {days.map((day) => (
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
              <motion.button
                ref={(el) => {
                  if (el) buttonRefs.current.set(day.name, el)
                  else buttonRefs.current.delete(day.name)
                }}
                onClick={() => {
                  if (contextMenu) {
                    setContextMenu(null)
                  } else {
                    onSelectDay(day.name)
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenu(day.name)
                }}
                onTouchStart={() => handleTouchStart(day.name)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={`relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeDay === day.name
                    ? 'text-[var(--text)]'
                    : 'text-[var(--text-muted)]'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {day.name}
                {activeDay === day.name && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text)]"
                    transition={springs.snappy}
                  />
                )}
              </motion.button>
            )}
          </div>
        ))}

        {/* Add Day Button */}
        <motion.button
          onClick={handleAddDay}
          className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          whileTap={{ scale: 0.9 }}
        >
          +
        </motion.button>

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

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-3 py-2 text-sm font-medium ${
            showSettings
              ? 'text-[var(--text)]'
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute right-4 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[180px]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => {
                onClearStorage()
                setShowSettings(false)
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-[var(--bg)] flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {t('dayTabs.clearAllData')}
            </button>
          </div>
        </>
      )}

      {/* Context Menu - Fixed position */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {(() => {
              const index = days.findIndex(d => d.name === contextMenu.name)
              return (
                <>
                  {index > 0 && (
                    <button
                      onClick={() => {
                        onMoveDay(index, index - 1)
                        setContextMenu(null)
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg)]"
                    >
                      {t('dayTabs.moveLeft')}
                    </button>
                  )}
                  {index < days.length - 1 && (
                    <button
                      onClick={() => {
                        onMoveDay(index, index + 1)
                        setContextMenu(null)
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg)]"
                    >
                      {t('dayTabs.moveRight')}
                    </button>
                  )}
                  <button
                    onClick={() => handleStartRename(contextMenu.name)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg)]"
                  >
                    {t('dayTabs.rename')}
                  </button>
                  <button
                    onClick={() => handleDelete(contextMenu.name)}
                    className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-[var(--bg)]"
                  >
                    {t('dayTabs.delete')}
                  </button>
                </>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
