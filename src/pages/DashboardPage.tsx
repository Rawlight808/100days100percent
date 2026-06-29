import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useChallenge, REQUIRED_DAYS } from '../hooks/useChallenge'
import { useCompletionSound } from '../hooks/useCompletionSound'
import { useDeadlineNotifications } from '../hooks/useDeadlineNotifications'
import { getDailyMessage } from '../data/dailyMessages'
import { DayCounter } from '../components/DayCounter'
import { CheckItem } from '../components/CheckItem'
import { CaveatModal } from '../components/CaveatModal'
import { JournalCalendar } from '../components/JournalCalendar'
import { JournalEntryModal } from '../components/JournalEntryModal'
import { AppNav } from '../components/AppNav'
import './DashboardPage.css'

export function DashboardPage() {
  const { user } = useAuth()
  const {
    topTwelve,
    today,
    todayLog,
    displayDay,
    phase,
    loading,
    loadError,
    reload,
    completedIds,
    justCompleted,
    setJustCompleted,
    toggleItem,
    resetToSelect,
    advanceDay,
    saveJournal,
    getJournalEntries,
    getItemConsecutiveDays,
    updateItemText,
    updateItemCaveat,
    caveatStatus,
    sabbathStatus,
    takeSabbath,
  } = useChallenge()
  const navigate = useNavigate()
  const { playCheck, playUncheck, playAllComplete } = useCompletionSound()
  const { requestPermission: requestDeadlineNotifs } = useDeadlineNotifications(
    user?.id,
    phase === 'ready' && !displayDay.completedToday,
    displayDay.completedToday,
  )

  const [celebrate, setCelebrate] = useState(false)
  const [journal, setJournal] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const journalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [caveatItemId, setCaveatItemId] = useState<string | null>(null)
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({})
  const [viewingDate, setViewingDate] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getJournalEntries().then(entries => {
      if (!cancelled) setJournalEntries(entries)
    })
    return () => {
      cancelled = true
    }
  }, [getJournalEntries])

  useEffect(() => {
    if (todayLog?.journal_entry && todayLog.journal_entry.trim().length > 0) {
      setJournalEntries(prev => ({ ...prev, [today]: todayLog.journal_entry as string }))
    }
  }, [todayLog, today])

  useEffect(() => {
    if (!calendarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalendarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [calendarOpen])

  useEffect(() => {
    if (todayLog?.journal_entry != null) {
      setJournal(todayLog.journal_entry)
    }
  }, [todayLog])

  useEffect(() => {
    if (phase !== 'ready' || displayDay.completedToday) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    void requestDeadlineNotifs()
  }, [phase, displayDay.completedToday, requestDeadlineNotifs])

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

  if (loadError) {
    return (
      <div className="page-error">
        <div className="page-error__card">
          <h1 className="page-error__title">Can't reach the server</h1>
          <p className="page-error__text">
            Check your connection and try again. Your progress is safe.
          </p>
          <button
            type="button"
            className="page-error__btn"
            onClick={() => void reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'setup') return <Navigate to="/setup" replace />
  if (phase === 'select') return <Navigate to="/select" replace />
  if (phase === 'failed') return <Navigate to="/failed" replace />

  const dailyTotal = topTwelve.length
  const completedCount = topTwelve.filter(item => completedIds.has(item.id)).length
  const progressPct = dailyTotal > 0 ? (completedCount / dailyTotal) * 100 : 0

  return (
    <div className="dashboard">
      <AppNav
        onStartOver={async () => {
          await resetToSelect()
          navigate('/select', { replace: true })
        }}
      />

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
              caveat={item.caveat}
              onToggle={() => handleToggle(item.id)}
              onEdit={() => handleStartEdit(item.id, item.text)}
              onCaveat={() => setCaveatItemId(item.id)}
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
          <span className="dashboard__journal-title-text">Daily Journal</span>
          {journalSaved && <span className="dashboard__journal-saved">Saved</span>}
          <button
            type="button"
            className="dashboard__journal-cal-btn"
            title="Browse past entries"
            aria-label="Browse past entries"
            onClick={() => setCalendarOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1.5"
                y="2.75"
                width="13"
                height="11.75"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 1.5v2.5M11 1.5v2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
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

      {caveatItemId && (() => {
        const target = topTwelve.find(i => i.id === caveatItemId)
        if (!target) return null
        return (
          <CaveatModal
            itemText={target.text}
            initialCaveat={target.caveat ?? ''}
            remaining={caveatStatus.remaining}
            max={caveatStatus.max}
            onSave={caveat => updateItemCaveat(target.id, caveat)}
            onRemove={() => updateItemCaveat(target.id, null)}
            onClose={() => setCaveatItemId(null)}
          />
        )
      })()}

      {calendarOpen && (
        <div
          className="dashboard__cal-backdrop"
          onClick={() => setCalendarOpen(false)}
          role="presentation"
        >
          <div
            className="dashboard__cal-popup"
            role="dialog"
            aria-modal="true"
            aria-label="Browse journal entries"
            onClick={e => e.stopPropagation()}
          >
            <div className="dashboard__cal-popup-header">
              <p className="dashboard__cal-popup-label">Past entries</p>
              <button
                type="button"
                className="dashboard__cal-popup-close"
                onClick={() => setCalendarOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <JournalCalendar
              entriesByDate={journalEntries}
              today={today}
              onSelectDate={date => {
                setCalendarOpen(false)
                setViewingDate(date)
              }}
            />
          </div>
        </div>
      )}

      {viewingDate && (
        <JournalEntryModal
          date={viewingDate}
          entry={journalEntries[viewingDate] ?? null}
          onClose={() => setViewingDate(null)}
        />
      )}
    </div>
  )
}
