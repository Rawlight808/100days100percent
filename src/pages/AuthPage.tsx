import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AuthPage.css'

export function AuthPage() {
  const { user, loading, signUp, signIn } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    const err =
      mode === 'signup' ? await signUp(email, password) : await signIn(email, password)
    setSubmitting(false)

    if (err) {
      setError(err)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">100 DAYS OF 100%</h1>
        <p className="auth__byline">The art of full comittment.</p>

        <div className="auth__rules">
          <div className="auth__rule">
            <span className="auth__rule-num">1</span>
            <span>Write 100 things that would improve your life</span>
          </div>
          <div className="auth__rule">
            <span className="auth__rule-num">2</span>
            <span>Choose 10–20 that matter most</span>
          </div>
          <div className="auth__rule">
            <span className="auth__rule-num">3</span>
            <span>Complete all of them every day for 100 days</span>
          </div>
          <div className="auth__rule">
            <span className="auth__rule-num">4</span>
            <span>Miss even one - you start over at Day 1</span>
          </div>
        </div>

        <div className="auth__toggle">
          <button
            type="button"
            className={`auth__toggle-btn ${mode === 'signin' ? 'auth__toggle-btn--active' : ''}`}
            onClick={() => {
              setMode('signin')
              setError(null)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth__toggle-btn ${mode === 'signup' ? 'auth__toggle-btn--active' : ''}`}
            onClick={() => {
              setMode('signup')
              setError(null)
            }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth__input"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className="auth__input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signup' && (
            <input
              type="password"
              className="auth__input"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          )}
          {error && <p className="auth__error">{error}</p>}
          <button type="submit" className="auth__submit" disabled={submitting}>
            {submitting ? '…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
