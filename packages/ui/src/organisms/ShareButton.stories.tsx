import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ShareButton } from './ShareButton.tsx'

const meta = {
  title: 'Organisms/ShareButton',
  component: ShareButton,
  args: {
    label: 'Compartir',
    url: 'https://fenaki.tv/es/cortos/timecode',
    title: 'Timecode',
    text: 'Mira «Timecode» en FENAKI',
    targets: [
      { label: 'WhatsApp', href: '#whatsapp' },
      { label: 'Telegram', href: '#telegram' },
      { label: 'X', href: '#x' },
      { label: 'Facebook', href: '#facebook' },
      { label: 'Bluesky', href: '#bluesky' },
      { label: 'Threads', href: '#threads' },
      { label: 'LinkedIn', href: '#linkedin' },
      { label: 'Email', href: '#email' },
    ],
    dialogTitle: 'Compartir «Timecode»',
    copyLabel: 'Copiar enlace',
    copiedLabel: 'Enlace copiado',
    moreLabel: 'Más opciones',
    closeLabel: 'Cerrar',
  },
} satisfies Meta<typeof ShareButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** On a computer: the dialog with a link per network and app. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole('button', { name: 'Compartir' }))
    await expect(canvas.getByRole('dialog', { name: 'Compartir «Timecode»' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      '#whatsapp',
    )
  },
}

/** On a short's hero: only the paper plane, «Compartir» in its tooltip. */
export const IconOnly: Story = { args: { display: 'icon' } }
