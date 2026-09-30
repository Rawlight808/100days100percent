import { useEffect, useCallback, useRef } from 'react'
import {
  DEADLINE_WARNING_HOURS,
  FAIL_DEADLINE_HOUR,
  FAIL_GRACE_WARNING_HOURS,
  hoursUntilFailDeadline,
  naturalToday,
} from '../lib/challengeDay'

const FIRED_PREFIX = 'hundred-days:deadline-fired'

function firedKey(userId: string, challengeDate: string, slot: string): string {
  return `${FIRED_PREFIX}:${userId}:${challengeDate}:${slot}`
}

function wasFired(userId: string, challengeDate: string, slot: string): boolean {
  return localStorage.getItem(firedKey(userId, challengeDate, slot)) === '1'
}

function markFired(userId: string, challengeDate: string, slot: string): void {
  localStorage.setItem(firedKey(userId, challengeDate, slot), '1')
}

function showNotification(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.svg' })
}

function failDeadlineCopy(hoursLeft: number): string {
  if (hoursLeft <= 1) {
    return `Less than 1 hour left. Complete every habit by noon or your progress resets.`
  }
  return `${hoursLeft} hours left. Complete every habit by noon or your progress resets.`
}

export function useDeadlineNotifications(
  userId: string | undefined,
  active: boolean,
  completedToday: boolean,
) {
  const completedRef = useRef(completedToday)
  useEffect(() => {
    completedRef.current = completedToday
  }, [completedToday])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as const
    return Notification.requestPermission()
  }, [])

  useEffect(() => {
    if (!userId || !active || completedToday) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const challengeDate = naturalToday()

    const maybeNotify = () => {
      if (completedRef.current) return

      const now = new Date()
      const hour = now.getHours()
      const minute = now.getMinutes()
      const hoursLeft = hoursUntilFailDeadline(now)

      if (hour === 0 && minute === 0) {
        const slot = 'midnight'
        if (!wasFired(userId, challengeDate, slot)) {
          markFired(userId, challengeDate, slot)
          showNotification(
            '100 Days of 100% — Day not finished',
            `You haven't completed today's habits. You have until noon to finish or you'll start over.`,
          )
        }
      }

      const warningHours = [
        ...(DEADLINE_WARNING_HOURS as readonly number[]),
        ...(FAIL_GRACE_WARNING_HOURS as readonly number[]),
      ]
      if (minute === 0 && warningHours.includes(hour) && hour < FAIL_DEADLINE_HOUR) {
        const slot = `hour-${hour}`
        if (!wasFired(userId, challengeDate, slot)) {
          markFired(userId, challengeDate, slot)
          showNotification('100 Days of 100% — Time running out', failDeadlineCopy(hoursLeft))
        }
      }
    }

    maybeNotify()
    const interval = setInterval(maybeNotify, 60_000)
    return () => clearInterval(interval)
  }, [userId, active, completedToday])

  return { requestPermission }
}
