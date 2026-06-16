import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface OrderCancelledProps {
  orderId: string
  reason: string
}

export function OrderCancelled({ orderId, reason }: OrderCancelledProps) {
  return (
    <Html>
      <Head />
      <Preview>Order cancelled</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Order cancelled.</Heading>
          <Text style={s.p}>
            Order <code style={s.code}>{orderId}</code> has been cancelled.
          </Text>
          <Text style={s.p}>{reason}</Text>
          <Text style={s.p}>Stock has been restored. You&rsquo;re welcome to re-order any time.</Text>
        </Container>
      </Body>
    </Html>
  )
}

OrderCancelled.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  reason: 'Payment was not received within 24 hours.',
} satisfies OrderCancelledProps

export default OrderCancelled
