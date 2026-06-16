/**
 * Shared inline styles for React Email templates.
 * Warm palette; mirrors the storefront tokens.
 */
export const body = {
  background: '#f5efe6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: '32px 16px',
  color: '#1c1b19',
}
export const container = {
  background: '#faf6ef',
  border: '1px solid #e6dfd2',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '40px',
}
export const brand = { marginBottom: '20px' }
export const mark = {
  margin: 0,
  fontSize: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#8a8275',
}
export const h1 = {
  fontSize: '28px',
  margin: '0 0 12px',
  fontWeight: 500 as const,
  letterSpacing: '-0.01em',
}
export const h2 = {
  fontSize: '18px',
  margin: '24px 0 12px',
  fontWeight: 500 as const,
}
export const p = { fontSize: '15px', lineHeight: '24px', color: '#3a3833', margin: '8px 0' }
export const hr = { borderTop: '1px solid #e6dfd2', margin: '24px 0' }
export const row = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '6px 0',
}
export const item = { fontSize: '14px', color: '#3a3833', margin: 0 }
export const price = { fontSize: '14px', color: '#1c1b19', margin: 0, fontWeight: 600 as const }
export const totalLabel = { fontSize: '16px', fontWeight: 500 as const, margin: 0 }
export const totalVal = { fontSize: '16px', fontWeight: 600 as const, margin: 0 }
export const code = {
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  background: '#f5efe6',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '13px',
}
