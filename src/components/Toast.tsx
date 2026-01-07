interface ToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function Toast({ message, onUndo, onDismiss }: ToastProps) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
      role="alert"
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
        <span className="text-sm">{message}</span>
        <button
          onClick={onUndo}
          className="text-sm font-medium text-blue-500 hover:text-blue-400"
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
