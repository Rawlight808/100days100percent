import { useEffect, useRef, useState } from 'react'
import './CaveatModal.css'

type SaveResult = { ok: boolean; error?: string }

interface CaveatModalProps {
  itemText: string
  initialCaveat: string
  onSave: (caveat: string) => void | Promise<void> | SaveResult | Promise<SaveResult>
  onRemove?: () => void | Promise<void> | SaveResult | Promise<SaveResult>
  onClose: () => void
  /** How many banked caveats remain. */
  remaining?: number
  /** Total caveats earned so far this run (for messaging). */
  max?: number
}

const MAX_LENGTH = 280

export function CaveatModal({
  itemText,
  initialCaveat,
  onSave,
  onRemove,
  onClose,
  remaining,
  max,
}: CaveatModalProps) {
  const [value, setValue] = useState(initialCaveat)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isNew = initialCaveat.trim().length === 0
  const outOfAllowance = isNew && remaining != null && remaining <= 0

  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.setSelectionRange(value.length, value.length)
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
      setError(result.error ?? 'Could not save this caveat.')
      return
    }
    onClose()
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setSaving(true)
    await onRemove()
    setSaving(false)
    onClose()
  }

  return (
    <div className="caveat-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="caveat-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add a caveat"
        onClick={e => e.stopPropagation()}
      >
        <div className="caveat-modal__header">
          <p className="caveat-modal__label">Caveat</p>
          <p className="caveat-modal__rule">{itemText}</p>
        </div>

        <textarea
          ref={textareaRef}
          className="caveat-modal__textarea"
          value={value}
          maxLength={MAX_LENGTH}
          placeholder="e.g. Except on family birthdays — one slice of cake only."
          onChange={e => setValue(e.target.value)}
          disabled={outOfAllowance}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              void handleSave()
            }
          }}
        />
        <p className="caveat-modal__count">{MAX_LENGTH - value.length} characters left</p>

        {isNew && remaining != null && (
          <p className="caveat-modal__allowance">
            {outOfAllowance
              ? 'No caveats banked. You earn one each Sunday — unused ones carry over.'
              : `${remaining} caveat${remaining === 1 ? '' : 's'} banked${max != null ? ` (${max} earned)` : ''}. You earn one each Sunday; unused ones carry over. An attached caveat still expires at the end of the week.`}
          </p>
        )}

        {error && <p className="caveat-modal__error">{error}</p>}

        <div className="caveat-modal__actions">
          {onRemove && initialCaveat.trim().length > 0 && (
            <button
              type="button"
              className="caveat-modal__btn caveat-modal__btn--remove"
              onClick={handleRemove}
              disabled={saving}
            >
              Remove
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
              disabled={saving || outOfAllowance}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
