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
import * as s from './_styles'
import { EmailFooter } from './_footer'

interface OrderDeliveredProps {
  orderId: string
}

export function OrderDelivered({ orderId }: OrderDeliveredProps) {
  return (
    <Html>
      <Head />
      <Preview>Your merxylab order has arrived</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.accentBar} />
          <Section style={s.content}>
            <Text style={s.badge}>Delivered</Text>
            <Heading style={s.display}>It&rsquo;s on your desk now.</Heading>
            <Text style={s.lead}>
              Order <span style={s.chip}>{orderId}</span> has reached you. Thanks for picking
              merxylab — we hope it earns its place.
            </Text>
            <Text style={s.lead}>
              Anything missing, damaged, or just not right? Reply to this email and a real person
              sorts it out. No bots, no queue.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderDelivered.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
} satisfies OrderDeliveredProps

export default OrderDelivered
