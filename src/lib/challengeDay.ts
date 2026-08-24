/** Challenge day rolls at 4:00 AM local. */
export const DAY_ROLLOVER_HOUR = 4

/** Hourly warnings in the last 5 hours before rollover (midnight handled separately). */
export const DEADLINE_WARNING_HOURS = [23, 1, 2, 3] as const

function toDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function calendarToday(): string {
  return toDateStr(new Date())
}

function challengeNow(): Date {
  const d = new Date()
  if (d.getHours() < DAY_ROLLOVER_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

export function naturalToday(): string {
  return toDateStr(challengeNow())
}

export function addDaysToDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return toDateStr(date)
}

/** Human date for a challenge-day string (local calendar, not UTC). */
export function formatChallengeDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Calendar date of Day 100, counting from the run start. Exception days freeze
 * the streak and do not count, so each one pushes the finish out by one day.
 */
export function projectedFinishDate(
  startDate: string | null | undefined,
  exceptionsUsed: number,
  requiredDays: number,
): string | null {
  if (!startDate) return null
  const extra = Math.max(0, exceptionsUsed)
  return addDaysToDateStr(startDate, requiredDays - 1 + extra)
}

export function weekStartStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - date.getDay())
  return toDateStr(date)
}

export function hoursUntilRollover(): number {
  const now = new Date()
  const rollover = new Date(now)
  rollover.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0)
  if (rollover <= now) rollover.setDate(rollover.getDate() + 1)
  return Math.max(0, Math.ceil((rollover.getTime() - now.getTime()) / 3_600_000))
}
