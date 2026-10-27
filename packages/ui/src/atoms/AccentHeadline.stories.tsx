import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccentHeadline } from './AccentHeadline.tsx'

const meta = {
  title: 'Atoms/AccentHeadline',
  component: AccentHeadline,
  args: { parts: ['El mejor cine, ', { accent: 'en cortos' }], size: 'xl' },
  decorators: [(Story) => <div className="max-w-landing">{Story()}</div>],
} satisfies Meta<typeof AccentHeadline>

export default meta
type Story = StoryObj<typeof meta>

/** The landing page's headline: the closing phrase carries the payoff. */
export const Landing: Story = {}
export const Large: Story = { args: { size: 'l', as: 'h2' } }
/** display-l on small screens, display-xl from md up, as on the landing page. */
export const Responsive: Story = { args: { size: 'responsive' } }
