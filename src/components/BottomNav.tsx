interface BottomNavProps {
  activeTab: 'workout' | 'history'
  onTabChange: (tab: 'workout' | 'history') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)] safe-area-pb">
      <div className="flex">
        <button
          onClick={() => onTabChange('workout')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === 'workout' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.5 6.5h11" />
            <path d="M6.5 17.5h11" />
            <path d="M4 12h16" />
            <path d="M4 10v4" />
            <path d="M20 10v4" />
            <path d="M6.5 4.5v4" />
            <path d="M6.5 15.5v4" />
            <path d="M17.5 4.5v4" />
            <path d="M17.5 15.5v4" />
          </svg>
          <span className="text-xs">Workout</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === 'history' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-xs">History</span>
        </button>
      </div>
    </div>
  )
}
