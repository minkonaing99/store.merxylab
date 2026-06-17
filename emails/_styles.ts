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

/* ── Editorial brand kit (terracotta accent, Fraunces display, dark footer) ── */

const serif = "'Fraunces', Georgia, 'Times New Roman', serif"
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/** Card shell with no padding so the dark footer can run edge-to-edge. */
export const shell = {
  background: '#faf6ef',
  border: '1px solid #e6dfd2',
  borderRadius: '14px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden' as const,
}
export const accentBar = {
  height: '3px',
  lineHeight: '3px',
  fontSize: 0,
  background: '#c2613a',
}
export const content = { padding: '40px 40px 34px' }
export const eyebrow = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 600 as const,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#8a8275',
}
export const display = {
  fontFamily: serif,
  fontSize: '30px',
  lineHeight: '36px',
  margin: '14px 0 14px',
  fontWeight: 400 as const,
  letterSpacing: '-0.01em',
  color: '#1c1b19',
}
export const lead = { fontSize: '15px', lineHeight: '24px', color: '#3a3833', margin: '10px 0' }

/** Terracotta-tinted order-id chip. */
export const chip = {
  fontFamily: mono,
  background: '#f2e4db',
  color: '#9c4a29',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600 as const,
  letterSpacing: '0.02em',
}

/* Invoice table (table-based for Outlook/Gmail compat) */
export const cellItem = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#3a3833',
  padding: '9px 0',
  verticalAlign: 'top' as const,
}
export const cellPrice = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1c1b19',
  fontWeight: 600 as const,
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
  whiteSpace: 'nowrap' as const,
  padding: '9px 0',
  verticalAlign: 'top' as const,
}
export const cellMeta = { ...cellItem, color: '#8a8275', padding: '5px 0' }
export const cellMetaPrice = { ...cellPrice, color: '#3a3833', fontWeight: 500 as const, padding: '5px 0' }
export const totalLabelCell = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: '#1c1b19',
  padding: '14px 0 0',
}
export const totalValCell = {
  fontSize: '18px',
  fontWeight: 700 as const,
  color: '#c2613a',
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
  whiteSpace: 'nowrap' as const,
  padding: '14px 0 0',
}

/** Bordered callout (cancellation reason, etc.). */
export const noteBox = {
  background: '#f5efe6',
  border: '1px solid #e6dfd2',
  borderLeft: '3px solid #c2613a',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '18px 0',
}
export const noteText = { margin: 0, fontSize: '14px', lineHeight: '22px', color: '#3a3833' }

export const badge = {
  display: 'inline-block',
  background: '#e9ede2',
  color: '#48603a',
  fontSize: '12px',
  fontWeight: 600 as const,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  padding: '5px 12px',
  borderRadius: '999px',
}
export const ghostLink = { color: '#c2613a', textDecoration: 'none', fontWeight: 600 as const }

/* Dark footer band */
export const footer = { background: '#161513', padding: '26px 40px' }
export const footerMark = {
  margin: 0,
  fontFamily: serif,
  fontSize: '17px',
  color: '#f5efe6',
  letterSpacing: '0.02em',
}
export const footerTag = { margin: '6px 0 0', fontSize: '12px', lineHeight: '18px', color: '#8a8275' }
export const footerLink = { color: '#d88565', textDecoration: 'none' }
export const footerMeta = { margin: '14px 0 0', fontSize: '11px', lineHeight: '16px', color: '#6f685d' }
