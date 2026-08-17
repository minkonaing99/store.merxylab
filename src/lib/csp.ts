/**
 * Content-Security-Policy, built per request so production can carry a nonce.
 *
 * The previous policy shipped `script-src 'unsafe-inline'`, which is most of
 * what CSP buys you against XSS: an injected inline `<script>` just runs. A
 * nonce is the only way to keep inline scripts working without that, because
 * Next's hydration bootstrap is inline by construction.
 *
 * `'strict-dynamic'` lets the nonced bootstrap load the chunk graph without
 * every chunk URL needing its own allowlist entry. CSP3 browsers ignore `'self'`
 * once it is present; it stays as the fallback for older ones.
 */
export function contentSecurityPolicy(nonce: string | null): string {
  // Dev needs 'unsafe-eval' for React Refresh and 'unsafe-inline' for the HMR
  // client, neither of which is nonced. Prod is the policy that matters.
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  return [
    "default-src 'self'",
    scriptSrc,
    // Inline styles stay allowed: Tailwind's runtime and framer-motion both set
    // style attributes directly, and a style-src injection cannot execute code.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

/** Per-request nonce. Base64 so it survives the header round-trip verbatim. */
export function generateNonce(): string {
  return btoa(crypto.randomUUID())
}
