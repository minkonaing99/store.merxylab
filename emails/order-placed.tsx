import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './_styles'

interface OrderItem {
  qty: number
  name: string
  lineTotal: string
}

interface OrderPlacedProps {
  orderId: string
  total: string
  subtotal: string
  deliveryFee: string
  method: string
  items: OrderItem[]
}

export function OrderPlaced({
  orderId,
  total,
  subtotal,
  deliveryFee,
  method,
  items,
}: OrderPlacedProps) {
  return (
    <Html>
      <Head />
      <Preview>Order placed — pay to confirm</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.brand}>
            <Text style={s.mark}>merxylab</Text>
          </Section>
          <Heading style={s.h1}>Order placed.</Heading>
          <Text style={s.p}>
            Order reference <code style={s.code}>{orderId}</code>
          </Text>
          <Text style={s.p}>Payment method: {method}</Text>

          <Hr style={s.hr} />
          <Heading as="h2" style={s.h2}>
            Items
          </Heading>
          {items.map((it, i) => (
            <Section key={i} style={s.row}>
              <Text style={s.item}>
                {it.qty} × {it.name}
              </Text>
              <Text style={s.price}>{it.lineTotal}</Text>
            </Section>
          ))}
          <Section style={s.row}>
            <Text style={s.item}>Subtotal</Text>
            <Text style={s.price}>{subtotal}</Text>
          </Section>
          <Section style={s.row}>
            <Text style={s.item}>Delivery</Text>
            <Text style={s.price}>{deliveryFee}</Text>
          </Section>
          <Section style={{ ...s.row, borderTop: '1px solid #e6dfd2', paddingTop: '12px' }}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalVal}>{total}</Text>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.p}>
            Open this order on the site to upload your payment slip. We&rsquo;ll confirm and ship.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

OrderPlaced.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  subtotal: 'Ks 550,000',
  deliveryFee: 'Ks 5,000',
  method: 'KBZ Pay',
  items: [{ qty: 1, name: 'Keychron K2 Pro', lineTotal: 'Ks 545,000' }],
} satisfies OrderPlacedProps

export default OrderPlaced
