import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import { TextField } from './TextField.tsx'

const meta = {
  title: 'Forms/TextField',
  component: TextField,
  args: {
    id: 'email',
    label: 'Correo electrónico',
    type: 'email',
    placeholder: 'nombre@ejemplo.com',
  },
  decorators: [(Story) => <div className="max-w-search">{Story()}</div>],
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Filled: Story = { args: { defaultValue: 'ana@ejemplo.com' } }
export const WithHint: Story = {
  args: { hint: 'Solo para avisarte cuando abra.' },
}
export const WithError: Story = {
  args: {
    defaultValue: 'ana@ejemplo',
    error:
      'Ese correo no parece completo. Revisa que tenga @ y un dominio, por ejemplo nombre@ejemplo.com.',
  },
}

/** With the form's button beside the field (below it on narrow screens), as on the waitlist. */
export const WithAction: Story = {
  args: {
    action: (
      <Button type="submit" size="lg">
        Avísame
      </Button>
    ),
  },
  decorators: [(Story) => <div className="max-w-note">{Story()}</div>],
}
