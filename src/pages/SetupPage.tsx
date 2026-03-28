import { useState, useMemo, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useChallenge, REQUIRED_ITEMS } from '../hooks/useChallenge'
import { useAuth } from '../contexts/AuthContext'
import './SetupPage.css'

function getDraftStorageKey(userId: string) {
  return `hundred-days:setup-draft:${userId}`
}

export function SetupPage() {
  const { user } = useAuth()
  const { items, phase, loading, saveItems } = useChallenge()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const didHydrateDraft = useRef(false)

  const draftStorageKey = user ? getDraftStorageKey(user.id) : null

  useEffect(() => {
    if (loading || didHydrateDraft.current) return

    if (items.length > 0) {
      setText(items.map(i => i.text).join('\n'))
    } else if (draftStorageKey) {
      const savedDraft = window.localStorage.getItem(draftStorageKey)
      if (savedDraft) setText(savedDraft)
    }

    didHydrateDraft.current = true
  }, [draftStorageKey, items, loading])

  useEffect(() => {
    if (!didHydrateDraft.current || !draftStorageKey) return

    if (text.trim().length === 0) {
      window.localStorage.removeItem(draftStorageKey)
      return
    }

    window.localStorage.setItem(draftStorageKey, text)
  }, [draftStorageKey, text])

  const lines = useMemo(
    () => text.split('\n').filter(l => l.trim().length > 0),
    [text],
  )

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (phase === 'ready') return <Navigate to="/dashboard" replace />

  const pct = Math.min(100, (lines.length / REQUIRED_ITEMS) * 100)

  const stuckHint =
    lines.length === 0
      ? null
      : lines.length < 35
        ? 'first'
        : lines.length < 70
          ? 'middle'
          : lines.length < REQUIRED_ITEMS
            ? 'almost'
            : null

  const handleSave = async () => {
    if (lines.length < REQUIRED_ITEMS) return
    setSaving(true)
    await saveItems(lines.slice(0, REQUIRED_ITEMS).map(l => l.trim()))
    if (draftStorageKey) window.localStorage.removeItem(draftStorageKey)
    setSaving(false)
    navigate('/select')
  }

  return (
    <div className="setup">
      <div className="setup__header">
        <h1 className="setup__title">Build Your 100 List</h1>
        <p className="setup__subtitle">
          Write 100 things that would genuinely improve your life. One per line. Be
          specific, be honest, dream big. This is the first challenge — it&apos;s a
          lot on purpose. It&apos;s achievable if you dig deep and get creative.
        </p>
      </div>

      <aside className="setup__encourage" aria-label="Ideas and encouragement">
        <p className="setup__encourage-lead">
          Feeling stuck? That&apos;s normal. The point isn&apos;t perfection — it&apos;s
          noticing what would actually move your life forward.
        </p>
        <p className="setup__encourage-title">Ideas to spark your list</p>
        <ul className="setup__encourage-list">
          <li>Walk barefoot on grass or sand for a few minutes</li>
          <li>Call a friend you haven&apos;t talked to in a while</li>
          <li>Ask someone if they need help with something small</li>
          <li>Clean or tidy one space for 10 minutes</li>
          <li>Drink a full glass of water before coffee</li>
          <li>Write down three things you&apos;re grateful for</li>
          <li>Stretch for 5 minutes before bed</li>
          <li>Read 10 pages of a book that challenges you</li>
          <li>Send a message thanking someone who helped you</li>
          <li>Take a short walk with no phone</li>
        </ul>
      </aside>

      <div className="setup__counter">
        {lines.length}
        <span className="setup__counter-dim"> / {REQUIRED_ITEMS}</span>
        <span className="setup__counter-label">items added</span>
      </div>

      <div className="setup__progress">
        <div className="setup__progress-bar" style={{ width: `${pct}%` }} />
      </div>

      <textarea
        className="setup__textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={
          '1. Wake up at 6 am every day\n2. Meditate for 10 minutes\n3. Exercise for 30 minutes\n4. Read for 20 minutes\n5. Drink 8 glasses of water\n…\n\nPaste your full list or type one item per line'
        }
        spellCheck
      />

      <div className="setup__actions">
        <button
          className="setup__btn"
          disabled={lines.length < REQUIRED_ITEMS || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>

      <p className="setup__draft-note">Your draft saves automatically on this device.</p>

      {lines.length > 0 && lines.length < REQUIRED_ITEMS && (
        <p className="setup__hint">
          {REQUIRED_ITEMS - lines.length} more to go — you&apos;ve got this.
        </p>
      )}
      {stuckHint === 'first' && (
        <p className="setup__hint setup__hint--warm">
          One hundred sounds like a lot — that&apos;s the point. Small habits count.
          Mix easy wins with stretch goals.
        </p>
      )}
      {stuckHint === 'middle' && (
        <p className="setup__hint setup__hint--warm">
          You&apos;re building momentum. Keep going — variety is fine: health,
          relationships, skills, fun.
        </p>
      )}
      {stuckHint === 'almost' && (
        <p className="setup__hint setup__hint--warm">
          Almost there. Scan your list: anything missing — rest, play, courage?
        </p>
      )}
      {lines.length >= REQUIRED_ITEMS && (
        <p className="setup__hint setup__hint--ready">
          Ready! Click Save &amp; Continue to proceed.
        </p>
      )}
    </div>
  )
}
