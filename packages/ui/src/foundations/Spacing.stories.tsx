import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, Section, TokenRow, tokensUnder, valueOf } from './TokenDocs.tsx'

const meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The 4px scale, by Tailwind step: p-4, gap-6, mt-hair. */
export const Scale: Story = {
  render: () => (
    <Page>
      <Section title="Spacing" note="Named by Tailwind step (1 = 4px), plus a 2px hairline.">
        <div className="grid gap-4">
          {tokensUnder('semantic.spacing').map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              extra={valueOf(token)}
              specimen={
                <span
                  className="block h-(--spacing-4) bg-accent"
                  style={{ width: `var(${token.cssVar})` }}
                />
              }
            />
          ))}
        </div>
      </Section>
    </Page>
  ),
}
