/** Per-user fallback when `caveat_events` is missing from the remote schema. */
export const CAVEAT_EVENTS_STORAGE_PREFIX = 'hundred-days-caveat-events:'

export type CaveatEventRow = { log_date: string; item_id: string | null }

export function isMissingCaveatEventsTable(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false
  const message = error.message ?? ''
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table ['"]?public\.caveat_events/i.test(message) ||
    /relation ['"]?public\.caveat_events['"]? does not exist/i.test(message) ||
    /relation ['"]?caveat_events['"]? does not exist/i.test(message)
  )
}

function storageKey(userId: string): string {
  return `${CAVEAT_EVENTS_STORAGE_PREFIX}${userId}`
}

function isRow(value: unknown): value is CaveatEventRow {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as CaveatEventRow).log_date === 'string'
  )
}

export function readLocalCaveatEvents(userId: string): CaveatEventRow[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isRow) : []
  } catch {
    return []
  }
}

export function writeLocalCaveatEvents(userId: string, rows: CaveatEventRow[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(rows))
  } catch {
    // Private mode / quota — allowance still updates in memory this session.
  }
}

export function appendLocalCaveatEvent(userId: string, row: CaveatEventRow): void {
  writeLocalCaveatEvents(userId, [...readLocalCaveatEvents(userId), row])
}

export function clearLocalCaveatEvents(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // Ignore storage access errors.
  }
}
