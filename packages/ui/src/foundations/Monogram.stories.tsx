import type { Meta, StoryObj } from '@storybook/react-vite'
import { Monogram } from './Monogram.tsx'

const meta = {
  title: 'Foundations/Monogram',
  component: Monogram,
  args: { label: 'FENAKI', className: 'h-12 w-auto text-accent' },
} satisfies Meta<typeof Monogram>

export default meta
type Story = StoryObj<typeof meta>

/** The size of the footer, above the motto. */
export const Footer: Story = {}

/** Small, as a bullet beside a line of text. */
export const Small: Story = { args: { className: 'h-4 w-auto text-accent' } }

/** In the primary text colour. */
export const Primary: Story = { args: { className: 'h-12 w-auto text-primary' } }
