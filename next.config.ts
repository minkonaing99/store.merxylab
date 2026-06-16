import type { NextConfig } from 'next'
import path from 'node:path'

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
  // CSP — permissive baseline (Next.js needs unsafe-inline/eval without nonce middleware).
  // Tighten later by introducing a nonce via middleware if budget allows.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }]
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
