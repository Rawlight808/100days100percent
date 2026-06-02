import { useEffect, useRef, useState } from 'react'
import './CaveatModal.css'

interface EditItemModalProps {
  initialText: string
  onSave: (text: string) => void | Promise<void>
  onClose: () => void
}

const MAX_LENGTH = 200

export function EditItemModal({ initialText, onSave, onClose }: EditItemModalProps) {
  const [value, setValue] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.setSelectionRange(value.length, value.length)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave(trimmed)
    setSaving(false)
    onClose()
  }

  return (
    <div className="caveat-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="caveat-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        onClick={e => e.stopPropagation()}
      >
        <div className="caveat-modal__header">
          <p className="caveat-modal__label">Edit item</p>
        </div>

        <input
          ref={inputRef}
          className="caveat-modal__input"
          value={value}
          maxLength={MAX_LENGTH}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSave()
            }
          }}
        />

        <div className="caveat-modal__actions">
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
              disabled={saving || !value.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
