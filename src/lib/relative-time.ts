const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact age label: 'just now', '12m ago', '3h ago', '4d ago', '2mo ago'. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'just now'
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 60 * DAY) return `${Math.floor(diff / DAY)}d ago`
  return `${Math.floor(diff / (30 * DAY))}mo ago`
}

/** Full timestamp for the `title` tooltip behind a relative label. */
export function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString()
}
