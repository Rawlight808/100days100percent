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

        <div className="landing__rules">
          <div className="landing__rule">
            <span className="landing__rule-num">1</span>
            Miss one item and you start over.
          </div>
          <div className="landing__rule">
            <span className="landing__rule-num">2</span>
            Record progress before noon the next day — or start over.
          </div>
          <div className="landing__rule">
            <span className="landing__rule-num">3</span>
            You may change an item after completing it three days in a row.
          </div>
        </div>
      </div>
    </div>
  )
}
