import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from './IconButton.tsx'

const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  args: { icon: 'plus', label: 'Añadir a mi lista', variant: 'secondary', size: 'md' },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Secondary: Story = {}
export const Primary: Story = { args: { icon: 'play', label: 'Ver ahora', variant: 'primary' } }
export const Ghost: Story = { args: { variant: 'ghost', icon: 'thumbs-up', label: 'Me gusta' } }
export const Filled: Story = { args: { icon: 'thumbs-up', label: 'Me gusta', filled: true } }
export const AsLink: Story = { args: { icon: 'chevron-down', label: 'Más información', href: '#' } }
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4 text-ink">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <IconButton key={size} {...args} size={size} />
      ))}
    </div>
  ),
}
