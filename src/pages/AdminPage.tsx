import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase, isAdminEmail } from '../lib/supabase'
import { naturalToday, addDaysToDateStr } from '../lib/challengeDay'
import './AdminPage.css'

interface UserStatus {
  user_id: string
  email: string
  current_day: number
  streak_start_date: string | null
  last_perfect_date: string | null
  items_count: number
  top_twelve_count: number
}

interface AdminUserRow extends UserStatus {
  created_at: string
  failed_day: number | null
  share_items_with_coach: boolean
}

interface SharedItem {
  id: string
  text: string
  position: number
  caveat: string | null
}

/** Human status for a user's streak, from the admin's local challenge day. */
function dayLabel(row: AdminUserRow): string {
  const today = naturalToday()
  const yesterday = addDaysToDateStr(today, -1)
  if (row.items_count === 0) return 'Setup'
  if (row.top_twelve_count === 0) return 'Selecting'
  if (row.failed_day != null) return `Failed on Day ${row.failed_day}`
  if (row.last_perfect_date === today) return `Day ${row.current_day} ✓ done today`
  if (row.last_perfect_date === yesterday)
    return `Day ${row.current_day + 1} — in progress`
  if (row.current_day > 0) return `Day ${row.current_day + 1} — at risk`
  return 'Day 1 — not started'
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [lookupEmail, setLookupEmail] = useState('')
  const [target, setTarget] = useState<UserStatus | null>(null)
  const [newDay, setNewDay] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([])
  const [itemsError, setItemsError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return
    let cancelled = false
    void supabase.rpc('admin_list_users').then(({ data, error: rpcError }) => {
      if (cancelled) return
      if (rpcError) {
        setUsersError(rpcError.message)
      } else {
        setUsers((data ?? []) as AdminUserRow[])
      }
      setUsersLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const handleViewItems = async (row: AdminUserRow) => {
    if (expandedUserId === row.user_id) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(row.user_id)
    setSharedItems([])
    setItemsError(null)
    const { data, error: rpcError } = await supabase.rpc('admin_get_user_items', {
      target_user: row.user_id,
    })
    if (rpcError) {
      setItemsError(rpcError.message)
      return
    }
    setSharedItems((data ?? []) as SharedItem[])
  }

  const handleManage = (row: AdminUserRow) => {
    setError(null)
    setSuccess(null)
    setLookupEmail(row.email)
    setTarget(row)
    setNewDay(String(row.last_perfect_date ? row.current_day + 1 : 1))
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  if (authLoading) {
    return <div className="page-loading">Loading…</div>
  }

  if (!user) return <Navigate to="/auth" replace />
  if (!isAdminEmail(user.email)) return <Navigate to="/" replace />

  const displayDay = (status: UserStatus): number => {
    if (!status.last_perfect_date) return 1
    return status.current_day + 1
  }

  const handleLookup = async () => {
    setError(null)
    setSuccess(null)
    setTarget(null)
    setNewDay('')

    const trimmed = lookupEmail.trim()
    if (!trimmed) {
      setError('Enter an email to look up.')
      return
    }

    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('admin_get_user_status', {
      target_email: trimmed,
    })
    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const row = (data ?? [])[0] as UserStatus | undefined
    if (!row) {
      setError(`No user found with email "${trimmed}".`)
      return
    }

    setTarget(row)
    setNewDay(String(displayDay(row)))
  }

  const handleApply = async () => {
    if (!target) return
    setError(null)
    setSuccess(null)

    const day = Number.parseInt(newDay, 10)
    if (!Number.isInteger(day) || day < 1 || day > 100) {
      setError('New day must be an integer between 1 and 100.')
      return
    }

    const confirmed = window.confirm(
      `Set ${target.email} to Day ${day}? They will see Day ${day} on next refresh, with nothing checked yet. Past daily logs will be left alone.`,
    )
    if (!confirmed) return

    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('admin_set_user_day', {
      target_user: target.user_id,
      new_day: day,
      client_today: naturalToday(),
    })
    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const row = (data ?? [])[0] as
      | { user_id: string; current_day: number; streak_start_date: string; last_perfect_date: string | null }
      | undefined

    if (row) {
      setTarget({
        ...target,
        current_day: row.current_day,
        streak_start_date: row.streak_start_date,
        last_perfect_date: row.last_perfect_date,
      })
    }
    setSuccess(`Set ${target.email} to Day ${day}.`)
  }

  return (
    <div className="admin">
      <div className="admin__header">
        <button
          type="button"
          className="admin__back"
          onClick={() => navigate('/dashboard')}
        >
          ← Back
        </button>
        <h1 className="admin__title">Admin</h1>
        <p className="admin__subtitle">
          Override a user's challenge day. Signed in as {user.email}.
        </p>
      </div>

      <section className="admin__section">
        <h2 className="admin__section-title">All users</h2>
        {usersLoading ? (
          <p className="admin__muted">Loading users…</p>
        ) : usersError ? (
          <p className="admin__error">{usersError}</p>
        ) : users.length === 0 ? (
          <p className="admin__muted">No users yet.</p>
        ) : (
          <div className="admin__users">
            <div className="admin__users-row admin__users-row--head">
              <span>Email</span>
              <span>Status</span>
              <span>List</span>
              <span />
            </div>
            {users.map(row => (
              <div key={row.user_id}>
                <div className="admin__users-row">
                  <span className="admin__users-email" title={row.user_id}>
                    {row.email}
                  </span>
                  <span className="admin__users-day">{dayLabel(row)}</span>
                  <span>
                    {row.share_items_with_coach ? (
                      <button
                        type="button"
                        className="admin__link-btn"
                        onClick={() => handleViewItems(row)}
                      >
                        {expandedUserId === row.user_id
                          ? 'Hide list'
                          : `View list (${row.top_twelve_count})`}
                      </button>
                    ) : (
                      <span className="admin__muted">Private</span>
                    )}
                  </span>
                  <span>
                    <button
                      type="button"
                      className="admin__link-btn"
                      onClick={() => handleManage(row)}
                    >
                      Manage
                    </button>
                  </span>
                </div>
                {expandedUserId === row.user_id && (
                  <div className="admin__users-items">
                    {itemsError ? (
                      <p className="admin__error">{itemsError}</p>
                    ) : sharedItems.length === 0 ? (
                      <p className="admin__muted">Loading…</p>
                    ) : (
                      <ol className="admin__users-items-list">
                        {sharedItems.map(item => (
                          <li key={item.id}>
                            {item.text}
                            {item.caveat && (
                              <span className="admin__users-caveat">
                                {' '}
                                — caveat: {item.caveat}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin__section">
        <label className="admin__label" htmlFor="lookup">
          Look up user by email
        </label>
        <div className="admin__row">
          <input
            id="lookup"
            type="email"
            className="admin__input"
            placeholder="user@example.com"
            value={lookupEmail}
            onChange={e => setLookupEmail(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleLookup()
            }}
            autoComplete="off"
          />
          <button
            type="button"
            className="admin__btn"
            onClick={handleLookup}
            disabled={busy || !lookupEmail.trim()}
          >
            {busy ? 'Working…' : 'Look up'}
          </button>
        </div>
      </section>

      {error && <p className="admin__error">{error}</p>}
      {success && <p className="admin__success">{success}</p>}

      {target && (
        <section className="admin__section admin__card">
          <h2 className="admin__card-title">{target.email}</h2>
          <dl className="admin__details">
            <dt>User ID</dt>
            <dd className="admin__mono">{target.user_id}</dd>

            <dt>Current display day</dt>
            <dd>{displayDay(target)}</dd>

            <dt>Stored current_day</dt>
            <dd>{target.current_day}</dd>

            <dt>Streak start</dt>
            <dd>{target.streak_start_date ?? '—'}</dd>

            <dt>Last perfect day</dt>
            <dd>{target.last_perfect_date ?? '—'}</dd>

            <dt>Items / Top picks</dt>
            <dd>
              {target.items_count} / {target.top_twelve_count}
            </dd>
          </dl>

          <div className="admin__apply">
            <label className="admin__label" htmlFor="newDay">
              Set new day (1–100)
            </label>
            <div className="admin__row">
              <input
                id="newDay"
                type="number"
                min={1}
                max={100}
                className="admin__input admin__input--narrow"
                value={newDay}
                onChange={e => setNewDay(e.target.value)}
              />
              <button
                type="button"
                className="admin__btn admin__btn--primary"
                onClick={handleApply}
                disabled={busy || !newDay}
              >
                {busy ? 'Working…' : 'Apply'}
              </button>
            </div>
            <p className="admin__hint">
              The user will see "Day N, nothing checked yet" on their next page
              load. Past daily logs are left alone.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
