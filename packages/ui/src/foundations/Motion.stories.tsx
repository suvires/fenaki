import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, Section, TokenRow, valueOf } from './TokenDocs.tsx'
import { tokenList } from './tokens.ts'

const meta = {
  title: 'Foundations/Motion',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const MOTION_TYPES = ['duration', 'cubicBezier']

/** Only posters and previews move. Everything stops with prefers-reduced-motion. */
export const Timing: Story = {
  render: () => (
    <Page>
      <Section
        title="Motion"
        note="Durations and easing, semantic first, then each component's own."
      >
        <div className="grid gap-6">
          {tokenList
            .filter((t) => t.tier !== 'primitive' && MOTION_TYPES.includes(t.type))
            .map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                specimen={<code className="font-mono text-timecode">{valueOf(token)}</code>}
              />
            ))}
        </div>
      </Section>
    </Page>
  ),
}
