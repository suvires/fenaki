import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import { TextField } from '../molecules/TextField.tsx'
import { SignupBand } from './SignupBand.tsx'

const meta = {
  title: 'Organisms/SignupBand',
  component: SignupBand,
  args: {
    id: 'newsletter',
    title: 'La selección semanal',
    text: 'Los viernes por la mañana, una selección de cortos del catálogo en tu email.',
    children: (
      <TextField
        id="newsletter-email"
        type="email"
        label="Tu email"
        placeholder="Escribe tu email"
        action={
          <Button type="submit" size="lg">
            Suscribirme
          </Button>
        }
      />
    ),
    note: (
      <>
        FENAKI usará tu email solo para enviarte la selección semanal. Puedes darte de baja desde
        cualquier email. Más información en la{' '}
        <a href="#" className="text-accent underline underline-offset-4">
          política de privacidad
        </a>
        .
      </>
    ),
  },
} satisfies Meta<typeof SignupBand>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
