import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  weeklyGoalPeriods,
  weeklyGoalWindow,
  type WeeklyGoalPeriod,
  type WeeklyGoalWindow,
} from '../lib/challengeDay'

const FIRED_PREFIX = 'hundred-days:weekly-goal-fired'

export interface WeeklyGoalView {
  id: string
  text: string
  startedOn: string
  /** True only when the current 7-day block has been fulfilled. */
  done: boolean
  window: WeeklyGoalWindow
  /** First block through the current block. A finished block stays done or missed. */
  periods: WeeklyGoalPeriod[]
}

interface GoalRow {
  id: string
  text: string
  started_on: string
  position: number
}

interface CompletionRow {
  goal_id: string
  window_start: string
}

function firedKey(userId: string, challengeDate: string): string {
  return `${FIRED_PREFIX}:${userId}:${challengeDate}`
}

function reminderBody(goals: WeeklyGoalView[]): string {
  const parts = goals.slice(0, 3).map(goal => {
    const left = goal.window.daysLeft <= 1 ? 'last day' : `${goal.window.daysLeft} days left`
    return `${goal.text} (${left})`
  })
  const more = goals.length > 3 ? `, and ${goals.length - 3} more` : ''
  return `${parts.join(', ')}${more}. Do it once before these 7 days end.`
}

export function useWeeklyGoals(userId: string | undefined, today: string) {
  const [rows, setRows] = useState<GoalRow[]>([])
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    const [goalsRes, compRes] = await Promise.all([
      supabase
        .from('weekly_goals')
        .select('id, text, started_on, position')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('weekly_goal_completions')
        .select('goal_id, window_start')
        .eq('user_id', userId),
    ])

    const missing =
      goalsRes.error?.code === 'PGRST205' ||
      goalsRes.error?.code === '42P01' ||
      compRes.error?.code === 'PGRST205' ||
      compRes.error?.code === '42P01'

    if (missing) {
      setSchemaMissing(true)
      setRows([])
      setCompletions([])
      setLoading(false)
      return
    }

    if (goalsRes.error || compRes.error) {
      setError('Could not load weekly goals.')
      setLoading(false)
      return
    }

    setSchemaMissing(false)
    setError(null)
    setRows((goalsRes.data ?? []) as GoalRow[])
    setCompletions((compRes.data ?? []) as CompletionRow[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // Refetch when the challenge day changes so the next 7-day block is current.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load, today])

  const goals = useMemo((): WeeklyGoalView[] => {
    const startsByGoal = new Map<string, string[]>()
    for (const row of completions) {
      const list = startsByGoal.get(row.goal_id) ?? []
      list.push(row.window_start)
      startsByGoal.set(row.goal_id, list)
    }
    return rows.map(row => {
      const periods = weeklyGoalPeriods(row.started_on, today, startsByGoal.get(row.id) ?? [])
      const current = periods[periods.length - 1]
      return {
        id: row.id,
        text: row.text,
        startedOn: row.started_on,
        done: current?.done ?? false,
        window: weeklyGoalWindow(row.started_on, today),
        periods,
      }
    })
  }, [rows, completions, today])

  const dueGoals = useMemo(
    () => goals.filter(goal => !goal.done && goal.window.inReminderStretch),
    [goals],
  )

  useEffect(() => {
    if (!userId || dueGoals.length === 0) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const key = firedKey(userId, today)
    if (localStorage.getItem(key) === '1') return
    localStorage.setItem(key, '1')
    const title = dueGoals.length === 1 ? 'Weekly goal still open' : 'Weekly goals still open'
    new Notification(title, { body: reminderBody(dueGoals), icon: '/favicon.svg' })
  }, [userId, today, dueGoals])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported' as const
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && userId && dueGoals.length > 0) {
      const key = firedKey(userId, today)
      if (localStorage.getItem(key) !== '1') {
        localStorage.setItem(key, '1')
        const title = dueGoals.length === 1 ? 'Weekly goal still open' : 'Weekly goals still open'
        new Notification(title, { body: reminderBody(dueGoals), icon: '/favicon.svg' })
      }
    }
    return result
  }, [userId, today, dueGoals])

  const addGoal = useCallback(
    async (text: string): Promise<{ ok: boolean; error?: string }> => {
      if (!userId) return { ok: false, error: 'You must be signed in.' }
      const trimmed = text.trim()
      if (!trimmed) return { ok: false, error: 'Write the goal first.' }
      if (trimmed.length > 200) return { ok: false, error: 'Keep the goal under 200 characters.' }

      const position = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1
      const { data, error: insertError } = await supabase
        .from('weekly_goals')
        .insert({
          user_id: userId,
          text: trimmed,
          started_on: today,
          position,
        })
        .select('id, text, started_on, position')
        .single()

      if (insertError || !data) {
        return { ok: false, error: 'Could not add that goal. Please try again.' }
      }
      setRows(prev => [...prev, data as GoalRow])
      setError(null)
      return { ok: true }
    },
    [userId, today, rows],
  )

  const toggleGoal = useCallback(
    async (goalId: string) => {
      if (!userId || busyId) return
      const goal = goals.find(item => item.id === goalId)
      if (!goal) return
      setBusyId(goalId)
      setError(null)

      if (goal.done) {
        const { error: deleteError } = await supabase
          .from('weekly_goal_completions')
          .delete()
          .eq('user_id', userId)
          .eq('goal_id', goalId)
          .eq('window_start', goal.window.start)
        setBusyId(null)
        if (deleteError) {
          setError('Could not update that goal.')
          return
        }
        setCompletions(prev =>
          prev.filter(row => !(row.goal_id === goalId && row.window_start === goal.window.start)),
        )
        return
      }

      const { error: insertError } = await supabase.from('weekly_goal_completions').insert({
        user_id: userId,
        goal_id: goalId,
        window_start: goal.window.start,
        completed_on: today,
      })
      setBusyId(null)
      if (insertError && insertError.code !== '23505') {
        setError('Could not update that goal.')
        return
      }
      setCompletions(prev => {
        const key = `${goalId}:${goal.window.start}`
        if (prev.some(row => `${row.goal_id}:${row.window_start}` === key)) return prev
        return [...prev, { goal_id: goalId, window_start: goal.window.start }]
      })
    },
    [userId, busyId, goals, today],
  )

  const removeGoal = useCallback(
    async (goalId: string) => {
      if (!userId || busyId) return
      setBusyId(goalId)
      setError(null)
      const { error: deleteError } = await supabase
        .from('weekly_goals')
        .delete()
        .eq('user_id', userId)
        .eq('id', goalId)
      setBusyId(null)
      if (deleteError) {
        setError('Could not remove that goal.')
        return
      }
      setRows(prev => prev.filter(row => row.id !== goalId))
      setCompletions(prev => prev.filter(row => row.goal_id !== goalId))
    },
    [userId, busyId],
  )

  return {
    goals,
    dueGoals,
    loading,
    schemaMissing,
    error,
    busyId,
    permission,
    addGoal,
    toggleGoal,
    removeGoal,
    requestPermission,
  }
}
