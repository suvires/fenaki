import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from './IconButton.tsx'
import { Tooltip } from './Tooltip.tsx'

const meta = {
  title: 'Atoms/Tooltip',
  component: Tooltip,
  args: { children: 'Me gusta', open: true },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const AboveAControl: Story = {
  render: (args) => (
    <div className="px-12 pb-8 pt-12 flex justify-center">
      <span className="relative inline-flex">
        <IconButton icon="thumbs-up" label="Me gusta" />
        <Tooltip {...args} />
      </span>
    </div>
  ),
}
