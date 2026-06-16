import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface OrderShippedProps {
  orderId: string
  trackingRef: string | null
}

export function OrderShipped({ orderId, trackingRef }: OrderShippedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order has shipped</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Shipped.</Heading>
          <Text style={s.p}>
            Order <code style={s.code}>{orderId}</code> is on its way via BeeExpress.
          </Text>
          {trackingRef && (
            <Text style={s.p}>
              Tracking reference: <code style={s.code}>{trackingRef}</code>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  )
}

OrderShipped.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  trackingRef: 'BX-2026-001234',
} satisfies OrderShippedProps

export default OrderShipped
