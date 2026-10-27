import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccentHeadline } from '../atoms/AccentHeadline.tsx'
import { Page, Section, TokenRow, tokensUnder, typeStyle, valueOf } from './TokenDocs.tsx'
import { tokenList } from './tokens.ts'

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Specimens({ tokens }: { tokens: typeof tokenList }) {
  return (
    <div className="grid gap-8">
      {tokens.map((token) => (
        <TokenRow
          key={token.id}
          token={token}
          extra={`text-${token.cssVar.replace(/^--text-/, '')} · ${valueOf(token)}`}
          specimen={
            <p
              className={
                token.extensions.family === 'display' ? 'm-0 uppercase wrap-anywhere' : 'm-0'
              }
              style={typeStyle(token.cssVar, token.extensions.family)}
            >
              {token.extensions.sample}
            </p>
          }
        />
      ))}
    </div>
  )
}

/** The semantic scale: one style per role. Display styles pair with font-display, utility styles with font-mono. */
export const Scale: Story = {
  render: () => (
    <Page>
      <Section
        title="Families"
        note="One family, Archivo, in three voices: font-display, font-text, font-mono."
      >
        <div className="grid gap-6">
          {tokensUnder('semantic.font').map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              specimen={
                <p
                  className="m-0 text-body-l"
                  style={{
                    fontFamily: `var(${token.cssVar})`,
                    fontVariationSettings: `var(${token.cssVar}--font-variation-settings, normal)`,
                    fontFeatureSettings: `var(${token.cssVar}--font-feature-settings, normal)`,
                  }}
                >
                  Timecode 15 min 2016
                </p>
              }
            />
          ))}
        </div>
      </Section>
      <Section title="Styles">
        <Specimens tokens={tokensUnder('semantic.typography')} />
      </Section>
    </Page>
  ),
}

/** Type styles that belong to one component (buttons, posters, the rank number…). */
export const ComponentStyles: Story = {
  render: () => (
    <Page>
      <Section title="Component styles">
        <Specimens
          tokens={tokenList.filter((t) => t.tier === 'component' && t.type === 'typography')}
        />
      </Section>
    </Page>
  ),
}

/**
 * The editorial roles every piece shares (web, emails, social): kicker, two-tone headline, lead and
 * secondary text. packages/ui/README.md, «Editorial typography».
 */
export const Editorial: Story = {
  render: () => (
    <div className="grid gap-6 max-w-landing">
      <p className="m-0 font-text text-label uppercase text-accent">Lista de espera</p>
      <AccentHeadline parts={['El mejor cine, ', { accent: 'en cortos' }]} as="h2" size="xl" />
      <p className="m-0 text-body-l text-primary">
        Los cortometrajes publicados en abierto están repartidos entre diferentes canales,
        festivales y escuelas; FENAKI los reúne en un solo sitio.
      </p>
      <p className="m-0 text-small text-secondary">hola@fenaki.tv</p>
    </div>
  ),
}
