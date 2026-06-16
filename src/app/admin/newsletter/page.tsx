import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterSubscribers } from '@/db/schema/newsletter'
import { NewsletterExport } from './newsletter-export'

export default async function AdminNewsletterPage() {
  const rows = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, 'active'))
    .orderBy(desc(newsletterSubscribers.subscribedAt))

  return (
    <div>
      <h2 className="font-display text-[26px]">Newsletter</h2>
      <p className="mt-2 text-[14px] text-muted">
        {rows.length} active subscribers. Export CSV to send via Hostinger Webmail or any provider.
      </p>

      <NewsletterExport
        rows={rows.map((r) => ({
          email: r.email,
          source: r.source,
          subscribedAt: r.subscribedAt.toISOString(),
        }))}
      />

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-3 text-[13px]">
            <span className="text-ink">{r.email}</span>
            <span className="text-[12px] text-muted">
              {r.source} · {new Date(r.subscribedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
