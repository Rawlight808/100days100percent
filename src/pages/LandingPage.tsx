import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LandingPage.css'

export function LandingPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (!loading && user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  return (
    <div className="landing">
      <div className="landing__glow" aria-hidden="true" />

      <div className="landing__content">
        <h1 className="landing__title">100 DAYS OF 100%</h1>
        <p className="landing__byline">All in. Every day.</p>

        <div className="landing__actions">
          <button
            type="button"
            className="landing__btn landing__btn--primary"
            onClick={() => navigate('/auth')}
          >
            Get Started
          </button>
        </div>

      </div>
    </div>
  )
}
