import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isProd = process.env.NODE_ENV === 'production'

// 'unsafe-eval' required by Next dev (HMR/React Refresh). Drop in prod.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const SECURITY_HEADERS = [
  // Force HTTPS for two years across all subdomains.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Block all framing — protects against clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-sniffing attacks.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs to third-party origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop access to powerful browser APIs we don't need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // CSP — prod drops 'unsafe-eval'. 'unsafe-inline' (scripts/styles) remains
  // until nonce middleware is wired (deferred — see docs/TECH.md).
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.telegram.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No `output: 'standalone'` — Hostinger Easy Deploy + Passenger boot Node
  // from the project root, where `public/` already lives. The standalone
  // bundle would put `server.js` under `.next/standalone/` and resolve
  // `public/` relative to that dir, making runtime uploads (writeFile to
  // `join(process.cwd(), 'public', ...)`) land where Next can't see them →
  // /payment-qr/<id>.webp and /_next/image?url=/products/... 400/404.
  async headers() {
    // Photo slots are content-identified by (slug, slot); the admin UI cache-busts
    // with `?v=Date.now()` on replace, so long-lived immutable caching is safe.
    const productPhotoCache = [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ]
    // QR codes change rarely and are cache-busted by methodId; 30-day cache.
    const qrCache = [{ key: 'Cache-Control', value: 'public, max-age=2592000' }]
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      { source: '/products/:path*', headers: productPhotoCache },
      { source: '/payment-qr/:path*', headers: qrCache },
    ]
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(__dirname, 'src'),
      '@emails': path.resolve(__dirname, 'emails'),
    }
    return config
  },
}

export default nextConfig
