import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../components/Button.tsx'

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Ver ahora', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { icon: 'play' } }
export const Secondary: Story = {
  args: { variant: 'secondary', icon: 'plus', children: 'Añadir a mi lista' },
}
export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Más sobre las cookies', href: '#' },
}
export const Large: Story = { args: { size: 'lg', icon: 'play', children: 'Ver la colección' } }
export const AsLink: Story = {
  args: { href: '#', icon: 'arrow', variant: 'secondary', children: 'Ver todo' },
}
export const OnTelon: Story = {
  args: {
    variant: 'secondary',
    surface: 'telon',
    icon: 'plus',
    size: 'lg',
    children: 'Añadir a mi lista',
  },
  decorators: [(Story) => <div className="bg-telon p-6">{Story()}</div>],
}
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button icon="play">Ver ahora</Button>
      <Button variant="secondary" icon="plus">
        Añadir a mi lista
      </Button>
      <Button variant="ghost" href="#">
        Más sobre las cookies
      </Button>
      <Button size="lg" icon="play">
        Ver la colección
      </Button>
    </div>
  ),
}
