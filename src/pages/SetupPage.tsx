import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  useChallenge,
  REQUIRED_ITEMS,
  type Item,
} from '../hooks/useChallenge'
import {
  GOAL_AREAS,
  GOAL_AREA_IDS,
  type GoalArea,
  type GoalAreaId,
  type ItemKind,
} from '../data/goalAreas'
import './SetupPage.css'

type Mode = 'walk' | 'review'

function areaKey(area: string | null | undefined): string {
  if (area && GOAL_AREA_IDS.includes(area as GoalAreaId)) return area
  return 'other'
}

export function SetupPage() {
  const {
    items,
    goals,
    phase,
    loading,
    upsertGoal,
    addSetupItem,
    removeSetupItem,
    confirmSetupList,
  } = useChallenge()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(() =>
    items.length >= REQUIRED_ITEMS ? 'review' : 'walk',
  )
  const [areaIndex, setAreaIndex] = useState(0)
  const [destinationDraft, setDestinationDraft] = useState('')
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const area: GoalArea = GOAL_AREAS[areaIndex] ?? GOAL_AREAS[GOAL_AREAS.length - 1]

  // When entering an area (or after load), hydrate destination from saved goals.
  useEffect(() => {
    if (loading || mode !== 'walk') return
    const saved = goals.find(g => g.area === area.id)
    setDestinationDraft(saved?.destination ?? '')
    setQuestionDrafts({})
    setError(null)
    // Do not depend on `goals` — autosave would wipe question drafts mid-type.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [area.id, mode, loading])

  const itemsByArea = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const id of GOAL_AREA_IDS) map.set(id, [])
    for (const item of items) {
      const key = areaKey(item.area)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [items])

  const areaItems = itemsByArea.get(area.id) ?? []
  const itemCount = items.length
  const atCap = itemCount >= REQUIRED_ITEMS
  const canContinue = itemCount >= REQUIRED_ITEMS

  const persistDestination = useCallback(
    async (value: string) => {
      await upsertGoal(area.id, value)
    },
    [area.id, upsertGoal],
  )

  const onDestinationChange = (value: string) => {
    setDestinationDraft(value)
    if (destSaveTimer.current) clearTimeout(destSaveTimer.current)
    destSaveTimer.current = setTimeout(() => {
      void persistDestination(value)
    }, 500)
  }

  const onDestinationBlur = () => {
    if (destSaveTimer.current) clearTimeout(destSaveTimer.current)
    void persistDestination(destinationDraft)
  }

  const handleAdd = async (
    text: string,
    kind: ItemKind,
    questionId?: string,
  ) => {
    setError(null)
    const trimmed = text.trim()
    if (!trimmed) return
    if (atCap) {
      setError(`You already have ${REQUIRED_ITEMS} items. Remove some to add more.`)
      return
    }
    setBusy(true)
    const result = await addSetupItem({ text: trimmed, area: area.id, kind })
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not add this item.')
      return
    }
    if (questionId) {
      setQuestionDrafts(prev => ({ ...prev, [questionId]: '' }))
    }
  }

  const handleRemove = async (id: string) => {
    setError(null)
    setBusy(true)
    const result = await removeSetupItem(id)
    setBusy(false)
    if (!result.ok) setError(result.error ?? 'Could not remove this item.')
  }

  const goNextArea = async () => {
    if (destSaveTimer.current) clearTimeout(destSaveTimer.current)
    await persistDestination(destinationDraft)
    if (areaIndex >= GOAL_AREAS.length - 1) {
      setMode('review')
      return
    }
    setAreaIndex(i => i + 1)
  }

  const goPrevArea = async () => {
    if (destSaveTimer.current) clearTimeout(destSaveTimer.current)
    await persistDestination(destinationDraft)
    if (areaIndex <= 0) return
    setAreaIndex(i => i - 1)
  }

  const jumpToArea = (index: number) => {
    setAreaIndex(index)
    setMode('walk')
  }

  const handleConfirm = async () => {
    setError(null)
    setBusy(true)
    const result = await confirmSetupList()
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not continue.')
      return
    }
    navigate('/select')
  }

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'ready') return <Navigate to="/dashboard" replace />

  const pct = Math.min(100, (itemCount / REQUIRED_ITEMS) * 100)

  if (mode === 'review') {
    return (
      <div className="setup">
        <div className="setup__header">
          <h1 className="setup__title">Your 100 list</h1>
          <p className="setup__subtitle">
            Review everything you wrote, grouped by life area. You need exactly{' '}
            {REQUIRED_ITEMS} items before you choose your daily habits.
          </p>
        </div>

        <div className="setup__counter">
          {itemCount}
          <span className="setup__counter-dim"> / {REQUIRED_ITEMS}</span>
          <span className="setup__counter-label">items</span>
        </div>
        <div className="setup__progress">
          <div className="setup__progress-bar" style={{ width: `${pct}%` }} />
        </div>

        {GOAL_AREAS.map((a, i) => {
          const list = itemsByArea.get(a.id) ?? []
          const dest = goals.find(g => g.area === a.id)?.destination
          return (
            <section key={a.id} className="setup__review-area">
              <div className="setup__review-area-head">
                <h2 className="setup__review-area-title">{a.title}</h2>
                <button
                  type="button"
                  className="setup__link-btn"
                  onClick={() => jumpToArea(i)}
                >
                  Edit
                </button>
              </div>
              {dest && (
                <p className="setup__review-dest">
                  <span className="setup__review-dest-label">In 100 days: </span>
                  {dest}
                </p>
              )}
              {list.length === 0 ? (
                <p className="setup__review-empty">No items yet.</p>
              ) : (
                <ul className="setup__review-list">
                  {list.map(item => (
                    <li key={item.id} className="setup__review-item">
                      <span
                        className={
                          item.kind === 'stop'
                            ? 'setup__kind setup__kind--stop'
                            : 'setup__kind setup__kind--do'
                        }
                      >
                        {item.kind === 'stop' ? 'Stop' : 'Do'}
                      </span>
                      <span className="setup__review-text">{item.text}</span>
                      <button
                        type="button"
                        className="setup__item-remove"
                        onClick={() => void handleRemove(item.id)}
                        disabled={busy}
                        aria-label={`Remove ${item.text}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}

        {error && <p className="setup__error">{error}</p>}

        {!canContinue && (
          <p className="setup__hint setup__hint--warm">
            {REQUIRED_ITEMS - itemCount} more to go. Jump into any area above —
            Other is a good catch-all when you are short.
          </p>
        )}

        <div className="setup__actions setup__actions--row">
          <button
            type="button"
            className="setup__btn setup__btn--ghost"
            onClick={() => jumpToArea(0)}
            disabled={busy}
          >
            Back to areas
          </button>
          <button
            type="button"
            className="setup__btn"
            disabled={!canContinue || busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? 'Saving…' : 'Continue to choose habits'}
          </button>
        </div>
      </div>
    )
  }

  // Walkthrough
  return (
    <div className="setup">
      <div className="setup__sticky">
        <div className="setup__sticky-row">
          <span className="setup__sticky-area">
            Area {areaIndex + 1} of {GOAL_AREAS.length}
          </span>
          <span className="setup__sticky-count">
            {itemCount} / {REQUIRED_ITEMS} items
          </span>
        </div>
        <div className="setup__progress setup__progress--sticky">
          <div className="setup__progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="setup__header">
        <h1 className="setup__title">{area.title}</h1>
        <p className="setup__subtitle">
          First say where you want to be in 100 days. Then answer the questions —
          things to do, and things to stop. Skip any question you do not need.
        </p>
      </div>

      <label className="setup__field">
        <span className="setup__field-label">{area.destinationPrompt}</span>
        <textarea
          className="setup__dest"
          value={destinationDraft}
          onChange={e => onDestinationChange(e.target.value)}
          onBlur={onDestinationBlur}
          rows={3}
          placeholder="Be specific…"
          maxLength={500}
        />
      </label>

      <div className="setup__questions">
        {area.questions.map(q => (
          <div key={q.id} className="setup__question">
            <p className="setup__question-prompt">
              <span
                className={
                  q.kind === 'stop'
                    ? 'setup__kind setup__kind--stop'
                    : 'setup__kind setup__kind--do'
                }
              >
                {q.kind === 'stop' ? 'Stop' : 'Do'}
              </span>
              {q.prompt}
            </p>
            {q.examples && q.examples.length > 0 && (
              <div className="setup__chips">
                {q.examples.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    className="setup__chip"
                    disabled={busy || atCap}
                    onClick={() => void handleAdd(ex, q.kind)}
                  >
                    + {ex}
                  </button>
                ))}
              </div>
            )}
            <div className="setup__add-row">
              <input
                className="setup__add-input"
                value={questionDrafts[q.id] ?? ''}
                onChange={e =>
                  setQuestionDrafts(prev => ({ ...prev, [q.id]: e.target.value }))
                }
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAdd(questionDrafts[q.id] ?? '', q.kind, q.id)
                  }
                }}
                placeholder="Add one item, press Enter"
                maxLength={200}
                disabled={busy || atCap}
              />
              <button
                type="button"
                className="setup__add-btn"
                disabled={busy || atCap || !(questionDrafts[q.id] ?? '').trim()}
                onClick={() =>
                  void handleAdd(questionDrafts[q.id] ?? '', q.kind, q.id)
                }
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {areaItems.length > 0 && (
        <div className="setup__area-items">
          <p className="setup__area-items-title">
            In this area ({areaItems.length})
          </p>
          <ul className="setup__review-list">
            {areaItems.map(item => (
              <li key={item.id} className="setup__review-item">
                <span
                  className={
                    item.kind === 'stop'
                      ? 'setup__kind setup__kind--stop'
                      : 'setup__kind setup__kind--do'
                  }
                >
                  {item.kind === 'stop' ? 'Stop' : 'Do'}
                </span>
                <span className="setup__review-text">{item.text}</span>
                <button
                  type="button"
                  className="setup__item-remove"
                  onClick={() => void handleRemove(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.text}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="setup__error">{error}</p>}

      <div className="setup__actions setup__actions--row">
        <button
          type="button"
          className="setup__btn setup__btn--ghost"
          onClick={() => void goPrevArea()}
          disabled={busy || areaIndex === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="setup__btn setup__btn--ghost"
          onClick={() => {
            void persistDestination(destinationDraft)
            setMode('review')
          }}
          disabled={busy}
        >
          Your list so far
        </button>
        <button
          type="button"
          className="setup__btn"
          onClick={() => void goNextArea()}
          disabled={busy}
        >
          {areaIndex >= GOAL_AREAS.length - 1 ? 'Review list' : 'Continue'}
        </button>
      </div>

      <p className="setup__draft-note">
        Progress saves as you go. Areas you skip questions on are fine — keep
        going until you hit {REQUIRED_ITEMS}.
      </p>
    </div>
  )
}
