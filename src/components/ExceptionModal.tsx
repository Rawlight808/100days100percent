import { useEffect, useState } from 'react'
import { EXCEPTION_CATEGORIES } from '../hooks/useChallenge'
import './ExceptionModal.css'

type SaveResult = { ok: boolean; error?: string }

interface ExceptionModalProps {
  /** Which day the exception covers. */
  target: 'today' | 'yesterday'
  /** Exceptions remaining this run (including this one). */
  remaining: number
  max: number
  onConfirm: (category: string, note: string) => Promise<SaveResult>
  onClose: () => void
}

const NOTE_MAX_LENGTH = 280

export function ExceptionModal({
  target,
  remaining,
  max,
  onConfirm,
  onClose,
}: ExceptionModalProps) {
  const [category, setCategory] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmedNote = note.trim()
  const canConfirm = Boolean(category || trimmedNote)

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    setError(null)
    // A freeform note alone is enough; fall back to "Other" when no chip is picked.
    const result = await onConfirm(category ?? 'Other', note)
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not save this exception.')
      return
    }
    onClose()
  }

  return (
    <div className="exception-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="exception-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Use an exception"
        onClick={e => e.stopPropagation()}
      >
        <div className="exception-modal__header">
          <p className="exception-modal__label">Exception</p>
          <p className="exception-modal__title">
            {target === 'today'
              ? 'Freeze today — life is bigger than the list.'
              : 'Rescue yesterday — something outside your control happened.'}
          </p>
          <p className="exception-modal__explain">
            {target === 'today' ? "Today won't" : "Yesterday won't"} count toward
            your 100 days, but your streak survives. For circumstances truly
            outside your control.
          </p>
        </div>

        <p className="exception-modal__section-label">What happened? (pick one, or just write it)</p>
        <div className="exception-modal__categories">
          {EXCEPTION_CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              className={`exception-modal__chip${category === c ? ' exception-modal__chip--active' : ''}`}
              onClick={() => setCategory(prev => (prev === c ? null : c))}
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          className="exception-modal__textarea"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Briefly, what made the day impossible?"
          onChange={e => setNote(e.target.value)}
        />

        <p className="exception-modal__allowance">
          This will use 1 of your {remaining} remaining exception
          {remaining === 1 ? '' : 's'} ({max} per run). It cannot be undone.
        </p>

        {error && <p className="exception-modal__error">{error}</p>}

        <div className="exception-modal__actions">
          <button
            type="button"
            className="exception-modal__btn exception-modal__btn--cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="exception-modal__btn exception-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={saving || !canConfirm}
          >
            {saving ? 'Saving…' : 'Use Exception'}
          </button>
        </div>
      </div>
    </div>
  )
}
