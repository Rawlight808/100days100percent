import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth-context'
import {
  DAY_ROLLOVER_HOUR,
  addDaysToDateStr,
  calendarToday,
  naturalToday,
  projectedFinishDate,
  weekStartStr,
} from '../lib/challengeDay'

export const REQUIRED_ITEMS = 100
/** Daily habits to track: pick between min and max for the 100-day run */
export const MIN_TOP = 10
export const MAX_TOP = 20
export const REQUIRED_DAYS = 100

export interface Item {
  id: string
  user_id: string
  text: string
  is_top_twelve: boolean
  position: number
  caveat?: string | null
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  completed_item_ids: string[]
  all_completed: boolean
  journal_entry?: string | null
  is_sabbath?: boolean
  is_exception?: boolean
}

/** Days of perfect completion required before the sabbath unlocks. */
export const SABBATH_UNLOCK_DAY = 3

/** A caveat is a spent exception: one per calendar week, no rollover. */
export const MAX_CAVEATS_PER_WINDOW = 1
/** Days in the caveat week (used to compute when the next week begins). */
export const CAVEAT_WINDOW_DAYS = 7

/**
 * Exceptions: whole-day exemptions for circumstances outside your control.
 * An exception FREEZES the streak — the day doesn't count toward the 100,
 * but the streak survives. Max per run, counted from streak_start_date.
 */
export const MAX_EXCEPTIONS_PER_RUN = 5

export const EXCEPTION_CATEGORIES = [
  'Sickness',
  'Family emergency',
  'Extreme work day',
  'All-day travel',
  'Other',
] as const

export type ExceptionCategory = (typeof EXCEPTION_CATEGORIES)[number]

export interface ExceptionStatus {
  used: number
  remaining: number
  max: number
  /** Can claim an exception for today (freezes today). */
  canUseToday: boolean
  /** Can retroactively rescue yesterday from the failed screen. */
  canRescueYesterday: boolean
}

export interface CaveatStatus {
  used: number
  remaining: number
  canAdd: boolean
  max: number
  windowDays: number
  /** Challenge-day string when the next caveat slot frees up, or null if some are free now. */
  nextAvailable: string | null
}

export interface Streak {
  user_id: string
  current_day: number
  streak_start_date: string | null
  last_perfect_date: string | null
  /** Day number the streak broke on; drives the "failed" screen. Null when intact. */
  failed_day?: number | null
  /** Challenge-day the user manually jumped to via "Start Day N+1". Null = natural day. */
  advanced_to?: string | null
}

export type Phase = 'loading' | 'setup' | 'select' | 'ready' | 'failed'

/**
 * Start of the caveat week (the Sunday on/before `today`), as a challenge-day
 * string. A caveat counts toward the allowance — and stays active — only while
 * it was added on or after this date. It auto-deactivates once the week rolls.
 */
function caveatWindowStart(today: string): string {
  return weekStartStr(today)
}

/**
 * Reset completion data without destroying journal history: logs with no
 * journal entry are deleted; the rest are kept with completion cleared.
 */
async function clearLogsPreservingJournals(userId: string) {
  await supabase.from('daily_logs').delete().eq('user_id', userId).is('journal_entry', null)
  await supabase
    .from('daily_logs')
    .update({
      completed_item_ids: [],
      all_completed: false,
      is_sabbath: false,
      is_exception: false,
    })
    .eq('user_id', userId)
}

function computeFailedDay(streak: Streak, naturalYesterday: string): number {
  if (streak.last_perfect_date === naturalYesterday) return streak.current_day + 1
  return streak.current_day > 0 ? streak.current_day + 1 : 1
}

/**
 * Failure is judged against the *natural* challenge clock only — never the
 * manually-advanced UI day. Using `advanced_to` here used to flip phase between
 * ready/failed on every remount (advancedTo resets to null, then rehydrates),
 * which bounced users between /dashboard and /failed in a loop.
 */
function isStreakBroken(
  streak: Streak,
  natural: string,
  naturalYesterday: string,
  activeChallenge: boolean,
): boolean {
  if (!activeChallenge) return false
  const pastFirstDay = natural > (streak.streak_start_date ?? natural)
  const missedPreviousDay = streak.last_perfect_date !== naturalYesterday
  const notCompletedToday = streak.last_perfect_date !== natural
  return pastFirstDay && missedPreviousDay && notCompletedToday
}

/** Survive route remounts so "Start Day N+1" doesn't briefly fall back to natural. */
const advancedToCache = new Map<string, string | null>()

export function useChallenge() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState<Item[]>([])
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [sabbathThisWeek, setSabbathThisWeek] = useState<string | null>(null)
  const [failedDay, setFailedDay] = useState<number | null>(null)
  const [caveatLog, setCaveatLog] = useState<string[]>([])
  const [exceptionDates, setExceptionDates] = useState<string[]>([])

  const todayLogRef = useRef<DailyLog | null>(null)
  const streakRef = useRef<Streak | null>(null)
  const loadSeqRef = useRef(0)

  const [advancedTo, setAdvancedToState] = useState<string | null>(() =>
    userId && advancedToCache.has(userId) ? (advancedToCache.get(userId) ?? null) : null,
  )

  const setAdvancedTo = useCallback(
    (value: string | null) => {
      if (userId) advancedToCache.set(userId, value)
      setAdvancedToState(value)
    },
    [userId],
  )

  // Challenge state (failed day, manual day advance, caveat log) is hydrated
  // from the DB in loadData. Here we only reset it when the user signs out.
  useEffect(() => {
    if (!userId) {
      // Intentional: clear local challenge state in response to a sign-out.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAdvancedToState(null)
      setFailedDay(null)
      setCaveatLog([])
      setExceptionDates([])
      /* eslint-enable react-hooks/set-state-in-effect */
    } else if (advancedToCache.has(userId)) {
      // Restore manual advance immediately so the first paint matches the DB
      // and we don't evaluate the wrong "today" before hydration finishes.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAdvancedToState(advancedToCache.get(userId) ?? null)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [userId])

  const today = useMemo(() => {
    const natural = naturalToday()
    const calendar = calendarToday()
    // Manual advance is capped at one day ahead of the natural day, so
    // "Start Day N+1" can't be chained to skip through the challenge.
    const manual =
      advancedTo &&
      advancedTo > natural &&
      advancedTo <= addDaysToDateStr(natural, 1)
        ? advancedTo
        : null
    // If the 4am-held day has already been completed AND the real calendar
    // has crossed midnight, auto-roll to the calendar day. This prevents the
    // "open the app at 1am and see yesterday's already-checked boxes" confusion.
    const autoRolled =
      streak?.last_perfect_date === natural && calendar > natural ? calendar : null
    const candidates = [natural, manual, autoRolled].filter(Boolean) as string[]
    return candidates.reduce((a, b) => (a > b ? a : b))
  }, [advancedTo, streak])

  const yesterday = useMemo(() => addDaysToDateStr(today, -1), [today])

  const topTwelve = useMemo(() => items.filter(i => i.is_top_twelve), [items])

  const phase: Phase = useMemo(() => {
    if (loading) return 'loading'
    if (failedDay != null) return 'failed'
    if (items.length < REQUIRED_ITEMS) return 'setup'
    const n = topTwelve.length
    if (n < MIN_TOP || n > MAX_TOP) return 'select'
    return 'ready'
  }, [loading, items.length, topTwelve.length, failedDay])

  const displayDay = useMemo((): { day: number; completedToday: boolean } => {
    if (!streak) return { day: 1, completedToday: false }
    if (streak.last_perfect_date === today)
      return { day: streak.current_day, completedToday: true }
    if (streak.last_perfect_date === yesterday)
      return { day: streak.current_day + 1, completedToday: false }
    return { day: 1, completedToday: false }
  }, [streak, today, yesterday])

  const completedIds = useMemo(
    () => new Set<string>(todayLog?.completed_item_ids ?? []),
    [todayLog],
  )

  useEffect(() => {
    todayLogRef.current = todayLog
  }, [todayLog])

  useEffect(() => {
    streakRef.current = streak
  }, [streak])

  const loadData = useCallback(async () => {
    if (!userId) return
    const seq = ++loadSeqRef.current
    setLoading(true)
    setLoadError(false)

    // Always re-read the natural clock inside the fetch — `today` may be the
    // manually advanced day, but fail/survive must use the real challenge day.
    const naturalNow = naturalToday()
    const naturalYday = addDaysToDateStr(naturalNow, -1)
    const weekStart = weekStartStr(today)

    const [itemsRes, logRes, streakRes, sabbathRes, caveatRes, exceptionRes] = await Promise.all([
      supabase.from('items').select('*').eq('user_id', userId).order('position'),
      supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', today)
        .maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('daily_logs')
        .select('log_date')
        .eq('user_id', userId)
        .eq('is_sabbath', true)
        .gte('log_date', weekStart)
        .lte('log_date', today)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('caveat_events')
        .select('log_date, item_id')
        .eq('user_id', userId)
        .order('log_date', { ascending: false }),
      supabase
        .from('exception_events')
        .select('log_date')
        .eq('user_id', userId)
        .order('log_date', { ascending: false }),
    ])

    // A newer load started (today changed, remount, etc.) — drop this result
    // so two overlapping fetches can't flip failed ↔ ready against each other.
    if (seq !== loadSeqRef.current) return

    // The items + streak reads are essential. If either failed (e.g. offline or
    // a transient network error), surface a retryable error rather than wiping
    // state to empty and bouncing the user through setup/select.
    if (itemsRes.error || streakRes.error) {
      setLoadError(true)
      setLoading(false)
      return
    }

    setSabbathThisWeek((sabbathRes.data as { log_date: string } | null)?.log_date ?? null)

    setExceptionDates(
      ((exceptionRes.data ?? []) as { log_date: string }[]).map(r => r.log_date),
    )

    const windowStart = caveatWindowStart(today)
    const caveatRows = (caveatRes.data ?? []) as { log_date: string; item_id: string | null }[]

    // Allowance is spent by adds within the rolling window (no rollover).
    setCaveatLog(caveatRows.filter(r => r.log_date >= windowStart).map(r => r.log_date))

    let loadedItems = (itemsRes.data ?? []) as Item[]

    // Auto-deactivate any caveat whose week is up. Rows are ordered newest-first,
    // so the first event seen per item is its most recent add.
    const latestAddByItem = new Map<string, string>()
    for (const r of caveatRows) {
      if (r.item_id && !latestAddByItem.has(r.item_id)) {
        latestAddByItem.set(r.item_id, r.log_date)
      }
    }
    const expiredItemIds = loadedItems
      .filter(i => !!i.caveat && i.caveat.trim().length > 0)
      .filter(i => {
        const addedOn = latestAddByItem.get(i.id)
        return addedOn != null && addedOn < windowStart
      })
      .map(i => i.id)

    if (expiredItemIds.length > 0) {
      await supabase.from('items').update({ caveat: null }).in('id', expiredItemIds)
      if (seq !== loadSeqRef.current) return
      const expired = new Set(expiredItemIds)
      loadedItems = loadedItems.map(i =>
        expired.has(i.id) ? { ...i, caveat: null } : i,
      )
    }

    setItems(loadedItems)

    const log = logRes.data as DailyLog | null
    setTodayLog(log)
    todayLogRef.current = log

    let s = streakRes.data as Streak | null
    const topCount = loadedItems.filter(i => i.is_top_twelve).length
    const activeChallenge = topCount >= MIN_TOP && topCount <= MAX_TOP

    if (!s) {
      const { data } = await supabase
        .from('streaks')
        .insert({ user_id: userId, current_day: 0, streak_start_date: today })
        .select()
        .single()
      if (seq !== loadSeqRef.current) return
      s = data as Streak
    }

    if (s && activeChallenge && isStreakBroken(s, naturalNow, naturalYday, activeChallenge)) {
      const day = computeFailedDay(s, naturalYday)
      setFailedDay(day)
      if (s.failed_day !== day) {
        await supabase.from('streaks').update({ failed_day: day }).eq('user_id', userId)
        if (seq !== loadSeqRef.current) return
        s = { ...s, failed_day: day }
      }
    } else {
      setFailedDay(null)
      if (s && s.failed_day != null) {
        await supabase.from('streaks').update({ failed_day: null }).eq('user_id', userId)
        if (seq !== loadSeqRef.current) return
        s = { ...s, failed_day: null }
      }
    }

    // Hydrate manual day-advance. Drop stale values that are no longer ahead of
    // the natural day so they can't keep shifting `today` on every remount.
    const rawAdvanced = s?.advanced_to ?? null
    const validAdvanced =
      rawAdvanced &&
      rawAdvanced > naturalNow &&
      rawAdvanced <= addDaysToDateStr(naturalNow, 1)
        ? rawAdvanced
        : null
    if (s && rawAdvanced && !validAdvanced) {
      await supabase
        .from('streaks')
        .update({ advanced_to: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (seq !== loadSeqRef.current) return
      s = { ...s, advanced_to: null }
    }
    setAdvancedTo(validAdvanced)

    setStreak(s)
    streakRef.current = s
    setLoading(false)
  }, [userId, today, setAdvancedTo])

  useEffect(() => {
    // Initial/dependency-driven data fetch; loadData manages its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const msUntilRollover = next.getTime() - now.getTime()

    const timer = setTimeout(() => {
      loadData()
    }, msUntilRollover + 1000)

    return () => clearTimeout(timer)
  }, [loadData, today])

  const saveItems = useCallback(
    async (texts: string[]) => {
      if (!user) return
      await clearLogsPreservingJournals(user.id)
      await supabase.from('items').delete().eq('user_id', user.id)

      const rows = texts.map((text, i) => ({
        user_id: user.id,
        text,
        is_top_twelve: false,
        position: i,
      }))
      const { data } = await supabase
        .from('items')
        .insert(rows)
        .select()
        .order('position')
      if (data) setItems(data as Item[])

      await supabase
        .from('streaks')
        .update({
          current_day: 0,
          last_perfect_date: null,
          streak_start_date: today,
          failed_day: null,
          advanced_to: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      setAdvancedTo(null)
      setFailedDay(null)
      setSabbathThisWeek(null)
    },
    [user, today],
  )

  const saveTopTwelve = useCallback(
    async (selectedIds: string[]) => {
      if (!user) return
      if (selectedIds.length < MIN_TOP || selectedIds.length > MAX_TOP) return
      await supabase
        .from('items')
        .update({ is_top_twelve: false })
        .eq('user_id', user.id)
      await supabase
        .from('items')
        .update({ is_top_twelve: true })
        .in('id', selectedIds)

      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('position')
      if (data) setItems(data as Item[])
    },
    [user],
  )

  const saveJournal = useCallback(
    async (entry: string) => {
      if (!user) return

      let log = todayLogRef.current
      if (!log) {
        const { data } = await supabase
          .from('daily_logs')
          .upsert(
            {
              user_id: user.id,
              log_date: today,
              completed_item_ids: [],
              all_completed: false,
              journal_entry: entry,
            },
            { onConflict: 'user_id,log_date' },
          )
          .select()
          .single()
        log = data as DailyLog
        todayLogRef.current = log
        setTodayLog(log)
      } else {
        await supabase
          .from('daily_logs')
          .update({ journal_entry: entry })
          .eq('id', log.id)
        const updated = { ...log, journal_entry: entry }
        todayLogRef.current = updated
        setTodayLog(updated)
      }
    },
    [user, today],
  )

  const getJournalEntries = useCallback(
    async (): Promise<Record<string, string>> => {
      if (!user) return {}
      const { data } = await supabase
        .from('daily_logs')
        .select('log_date, journal_entry')
        .eq('user_id', user.id)
        .not('journal_entry', 'is', null)

      const map: Record<string, string> = {}
      for (const row of (data ?? []) as { log_date: string; journal_entry: string | null }[]) {
        const entry = row.journal_entry?.trim()
        if (entry) map[row.log_date] = row.journal_entry as string
      }
      return map
    },
    [user],
  )

  const getItemConsecutiveDays = useCallback(
    async (itemId: string): Promise<number> => {
      if (!user) return 0

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('completed_item_ids, log_date')
        .eq('user_id', user.id)
        .gte('log_date', addDaysToDateStr(today, -3))
        .order('log_date', { ascending: false })

      if (!logs || logs.length === 0) return 0

      const byDate = new Map<string, string[]>()
      for (const log of logs as { completed_item_ids: string[] | null; log_date: string }[]) {
        byDate.set(log.log_date, log.completed_item_ids ?? [])
      }

      // Count strictly consecutive days containing the item, walking back
      // from today (or yesterday, if today doesn't include it yet). Gaps or
      // stale logs from weeks ago no longer count.
      let start = today
      if (!(byDate.get(start) ?? []).includes(itemId)) start = yesterday

      let consecutive = 0
      let d = start
      while ((byDate.get(d) ?? []).includes(itemId)) {
        consecutive++
        d = addDaysToDateStr(d, -1)
      }
      return consecutive
    },
    [user, today, yesterday],
  )

  const updateItemText = useCallback(
    async (itemId: string, newText: string) => {
      if (!user) return
      const trimmed = newText.trim()
      if (!trimmed) return

      await supabase.from('items').update({ text: trimmed }).eq('id', itemId)

      setItems(prev =>
        prev.map(item => (item.id === itemId ? { ...item, text: trimmed } : item)),
      )
    },
    [user],
  )

  const caveatStatus = useMemo((): CaveatStatus => {
    const windowStart = caveatWindowStart(today)
    const inWindow = caveatLog.filter(d => d >= windowStart)
    const used = inWindow.length
    const remaining = Math.max(0, MAX_CAVEATS_PER_WINDOW - used)
    return {
      used,
      remaining,
      canAdd: remaining > 0,
      max: MAX_CAVEATS_PER_WINDOW,
      windowDays: CAVEAT_WINDOW_DAYS,
      // The allowance refreshes (and any active caveat deactivates) next Sunday.
      nextAvailable:
        remaining > 0 ? null : addDaysToDateStr(windowStart, CAVEAT_WINDOW_DAYS),
    }
  }, [caveatLog, today])

  const exceptionsUsedThisRun = useMemo(() => {
    const runStart = streak?.streak_start_date ?? null
    const inRun = runStart ? exceptionDates.filter(d => d >= runStart) : exceptionDates
    return inRun.length
  }, [exceptionDates, streak?.streak_start_date])

  const projectedFinish = useMemo(() => {
    const date = projectedFinishDate(
      streak?.streak_start_date,
      exceptionsUsedThisRun,
      REQUIRED_DAYS,
    )
    if (!date) return null
    return {
      date,
      exceptionsUsed: exceptionsUsedThisRun,
      finished: (streak?.current_day ?? 0) >= REQUIRED_DAYS,
    }
  }, [streak?.streak_start_date, streak?.current_day, exceptionsUsedThisRun])

  const exceptionStatus = useMemo((): ExceptionStatus => {
    const used = exceptionsUsedThisRun
    const remaining = Math.max(0, MAX_EXCEPTIONS_PER_RUN - used)
    const dayBeforeYesterday = addDaysToDateStr(today, -2)
    // Rescue only works when exactly one day was missed (yesterday).
    const canRescueYesterday =
      remaining > 0 &&
      !!streak &&
      (streak.last_perfect_date === dayBeforeYesterday ||
        (streak.last_perfect_date == null && streak.streak_start_date === yesterday))
    const canUseToday =
      remaining > 0 &&
      !!streak &&
      streak.last_perfect_date !== today &&
      todayLog?.is_exception !== true &&
      topTwelve.length > 0
    return { used, remaining, max: MAX_EXCEPTIONS_PER_RUN, canUseToday, canRescueYesterday }
  }, [exceptionsUsedThisRun, streak, today, yesterday, todayLog, topTwelve.length])

  /**
   * Claim an Exception: a whole-day exemption for circumstances outside your
   * control. FREEZES the streak — sets last_perfect_date to the target day
   * without advancing current_day, so the day doesn't count toward the 100
   * but the streak survives. `target: 'yesterday'` rescues a missed day from
   * the failed screen.
   */
  const claimException = useCallback(
    async (
      target: 'today' | 'yesterday',
      category: string,
      note: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!user || !streakRef.current) {
        return { ok: false, error: 'You must be signed in.' }
      }
      const s = streakRef.current
      const runStart = s.streak_start_date
      const used = exceptionDates.filter(d => !runStart || d >= runStart).length
      if (used >= MAX_EXCEPTIONS_PER_RUN) {
        return {
          ok: false,
          error: `You've used all ${MAX_EXCEPTIONS_PER_RUN} exceptions for this run.`,
        }
      }
      const targetDate = target === 'today' ? today : yesterday

      // Record the event first so it syncs across devices; the unique
      // (user_id, log_date) constraint makes double-claims impossible.
      const { error: eventError } = await supabase.from('exception_events').insert({
        user_id: user.id,
        log_date: targetDate,
        category,
        note: note.trim() || null,
      })
      if (eventError) {
        return { ok: false, error: 'Could not save this exception. Please try again.' }
      }
      setExceptionDates(prev => [...prev, targetDate])

      // Mark the day's log as an exception day (preserving journal/checks).
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle()

      if (existingLog) {
        await supabase
          .from('daily_logs')
          .update({ is_exception: true })
          .eq('id', (existingLog as DailyLog).id)
        if (targetDate === today) {
          const updated = { ...(existingLog as DailyLog), is_exception: true }
          setTodayLog(updated)
          todayLogRef.current = updated
        }
      } else {
        const { data: newLog } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            log_date: targetDate,
            completed_item_ids: [],
            all_completed: false,
            is_exception: true,
          })
          .select()
          .single()
        if (newLog && targetDate === today) {
          setTodayLog(newLog as DailyLog)
          todayLogRef.current = newLog as DailyLog
        }
      }

      // Freeze: continuity without advancement.
      const { data: updatedStreak } = await supabase
        .from('streaks')
        .update({
          last_perfect_date: targetDate,
          failed_day: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()
      if (updatedStreak) {
        setStreak(updatedStreak as Streak)
        streakRef.current = updatedStreak as Streak
      }
      setFailedDay(null)

      return { ok: true }
    },
    [user, exceptionDates, today, yesterday],
  )

  const updateItemCaveat = useCallback(
    async (
      itemId: string,
      caveat: string | null,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: 'You must be signed in.' }
      const trimmed = caveat?.trim() ?? ''
      const value = trimmed.length > 0 ? trimmed : null

      const existing = items.find(i => i.id === itemId)
      const hadCaveat = !!existing?.caveat && existing.caveat.trim().length > 0
      // Only adding a brand-new caveat spends an allowance. Editing the text of
      // an existing caveat, or removing one, is always free.
      const isNewCaveat = value !== null && !hadCaveat

      const windowStart = caveatWindowStart(today)
      const inWindow = caveatLog.filter(d => d >= windowStart)

      if (isNewCaveat && inWindow.length >= MAX_CAVEATS_PER_WINDOW) {
        const noun = MAX_CAVEATS_PER_WINDOW === 1 ? 'caveat' : 'caveats'
        return {
          ok: false,
          error: `You can only use ${MAX_CAVEATS_PER_WINDOW} ${noun} per week. It deactivates automatically when the week is over (resets Sunday).`,
        }
      }

      if (isNewCaveat) {
        // Record the allowance spend first so it syncs across devices. If this
        // fails we abort rather than silently granting a free caveat.
        const { error: eventError } = await supabase
          .from('caveat_events')
          .insert({ user_id: user.id, item_id: itemId, log_date: today })
        if (eventError) {
          return { ok: false, error: 'Could not save this caveat. Please try again.' }
        }
        setCaveatLog(prev => [...prev, today])
      }

      await supabase.from('items').update({ caveat: value }).eq('id', itemId)

      setItems(prev =>
        prev.map(item => (item.id === itemId ? { ...item, caveat: value } : item)),
      )

      return { ok: true }
    },
    [user, items, caveatLog, today],
  )

  const reorderItems = useCallback(
    async (reorderedItems: Item[]) => {
      if (!user) return

      const updated = reorderedItems.map((item, i) => ({ ...item, position: i }))
      setItems(updated)

      const updates = updated.map(item =>
        supabase.from('items').update({ position: item.position }).eq('id', item.id),
      )
      await Promise.all(updates)
    },
    [user],
  )

  const resetToSelect = useCallback(async () => {
    if (!user) return
    await supabase
      .from('items')
      .update({ is_top_twelve: false })
      .eq('user_id', user.id)
    await clearLogsPreservingJournals(user.id)
    await supabase
      .from('streaks')
      .update({
        current_day: 0,
        last_perfect_date: null,
        streak_start_date: today,
        failed_day: null,
        advanced_to: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    setAdvancedTo(null)
    setFailedDay(null)
    setSabbathThisWeek(null)

    await loadData()
  }, [user, today, loadData])

  const restartFromFailure = useCallback(async () => {
    await resetToSelect()
  }, [resetToSelect])

  const advanceDay = useCallback(async () => {
    if (!user) return
    // Only advance from the natural day — prevents chaining advances.
    if (today > naturalToday()) return
    const next = addDaysToDateStr(today, 1)
    setAdvancedTo(next)
    await supabase
      .from('streaks')
      .update({ advanced_to: next, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }, [user, today])

  const sabbathStatus = useMemo(() => {
    const weekStart = weekStartStr(today)
    const usedThisWeek = sabbathThisWeek !== null
    const unlocked = (streak?.current_day ?? 0) >= SABBATH_UNLOCK_DAY
    const todayIsSabbath = todayLog?.is_sabbath === true
    const nextAvailable = addDaysToDateStr(weekStart, 7)
    const canTake =
      unlocked &&
      !usedThisWeek &&
      !displayDay.completedToday &&
      topTwelve.length > 0
    return {
      unlocked,
      usedThisWeek,
      todayIsSabbath,
      canTake,
      nextAvailable,
      daysUntilUnlock: Math.max(0, SABBATH_UNLOCK_DAY - (streak?.current_day ?? 0)),
    }
  }, [streak, sabbathThisWeek, todayLog, displayDay.completedToday, topTwelve.length, today])

  const takeSabbath = useCallback(async () => {
    if (!user) return
    if (!streak) return
    if (streak.current_day < SABBATH_UNLOCK_DAY) return
    if (sabbathThisWeek) return
    if (displayDay.completedToday) return
    if (topTwelve.length === 0) return

    const allIds = topTwelve.map(i => i.id)

    const { data: logData } = await supabase
      .from('daily_logs')
      .upsert(
        {
          user_id: user.id,
          log_date: today,
          completed_item_ids: allIds,
          all_completed: true,
          is_sabbath: true,
        },
        { onConflict: 'user_id,log_date' },
      )
      .select()
      .single()

    if (logData) {
      const log = logData as DailyLog
      setTodayLog(log)
      todayLogRef.current = log
    }

    const newDay =
      streak.last_perfect_date === yesterday ? streak.current_day + 1 : 1
    const { data: updatedStreak } = await supabase
      .from('streaks')
      .update({
        current_day: newDay,
        last_perfect_date: today,
        streak_start_date:
          streak.last_perfect_date === yesterday
            ? streak.streak_start_date
            : today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updatedStreak) {
      setStreak(updatedStreak as Streak)
      streakRef.current = updatedStreak as Streak
    }

    setSabbathThisWeek(today)
    setJustCompleted(true)
  }, [user, streak, sabbathThisWeek, displayDay.completedToday, topTwelve, today, yesterday])

  const toggleItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!user) return false

      let log = todayLogRef.current
      if (!log) {
        const { data } = await supabase
          .from('daily_logs')
          .upsert(
            {
              user_id: user.id,
              log_date: today,
              completed_item_ids: [],
              all_completed: false,
            },
            { onConflict: 'user_id,log_date' },
          )
          .select()
          .single()
        log = data as DailyLog
        todayLogRef.current = log
      }

      const currentIds: string[] = log.completed_item_ids ?? []
      const isChecking = !currentIds.includes(itemId)
      const newIds = isChecking
        ? [...currentIds, itemId]
        : currentIds.filter(id => id !== itemId)

      const allDone =
        topTwelve.length > 0 &&
        topTwelve.every(item => newIds.includes(item.id))

      const updatedLog = { ...log, completed_item_ids: newIds, all_completed: allDone }
      todayLogRef.current = updatedLog
      setTodayLog(updatedLog)

      await supabase
        .from('daily_logs')
        .update({ completed_item_ids: newIds, all_completed: allDone })
        .eq('id', log.id)

      if (allDone) {
        setFailedDay(null)
      }

      if (allDone && streakRef.current && streakRef.current.last_perfect_date !== today) {
        const s = streakRef.current
        const newDay = s.last_perfect_date === yesterday ? s.current_day + 1 : 1

        const { data: updated } = await supabase
          .from('streaks')
          .update({
            current_day: newDay,
            last_perfect_date: today,
            streak_start_date: s.last_perfect_date === yesterday ? s.streak_start_date : today,
            failed_day: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single()

        if (updated) {
          setStreak(updated as Streak)
          streakRef.current = updated as Streak
        }
        setJustCompleted(true)
      } else if (allDone) {
        // Already perfect today (e.g. re-check after uncheck): just make sure
        // any lingering failed flag is cleared in the DB.
        await supabase.from('streaks').update({ failed_day: null }).eq('user_id', user.id)
      }

      return isChecking
    },
    [user, today, yesterday, topTwelve],
  )

  return {
    items,
    topTwelve,
    today,
    todayLog,
    streak,
    displayDay,
    phase,
    loading,
    loadError,
    completedIds,
    justCompleted,
    setJustCompleted,
    failedDay,
    saveItems,
    saveTopTwelve,
    updateItemText,
    updateItemCaveat,
    caveatStatus,
    exceptionStatus,
    claimException,
    projectedFinish,
    reorderItems,
    saveJournal,
    getJournalEntries,
    getItemConsecutiveDays,
    toggleItem,
    resetToSelect,
    restartFromFailure,
    advanceDay,
    sabbathStatus,
    takeSabbath,
    reload: loadData,
  }
}
