import { useEffect, useCallback, useRef } from 'react'
import {
  DAY_ROLLOVER_HOUR,
  DEADLINE_WARNING_HOURS,
  hoursUntilRollover,
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

export function useDeadlineNotifications(
  userId: string | undefined,
  active: boolean,
  completedToday: boolean,
) {
  const completedRef = useRef(completedToday)
  completedRef.current = completedToday

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

      if (hour === 0 && minute === 0) {
        const slot = 'midnight'
        if (!wasFired(userId, challengeDate, slot)) {
          markFired(userId, challengeDate, slot)
          showNotification(
            '100 Days of 100% — Day not finished',
            `You haven't completed today's habits. Finish before ${DAY_ROLLOVER_HOUR}:00 AM or you'll start over.`,
          )
        }
      }

      if (minute === 0 && (DEADLINE_WARNING_HOURS as readonly number[]).includes(hour)) {
        const slot = `hour-${hour}`
        if (!wasFired(userId, challengeDate, slot)) {
          markFired(userId, challengeDate, slot)
          const hoursLeft = hoursUntilRollover()
          showNotification(
            '100 Days of 100% — Time running out',
            hoursLeft <= 1
              ? `Less than 1 hour left. Complete every habit before ${DAY_ROLLOVER_HOUR}:00 AM or your progress resets.`
              : `${hoursLeft} hours left. Complete every habit before ${DAY_ROLLOVER_HOUR}:00 AM or your progress resets.`,
          )
        }
      }
    }

    maybeNotify()
    const interval = setInterval(maybeNotify, 60_000)
    return () => clearInterval(interval)
  }, [userId, active, completedToday])

  return { requestPermission }
}
