import { useEffect, useRef, useState } from 'react'
import './CaveatModal.css'

interface CaveatModalProps {
  itemText: string
  initialCaveat: string
  onSave: (caveat: string) => void | Promise<void>
  onRemove?: () => void | Promise<void>
  onClose: () => void
}

const MAX_LENGTH = 280

export function CaveatModal({
  itemText,
  initialCaveat,
  onSave,
  onRemove,
  onClose,
}: CaveatModalProps) {
  const [value, setValue] = useState(initialCaveat)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    await onSave(value)
    setSaving(false)
    onClose()
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setSaving(true)
    await onRemove()
    setSaving(false)
    onClose()
  }

  const remaining = MAX_LENGTH - value.length

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
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              void handleSave()
            }
          }}
        />
        <p className="caveat-modal__count">{remaining} characters left</p>

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
