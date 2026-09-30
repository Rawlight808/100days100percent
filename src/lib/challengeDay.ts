/** Challenge day rolls at 4:00 AM local. */
export const DAY_ROLLOVER_HOUR = 4

/**
 * A missed checklist does not fail the run until this local hour on the
 * following calendar day (12 = noon). Completed days still roll at 4:00 AM.
 */
export const FAIL_DEADLINE_HOUR = 12

/** Hourly warnings in the last 5 hours before rollover (midnight handled separately). */
export const DEADLINE_WARNING_HOURS = [23, 1, 2, 3] as const

/** Hourly warnings during the 4 AM–noon grace window. */
export const FAIL_GRACE_WARNING_HOURS = [8, 9, 10, 11] as const

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

/** Whole calendar days from `from` to `to` (local dates, not UTC). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1).getTime()
  const b = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * How many caveat-earning weeks have elapsed from `startDate` through `today`,
 * inclusive. A new week starts Sunday. Before the run starts, counts as 1.
 */
export function caveatWeeksEarned(
  startDate: string | null | undefined,
  today: string,
): number {
  const origin = startDate && startDate <= today ? startDate : today
  const weeks = Math.floor(daysBetween(weekStartStr(origin), weekStartStr(today)) / 7) + 1
  return Math.max(1, weeks)
}

/**
 * Banked caveat allowance for a run. One grant per calendar week from the
 * Sunday of the start week through this week; unused grants carry forward.
 * Spends are counted from that same Sunday so a caveat used while picking
 * still spends the first week's grant after lock-in.
 */
export function computeCaveatAllowance(
  startDate: string | null | undefined,
  today: string,
  eventDates: string[],
  grantPerWeek = 1,
): { used: number; earned: number; remaining: number; canAdd: boolean } {
  const windowStart = weekStartStr(today)
  const origin = startDate ? weekStartStr(startDate) : windowStart
  const used = eventDates.filter(d => d >= origin).length
  const earned = caveatWeeksEarned(startDate ?? today, today) * grantPerWeek
  const remaining = Math.max(0, earned - used)
  return { used, earned, remaining, canAdd: remaining > 0 }
}

export function hoursUntilRollover(now = new Date()): number {
  return hoursUntilLocalHour(DAY_ROLLOVER_HOUR, now)
}

/** Whole hours remaining until today's fail deadline (noon), or tomorrow's if past it. */
export function hoursUntilFailDeadline(now = new Date()): number {
  return hoursUntilLocalHour(FAIL_DEADLINE_HOUR, now)
}

export function isPastFailDeadline(now = new Date()): boolean {
  return now.getHours() >= FAIL_DEADLINE_HOUR
}

/**
 * True when the only miss is yesterday's challenge day. A multi-day gap fails
 * immediately; a single overnight miss waits until {@link FAIL_DEADLINE_HOUR}.
 */
export function isSingleOvernightMiss(
  lastPerfectDate: string | null | undefined,
  streakStartDate: string | null | undefined,
  natural: string,
  naturalYesterday: string,
): boolean {
  if (!streakStartDate) return false
  if (!(natural > streakStartDate)) return false
  if (lastPerfectDate === natural || lastPerfectDate === naturalYesterday) return false
  const dayBeforeYesterday = addDaysToDateStr(natural, -2)
  if (lastPerfectDate === dayBeforeYesterday) return true
  return lastPerfectDate == null && streakStartDate === naturalYesterday
}

/** Keep yesterday's checklist on screen until noon when only that day was missed. */
export function shouldHoldIncompleteDay(
  lastPerfectDate: string | null | undefined,
  streakStartDate: string | null | undefined,
  natural: string,
  now = new Date(),
): boolean {
  if (isPastFailDeadline(now)) return false
  const naturalYesterday = addDaysToDateStr(natural, -1)
  return isSingleOvernightMiss(
    lastPerfectDate,
    streakStartDate,
    natural,
    naturalYesterday,
  )
}

/** Ms until the next 4:00 AM roll or noon fail check, whichever is sooner. */
export function msUntilNextChallengeClock(now = new Date()): number {
  return Math.min(
    nextLocalHourMs(DAY_ROLLOVER_HOUR, now),
    nextLocalHourMs(FAIL_DEADLINE_HOUR, now),
  ) - now.getTime()
}

function hoursUntilLocalHour(hour: number, now: Date): number {
  const ms = nextLocalHourMs(hour, now) - now.getTime()
  return Math.max(0, Math.ceil(ms / 3_600_000))
}

function nextLocalHourMs(hour: number, now: Date): number {
  const next = new Date(now)
  next.setHours(hour, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime()
}
