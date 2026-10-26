import { useEffect, useRef, useState } from 'react'
import './CaveatModal.css'

type SaveResult = { ok: boolean; error?: string }

interface NoteModalProps {
  itemText: string
  initialNote: string
  onSave: (note: string) => void | Promise<void> | SaveResult | Promise<SaveResult>
  onRemove?: () => void | Promise<void> | SaveResult | Promise<SaveResult>
  onClose: () => void
}

const MAX_LENGTH = 500

export function NoteModal({
  itemText,
  initialNote,
  onSave,
  onRemove,
  onClose,
}: NoteModalProps) {
  const [value, setValue] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasNote = initialNote.trim().length > 0

  useEffect(() => {
    const field = textareaRef.current
    if (!field) return
    field.focus()
    const end = field.value.length
    field.setSelectionRange(end, end)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const result = await onSave(value)
    setSaving(false)
    if (result && typeof result === 'object' && result.ok === false) {
      setError(result.error ?? 'Could not save this note.')
      return
    }
    onClose()
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setSaving(true)
    setError(null)
    const result = await onRemove()
    setSaving(false)
    if (result && typeof result === 'object' && result.ok === false) {
      setError(result.error ?? 'Could not remove this note.')
      return
    }
    onClose()
  }

  return (
    <div className="caveat-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="caveat-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Note"
        onClick={e => e.stopPropagation()}
      >
        <div className="caveat-modal__header">
          <p className="caveat-modal__label">Note</p>
          <p className="caveat-modal__rule">{itemText}</p>
        </div>
        <textarea
          ref={textareaRef}
          className="caveat-modal__textarea"
          value={value}
          maxLength={MAX_LENGTH}
          placeholder="A reminder about this rule — why it matters, how you do it, what to watch for."
          onChange={e => setValue(e.target.value)}
        />
        <p className="caveat-modal__count">{MAX_LENGTH - value.length} characters left</p>
        <p className="caveat-modal__allowance">
          A note stays on this rule. It does not change the rule or spend a caveat.
        </p>
        {error && <p className="caveat-modal__error">{error}</p>}
        <div className="caveat-modal__actions">
          {hasNote && onRemove && (
            <button
              type="button"
              className="caveat-modal__btn caveat-modal__btn--remove"
              onClick={handleRemove}
              disabled={saving}
            >
              Remove note
            </button>
          )}
          <div className="caveat-modal__actions-right">
            <button
              type="button"
              className="caveat-modal__btn caveat-modal__btn--cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="caveat-modal__btn caveat-modal__btn--save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
