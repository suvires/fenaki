import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, Section, TokenRow, valueOf } from './TokenDocs.tsx'
import { tokenList } from './tokens.ts'

const meta = {
  title: 'Foundations/Component tokens',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Decisions that belong to one component, by component. Type styles are under Typography. */
export const ByComponent: Story = {
  render: () => {
    const tokens = tokenList.filter((t) => t.tier === 'component' && t.type !== 'typography')
    const components = [...new Set(tokens.map((t) => t.path[1] ?? ''))]
    return (
      <Page>
        {components.map((component) => (
          <Section key={component} title={component}>
            <div className="grid gap-4">
              {tokens
                .filter((t) => t.path[1] === component)
                .map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    specimen={<code className="font-mono text-timecode">{valueOf(token)}</code>}
                  />
                ))}
            </div>
          </Section>
        ))}
      </Page>
    )
  },
}
