import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface OrderPaidProps {
  orderId: string
  total: string
}

export function OrderPaid({ orderId, total }: OrderPaidProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment received — preparing for shipment</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Payment received.</Heading>
          <Text style={s.p}>
            Order <code style={s.code}>{orderId}</code> · {total}
          </Text>
          <Text style={s.p}>
            We&rsquo;re packing your order. You&rsquo;ll get another note when it ships.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

OrderPaid.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
} satisfies OrderPaidProps

export default OrderPaid
