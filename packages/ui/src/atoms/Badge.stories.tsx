import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge.tsx'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: { children: 'Animación', tone: 'neutral' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}
export const Info: Story = { args: { tone: 'info', children: 'Sub ES' } }
export const Accent: Story = { args: { tone: 'accent', children: 'Nuevo' } }
export const Branded: Story = { args: { tone: 'branded', children: 'Contenido de marca' } }
export const AllTones: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>Sin diálogos</Badge>
      <Badge tone="info">CC BY 4.0</Badge>
      <Badge tone="accent">Nuevo</Badge>
      <Badge tone="branded">Contenido de marca</Badge>
    </div>
  ),
}
