import type { Meta, StoryObj } from '@storybook/react-vite'
import { Monogram } from '../components/Monogram.tsx'

const meta = {
  title: 'Brand/Monogram',
  component: Monogram,
  args: { label: 'Fenaki', className: 'h-4 w-auto text-tungsteno' },
} satisfies Meta<typeof Monogram>

export default meta
type Story = StoryObj<typeof meta>

/** The size of the footer, before the motto. */
export const Footer: Story = {}

/** Large, as on the avatar and the favicon. */
export const Large: Story = { args: { className: 'h-12 w-auto text-tungsteno' } }

/** In ink. */
export const Ink: Story = { args: { className: 'h-12 w-auto text-ink' } }
