import type { Meta, StoryObj } from '@storybook/react-vite'
import { Wordmark } from './Wordmark.tsx'

const meta = {
  title: 'Brand/Wordmark',
  component: Wordmark,
  args: { label: 'FENAKI', className: 'h-6 w-auto text-ink' },
} satisfies Meta<typeof Wordmark>

export default meta
type Story = StoryObj<typeof meta>

/** The size of the site header. */
export const Header: Story = {}

/** Large, as on the landing page or a poster. */
export const Large: Story = { args: { className: 'h-12 w-auto text-ink' } }

/** In the action color. */
export const Accent: Story = { args: { className: 'h-8 w-auto text-tungsteno' } }
