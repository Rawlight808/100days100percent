import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and add your project URL + anon key.',
  )
}

export const supabase = createClient(url, key)

/** Email allowlisted for the in-app admin page and admin RPC functions. */
export const ADMIN_EMAIL = 'rawlight@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase() === ADMIN_EMAIL
}
