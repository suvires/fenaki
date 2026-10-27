import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from '../atoms/Button.tsx'
import backdrop from '../stories/assets/backdrop.jpg'
import { PlayerGate } from './PlayerGate.tsx'

const meta = {
  title: 'Organisms/PlayerGate',
  component: PlayerGate,
  args: {
    title: 'Timecode',
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

const hero = {
  seconds: 900,
  details: [{ label: 'Juanjo Giménez', href: '#' }, '2016', 'España', 'Ficción'],
  synopsis:
    'Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día; él, de noche. Un rasguño en un coche les lleva a revisar las grabaciones de seguridad, donde descubren otra forma de comunicarse.',
  clampSynopsis: false,
  poster: { title: 'Timecode', director: 'Juanjo Giménez', year: 2016, tone: 'tungsteno' as const },
  backdrop,
  secondaryAction: (
    <Button variant="secondary" size="lg" icon="plus">
      Añadir a mi lista
    </Button>
  ),
}

/** The short's own page: the home page's hero, whose main button plays the short. */
export const Hero: Story = {
  args: { hero, moreLabel: undefined },
  decorators: [(Story) => <div className="max-w-page">{Story()}</div>],
}
export const HeroAfterPlay: Story = {
  args: Hero.args,
  decorators: Hero.decorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ahora' }))
    await expect(canvas.getByRole('heading', { level: 1, name: 'Timecode' })).toBeVisible()
  },
}
