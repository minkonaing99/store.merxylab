import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './_styles'
import { EmailFooter } from './_footer'

interface OrderCancelledProps {
  orderId: string
  reason: string
}

export function OrderCancelled({ orderId, reason }: OrderCancelledProps) {
  return (
    <Html>
      <Head />
      <Preview>Your merxylab order was cancelled</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.accentBar} />
          <Section style={s.content}>
            <Text style={s.eyebrow}>Order cancelled</Text>
            <Heading style={s.display}>This one didn&rsquo;t go through.</Heading>
            <Text style={s.lead}>
              Order <span style={s.chip}>{orderId}</span> has been cancelled and any reserved stock
              is back on the shelf.
            </Text>

            <Section style={s.noteBox}>
              <Text style={s.noteText}>{reason}</Text>
            </Section>

            <Text style={s.lead}>
              Changed your mind or paid by accident? Start again at{' '}
              <Link href="https://store.merxylab.com" style={s.ghostLink}>
                store.merxylab.com
              </Link>{' '}
              — your cart is one tap away.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderCancelled.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  reason: 'Payment was not received within 24 hours, so the order was released automatically.',
} satisfies OrderCancelledProps

export default OrderCancelled
