import { useMemo, useState } from 'react'
import './JournalCalendar.css'

interface JournalCalendarProps {
  entriesByDate: Record<string, string>
  today: string
  onSelectDate: (date: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function parseDateStr(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}

interface Cell {
  date: string
  day: number
  monthOffset: -1 | 0 | 1
}

function buildCells(year: number, month: number): Cell[] {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const prevYear = month === 0 ? year - 1 : year
  const prevMonth = month === 0 ? 11 : month - 1
  const nextYear = month === 11 ? year + 1 : year
  const nextMonth = month === 11 ? 0 : month + 1

  const cells: Cell[] = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({ date: toDateStr(prevYear, prevMonth, d), day: d, monthOffset: -1 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toDateStr(year, month, d), day: d, monthOffset: 0 })
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const idx = cells.length - (firstWeekday + daysInMonth) + 1
    cells.push({ date: toDateStr(nextYear, nextMonth, idx), day: idx, monthOffset: 1 })
    if (cells.length >= 42) break
  }
  return cells
}

export function JournalCalendar({
  entriesByDate,
  today,
  onSelectDate,
}: JournalCalendarProps) {
  const todayParsed = useMemo(() => parseDateStr(today), [today])
  const [view, setView] = useState(() => ({
    year: todayParsed.y,
    month: todayParsed.m,
  }))

  const cells = useMemo(
    () => buildCells(view.year, view.month),
    [view],
  )

  const goPrev = () =>
    setView(v =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 },
    )
  const goNext = () =>
    setView(v =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 },
    )

  const isCurrentView =
    view.year === todayParsed.y && view.month === todayParsed.m

  return (
    <div className="journal-cal">
      <div className="journal-cal__header">
        <button
          type="button"
          className="journal-cal__nav"
          onClick={goPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="journal-cal__title">
          {MONTH_NAMES[view.month]} {view.year}
        </span>
        <button
          type="button"
          className="journal-cal__nav"
          onClick={goNext}
          aria-label="Next month"
          disabled={isCurrentView}
        >
          ›
        </button>
      </div>

      <div className="journal-cal__weekdays">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="journal-cal__weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="journal-cal__grid">
        {cells.map(cell => {
          const hasEntry = Boolean(entriesByDate[cell.date]?.trim())
          const isToday = cell.date === today
          const isFuture = cell.date > today
          const isOther = cell.monthOffset !== 0
          const clickable = hasEntry && !isFuture

          const cls = [
            'journal-cal__day',
            isOther && 'journal-cal__day--other',
            isToday && 'journal-cal__day--today',
            isFuture && 'journal-cal__day--future',
            hasEntry && 'journal-cal__day--has-entry',
            clickable && 'journal-cal__day--clickable',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={cell.date}
              type="button"
              className={cls}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(cell.date)}
              title={
                hasEntry
                  ? `View journal — ${cell.date}`
                  : isFuture
                    ? ''
                    : 'No entry'
              }
            >
              <span className="journal-cal__day-num">{cell.day}</span>
              {hasEntry && <span className="journal-cal__dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
