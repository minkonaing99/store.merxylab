import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as s from './_styles'
import { EmailFooter } from './_footer'

interface InvoiceItem {
  qty: number
  name: string
  lineTotal: string
}

interface OrderInvoiceProps {
  orderId: string
  total: string
  subtotal: string
  deliveryFee: string
  method: string
  items: InvoiceItem[]
}

export function OrderInvoice({
  orderId,
  total,
  subtotal,
  deliveryFee,
  method,
  items,
}: OrderInvoiceProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment confirmed — your merxylab invoice</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.accentBar} />
          <Section style={s.content}>
            <Text style={s.eyebrow}>Payment confirmed</Text>
            <Heading style={s.display}>It&rsquo;s paid. We&rsquo;re packing.</Heading>
            <Text style={s.lead}>
              Order <span style={s.chip}>{orderId}</span> · paid via {method}. You&rsquo;ll hear
              from us again the moment it ships.
            </Text>

            <Hr style={s.hr} />
            <Text style={s.eyebrow}>Invoice</Text>

            {items.map((it, i) => (
              <Row key={i}>
                <Column style={s.cellItem}>
                  {it.qty} × {it.name}
                </Column>
                <Column style={s.cellPrice}>{it.lineTotal}</Column>
              </Row>
            ))}

            <Hr style={s.hr} />

            <Row>
              <Column style={s.cellMeta}>Subtotal</Column>
              <Column style={s.cellMetaPrice}>{subtotal}</Column>
            </Row>
            <Row>
              <Column style={s.cellMeta}>Delivery</Column>
              <Column style={s.cellMetaPrice}>{deliveryFee}</Column>
            </Row>
            <Row>
              <Column style={s.totalLabelCell}>Total paid</Column>
              <Column style={s.totalValCell}>{total}</Column>
            </Row>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderInvoice.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  subtotal: 'Ks 550,000',
  deliveryFee: 'Ks 5,000',
  method: 'KBZ Pay',
  items: [
    { qty: 1, name: 'Keychron K2 Pro', lineTotal: 'Ks 545,000' },
    { qty: 1, name: 'PBT Keycap Set — Sand', lineTotal: 'Ks 5,000' },
  ],
} satisfies OrderInvoiceProps

export default OrderInvoice
