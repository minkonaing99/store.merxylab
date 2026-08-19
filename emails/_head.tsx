import { Font, Head } from '@react-email/components'

/** Latin subset of the Fraunces variable face, the storefront display font. */
const FRAUNCES_WOFF2 =
  'https://fonts.gstatic.com/s/fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeP2Xz5c.woff2'

/**
 * Apple Mail, iOS Mail and Outlook.com honour the webfont and render the real
 * brand headline. Gmail strips @font-face and lands on Georgia, which is the
 * fallback these templates already shipped, so there is no worse case.
 */
export function BrandHead() {
  return (
    <Head>
      <Font
        fontFamily="Fraunces"
        fallbackFontFamily="Georgia"
        webFont={{ url: FRAUNCES_WOFF2, format: 'woff2' }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
  )
}

export default BrandHead
