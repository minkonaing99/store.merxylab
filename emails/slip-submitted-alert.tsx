import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface SlipSubmittedAlertProps {
  orderId: string
  total: string
  method: string
}

export function SlipSubmittedAlert({ orderId, total, method }: SlipSubmittedAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>Slip submitted — verify against bank app</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab · owner alert</Text>
          </Section>
          <Heading style={s.h1}>Slip submitted.</Heading>
          <Text style={s.p}>
            Reference <code style={s.code}>{orderId}</code>
          </Text>
          <Text style={s.p}>Total: {total}</Text>
          <Text style={s.p}>Method: {method}</Text>
          <Text style={s.p}>Cross-check the slip image against your bank app, then flip the order to paid.</Text>
        </Container>
      </Body>
    </Html>
  )
}

SlipSubmittedAlert.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  method: 'KBZ Pay',
} satisfies SlipSubmittedAlertProps

export default SlipSubmittedAlert
