import Link from 'next/link'
import Image from 'next/image'

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { href: '/shop/keyboards', label: 'Keyboards' },
      { href: '/shop/mice', label: 'Mice' },
      { href: '/shop/headsets', label: 'Headsets' },
      { href: '/shop/microphones', label: 'Microphones' },
      { href: '/shop/speakers', label: 'Speakers' },
      { href: '/shop/accessories', label: 'Accessories' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#', label: 'About' },
      { href: '#', label: 'Manifesto' },
      { href: '#', label: 'Press' },
      { href: '#', label: 'Contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '#', label: 'Shipping' },
      { href: '#', label: 'Returns' },
      { href: '#', label: 'Warranty' },
      { href: '#', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Terms' },
      { href: '#', label: 'Privacy' },
      { href: '#', label: 'Cookies' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="mt-24 bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]">
      <div className="container-prose grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="merxylab home">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream/8 ring-1 ring-cream/15">
              <Image
                src="/logo.png"
                alt=""
                width={22}
                height={22}
                className="opacity-95 [filter:invert(1)_brightness(1.05)]"
              />
            </span>
            <span className="font-display text-[22px] font-medium">merxylab</span>
          </Link>
          <p className="mt-4 max-w-[28ch] text-[14px] leading-relaxed text-cream/60">
            Peripherals for the desk you actually use. Built quietly, made to last.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-[11px] tracking-[0.14em] uppercase text-cream/50">{col.title}</div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-cream/85 transition-colors hover:text-[var(--color-accent-soft)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream/10">
        <div className="container-prose flex flex-col items-start justify-between gap-3 py-6 text-[12px] text-cream/55 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} merxylab - all quiet on the desk.</p>
          <p>Made in small batches.</p>
        </div>
      </div>
    </footer>
  )
}
