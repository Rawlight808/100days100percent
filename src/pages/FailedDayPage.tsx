import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useChallenge } from '../hooks/useChallenge'
import { ExceptionModal } from '../components/ExceptionModal'
import { DAY_ROLLOVER_HOUR } from '../lib/challengeDay'
import './FailedDayPage.css'

export function FailedDayPage() {
  const {
    phase,
    loading,
    failedDay,
    restartFromFailure,
    exceptionStatus,
    claimException,
  } = useChallenge()
  const navigate = useNavigate()
  const [exceptionOpen, setExceptionOpen] = useState(false)

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'select') return <Navigate to="/select" replace />
  if (phase === 'ready') return <Navigate to="/dashboard" replace />

  const day = failedDay ?? 1

  const handleRestart = async () => {
    await restartFromFailure()
    navigate('/select', { replace: true })
  }

  return (
    <div className="failed">
      <div className="failed__glow" aria-hidden="true" />
      <div className="failed__content">
        <p className="failed__label">Day {day} — Incomplete</p>
        <h1 className="failed__title">You didn&apos;t finish.</h1>
        <p className="failed__text">
          Every habit must be checked before {DAY_ROLLOVER_HOUR}:00 AM. You missed a day, so
          your progress resets. Choose your daily habits again and start from Day 1.
        </p>
        <button className="failed__restart" type="button" onClick={handleRestart}>
          Restart — Choose Habits
        </button>

        {exceptionStatus.canRescueYesterday && (
          <div className="failed__exception">
            <p className="failed__exception-text">
              Was it something outside your control — sickness, a family
              emergency, all-day travel, a brutal work day?
            </p>
            <button
              className="failed__exception-btn"
              type="button"
              onClick={() => setExceptionOpen(true)}
            >
              Use an Exception — Save Your Streak
            </button>
            <p className="failed__exception-hint">
              The missed day won't count toward your 100, but your streak
              survives. {exceptionStatus.remaining} of {exceptionStatus.max}{' '}
              left this run.
            </p>
          </div>
        )}
      </div>

      {exceptionOpen && (
        <ExceptionModal
          target="yesterday"
          remaining={exceptionStatus.remaining}
          max={exceptionStatus.max}
          onConfirm={async (category, note) => {
            const result = await claimException('yesterday', category, note)
            if (result.ok) navigate('/dashboard', { replace: true })
            return result
          }}
          onClose={() => setExceptionOpen(false)}
        />
      )}
    </div>
  )
}
