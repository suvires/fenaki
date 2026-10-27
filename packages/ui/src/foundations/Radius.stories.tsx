import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, Section, TokenRow, tokensUnder, valueOf } from './TokenDocs.tsx'
import { tokenList } from './tokens.ts'

const meta = {
  title: 'Foundations/Radius',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Screens are rectangles: corners stay small. rounded-xs to rounded-lg, rounded-full, and the controls' own. */
export const Scale: Story = {
  render: () => (
    <Page>
      <Section title="Radius">
        <div className="grid gap-6">
          {[
            ...tokensUnder('semantic.radius'),
            ...tokenList.filter((t) => t.cssVar === '--radius-control'),
          ].map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              extra={`rounded-${token.cssVar.replace(/^--radius-/, '')} · ${valueOf(token)}`}
              specimen={
                <span
                  className="block h-(--control-height-lg) w-(--size-column) bg-muted border border-strong"
                  style={{ borderRadius: `var(${token.cssVar})` }}
                />
              }
            />
          ))}
        </div>
      </Section>
    </Page>
  ),
}
