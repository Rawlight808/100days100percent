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
