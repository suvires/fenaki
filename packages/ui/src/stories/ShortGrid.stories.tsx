import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortCard } from '../components/ShortCard.tsx'
import { ShortGrid } from '../components/ShortGrid.tsx'
import { SHORTS } from './fixtures.ts'

const meta = {
  title: 'Media/ShortGrid',
  component: ShortGrid,
  args: {
    label: 'Cortos',
    children: SHORTS.map((short) => <ShortCard key={short.title} {...short} href="#" stretch />),
  },
} satisfies Meta<typeof ShortGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const FewShorts: Story = {
  args: {
    children: SHORTS.slice(0, 2).map((short) => (
      <ShortCard key={short.title} {...short} href="#" stretch />
    )),
  },
}
