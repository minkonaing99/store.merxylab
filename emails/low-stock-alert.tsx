import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface LowStockProps {
  productName: string
  remaining: number
}

export function LowStockAlert({ productName, remaining }: LowStockProps) {
  return (
    <Html>
      <Head />
      <Preview>Low stock: {productName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={mark}>merxylab · admin</Text>
          </Section>
          <Heading style={h1}>Low stock alert.</Heading>
          <Text style={p}>
            <strong>{productName}</strong> has <strong>{remaining}</strong> units left after the
            latest order. Time to restock.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

LowStockAlert.PreviewProps = {
  productName: 'MXK-65 Walnut',
  remaining: 2,
} satisfies LowStockProps

export default LowStockAlert

const body = {
  background: '#f5efe6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: '32px 16px',
  color: '#1c1b19',
}
const container = {
  background: '#faf6ef',
  border: '1px solid #e6dfd2',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '480px',
  padding: '32px',
}
const mark = {
  margin: 0,
  fontSize: '12px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#b07a2e',
}
const h1 = { fontSize: '24px', margin: '8px 0', fontWeight: 500 as const }
const p = { fontSize: '15px', lineHeight: '24px', color: '#3a3833' }
