import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, Section, TokenRow, tokensUnder, valueOf } from './TokenDocs.tsx'

const meta = {
  title: 'Foundations/Shadow',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Elevation: shadow-sm, shadow-md, shadow-lg, and the focus ring (through the focus-ring utility). */
export const Elevation: Story = {
  render: () => (
    <Page>
      <Section
        title="Shadow"
        note="Light falls from the screen: deep, soft shadows on the dark ground."
      >
        <div className="grid gap-8">
          {tokensUnder('semantic.shadow').map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              extra={valueOf(token)}
              specimen={
                <span
                  className="block h-(--control-height-lg) w-(--size-column) rounded-sm bg-raised"
                  style={{ boxShadow: `var(${token.cssVar})` }}
                />
              }
            />
          ))}
        </div>
      </Section>
    </Page>
  ),
}
