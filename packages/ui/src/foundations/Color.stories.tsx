import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Page,
  Section,
  Swatch,
  TokenRow,
  colorUtilities,
  tokensUnder,
  valueOf,
} from './TokenDocs.tsx'

const meta = {
  title: 'Foundations/Color',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const ROLES = [
  ['background', 'Surfaces: bg-*, and the stops of a gradient.'],
  ['text', 'Text and icons: text-*.'],
  ['border', 'Edges: border-*.'],
] as const

const SHARED = ['accent', 'sponsored', 'info', 'danger', 'glow', 'scrim']

function SemanticRows({ prefix }: { prefix: string }) {
  return (
    <div className="grid gap-6">
      {tokensUnder(prefix).map((token) => (
        <TokenRow
          key={token.id}
          token={token}
          extra={colorUtilities(token)}
          specimen={
            <div className="flex gap-4">
              <Swatch color={`var(${token.cssVar})`} label={`dark ${valueOf(token, 'dark')}`} />
              <Swatch color={valueOf(token, 'light')} label={`light ${valueOf(token, 'light')}`} />
            </div>
          }
        />
      ))}
    </div>
  )
}

/** What components use: roles in English, the same names in both modes. */
export const Semantic: Story = {
  render: () => (
    <Page>
      {ROLES.map(([role, note]) => (
        <Section key={role} title={role} note={note}>
          <SemanticRows prefix={`semantic.color.${role}`} />
        </Section>
      ))}
      <Section
        title="Shared"
        note="Brand and status colours: one token for every utility (bg-accent, text-accent, border-danger), with a -subtle tint and text-on-* for what sits on them."
      >
        {SHARED.map((group) => (
          <SemanticRows key={group} prefix={`semantic.color.${group}`} />
        ))}
      </Section>
    </Page>
  ),
}

/** The raw palettes the semantic tokens point at. Never used directly. */
export const Primitives: Story = {
  render: () => {
    const hues = [...new Set(tokensUnder('primitive.color').map((t) => t.path[2] ?? ''))]
    return (
      <Page>
        {hues.map((hue) => (
          <Section key={hue} title={hue}>
            <div className="flex flex-wrap gap-4">
              {tokensUnder('primitive.color')
                .filter((t) => t.path[2] === hue)
                .map((token) => (
                  <Swatch
                    key={token.id}
                    color={`var(${token.cssVar})`}
                    label={`${token.path.slice(2).join('-')} ${valueOf(token)}`}
                  />
                ))}
            </div>
          </Section>
        ))}
      </Page>
    )
  },
}
