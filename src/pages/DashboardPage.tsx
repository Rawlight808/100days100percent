import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChallenge, REQUIRED_DAYS } from '../hooks/useChallenge'
import { useCompletionSound } from '../hooks/useCompletionSound'
import { useReminder } from '../hooks/useReminder'
import { getDailyMessage } from '../data/dailyMessages'
import { DayCounter } from '../components/DayCounter'
import { CheckItem } from '../components/CheckItem'
import './DashboardPage.css'

export function DashboardPage() {
  const { signOut } = useAuth()
  const {
    topTwelve,
    todayLog,
    displayDay,
    phase,
    loading,
    completedIds,
    justCompleted,
    setJustCompleted,
    toggleItem,
    resetToSelect,
    advanceDay,
    saveJournal,
    getItemConsecutiveDays,
    updateItemText,
    sabbathStatus,
    takeSabbath,
  } = useChallenge()
  const navigate = useNavigate()
  const { playCheck, playUncheck, playAllComplete } = useCompletionSound()
  const { settings: reminder, permission: notifPerm, enable: enableReminder, disable: disableReminder } = useReminder()

  const [celebrate, setCelebrate] = useState(false)
  const [journal, setJournal] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const journalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reminderHour, setReminderHour] = useState(reminder.hour)
  const [reminderMinute, setReminderMinute] = useState(reminder.minute)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (todayLog?.journal_entry != null) {
      setJournal(todayLog.journal_entry)
    }
  }, [todayLog])

  useEffect(() => {
    if (justCompleted) {
      setCelebrate(true)
      playAllComplete()
      const timer = setTimeout(() => {
        setCelebrate(false)
        setJustCompleted(false)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [justCompleted, playAllComplete, setJustCompleted])

  const handleToggle = useCallback(
    async (itemId: string) => {
      const isCurrentlyChecked = completedIds.has(itemId)
      if (!isCurrentlyChecked) {
        playCheck(completedIds.size, topTwelve.length)
      } else {
        playUncheck()
      }
      await toggleItem(itemId)
    },
    [toggleItem, playCheck, playUncheck, completedIds, topTwelve.length],
  )

  const handleJournalChange = (value: string) => {
    setJournal(value)
    setJournalSaved(false)
    if (journalTimer.current) clearTimeout(journalTimer.current)
    journalTimer.current = setTimeout(async () => {
      await saveJournal(value)
      setJournalSaved(true)
      setTimeout(() => setJournalSaved(false), 2000)
    }, 1500)
  }

  const handleStartEdit = async (itemId: string, text: string) => {
    const days = await getItemConsecutiveDays(itemId)
    if (days < 3) {
      setEditError(`Complete this item ${3 - days} more day${3 - days === 1 ? '' : 's'} in a row before you can change it.`)
      setTimeout(() => setEditError(null), 3000)
      return
    }
    setEditingItemId(itemId)
    setEditText(text)
    setEditError(null)
  }

  const handleSabbath = async () => {
    if (!sabbathStatus.canTake) return
    const ok = window.confirm(
      'Take your sabbath for today? All items will be marked complete and your streak will advance. You can only do this once per week.',
    )
    if (!ok) return
    await takeSabbath()
  }

  const handleCommitEdit = async () => {
    if (!editingItemId || !editText.trim()) return
    await updateItemText(editingItemId, editText.trim())
    setEditingItemId(null)
    setEditText('')
  }

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'select') return <Navigate to="/select" replace />

  const dailyTotal = topTwelve.length
  const completedCount = topTwelve.filter(item => completedIds.has(item.id)).length
  const progressPct = dailyTotal > 0 ? (completedCount / dailyTotal) * 100 : 0

  return (
    <div className="dashboard">
      <div className="dashboard__nav">
        <div className="dashboard__menu-wrap">
          <button
            className="dashboard__nav-btn"
            type="button"
            onClick={() => setMenuOpen(o => !o)}
          >
            Menu {menuOpen ? '▲' : '▼'}
          </button>

          {menuOpen && (
            <div className="dashboard__menu">
              <div className="dashboard__menu-section">
                <h3 className="dashboard__menu-heading">The Rules</h3>
                <ol className="dashboard__rules-list">
                  <li>All items must be completed every day or the 100 days resets.</li>
                  <li>Daily progress must be reported before noon the following day or the 100 days resets.</li>
                  <li>You may change an item on your list after completing it three days in a row.</li>
                  <li>You may take one sabbath day per week after your first three perfect days.</li>
                </ol>
              </div>

              <div className="dashboard__menu-section">
                <h3 className="dashboard__menu-heading">Sabbath</h3>
                <ul className="dashboard__rules-list">
                  <li>One day of rest per calendar week (Sunday through Saturday).</li>
                  <li>Unlocks after your first three perfect days.</li>
                  <li>You do not have to fulfill the tasks on your list.</li>
                  <li>You still cannot do the banned items on your list.</li>
                  <li>The day counts toward your 100 and advances your streak.</li>
                </ul>
              </div>

              <div className="dashboard__menu-section">
                <h3 className="dashboard__menu-heading">Daily Reminder</h3>
                {notifPerm === 'denied' ? (
                  <p className="dashboard__reminder-denied">
                    Notifications are blocked. Enable them in your browser settings.
                  </p>
                ) : reminder.enabled ? (
                  <div className="dashboard__reminder-active">
                    <p>
                      Reminder set for{' '}
                      <strong>
                        {String(reminder.hour).padStart(2, '0')}:
                        {String(reminder.minute).padStart(2, '0')}
                      </strong>
                    </p>
                    <button className="dashboard__reminder-btn" onClick={disableReminder}>
                      Turn Off
                    </button>
                  </div>
                ) : (
                  <div className="dashboard__reminder-setup">
                    <div className="dashboard__reminder-time">
                      <select
                        value={reminderHour}
                        onChange={e => setReminderHour(Number(e.target.value))}
                        className="dashboard__reminder-select"
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
                        className="dashboard__reminder-select"
                      >
                        {[0, 15, 30, 45].map(m => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="dashboard__reminder-btn"
                      onClick={() => enableReminder(reminderHour, reminderMinute)}
                    >
                      Enable Reminder
                    </button>
                  </div>
                )}
              </div>

              <div className="dashboard__menu-section">
                <h3 className="dashboard__menu-heading">Start Over</h3>
                <p className="dashboard__reset-desc">
                  Re-pick your daily habits from your 100 list. Your streak and
                  today&apos;s progress will be reset.
                </p>
                <button
                  className="dashboard__reset-btn"
                  onClick={async () => {
                    await resetToSelect()
                    navigate('/select', { replace: true })
                  }}
                >
                  Reset &amp; Choose Again
                </button>
              </div>
            </div>
          )}
        </div>
        <button className="dashboard__signout" type="button" onClick={signOut}>
          Sign Out
        </button>
      </div>

      <DayCounter
        day={displayDay.day}
        totalDays={REQUIRED_DAYS}
        completedToday={displayDay.completedToday}
        celebrate={celebrate}
      />

      <p className="dashboard__daily-msg">
        {getDailyMessage(displayDay.day)}
      </p>

      <div className="dashboard__progress-section">
        <div className="dashboard__progress-label">
          {completedCount} of {dailyTotal} complete today
        </div>
        <div className="dashboard__progress-bar">
          <div
            className="dashboard__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {!displayDay.completedToday && (
        <div className="dashboard__sabbath">
          <button
            className="dashboard__sabbath-btn"
            type="button"
            onClick={handleSabbath}
            disabled={!sabbathStatus.canTake}
          >
            Take Sabbath
          </button>
          <p className="dashboard__sabbath-hint">
            {!sabbathStatus.unlocked
              ? `Unlocks after ${sabbathStatus.daysUntilUnlock} more perfect day${sabbathStatus.daysUntilUnlock === 1 ? '' : 's'}.`
              : sabbathStatus.usedThisWeek
                ? 'Already used this week. Resets Sunday.'
                : 'One day of rest per week. Checks every item and advances your streak.'}
          </p>
        </div>
      )}

      {displayDay.completedToday && sabbathStatus.todayIsSabbath && (
        <p className="dashboard__sabbath-tag">Today was your sabbath.</p>
      )}

      {editError && (
        <p className="dashboard__edit-error">{editError}</p>
      )}

      <div className="dashboard__items">
        {topTwelve.map((item, i) => {
          if (editingItemId === item.id) {
            return (
              <div key={item.id} className="dashboard__edit-row">
                <input
                  className="dashboard__edit-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCommitEdit()
                    if (e.key === 'Escape') {
                      setEditingItemId(null)
                      setEditText('')
                    }
                  }}
                  autoFocus
                />
                <button className="dashboard__edit-save" onClick={handleCommitEdit}>
                  Save
                </button>
                <button
                  className="dashboard__edit-cancel"
                  onClick={() => { setEditingItemId(null); setEditText('') }}
                >
                  Cancel
                </button>
              </div>
            )
          }
          return (
            <CheckItem
              key={item.id}
              text={item.text}
              checked={completedIds.has(item.id)}
              index={i}
              disabled={displayDay.completedToday}
              onToggle={() => handleToggle(item.id)}
              onEdit={() => handleStartEdit(item.id, item.text)}
            />
          )
        })}
      </div>

      {displayDay.completedToday && (
        <div className="dashboard__complete-msg">
          <div className="dashboard__complete-title">
            {displayDay.day >= REQUIRED_DAYS
              ? 'You did it. 100 days of 100%.'
              : `Day ${displayDay.day} — Complete`}
          </div>
          <div className="dashboard__complete-text">
            {displayDay.day >= REQUIRED_DAYS
              ? 'Incredible. You committed and followed through. This is who you are now.'
              : `Come back tomorrow for Day ${displayDay.day + 1}. You're unstoppable.`}
          </div>
          {displayDay.day < REQUIRED_DAYS && (
            <>
              <button
                className="dashboard__next-day-btn"
                type="button"
                onClick={advanceDay}
              >
                Start Day {displayDay.day + 1}
              </button>
              <p className="dashboard__next-day-hint">
                Or wait — the next day also unlocks automatically at 4:00 AM.
              </p>
            </>
          )}
        </div>
      )}

      <div className="dashboard__journal">
        <h3 className="dashboard__journal-title">
          Daily Journal
          {journalSaved && <span className="dashboard__journal-saved">Saved</span>}
        </h3>
        <textarea
          className="dashboard__journal-textarea"
          placeholder="Reflect on your day — wins, struggles, thoughts…"
          value={journal}
          onChange={e => handleJournalChange(e.target.value)}
        />
      </div>

      {celebrate && (
        <div className="dashboard__celebration" aria-hidden="true">
          <div className="dashboard__celebration-burst" />
        </div>
      )}
    </div>
  )
}
