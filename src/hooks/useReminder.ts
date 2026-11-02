import { useState, useEffect, useCallback } from 'react'
import {
  askNotificationPermission,
  clearDailyReminder,
  isNativeApp,
  readNotificationPermission,
  setDailyReminder,
} from '../lib/nativeApp'

const STORAGE_KEY = 'hundred-days-reminder'

interface ReminderSettings {
  enabled: boolean
  hour: number
  minute: number
}

const DEFAULT: ReminderSettings = { enabled: false, hour: 20, minute: 0 }

function load(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function useReminder(active = true) {
  const [settings, setSettings] = useState<ReminderSettings>(load)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )

  useEffect(() => {
    void readNotificationPermission().then(result => {
      setPermission(result === 'unsupported' ? 'denied' : result)
    })
  }, [])

  const save = useCallback((next: ReminderSettings) => {
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const requestPermission = useCallback(async () => {
    const result = await askNotificationPermission()
    const next: NotificationPermission = result === 'unsupported' ? 'denied' : result
    setPermission(next)
    return next
  }, [])

  const enable = useCallback(
    async (hour: number, minute: number) => {
      let perm = permission
      if (perm !== 'granted') {
        perm = await requestPermission()
      }
      if (perm === 'granted') {
        save({ enabled: true, hour, minute })
      }
      return perm
    },
    [permission, requestPermission, save],
  )

  const disable = useCallback(() => {
    save({ ...settings, enabled: false })
    if (isNativeApp()) void clearDailyReminder()
  }, [settings, save])

  useEffect(() => {
    if (!isNativeApp()) return
    if (!settings.enabled) {
      void clearDailyReminder()
      return
    }
    if (!active) {
      void clearDailyReminder()
      return
    }
    void setDailyReminder(settings.hour, settings.minute)
  }, [active, settings.enabled, settings.hour, settings.minute])

  useEffect(() => {
    if (isNativeApp()) return
    if (!active || !settings.enabled || permission !== 'granted') return

    const check = () => {
      const now = new Date()
      if (now.getHours() === settings.hour && now.getMinutes() === settings.minute) {
        new Notification('100 Days of 100%', {
          body: "Don't forget to complete your daily habits. All in. Every day.",
          icon: '/favicon.svg',
        })
      }
    }

    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [active, settings, permission])

  return { settings, permission, enable, disable }
}
