import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { useChallenge } from '../hooks/useChallenge'
import { AppNav } from '../components/AppNav'
import { WeeklyGoals } from '../components/WeeklyGoals'
import {
  DAY_ROLLOVER_HOUR,
  START_DATE_MAX_DAYS,
  addDaysToDateStr,
  formatChallengeDate,
  isValidStartDate,
  naturalToday,
} from '../lib/challengeDay'
import './StartPage.css'

export function StartPage() {
  const { phase, loading, streak, scheduleStart, resetToSelect } = useChallenge()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (loading || phase === 'loading') {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'select') return <Navigate to="/select" replace />
  if (phase === 'failed') return <Navigate to="/failed" replace />
  if (phase === 'ready') return <Navigate to="/dashboard" replace />
  if (!user) return <Navigate to="/auth" replace />

  const natural = naturalToday()
  const saved = streak?.streak_start_date ?? null
  const savedStart = saved && saved > natural ? saved : null

  return (
    <StartForm
      userId={user.id}
      initialDate={savedStart ?? natural}
      savedStart={savedStart}
      scheduleStart={scheduleStart}
      onChangeHabits={() => navigate('/select')}
      onReset={async () => {
        await resetToSelect()
        navigate('/select', { replace: true })
      }}
    />
  )
}

function StartForm({
  userId,
  initialDate,
  savedStart,
  scheduleStart,
  onChangeHabits,
  onReset,
}: {
  userId: string
  initialDate: string
  savedStart: string | null
  scheduleStart: (date: string) => Promise<{ ok: boolean; error?: string; warning?: string }>
  onChangeHabits: () => void
  onReset: () => Promise<void>
}) {
  const earliest = naturalToday()
  const latest = addDaysToDateStr(earliest, START_DATE_MAX_DAYS)
  const [startDate, setStartDate] = useState(initialDate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const valid = isValidStartDate(startDate, earliest)
  const waiting =
    savedStart != null && savedStart === startDate && startDate > earliest && !warning
  const label = saving
    ? 'Saving…'
    : waiting
      ? 'Start day saved'
      : startDate === earliest
        ? 'Start today'
        : 'Set this start day'

  const handleConfirm = async () => {
    if (saving || !valid || waiting) return
    setSaving(true)
    setError(null)
    setWarning(null)
    const result = await scheduleStart(startDate)
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not save your start day.')
      return
    }
    setWarning(result.warning ?? null)
    // A start date of today moves the run to the dashboard from the page above.
  }

  return (
    <div className="start">
      <AppNav
        remindersActive={false}
        onStartOver={onReset}
        startOverLabel="Reset & choose again"
        startOverDesc="Clears your daily habits and start day. Your 100 list stays. You'll pick habits and a start day again."
      />

      <header className="start__header">
        <h1 className="start__title">Choose your start day</h1>
        <p className="start__subtitle">
          Your list and daily habits are set. Add weekly goals if you want them,
          then choose when Day 1 begins. You can start today or on a later day.
        </p>
      </header>

      <WeeklyGoals
        userId={userId}
        today={valid ? startDate : (savedStart ?? earliest)}
        beforeStart
      />

      <section className="start__when" aria-label="Start day">
        <label className="start__label" htmlFor="start-day">
          Day 1
        </label>
        <input
          id="start-day"
          className="start__date"
          type="date"
          min={earliest}
          max={latest}
          value={startDate}
          onChange={event => {
            setStartDate(event.target.value)
            setError(null)
            setWarning(null)
          }}
        />
        {valid && (
          <p className="start__chosen">{formatChallengeDate(startDate)}</p>
        )}
        {valid && startDate === earliest && (
          <p className="start__hint">The daily list opens today.</p>
        )}
        {valid && startDate > earliest && (
          <p className="start__hint">
            {waiting
              ? `Day 1 is ${formatChallengeDate(startDate)}. The daily checklist stays closed until then. Days roll at ${DAY_ROLLOVER_HOUR}:00 AM. You can still change this date or your weekly goals.`
              : `The daily checklist stays closed until this day. Days roll at ${DAY_ROLLOVER_HOUR}:00 AM.`}
          </p>
        )}
        {!valid && (
          <p className="start__error">Pick today or a later day, within the next year.</p>
        )}

        <button
          type="button"
          className="start__btn"
          disabled={saving || !valid || waiting}
          onClick={() => void handleConfirm()}
        >
          {label}
        </button>
        {error && <p className="start__error">{error}</p>}
        {warning && <p className="start__hint">{warning}</p>}
      </section>

      <div className="start__links">
        <button type="button" className="start__link" onClick={onChangeHabits}>
          Change daily habits
        </button>
      </div>
    </div>
  )
}
