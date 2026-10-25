import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortGrid } from '../components/ShortGrid.tsx'
import { SHORTS } from './fixtures.ts'

const meta = {
  title: 'Media/ShortGrid',
  component: ShortGrid,
  args: {
    label: 'Cortos',
    items: SHORTS.map((short) => ({ ...short, href: `#${short.title}` })),
  },
} satisfies Meta<typeof ShortGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const FewShorts: Story = {
  args: { items: SHORTS.slice(0, 2).map((short) => ({ ...short, href: `#${short.title}` })) },
}
