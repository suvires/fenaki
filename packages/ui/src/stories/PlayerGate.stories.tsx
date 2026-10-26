import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { PlayerGate } from '../components/PlayerGate.tsx'

const meta = {
  title: 'Legal/PlayerGate',
  component: PlayerGate,
  args: {
    title: 'Timecode',
    message:
      'Este corto se reproduce desde YouTube. Al darle a reproducir, YouTube puede guardar cookies en tu navegador.',
    playLabel: 'Ver ahora',
    moreLabel: 'Más sobre las cookies',
    moreHref: '#',
    loadedLabel: 'Aquí se carga el reproductor de YouTube',
  },
  decorators: [(Story) => <div className="max-w-article">{Story()}</div>],
} satisfies Meta<typeof PlayerGate>

export default meta
type Story = StoryObj<typeof meta>

export const Gate: Story = {}
export const WithoutMoreLink: Story = { args: { moreLabel: undefined } }
export const AfterPlay: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvasElement.querySelector('iframe')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ahora' }))
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Aquí se carga el reproductor de YouTube',
    )
  },
}

/** The viewer left it unfinished: the main button resumes, the other starts over. */
export const ResumeOffer: Story = {
  args: {
    resume: { label: 'Seguir viendo desde 3:24' },
    startOverLabel: 'Empezar de nuevo',
  },
}
export const ResumeAfterPlay: Story = {
  args: ResumeOffer.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Seguir viendo desde 3:24' }))
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Aquí se carga el reproductor de YouTube',
    )
  },
}
