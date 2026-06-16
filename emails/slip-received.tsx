import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface SlipReceivedProps {
  orderId: string
  total: string
}

export function SlipReceived({ orderId, total }: SlipReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>Slip received — verifying with bank</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Slip received.</Heading>
          <Text style={s.p}>
            Order <code style={s.code}>{orderId}</code> · {total}
          </Text>
          <Text style={s.p}>
            We&rsquo;ll verify your payment in the bank app and confirm by email. Usually within a few hours during business time.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

SlipReceived.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
} satisfies SlipReceivedProps

export default SlipReceived
