import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export type NotePermission = 'granted' | 'denied' | 'default' | 'unsupported'

const DAILY_ID = 1001
const WEEKLY_ID = 3001
const WEEKLY_NOW_ID = 3002
const DEADLINE_HOURS = [0, 1, 2, 3, 8, 9, 10, 11, 23] as const

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

function deadlineId(hour: number): number {
  return 2000 + hour
}

export async function readNotificationPermission(): Promise<NotePermission> {
  if (isNativeApp()) {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return 'granted'
    if (status.display === 'denied') return 'denied'
    return 'default'
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return 'default'
}

export async function askNotificationPermission(): Promise<NotePermission> {
  if (isNativeApp()) {
    const status = await LocalNotifications.requestPermissions()
    if (status.display === 'granted') return 'granted'
    if (status.display === 'denied') return 'denied'
    return 'default'
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  const result = await Notification.requestPermission()
  if (result === 'granted') return 'granted'
  if (result === 'denied') return 'denied'
  return 'default'
}

export async function showDeviceNotification(
  title: string,
  body: string,
  id = WEEKLY_NOW_ID,
): Promise<void> {
  if (isNativeApp()) {
    const perm = await readNotificationPermission()
    if (perm !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 800) },
        },
      ],
    })
    return
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.svg' })
}

export async function setDailyReminder(hour: number, minute: number): Promise<void> {
  if (!isNativeApp()) return
  const perm = await readNotificationPermission()
  if (perm !== 'granted') return
  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_ID,
        title: '100 Days of 100%',
        body: "Don't forget to complete your daily habits. All in. Every day.",
        schedule: { on: { hour, minute }, repeats: true },
      },
    ],
  })
}

export async function clearDailyReminder(): Promise<void> {
  if (!isNativeApp()) return
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] })
}

/** Schedule the next unfinished-day warnings, or clear them when the day is done. */
export async function syncDeadlineNotifications(active: boolean): Promise<void> {
  if (!isNativeApp()) return
  await LocalNotifications.cancel({
    notifications: DEADLINE_HOURS.map(hour => ({ id: deadlineId(hour) })),
  })
  if (!active) return
  const perm = await readNotificationPermission()
  if (perm !== 'granted') return

  const now = Date.now()
  const horizon = now + 16 * 60 * 60 * 1000
  const notifications = DEADLINE_HOURS.flatMap(hour => {
    const at = new Date()
    at.setSeconds(0, 0)
    at.setHours(hour, 0, 0, 0)
    if (at.getTime() <= now + 30_000) at.setDate(at.getDate() + 1)
    if (at.getTime() > horizon) return []
    const morningGrace = hour >= 8 && hour <= 11
    return [
      {
        id: deadlineId(hour),
        title: '100 Days of 100%',
        body: morningGrace
          ? 'Complete every habit by noon or your progress resets.'
          : "You haven't completed today's habits. You have until noon to finish or you'll start over.",
        schedule: { at },
      },
    ]
  })
  if (notifications.length === 0) return
  await LocalNotifications.schedule({ notifications })
}

export async function syncWeeklyReminder(due: boolean, daysLeft: number): Promise<void> {
  if (!isNativeApp()) return
  await LocalNotifications.cancel({ notifications: [{ id: WEEKLY_ID }] })
  if (!due) return
  const perm = await readNotificationPermission()
  if (perm !== 'granted') return

  const at = new Date()
  at.setSeconds(0, 0)
  at.setHours(18, 0, 0, 0)
  if (at.getTime() <= Date.now() + 30_000) {
    if (daysLeft <= 1) return
    at.setDate(at.getDate() + 1)
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: WEEKLY_ID,
        title: 'Weekly goal still open',
        body: 'Do it once before these 7 days end.',
        schedule: { at },
      },
    ],
  })
}
