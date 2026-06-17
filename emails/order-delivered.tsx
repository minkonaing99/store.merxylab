import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface OrderDeliveredProps {
  orderId: string
}

export function OrderDelivered({ orderId }: OrderDeliveredProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order has arrived</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Delivered.</Heading>
          <Text style={s.p}>
            Order <code style={s.code}>{orderId}</code> has reached you. Thanks for picking merxylab.
          </Text>
          <Text style={s.p}>
            If anything is missing or wrong, reply to this email and we&rsquo;ll sort it out.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

OrderDelivered.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
} satisfies OrderDeliveredProps

export default OrderDelivered
