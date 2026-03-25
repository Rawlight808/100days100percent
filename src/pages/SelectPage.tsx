import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useChallenge, MIN_TOP, MAX_TOP } from '../hooks/useChallenge'
import './SelectPage.css'

export function SelectPage() {
  const { items, phase, loading, saveTopTwelve } = useChallenge()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const existing = items.filter(i => i.is_top_twelve).map(i => i.id)
    if (existing.length > 0) setSelectedIds(new Set(existing))
  }, [items])

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'ready') return <Navigate to="/dashboard" replace />

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_TOP) {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (selectedIds.size < MIN_TOP || selectedIds.size > MAX_TOP) return
    setSaving(true)
    await saveTopTwelve(Array.from(selectedIds))
    setSaving(false)
    navigate('/dashboard')
  }

  return (
    <div className="select">
      <div className="select__header">
        <h1 className="select__title">Choose your daily habits</h1>
        <p className="select__subtitle">
          Pick between {MIN_TOP} and {MAX_TOP} items from your list — your daily
          commitment for 100 days. Choose the ones that matter most.
        </p>
      </div>

      <div className="select__counter">
        {selectedIds.size}
        <span className="select__counter-dim">
          {' '}
          ({MIN_TOP}–{MAX_TOP})
        </span>
      </div>

      {selectedIds.size < MIN_TOP && (
        <p className="select__range-hint">
          Pick at least {MIN_TOP - selectedIds.size} more
          {MIN_TOP - selectedIds.size === 1 ? ' habit' : ' habits'} to continue.
        </p>
      )}
      {selectedIds.size > MAX_TOP && (
        <p className="select__range-hint select__range-hint--warn">
          Deselect down to {MAX_TOP} or fewer.
        </p>
      )}

      <div className="select__grid">
        {items.map((item, i) => {
          const selected = selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              className={`select__item ${selected ? 'select__item--selected' : ''}`}
              onClick={() => toggle(item.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') toggle(item.id)
              }}
              role="button"
              tabIndex={0}
            >
              <span className="select__item-num">{i + 1}</span>
              <span className="select__item-text">{item.text}</span>
              <div className="select__item-check">
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8.5l3.5 3.5L13 5"
                      stroke="#000"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="select__actions">
        <button
          className="select__btn"
          disabled={
            selectedIds.size < MIN_TOP || selectedIds.size > MAX_TOP || saving
          }
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Lock In & Start'}
        </button>
        <button
          type="button"
          className="select__btn select__btn--secondary"
          onClick={() => navigate('/setup')}
        >
          Edit my 100 list
        </button>
        <p className="select__edit-note">
          If you change your list, you&apos;ll pick your daily habits again from the
          updated items.
        </p>
      </div>
    </div>
  )
}
