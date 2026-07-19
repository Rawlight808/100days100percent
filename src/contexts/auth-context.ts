import { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; requiresEmailVerification: boolean }>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
