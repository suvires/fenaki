import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectField } from './SelectField.tsx'

const meta = {
  title: 'Molecules/SelectField',
  component: SelectField,
  args: {
    id: 'relation',
    label: '¿Quién lo envía?',
    placeholder: 'Elige una opción',
    options: [
      { value: 'author', label: 'Soy su autor o autora' },
      { value: 'producer', label: 'La productora' },
      { value: 'festival', label: 'Un festival' },
    ],
    defaultValue: '',
  },
  decorators: [(Story) => <div className="max-w-[480px]">{Story()}</div>],
} satisfies Meta<typeof SelectField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithHint: Story = { args: { hint: 'Quien publica el vídeo en su canal.' } }
export const WithError: Story = { args: { error: 'Elige quién lo envía.' } }
