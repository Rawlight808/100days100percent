import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useChallenge, MIN_TOP, MAX_TOP, type Item } from '../hooks/useChallenge'
import './SelectPage.css'

export function SelectPage() {
  const { items, phase, loading, saveTopTwelve, updateItemText, reorderItems } =
    useChallenge()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  useEffect(() => {
    const existing = items.filter(i => i.is_top_twelve).map(i => i.id)
    if (existing.length > 0) setSelectedIds(new Set(existing))
  }, [items])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'ready') return <Navigate to="/dashboard" replace />

  const toggle = (id: string) => {
    if (editingId) return
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

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const commitEdit = async () => {
    if (!editingId) return
    const trimmed = editText.trim()
    if (trimmed && trimmed !== items.find(i => i.id === editingId)?.text) {
      await updateItemText(editingId, trimmed)
    }
    setEditingId(null)
    setEditText('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleDragStart = (idx: number) => {
    dragItem.current = idx
    setDragIdx(idx)
  }

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDragIdx(null)
      return
    }
    if (dragItem.current === dragOverItem.current) {
      setDragIdx(null)
      return
    }

    const reordered = [...items]
    const [moved] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, moved)

    dragItem.current = null
    dragOverItem.current = null
    setDragIdx(null)

    reorderItems(reordered)
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
          commitment for 100 days. Drag to reorder, tap the pencil to edit.
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

      <div className="select__list">
        {items.map((item, i) => {
          const selected = selectedIds.has(item.id)
          const isEditing = editingId === item.id
          const isDragging = dragIdx === i

          return (
            <div
              key={item.id}
              className={`select__item${selected ? ' select__item--selected' : ''}${isDragging ? ' select__item--dragging' : ''}`}
              draggable={!isEditing}
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
            >
              <span
                className="select__item-handle"
                title="Drag to reorder"
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                  <circle cx="2" cy="2" r="1.5" />
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="2" cy="8" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="2" cy="14" r="1.5" />
                  <circle cx="8" cy="14" r="1.5" />
                </svg>
              </span>

              <span className="select__item-num">{i + 1}</span>

              {isEditing ? (
                <input
                  ref={editRef}
                  className="select__item-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                />
              ) : (
                <span
                  className="select__item-text"
                  onClick={() => toggle(item.id)}
                >
                  {item.text}
                </span>
              )}

              {!isEditing && (
                <button
                  className="select__item-edit"
                  title="Edit item"
                  onClick={e => {
                    e.stopPropagation()
                    startEdit(item)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              <div
                className="select__item-check"
                onClick={() => toggle(item.id)}
              >
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
