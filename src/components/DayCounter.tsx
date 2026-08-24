import './DayCounter.css'
import { formatChallengeDate } from '../lib/challengeDay'

interface DayCounterProps {
  day: number
  totalDays: number
  completedToday: boolean
  celebrate: boolean
  finishDate: string | null
  exceptionsUsed: number
  finished: boolean
}

export function DayCounter({
  day,
  totalDays,
  completedToday,
  celebrate,
  finishDate,
  exceptionsUsed,
  finished,
}: DayCounterProps) {
  const cls = [
    'day-counter',
    completedToday && 'day-counter--complete',
    celebrate && 'day-counter--celebrate',
  ]
    .filter(Boolean)
    .join(' ')

  const exceptionNote =
    exceptionsUsed > 0
      ? `${exceptionsUsed} exception${exceptionsUsed === 1 ? '' : 's'} added`
      : null

  return (
    <div className={cls}>
      <div className="day-counter__label">Day</div>
      <div className="day-counter__number">{day}</div>
      <div className="day-counter__of">of {totalDays}</div>
      {finishDate && (
        <p className="day-counter__finish">
          {finished ? 'Finished' : 'Ends'}{' '}
          <span className="day-counter__finish-date">{formatChallengeDate(finishDate)}</span>
          {exceptionNote && (
            <span className="day-counter__finish-note">{exceptionNote}</span>
          )}
        </p>
      )}
    </div>
  )
}
