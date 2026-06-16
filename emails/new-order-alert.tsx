import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import * as s from './_styles'

interface NewOrderAlertProps {
  orderId: string
  total: string
  method: string
  customer: string
}

export function NewOrderAlert({ orderId, total, method, customer }: NewOrderAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>New order placed</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab · owner alert</Text>
          </Section>
          <Heading style={s.h1}>New order.</Heading>
          <Text style={s.p}>
            Reference <code style={s.code}>{orderId}</code>
          </Text>
          <Text style={s.p}>Total: {total}</Text>
          <Text style={s.p}>Method: {method}</Text>
          <Text style={s.p}>Customer: {customer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

NewOrderAlert.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  method: 'KBZ Pay',
  customer: 'buyer@example.com',
} satisfies NewOrderAlertProps

export default NewOrderAlert
