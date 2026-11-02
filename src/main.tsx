import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

if (Capacitor.isNativePlatform()) {
  void SystemBars.setStyle({ style: SystemBarsStyle.Dark })
  void SplashScreen.hide()
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
