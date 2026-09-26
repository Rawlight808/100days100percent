import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  useChallenge,
  REQUIRED_ITEMS,
  MAX_ITEMS,
  type Goal,
  type Item,
} from '../hooks/useChallenge'
import {
  GOAL_AREAS,
  GOAL_AREA_IDS,
  HUNDRED_DAYS_PROMPT,
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

function sortGoals(a: Goal, b: Goal) {
  return (a.position ?? 0) - (b.position ?? 0)
}

export function SetupPage() {
  const {
    items,
    goals,
    phase,
    loading,
    addGoal,
    updateGoal,
    removeGoal,
    addSetupItem,
    removeSetupItem,
    confirmSetupList,
  } = useChallenge()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(() =>
    items.length >= REQUIRED_ITEMS ? 'review' : 'walk',
  )
  const [areaIndex, setAreaIndex] = useState(0)
  const [yearDrafts, setYearDrafts] = useState<Record<string, string>>({})
  const [hundredDrafts, setHundredDrafts] = useState<Record<string, string>>({})
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ensuringArea = useRef<string | null>(null)
  const destSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const area: GoalArea = GOAL_AREAS[areaIndex] ?? GOAL_AREAS[GOAL_AREAS.length - 1]

  const areaGoals = useMemo(
    () => goals.filter(g => g.area === area.id).sort(sortGoals),
    [goals, area.id],
  )

  // One empty goal so the first field is always there.
  useEffect(() => {
    if (loading || mode !== 'walk') return
    if (areaGoals.length > 0) return
    if (ensuringArea.current === area.id) return
    ensuringArea.current = area.id
    void addGoal(area.id).finally(() => {
      if (ensuringArea.current === area.id) ensuringArea.current = null
    })
  }, [loading, mode, area.id, areaGoals.length, addGoal])

  useEffect(() => {
    if (mode !== 'walk') return
    setYearDrafts(prev => {
      const next = { ...prev }
      for (const g of areaGoals) {
        if (next[g.id] === undefined) next[g.id] = g.destination ?? ''
      }
      return next
    })
  }, [mode, areaGoals])

  useEffect(() => {
    if (mode !== 'walk') return
    setQuestionDrafts({})
    setHundredDrafts({})
    setError(null)
  }, [area.id, mode])

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

  const itemsByGoal = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) {
      if (!item.goal_id) continue
      const list = map.get(item.goal_id) ?? []
      list.push(item)
      map.set(item.goal_id, list)
    }
    return map
  }, [items])

  const itemCount = items.length
  const atCap = itemCount >= MAX_ITEMS
  const canContinue = itemCount >= REQUIRED_ITEMS

  const persistYear = useCallback(
    async (goalId: string, value: string) => {
      await updateGoal(goalId, value)
    },
    [updateGoal],
  )

  const onYearChange = (goalId: string, value: string) => {
    setYearDrafts(prev => ({ ...prev, [goalId]: value }))
    if (destSaveTimers.current[goalId]) clearTimeout(destSaveTimers.current[goalId])
    destSaveTimers.current[goalId] = setTimeout(() => {
      void persistYear(goalId, value)
    }, 500)
  }

  const flushYears = async () => {
    for (const [id, timer] of Object.entries(destSaveTimers.current)) {
      clearTimeout(timer)
      delete destSaveTimers.current[id]
    }
    await Promise.all(
      areaGoals.map(g => persistYear(g.id, yearDrafts[g.id] ?? g.destination ?? '')),
    )
  }

  const handleAdd = async (
    text: string,
    kind: ItemKind,
    goalId: string,
    draftKey?: string,
  ) => {
    setError(null)
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    if (itemCount >= MAX_ITEMS) {
      setError(`You already have ${MAX_ITEMS} items. Remove some to add more.`)
      return
    }

    setBusy(true)
    let added = 0
    for (const line of lines) {
      if (itemCount + added >= MAX_ITEMS) {
        setError(`Added ${added}. You are at ${MAX_ITEMS} — remove some to add more.`)
        break
      }
      const result = await addSetupItem({
        text: line,
        area: area.id,
        kind,
        goalId,
      })
      if (!result.ok) {
        setError(result.error ?? 'Could not add this item.')
        break
      }
      added += 1
    }
    setBusy(false)
    if (added > 0 && draftKey) {
      if (draftKey.startsWith('hundred:')) {
        setHundredDrafts(prev => ({ ...prev, [goalId]: '' }))
      } else {
        setQuestionDrafts(prev => ({ ...prev, [draftKey]: '' }))
      }
    }
  }

  const handleRemove = async (id: string) => {
    setError(null)
    setBusy(true)
    const result = await removeSetupItem(id)
    setBusy(false)
    if (!result.ok) setError(result.error ?? 'Could not remove this item.')
  }

  const handleAddGoal = async () => {
    setError(null)
    await flushYears()
    setBusy(true)
    const result = await addGoal(area.id)
    setBusy(false)
    if (!result.ok) setError(result.error ?? 'Could not add another goal.')
  }

  const handleRemoveGoal = async (goalId: string) => {
    setError(null)
    setBusy(true)
    const result = await removeGoal(goalId)
    setBusy(false)
    if (!result.ok) setError(result.error ?? 'Could not remove this goal.')
  }

  const goNextArea = async () => {
    await flushYears()
    if (areaIndex >= GOAL_AREAS.length - 1) {
      setMode('review')
      return
    }
    setAreaIndex(i => i + 1)
  }

  const goPrevArea = async () => {
    await flushYears()
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

  const pct = Math.min(100, (itemCount / MAX_ITEMS) * 100)

  if (mode === 'review') {
    return (
      <div className="setup">
        <div className="setup__header">
          <h1 className="setup__title">Your list</h1>
          <p className="setup__subtitle">
            Review your 1-year goals and the 100-day actions under them. You need
            at least {REQUIRED_ITEMS} items (up to {MAX_ITEMS}) before you choose
            your daily habits.
          </p>
        </div>

        <div className="setup__counter">
          {itemCount}
          <span className="setup__counter-dim"> / {MAX_ITEMS}</span>
          <span className="setup__counter-label">items</span>
        </div>
        <div className="setup__progress">
          <div className="setup__progress-bar" style={{ width: `${pct}%` }} />
        </div>

        {GOAL_AREAS.map((a, i) => {
          const list = itemsByArea.get(a.id) ?? []
          const listedGoals = goals.filter(g => g.area === a.id).sort(sortGoals)
          const orphanItems = list.filter(
            item => !item.goal_id || !listedGoals.some(g => g.id === item.goal_id),
          )
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
              {listedGoals.length === 0 && list.length === 0 && (
                <p className="setup__review-empty">No goals yet.</p>
              )}
              {listedGoals.map((g, gi) => {
                const dest = g.destination?.trim()
                const goalItems = list.filter(item => item.goal_id === g.id)
                return (
                  <div key={g.id} className="setup__review-goal">
                    {dest && (
                      <p className="setup__review-dest">
                        <span className="setup__review-dest-label">
                          Goal {gi + 1} · in 1 year:{' '}
                        </span>
                        {dest}
                      </p>
                    )}
                    {goalItems.length === 0 ? (
                      dest ? (
                        <p className="setup__review-empty">No 100-day items yet.</p>
                      ) : null
                    ) : (
                      <ul className="setup__review-list">
                        {goalItems.map(item => (
                          <ReviewItem
                            key={item.id}
                            item={item}
                            busy={busy}
                            onRemove={handleRemove}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
              {orphanItems.length > 0 && (
                <ul className="setup__review-list">
                  {orphanItems.map(item => (
                    <ReviewItem
                      key={item.id}
                      item={item}
                      busy={busy}
                      onRemove={handleRemove}
                    />
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

  return (
    <div className="setup">
      <div className="setup__sticky">
        <div className="setup__sticky-row">
          <span className="setup__sticky-area">
            Area {areaIndex + 1} of {GOAL_AREAS.length}
          </span>
          <span className="setup__sticky-count">
            {itemCount} / {MAX_ITEMS} items
          </span>
        </div>
        <div className="setup__progress setup__progress--sticky">
          <div className="setup__progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="setup__header">
        <h1 className="setup__title">{area.title}</h1>
        <p className="setup__subtitle">
          Name where you want to be in 1 year. Then write what you can do in the
          next 100 days to get closer. Add as many goals as you want in this area.
        </p>
      </div>

      {areaGoals.map((g, gi) => {
        const goalItems = itemsByGoal.get(g.id) ?? []
        const hundredKey = `hundred:${g.id}`
        return (
          <article key={g.id} className="setup__goal-card">
            <div className="setup__goal-card-head">
              <h2 className="setup__goal-card-title">Goal {gi + 1}</h2>
              {areaGoals.length > 1 && (
                <button
                  type="button"
                  className="setup__link-btn"
                  onClick={() => void handleRemoveGoal(g.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              )}
            </div>

            <label className="setup__field">
              <span className="setup__field-label">{area.yearPrompt}</span>
              <textarea
                className="setup__dest"
                value={yearDrafts[g.id] ?? g.destination ?? ''}
                onChange={e => onYearChange(g.id, e.target.value)}
                onBlur={() => {
                  if (destSaveTimers.current[g.id]) {
                    clearTimeout(destSaveTimers.current[g.id])
                    delete destSaveTimers.current[g.id]
                  }
                  void persistYear(g.id, yearDrafts[g.id] ?? '')
                }}
                rows={3}
                placeholder="Be specific…"
                maxLength={500}
              />
            </label>

            <div className="setup__question">
              <p className="setup__question-prompt">
                <span className="setup__kind setup__kind--do">Do</span>
                {HUNDRED_DAYS_PROMPT}
              </p>
              <div className="setup__add-row setup__add-row--stack">
                <textarea
                  className="setup__add-input setup__add-input--area"
                  value={hundredDrafts[g.id] ?? ''}
                  onChange={e =>
                    setHundredDrafts(prev => ({ ...prev, [g.id]: e.target.value }))
                  }
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      void handleAdd(hundredDrafts[g.id] ?? '', 'do', g.id, hundredKey)
                    }
                  }}
                  placeholder="Write the tasks — one per line"
                  rows={4}
                />
                <button
                  type="button"
                  className="setup__add-btn"
                  disabled={busy || !(hundredDrafts[g.id] ?? '').trim()}
                  onClick={() =>
                    void handleAdd(hundredDrafts[g.id] ?? '', 'do', g.id, hundredKey)
                  }
                >
                  Add
                </button>
              </div>
            </div>

            <details className="setup__prompts">
              <summary>Need help uncovering actions?</summary>
              <div className="setup__questions">
                {area.questions.map(q => {
                  const qKey = `${g.id}:${q.id}`
                  return (
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
                              onClick={() => void handleAdd(ex, q.kind, g.id)}
                            >
                              + {ex}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="setup__add-row">
                        <input
                          className="setup__add-input"
                          value={questionDrafts[qKey] ?? ''}
                          onChange={e =>
                            setQuestionDrafts(prev => ({
                              ...prev,
                              [qKey]: e.target.value,
                            }))
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleAdd(
                                questionDrafts[qKey] ?? '',
                                q.kind,
                                g.id,
                                qKey,
                              )
                            }
                          }}
                          placeholder="Add one item, press Enter"
                          maxLength={200}
                        />
                        <button
                          type="button"
                          className="setup__add-btn"
                          disabled={
                            busy || !(questionDrafts[qKey] ?? '').trim()
                          }
                          onClick={() =>
                            void handleAdd(
                              questionDrafts[qKey] ?? '',
                              q.kind,
                              g.id,
                              qKey,
                            )
                          }
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>

            {goalItems.length > 0 && (
              <div className="setup__area-items">
                <p className="setup__area-items-title">
                  100-day actions ({goalItems.length})
                </p>
                <ul className="setup__review-list">
                  {goalItems.map(item => (
                    <ReviewItem
                      key={item.id}
                      item={item}
                      busy={busy}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </div>
            )}
          </article>
        )
      })}

      <button
        type="button"
        className="setup__add-goal"
        onClick={() => void handleAddGoal()}
        disabled={busy}
      >
        + Add another {area.title.toLowerCase()} goal
      </button>

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
            void flushYears()
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
        Progress saves as you go. Skip an area if you want — you need at least{' '}
        {REQUIRED_ITEMS} actions (up to {MAX_ITEMS}) to continue.
      </p>
    </div>
  )
}

function ReviewItem({
  item,
  busy,
  onRemove,
}: {
  item: Item
  busy: boolean
  onRemove: (id: string) => void
}) {
  return (
    <li className="setup__review-item">
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
        onClick={() => onRemove(item.id)}
        disabled={busy}
        aria-label={`Remove ${item.text}`}
      >
        ×
      </button>
    </li>
  )
}
