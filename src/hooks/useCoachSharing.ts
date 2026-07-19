import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/auth-context'

/**
 * Whether the user shares their selected habit list with the coach (admin).
 * Private by default; stored in user_settings and synced across devices.
 */
export function useCoachSharing() {
  const { user } = useAuth()
  const [shareWithCoach, setShareWithCoach] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShareWithCoach(false)
      setLoading(false)
      return
    }
    let cancelled = false
    void supabase
      .from('user_settings')
      .select('share_items_with_coach')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setShareWithCoach(
          (data as { share_items_with_coach: boolean } | null)
            ?.share_items_with_coach ?? false,
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const setSharing = useCallback(
    async (value: boolean) => {
      if (!user) return
      setSaving(true)
      setShareWithCoach(value) // optimistic
      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          share_items_with_coach: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) setShareWithCoach(!value) // roll back
      setSaving(false)
    },
    [user],
  )

  return { shareWithCoach, setSharing, loading, saving }
}
