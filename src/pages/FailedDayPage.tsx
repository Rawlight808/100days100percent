import { Navigate, useNavigate } from 'react-router-dom'
import { useChallenge } from '../hooks/useChallenge'
import { DAY_ROLLOVER_HOUR } from '../lib/challengeDay'
import './FailedDayPage.css'

export function FailedDayPage() {
  const { phase, loading, failedDay, restartFromFailure } = useChallenge()
  const navigate = useNavigate()

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
      </div>
    </div>
  )
}
