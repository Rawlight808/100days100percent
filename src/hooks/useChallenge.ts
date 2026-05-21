import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  DAY_ROLLOVER_HOUR,
  addDaysToDateStr,
  calendarToday,
  naturalToday,
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
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  completed_item_ids: string[]
  all_completed: boolean
  journal_entry?: string | null
  is_sabbath?: boolean
}

/** Days of perfect completion required before the sabbath unlocks. */
export const SABBATH_UNLOCK_DAY = 3

export interface Streak {
  user_id: string
  current_day: number
  streak_start_date: string | null
  last_perfect_date: string | null
}

export type Phase = 'loading' | 'setup' | 'select' | 'ready' | 'failed'

function advancedStorageKey(userId: string): string {
  return `hundred-days:advanced-to:${userId}`
}

function failedStorageKey(userId: string): string {
  return `hundred-days:failed:${userId}`
}

function loadFailedDay(userId: string): number | null {
  try {
    const raw = localStorage.getItem(failedStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { failedDay?: number }
    return typeof parsed.failedDay === 'number' ? parsed.failedDay : null
  } catch {
    return null
  }
}

function saveFailedDay(userId: string, failedDay: number) {
  localStorage.setItem(failedStorageKey(userId), JSON.stringify({ failedDay }))
}

function clearFailedDay(userId: string) {
  localStorage.removeItem(failedStorageKey(userId))
}

function computeFailedDay(streak: Streak, yesterday: string): number {
  if (streak.last_perfect_date === yesterday) return streak.current_day + 1
  return streak.current_day > 0 ? streak.current_day + 1 : 1
}

function isStreakBroken(
  streak: Streak,
  today: string,
  yesterday: string,
  activeChallenge: boolean,
): boolean {
  if (!activeChallenge) return false
  const pastFirstDay = today > (streak.streak_start_date ?? today)
  const missedPreviousDay = streak.last_perfect_date !== yesterday
  const notCompletedToday = streak.last_perfect_date !== today
  return pastFirstDay && missedPreviousDay && notCompletedToday
}

export function useChallenge() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const [justCompleted, setJustCompleted] = useState(false)
  const [sabbathThisWeek, setSabbathThisWeek] = useState<string | null>(null)
  const [failedDay, setFailedDay] = useState<number | null>(null)

  const todayLogRef = useRef<DailyLog | null>(null)
  const streakRef = useRef<Streak | null>(null)

  const [advancedTo, setAdvancedTo] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return null
  })

  useEffect(() => {
    if (!user) {
      setAdvancedTo(null)
      setFailedDay(null)
      return
    }
    const stored = window.localStorage.getItem(advancedStorageKey(user.id))
    setAdvancedTo(stored)
    setFailedDay(loadFailedDay(user.id))
  }, [user])

  const today = useMemo(() => {
    const natural = naturalToday()
    const calendar = calendarToday()
    const manual = advancedTo && advancedTo > natural ? advancedTo : null
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
    if (!user) return
    setLoading(true)

    const weekStart = weekStartStr(today)

    const [itemsRes, logRes, streakRes, sabbathRes] = await Promise.all([
      supabase.from('items').select('*').eq('user_id', user.id).order('position'),
      supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('daily_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .eq('is_sabbath', true)
        .gte('log_date', weekStart)
        .lte('log_date', today)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    setSabbathThisWeek((sabbathRes.data as { log_date: string } | null)?.log_date ?? null)

    const loadedItems = (itemsRes.data ?? []) as Item[]
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
        .insert({ user_id: user.id, current_day: 0, streak_start_date: today })
        .select()
        .single()
      s = data as Streak
    }

    if (s && activeChallenge && isStreakBroken(s, today, yesterday, activeChallenge)) {
      const day = computeFailedDay(s, yesterday)
      saveFailedDay(user.id, day)
      setFailedDay(day)
    } else if (user) {
      const storedFailed = loadFailedDay(user.id)
      if (storedFailed != null && s && activeChallenge && isStreakBroken(s, today, yesterday, activeChallenge)) {
        setFailedDay(storedFailed)
      } else if (storedFailed != null && s && !isStreakBroken(s, today, yesterday, activeChallenge)) {
        clearFailedDay(user.id)
        setFailedDay(null)
      }
    }

    setStreak(s)
    streakRef.current = s
    setLoading(false)
  }, [user, today, yesterday])

  useEffect(() => {
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
      await supabase.from('daily_logs').delete().eq('user_id', user.id)
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
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

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

  const getItemConsecutiveDays = useCallback(
    async (itemId: string): Promise<number> => {
      if (!user) return 0

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('completed_item_ids, log_date')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(3)

      if (!logs || logs.length === 0) return 0

      let consecutive = 0
      for (const log of logs) {
        const ids: string[] = log.completed_item_ids ?? []
        if (ids.includes(itemId)) {
          consecutive++
        } else {
          break
        }
      }
      return consecutive
    },
    [user],
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
    await supabase.from('daily_logs').delete().eq('user_id', user.id)
    await supabase
      .from('streaks')
      .update({
        current_day: 0,
        last_perfect_date: null,
        streak_start_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    window.localStorage.removeItem(advancedStorageKey(user.id))
    clearFailedDay(user.id)
    setAdvancedTo(null)
    setFailedDay(null)
    setSabbathThisWeek(null)

    await loadData()
  }, [user, today, loadData])

  const restartFromFailure = useCallback(async () => {
    await resetToSelect()
  }, [resetToSelect])

  const advanceDay = useCallback(() => {
    if (!user) return
    const next = addDaysToDateStr(today, 1)
    window.localStorage.setItem(advancedStorageKey(user.id), next)
    setAdvancedTo(next)
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
        clearFailedDay(user.id)
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
      }

      return isChecking
    },
    [user, today, yesterday, topTwelve],
  )

  return {
    items,
    topTwelve,
    todayLog,
    streak,
    displayDay,
    phase,
    loading,
    completedIds,
    justCompleted,
    setJustCompleted,
    failedDay,
    saveItems,
    saveTopTwelve,
    updateItemText,
    reorderItems,
    saveJournal,
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
