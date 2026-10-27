import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import { Checkbox } from '../molecules/Checkbox.tsx'
import { Dialog } from './Dialog.tsx'

const meta = {
  title: 'Organisms/Dialog',
  component: Dialog,
  args: {
    open: true,
    onClose: () => undefined,
    title: 'Vas a ver este corto en el reproductor de YouTube',
    actions: (
      <>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="primary" icon="play">
          Aceptar y reproducir
        </Button>
      </>
    ),
    children: (
      <>
        <p className="m-0">
          El reproductor es de YouTube (Google) y se carga desde sus servidores. Al cargarlo:
        </p>
        <ul className="m-0 grid gap-2 pl-5 list-disc">
          <li>
            YouTube recibe tu dirección IP y datos técnicos de tu navegador, como cualquier web que
            visitas.
          </li>
          <li>
            Guarda algunos datos técnicos en tu navegador para que el reproductor funcione, como tus
            preferencias de subtítulos. No son cookies, pero la ley los trata igual.
          </li>
        </ul>
        <Checkbox id="remember">Recordar mi elección para los cortos de YouTube</Checkbox>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

/** The player's consent dialog, as the short page opens it. */
export const PlayerConsent: Story = {}
