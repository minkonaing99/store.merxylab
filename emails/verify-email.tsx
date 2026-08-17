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
import * as st from './_styles'

interface VerifyEmailProps {
  verifyUrl: string
  ttlMinutes: number
}

export function VerifyEmail({ verifyUrl, ttlMinutes }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your merxylab account</Preview>
      <Body style={st.body}>
        <Container style={container}>
          <Section style={st.brand}>
            <Text style={st.mark}>merxylab</Text>
          </Section>
          <Heading style={st.h1}>Verify your email.</Heading>
          <Text style={p}>
            Welcome. Confirm your address to start placing orders and saving wishlists.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link href={verifyUrl} style={button}>
              Verify email
            </Link>
          </Section>
          <Text style={small}>
            The link expires in {ttlMinutes} minutes. If it does, sign up again to get a new one.
          </Text>
          <Text style={small}>If you did not sign up, ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

VerifyEmail.PreviewProps = {
  verifyUrl: 'https://example.com/verify?token=abc&email=you@example.com',
  ttlMinutes: 30,
} satisfies VerifyEmailProps

export default VerifyEmail

const container = {
  background: '#faf6ef',
  border: '1px solid #e6dfd2',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '40px',
}

const p = { fontSize: '15px', lineHeight: '24px', color: '#3a3833' }
const small = { fontSize: '12px', color: '#8a8275', marginTop: '24px' }
const button = {
  background: '#1c1b19',
  color: '#f5efe6',
  borderRadius: '999px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 500 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
