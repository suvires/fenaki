import type { Meta, StoryObj } from '@storybook/react-vite'
import { LabelledIconButton } from './LabelledIconButton.tsx'

const meta = {
  title: 'Molecules/LabelledIconButton',
  component: LabelledIconButton,
  args: { icon: 'plus', label: 'Añadir a mi lista' },
  decorators: [(Story) => <div className="p-6 pt-12">{Story()}</div>],
} satisfies Meta<typeof LabelledIconButton>

export default meta
type Story = StoryObj<typeof meta>

/** The tooltip shows on hover and on focus. */
export const Default: Story = {}
export const Share: Story = {
  args: { icon: 'share', label: 'Compartir', variant: 'translucent', size: 'lg' },
}
