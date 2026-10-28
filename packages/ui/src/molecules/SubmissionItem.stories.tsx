import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import { SubmissionItem } from './SubmissionItem.tsx'

const meta = {
  title: 'Molecules/SubmissionItem',
  component: SubmissionItem,
  args: {
    title: 'Cuerdas',
    href: '#',
    status: 'En revisión',
    statusTone: 'info',
    text: 'Hemos encontrado el código. Lo revisamos y te avisamos por email.',
  },
  decorators: [(Story) => <div className="max-w-[640px]">{Story()}</div>],
} satisfies Meta<typeof SubmissionItem>

export default meta
type Story = StoryObj<typeof meta>

export const InReview: Story = {}
export const AwaitingCode: Story = {
  args: {
    status: 'Falta el código',
    statusTone: 'accent',
    text: 'Copia este código y pégalo en cualquier parte de la descripción del corto en YouTube o Vimeo. Después, pulsa «Comprobar».',
    code: 'FENAKI-7K3QPX',
    actions: (
      <>
        <Button variant="secondary">Copiar código</Button>
        <Button>Comprobar</Button>
      </>
    ),
  },
}
export const Rejected: Story = {
  args: {
    status: 'No publicado',
    statusTone: 'neutral',
    text: 'Motivo: el canal no es el oficial de la productora.',
  },
}
