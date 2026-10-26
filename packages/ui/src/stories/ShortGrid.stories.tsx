import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../components/Button.tsx'
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

/** With progress and an action under each card: the viewing history. */
export const History: Story = {
  args: {
    items: SHORTS.slice(0, 3).map((short, index) => ({
      ...short,
      href: `#${short.title}`,
      progress: [0.25, 0.6, 1][index],
      progressLabel: `Visto al ${[25, 60, 100][index]} %`,
    })),
    footer: () => (
      <div>
        <Button variant="ghost" size="sm">
          Quitar del historial
        </Button>
      </div>
    ),
  },
}
