import type { Meta, StoryObj } from '@storybook/react-vite'
import { Monogram } from '../components/Monogram.tsx'

const meta = {
  title: 'Brand/Monogram',
  component: Monogram,
  args: { label: 'Fenaki', className: 'h-12 w-auto text-tungsteno' },
} satisfies Meta<typeof Monogram>

export default meta
type Story = StoryObj<typeof meta>

/** The size of the footer, above the motto. */
export const Footer: Story = {}

/** Small, as a bullet beside a line of text. */
export const Small: Story = { args: { className: 'h-4 w-auto text-tungsteno' } }

/** In ink. */
export const Ink: Story = { args: { className: 'h-12 w-auto text-ink' } }
