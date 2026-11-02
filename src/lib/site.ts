const FALLBACK_SITE = 'https://100days100percent.com'

/** Public https origin used for the privacy policy and email links. */
export function publicSiteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL
  if (typeof configured === 'string' && configured.startsWith('https://')) {
    return configured.replace(/\/$/, '')
  }
  return FALLBACK_SITE
}

/**
 * Where an email confirmation link should land.
 * Vite on http://localhost stays local. The installed app's origin is not a
 * real website, so those links use the public site.
 */
export function authRedirectOrigin(): string {
  if (typeof window === 'undefined') return publicSiteOrigin()
  const { protocol, hostname, origin } = window.location
  if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return origin
  }
  if (protocol === 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return origin
  }
  return publicSiteOrigin()
}
