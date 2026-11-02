import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { SetupPage } from './pages/SetupPage'
import { SelectPage } from './pages/SelectPage'
import { StartPage } from './pages/StartPage'
import { DashboardPage } from './pages/DashboardPage'
import { FailedDayPage } from './pages/FailedDayPage'
import { AdminPage } from './pages/AdminPage'
import { PrivacyPage } from './pages/PrivacyPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/select"
            element={
              <ProtectedRoute>
                <SelectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/start"
            element={
              <ProtectedRoute>
                <StartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/failed"
            element={
              <ProtectedRoute>
                <FailedDayPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
