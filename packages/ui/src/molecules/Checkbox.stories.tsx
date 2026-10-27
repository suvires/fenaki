import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './Checkbox.tsx'

const meta = {
  title: 'Molecules/Checkbox',
  component: Checkbox,
  args: {
    id: 'newsletter',
    children:
      'Quiero recibir también la selección semanal de cortos. Puede incluir colecciones patrocinadas, siempre identificadas.',
  },
  decorators: [(Story) => <div className="max-w-search">{Story()}</div>],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}
export const Checked: Story = { args: { defaultChecked: true } }
