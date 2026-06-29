import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Top-level safety net: any uncaught render error shows a recoverable screen
 * instead of a blank white page. Reloading remounts the whole tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <h1 className="error-boundary__title">Something went wrong</h1>
            <p className="error-boundary__text">
              The app hit an unexpected error. Your progress is saved — reloading
              usually fixes it.
            </p>
            <button
              type="button"
              className="error-boundary__btn"
              onClick={this.handleReload}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
