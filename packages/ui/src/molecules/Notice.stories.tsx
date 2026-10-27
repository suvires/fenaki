import type { Meta, StoryObj } from '@storybook/react-vite'
import { Notice } from './Notice.tsx'

const meta = {
  title: 'Molecules/Notice',
  component: Notice,
  args: {
    label: 'Borrador',
    children:
      'Este texto está pendiente de revisión legal. Los datos entre corchetes se completarán antes de publicarlo.',
  },
  decorators: [(Story) => <div className="max-w-note">{Story()}</div>],
} satisfies Meta<typeof Notice>

export default meta
type Story = StoryObj<typeof meta>

export const Draft: Story = {}
export const WithTitle: Story = {
  args: {
    label: undefined,
    title: 'Revisa tu correo',
    role: 'status',
    children: (
      <p className="m-0">
        Te hemos enviado un mensaje a <strong className="text-ink">ana@ejemplo.com</strong>. Abre el
        enlace que contiene para confirmar que quieres apuntarte.
      </p>
    ),
  },
}
export const Danger: Story = {
  args: {
    tone: 'danger',
    label: 'Error',
    role: 'alert',
    children: 'No hemos podido guardar tu correo. Vuelve a intentarlo en unos minutos.',
  },
}
