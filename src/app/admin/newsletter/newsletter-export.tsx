'use client'

import { Download } from 'lucide-react'

interface NewsletterExportProps {
  rows: { email: string; source: string; subscribedAt: string }[]
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function NewsletterExport({ rows }: NewsletterExportProps) {
  function download() {
    const header = 'email,source,subscribed_at\n'
    const body = rows
      .map((r) => [r.email, r.source, r.subscribedAt].map(csvEscape).join(','))
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `merxylab-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      disabled={rows.length === 0}
      className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
    >
      <Download size={14} />
      Export CSV ({rows.length})
    </button>
  )
}
