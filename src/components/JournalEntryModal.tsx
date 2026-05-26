import { useEffect } from 'react'
import './JournalEntryModal.css'

interface JournalEntryModalProps {
  date: string
  entry: string | null
  onClose: () => void
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function JournalEntryModal({ date, entry, onClose }: JournalEntryModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="journal-entry-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="journal-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Journal entry for ${date}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="journal-entry-modal__header">
          <p className="journal-entry-modal__label">Journal</p>
          <p className="journal-entry-modal__date">{formatDate(date)}</p>
        </div>

        {entry && entry.trim().length > 0 ? (
          <div className="journal-entry-modal__body">{entry}</div>
        ) : (
          <p className="journal-entry-modal__empty">No entry for this day.</p>
        )}

        <div className="journal-entry-modal__actions">
          <button
            type="button"
            className="journal-entry-modal__btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
