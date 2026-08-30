import { useEffect, useState } from 'react'
import './HyperDriveModal.css'

type SaveResult = { ok: boolean; error?: string }

interface HyperDriveModalProps {
  remaining: number
  max: number
  onConfirm: (note: string) => Promise<SaveResult>
  onClose: () => void
}

const NOTE_MAX_LENGTH = 280

export function HyperDriveModal({
  remaining,
  max,
  onConfirm,
  onClose,
}: HyperDriveModalProps) {
  const [aligned, setAligned] = useState<boolean | null>(null)
  const [wouldDeter, setWouldDeter] = useState<boolean | null>(null)
  const [keptRules, setKeptRules] = useState<boolean | null>(null)
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
  const canConfirm =
    aligned === true &&
    wouldDeter === true &&
    keptRules === true &&
    trimmedNote.length > 0

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    setError(null)
    const result = await onConfirm(note)
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not start Hyper Drive.')
      return
    }
    onClose()
  }

  return (
    <div className="hyperdrive-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="hyperdrive-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Hyper Drive"
        onClick={e => e.stopPropagation()}
      >
        <div className="hyperdrive-modal__header">
          <p className="hyperdrive-modal__label">Hyper Drive</p>
          <p className="hyperdrive-modal__title">Stay in the work.</p>
          <p className="hyperdrive-modal__explain">
            If you spent the day locked on something that actually moves your
            goals, don&apos;t break that to check boxes. This day counts toward
            your 100.
          </p>
        </div>

        <YesNo
          question="Did you spend the vast majority of today working on something in alignment with your goals?"
          value={aligned}
          onChange={setAligned}
        />
        <YesNo
          question="If you had tried to finish every task on your list, would it have deterred you from completing your objectives today?"
          value={wouldDeter}
          onChange={setWouldDeter}
        />
        <YesNo
          question="Did you keep every rule that excludes certain activities?"
          value={keptRules}
          onChange={setKeptRules}
        />

        <p className="hyperdrive-modal__section-label">What were you locked into?</p>
        <textarea
          className="hyperdrive-modal__textarea"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Learning a skill, preparing for an event, building something…"
          onChange={e => setNote(e.target.value)}
        />

        <p className="hyperdrive-modal__allowance">
          This will use 1 of your {remaining} Hyper Drive
          {remaining === 1 ? '' : 's'} this week ({max} per week, resets Sunday).
        </p>

        {error && <p className="hyperdrive-modal__error">{error}</p>}

        <div className="hyperdrive-modal__actions">
          <button
            type="button"
            className="hyperdrive-modal__btn hyperdrive-modal__btn--cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="hyperdrive-modal__btn hyperdrive-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={saving || !canConfirm}
          >
            {saving ? 'Saving…' : 'Complete the day'}
          </button>
        </div>
      </div>
    </div>
  )
}

function YesNo({
  question,
  value,
  onChange,
}: {
  question: string
  value: boolean | null
  onChange: (next: boolean) => void
}) {
  return (
    <div className="hyperdrive-modal__q">
      <p className="hyperdrive-modal__q-text">{question}</p>
      <div className="hyperdrive-modal__yesno">
        <button
          type="button"
          className={`hyperdrive-modal__chip${value === true ? ' hyperdrive-modal__chip--yes' : ''}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`hyperdrive-modal__chip${value === false ? ' hyperdrive-modal__chip--no' : ''}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  )
}
