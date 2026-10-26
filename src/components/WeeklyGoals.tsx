import { useEffect, useState } from 'react'
import { formatShortChallengeDate } from '../lib/challengeDay'
import { useWeeklyGoals, type WeeklyGoalView } from '../hooks/useWeeklyGoals'
import './WeeklyGoals.css'

interface WeeklyGoalsProps {
  userId: string
  today: string
  /** Before Day 1: add and remove goals, but don't check them off or remind. */
  beforeStart?: boolean
}

const PERIOD_WORDS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
]

function periodName(number: number): string {
  return PERIOD_WORDS[number - 1] ?? `Period ${number}`
}

function goalStatus(goal: WeeklyGoalView, beforeStart: boolean): string {
  if (beforeStart) {
    const end = formatShortChallengeDate(goal.window.end)
    return `Once between Day 1 and ${end}, then once every 7 days`
  }
  const name = periodName(goal.window.index + 1)
  const end = formatShortChallengeDate(goal.window.end)
  const next = formatShortChallengeDate(goal.window.resetsOn)
  if (goal.done) return `${name} 7 days done. Do it again starting ${next}.`
  if (goal.window.inReminderStretch) {
    const left = goal.window.daysLeft <= 1 ? 'Last day' : `${goal.window.daysLeft} days left`
    return `${name} 7 days · ${left} to do it once · through ${end}`
  }
  return `${name} 7 days · do this once by ${end}`
}

export function WeeklyGoals({ userId, today, beforeStart = false }: WeeklyGoalsProps) {
  const {
    goals,
    dueGoals,
    loading,
    schemaMissing,
    error,
    busyId,
    permission,
    addGoal,
    toggleGoal,
    removeGoal,
    requestPermission,
    setAnchorDay,
  } = useWeeklyGoals(userId, today, { notify: !beforeStart })
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!beforeStart) return
    // Move each goal's 7-day clock onto the chosen Day 1 before the run starts.
    void setAnchorDay(today)
  }, [beforeStart, today, setAnchorDay])

  const doneCount = goals.filter(goal => goal.done).length
  const progressPct = goals.length > 0 ? (doneCount / goals.length) * 100 : 0

  const handleAdd = async () => {
    if (saving) return
    setSaving(true)
    setFormError(null)
    const result = await addGoal(draft)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.error ?? 'Could not add that goal.')
      return
    }
    setDraft('')
  }

  const handleRemove = (goal: WeeklyGoalView) => {
    const ok = window.confirm(`Remove “${goal.text}”? This deletes the goal and its weekly history.`)
    if (!ok) return
    void removeGoal(goal.id)
  }

  return (
    <section className="weekly-goals" aria-label="Weekly goals">
      <div className="weekly-goals__header">
        <h2 className="weekly-goals__title">Weekly goals</h2>
        {goals.length > 0 && !beforeStart && (
          <p className="weekly-goals__count">
            {doneCount} of {goals.length} done for these 7 days
          </p>
        )}
        {goals.length > 0 && beforeStart && (
          <p className="weekly-goals__count">
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </p>
        )}
      </div>

      {schemaMissing && (
        <p className="weekly-goals__error">
          Weekly goals need a database update. Run migration 016 in Supabase, then reload.
        </p>
      )}

      {!schemaMissing && !beforeStart && goals.length > 0 && (
        <div
          className="weekly-goals__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goals.length}
          aria-valuenow={doneCount}
          aria-label="Weekly goals fulfilled in the current 7 days"
        >
          <div className="weekly-goals__bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {!schemaMissing && !beforeStart && dueGoals.length > 0 && (
        <div className="weekly-goals__alert" role="status">
          <p>
            {dueGoals.length === 1
              ? `“${dueGoals[0].text}” is still open. ${
                  dueGoals[0].window.daysLeft <= 1
                    ? 'Last day before this week resets.'
                    : `${dueGoals[0].window.daysLeft} days left before this week resets.`
                }`
              : `${dueGoals.length} weekly goals are still open. Finish them before their week resets.`}
          </p>
          {permission === 'default' && (
            <button type="button" className="weekly-goals__remind" onClick={() => void requestPermission()}>
              Turn on reminders
            </button>
          )}
        </div>
      )}

      {!schemaMissing && !beforeStart && !loading && goals.length > 0 && doneCount === goals.length && (
        <p className="weekly-goals__clear">
          Done for these 7 days. Each goal is due again when the next 7 days start.
        </p>
      )}

      {!schemaMissing && loading && <p className="weekly-goals__hint">Loading weekly goals…</p>}

      {!schemaMissing && !loading && (
        <ul className="weekly-goals__list">
          {goals.map(goal => {
            const due = !beforeStart && !goal.done && goal.window.inReminderStretch
            return (
              <li
                key={goal.id}
                className={`weekly-goals__item${goal.done && !beforeStart ? ' weekly-goals__item--done' : ''}${due ? ' weekly-goals__item--due' : ''}`}
              >
                {!beforeStart && (
                  <button
                    type="button"
                    className={`weekly-goals__check${goal.done ? ' weekly-goals__check--on' : ''}`}
                    aria-pressed={goal.done}
                    aria-label={`${goal.done ? 'Undo this 7-day block' : 'Mark these 7 days done'}: ${goal.text}`}
                    disabled={busyId === goal.id}
                    onClick={() => void toggleGoal(goal.id)}
                  />
                )}
                <div className="weekly-goals__copy">
                  <p className="weekly-goals__text">{goal.text}</p>
                  <p className="weekly-goals__meta">{goalStatus(goal, beforeStart)}</p>
                  {!beforeStart && goal.periods.length > 0 && (
                    <ol className="weekly-goals__periods">
                      {goal.periods.map(period => {
                        const state = period.done ? 'done' : period.missed ? 'missed' : 'open'
                        const label = period.done
                          ? `${periodName(period.number)} 7 days done`
                          : period.missed
                            ? `${periodName(period.number)} 7 days missed`
                            : `${periodName(period.number)} 7 days still open`
                        return (
                          <li key={period.start}>
                            <span
                              className={`weekly-goals__period weekly-goals__period--${state}${period.current ? ' weekly-goals__period--current' : ''}`}
                              title={label}
                            >
                              {period.number}
                            </span>
                            <span className="weekly-goals__period-label">{label}</span>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
                <button
                  type="button"
                  className="weekly-goals__remove"
                  onClick={() => handleRemove(goal)}
                  disabled={busyId === goal.id}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!schemaMissing && !loading && (
        <form
          className="weekly-goals__form"
          onSubmit={event => {
            event.preventDefault()
            void handleAdd()
          }}
        >
          <input
            className="weekly-goals__input"
            value={draft}
            maxLength={200}
            placeholder="Add a weekly goal"
            aria-label="New weekly goal"
            onChange={event => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="weekly-goals__add"
            disabled={saving || draft.trim().length === 0}
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {(formError || error) && <p className="weekly-goals__error">{formError || error}</p>}

      {!schemaMissing && !loading && (
        <p className="weekly-goals__hint">
          {beforeStart
            ? 'Optional. Add as many as you want. Each one starts on Day 1 and is due once every 7 days from that day. You check them off once the run begins.'
            : "Add as many as you want. Do each one once in the first 7 days, then once in the next 7 days, and so on. On the last 3 days of a block, you'll be reminded if it isn't done."}
        </p>
      )}
    </section>
  )
}
