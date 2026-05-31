import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useChallenge, MIN_TOP, MAX_TOP, type Item } from '../hooks/useChallenge'
import { AppNav } from '../components/AppNav'
import { CaveatModal } from '../components/CaveatModal'
import './SelectPage.css'

interface SortableRowProps {
  item: Item
  index: number
  selected: boolean
  isEditing: boolean
  editText: string
  setEditText: (v: string) => void
  commitEdit: () => void
  cancelEdit: () => void
  editRef: React.RefObject<HTMLInputElement | null>
  onToggle: (id: string) => void
  onStartEdit: (item: Item) => void
  onOpenCaveat: (id: string) => void
}

function SortableRow({
  item,
  index,
  selected,
  isEditing,
  editText,
  setEditText,
  commitEdit,
  cancelEdit,
  editRef,
  onToggle,
  onStartEdit,
  onOpenCaveat,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select__item${selected ? ' select__item--selected' : ''}${isDragging ? ' select__item--dragging' : ''}`}
    >
      <span
        className="select__item-handle"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
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

      <span className="select__item-num">{index + 1}</span>

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
          onClick={() => onToggle(item.id)}
        >
          {item.text}
        </span>
      )}

      {!isEditing && (
        <>
          <button
            className={`select__item-caveat${item.caveat ? ' select__item-caveat--set' : ''}`}
            title={item.caveat ? 'Caveat: ' + item.caveat : 'Add a caveat'}
            onClick={e => {
              e.stopPropagation()
              onOpenCaveat(item.id)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.5 3.5h11v7H8.5L5.5 13v-2.5h-3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill={item.caveat ? 'currentColor' : 'none'}
                fillOpacity={item.caveat ? 0.2 : 0}
              />
            </svg>
          </button>
          <button
            className="select__item-edit"
            title="Edit item"
            onClick={e => {
              e.stopPropagation()
              onStartEdit(item)
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
        </>
      )}

      <div
        className="select__item-check"
        onClick={() => onToggle(item.id)}
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
}

export function SelectPage() {
  const {
    items,
    phase,
    loading,
    saveTopTwelve,
    updateItemText,
    updateItemCaveat,
    reorderItems,
  } = useChallenge()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [caveatItemId, setCaveatItemId] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

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
  if (phase === 'failed') return <Navigate to="/failed" replace />
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    reorderItems(arrayMove(items, oldIndex, newIndex))
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
      <AppNav
        onStartOver={() => navigate('/setup')}
        startOverLabel="Edit my 100 list"
        startOverDesc="Re-edit the full 100-item list. You'll come back here to re-pick your daily habits."
      />
      <div className="select__header">
        <h1 className="select__title">Choose your daily habits</h1>
        <p className="select__subtitle">
          Pick between {MIN_TOP} and {MAX_TOP} items from your list — your daily
          commitment for 100 days. Drag the dots to reorder (hold then drag on
          phone), tap the pencil to edit, or add a caveat to a rule.
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="select__list">
            {items.map((item, i) => (
              <SortableRow
                key={item.id}
                item={item}
                index={i}
                selected={selectedIds.has(item.id)}
                isEditing={editingId === item.id}
                editText={editText}
                setEditText={setEditText}
                commitEdit={commitEdit}
                cancelEdit={cancelEdit}
                editRef={editRef}
                onToggle={toggle}
                onStartEdit={startEdit}
                onOpenCaveat={setCaveatItemId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

      {caveatItemId && (() => {
        const target = items.find(i => i.id === caveatItemId)
        if (!target) return null
        return (
          <CaveatModal
            itemText={target.text}
            initialCaveat={target.caveat ?? ''}
            onSave={caveat => updateItemCaveat(target.id, caveat)}
            onRemove={() => updateItemCaveat(target.id, null)}
            onClose={() => setCaveatItemId(null)}
          />
        )
      })()}
    </div>
  )
}
