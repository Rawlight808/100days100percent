import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useReminder } from '../hooks/useReminder'
import { DAY_ROLLOVER_HOUR } from '../lib/challengeDay'
import './AppNav.css'

interface AppNavProps {
  onStartOver?: () => void | Promise<void>
  startOverLabel?: string
  startOverDesc?: string
}

export function AppNav({
  onStartOver,
  startOverLabel = 'Reset & Choose Again',
  startOverDesc = "Re-pick your daily habits from your 100 list. Your streak and today's progress will be reset.",
}: AppNavProps) {
  const { signOut, deleteAccount } = useAuth()
  const {
    settings: reminder,
    permission: notifPerm,
    enable: enableReminder,
    disable: disableReminder,
  } = useReminder()

  const [menuOpen, setMenuOpen] = useState(false)
  const [reminderHour, setReminderHour] = useState(reminder.hour)
  const [reminderMinute, setReminderMinute] = useState(reminder.minute)
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const handleDelete = async () => {
    setDeleteError(null)
    setDeleteStage('deleting')
    const err = await deleteAccount()
    if (err) {
      setDeleteError(err)
      setDeleteStage('confirm')
    }
    // On success the auth state change redirects to the sign-in screen.
  }

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <div className="app-nav">
      <div className="app-nav__menu-wrap" ref={wrapRef}>
        <button
          className="app-nav__btn"
          type="button"
          onClick={() => setMenuOpen(o => !o)}
        >
          Menu {menuOpen ? '▲' : '▼'}
        </button>

        {menuOpen && (
          <div className="app-nav__menu">
            <div className="app-nav__menu-section">
              <h3 className="app-nav__menu-heading">The Rules</h3>
              <ol className="app-nav__rules-list">
                <li>All items must be completed every day or you start over from Day 1.</li>
                <li>
                  Each challenge day ends at {DAY_ROLLOVER_HOUR}:00 AM. Miss one day and
                  your progress resets — no exceptions.
                </li>
                <li>You may change an item on your list after completing it three days in a row.</li>
                <li>You may take one sabbath day per week after your first three perfect days.</li>
              </ol>
            </div>

            <div className="app-nav__menu-section">
              <h3 className="app-nav__menu-heading">Sabbath</h3>
              <ul className="app-nav__rules-list">
                <li>One day of rest per calendar week (Sunday through Saturday).</li>
                <li>Unlocks after your first three perfect days.</li>
                <li>You do not have to fulfill the tasks on your list.</li>
                <li>You still cannot do the banned items on your list.</li>
                <li>The day counts toward your 100 and advances your streak.</li>
              </ul>
            </div>

            <div className="app-nav__menu-section">
              <h3 className="app-nav__menu-heading">Deadline Alerts</h3>
              <p className="app-nav__muted">
                {notifPerm === 'granted'
                  ? 'Active: midnight warning plus hourly alerts from 11 PM–3 AM if today is incomplete.'
                  : notifPerm === 'denied'
                    ? 'Enable notifications in browser settings for midnight and late-night deadline alerts.'
                    : 'Allow notifications when prompted — you will get a midnight warning and hourly alerts in the last 5 hours before the day ends.'}
              </p>
            </div>

            <div className="app-nav__menu-section">
              <h3 className="app-nav__menu-heading">Daily Reminder</h3>
              {notifPerm === 'denied' ? (
                <p className="app-nav__muted">
                  Notifications are blocked. Enable them in your browser settings.
                </p>
              ) : reminder.enabled ? (
                <div className="app-nav__reminder-active">
                  <p>
                    Reminder set for{' '}
                    <strong>
                      {String(reminder.hour).padStart(2, '0')}:
                      {String(reminder.minute).padStart(2, '0')}
                    </strong>
                  </p>
                  <button className="app-nav__reminder-btn" onClick={disableReminder}>
                    Turn Off
                  </button>
                </div>
              ) : (
                <div className="app-nav__reminder-setup">
                  <div className="app-nav__reminder-time">
                    <select
                      value={reminderHour}
                      onChange={e => setReminderHour(Number(e.target.value))}
                      className="app-nav__reminder-select"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span>:</span>
                    <select
                      value={reminderMinute}
                      onChange={e => setReminderMinute(Number(e.target.value))}
                      className="app-nav__reminder-select"
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="app-nav__reminder-btn"
                    onClick={() => enableReminder(reminderHour, reminderMinute)}
                  >
                    Enable Reminder
                  </button>
                </div>
              )}
            </div>

            {onStartOver && (
              <div className="app-nav__menu-section">
                <h3 className="app-nav__menu-heading">Start Over</h3>
                <p className="app-nav__muted">{startOverDesc}</p>
                <button
                  className="app-nav__reset-btn"
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false)
                    await onStartOver()
                  }}
                >
                  {startOverLabel}
                </button>
              </div>
            )}

            <div className="app-nav__menu-section">
              <h3 className="app-nav__menu-heading">Delete Account</h3>
              {deleteStage === 'idle' ? (
                <>
                  <p className="app-nav__muted">
                    Permanently delete your account and all of your data. This
                    cannot be undone.
                  </p>
                  <button
                    className="app-nav__delete-btn"
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteStage('confirm')
                    }}
                  >
                    Delete Account
                  </button>
                </>
              ) : (
                <>
                  <p className="app-nav__muted">
                    This erases your 100 items, daily logs, streak, and journal
                    entries — permanently. Are you sure?
                  </p>
                  {deleteError && (
                    <p className="app-nav__delete-error">{deleteError}</p>
                  )}
                  <div className="app-nav__delete-actions">
                    <button
                      className="app-nav__delete-btn"
                      type="button"
                      disabled={deleteStage === 'deleting'}
                      onClick={handleDelete}
                    >
                      {deleteStage === 'deleting'
                        ? 'Deleting…'
                        : 'Yes, delete everything'}
                    </button>
                    <button
                      className="app-nav__reminder-btn"
                      type="button"
                      disabled={deleteStage === 'deleting'}
                      onClick={() => {
                        setDeleteStage('idle')
                        setDeleteError(null)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <button className="app-nav__btn" type="button" onClick={signOut}>
        Sign Out
      </button>
    </div>
  )
}
