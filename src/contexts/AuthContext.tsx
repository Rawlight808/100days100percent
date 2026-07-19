import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

/** Remove any app state cached in localStorage (per-user keys + reminder). */
function clearLocalAppState() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('hundred-days') || k === 'hundred-days-reminder')) {
        keys.push(k)
      }
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // Ignore storage access errors (private mode, etc.)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    // Backgrounded tabs throttle timers, so the silent token refresh can lapse.
    // Re-check the session whenever the tab regains focus or the network
    // reconnects; getSession() transparently refreshes an expired token.
    const recheckSession = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
      })
    }

    document.addEventListener('visibilitychange', recheckSession)
    window.addEventListener('online', recheckSession)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', recheckSession)
      window.removeEventListener('online', recheckSession)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const {
      data: { session: nextSession },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    return {
      error: error?.message ?? null,
      requiresEmailVerification: !error && !nextSession,
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    clearLocalAppState()
    await supabase.auth.signOut()
  }, [])

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) return error.message
    clearLocalAppState()
    // The user row (and session) is gone; sign out locally to clear tokens and
    // trigger the redirect to the auth screen.
    await supabase.auth.signOut()
    return null
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  )
}
